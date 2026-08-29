import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");

const reportPath = process.argv[2]
  ? path.resolve(projectDirectory, process.argv[2])
  : path.join(projectDirectory, "android-runtime-dependencies.txt");
const androidAssetsDirectory = process.argv[3]
  ? path.resolve(projectDirectory, process.argv[3])
  : path.join(
      projectDirectory,
      "android",
      "app",
      "src",
      "main",
      "assets",
      "public"
    );

const report = await readFile(reportPath, "utf8");
const apacheLicense = await readFile(
  path.join(projectDirectory, "licenses", "APACHE-2.0.txt"),
  "utf8"
);
const capacitorMitLicense = await readFile(
  path.join(projectDirectory, "node_modules", "@capacitor", "android", "LICENSE"),
  "utf8"
);

const coordinatePattern =
  /([A-Za-z0-9_.-]+):([A-Za-z0-9_.-]+):([A-Za-z0-9_.+\-]+)(?:\s+->\s+([A-Za-z0-9_.+\-]+))?/g;

const coordinates = new Map();
for (const line of report.split(/\r?\n/)) {
  coordinatePattern.lastIndex = 0;
  let match;
  while ((match = coordinatePattern.exec(line))) {
    const group = match[1];
    const artifact = match[2];
    const requestedVersion = match[3];
    const resolvedVersion = match[4] || requestedVersion;
    const key = `${group}:${artifact}:${resolvedVersion}`;
    coordinates.set(key, { group, artifact, requestedVersion, resolvedVersion });
  }
}

const usesCapacitorAndroidProject = report.includes("project :capacitor-android");
if (!usesCapacitorAndroidProject) {
  throw new Error(
    "Capacitor-Android-Projekt wurde im releaseRuntimeClasspath nicht gefunden."
  );
}

const reviewed = [];
const unknown = [];

for (const dependency of [...coordinates.values()].sort((a, b) =>
  `${a.group}:${a.artifact}`.localeCompare(`${b.group}:${b.artifact}`)
)) {
  let license = null;
  let basis = null;

  if (dependency.group.startsWith("androidx.")) {
    license = "Apache-2.0";
    basis = "AndroidX project license";
  } else if (dependency.group.startsWith("org.jetbrains.kotlin")) {
    license = "Apache-2.0";
    basis = "Kotlin project license";
  } else if (
    dependency.group === "org.jetbrains" &&
    dependency.artifact === "annotations"
  ) {
    license = "Apache-2.0";
    basis = "JetBrains annotations license";
  } else if (dependency.group === "com.google.android.material") {
    license = "Apache-2.0";
    basis = "Material Components for Android license";
  }

  if (!license) {
    unknown.push(
      `${dependency.group}:${dependency.artifact}:${dependency.resolvedVersion}`
    );
    continue;
  }

  reviewed.push({ ...dependency, license, basis });
}

if (unknown.length) {
  throw new Error(
    "Noch nicht lizenzrechtlich zugeordnete Android-Laufzeitabhängigkeiten gefunden:\n" +
      unknown.join("\n") +
      "\nDiese Abhängigkeiten müssen vor einer Freigabe einzeln geprüft werden."
  );
}

const inventoryLines = [
  "project :capacitor-android | MIT | Capacitor Android 7.6.8",
  ...reviewed.map(dependency =>
    `${dependency.group}:${dependency.artifact}:${dependency.resolvedVersion} | ` +
    `${dependency.license} | ${dependency.basis}`
  )
];

const output = `SOL HOLO / PAM'S HOLO - ANDROID RUNTIME LICENSES
Generated from the resolved releaseRuntimeClasspath of this exact Android build.

The build fails when it encounters an Android runtime dependency whose license
has not been explicitly reviewed for this project.

Resolved runtime dependency inventory:
${inventoryLines.join("\n")}

============================================================
Capacitor Android
============================================================

Capacitor Android 7.6.8
MIT License

${capacitorMitLicense.trim()}

============================================================
AndroidX / reviewed Apache-2.0 Android libraries
============================================================

The AndroidX libraries and other entries explicitly labelled Apache-2.0 in the
inventory above are distributed under the Apache License, Version 2.0.

${apacheLicense.trim()}
`;

await mkdir(androidAssetsDirectory, { recursive: true });

for (const target of [
  path.join(projectDirectory, "ANDROID_RUNTIME_LICENSES.txt"),
  path.join(androidAssetsDirectory, "ANDROID_RUNTIME_LICENSES.txt")
]) {
  await writeFile(target, output, "utf8");
}

await writeFile(
  path.join(androidAssetsDirectory, "ANDROID_RUNTIME_DEPENDENCIES.txt"),
  report,
  "utf8"
);

console.log(
  `Android-Laufzeitlizenzen geprüft: ${inventoryLines.length} Einträge.`
);
