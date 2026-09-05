import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const androidRoot = join(root, "android");
const phoneModule = join(androidRoot, "app");
const phoneJava = join(
  phoneModule,
  "src",
  "main",
  "java",
  "com",
  "solholo",
  "app"
);
const phoneManifest = join(phoneModule, "src", "main", "AndroidManifest.xml");
const phoneGradle = join(phoneModule, "build.gradle");
const settingsGradle = join(androidRoot, "settings.gradle");
const wearTemplate = join(root, "wear-native");
const wearModule = join(androidRoot, "wear");
const wearJava = join(
  wearModule,
  "src",
  "main",
  "java",
  "com",
  "solholo",
  "app"
);
const wearAssets = join(wearModule, "src", "main", "assets");
const phonePublicAssets = join(phoneModule, "src", "main", "assets", "public");
const wearableDependency =
  '    implementation "com.google.android.gms:play-services-wearable:20.0.1"';

for (const required of [
  phoneManifest,
  phoneGradle,
  settingsGradle,
  join(phoneModule, "libs", "sherpa-onnx-1.13.4.aar"),
  wearTemplate
]) {
  if (!existsSync(required)) {
    throw new Error(`Watch8-Installation fehlt Voraussetzung: ${required}`);
  }
}

mkdirSync(phoneJava, { recursive: true });
for (const fileName of [
  "PhoneWearWakeListenerService.java",
  "WearWakePayloadPolicy.java"
]) {
  copyFileSync(
    join(root, "android-native", fileName),
    join(phoneJava, fileName)
  );
}

let phoneBuild = readFileSync(phoneGradle, "utf8");
if (!phoneBuild.includes(wearableDependency.trim())) {
  const dependencyMarker = /dependencies\s*\{/;
  if (!dependencyMarker.test(phoneBuild)) {
    throw new Error("Phone-Gradle-Abhängigkeiten für Watch8 fehlen.");
  }
  phoneBuild = phoneBuild.replace(
    dependencyMarker,
    match => `${match}\n${wearableDependency}`
  );
  writeFileSync(phoneGradle, phoneBuild, "utf8");
}

let manifest = readFileSync(phoneManifest, "utf8");
if (!manifest.includes(".PhoneWearWakeListenerService")) {
  const applicationEnd = "    </application>";
  if (!manifest.includes(applicationEnd)) {
    throw new Error("Phone-Manifest kann Watch8-Dienst nicht aufnehmen.");
  }
  const listenerService = [
    "        <service",
    '            android:name=".PhoneWearWakeListenerService"',
    '            android:exported="true">',
    "            <intent-filter>",
    '                <action android:name="com.google.android.gms.wearable.DATA_CHANGED" />',
    "                <data",
    '                    android:scheme="wear"',
    '                    android:host="*"',
    '                    android:pathPrefix="/solholo/watch/wake/" />',
    "            </intent-filter>",
    "        </service>",
    ""
  ].join("\n");
  manifest = manifest.replace(
    applicationEnd,
    listenerService + "\n" + applicationEnd
  );
  writeFileSync(phoneManifest, manifest, "utf8");
}

cpSync(wearTemplate, wearModule, { recursive: true, force: true });
mkdirSync(wearJava, { recursive: true });
mkdirSync(join(wearModule, "libs"), { recursive: true });
mkdirSync(wearAssets, { recursive: true });
mkdirSync(phonePublicAssets, { recursive: true });

for (const fileName of [
  "PcmRingBuffer.java",
  "SolWakeKeywordSpotter.java",
  "WakePhraseMatcher.java",
  "WearWakePayloadPolicy.java"
]) {
  copyFileSync(
    join(root, "android-native", fileName),
    join(wearJava, fileName)
  );
}

copyFileSync(
  join(phoneModule, "libs", "sherpa-onnx-1.13.4.aar"),
  join(wearModule, "libs", "sherpa-onnx-1.13.4.aar")
);
for (const assetName of [
  "sol-kws-encoder.int8.onnx",
  "sol-kws-decoder.onnx",
  "sol-kws-joiner.int8.onnx",
  "sol-kws-tokens.txt",
  "sol-kws-keywords.txt"
]) {
  const source = join(phoneModule, "src", "main", "assets", assetName);
  if (!existsSync(source)) {
    throw new Error(`Watch8-Weckrufmodell fehlt: ${assetName}`);
  }
  copyFileSync(source, join(wearAssets, assetName));
}
copyFileSync(
  join(wearTemplate, "src", "main", "assets", "WEAR_DATA_LAYER_SOURCES.txt"),
  join(phonePublicAssets, "WEAR_DATA_LAYER_SOURCES.txt")
);

const phoneVersionMatch = phoneBuild.match(/^\s*versionCode\s+(\d+)\s*$/m);
if (!phoneVersionMatch) {
  throw new Error("Phone-versionCode für Watch8 konnte nicht gelesen werden.");
}
const phoneVersionCode = Number(phoneVersionMatch[1]);
const wearVersionCode = phoneVersionCode * 10 + 1;
const wearGradlePath = join(wearModule, "build.gradle");
let wearBuild = readFileSync(wearGradlePath, "utf8");
if (!wearBuild.includes("__SOL_HOLO_WEAR_VERSION_CODE__")) {
  throw new Error("Watch8-versionCode-Platzhalter fehlt.");
}
wearBuild = wearBuild.replace(
  "__SOL_HOLO_WEAR_VERSION_CODE__",
  String(wearVersionCode)
);
writeFileSync(wearGradlePath, wearBuild, "utf8");

let settings = readFileSync(settingsGradle, "utf8");
if (!settings.includes("include ':wear'")) {
  settings = settings.trimEnd() + "\ninclude ':wear'\n";
  writeFileSync(settingsGradle, settings, "utf8");
}

console.log(
  `Pam Watch8 companion eingebunden: phone=${phoneVersionCode}, wear=${wearVersionCode}`
);
