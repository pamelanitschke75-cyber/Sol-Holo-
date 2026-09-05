import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  SOL_HOLO_ALLTAG_PREVIEW_CONFIRMATION,
  createOpenClawAlltagPreviewService,
} from "../../modules/openclaw-alltag-preview.mjs";

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const labRoot = path.resolve(testDir, "..");
const openclaw = process.env.OPENCLAW_BIN || "openclaw";
const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-lab-container-"));
const stateDir = path.join(runRoot, "state");
const tempDir = path.join(runRoot, "tmp");
fs.mkdirSync(stateDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });
fs.chmodSync(stateDir, 0o700);
const privateConfigPath = path.join(runRoot, "openclaw.lab.json5");
fs.copyFileSync(path.join(labRoot, "openclaw.lab.example.json5"), privateConfigPath);
fs.chmodSync(privateConfigPath, 0o600);

const runId = `phase1-${process.pid}-${Date.now()}`;
const workers = ["alltag", "geschaeftliches", "tiere", "kochen", "sicherheit", "medizin"];
const sessions = new Map(
  workers.map((domain) => [domain, `agent:worker-${domain}:${runId}`]),
);
const commandEnv = {
  ...process.env,
  TMPDIR: tempDir,
  NO_COLOR: "1",
  OPENCLAW_CONFIG_PATH: privateConfigPath,
  OPENCLAW_LAB_ROOT: labRoot,
  OPENCLAW_LAB_STATE_DIR: runRoot,
  OPENCLAW_STATE_DIR: stateDir,
  OPENCLAW_GATEWAY_TOKEN: "phase1-ci-placeholder-not-a-secret",
};
const bridgePort = 19007;
const bridgeToken = "sol-holo-ci-loopback-bridge-token-00000001";

async function run(program, args, options = {}) {
  try {
    const result = await execFileAsync(program, args, {
      cwd: labRoot,
      env: commandEnv,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      timeout: options.timeout ?? 120_000,
    });
    return { ...result, code: 0 };
  } catch (error) {
    const result = {
      code: typeof error.code === "number" ? error.code : 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? String(error),
    };
    if (!options.allowFailure) {
      const rendered = [program, ...args].join(" ");
      throw new Error(
        `Befehl fehlgeschlagen (${result.code}): ${rendered}\n${result.stdout}\n${result.stderr}`,
        { cause: error },
      );
    }
    return result;
  }
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
      if (depth === 0 && start >= 0) candidates.push(text.slice(start, index + 1));
    }
  }

  for (const candidate of candidates.reverse()) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue with an earlier complete object.
    }
  }
  throw new Error(`Kein JSON-Objekt gefunden:\n${text}`);
}

function waitForMockReady(child, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const probe = () => {
      const request = http.get("http://127.0.0.1:19006/v1/models", (response) => {
        response.resume();
        if (response.statusCode === 200) resolve();
        else retry();
      });
      request.once("error", retry);
      request.setTimeout(500, () => request.destroy());
    };
    const retry = () => {
      if (child.exitCode !== null) {
        reject(new Error(`Mock-Server endete vorzeitig mit ${child.exitCode}`));
        return;
      }
      if (Date.now() >= deadline) {
        reject(new Error("Mock-Server wurde nicht rechtzeitig bereit"));
        return;
      }
      setTimeout(probe, 100);
    };
    probe();
  });
}

function waitForBridgeReady(child, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const probe = () => {
      const request = http.get(
        {
          host: "127.0.0.1",
          port: bridgePort,
          path: "/health",
          headers: { Authorization: `Bearer ${bridgeToken}` },
        },
        (response) => {
          response.resume();
          if (response.statusCode === 200) resolve();
          else retry();
        },
      );
      request.once("error", retry);
      request.setTimeout(500, () => request.destroy());
    };
    const retry = () => {
      if (child.exitCode !== null) {
        reject(new Error(`Alltag-Bridge endete vorzeitig mit ${child.exitCode}`));
        return;
      }
      if (Date.now() >= deadline) {
        reject(new Error("Alltag-Bridge wurde nicht rechtzeitig bereit"));
        return;
      }
      setTimeout(probe, 100);
    };
    probe();
  });
}

async function runPolicyProbe(domain, mode, expectedMarker) {
  const worker = `worker-${domain}`;
  const message = `${mode} ${domain}: Führe ausschließlich den deterministischen Labor-Rechtetest aus.`;
  const result = await run(
    openclaw,
    [
      "agent",
      "--local",
      "--agent",
      worker,
      "--session-key",
      sessions.get(domain),
      "--message",
      message,
      "--thinking",
      "off",
      "--timeout",
      "90",
      "--json",
    ],
    { timeout: 100_000 },
  );
  const output = `${result.stdout}\n${result.stderr}`;
  assert.ok(output.includes(expectedMarker), `${worker}/${mode}: erwartete Markierung fehlt\n${output}`);
  process.stdout.write(`POLICY_OK worker=${worker} test=${mode}\n`);
}

async function runAlltagPreview() {
  const expected = JSON.parse(
    fs.readFileSync(path.join(labRoot, "examples/result-alltag-preview.example.json"), "utf8"),
  );
  let approvalCounter = 0;
  const service = createOpenClawAlltagPreviewService({
    enabled: true,
    bridgeUrl: `http://127.0.0.1:${bridgePort}/v1/alltag-preview`,
    bridgeToken,
    randomId: () => `SOL-HOLO-CONTAINER-${String(++approvalCounter).padStart(3, "0")}`,
  });
  const request = {
    confirmation: SOL_HOLO_ALLTAG_PREVIEW_CONFIRMATION,
    ownerId: "pam-sol",
    selectedSpeakerId: "pam",
  };
  const response = await service.run(request);
  assert.equal(response.preview, true);
  assert.equal(response.productive, false);
  assert.equal(response.persisted, false);
  assert.equal(response.automaticRouting, false);
  assert.deepEqual(response.result, expected);
  await assert.rejects(service.run(request), (error) => error?.code === "APPROVAL_REPLAY");
  process.stdout.write(
    "ALLTAG_PREVIEW_SOL_HOLO_OK worker=worker-alltag ui_request=fixed trusted_gate=tested bridge=loopback read=1 proposal=1 external=false writes=false human_review=true replay=blocked\n",
  );
}

async function inspectContainer(container) {
  assert.equal(container.running, true, `${container.containerName}: Container läuft nicht`);
  assert.equal(container.imageMatch, true, `${container.containerName}: Image stimmt nicht`);

  const inspectResult = await run("docker", ["inspect", container.containerName]);
  const [inspection] = JSON.parse(inspectResult.stdout);
  assert.ok(inspection, `${container.containerName}: Inspect-Ergebnis fehlt`);
  const hostConfig = inspection.HostConfig;
  assert.equal(hostConfig.NetworkMode, "none", `${container.containerName}: Netzwerk muss none sein`);
  assert.equal(hostConfig.ReadonlyRootfs, true, `${container.containerName}: Root-Dateisystem muss read-only sein`);
  assert.equal(hostConfig.Privileged, false, `${container.containerName}: privileged ist verboten`);
  assert.ok((hostConfig.CapDrop ?? []).map(String).some((cap) => cap.toUpperCase() === "ALL"));
  assert.equal((hostConfig.CapAdd ?? []).length, 0, `${container.containerName}: CapAdd muss leer sein`);
  assert.ok(
    (hostConfig.SecurityOpt ?? []).some((entry) => entry.startsWith("no-new-privileges")),
    `${container.containerName}: no-new-privileges fehlt`,
  );

  const tmpfs = hostConfig.Tmpfs ?? {};
  for (const target of ["/tmp", "/var/tmp", "/run"]) {
    assert.ok(Object.hasOwn(tmpfs, target), `${container.containerName}: tmpfs ${target} fehlt`);
  }

  const mounts = inspection.Mounts ?? [];
  const agentMount = mounts.find((mount) => mount.Destination === "/agent");
  assert.ok(agentMount, `${container.containerName}: /agent-Mount fehlt`);
  assert.equal(agentMount.Type, "bind", `${container.containerName}: /agent muss Bind-Mount sein`);
  assert.equal(agentMount.RW, false, `${container.containerName}: /agent muss read-only sein`);
  assert.equal(
    mounts.some((mount) => mount.Type === "bind" && mount.RW === true),
    false,
    `${container.containerName}: schreibbarer Bind-Mount gefunden`,
  );

  const workspaceWrite = await run(
    "docker",
    ["exec", container.containerName, "sh", "-lc", "touch /agent/UNERLAUBT.md"],
    { allowFailure: true },
  );
  assert.notEqual(workspaceWrite.code, 0, `${container.containerName}: Schreiben nach /agent war möglich`);

  const rootWrite = await run(
    "docker",
    ["exec", container.containerName, "sh", "-lc", "touch /ROOTFS_UNERLAUBT"],
    { allowFailure: true },
  );
  assert.notEqual(rootWrite.code, 0, `${container.containerName}: Root-Dateisystem war schreibbar`);

  const tmpWrite = await run("docker", [
    "exec",
    container.containerName,
    "sh",
    "-lc",
    "touch /tmp/openclaw-lab-probe && rm /tmp/openclaw-lab-probe",
  ]);
  assert.equal(tmpWrite.code, 0, `${container.containerName}: /tmp muss flüchtig schreibbar sein`);
  process.stdout.write(`CONTAINER_OK name=${container.containerName}\n`);
}

let mock;
let mockOutput = "";
let bridge;
let bridgeOutput = "";
let primaryError;

try {
  const dockerVersion = await run("docker", ["version", "--format", "{{.Server.Version}}"], {
    timeout: 15_000,
  });
  process.stdout.write(`DOCKER_READY version=${dockerVersion.stdout.trim()}\n`);

  mock = spawn(process.execPath, [path.join(testDir, "mock-openai-server.mjs")], {
    cwd: labRoot,
    env: {
      ...commandEnv,
      OPENCLAW_LAB_MOCK_WORKSPACE_PREFIX: "/agent",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  mock.stdout.on("data", (chunk) => {
    mockOutput += chunk.toString();
  });
  mock.stderr.on("data", (chunk) => {
    mockOutput += chunk.toString();
  });
  await waitForMockReady(mock);

  for (const domain of workers) {
    await runPolicyProbe(domain, "LAB_READ", `LAB_READ_OK:${domain}`);
    await runPolicyProbe(domain, "LAB_CROSS_READ", `LAB_CROSS_READ_BLOCKED:${domain}`);
    await runPolicyProbe(domain, "LAB_WRITE", `LAB_WRITE_BLOCKED:${domain}`);
  }

  bridge = spawn(
    process.execPath,
    [path.join(labRoot, "phase2", "alltag-preview-bridge.mjs")],
    {
      cwd: labRoot,
      env: {
        ...commandEnv,
        OPENCLAW_LAB_ALLTAG_PREVIEW_ENABLED: "1",
        OPENCLAW_LAB_ALLTAG_PREVIEW_SESSION_KEY: sessions.get("alltag"),
        OPENCLAW_LAB_BRIDGE_PORT: String(bridgePort),
        OPENCLAW_LAB_BRIDGE_TOKEN: bridgeToken,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  bridge.stdout.on("data", (chunk) => {
    bridgeOutput += chunk.toString();
  });
  bridge.stderr.on("data", (chunk) => {
    bridgeOutput += chunk.toString();
  });
  await waitForBridgeReady(bridge);
  await runAlltagPreview();

  const listResult = await run(openclaw, ["sandbox", "list", "--json"]);
  const list = lastJsonObject(`${listResult.stdout}\n${listResult.stderr}`);
  process.stdout.write(
    `SANDBOX_LIST ${JSON.stringify(list.containers.map(({ containerName, sessionKey }) => ({ containerName, sessionKey })))}\n`,
  );
  assert.deepEqual(list.browsers, [], "Browser-Sandboxes sind in Phase 1 verboten");
  assert.equal(list.containers.length, 6, "Genau sechs Worker-Container erwartet");

  for (const domain of workers) {
    const sessionKey = sessions.get(domain);
    const container = list.containers.find((entry) =>
      new RegExp(`^${sessionKey.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}:workspace:[a-f0-9]{32}$`, "u").test(
        entry.sessionKey,
      ),
    );
    assert.ok(container, `Container für ${sessionKey} fehlt`);
    await inspectContainer(container);
  }

  for (const domain of workers) {
    assert.equal(
      fs.existsSync(path.join(labRoot, "workspaces", domain, "UNERLAUBT.md")),
      false,
      `${domain}: verbotene Datei entstand`,
    );
  }

  process.stdout.write(
    `CONTAINER_POLICY_SUITE_OK workers=6 reads=6 cross_reads_blocked=6 writes_blocked=6 previews=1 containers=6\n`,
  );
} catch (error) {
  primaryError = error;
  process.stderr.write(`${error.stack ?? error}\n`);
  if (mockOutput) process.stderr.write(`MOCK_LOG\n${mockOutput}\n`);
  if (bridgeOutput) process.stderr.write(`BRIDGE_LOG\n${bridgeOutput}\n`);
} finally {
  if (bridge && bridge.exitCode === null) bridge.kill("SIGTERM");
  if (mock && mock.exitCode === null) mock.kill("SIGTERM");
  try {
    await run(openclaw, ["sandbox", "recreate", "--all", "--force"], {
      allowFailure: true,
      timeout: 60_000,
    });
  } catch {
    // The primary test result remains authoritative.
  }
  fs.rmSync(runRoot, { recursive: true, force: true });
}

if (primaryError) process.exitCode = 1;
