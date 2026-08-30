import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const android = join(root, "android");
const app = join(android, "app");
const libs = join(app, "libs");
const assets = join(app, "src", "main", "assets");
const publicAssets = join(assets, "public");
const javaTarget = join(app, "src", "main", "java", "com", "solholo", "app");
const buildGradle = join(app, "build.gradle");
const mainActivity = join(javaTarget, "MainActivity.java");
const uiFile = join(publicAssets, "sol-holo-ui.js");

const AAR_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.13.4/sherpa-onnx-1.13.4.aar";
const AAR_SHA256 = "03f9c4df965f21c71269365a7951a7f23b5696fddd093fa318c80d65550ab780";
const MODEL_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx";

async function download(url, target) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Download fehlgeschlagen (${response.status}): ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(target, bytes);
  return bytes;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

mkdirSync(libs, { recursive: true });
mkdirSync(assets, { recursive: true });
mkdirSync(publicAssets, { recursive: true });
mkdirSync(javaTarget, { recursive: true });

const aarPath = join(libs, "sherpa-onnx-1.13.4.aar");
const aarBytes = await download(AAR_URL, aarPath);
const aarDigest = sha256(aarBytes);
if (aarDigest !== AAR_SHA256) {
  throw new Error(`sherpa-onnx AAR Hash stimmt nicht: ${aarDigest}`);
}

const modelPath = join(assets, "sol-speaker-model.onnx");
const modelBytes = await download(MODEL_URL, modelPath);
if (modelBytes.length < 20_000_000) {
  throw new Error(`Sprecher-Modell ist unerwartet klein: ${modelBytes.length} Bytes`);
}
const modelDigest = sha256(modelBytes);

copyFileSync(
  join(root, "android-native", "SolSpeakerIdentityPlugin.java"),
  join(javaTarget, "SolSpeakerIdentityPlugin.java")
);

let gradle = readFileSync(buildGradle, "utf8");
const dependencyLine = "    implementation files('libs/sherpa-onnx-1.13.4.aar')";
if (!gradle.includes(dependencyLine)) {
  const marker = /dependencies\s*\{/;
  if (!marker.test(gradle)) throw new Error("Gradle dependencies-Block nicht gefunden.");
  gradle = gradle.replace(marker, match => `${match}\n${dependencyLine}`);
  writeFileSync(buildGradle, gradle, "utf8");
}

let activity = readFileSync(mainActivity, "utf8");
if (!activity.includes("registerPlugin(SolSpeakerIdentityPlugin.class)")) {
  const marker = "        registerPlugin(HealthConnectPlugin.class);";
  if (!activity.includes(marker)) throw new Error("HealthConnect-Plugin-Markierung nicht gefunden.");
  activity = activity.replace(marker, marker + "\n        registerPlugin(SolSpeakerIdentityPlugin.class);");
  writeFileSync(mainActivity, activity, "utf8");
}

const sourceText = `SOL HOLO / PAM'S HOLO – LOKALE SPRECHERERKENNUNG\n\n` +
`Zweck: Testweise lokale Erkennung der autorisierten Besitzerstimme für „Hey Sol“.\n` +
`Status: Nur Einlernen/Test; noch NICHT als Freigabe vor dem Weckruf aktiviert.\n\n` +
`sherpa-onnx 1.13.4\nQuelle: ${AAR_URL}\nLizenz: Apache License 2.0\nSHA-256 AAR: ${AAR_SHA256}\n\n` +
`Speaker-Embedding-Modell: 3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx\n` +
`Quelle: ${MODEL_URL}\nModellfamilie: 3D-Speaker / CAMPPlus\nLizenzbasis des 3D-Speaker-Projekts: Apache License 2.0\n` +
`SHA-256 des in diesem Build geladenen Modells: ${modelDigest}\n\n` +
`Datenschutz: Die Rohaufnahme wird nur im Arbeitsspeicher verarbeitet und nicht als Audiodatei gespeichert.\n` +
`Das abgeleitete Stimmprofil wird im privaten App-Speicher des Geräts abgelegt. Android-Backup ist für Sol Holo deaktiviert.\n` +
`Keine Verbindung, Partnerschaft oder Billigung durch Google, Xiaomi, k2-fsa oder ModelScope wird behauptet.\n`;
writeFileSync(join(publicAssets, "SPEAKER_IDENTITY_SOURCES.txt"), sourceText, "utf8");

if (existsSync(uiFile)) {
  let ui = readFileSync(uiFile, "utf8");
  const marker = "/* SOL_HOLO_SPEAKER_IDENTITY_TEST_UI */";
  if (!ui.includes(marker)) {
    ui += `\n\n${marker}\n(() => {\n` +
`  const plugin = () => window.Capacitor?.Plugins?.SolSpeakerIdentity || null;\n` +
`  const wait = setInterval(async () => {\n` +
`    const wakeRow = document.getElementById('heyHoSolRow');\n` +
`    if (!wakeRow || document.getElementById('speakerIdentityPanel')) return;\n` +
`    clearInterval(wait);\n` +
`    const panel = document.createElement('div');\n` +
`    panel.id = 'speakerIdentityPanel';\n` +
`    panel.style.cssText = 'margin:10px 0 14px;padding:12px;border:1px solid rgba(160,110,255,.35);border-radius:16px;background:rgba(20,12,35,.55)';\n` +
`    panel.innerHTML = '<strong>Meine Stimme erkennen 🔐</strong><div id="speakerIdentityStatus" style="margin:7px 0 10px;opacity:.85">Wird geprüft …</div><button id="speakerEnrollButton" class="secondaryButton" type="button">Stimmprobe aufnehmen</button><button id="speakerTestButton" class="secondaryButton" type="button" style="margin-top:8px">Stimme testen</button><button id="speakerClearButton" type="button" style="margin-top:8px;background:none;border:0;color:inherit;opacity:.7">Stimmprofil löschen</button>';\n` +
`    const chooser = document.getElementById('wakeModeChooser');\n` +
`    (chooser || wakeRow).insertAdjacentElement('afterend', panel);\n` +
`    const statusEl = document.getElementById('speakerIdentityStatus');\n` +
`    const enroll = document.getElementById('speakerEnrollButton');\n` +
`    const test = document.getElementById('speakerTestButton');\n` +
`    const clear = document.getElementById('speakerClearButton');\n` +
`    async function refresh() {\n` +
`      const p = plugin();\n` +
`      if (!p) { statusEl.textContent = 'Nur in der Android-App verfügbar.'; enroll.disabled = true; test.disabled = true; return; }\n` +
`      const s = await p.getStatus();\n` +
`      statusEl.textContent = s.profileReady ? 'Meine Stimme ist eingerichtet ✅️ · Testmodus' : 'Stimmproben: ' + s.sampleCount + '/3';\n` +
`      enroll.disabled = Boolean(s.profileReady);\n` +
`      enroll.textContent = s.profileReady ? '3/3 Stimmproben gespeichert' : 'Stimmprobe ' + (Number(s.sampleCount || 0) + 1) + '/3 aufnehmen';\n` +
`      test.disabled = !s.profileReady;\n` +
`    }\n` +
`    enroll.addEventListener('click', async () => {\n` +
`      try { enroll.disabled = true; statusEl.textContent = 'Jetzt einmal deutlich „Hey Sol“ sagen … 🎙️'; await plugin().enrollSample(); await refresh(); }\n` +
`      catch (e) { statusEl.textContent = e?.message || String(e); enroll.disabled = false; }\n` +
`    });\n` +
`    test.addEventListener('click', async () => {\n` +
`      try { test.disabled = true; statusEl.textContent = 'Jetzt „Hey Sol“ sagen … 🎙️'; const r = await plugin().verifySample(); statusEl.textContent = (r.accepted ? 'Stimme erkannt ✅️' : 'Stimme NICHT erkannt ❌') + ' · Wert ' + Number(r.score || 0).toFixed(3); }\n` +
`      catch (e) { statusEl.textContent = e?.message || String(e); } finally { test.disabled = false; }\n` +
`    });\n` +
`    clear.addEventListener('click', async () => { await plugin()?.clearProfile(); await refresh(); });\n` +
`    await refresh();\n` +
`  }, 500);\n` +
`})();\n`;
    writeFileSync(uiFile, ui, "utf8");
  }
}

console.log(`Lokale Sprechererkennung vorbereitet. Modell-SHA256: ${modelDigest}`);
