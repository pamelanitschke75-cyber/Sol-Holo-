import {
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const sourcePath = join(
  root,
  "android-native",
  "SolNavigationPlugin.java"
);
const javaTarget = join(
  root,
  "android",
  "app",
  "src",
  "main",
  "java",
  "com",
  "solholo",
  "app"
);
const targetPath = join(javaTarget, "SolNavigationPlugin.java");
const mainActivityPath = join(javaTarget, "MainActivity.java");
const manifestPath = join(
  root,
  "android",
  "app",
  "src",
  "main",
  "AndroidManifest.xml"
);

for (const required of [sourcePath, mainActivityPath, manifestPath]) {
  if (!existsSync(required)) {
    throw new Error(
      `Google-Maps-Navigation kann nicht eingebunden werden; Datei fehlt: ${required}`
    );
  }
}

copyFileSync(sourcePath, targetPath);

let mainActivity = readFileSync(mainActivityPath, "utf8");
const registration =
  "        registerPlugin(SolNavigationPlugin.class);";

if (!mainActivity.includes(registration)) {
  const preferredMarkers = [
    "        registerPlugin(SolBackupPlugin.class);",
    "        registerPlugin(SolAccessSecurityPlugin.class);",
    "        registerPlugin(HealthConnectPlugin.class);",
    "        registerPlugin(PhoneContactsPlugin.class);"
  ];
  const marker = preferredMarkers.find(candidate =>
    mainActivity.includes(candidate)
  );

  if (!marker) {
    throw new Error(
      "Sichere Plugin-Registrierungsposition für Google Maps wurde nicht gefunden."
    );
  }

  mainActivity = mainActivity.replace(
    marker,
    `${marker}\n${registration}`
  );
  writeFileSync(mainActivityPath, mainActivity, "utf8");
}

let manifest = readFileSync(manifestPath, "utf8");
const packageQuery =
  '        <package android:name="com.google.android.apps.maps" />';

if (!manifest.includes(packageQuery)) {
  const queriesEnd = "    </queries>";
  if (!manifest.includes(queriesEnd)) {
    throw new Error(
      "Queries-Tag für die sichtbare Google-Maps-App wurde nicht gefunden."
    );
  }

  manifest = manifest.replace(
    queriesEnd,
    `${packageQuery}\n${queriesEnd}`
  );
  writeFileSync(manifestPath, manifest, "utf8");
}

console.log(
  "Google Maps ist als lokale Android-Navigation ohne zusätzlichen Standortzugriff eingebunden."
);
