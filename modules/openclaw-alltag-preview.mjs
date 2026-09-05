import { randomUUID } from "node:crypto";

import {
  AlltagPreviewGateError,
  alltagPreviewManifest,
  createAlltagPreviewGate,
  validateAlltagPreviewResult
} from "../openclaw-lab/phase2/alltag-preview-gate.mjs";

export const SOL_HOLO_ALLTAG_PREVIEW_CONFIRMATION =
  "RUN_FIXED_SYNTHETIC_ALLTAG_PREVIEW";

const UI_REQUEST_KEYS = [
  "confirmation",
  "ownerId",
  "selectedSpeakerId"
];
const BRIDGE_RESPONSE_KEYS = ["result"];
const BRIDGE_PATH = "/v1/alltag-preview";
const MAX_BRIDGE_RESPONSE_BYTES = 32 * 1024;

export class OpenClawAlltagPreviewError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "OpenClawAlltagPreviewError";
    this.code = code;
  }
}

function refuse(code, message, options) {
  throw new OpenClawAlltagPreviewError(code, message, options);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, expected, code, label) {
  if (!isRecord(value)) {
    refuse(code, `${label} muss ein Objekt sein.`);
  }

  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    refuse(code, `${label} enthält fehlende oder unerlaubte Felder.`);
  }
}

function validateUiRequest(body) {
  assertExactKeys(
    body,
    UI_REQUEST_KEYS,
    "REQUEST_SHAPE",
    "Die Vorschau-Anfrage"
  );

  if (body.confirmation !== SOL_HOLO_ALLTAG_PREVIEW_CONFIRMATION) {
    refuse(
      "EXPLICIT_CONFIRMATION_REQUIRED",
      "Der feste fiktive Alltagstest wurde nicht ausdrücklich bestätigt."
    );
  }

  if (body.ownerId !== "pam-sol" || body.selectedSpeakerId !== "pam") {
    refuse(
      "OWNER_SCOPE_MISMATCH",
      "Die Alltag-Vorschau gehört nicht zur sicher gebundenen Pam-Holo-Instanz."
    );
  }
}

function approvalId(randomId) {
  const value = String(randomId()).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/u.test(value)) {
    refuse(
      "APPROVAL_ID_UNAVAILABLE",
      "Für den Einmal-Test konnte keine sichere Freigabe-ID erzeugt werden."
    );
  }
  return `OWNER-APPROVAL-${value}`;
}

export function buildFixedAlltagPreviewTask({
  randomId = randomUUID
} = {}) {
  const allowed = alltagPreviewManifest.allowed_task;
  return {
    schema_version: "1.0",
    task_id: allowed.task_id,
    target_worker: alltagPreviewManifest.active_worker,
    data_class: allowed.data_class,
    execution_mode: allowed.execution_mode,
    requested_capability: allowed.requested_capability,
    external_action_allowed: allowed.external_action_allowed,
    payload: {
      source_paths: [...allowed.source_paths]
    },
    question: allowed.question,
    manual_approval: {
      approved: true,
      scope: alltagPreviewManifest.manual_approval.scope,
      approval_id: approvalId(randomId)
    }
  };
}

export function requireLoopbackAlltagPreviewBridgeUrl(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    refuse(
      "BRIDGE_NOT_CONFIGURED",
      "Der lokale OpenClaw-Labor-Runner ist nicht eingerichtet."
    );
  }

  const loopbackHost =
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";
  const port = Number.parseInt(url.port, 10);
  if (
    url.protocol !== "http:" ||
    !loopbackHost ||
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535 ||
    url.pathname !== BRIDGE_PATH ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    refuse(
      "BRIDGE_NOT_LOOPBACK",
      "Die OpenClaw-Vorschau darf nur einen festen lokalen Labor-Runner verwenden."
    );
  }

  return url;
}

function requireBridgeToken(value) {
  const token = String(value || "");
  if (
    token.length < 32 ||
    token.length > 256 ||
    !/^[\x21-\x7e]+$/u.test(token)
  ) {
    refuse(
      "BRIDGE_NOT_CONFIGURED",
      "Die lokale OpenClaw-Labor-Verbindung ist nicht vollständig eingerichtet."
    );
  }
  return token;
}

async function readLimitedText(response, maximumBytes) {
  const contentLength = Number.parseInt(
    response.headers.get("content-length") || "0",
    10
  );
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    refuse(
      "BRIDGE_RESPONSE_TOO_LARGE",
      "Der OpenClaw-Labor-Runner hat eine unerwartet große Antwort geliefert."
    );
  }

  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maximumBytes) {
      refuse(
        "BRIDGE_RESPONSE_TOO_LARGE",
        "Der OpenClaw-Labor-Runner hat eine unerwartet große Antwort geliefert."
      );
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximumBytes) {
      await reader.cancel();
      refuse(
        "BRIDGE_RESPONSE_TOO_LARGE",
        "Der OpenClaw-Labor-Runner hat eine unerwartet große Antwort geliefert."
      );
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export function createLoopbackAlltagPreviewExecutor({
  bridgeUrl = process.env.OPENCLAW_LAB_BRIDGE_URL,
  bridgeToken = process.env.OPENCLAW_LAB_BRIDGE_TOKEN,
  fetchImpl = globalThis.fetch,
  timeoutMs = 100_000
} = {}) {
  const url = requireLoopbackAlltagPreviewBridgeUrl(bridgeUrl);
  const token = requireBridgeToken(bridgeToken);
  if (typeof fetchImpl !== "function") {
    refuse(
      "BRIDGE_NOT_CONFIGURED",
      "Der lokale OpenClaw-Labor-Transport ist nicht verfügbar."
    );
  }

  return async function executeAlltagPreview({ task }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ task }),
        cache: "no-store",
        redirect: "error",
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        refuse(
          "BRIDGE_TIMEOUT",
          "Der OpenClaw-Labor-Runner hat nicht rechtzeitig geantwortet.",
          { cause: error }
        );
      }
      refuse(
        "BRIDGE_UNAVAILABLE",
        "Der lokale OpenClaw-Labor-Runner ist nicht erreichbar.",
        { cause: error }
      );
    } finally {
      clearTimeout(timeout);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      refuse(
        "BRIDGE_RESPONSE_INVALID",
        "Der OpenClaw-Labor-Runner hat kein gültiges JSON geliefert."
      );
    }
    const text = await readLimitedText(response, MAX_BRIDGE_RESPONSE_BYTES);
    let body;
    try {
      body = JSON.parse(text);
    } catch (error) {
      refuse(
        "BRIDGE_RESPONSE_INVALID",
        "Der OpenClaw-Labor-Runner hat kein gültiges JSON geliefert.",
        { cause: error }
      );
    }

    if (!response.ok) {
      refuse(
        response.status === 409 ? "APPROVAL_REPLAY" : "BRIDGE_REJECTED",
        "Der OpenClaw-Labor-Runner hat die Vorschau sicher abgelehnt."
      );
    }
    assertExactKeys(
      body,
      BRIDGE_RESPONSE_KEYS,
      "BRIDGE_RESPONSE_INVALID",
      "Die Antwort des Labor-Runners"
    );
    return body.result;
  };
}

function previewEnabledByEnvironment() {
  return (
    process.env.OPENCLAW_SOL_HOLO_ALLTAG_PREVIEW_ENABLED === "1" &&
    process.env.OPENCLAW_LAB_ALLTAG_PREVIEW_ENABLED === "1"
  );
}

export function createOpenClawAlltagPreviewService({
  enabled = previewEnabledByEnvironment(),
  executor,
  bridgeUrl,
  bridgeToken,
  fetchImpl,
  timeoutMs,
  randomId = randomUUID
} = {}) {
  let resolvedExecutor = executor;

  return Object.freeze({
    status() {
      return Object.freeze({
        enabled: Boolean(enabled),
        worker: alltagPreviewManifest.active_worker,
        dataClass: alltagPreviewManifest.allowed_task.data_class,
        capability: alltagPreviewManifest.allowed_task.requested_capability,
        productive: false,
        automaticRouting: false
      });
    },

    async run(body) {
      if (!enabled) {
        refuse(
          "PREVIEW_DISABLED",
          "Die sichtbare Alltag-Laborvorschau ist serverseitig noch ausgeschaltet."
        );
      }
      validateUiRequest(body);

      const task = buildFixedAlltagPreviewTask({ randomId });
      const gate = createAlltagPreviewGate({ enabled: true });
      const dispatch = gate.authorize(task);

      if (!resolvedExecutor) {
        resolvedExecutor = createLoopbackAlltagPreviewExecutor({
          bridgeUrl,
          bridgeToken,
          fetchImpl,
          timeoutMs
        });
      }

      let result;
      try {
        result = await resolvedExecutor({ dispatch, task });
        validateAlltagPreviewResult(result, task);
      } catch (error) {
        if (error instanceof OpenClawAlltagPreviewError) throw error;
        if (error instanceof AlltagPreviewGateError) {
          refuse(
            "WORKER_RESULT_REJECTED",
            "Das Worker-Ergebnis hat die Sicherheitskontrolle nicht bestanden.",
            { cause: error }
          );
        }
        refuse(
          "BRIDGE_UNAVAILABLE",
          "Der lokale OpenClaw-Labor-Runner ist nicht erreichbar.",
          { cause: error }
        );
      }

      return Object.freeze({
        schemaVersion: "1.0",
        preview: true,
        productive: false,
        persisted: false,
        automaticRouting: false,
        dataClass: "synthetic",
        capability: "read",
        result
      });
    }
  });
}

export function openClawAlltagPreviewHttpStatus(error) {
  switch (String(error?.code || "")) {
    case "REQUEST_SHAPE":
    case "EXPLICIT_CONFIRMATION_REQUIRED":
    case "OWNER_SCOPE_MISMATCH":
      return 400;
    case "APPROVAL_REPLAY":
      return 409;
    case "BRIDGE_TIMEOUT":
      return 504;
    case "BRIDGE_REJECTED":
    case "BRIDGE_RESPONSE_INVALID":
    case "BRIDGE_RESPONSE_TOO_LARGE":
    case "WORKER_RESULT_REJECTED":
      return 502;
    case "PREVIEW_DISABLED":
    case "BRIDGE_NOT_CONFIGURED":
    case "BRIDGE_NOT_LOOPBACK":
    case "BRIDGE_UNAVAILABLE":
      return 503;
    default:
      return 500;
  }
}
