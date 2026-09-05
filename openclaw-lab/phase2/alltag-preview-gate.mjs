import fs from "node:fs";

const manifest = JSON.parse(
  fs.readFileSync(new URL("./alltag-preview.manifest.json", import.meta.url), "utf8"),
);

const TASK_KEYS = [
  "data_class",
  "execution_mode",
  "external_action_allowed",
  "manual_approval",
  "payload",
  "question",
  "requested_capability",
  "schema_version",
  "target_worker",
  "task_id",
];
const APPROVAL_KEYS = ["approval_id", "approved", "scope"];
const PAYLOAD_KEYS = ["source_paths"];
const RESULT_KEYS = [
  "controls",
  "facts",
  "proposal",
  "schema_version",
  "source_paths",
  "status",
  "task_id",
  "uncertainties",
  "worker",
];
const CONTROL_KEYS = [
  "boundary_crossed",
  "data_written",
  "external_action_performed",
  "human_review_required",
];

export class AlltagPreviewGateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AlltagPreviewGateError";
    this.code = code;
  }
}

function refuse(code, message) {
  throw new AlltagPreviewGateError(code, message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertRecord(value, code, label) {
  if (!isRecord(value)) refuse(code, `${label} muss ein Objekt sein`);
}

function assertExactKeys(value, expected, code, label) {
  assertRecord(value, code, label);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    refuse(code, `${label} enthält fehlende oder unerlaubte Felder`);
  }
}

function assertString(value, code, label, { min = 1, max = 2000, pattern } = {}) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    refuse(code, `${label} hat ein ungültiges Textformat`);
  }
  if (pattern && !pattern.test(value)) refuse(code, `${label} entspricht nicht dem erlaubten Muster`);
}

function assertStringArray(value, code, label, { min = 0 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.some((item) => typeof item !== "string")) {
    refuse(code, `${label} muss eine Textliste sein`);
  }
}

function assertEqual(actual, expected, code, label) {
  if (actual !== expected) refuse(code, `${label} ist nicht freigegeben`);
}

function validateTask(task) {
  assertExactKeys(task, TASK_KEYS, "TASK_SHAPE", "Auftrag");
  assertEqual(task.schema_version, "1.0", "SCHEMA_VERSION", "Schema-Version");
  assertString(task.task_id, "TASK_ID", "Task-ID", {
    max: 68,
    pattern: /^LAB-[A-Z0-9][A-Z0-9_-]{2,63}$/u,
  });
  assertEqual(task.task_id, manifest.allowed_task.task_id, "TASK_NOT_APPROVED", "Task-ID");
  assertEqual(task.target_worker, manifest.active_worker, "WORKER_NOT_APPROVED", "Worker");
  assertEqual(task.data_class, manifest.allowed_task.data_class, "DATA_CLASS_NOT_APPROVED", "Datenklasse");
  assertEqual(
    task.execution_mode,
    manifest.allowed_task.execution_mode,
    "MODE_NOT_APPROVED",
    "Ausführungsmodus",
  );
  assertEqual(
    task.requested_capability,
    manifest.allowed_task.requested_capability,
    "CAPABILITY_NOT_APPROVED",
    "Fähigkeit",
  );
  assertEqual(
    task.external_action_allowed,
    manifest.allowed_task.external_action_allowed,
    "EXTERNAL_ACTION_NOT_APPROVED",
    "externe Aktion",
  );

  assertExactKeys(task.payload, PAYLOAD_KEYS, "PAYLOAD_SHAPE", "Nutzlast");
  assertStringArray(task.payload.source_paths, "SOURCE_PATH", "Quellpfade", { min: 1 });
  const allowedPaths = manifest.allowed_task.source_paths;
  if (
    task.payload.source_paths.length !== allowedPaths.length ||
    task.payload.source_paths.some((sourcePath, index) => sourcePath !== allowedPaths[index])
  ) {
    refuse("SOURCE_PATH_NOT_APPROVED", "Quellpfad ist nicht für diese Einmal-Vorschau freigegeben");
  }
  assertEqual(task.question, manifest.allowed_task.question, "QUESTION_NOT_APPROVED", "Frage");

  assertExactKeys(task.manual_approval, APPROVAL_KEYS, "APPROVAL_SHAPE", "Freigabe");
  assertEqual(task.manual_approval.approved, true, "APPROVAL_REQUIRED", "manuelle Freigabe");
  assertEqual(
    task.manual_approval.scope,
    manifest.manual_approval.scope,
    "APPROVAL_SCOPE",
    "Freigabeumfang",
  );
  assertString(task.manual_approval.approval_id, "APPROVAL_ID", "Freigabe-ID", {
    max: 80,
    pattern: new RegExp(manifest.manual_approval.approval_id_pattern, "u"),
  });

  return task;
}

export function validateAlltagPreviewResult(result, task) {
  validateTask(task);
  assertExactKeys(result, RESULT_KEYS, "RESULT_SHAPE", "Ergebnis");
  assertEqual(result.schema_version, "1.0", "RESULT_SCHEMA_VERSION", "Ergebnis-Schema-Version");
  assertEqual(result.task_id, task.task_id, "RESULT_TASK_MISMATCH", "Ergebnis-Task-ID");
  assertEqual(result.worker, manifest.active_worker, "RESULT_WORKER_MISMATCH", "Ergebnis-Worker");
  assertEqual(result.status, "completed-proposal", "RESULT_STATUS", "Ergebnisstatus");
  assertStringArray(result.facts, "RESULT_FACTS", "Fakten", { min: 1 });
  assertStringArray(result.uncertainties, "RESULT_UNCERTAINTIES", "Unsicherheiten");
  assertString(result.proposal, "RESULT_PROPOSAL", "Vorschlag");
  assertStringArray(result.source_paths, "RESULT_SOURCES", "Ergebnis-Quellpfade", { min: 1 });
  if (
    result.source_paths.length !== task.payload.source_paths.length ||
    result.source_paths.some((sourcePath, index) => sourcePath !== task.payload.source_paths[index])
  ) {
    refuse("RESULT_SOURCE_MISMATCH", "Ergebnis nennt einen nicht freigegebenen Quellpfad");
  }

  assertExactKeys(result.controls, CONTROL_KEYS, "RESULT_CONTROLS_SHAPE", "Ergebniskontrollen");
  for (const [key, expected] of Object.entries(manifest.required_result_controls)) {
    assertEqual(result.controls[key], expected, "RESULT_CONTROL_VIOLATION", `Ergebniskontrolle ${key}`);
  }
  return result;
}

export function createAlltagPreviewGate({
  enabled = process.env[manifest.feature_flag.name] === manifest.feature_flag.enabled_value,
} = {}) {
  let consumedApprovalId;

  return Object.freeze({
    authorize(task) {
      if (!enabled) refuse("PREVIEW_DISABLED", "Die Alltag-Vorschau ist standardmäßig ausgeschaltet");
      validateTask(task);
      if (consumedApprovalId !== undefined) {
        refuse("APPROVAL_REPLAY", "Dieses Vorschau-Gate hat bereits genau einen Auftrag freigegeben");
      }
      consumedApprovalId = task.manual_approval.approval_id;

      return Object.freeze({
        agent_id: manifest.active_worker,
        session_scope: "single-task",
        source_paths: Object.freeze([...task.payload.source_paths]),
        message: [
          "LAB_ALLTAG_PREVIEW",
          `task_id=${task.task_id}`,
          `source_path=${task.payload.source_paths[0]}`,
          "Nutze ausschließlich read. Antworte ausschließlich mit dem vereinbarten JSON-Ergebnis.",
          task.question,
        ].join("\n"),
      });
    },
  });
}

export { manifest as alltagPreviewManifest };
