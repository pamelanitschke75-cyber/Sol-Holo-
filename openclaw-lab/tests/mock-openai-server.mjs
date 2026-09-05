import http from "node:http";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.OPENCLAW_LAB_MOCK_PORT ?? "19006", 10);
const model = "policy-probe";
const workspacePrefix = (process.env.OPENCLAW_LAB_MOCK_WORKSPACE_PREFIX ?? "").replace(/\/+$/u, "");

const domains = {
  alltag: {
    file: "testdaten/alltag-fiktiv.md",
    crossFile: "../tiere/testdaten/tiere-fiktiv.md",
    marker: "Haferdrink",
  },
  geschaeftliches: {
    file: "testdaten/geschaeft-fiktiv.md",
    crossFile: "../alltag/testdaten/alltag-fiktiv.md",
    marker: "TEST-104",
  },
  tiere: {
    file: "testdaten/tiere-fiktiv.md",
    crossFile: "../kochen/testdaten/kochen-fiktiv.md",
    marker: "Testkatze Luna",
  },
  kochen: {
    file: "testdaten/kochen-fiktiv.md",
    crossFile: "../geschaeftliches/testdaten/geschaeft-fiktiv.md",
    marker: "200 Gramm Nudeln",
  },
  sicherheit: {
    file: "testdaten/sicherheit-fiktiv.md",
    crossFile: "../medizin/testdaten/medizin-fiktiv.md",
    marker: "gelbes Testkabel",
  },
  medizin: {
    file: "testdaten/medizin-fiktiv.md",
    crossFile: "../sicherheit/testdaten/sicherheit-fiktiv.md",
    marker: "TEST-MED-07",
  },
};
const writeAttempts = new Map();

function workspacePath(relativePath) {
  if (!workspacePrefix) return relativePath;
  return `${workspacePrefix}/${relativePath}`;
}

function asText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (typeof part === "string" ? part : part?.text ?? ""))
    .join("\n");
}

function detectDomain(text) {
  const normalized = text.toLocaleLowerCase("de-DE");
  if (normalized.includes("geschaeft") || normalized.includes("geschäft")) {
    return "geschaeftliches";
  }
  return Object.keys(domains).find((domain) => normalized.includes(domain)) ?? "alltag";
}

function completionChunk(id, delta, finishReason = null) {
  return {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
}

function sendStreaming(response, message) {
  const id = `chatcmpl-${Date.now()}`;
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "close",
  });
  response.write(`data: ${JSON.stringify(completionChunk(id, { role: "assistant" }))}\n\n`);

  if (message.tool_calls) {
    response.write(
      `data: ${JSON.stringify(
        completionChunk(id, { tool_calls: message.tool_calls }),
      )}\n\n`,
    );
    response.write(`data: ${JSON.stringify(completionChunk(id, {}, "tool_calls"))}\n\n`);
  } else {
    response.write(
      `data: ${JSON.stringify(completionChunk(id, { content: message.content }))}\n\n`,
    );
    response.write(`data: ${JSON.stringify(completionChunk(id, {}, "stop"))}\n\n`);
  }

  response.end("data: [DONE]\n\n");
}

function sendJson(response, message) {
  response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  response.end(
    JSON.stringify({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, message, finish_reason: message.tool_calls ? "tool_calls" : "stop" }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
  );
}

function buildMessage(body) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lastUserIndex = messages.findLastIndex((message) => message?.role === "user");
  const userText = lastUserIndex >= 0 ? messages[lastUserIndex] : undefined;
  const requestText = asText(userText?.content);
  const domain = detectDomain(requestText);
  const upperRequest = requestText.toLocaleUpperCase("de-DE");
  const mode = upperRequest.includes("LAB_WRITE")
    ? "write"
    : upperRequest.includes("LAB_CROSS_READ")
      ? "cross-read"
      : "read";
  const toolResult = messages
    .slice(lastUserIndex + 1)
    .reverse()
    .find((message) => message?.role === "tool");

  const advertisedTools = Array.isArray(body.tools)
    ? body.tools.map((tool) => tool?.function?.name).filter(Boolean)
    : [];
  process.stdout.write(
    `${JSON.stringify({ event: "request", domain, mode, advertisedTools, hasToolResult: Boolean(toolResult) })}\n`,
  );

  if (toolResult) {
    const resultText = asText(toolResult.content);
    if (mode === "cross-read") {
      const leaked = Object.values(domains).some(({ marker }) => resultText.includes(marker));
      const blocked = /outside|workspace|denied|not allowed|blocked|forbidden|escape/i.test(resultText);
      return {
        role: "assistant",
        content: leaked
          ? `LAB_CROSS_READ_LEAKED:${domain}`
          : blocked
            ? `LAB_CROSS_READ_BLOCKED:${domain}`
            : `LAB_CROSS_READ_UNKNOWN:${domain}`,
      };
    }
    if (mode === "read") {
      const verdict = resultText.includes(domains[domain].marker) ? "OK" : "FAIL";
      return { role: "assistant", content: `LAB_READ_${verdict}:${domain}` };
    }

    const blocked = /not found|unknown|unavailable|denied|not allowed|blocked/i.test(resultText);
    return {
      role: "assistant",
      content: blocked
        ? `LAB_WRITE_BLOCKED:${domain}`
        : `LAB_WRITE_UNEXPECTED_TOOL_RESULT:${domain}`,
    };
  }

  if (mode === "write") {
    const attempts = writeAttempts.get(domain) ?? 0;
    if (attempts > 0) {
      return { role: "assistant", content: `LAB_WRITE_BLOCKED:${domain}` };
    }
    writeAttempts.set(domain, attempts + 1);
  }

  const toolName = mode === "write" ? "write" : "read";
  const args =
    mode === "write"
      ? { path: workspacePath("UNERLAUBT.md"), content: "DARF_NICHT_ENTSTEHEN" }
      : {
          path: workspacePath(mode === "cross-read" ? domains[domain].crossFile : domains[domain].file),
        };

  return {
    role: "assistant",
    content: null,
    tool_calls: [
      {
        index: 0,
        id: `call-${mode}-${domain}`,
        type: "function",
        function: { name: toolName, arguments: JSON.stringify(args) },
      },
    ],
  };
}

const server = http.createServer((request, response) => {
  if (request.method === "GET" && request.url === "/v1/models") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(
      JSON.stringify({ object: "list", data: [{ id: model, object: "model", owned_by: "sol-holo-lab" }] }),
    );
    return;
  }

  if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
    response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: { message: "not found" } }));
    return;
  }

  let raw = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > 2_000_000) request.destroy();
  });
  request.on("end", () => {
    try {
      const body = JSON.parse(raw);
      const message = buildMessage(body);
      if (body.stream) sendStreaming(response, message);
      else sendJson(response, message);
    } catch (error) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: { message: String(error) } }));
    }
  });
});

server.listen(port, host, () => {
  process.stdout.write(`MOCK_READY http://${host}:${port}/v1\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
