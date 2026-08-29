import {
  access,
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const packageDirectory = path.join(
  projectDirectory,
  "node_modules",
  "@mediapipe",
  "tasks-vision"
);
const targetDirectory = path.join(projectDirectory, "www", "mediapipe");
const wasmDirectory = path.join(targetDirectory, "wasm");

const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/" +
  "face_landmarker/float16/latest/face_landmarker.task";
const modelSha256 =
  "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff";

const packageAssets = [
  ["vision_bundle.mjs", "vision_bundle.mjs"],
  ["wasm/vision_wasm_internal.js", "wasm/vision_wasm_internal.js"],
  ["wasm/vision_wasm_internal.wasm", "wasm/vision_wasm_internal.wasm"],
  [
    "wasm/vision_wasm_nosimd_internal.js",
    "wasm/vision_wasm_nosimd_internal.js"
  ],
  [
    "wasm/vision_wasm_nosimd_internal.wasm",
    "wasm/vision_wasm_nosimd_internal.wasm"
  ]
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function fileHasExpectedHash(filePath, expectedHash) {
  try {
    return sha256(await readFile(filePath)) === expectedHash;
  } catch {
    return false;
  }
}

async function downloadModel(targetPath) {
  const temporaryPath = `${targetPath}.download`;
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(modelUrl, { redirect: "follow" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      const actualHash = sha256(bytes);
      if (actualHash !== modelSha256) {
        throw new Error(`unerwartete SHA-256-Prüfsumme ${actualHash}`);
      }

      await writeFile(temporaryPath, bytes);
      await rename(temporaryPath, targetPath);
      return;
    } catch (error) {
      lastError = error;
      await rm(temporaryPath, { force: true });
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, attempt * 800));
      }
    }
  }

  throw new Error(
    `MediaPipe-Gesichtsmodell konnte nicht geladen werden: ${lastError}`
  );
}

await access(packageDirectory);
await mkdir(wasmDirectory, { recursive: true });

for (const [sourceName, targetName] of packageAssets) {
  await copyFile(
    path.join(packageDirectory, sourceName),
    path.join(targetDirectory, targetName)
  );
}

const visionBundlePath = path.join(targetDirectory, "vision_bundle.mjs");
const telemetryEndpoint = "https://odml.pa.googleapis.com/v1/log";
const localNoNetworkEndpoint = "data:application/octet-stream,";
const visionBundle = await readFile(visionBundlePath, "utf8");

if (!visionBundle.includes(telemetryEndpoint)) {
  throw new Error(
    "MediaPipe-Telemetrieadresse wurde nicht eindeutig gefunden."
  );
}

await writeFile(
  visionBundlePath,
  visionBundle.replaceAll(telemetryEndpoint, localNoNetworkEndpoint),
  "utf8"
);

const modelPath = path.join(targetDirectory, "face_landmarker.task");
if (!(await fileHasExpectedHash(modelPath, modelSha256))) {
  await downloadModel(modelPath);
}

console.log("Lokale MediaPipe-Vollgesichtsdateien sind bereit.");
