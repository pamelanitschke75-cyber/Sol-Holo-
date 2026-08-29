import {
  mkdir,
  readFile,
  readdir,
  writeFile
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const nodeModulesDirectory = path.join(projectDirectory, "node_modules");
const webDirectory = path.join(projectDirectory, "www");
const thirdPartyWebDirectory = path.join(webDirectory, "third-party");
const licenseFallbackDirectory = path.join(projectDirectory, "licenses");

const rootPackage = JSON.parse(
  await readFile(path.join(projectDirectory, "package.json"), "utf8")
);
const lockFile = JSON.parse(
  await readFile(path.join(projectDirectory, "package-lock.json"), "utf8")
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

const reviewedNpmLicenseExpressions = new Set([
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BlueOak-1.0.0",
  "ISC",
  "MIT",
  "Unlicense",
  "(BSD-2-Clause OR MIT OR Apache-2.0)"
]);

const headAudioUpstream = {
  repository: "met4citizen/HeadAudio",
  commit: "d3af5f9ff86ab6b2b1913d411a4e1922ec101953",
  license: "MIT",
  copyright: "Copyright (c) 2025 Mika Suominen"
};

const headAudioAssets = [
  {
    path: "www/headaudio.min.mjs",
    upstreamPath: "dist/headaudio.min.mjs",
    upstreamGitBlobSha: "92226eacbbfce618fcc2c85c0a61211ad8deb882",
    encoding: "text"
  },
  {
    path: "www/headworklet.min.mjs",
    upstreamPath: "dist/headworklet.min.mjs",
    upstreamGitBlobSha: "6457b2102acc32b771fda67170c1a196d1657e3f",
    encoding: "text"
  },
  {
    path: "www/model-en-mixed.b64",
    upstreamPath: "dist/model-en-mixed.bin",
    upstreamGitBlobSha: "b152a45ae696a6674171e22686fc3473956157fc",
    encoding: "base64"
  }
];

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

function gitBlobSha(bytes) {
  const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const prefix = Buffer.from(`blob ${body.length}\0`, "utf8");
  return createHash("sha1")
    .update(prefix)
    .update(body)
    .digest("hex");
}

async function verifyHeadAudioAssets() {
  const rows = [];

  for (const asset of headAudioAssets) {
    const absolutePath = path.join(projectDirectory, asset.path);
    let bytes;

    if (asset.encoding === "base64") {
      const encoded = (await readFile(absolutePath, "utf8"))
        .replace(/\s+/g, "");
      bytes = Buffer.from(encoded, "base64");
    } else {
      const text = await readFile(absolutePath, "utf8");
      bytes = Buffer.from(text.replace(/\r?\n$/, ""), "utf8");
    }

    const actualGitBlobSha = gitBlobSha(bytes);
    if (actualGitBlobSha !== asset.upstreamGitBlobSha) {
      throw new Error(
        `HeadAudio-Datei ${asset.path} weicht vom geprüften Upstream-Stand ab. ` +
        `Erwartet ${asset.upstreamGitBlobSha}, erhalten ${actualGitBlobSha}. ` +
        "Vor einer Distribution muss die Abweichung erneut lizenzrechtlich geprüft werden."
      );
    }

    rows.push(
      `${asset.path} -> ${asset.upstreamPath} | git blob ${actualGitBlobSha}`
    );
  }

  return rows;
}

function buildNpmLicenseInventory() {
  const rows = [];
  const unknown = [];
  const missing = [];

  for (const [packagePath, metadata] of Object.entries(lockFile.packages || {})) {
    if (!packagePath || !metadata?.version) {
      continue;
    }

    const name = packagePath.replace(/^node_modules\//, "");
    const license = formatDeclaredLicense(metadata.license);
    const scope = metadata.dev ? "dev" : "runtime/transitive";

    if (license === "not declared in package.json") {
      missing.push(`${name}@${metadata.version}`);
    } else if (!reviewedNpmLicenseExpressions.has(license)) {
      unknown.push(`${name}@${metadata.version}: ${license}`);
    }

    rows.push(`${name}@${metadata.version} | ${license} | ${scope}`);
  }

  if (missing.length) {
    throw new Error(
      "NPM-Abhängigkeiten ohne deklarierte Lizenz gefunden:\n" +
      missing.join("\n")
    );
  }

  if (unknown.length) {
    throw new Error(
      "Noch nicht manuell freigegebene NPM-Lizenzausdrücke gefunden:\n" +
      unknown.join("\n")
    );
  }

  return rows.sort((a, b) => a.localeCompare(b));
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

const npmInventoryRows = buildNpmLicenseInventory();
const headAudioVerificationRows = await verifyHeadAudioAssets();
const headAudioLicensePath = path.join(
  thirdPartyWebDirectory,
  "HeadAudio-LICENSE.txt"
);
const headAudioLicenseText = (
  await readFile(headAudioLicensePath, "utf8")
).trim();

const headAudioNotice = `
============================================================
HeadAudio browser lip-sync components
============================================================

Upstream repository: ${headAudioUpstream.repository}
Pinned upstream commit: ${headAudioUpstream.commit}
License: ${headAudioUpstream.license}
${headAudioUpstream.copyright}

The packaged browser files and the pre-trained viseme model are verified
against the pinned upstream Git blob identifiers before every Android build:

${headAudioVerificationRows.join("\n")}

The model stored as www/model-en-mixed.b64 is only a Base64 representation
of the upstream binary model. Decoding it must reproduce the pinned upstream
Git blob exactly.

Legacy repository copies under dist/ and modules/ may contain earlier local
experiments or modifications. They remain subject to the same HeadAudio MIT
license where they derive from HeadAudio. The upstream author is not
responsible for Sol Holo-specific modifications.

Full HeadAudio MIT license:

${headAudioLicenseText}
`;

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

const npmInventory = `
============================================================
Complete package-lock license inventory
============================================================

Every package entry with an installed version in package-lock.json is checked.
The build fails when a package has no declared license or when a license
expression has not been explicitly reviewed for this project.

Reviewed license expressions in the current lockfile:
${[...reviewedNpmLicenseExpressions].sort().join("\n")}

Installed package inventory:
${npmInventoryRows.join("\n")}
`;

const header = `SOL HOLO / PAM'S HOLO - THIRD-PARTY LICENSES
Generated and verified for the exact dependency and bundled-asset state of
this build.

This file does not transfer ownership of third-party software, models,
trademarks or other rights to Pamela Nitschke or Sol Holo. Each component
remains subject to its own license and the rights of its respective rights
holders.

The file includes the license text found inside each direct npm dependency.
If a package declares Apache-2.0 but does not ship a standalone license file,
the build uses the canonical Apache-2.0 text stored in licenses/APACHE-2.0.txt.
Any NOTICE/attribution file shipped at the top level of a direct package is
included as well. Development-only packages are identified separately.

The complete package-lock is additionally audited for declared licenses, and
bundled non-npm third-party assets such as HeadAudio are verified separately.

`;

const output =
  header +
  sections.join("\n") +
  "\n" +
  headAudioNotice.trim() +
  "\n\n" +
  mediaPipeModelNotice.trim() +
  "\n\n" +
  npmInventory.trim() +
  "\n";

await mkdir(webDirectory, { recursive: true });
await mkdir(thirdPartyWebDirectory, { recursive: true });

const apacheLicenseText = await readFile(
  path.join(licenseFallbackDirectory, "APACHE-2.0.txt"),
  "utf8"
);

await writeFile(
  path.join(thirdPartyWebDirectory, "APACHE-2.0.txt"),
  apacheLicenseText,
  "utf8"
);

for (const target of [
  path.join(projectDirectory, "THIRD_PARTY_LICENSES.txt"),
  path.join(webDirectory, "THIRD_PARTY_LICENSES.txt")
]) {
  await writeFile(target, output, "utf8");
}

const npmInventoryOutput =
  "SOL HOLO / PAM'S HOLO - NPM LICENSE INVENTORY\n\n" +
  npmInventoryRows.join("\n") +
  "\n";

for (const target of [
  path.join(projectDirectory, "NPM_LICENSE_INVENTORY.txt"),
  path.join(webDirectory, "NPM_LICENSE_INVENTORY.txt")
]) {
  await writeFile(target, npmInventoryOutput, "utf8");
}

console.log(
  "Direkte und transitive NPM-Lizenzen sowie gebündelte HeadAudio-Dateien wurden geprüft."
);
