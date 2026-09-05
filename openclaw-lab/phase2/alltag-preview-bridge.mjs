import { execFile } from "node:child_process";
import {
  timingSafeEqual
} from "node:crypto";
import http from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  AlltagPreviewGateError,
  createAlltagPreviewGate,
  validateAlltagPreviewResult
} from "./alltag-preview-gate.mjs";

const execFileAsync = promisify(execFile);
const bridgeHost = "127.0.0.1";
const bridgePort = Number.parseInt(
  process.env.OPENCLAW_LAB_BRIDGE_PORT || "19007",
  10
);
const bridgeToken = String(process.env.OPENCLAW_LAB_BRIDGE_TOKEN || "");
const openclaw = String(process.env.OPENCLAW_BIN || "");
const sessionKey = String(
  process.env.OPENCLAW_LAB_ALLTAG_PREVIEW_SESSION_KEY ||
  "agent:worker-alltag:sol-holo-visible-preview"
);
const phase2Dir = path.dirname(fileURLToPath(import.meta.url));
const labRoot = path.resolve(phase2Dir, "..");
const configuredLabRoot = path.resolve(
  String(process.env.OPENCLAW_LAB_ROOT || ".")
);
const gate = createAlltagPreviewGate();
const maximumRequestBytes = 16 * 1024;
const workerEnvironmentKeys = [
  "LANG",
  "LC_ALL",
  "NO_COLOR",
  "OPENCLAW_CONFIG_PATH",
  "OPENCLAW_GATEWAY_TOKEN",
  "OPENCLAW_LAB_ROOT",
  "OPENCLAW_LAB_STATE_DIR",
  "OPENCLAW_STATE_DIR",
  "PATH",
  "TMPDIR"
];

if (
  !Number.isInteger(bridgePort) ||
  bridgePort < 1024 ||
  bridgePort > 65535
) {
  throw new Error("OPENCLAW_LAB_BRIDGE_PORT_INVALID");
}
if (
  bridgeToken.length < 32 ||
  bridgeToken.length > 256 ||
  !/^[\x21-\x7e]+$/u.test(bridgeToken)
) {
  throw new Error("OPENCLAW_LAB_BRIDGE_TOKEN_INVALID");
}
if (!path.isAbsolute(openclaw)) {
  throw new Error("OPENCLAW_BIN_MUST_BE_ABSOLUTE");
}
if (!/^agent:worker-alltag:[a-zA-Z0-9:_-]{8,120}$/u.test(sessionKey)) {
  throw new Error("OPENCLAW_LAB_ALLTAG_PREVIEW_SESSION_KEY_INVALID");
}
if (configuredLabRoot !== labRoot) {
  throw new Error("OPENCLAW_LAB_ROOT_MISMATCH");
}

function safeTokenMatch(authorization) {
  const prefix = "Bearer ";
  if (!String(authorization || "").startsWith(prefix)) return false;
  const supplied = Buffer.from(String(authorization).slice(prefix.length));
  const expected = Buffer.from(bridgeToken);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function sendJson(response, status, body) {
  const json = JSON.stringify(body);
  response.writeHead(status, {
    "Cache-Control": "no-store, max-age=0",
    Connection: "close",
    "Content-Length": Buffer.byteLength(json),
    "Content-Type": "application/json; charset=utf-8",
    Pragma: "no-cache"
  });
  response.end(json);
}

function exactTaskEnvelope(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    Object.hasOwn(value, "task")
  );
}

function workerEnvironment() {
  return Object.fromEntries(
    workerEnvironmentKeys
      .filter((key) => typeof process.env[key] === "string")
      .map((key) => [key, process.env[key]])
  );
}

function lastJsonObject(text) {
  const candidates = [];
  let depth = 0;
  let start = -1;
  let quote = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quote = false;
      continue;
    }
    if (character === '"') {
      quote = true;
      continue;
    }
    if (character === "{") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (character === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        candidates.push(text.slice(start, index + 1));
      }
    }
  }

  for (const candidate of candidates.reverse()) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the preceding complete object.
    }
  }
  throw new Error("OPENCLAW_ENVELOPE_INVALID");
}

async function runWorker(dispatch, task) {
  const result = await execFileAsync(
    openclaw,
    [
      "agent",
      "--local",
      "--agent",
      dispatch.agent_id,
      "--session-key",
      sessionKey,
      "--message",
      dispatch.message,
      "--thinking",
      "off",
      "--timeout",
      "90",
      "--json"
    ],
    {
      cwd: labRoot,
      env: workerEnvironment(),
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      timeout: 100_000
    }
  );

  const envelope = lastJsonObject(`${result.stdout}\n${result.stderr}`);
  if (!Array.isArray(envelope.payloads)) {
    throw new Error("OPENCLAW_PAYLOADS_INVALID");
  }
  const resultText = envelope.payloads
    .map((payload) => payload?.text)
    .find(
      (text) =>
        typeof text === "string" &&
        text.includes('"task_id":"LAB-ALLTAG-PREVIEW-01"')
    );
  if (!resultText || Buffer.byteLength(resultText, "utf8") > 24 * 1024) {
    throw new Error("OPENCLAW_RESULT_INVALID");
  }
  const previewResult = JSON.parse(resultText);
  validateAlltagPreviewResult(previewResult, task);
  return previewResult;
}

async function readRequestJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maximumRequestBytes) {
      throw new Error("REQUEST_TOO_LARGE");
    }
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = http.createServer(async (request, response) => {
  if (!safeTokenMatch(request.headers.authorization)) {
    sendJson(response, 401, { error: "BRIDGE_AUTH_REQUIRED" });
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, {
      ready: true,
      worker: "worker-alltag",
      productive: false
    });
    return;
  }

  if (request.method !== "POST" || request.url !== "/v1/alltag-preview") {
    sendJson(response, 404, { error: "NOT_FOUND" });
    return;
  }
  if (
    !String(request.headers["content-type"] || "")
      .toLowerCase()
      .startsWith("application/json")
  ) {
    sendJson(response, 415, { error: "JSON_REQUIRED" });
    return;
  }

  try {
    const body = await readRequestJson(request);
    if (!exactTaskEnvelope(body)) {
      sendJson(response, 400, { error: "REQUEST_SHAPE" });
      return;
    }

    const dispatch = gate.authorize(body.task);
    const result = await runWorker(dispatch, body.task);
    sendJson(response, 200, { result });
    process.stdout.write(
      "ALLTAG_PREVIEW_BRIDGE_OK worker=worker-alltag data=synthetic read=1 writes=false external=false\n"
    );
  } catch (error) {
    const replay =
      error instanceof AlltagPreviewGateError &&
      error.code === "APPROVAL_REPLAY";
    const requestError =
      error instanceof SyntaxError ||
      error?.message === "REQUEST_TOO_LARGE" ||
      error instanceof AlltagPreviewGateError;
    const status = replay ? 409 : requestError ? 400 : 502;
    const code = replay
      ? "APPROVAL_REPLAY"
      : requestError
        ? "PREVIEW_REQUEST_REJECTED"
        : "WORKER_EXECUTION_FAILED";
    sendJson(response, status, { error: code });
    process.stderr.write(`ALLTAG_PREVIEW_BRIDGE_REFUSED code=${code}\n`);
  }
});

server.requestTimeout = 110_000;
server.headersTimeout = 5_000;
server.keepAliveTimeout = 1_000;

server.listen(bridgePort, bridgeHost, () => {
  process.stdout.write(
    `ALLTAG_PREVIEW_BRIDGE_READY host=${bridgeHost} port=${bridgePort}\n`
  );
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
