import {
  mkdir,
  readFile,
  readdir,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const nodeModulesDirectory = path.join(projectDirectory, "node_modules");
const webDirectory = path.join(projectDirectory, "www");
const licenseFallbackDirectory = path.join(projectDirectory, "licenses");

const rootPackage = JSON.parse(
  await readFile(path.join(projectDirectory, "package.json"), "utf8")
);

const groups = [
  {
    title: "Runtime dependencies",
    names: Object.keys(rootPackage.dependencies || {}).sort()
  },
  {
    title: "Development dependencies",
    names: Object.keys(rootPackage.devDependencies || {}).sort()
  }
];

const licenseNamePatterns = [
  /^licen[cs]e(?:\..+)?$/i,
  /^copying(?:\..+)?$/i,
  /^copyright(?:\..+)?$/i
];

const noticeNamePatterns = [
  /^notice(?:\..+)?$/i,
  /^third[-_ ]party(?:[-_ ]notices?)?(?:\..+)?$/i
];

const knownLicenseFallbacks = new Map([
  ["Apache-2.0", path.join(licenseFallbackDirectory, "APACHE-2.0.txt")]
]);

function packageDirectory(packageName) {
  return path.join(nodeModulesDirectory, ...packageName.split("/"));
}

async function findFileByPatterns(directory, patterns) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const pattern of patterns) {
    const match = entries
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .sort()
      .find(name => pattern.test(name));

    if (match) {
      return path.join(directory, match);
    }
  }

  return null;
}

function formatDeclaredLicense(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (value) {
    return JSON.stringify(value);
  }

  return "not declared in package.json";
}

async function resolveLicenseText(name, packageJson, directory) {
  const packageLicenseFile = await findFileByPatterns(
    directory,
    licenseNamePatterns
  );

  if (packageLicenseFile) {
    return {
      text: (await readFile(packageLicenseFile, "utf8")).trim(),
      source: path.relative(projectDirectory, packageLicenseFile),
      fallback: false
    };
  }

  const declaredLicense = formatDeclaredLicense(packageJson.license);
  const fallbackFile = knownLicenseFallbacks.get(declaredLicense);

  if (fallbackFile) {
    return {
      text: (await readFile(fallbackFile, "utf8")).trim(),
      source:
        path.relative(projectDirectory, fallbackFile) +
        " (canonical fallback; installed npm package ships no standalone license file)",
      fallback: true
    };
  }

  throw new Error(
    `Keine Lizenzdatei oder geprüfte Fallback-Lizenz für direkte Abhängigkeit ${name}@${packageJson.version} gefunden.`
  );
}

const sections = [];

for (const group of groups) {
  if (!group.names.length) {
    continue;
  }

  sections.push(
    "============================================================\n" +
      `${group.title}\n` +
      "============================================================\n"
  );

  for (const name of group.names) {
    const directory = packageDirectory(name);
    const packageJson = JSON.parse(
      await readFile(path.join(directory, "package.json"), "utf8")
    );
    const license = await resolveLicenseText(name, packageJson, directory);
    const noticeFile = await findFileByPatterns(directory, noticeNamePatterns);
    const noticeText = noticeFile
      ? (await readFile(noticeFile, "utf8")).trim()
      : "";

    sections.push(
      "------------------------------------------------------------\n" +
        `${name}@${packageJson.version}\n` +
        `Declared license: ${formatDeclaredLicense(packageJson.license)}\n` +
        `License source: ${license.source}\n` +
        "------------------------------------------------------------\n\n" +
        license.text +
        (noticeText
          ? "\n\nNOTICE / attribution text from installed package:\n\n" +
            noticeText
          : "") +
        "\n"
    );
  }
}

const mediaPipeModelNotice = `
============================================================
MediaPipe Face Landmarker model bundle
============================================================

Source:
https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task

Pinned SHA-256 used by Sol Holo:
64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff

The downloadable Face Landmarker bundle contains the BlazeFace face detector,
FaceMesh-V2 and Blendshape models. Google's published model cards identify
these model components as licensed under the Apache License, Version 2.0.
The Sol Holo build stores the downloaded model bundle without modifying its
binary contents. A full Apache-2.0 license text is included in this file.

Model-card references:
https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20%28Short%20Range%29.pdf
https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf
https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf
`;

const header = `SOL HOLO / PAM'S HOLO - THIRD-PARTY LICENSES
Generated from the exact direct npm packages installed for this build.

This file does not transfer ownership of third-party software, models,
trademarks or other rights to Pamela Nitschke or Sol Holo. Each component
remains subject to its own license and the rights of its respective rights
holders.

The file includes the license text found inside each direct npm dependency.
If a package declares Apache-2.0 but does not ship a standalone license file,
the build uses the canonical Apache-2.0 text stored in licenses/APACHE-2.0.txt.
Any NOTICE/attribution file shipped at the top level of a direct package is
included as well. Development-only packages are identified separately.

Transitive dependencies remain subject to their own licenses as recorded in
package-lock.json and in their distributed package metadata.

`;

const output =
  header +
  sections.join("\n") +
  "\n" +
  mediaPipeModelNotice.trim() +
  "\n";

await mkdir(webDirectory, { recursive: true });

for (const target of [
  path.join(projectDirectory, "THIRD_PARTY_LICENSES.txt"),
  path.join(webDirectory, "THIRD_PARTY_LICENSES.txt")
]) {
  await writeFile(target, output, "utf8");
}

console.log(
  "Drittanbieter-Lizenztexte wurden für Repository und App-Bundle erzeugt."
);
