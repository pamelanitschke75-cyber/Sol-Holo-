import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const labRoot = path.resolve(testDir, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(labRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function objectBody(source, key) {
  const keyMatch = new RegExp(`(?:"${key}"|\\b${key}\\b)\\s*:`, "u").exec(source);
  assert.ok(keyMatch, `Konfigurationsblock fehlt: ${key}`);
  const start = source.indexOf("{", keyMatch.index + keyMatch[0].length);
  assert.notEqual(start, -1, `Objektanfang fehlt: ${key}`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`Objektende fehlt: ${key}`);
}

function assertIncludes(source, fragment, label) {
  assert.ok(source.includes(fragment), `${label} fehlt: ${fragment}`);
}

const manifest = readJson("foundation.manifest.json");
const taskSchema = readJson("contracts/task-envelope.schema.json");
const resultSchema = readJson("contracts/worker-result.schema.json");
const taskExample = readJson("examples/task-sicherheit.example.json");
const resultExample = readJson("examples/result-sicherheit.example.json");
const config = read("openclaw.lab.example.json5");
const mockServer = read("tests/mock-openai-server.mjs");

assert.equal(manifest.phase, 1);
assert.equal(manifest.status, "verified");
assert.equal(manifest.productive, false);
assert.equal(manifest.data_class, "synthetic-only");
assert.equal(manifest.execution_mode, "proposal-only");
assert.equal(manifest.coordinator.automatic_routing, false);
assert.deepEqual(manifest.coordinator.tools, []);

const workers = manifest.workers;
assert.equal(workers.length, 6, "Es müssen genau sechs Worker registriert sein");
const workerIds = workers.map(({ id }) => id);
const domains = workers.map(({ domain }) => domain);
assert.equal(new Set(workerIds).size, 6, "Worker-IDs müssen eindeutig sein");
assert.equal(new Set(domains).size, 6, "Bereiche müssen eindeutig sein");
assert.equal(new Set(workers.map(({ workspace }) => workspace)).size, 6, "Workspaces müssen eindeutig sein");
assert.deepEqual(taskSchema.properties.target_worker.enum, workerIds);
assert.deepEqual(resultSchema.properties.worker.enum, workerIds);

for (const worker of workers) {
  assert.deepEqual(worker.capabilities, ["read"], `${worker.id}: nur read erlaubt`);
  assert.equal(worker.workspace, `workspaces/${worker.domain}`);

  const block = objectBody(config, worker.id);
  assertIncludes(block, `workspace: "\${OPENCLAW_LAB_ROOT}/${worker.workspace}"`, worker.id);
  assertIncludes(block, `agentDir: "\${OPENCLAW_LAB_STATE_DIR}/agents/${worker.id}"`, worker.id);
  assertIncludes(block, 'workspaceAccess: "ro"', worker.id);
  assert.match(block, /allow:\s*\["read"\]/u, `${worker.id}: effektive Freigabe muss read sein`);

  for (const filename of ["AGENTS.md", "SOUL.md", "IDENTITY.md", "USER.md"]) {
    assert.ok(fs.existsSync(path.join(labRoot, worker.workspace, filename)), `${worker.id}: ${filename} fehlt`);
  }

  const fixtureDir = path.join(labRoot, worker.workspace, "testdaten");
  const fixtures = fs.readdirSync(fixtureDir).filter((name) => name.endsWith(".md"));
  assert.equal(fixtures.length, 1, `${worker.id}: genau eine Testdatei erwartet`);
  assertIncludes(fs.readFileSync(path.join(fixtureDir, fixtures[0]), "utf8"), "FIKTIVE TESTDATEN", worker.id);
  assert.match(mockServer, new RegExp(`\\n  ${worker.domain}: \\{`, "u"), `${worker.domain}: Mock-Domäne fehlt`);
}

const configuredWorkerIds = [...config.matchAll(/"(worker-[a-z-]+)":\s*\{/gu)].map((match) => match[1]);
assert.deepEqual(configuredWorkerIds, workerIds, "Manifest und Konfiguration müssen dieselben Worker enthalten");

for (const fragment of [
  'enabled: false',
  'mode: "all"',
  'backend: "docker"',
  'scope: "session"',
  'readOnlyRoot: true',
  'network: "none"',
  'capDrop: ["ALL"]',
  'allow: ["read"]',
  'enabled: false',
]) {
  assertIncludes(config, fragment, "globale Schutzregel");
}
assertIncludes(objectBody(config, "agentToAgent"), "enabled: false", "Agent-zu-Agent-Sperre");
assertIncludes(objectBody(config, "plugins"), "enabled: false", "Plugin-Sperre");
assertIncludes(objectBody(config, "telemetry"), "enabled: false", "Telemetrie-Sperre");
assert.match(objectBody(config, "sol-holo-lab"), /deny:\s*\["\*"\]/u, "Koordinator muss werkzeuglos sein");

for (const [key, expected] of Object.entries({
  sandbox_backend: "docker",
  sandbox_scope: "session",
  workspace_access: "ro",
  container_network: "none",
  read_only_root: true,
  drop_all_capabilities: true,
  plugins_enabled: false,
  skills_enabled: false,
  worker_to_worker: false,
  external_actions: false,
  writes: false,
  unknown_domain_policy: "refuse",
})) {
  assert.deepEqual(manifest.technical_invariants[key], expected, `Manifest-Invariante abweichend: ${key}`);
}

for (const value of Object.values(manifest.inactive_interfaces)) assert.equal(value, false);
assert.deepEqual(manifest.transition_gate, {
  next_phase_automatic: false,
  requires_separate_design: true,
  requires_technical_tests: true,
  requires_pam_explicit_confirmation: true,
});

const safetyRules = read("workspaces/sicherheit/AGENTS.md");
for (const term of ["keine technische Verbindung", "Kamera", "Sensoren", "sicheren Zwischenzustand", "menschlich"]) {
  assertIncludes(`${read("README.md")}\n${safetyRules}`, term, "Sicherheitsgrenze");
}

const medicineRules = read("workspaces/medizin/AGENTS.md");
for (const term of ["kein Arzt", "Diagnose", "Dosierung", "112", "116117", "Fachperson"]) {
  assertIncludes(medicineRules, term, "Medizingrenze");
}

assert.equal(taskSchema.properties.data_class.const, "synthetic");
assert.equal(taskSchema.properties.execution_mode.const, "proposal-only");
assert.equal(taskSchema.properties.requested_capability.const, "read");
assert.equal(taskSchema.properties.external_action_allowed.const, false);
assert.equal(resultSchema.properties.controls.properties.external_action_performed.const, false);
assert.equal(resultSchema.properties.controls.properties.data_written.const, false);
assert.equal(resultSchema.properties.controls.properties.boundary_crossed.const, false);

assert.equal(taskExample.schema_version, taskSchema.properties.schema_version.const);
assert.ok(workerIds.includes(taskExample.target_worker));
assert.equal(taskExample.data_class, taskSchema.properties.data_class.const);
assert.equal(taskExample.execution_mode, taskSchema.properties.execution_mode.const);
assert.equal(taskExample.requested_capability, taskSchema.properties.requested_capability.const);
assert.equal(taskExample.external_action_allowed, false);
assert.ok(
  taskExample.payload.source_paths.every(
    (sourcePath) => !path.isAbsolute(sourcePath) && !sourcePath.split("/").includes(".."),
  ),
);
assert.equal(resultExample.task_id, taskExample.task_id);
assert.equal(resultExample.worker, taskExample.target_worker);
assert.ok(resultSchema.properties.status.enum.includes(resultExample.status));
assert.equal(resultExample.controls.external_action_performed, false);
assert.equal(resultExample.controls.data_written, false);
assert.equal(resultExample.controls.boundary_crossed, false);
assert.equal(resultExample.controls.human_review_required, true);

process.stdout.write(
  `GRUNDGERUEST_OK workers=${workers.length} contracts=2 phase1_examples=2 status=verified data=synthetic sandbox=docker network=none writes=false external=false\n`,
);
