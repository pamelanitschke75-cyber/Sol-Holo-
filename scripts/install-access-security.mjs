import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const nativeSource = join(root, "android-native");
const androidApp = join(root, "android", "app");
const javaTarget = join(
  androidApp,
  "src",
  "main",
  "java",
  "com",
  "solholo",
  "app"
);
const mainActivityPath = join(javaTarget, "MainActivity.java");
const buildGradlePath = join(androidApp, "build.gradle");

for (const required of [mainActivityPath, buildGradlePath]) {
  if (!existsSync(required)) {
    throw new Error(
      `Android-Projekt fehlt (${required}). Zuerst Capacitor Android erzeugen.`
    );
  }
}

mkdirSync(javaTarget, { recursive: true });
for (const fileName of [
  "SecurityFactorPolicy.java",
  "SolAccessSecurityPlugin.java"
]) {
  const source = join(nativeSource, fileName);
  if (!existsSync(source)) {
    throw new Error(`Native Sicherheitsquelle fehlt: ${source}`);
  }
  copyFileSync(source, join(javaTarget, fileName));
}

let gradle = readFileSync(buildGradlePath, "utf8");
const biometricDependency =
  '    implementation "androidx.biometric:biometric:1.1.0"';
if (!gradle.includes(biometricDependency)) {
  const dependenciesMarker = /dependencies\s*\{/;
  if (!dependenciesMarker.test(gradle)) {
    throw new Error("Gradle-dependencies-Block nicht gefunden.");
  }
  gradle = gradle.replace(
    dependenciesMarker,
    match => `${match}\n${biometricDependency}`
  );
  writeFileSync(buildGradlePath, gradle, "utf8");
}

let activity = readFileSync(mainActivityPath, "utf8");
const registration =
  "        registerPlugin(SolAccessSecurityPlugin.class);";
if (!activity.includes(registration)) {
  const preferredMarkers = [
    "        registerPlugin(SolSpeakerIdentityPlugin.class);",
    "        registerPlugin(HealthConnectPlugin.class);",
    "        registerPlugin(PhoneContactsPlugin.class);"
  ];
  const marker = preferredMarkers.find(candidate =>
    activity.includes(candidate)
  );
  if (!marker) {
    throw new Error(
      "Sichere Plugin-Registrierungsposition in MainActivity nicht gefunden."
    );
  }
  activity = activity.replace(marker, `${marker}\n${registration}`);
  writeFileSync(mainActivityPath, activity, "utf8");
}

// Deliberately no NFC manifest service is installed here. A future watch
// companion must first be selected and tested. If HCE is added, it must use
// CATEGORY_OTHER, coexist with Wallet/FIDO/Car Key, and never request the
// default-wallet role.
console.log(
  "Sol-Holo-Mehrfaktorgrundlage eingebunden: registriertes Gerät + " +
  "Android-Systemauthentifizierung. NFC/Watch bleibt bis zum echten " +
  "Challenge-, Attestierungs- und Companion-Test fail-closed."
);
