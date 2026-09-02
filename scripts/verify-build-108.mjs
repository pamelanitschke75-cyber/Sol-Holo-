#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync
} from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const EXPECTED = Object.freeze({
  applicationId: "com.solholo.app",
  previousVersionCode: 89,
  candidateVersionCode: 108,
  updateCertificateSha256:
    "e122201077b93cb47edb6951446fb8dff77427a2f5a2bd4719474a638fe803e9"
});

const REJECTED_OLD_BUILD_80_CERTIFICATE_SHA256 =
  "8579e361f4dc802e67ca8be858a4b55131b72abbc19324e3871e58f52e3b1a23";

const KNOWN_RUN_106 = Object.freeze({
  headSha: "74993d4",
  artifactName: "Pams-Holo-Android-extern_signieren",
  artifactSizeBytes: 117_670_446
});

const KNOWN_RUN_89 = Object.freeze({
  databaseId: 33_389_517_869,
  headSha: "3420692",
  artifactName: "Pams-Holo-Android-extern_signieren",
  artifactSizeBytes: 117_651_563
});

const args = process.argv.slice(2);

function usage() {
  console.log(`
Pam's Holo – lokale Build-#108-Prüfung

Aufruf:
  node scripts/verify-build-108.mjs
  node scripts/verify-build-108.mjs \\
    --build-89 /pfad/Pams-Holo-89.apk \\
    --build-108 /pfad/Pams-Holo-108.apk

Optionen:
  --build-89 PATH    Tatsächlich installierte/signierte Basis-APK mit versionCode 89
  --build-108 PATH   Zu prüfende, autorisiert signierte APK mit versionCode 108
  --aapt PATH        Optionaler Pfad zum Android-Werkzeug aapt
  --apksigner PATH   Optionaler Pfad zum Android-Werkzeug apksigner
  --help             Diese Hilfe anzeigen

Das Skript liest keine Signierschlüssel, Passwörter oder GitHub-Secrets. Ohne
beide APKs führt es die Repository-Vorprüfung aus und beendet sich mit Code 2,
weil Signatur, Buildkette und Datenerhalt dann noch nicht vollständig belegt sind.
`);
}

function parseArgs(values) {
  const parsed = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === "--help" || value === "-h") {
      parsed.help = true;
      continue;
    }

    const optionNames = new Set([
      "--build-89",
      "--build-108",
      "--aapt",
      "--apksigner"
    ]);

    if (!optionNames.has(value)) {
      throw new Error(`Unbekannte Option: ${value}`);
    }

    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Für ${value} fehlt ein Pfad.`);
    }

    parsed[value.slice(2).replaceAll("-", "_")] = resolve(next);
    index += 1;
  }

  return parsed;
}

const results = [];

function addResult(level, label, detail = "") {
  results.push({ level, label, detail });
  const suffix = detail ? ` – ${detail}` : "";
  console.log(`[${level}] ${label}${suffix}`);
}

function pass(label, detail = "") {
  addResult("OK", label, detail);
}

function warn(label, detail = "") {
  addResult("OFFEN", label, detail);
}

function fail(label, detail = "") {
  addResult("FEHLER", label, detail);
}

function readProjectFile(relativePath) {
  const absolutePath = join(projectRoot, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Datei fehlt: ${relativePath}`);
  }
  return readFileSync(absolutePath, "utf8");
}

function requireText(text, fragment, label) {
  if (text.includes(fragment)) {
    pass(label);
    return true;
  }

  fail(label, `Erwarteter Text fehlt: ${fragment}`);
  return false;
}

function findExecutable(explicitPath, executableName) {
  if (explicitPath) {
    if (!existsSync(explicitPath)) {
      throw new Error(`${executableName} wurde nicht gefunden: ${explicitPath}`);
    }
    return explicitPath;
  }

  try {
    return execFileSync("which", [executableName], {
      encoding: "utf8"
    }).trim();
  } catch {
    // Suche zusätzlich in installierten Android-Build-Tools.
  }

  const sdkRoots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT
  ].filter(Boolean);

  for (const sdkRoot of sdkRoots) {
    const buildToolsRoot = join(sdkRoot, "build-tools");
    if (!existsSync(buildToolsRoot)) continue;

    const versions = readdirSync(buildToolsRoot)
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
      .reverse();

    for (const version of versions) {
      const candidate = join(buildToolsRoot, version, executableName);
      if (existsSync(candidate)) return candidate;
    }
  }

  return null;
}

function commandOutput(executable, commandArgs) {
  try {
    return execFileSync(executable, commandArgs, {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    const stdout = String(error?.stdout || "").trim();
    const stderr = String(error?.stderr || "").trim();
    const message = [stdout, stderr, error?.message]
      .filter(Boolean)
      .join("\n")
      .trim();
    throw new Error(message || `Aufruf fehlgeschlagen: ${executable}`);
  }
}

function normalizeDigest(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll(":", "")
    .replace(/[^0-9a-f]/g, "");
}

function inspectApk(apkPath, aaptPath, apksignerPath) {
  if (!existsSync(apkPath) || !statSync(apkPath).isFile()) {
    throw new Error(`APK fehlt: ${apkPath}`);
  }

  const badging = commandOutput(aaptPath, ["dump", "badging", apkPath]);
  const packageLine = badging
    .split(/\r?\n/)
    .find(line => line.startsWith("package:"));

  if (!packageLine) {
    throw new Error(`Paketdaten konnten nicht gelesen werden: ${apkPath}`);
  }

  const applicationId = packageLine.match(/\bname='([^']+)'/)?.[1] || "";
  const versionCode = Number(
    packageLine.match(/\bversionCode='(\d+)'/)?.[1] || Number.NaN
  );

  const signerReport = commandOutput(apksignerPath, [
    "verify",
    "--verbose",
    "--print-certs",
    apkPath
  ]);

  const certificateDigests = [...signerReport.matchAll(
    /certificate SHA-256 digest:\s*([0-9a-f:]+)/gi
  )]
    .map(match => normalizeDigest(match[1]))
    .filter(digest => digest.length === 64);

  if (certificateDigests.length === 0) {
    throw new Error(`Kein SHA-256-Signaturzertifikat gefunden: ${apkPath}`);
  }

  return {
    apkPath,
    applicationId,
    versionCode,
    certificateDigests: [...new Set(certificateDigests)]
  };
}

function verifyApk(label, metadata, expectedVersionCode) {
  let valid = true;

  if (metadata.applicationId === EXPECTED.applicationId) {
    pass(`${label}: Application-ID`, metadata.applicationId);
  } else {
    fail(
      `${label}: Application-ID`,
      `${metadata.applicationId || "nicht lesbar"}; erwartet ${EXPECTED.applicationId}`
    );
    valid = false;
  }

  if (metadata.versionCode === expectedVersionCode) {
    pass(`${label}: versionCode`, String(metadata.versionCode));
  } else {
    fail(
      `${label}: versionCode`,
      `${metadata.versionCode}; erwartet ${expectedVersionCode}`
    );
    valid = false;
  }

  if (
    metadata.certificateDigests.length === 1 &&
    metadata.certificateDigests[0] === EXPECTED.updateCertificateSha256
  ) {
    pass(
      `${label}: vorläufig erwartetes Updatezertifikat`,
      metadata.certificateDigests[0]
    );
  } else {
    fail(
      `${label}: vorläufig erwartetes Updatezertifikat`,
      `gefunden ${metadata.certificateDigests.join(", ")}; erwartet ` +
        EXPECTED.updateCertificateSha256
    );
    valid = false;
  }

  return valid;
}

function verifyRepository() {
  console.log("\n=== Repository-Vorprüfung ===");

  const capacitorConfig = JSON.parse(readProjectFile("capacitor.config.json"));
  if (capacitorConfig.appId === EXPECTED.applicationId) {
    pass("Capacitor-App-ID", capacitorConfig.appId);
  } else {
    fail(
      "Capacitor-App-ID",
      `${capacitorConfig.appId || "fehlt"}; erwartet ${EXPECTED.applicationId}`
    );
  }

  const packageJson = JSON.parse(readProjectFile("package.json"));
  if (
    packageJson.scripts?.["verify:build-108"] ===
    "node scripts/verify-build-108.mjs"
  ) {
    pass("Lokaler npm-Prüfbefehl vorhanden", "npm run verify:build-108");
  } else {
    fail("Lokaler npm-Prüfbefehl fehlt oder ist verändert");
  }

  const mainWorkflow = readProjectFile(".github/workflows/android-build.yml");
  requireText(
    mainWorkflow,
    "SOL_HOLO_VERSION_CODE: ${{ github.run_number }}",
    "Hauptworkflow setzt versionCode über github.run_number"
  );
  requireText(
    mainWorkflow,
    'r"(?m)^(\\s*)versionCode\\s+\\d+\\s*$"',
    "Hauptworkflow ersetzt genau einen Android-versionCode"
  );
  requireText(
    mainWorkflow,
    'echo "mode=update" >> "$GITHUB_OUTPUT"',
    "Hauptworkflow kennt autorisierten Update-Modus"
  );
  requireText(
    mainWorkflow,
    'echo "mode=extern_signieren" >> "$GITHUB_OUTPUT"',
    "Hauptworkflow erzeugt bei fehlenden Secrets keine Wegwerf-Signatur"
  );
  requireText(
    mainWorkflow,
    '"$build_tools/apksigner" verify --verbose --print-certs "$signed_apk"',
    "Hauptworkflow verifiziert das erzeugte Zertifikat"
  );

  for (const secretName of [
    "SOL_HOLO_KEYSTORE_BASE64",
    "SOL_HOLO_KEYSTORE_PASSWORD",
    "SOL_HOLO_KEY_ALIAS",
    "SOL_HOLO_KEY_PASSWORD"
  ]) {
    requireText(
      mainWorkflow,
      `secrets.${secretName}`,
      `Hauptworkflow referenziert ${secretName}`
    );
  }

  if (!/keytool\s+-genkeypair/.test(mainWorkflow)) {
    pass("Hauptworkflow erzeugt keinen neuen Wegwerf-Schlüssel");
  } else {
    fail("Hauptworkflow enthält eine Wegwerf-Schlüsselerzeugung");
  }

  const runtimeFiles = [
    "www/index.html",
    "www/sol-holo-ui.js",
    "www/service-worker.js",
    "www/consent-signature.mjs",
    "www/consent-ui-bootstrap.mjs",
    "android-native/HeyHoSolPlugin.java",
    "android-native/SolSpeakerIdentityPlugin.java",
    "android-native/PhoneContactsPlugin.java",
    "android-native/SolAccessSecurityPlugin.java"
  ].map(readProjectFile);
  const runtimeText = runtimeFiles.join("\n");

  const destructivePatterns = [
    /localStorage\.clear\s*\(/,
    /indexedDB\.deleteDatabase\s*\(/,
    /clearApplicationUserData\s*\(/,
    /deleteSharedPreferences\s*\(/,
    /Runtime\.getRuntime\(\).*pm\s+clear/s
  ];

  if (destructivePatterns.every(pattern => !pattern.test(runtimeText))) {
    pass("Kein automatischer Komplett-Löschbefehl in den geprüften Laufzeitdateien");
  } else {
    fail("Möglicher Komplett-Löschbefehl in einer Laufzeitdatei gefunden");
  }

  const persistenceChecks = [
    ["www/index.html", '"sol-holo-realtime-voice-v1"'],
    ["www/index.html", '"steffis-holo-realtime-voice-v1"'],
    ["www/sol-holo-ui.js", '"sol-holo-clone-photo-v1"'],
    ["www/sol-holo-ui.js", '"steffis-holo-clone-photo-v1"'],
    ["www/sol-holo-ui.js", '"sol-holo-clone-mouth-v1"'],
    ["www/sol-holo-ui.js", '"steffis-holo-clone-mouth-v1"'],
    ["www/sol-holo-ui.js", '"pams-holo-original-notes-v1"'],
    ["www/sol-holo-ui.js", '"steffis-holo-original-notes-v1"'],
    ["android-native/HeyHoSolPlugin.java", '"sol_holo_private_settings"'],
    ["android-native/SolSpeakerIdentityPlugin.java", '"sol_holo_speaker_identity"'],
    ["android-native/PhoneContactsPlugin.java", '"sol_holo_shared_notes"']
  ];

  for (const [file, key] of persistenceChecks) {
    requireText(readProjectFile(file), key, `Persistenzschlüssel beibehalten: ${key}`);
  }

  const server = readProjectFile("server.mjs");
  const databaseSchemaText =
    server + "\n" + readProjectFile("modules/identity-memory-store.mjs");
  for (const tableName of [
    "sol_memory",
    "sol_long_term_memory",
    "sol_fulltime_memory",
    "sol_google_tokens",
    "sol_smartthings_tokens",
    "sol_smartthings_allowed_devices",
    "sol_calendar_actions",
    "sol_identity_memory"
  ]) {
    requireText(
      databaseSchemaText,
      `CREATE TABLE IF NOT EXISTS ${tableName}`,
      `Nicht-destruktive Tabellenanlage vorhanden: ${tableName}`
    );
  }

  for (const requiredRuntimeFragment of [
    [mainWorkflow, "node --test tests/*.test.mjs", "Hauptworkflow führt stille Modultests aus"],
    [mainWorkflow, "node scripts/install-access-security.mjs", "Hauptworkflow bindet die Mehrfaktor-Sicherheit ein"],
    [readProjectFile("www/index.html"), "const FULL_FACE_RIG_ENABLED =\n  true;", "Vollgesichts-, Lippen- und Kieferrig ist für #108 aktiviert"],
    [readProjectFile("server.mjs"), "TRUSTED_APP_SESSION_REQUIRED", "Private Dienstzugriffe bleiben ohne sichere Sitzung geschlossen"],
    [readProjectFile("server.mjs"), "needsTrustedAppSession: true", "Kalenderschreiben bleibt ohne sichere Sitzung geschlossen"],
    [readProjectFile("android-native/SolAccessSecurityPlugin.java"), "signConsentPayload", "Native owner-gebundene Einwilligungssignatur ist eingebaut"]
  ]) {
    requireText(
      requiredRuntimeFragment[0],
      requiredRuntimeFragment[1],
      requiredRuntimeFragment[2]
    );
  }

  const speakerWorkflow = readProjectFile(
    ".github/workflows/speaker-identity-test-build.yml"
  );

  if (
    speakerWorkflow.includes("assets/sol-speaker-model.onnx") &&
    !readProjectFile("scripts/install-speaker-identity.mjs").includes(
      "sol-speaker-model.onnx"
    )
  ) {
    warn(
      "Separater Stimmen-Test-Workflow ist veraltet",
      "er erwartet sol-speaker-model.onnx, der Installer erzeugt CAMPPlus und ERes2Net"
    );
  } else {
    pass("Stimmen-Test-Workflow und Modellnamen stimmen überein");
  }

  if (!speakerWorkflow.includes("github.run_number")) {
    warn(
      "Separater Stimmen-Test-Workflow setzt keinen fortlaufenden versionCode",
      "nicht für Build #108 oder das Geräteupdate #89 -> #108 verwenden"
    );
  } else {
    pass("Stimmen-Test-Workflow setzt einen fortlaufenden versionCode");
  }

  if (speakerWorkflow.includes("mode=neuinstallation")) {
    warn(
      "Separater Stimmen-Test-Workflow kann anders signierte Neuinstallations-APK erzeugen",
      "dieses Artefakt ist ausdrücklich kein Update der bestehenden App"
    );
  }

  warn(
    "Öffentlicher GitHub-Run #89 belegt die installierte Signatur nicht",
    `Run-ID ${KNOWN_RUN_89.databaseId}, ${KNOWN_RUN_89.artifactName}, ` +
      `Head ${KNOWN_RUN_89.headSha}, ${KNOWN_RUN_89.artifactSizeBytes} Byte`
  );
  warn(
    "GitHub-Run #106 war kein signiertes Update-Artefakt",
    `${KNOWN_RUN_106.artifactName}, Head ${KNOWN_RUN_106.headSha}, ` +
      `${KNOWN_RUN_106.artifactSizeBytes} Byte`
  );
  warn(
    "Verfügbarkeit der vier GitHub-Secrets bleibt extern zu prüfen",
    "ein grüner Lauf mit extern_signieren beweist keine Update-Signatur"
  );
  pass(
    "Alte Build-#80-Signaturlinie ist nicht als #108-Ziel hinterlegt",
    `${REJECTED_OLD_BUILD_80_CERTIFICATE_SHA256} wird ausdrücklich nicht akzeptiert`
  );

  const historicalMilestone = readProjectFile(
    "MEILENSTEIN-PAMS-HOLO-WOW-DESIGN-01-09-2026.md"
  );
  const historicalDigest =
    historicalMilestone.match(/Signaturzertifikat SHA-256:\s*`([0-9a-f]{64})`/i)?.[1]
      ?.toLowerCase() || "";

  if (
    historicalDigest &&
    historicalDigest !== EXPECTED.updateCertificateSha256
  ) {
    warn(
      "Widersprüchliche dokumentierte Signatur-Fingerprints",
      `Meilenstein #95: ${historicalDigest}; Prüfziel #108: ` +
        EXPECTED.updateCertificateSha256
    );
  }
}

let parsedArgs;
try {
  parsedArgs = parseArgs(args);
} catch (error) {
  console.error(`FEHLER: ${error.message}`);
  usage();
  process.exit(1);
}

if (parsedArgs.help) {
  usage();
  process.exit(0);
}

console.log("Pam's Holo – Build #108 Updateprüfung");
console.log(`Erwartete Application-ID: ${EXPECTED.applicationId}`);
console.log(
  `Erwartete Kette: ${EXPECTED.previousVersionCode} -> ${EXPECTED.candidateVersionCode}`
);
console.log(
  `Erwartetes Zertifikat SHA-256: ${EXPECTED.updateCertificateSha256}`
);

try {
  verifyRepository();
} catch (error) {
  fail("Repository-Vorprüfung abgebrochen", error.message);
}

console.log("\n=== APK-Paarprüfung ===");

const apkPairProvided = Boolean(parsedArgs.build_89 && parsedArgs.build_108);
if (Boolean(parsedArgs.build_89) !== Boolean(parsedArgs.build_108)) {
  fail("APK-Paar unvollständig", "--build-89 und --build-108 immer gemeinsam angeben");
} else if (!apkPairProvided) {
  warn(
    "APK-Paar nicht angegeben",
    "Signatur- und Geräteupdate-Kette 89 -> 108 bleiben ungeprüft"
  );
} else {
  const aaptPath = findExecutable(parsedArgs.aapt, "aapt");
  const apksignerPath = findExecutable(parsedArgs.apksigner, "apksigner");

  if (!aaptPath) {
    fail("Android-Werkzeug aapt fehlt", "Android SDK Build-Tools installieren oder --aapt angeben");
  }
  if (!apksignerPath) {
    fail(
      "Android-Werkzeug apksigner fehlt",
      "Android SDK Build-Tools installieren oder --apksigner angeben"
    );
  }

  if (aaptPath && apksignerPath) {
    try {
      const build89 = inspectApk(parsedArgs.build_89, aaptPath, apksignerPath);
      const build108 = inspectApk(parsedArgs.build_108, aaptPath, apksignerPath);
      const build89Valid = verifyApk(
        "Build #89",
        build89,
        EXPECTED.previousVersionCode
      );
      const build108Valid = verifyApk(
        "Build #108",
        build108,
        EXPECTED.candidateVersionCode
      );

      if (
        build89Valid &&
        build108Valid &&
        JSON.stringify(build89.certificateDigests) ===
          JSON.stringify(build108.certificateDigests)
      ) {
        pass("Build #89 und #108 verwenden exakt dasselbe Zertifikat");
      } else {
        fail("Signaturkontinuität #89 -> #108 nicht belegt");
      }
    } catch (error) {
      fail("APK-Paar konnte nicht vollständig geprüft werden", error.message);
    }
  }
}

console.log("\n=== Ergebnis ===");
const errorCount = results.filter(result => result.level === "FEHLER").length;
const openCount = results.filter(result => result.level === "OFFEN").length;

if (errorCount > 0) {
  console.log(
    `NICHT FREIGEGEBEN: ${errorCount} Fehler, ${openCount} offene Prüfpunkte.`
  );
  process.exit(1);
}

if (!apkPairProvided || openCount > 0) {
  console.log(
    `WEITERE PRÜFUNG NÖTIG: ${openCount} offene Prüfpunkte. ` +
      "Ein Gerätetest und Pams Bestätigung werden durch dieses Skript nie ersetzt."
  );
  process.exit(2);
}

console.log(
  "TECHNISCHE APK-PRÜFUNG BESTANDEN. Status bleibt bis zum Gerätetest und " +
    "Pams ausdrücklicher Bestätigung: weitere Prüfung nötig."
);
