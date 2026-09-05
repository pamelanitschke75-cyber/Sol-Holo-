import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import test from "node:test";

import {
  OpenClawAlltagPreviewError,
  SOL_HOLO_ALLTAG_PREVIEW_CONFIRMATION,
  alltagPreviewEnabledForEnvironment,
  buildFixedAlltagPreviewTask,
  createLoopbackAlltagPreviewExecutor,
  createOpenClawAlltagPreviewService,
  createOpenAIAlltagPreviewExecutor,
  openClawAlltagPreviewHttpStatus,
  requireLoopbackAlltagPreviewBridgeUrl
} from "../modules/openclaw-alltag-preview.mjs";

const expectedResult = JSON.parse(
  fs.readFileSync(
    new URL(
      "../openclaw-lab/examples/result-alltag-preview.example.json",
      import.meta.url
    ),
    "utf8"
  )
);
const connectionManifest = JSON.parse(
  fs.readFileSync(
    new URL(
      "../openclaw-lab/phase2/sol-holo-alltag-connection.manifest.json",
      import.meta.url
    ),
    "utf8"
  )
);
const openAIConnectionManifest = JSON.parse(
  fs.readFileSync(
    new URL(
      "../openclaw-lab/phase2/sol-holo-openai-alltag-preview.manifest.json",
      import.meta.url
    ),
    "utf8"
  )
);
const bridgeSource = fs.readFileSync(
  new URL(
    "../openclaw-lab/phase2/alltag-preview-bridge.mjs",
    import.meta.url
  ),
  "utf8"
);

function uiRequest(overrides = {}) {
  return {
    confirmation: SOL_HOLO_ALLTAG_PREVIEW_CONFIRMATION,
    ownerId: "pam-sol",
    selectedSpeakerId: "pam",
    ...overrides
  };
}

function fixedDispatch() {
  return {
    agent_id: "worker-alltag",
    session_scope: "single-task",
    source_paths: ["testdaten/alltag-fiktiv.md"]
  };
}

function assertPreviewError(code) {
  return (error) => {
    assert.ok(error instanceof OpenClawAlltagPreviewError);
    assert.equal(error.code, code);
    return true;
  };
}

test("the visible connection manifest keeps every productive surface off", () => {
  assert.equal(connectionManifest.status, "implemented-disabled-by-default");
  assert.equal(connectionManifest.productive, false);
  assert.equal(connectionManifest.active_worker, "worker-alltag");
  assert.equal(connectionManifest.data_class, "synthetic");
  assert.equal(connectionManifest.capability, "read");
  assert.equal(connectionManifest.automatic_routing, false);
  assert.equal(connectionManifest.android_control.free_text, false);
  assert.equal(
    connectionManifest.android_control.explicit_confirmation_required,
    true
  );
  assert.equal(
    connectionManifest.android_control.trusted_app_session_required,
    true
  );
  assert.deepEqual(connectionManifest.transport.host_allowlist, [
    "127.0.0.1",
    "::1"
  ]);
  assert.ok(connectionManifest.still_forbidden.includes("personal_data"));
  assert.ok(connectionManifest.still_forbidden.includes("medical_guidance"));
  assert.ok(connectionManifest.still_forbidden.includes("productive_actions"));
});

test("the OpenAI path adds no provider and stays independently disabled", () => {
  assert.equal(
    openAIConnectionManifest.status,
    "implemented-disabled-by-default"
  );
  assert.equal(openAIConnectionManifest.productive, false);
  assert.equal(openAIConnectionManifest.new_provider_required, false);
  assert.equal(openAIConnectionManifest.new_service_required, false);
  assert.equal(openAIConnectionManifest.runtime.kind, "existing-openai-api");
  assert.equal(openAIConnectionManifest.runtime.tools_enabled, false);
  assert.equal(openAIConnectionManifest.runtime.store_response, false);
  assert.equal(openAIConnectionManifest.input.personal_data, false);
  assert.equal(openAIConnectionManifest.input.free_text, false);
  assert.equal(openAIConnectionManifest.output.human_review_required, true);
  assert.equal(openAIConnectionManifest.docker_proof.live_runtime_claimed, false);
});

test("the bridge does not forward its token or ambient server secrets", () => {
  const allowlist = bridgeSource.match(
    /const workerEnvironmentKeys = \[[\s\S]*?\];/u
  )?.[0];
  assert.ok(allowlist, "Worker-Umgebungs-Allowlist fehlt");
  assert.match(bridgeSource, /env: workerEnvironment\(\)/u);
  assert.doesNotMatch(allowlist, /BRIDGE_TOKEN|DATABASE_URL|OPENAI_API_KEY/u);
});

test("the Sol Holo preview is disabled by default at the service gate", async () => {
  let executions = 0;
  const service = createOpenClawAlltagPreviewService({
    enabled: false,
    executor: async () => {
      executions += 1;
      return expectedResult;
    }
  });

  await assert.rejects(
    service.run(uiRequest()),
    assertPreviewError("PREVIEW_DISABLED")
  );
  assert.equal(executions, 0);
  assert.deepEqual(service.status(), {
    enabled: false,
    executorMode: "loopback",
    worker: "worker-alltag",
    dataClass: "synthetic",
    capability: "read",
    productive: false,
    automaticRouting: false
  });
});

test("the OpenAI executor needs its own third feature gate", () => {
  const shared = {
    OPENCLAW_SOL_HOLO_ALLTAG_PREVIEW_ENABLED: "1"
  };

  assert.equal(
    alltagPreviewEnabledForEnvironment({
      executorMode: "openai",
      environment: shared
    }),
    false
  );
  assert.equal(
    alltagPreviewEnabledForEnvironment({
      executorMode: "openai",
      environment: {
        ...shared,
        OPENCLAW_OPENAI_ALLTAG_PREVIEW_ENABLED: "1"
      }
    }),
    true
  );
  assert.equal(
    alltagPreviewEnabledForEnvironment({
      executorMode: "loopback",
      environment: {
        ...shared,
        OPENCLAW_LAB_ALLTAG_PREVIEW_ENABLED: "1"
      }
    }),
    true
  );
  assert.equal(
    alltagPreviewEnabledForEnvironment({
      executorMode: "remote-server",
      environment: {
        ...shared,
        OPENCLAW_OPENAI_ALLTAG_PREVIEW_ENABLED: "1",
        OPENCLAW_LAB_ALLTAG_PREVIEW_ENABLED: "1"
      }
    }),
    false
  );
});

test("an unknown executor mode cannot be forced on", async () => {
  let executions = 0;
  const service = createOpenClawAlltagPreviewService({
    enabled: true,
    executorMode: "remote-server",
    executor: async () => {
      executions += 1;
      return expectedResult;
    }
  });

  assert.equal(service.status().enabled, false);
  assert.equal(service.status().executorMode, "invalid-disabled");
  await assert.rejects(
    service.run(uiRequest()),
    assertPreviewError("PREVIEW_DISABLED")
  );
  assert.equal(executions, 0);
});

test("the OpenAI executor sends only the fixed synthetic source", async () => {
  let captured;
  const openaiClient = {
    responses: {
      async create(body, options) {
        captured = { body, options };
        return {
          output_text: JSON.stringify(expectedResult)
        };
      }
    }
  };
  const task = buildFixedAlltagPreviewTask({
    randomId: () => "SOL-HOLO-OPENAI-001"
  });
  const execute = createOpenAIAlltagPreviewExecutor({ openaiClient });

  const result = await execute({
    dispatch: fixedDispatch(),
    task
  });

  assert.deepEqual(result, expectedResult);
  assert.equal(captured.body.model, "gpt-5");
  assert.equal(captured.body.store, false);
  assert.equal(captured.body.max_output_tokens, 900);
  assert.deepEqual(captured.body.reasoning, { effort: "minimal" });
  assert.equal(Object.hasOwn(captured.body, "tools"), false);
  assert.match(captured.body.input, /FIKTIVE TESTDATEN – Alltag/u);
  assert.match(captured.body.input, /Haferdrink/u);
  assert.doesNotMatch(captured.body.input, /pam-sol|selectedSpeakerId/u);
  assert.doesNotMatch(JSON.stringify(captured.body), /OWNER-APPROVAL/u);
  assert.equal(captured.body.text.format.type, "json_schema");
  assert.equal(captured.body.text.format.strict, true);
  assert.equal(captured.body.text.format.schema.additionalProperties, false);
  assert.deepEqual(
    captured.body.text.format.schema.properties.worker.enum,
    ["worker-alltag"]
  );
  assert.deepEqual(
    captured.body.text.format.schema.properties.controls.properties
      .external_action_performed.enum,
    [false]
  );
  assert.deepEqual(
    captured.body.text.format.schema.properties.controls.properties
      .human_review_required.enum,
    [true]
  );
  assert.equal(captured.options.timeout, 75_000);
  assert.equal(captured.options.maxRetries, 0);
});

test("the service can select OpenAI without a bridge", async () => {
  let calls = 0;
  const service = createOpenClawAlltagPreviewService({
    enabled: true,
    executorMode: "openai",
    openaiClient: {
      responses: {
        async create() {
          calls += 1;
          return {
            output_text: JSON.stringify(expectedResult)
          };
        }
      }
    },
    randomId: () => "SOL-HOLO-OPENAI-002"
  });

  const response = await service.run(uiRequest());

  assert.equal(calls, 1);
  assert.equal(service.status().executorMode, "openai");
  assert.equal(response.preview, true);
  assert.equal(response.productive, false);
  assert.equal(response.persisted, false);
  assert.equal(response.automaticRouting, false);
  assert.deepEqual(response.result, expectedResult);
});

test("the service rejects an unsafe OpenAI result after structured output", async () => {
  const unsafeResult = structuredClone(expectedResult);
  unsafeResult.controls.external_action_performed = true;
  const service = createOpenClawAlltagPreviewService({
    enabled: true,
    executorMode: "openai",
    openaiClient: {
      responses: {
        async create() {
          return {
            output_text: JSON.stringify(unsafeResult)
          };
        }
      }
    },
    randomId: () => "SOL-HOLO-OPENAI-004"
  });

  await assert.rejects(
    service.run(uiRequest()),
    assertPreviewError("WORKER_RESULT_REJECTED")
  );
});

test("invalid OpenAI output and unapproved tasks fail closed", async () => {
  const malformedExecutor = createOpenAIAlltagPreviewExecutor({
    openaiClient: {
      responses: {
        async create() {
          return { output_text: "not json" };
        }
      }
    }
  });
  const task = buildFixedAlltagPreviewTask({
    randomId: () => "SOL-HOLO-OPENAI-003"
  });

  await assert.rejects(
    malformedExecutor({ dispatch: fixedDispatch(), task }),
    assertPreviewError("OPENAI_RESPONSE_INVALID")
  );
  await assert.rejects(
    malformedExecutor({
      dispatch: {
        ...fixedDispatch(),
        agent_id: "worker-medizin"
      },
      task
    }),
    assertPreviewError("OPENAI_TASK_NOT_APPROVED")
  );
});

test("an explicit fixed request reaches only worker-alltag and returns a proposal", async () => {
  let captured;
  const service = createOpenClawAlltagPreviewService({
    enabled: true,
    randomId: () => "SOL-HOLO-TEST-001",
    executor: async (input) => {
      captured = input;
      return structuredClone(expectedResult);
    }
  });

  const response = await service.run(uiRequest());
  assert.equal(captured.dispatch.agent_id, "worker-alltag");
  assert.equal(captured.dispatch.session_scope, "single-task");
  assert.deepEqual(captured.dispatch.source_paths, ["testdaten/alltag-fiktiv.md"]);
  assert.equal(captured.task.data_class, "synthetic");
  assert.equal(captured.task.requested_capability, "read");
  assert.equal(captured.task.external_action_allowed, false);
  assert.equal(
    captured.task.manual_approval.approval_id,
    "OWNER-APPROVAL-SOL-HOLO-TEST-001"
  );
  assert.equal(response.preview, true);
  assert.equal(response.productive, false);
  assert.equal(response.persisted, false);
  assert.equal(response.automaticRouting, false);
  assert.deepEqual(response.result, expectedResult);
});

test("free text, extra fields and missing confirmation fail before dispatch", async () => {
  let executions = 0;
  const service = createOpenClawAlltagPreviewService({
    enabled: true,
    executor: async () => {
      executions += 1;
      return expectedResult;
    }
  });

  await assert.rejects(
    service.run({ ...uiRequest(), prompt: "Lies meine echten Termine" }),
    assertPreviewError("REQUEST_SHAPE")
  );
  await assert.rejects(
    service.run(uiRequest({ confirmation: false })),
    assertPreviewError("EXPLICIT_CONFIRMATION_REQUIRED")
  );
  await assert.rejects(
    service.run(uiRequest({ ownerId: "steffi-sol" })),
    assertPreviewError("OWNER_SCOPE_MISMATCH")
  );
  assert.equal(executions, 0);
});

test("a worker result claiming a write is rejected closed", async () => {
  const unsafeResult = structuredClone(expectedResult);
  unsafeResult.controls.data_written = true;
  const service = createOpenClawAlltagPreviewService({
    enabled: true,
    randomId: () => "SOL-HOLO-TEST-002",
    executor: async () => unsafeResult
  });

  await assert.rejects(
    service.run(uiRequest()),
    assertPreviewError("WORKER_RESULT_REJECTED")
  );
});

test("the fixed task builder never accepts app content", () => {
  const task = buildFixedAlltagPreviewTask({
    randomId: () => "SOL-HOLO-TEST-003"
  });
  assert.deepEqual(Object.keys(task.payload), ["source_paths"]);
  assert.deepEqual(task.payload.source_paths, ["testdaten/alltag-fiktiv.md"]);
  assert.equal(JSON.stringify(task).includes("pam-sol"), false);
  assert.equal(JSON.stringify(task).includes("echte Termine"), false);
});

test("the bridge URL is restricted to an explicit loopback HTTP endpoint", () => {
  assert.equal(
    requireLoopbackAlltagPreviewBridgeUrl(
      "http://127.0.0.1:19007/v1/alltag-preview"
    ).href,
    "http://127.0.0.1:19007/v1/alltag-preview"
  );

  for (const unsafe of [
    "https://127.0.0.1:19007/v1/alltag-preview",
    "http://localhost:19007/v1/alltag-preview",
    "http://10.0.0.2:19007/v1/alltag-preview",
    "http://127.0.0.1:19007/other",
    "http://127.0.0.1:19007/v1/alltag-preview?worker=medizin"
  ]) {
    assert.throws(
      () => requireLoopbackAlltagPreviewBridgeUrl(unsafe),
      assertPreviewError("BRIDGE_NOT_LOOPBACK")
    );
  }
});

test("the loopback transport authenticates and accepts only the result envelope", async (t) => {
  const token = "sol-holo-ci-bridge-token-000000000001";
  const task = buildFixedAlltagPreviewTask({
    randomId: () => "SOL-HOLO-TEST-004"
  });
  let received;
  const server = http.createServer(async (request, response) => {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    received = {
      authorization: request.headers.authorization,
      body: JSON.parse(raw),
      method: request.method,
      url: request.url
    };
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8"
    });
    response.end(JSON.stringify({ result: expectedResult }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const execute = createLoopbackAlltagPreviewExecutor({
    bridgeUrl: `http://127.0.0.1:${port}/v1/alltag-preview`,
    bridgeToken: token
  });
  const result = await execute({ task });

  assert.deepEqual(result, expectedResult);
  assert.equal(received.authorization, `Bearer ${token}`);
  assert.equal(received.method, "POST");
  assert.equal(received.url, "/v1/alltag-preview");
  assert.deepEqual(Object.keys(received.body), ["task"]);
  assert.deepEqual(received.body.task, task);
});

test("public status mapping keeps every executor failure closed", () => {
  assert.equal(
    openClawAlltagPreviewHttpStatus(
      new OpenClawAlltagPreviewError("REQUEST_SHAPE", "test")
    ),
    400
  );
  assert.equal(
    openClawAlltagPreviewHttpStatus(
      new OpenClawAlltagPreviewError("WORKER_RESULT_REJECTED", "test")
    ),
    502
  );
  assert.equal(
    openClawAlltagPreviewHttpStatus(
      new OpenClawAlltagPreviewError("PREVIEW_DISABLED", "test")
    ),
    503
  );
  assert.equal(
    openClawAlltagPreviewHttpStatus(
      new OpenClawAlltagPreviewError("BRIDGE_TIMEOUT", "test")
    ),
    504
  );
  assert.equal(
    openClawAlltagPreviewHttpStatus(
      new OpenClawAlltagPreviewError("OPENAI_RESPONSE_INVALID", "test")
    ),
    502
  );
  assert.equal(
    openClawAlltagPreviewHttpStatus(
      new OpenClawAlltagPreviewError("OPENAI_UNAVAILABLE", "test")
    ),
    503
  );
  assert.equal(
    openClawAlltagPreviewHttpStatus(
      new OpenClawAlltagPreviewError("OPENAI_TIMEOUT", "test")
    ),
    504
  );
});
