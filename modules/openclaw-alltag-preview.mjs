import { randomUUID } from "node:crypto";
import fs from "node:fs";

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
const MAX_OPENAI_RESPONSE_BYTES = 32 * 1024;
const LOOPBACK_EXECUTOR_MODE = "loopback";
const OPENAI_EXECUTOR_MODE = "openai";
const DEFAULT_OPENAI_MODEL = "gpt-5";
const FIXED_ALLTAG_PREVIEW_SOURCE = fs.readFileSync(
  new URL(
    "../openclaw-lab/workspaces/alltag/testdaten/alltag-fiktiv.md",
    import.meta.url
  ),
  "utf8"
);

const OPENAI_ALLTAG_RESULT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "schema_version",
    "task_id",
    "worker",
    "status",
    "facts",
    "uncertainties",
    "proposal",
    "source_paths",
    "controls"
  ],
  properties: {
    schema_version: { type: "string", enum: ["1.0"] },
    task_id: {
      type: "string",
      enum: [alltagPreviewManifest.allowed_task.task_id]
    },
    worker: {
      type: "string",
      enum: [alltagPreviewManifest.active_worker]
    },
    status: { type: "string", enum: ["completed-proposal"] },
    facts: {
      type: "array",
      items: { type: "string" }
    },
    uncertainties: {
      type: "array",
      items: { type: "string" }
    },
    proposal: { type: "string" },
    source_paths: {
      type: "array",
      items: {
        type: "string",
        enum: [...alltagPreviewManifest.allowed_task.source_paths]
      }
    },
    controls: {
      type: "object",
      additionalProperties: false,
      required: [
        "external_action_performed",
        "data_written",
        "boundary_crossed",
        "human_review_required"
      ],
      properties: {
        external_action_performed: { type: "boolean", enum: [false] },
        data_written: { type: "boolean", enum: [false] },
        boundary_crossed: { type: "boolean", enum: [false] },
        human_review_required: { type: "boolean", enum: [true] }
      }
    }
  }
});

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

function normalizeExecutorMode(value) {
  const mode = String(value || LOOPBACK_EXECUTOR_MODE).trim();
  if (mode === LOOPBACK_EXECUTOR_MODE || mode === OPENAI_EXECUTOR_MODE) {
    return mode;
  }
  return null;
}

function assertFixedOpenAIInput({ dispatch, task }) {
  const allowed = alltagPreviewManifest.allowed_task;
  const sourcePaths = task?.payload?.source_paths;
  const dispatchSources = dispatch?.source_paths;
  if (
    task?.task_id !== allowed.task_id ||
    task?.target_worker !== alltagPreviewManifest.active_worker ||
    task?.data_class !== "synthetic" ||
    task?.execution_mode !== "proposal-only" ||
    task?.requested_capability !== "read" ||
    task?.external_action_allowed !== false ||
    dispatch?.agent_id !== alltagPreviewManifest.active_worker ||
    dispatch?.session_scope !== "single-task" ||
    !Array.isArray(sourcePaths) ||
    !Array.isArray(dispatchSources) ||
    sourcePaths.length !== allowed.source_paths.length ||
    dispatchSources.length !== allowed.source_paths.length ||
    sourcePaths.some((entry, index) => entry !== allowed.source_paths[index]) ||
    dispatchSources.some(
      (entry, index) => entry !== allowed.source_paths[index]
    )
  ) {
    refuse(
      "OPENAI_TASK_NOT_APPROVED",
      "Der OpenAI-Testweg hat keinen exakt freigegebenen fiktiven Auftrag erhalten."
    );
  }
}

function parseOpenAIAlltagPreviewResult(response) {
  const text = String(response?.output_text || "").trim();
  if (
    !text ||
    Buffer.byteLength(text, "utf8") > MAX_OPENAI_RESPONSE_BYTES
  ) {
    refuse(
      "OPENAI_RESPONSE_INVALID",
      "OpenAI hat kein gültiges begrenztes Vorschauergebnis geliefert."
    );
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    refuse(
      "OPENAI_RESPONSE_INVALID",
      "OpenAI hat kein gültiges JSON-Vorschauergebnis geliefert.",
      { cause: error }
    );
  }
}

async function resolveOpenAIClient(openaiClient) {
  if (typeof openaiClient?.responses?.create === "function") {
    return openaiClient;
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (typeof client?.responses?.create === "function") {
      return client;
    }
  } catch (error) {
    refuse(
      "OPENAI_NOT_CONFIGURED",
      "Der vorhandene OpenAI-Zugang ist für den fiktiven Alltagstest nicht verfügbar.",
      { cause: error }
    );
  }

  refuse(
    "OPENAI_NOT_CONFIGURED",
    "Der vorhandene OpenAI-Zugang ist für den fiktiven Alltagstest nicht verfügbar."
  );
}

export function createOpenAIAlltagPreviewExecutor({
  openaiClient,
  model = DEFAULT_OPENAI_MODEL,
  timeoutMs = 30_000
} = {}) {
  if (model !== DEFAULT_OPENAI_MODEL) {
    refuse(
      "OPENAI_MODEL_NOT_APPROVED",
      "Für den fiktiven Alltagstest ist kein anderes Modell freigegeben."
    );
  }

  return async function executeAlltagPreviewWithOpenAI({ dispatch, task }) {
    assertFixedOpenAIInput({ dispatch, task });
    const client = await resolveOpenAIClient(openaiClient);

    let response;
    try {
      response = await client.responses.create(
        {
          model,
          store: false,
          max_output_tokens: 900,
          instructions: [
            "Du bist ausschließlich der nicht produktive worker-alltag im Sol-Holo-Labor.",
            "Die Quelle ist vollständig erfunden und gehört zu keiner realen Person.",
            "Lies nur die übergebene feste Quelle. Verwende keine Werkzeuge und kein weiteres Wissen.",
            "Gib ausschließlich den unverbindlichen Vorschlag im vorgegebenen JSON-Schema zurück.",
            "Führe keine Aktion aus, speichere nichts und überschreite keine Bereichsgrenze.",
            "Setze alle Kontrollfelder exakt auf die im Schema vorgegebenen Werte."
          ].join("\n"),
          input: [
            "FESTE FIKTIVE QUELLE:",
            FIXED_ALLTAG_PREVIEW_SOURCE,
            "FESTE FRAGE:",
            alltagPreviewManifest.allowed_task.question
          ].join("\n\n"),
          text: {
            format: {
              type: "json_schema",
              name: "sol_holo_alltag_preview_result",
              strict: true,
              schema: OPENAI_ALLTAG_RESULT_SCHEMA
            }
          }
        },
        {
          timeout: timeoutMs,
          maxRetries: 0
        }
      );
    } catch (error) {
      if (
        error?.name === "AbortError" ||
        error?.code === "ETIMEDOUT" ||
        error?.code === "ECONNABORTED"
      ) {
        refuse(
          "OPENAI_TIMEOUT",
          "OpenAI hat den fiktiven Alltagstest nicht rechtzeitig beantwortet.",
          { cause: error }
        );
      }
      refuse(
        "OPENAI_UNAVAILABLE",
        "OpenAI war für den fiktiven Alltagstest nicht erreichbar.",
        { cause: error }
      );
    }

    return parseOpenAIAlltagPreviewResult(response);
  };
}

export function alltagPreviewEnabledForEnvironment({
  executorMode,
  environment = process.env
} = {}) {
  const mode = normalizeExecutorMode(executorMode);
  if (
    !mode ||
    environment.OPENCLAW_SOL_HOLO_ALLTAG_PREVIEW_ENABLED !== "1"
  ) {
    return false;
  }
  if (mode === OPENAI_EXECUTOR_MODE) {
    return environment.OPENCLAW_OPENAI_ALLTAG_PREVIEW_ENABLED === "1";
  }
  return environment.OPENCLAW_LAB_ALLTAG_PREVIEW_ENABLED === "1";
}

export function createOpenClawAlltagPreviewService({
  executorMode =
    process.env.OPENCLAW_ALLTAG_PREVIEW_EXECUTOR || LOOPBACK_EXECUTOR_MODE,
  enabled = alltagPreviewEnabledForEnvironment({ executorMode }),
  executor,
  openaiClient,
  bridgeUrl,
  bridgeToken,
  fetchImpl,
  timeoutMs,
  randomId = randomUUID
} = {}) {
  const resolvedExecutorMode = normalizeExecutorMode(executorMode);
  const effectivelyEnabled = Boolean(enabled && resolvedExecutorMode);
  let resolvedExecutor = executor;

  return Object.freeze({
    status() {
      return Object.freeze({
        enabled: effectivelyEnabled,
        executorMode: resolvedExecutorMode || "invalid-disabled",
        worker: alltagPreviewManifest.active_worker,
        dataClass: alltagPreviewManifest.allowed_task.data_class,
        capability: alltagPreviewManifest.allowed_task.requested_capability,
        productive: false,
        automaticRouting: false
      });
    },

    async run(body) {
      if (!effectivelyEnabled) {
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
        resolvedExecutor =
          resolvedExecutorMode === OPENAI_EXECUTOR_MODE
            ? createOpenAIAlltagPreviewExecutor({
                openaiClient,
                timeoutMs
              })
            : createLoopbackAlltagPreviewExecutor({
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
          "PREVIEW_EXECUTOR_UNAVAILABLE",
          "Der freigegebene Labor-Ausführungsweg ist nicht erreichbar.",
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
    case "OPENAI_TIMEOUT":
      return 504;
    case "BRIDGE_REJECTED":
    case "BRIDGE_RESPONSE_INVALID":
    case "BRIDGE_RESPONSE_TOO_LARGE":
    case "OPENAI_RESPONSE_INVALID":
    case "OPENAI_TASK_NOT_APPROVED":
    case "OPENAI_MODEL_NOT_APPROVED":
    case "WORKER_RESULT_REJECTED":
      return 502;
    case "PREVIEW_DISABLED":
    case "BRIDGE_NOT_CONFIGURED":
    case "BRIDGE_NOT_LOOPBACK":
    case "BRIDGE_UNAVAILABLE":
    case "OPENAI_NOT_CONFIGURED":
    case "OPENAI_UNAVAILABLE":
    case "PREVIEW_EXECUTOR_UNAVAILABLE":
      return 503;
    default:
      return 500;
  }
}
