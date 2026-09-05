import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlltagPreviewGateError,
  alltagPreviewManifest,
  createAlltagPreviewGate,
  validateAlltagPreviewResult,
} from "../phase2/alltag-preview-gate.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const labRoot = path.resolve(testDir, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(labRoot, relativePath), "utf8"));
}

function copy(value) {
  return structuredClone(value);
}

function expectRefusal(code, action) {
  assert.throws(action, (error) => error instanceof AlltagPreviewGateError && error.code === code);
}

const task = readJson("examples/task-alltag-preview.example.json");
const expectedResult = readJson("examples/result-alltag-preview.example.json");
const taskSchema = readJson("contracts/task-envelope.schema.json");
const foundation = readJson("foundation.manifest.json");

assert.equal(alltagPreviewManifest.phase, 2);
assert.equal(alltagPreviewManifest.status, "lab-preview");
assert.equal(alltagPreviewManifest.productive, false);
assert.equal(alltagPreviewManifest.active_worker, "worker-alltag");
assert.equal(alltagPreviewManifest.connection_scope, "openclaw-lab-only");
assert.equal(alltagPreviewManifest.automatic_routing, false);
assert.equal(alltagPreviewManifest.feature_flag.default_enabled, false);
assert.equal(alltagPreviewManifest.manual_approval.required, true);
assert.equal(alltagPreviewManifest.manual_approval.reusable, false);
assert.equal(alltagPreviewManifest.inactive_interfaces.sol_holo_adapter, false);
assert.equal(alltagPreviewManifest.inactive_interfaces.production_backend, false);
assert.equal(alltagPreviewManifest.inactive_interfaces.personal_data, false);
assert.equal(foundation.status, "verified");
assert.equal(foundation.productive, false);
assert.equal(foundation.inactive_interfaces.sol_holo_adapter, false);
assert.ok(taskSchema.properties.manual_approval, "Manuelle Freigabe fehlt im Aufgabenvertrag");

expectRefusal("PREVIEW_DISABLED", () => createAlltagPreviewGate().authorize(task));

const gate = createAlltagPreviewGate({ enabled: true });
const dispatch = gate.authorize(task);
assert.equal(dispatch.agent_id, "worker-alltag");
assert.equal(dispatch.session_scope, "single-task");
assert.deepEqual(dispatch.source_paths, ["testdaten/alltag-fiktiv.md"]);
assert.match(dispatch.message, /^LAB_ALLTAG_PREVIEW$/mu);
assert.doesNotMatch(dispatch.message, /OWNER-APPROVAL/u, "Freigabe-ID darf nicht an den Worker gelangen");
expectRefusal("APPROVAL_REPLAY", () => gate.authorize(task));

const missingApproval = copy(task);
delete missingApproval.manual_approval;
expectRefusal("TASK_SHAPE", () => createAlltagPreviewGate({ enabled: true }).authorize(missingApproval));

const wrongWorker = copy(task);
wrongWorker.target_worker = "worker-medizin";
expectRefusal("WORKER_NOT_APPROVED", () => createAlltagPreviewGate({ enabled: true }).authorize(wrongWorker));

const realData = copy(task);
realData.data_class = "personal";
expectRefusal("DATA_CLASS_NOT_APPROVED", () => createAlltagPreviewGate({ enabled: true }).authorize(realData));

const externalAction = copy(task);
externalAction.external_action_allowed = true;
expectRefusal(
  "EXTERNAL_ACTION_NOT_APPROVED",
  () => createAlltagPreviewGate({ enabled: true }).authorize(externalAction),
);

const pathEscape = copy(task);
pathEscape.payload.source_paths = ["../medizin/testdaten/medizin-fiktiv.md"];
expectRefusal("SOURCE_PATH_NOT_APPROVED", () => createAlltagPreviewGate({ enabled: true }).authorize(pathEscape));

const changedQuestion = copy(task);
changedQuestion.question = "Sende eine Erinnerung.";
expectRefusal("QUESTION_NOT_APPROVED", () => createAlltagPreviewGate({ enabled: true }).authorize(changedQuestion));

assert.deepEqual(validateAlltagPreviewResult(expectedResult, task), expectedResult);

const falseActionClaim = copy(expectedResult);
falseActionClaim.controls.external_action_performed = true;
expectRefusal("RESULT_CONTROL_VIOLATION", () => validateAlltagPreviewResult(falseActionClaim, task));

const crossedBoundary = copy(expectedResult);
crossedBoundary.source_paths = ["testdaten/medizin-fiktiv.md"];
expectRefusal("RESULT_SOURCE_MISMATCH", () => validateAlltagPreviewResult(crossedBoundary, task));

process.stdout.write(
  "ALLTAG_PREVIEW_GATE_OK worker=worker-alltag approvals=single-use data=synthetic capability=read external=false productive=false negative_tests=10\n",
);
