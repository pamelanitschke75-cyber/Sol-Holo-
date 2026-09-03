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
const manifestPath = join(androidApp, "src", "main", "AndroidManifest.xml");
const xmlTarget = join(androidApp, "src", "main", "res", "xml");
const fullBackupRulesPath = join(xmlTarget, "sol_holo_backup_rules.xml");
const dataExtractionRulesPath = join(xmlTarget, "sol_holo_data_extraction_rules.xml");

for (const required of [mainActivityPath, buildGradlePath, manifestPath]) {
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

/*
 * Wiederherstellungsgrundlage
 * --------------------------
 * Normale App-Daten, WebView/LocalStorage, Einstellungen und Datenbanken
 * dürfen Android Auto Backup bzw. Geräteübertragung verwenden. Zwei
 * Sicherheitsbereiche werden absichtlich NICHT übernommen:
 *
 * 1. sol_holo_access_security_v1
 *    enthält Metadaten zu einem Android-Keystore-Geräteschlüssel. Der private
 *    Schlüssel ist hardwaregebunden und kann nicht sicher auf ein neues Gerät
 *    kopiert werden. Eine wiederhergestellte Metadatei ohne den zugehörigen
 *    Schlüssel würde einen falschen bzw. kaputten Gerätezustand erzeugen.
 *
 * 2. sol_holo_speaker_identity
 *    enthält lokale Sprecher-Embeddings. Diese biometrisch abgeleiteten Daten
 *    werden nicht in ein allgemeines Cloud-Backup gelegt. Auf einem neuen
 *    Gerät wird die Stimme bewusst erneut eingerichtet.
 *
 * Servergespeicherte, owner-gebundene Erinnerungen bleiben davon unabhängig
 * erhalten. Nach Gerätewechsel muss die sichere App-Sitzung neu gebunden
 * werden; erst danach dürfen persönliche Serverdaten wieder verwendet werden.
 */
mkdirSync(xmlTarget, { recursive: true });

writeFileSync(
  fullBackupRulesPath,
  `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<full-backup-content>\n` +
    `    <include domain="file" path="." />\n` +
    `    <include domain="database" path="." />\n` +
    `    <include domain="sharedpref" path="." />\n` +
    `    <exclude domain="sharedpref" path="sol_holo_access_security_v1.xml" />\n` +
    `    <exclude domain="sharedpref" path="sol_holo_speaker_identity.xml" />\n` +
    `</full-backup-content>\n`,
  "utf8"
);

writeFileSync(
  dataExtractionRulesPath,
  `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<data-extraction-rules>\n` +
    `    <cloud-backup>\n` +
    `        <include domain="file" path="." />\n` +
    `        <include domain="database" path="." />\n` +
    `        <include domain="sharedpref" path="." />\n` +
    `        <exclude domain="sharedpref" path="sol_holo_access_security_v1.xml" />\n` +
    `        <exclude domain="sharedpref" path="sol_holo_speaker_identity.xml" />\n` +
    `    </cloud-backup>\n` +
    `    <device-transfer>\n` +
    `        <include domain="file" path="." />\n` +
    `        <include domain="database" path="." />\n` +
    `        <include domain="sharedpref" path="." />\n` +
    `        <exclude domain="sharedpref" path="sol_holo_access_security_v1.xml" />\n` +
    `        <exclude domain="sharedpref" path="sol_holo_speaker_identity.xml" />\n` +
    `    </device-transfer>\n` +
    `</data-extraction-rules>\n`,
  "utf8"
);

let manifest = readFileSync(manifestPath, "utf8");
const applicationTag = /<application\b([^>]*)>/u;
const match = manifest.match(applicationTag);
if (!match) {
  throw new Error("Android-application-Tag nicht gefunden.");
}

let attributes = match[1];
const requiredApplicationAttributes = [
  ["android:allowBackup", "true"],
  ["android:fullBackupContent", "@xml/sol_holo_backup_rules"],
  ["android:dataExtractionRules", "@xml/sol_holo_data_extraction_rules"]
];

for (const [name, value] of requiredApplicationAttributes) {
  const attributePattern = new RegExp(`${name}="[^"]*"`, "u");
  if (attributePattern.test(attributes)) {
    attributes = attributes.replace(attributePattern, `${name}="${value}"`);
  } else {
    attributes += `\n        ${name}="${value}"`;
  }
}

manifest = manifest.replace(applicationTag, `<application${attributes}>`);
writeFileSync(manifestPath, manifest, "utf8");

// Deliberately no NFC manifest service is installed here. A future watch
// companion must first be selected and tested. If HCE is added, it must use
// CATEGORY_OTHER, coexist with Wallet/FIDO/Car Key, and never request the
// default-wallet role.
console.log(
  "Sol-Holo-Mehrfaktorgrundlage eingebunden: registriertes Gerät + " +
  "Android-Systemauthentifizierung. Sichere Android-Wiederherstellung ist " +
  "aktiv; gerätegebundene Schlüssel und Sprecher-Embeddings bleiben bewusst " +
  "vom Backup ausgeschlossen. NFC/Watch bleibt bis zum echten Challenge-, " +
  "Attestierungs- und Companion-Test fail-closed."
);
