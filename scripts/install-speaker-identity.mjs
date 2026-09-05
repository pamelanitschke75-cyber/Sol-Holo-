import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
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
const CAMPPLUS_MODEL_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx";
const CAMPPLUS_MODEL_SHA256 = "357a834f702b80161e5b981182c038e18553c1f2ca752ed6cec2052365d4129b";
const ERES2NET_MODEL_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_eres2net_sv_en_voxceleb_16k.onnx";
const ERES2NET_MODEL_SHA256 = "c59158379255ad66e161679cca6af8d52d51e389e3224ab7d7a7baae295c2db5";
const KWS_MODEL_DIR = "sherpa-onnx-kws-zipformer-zh-en-3M-2025-12-20";
const KWS_MODEL_URL = `https://github.com/k2-fsa/sherpa-onnx/releases/download/kws-models/${KWS_MODEL_DIR}.tar.bz2`;
const KWS_MODEL_SHA256 = "68447f4fbc67e70eee3a93961f36e81e98f47aef73ce7e7ca00885c6cd3616a6";
const PERSONAL_WAKE_OWNER_ID = "pam-sol";
const PERSONAL_WAKE_NAME = "Pam";
const PERSONAL_WAKE_PHRASE = `Hey ${PERSONAL_WAKE_NAME}`;
const KWS_KEYWORDS = [
  "HH EY1 P AE1 M @Hey_Pam",
  "HH AY1 P AE1 M @Hai_Pam",
  "HH EY1 P EH1 M @Hey_Pamm",
  "HH AY1 P EH1 M @Hai_Pamm"
].join("\n") + "\n";

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

const campplusModelPath = join(assets, "sol-speaker-campplus.onnx");
const campplusModelBytes = await download(CAMPPLUS_MODEL_URL, campplusModelPath);
const campplusModelDigest = sha256(campplusModelBytes);
if (campplusModelDigest !== CAMPPLUS_MODEL_SHA256) {
  throw new Error(`CAMPPlus-Modell Hash stimmt nicht: ${campplusModelDigest}`);
}

const eres2netModelPath = join(assets, "sol-speaker-eres2net.onnx");
const eres2netModelBytes = await download(ERES2NET_MODEL_URL, eres2netModelPath);
const eres2netModelDigest = sha256(eres2netModelBytes);
if (eres2netModelDigest !== ERES2NET_MODEL_SHA256) {
  throw new Error(`ERes2Net-Modell Hash stimmt nicht: ${eres2netModelDigest}`);
}

const kwsTempDir = mkdtempSync(join(root, "sol-kws-build-"));
let kwsModelDigest = "";
try {
  const archivePath = join(kwsTempDir, `${KWS_MODEL_DIR}.tar.bz2`);
  const archiveBytes = await download(KWS_MODEL_URL, archivePath);
  kwsModelDigest = sha256(archiveBytes);
  if (kwsModelDigest !== KWS_MODEL_SHA256) {
    throw new Error(`Hey-Pam-KWS-Modell Hash stimmt nicht: ${kwsModelDigest}`);
  }

  const extractedRoot = join(kwsTempDir, "extracted");
  mkdirSync(extractedRoot, { recursive: true });
  execFileSync("tar", ["--no-same-owner", "-xjf", archivePath, "-C", extractedRoot], {
    stdio: "inherit"
  });
  const extractedModel = join(extractedRoot, KWS_MODEL_DIR);
  const selectedFiles = [
    [
      "encoder-epoch-13-avg-2-chunk-16-left-64.int8.onnx",
      "sol-kws-encoder.int8.onnx"
    ],
    [
      "decoder-epoch-13-avg-2-chunk-16-left-64.onnx",
      "sol-kws-decoder.onnx"
    ],
    [
      "joiner-epoch-13-avg-2-chunk-16-left-64.int8.onnx",
      "sol-kws-joiner.int8.onnx"
    ],
    ["tokens.txt", "sol-kws-tokens.txt"]
  ];
  for (const [sourceName, targetName] of selectedFiles) {
    const source = join(extractedModel, sourceName);
    if (!existsSync(source)) {
      throw new Error(`Hey-Pam-KWS-Datei fehlt: ${sourceName}`);
    }
    copyFileSync(source, join(assets, targetName));
  }

  const tokenSet = new Set(
    readFileSync(join(assets, "sol-kws-tokens.txt"), "utf8")
      .split(/\r?\n/)
      .map(line => line.trim().split(/\s+/)[0])
      .filter(Boolean)
  );
  for (const token of [
    "HH",
    "EY1",
    "AY1",
    "P",
    "AE1",
    "EH1",
    "M"
  ]) {
    if (!tokenSet.has(token)) {
      throw new Error(`Hey-Pam-KWS-Token fehlt: ${token}`);
    }
  }
  writeFileSync(join(assets, "sol-kws-keywords.txt"), KWS_KEYWORDS, "utf8");
} finally {
  rmSync(kwsTempDir, { recursive: true, force: true });
}

copyFileSync(
  join(root, "android-native", "SolSpeakerIdentityPlugin.java"),
  join(javaTarget, "SolSpeakerIdentityPlugin.java")
);
copyFileSync(
  join(root, "android-native", "SpeakerVerificationPolicy.java"),
  join(javaTarget, "SpeakerVerificationPolicy.java")
);
copyFileSync(
  join(root, "android-native", "WakeVoiceTemplateSelector.java"),
  join(javaTarget, "WakeVoiceTemplateSelector.java")
);
copyFileSync(
  join(root, "android-native", "PcmRingBuffer.java"),
  join(javaTarget, "PcmRingBuffer.java")
);
copyFileSync(
  join(root, "android-native", "SolWakeKeywordSpotter.java"),
  join(javaTarget, "SolWakeKeywordSpotter.java")
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
`Zweck: Lokale Unterscheidung und Freigabe der autorisierten Besitzerstimme.\n` +
`Owner-Bindung: ${PERSONAL_WAKE_OWNER_ID} · persönlicher Weckname: ${PERSONAL_WAKE_NAME}.\n` +
`Status: Der Weckruf „${PERSONAL_WAKE_PHRASE}“ wird nur nach lokaler Freigabe des gespeicherten Besitzerprofils ausgeführt.\n` +
`Profilbildung: Die drei Stimmproben werden je Modell zu einem normalisierten Mittelprofil und zu drei getrennten Kurz-Weckrufvarianten verarbeitet. Bereits sicher freigegebene natürliche Varianten können freie Plätze ergänzen; gespeicherte Varianten werden niemals automatisch überschrieben.\n` +
`Sicherheitsprinzip: Der vollständige Prüfsatz bleibt bei Modell B mindestens 0,58 plus Modell A mindestens 0,10. Das vorhandene 3/3-Stimmprofil bleibt bei einem Wechsel des persönlichen Wecknamens erhalten. Mehrere gepaarte Proben decken normale Schwankungen wie Müdigkeit, Erkältung oder Heiserkeit besser ab. Beim Weckruf müssen beide unabhängigen Modelle weiterhin beitragen; nur wenn eines besonders eindeutig ist, darf das andere innerhalb seiner Plausibilitätsgrenze schwanken. Fehlende, einseitige oder ungültige Messungen sperren den Weckruf.\n\n` +
`sherpa-onnx 1.13.4\nQuelle: ${AAR_URL}\nLizenz: Apache License 2.0\nSHA-256 AAR: ${AAR_SHA256}\n\n` +
`Speaker-Embedding-Modell A: 3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx\n` +
`Quelle: ${CAMPPLUS_MODEL_URL}\nModellfamilie: 3D-Speaker / CAMPPlus\n` +
`Erwartete und geprüfte SHA-256: ${CAMPPLUS_MODEL_SHA256}\n\n` +
`Speaker-Embedding-Modell B: 3dspeaker_speech_eres2net_sv_en_voxceleb_16k.onnx\n` +
`Quelle: ${ERES2NET_MODEL_URL}\nModellfamilie: 3D-Speaker / ERes2Net\n` +
`Erwartete und geprüfte SHA-256: ${ERES2NET_MODEL_SHA256}\n\n` +
`Lokale Weckruferkennung: ${KWS_MODEL_DIR}\n` +
`Quelle: ${KWS_MODEL_URL}\n` +
`Zweck: Open-Vocabulary-Erkennung ausschließlich für den owner-gebundenen Weckruf „${PERSONAL_WAKE_PHRASE}“ direkt im lokalen Mikrofonstrom. Enge Lautvarianten decken die deutsche Aussprache von „Hey“ und „Pam“ ab; alle Varianten werden intern auf denselben persönlichen Weckruf normalisiert. Andere persönliche Holos erhalten ihren eigenen Namen statt eines gemeinsamen universellen Wecknamens.\n` +
`Erwartete und geprüfte SHA-256: ${KWS_MODEL_SHA256}\n` +
`Ausgeliefert werden nur der quantisierte Encoder und Joiner, der Decoder, die Tokenliste und die lokale Hey-Pam-Definition.\n\n` +
`Lizenzbasis des 3D-Speaker-Projekts: Apache License 2.0\n\n` +
`Datenschutz: Die Rohaufnahme wird nur im Arbeitsspeicher verarbeitet und nicht als Audiodatei gespeichert.\n` +
`Das abgeleitete Stimmprofil wird im privaten App-Speicher des Geräts abgelegt und ausdrücklich aus Android-Cloud-Backup und Geräteübertragung ausgeschlossen.\n` +
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
`    panel.innerHTML = '<strong>Meine Stimme sicher prüfen 🔐</strong><div style="margin:8px 0;padding:9px;border-radius:10px;background:rgba(90,55,160,.22)">Prüfsatz:<br><b>„Hey Pam. Bitte prüfe jetzt genau meine Stimme.“</b></div><div id="speakerIdentityStatus" style="margin:7px 0 10px;opacity:.9">Wird geprüft …</div><button id="speakerEnrollButton" class="secondaryButton" type="button">Stimmprobe aufnehmen</button><button id="speakerTestButton" class="secondaryButton" type="button" style="margin-top:8px">Sicherheit testen</button><button id="speakerClearButton" type="button" style="margin-top:8px;background:none;border:0;color:inherit;opacity:.7">Stimmprofil löschen</button>';\n` +
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
`      statusEl.textContent = s.profileReady ? (s.wakeVoiceReady ? '3/3 gespeichert · Alltagstoleranz aktiv · Hey Pam geschützt 🔒' : '3/3 gespeichert · jetzt einmal Hey Pam sagen') : 'Stimmproben: ' + s.sampleCount + '/3';\n` +
`      enroll.disabled = Boolean(s.profileReady);\n` +
`      enroll.textContent = s.profileReady ? '3/3 Stimmproben gespeichert' : 'Stimmprobe ' + (Number(s.sampleCount || 0) + 1) + '/3 aufnehmen';\n` +
`      test.disabled = !s.profileReady;\n` +
`      test.textContent = s.wakeVoiceReady ? 'Sicherheit testen' : 'Hey Pam zusätzlich prüfen';\n` +
`    }\n` +
`    await plugin()?.addListener?.('speakerRecordingReady', () => {\n` +
`      statusEl.textContent = 'JETZT den vollständigen Prüfsatz sagen … 🎙️';\n` +
`    });\n` +
`    enroll.addEventListener('click', async () => {\n` +
`      try { enroll.disabled = true; statusEl.textContent = 'Mikrofon wird vorbereitet … bitte noch warten'; await plugin().enrollSample(); await refresh(); }\n` +
`      catch (e) { statusEl.textContent = e?.message || String(e); enroll.disabled = false; }\n` +
`    });\n` +
`    test.addEventListener('click', async () => {\n` +
`      try { test.disabled = true; statusEl.textContent = 'Mikrofon wird vorbereitet … bitte noch warten'; const r = await plugin().verifySample(); statusEl.textContent = (r.accepted ? (r.wakeVoiceReady ? 'Stimme freigegeben ✅ · Alltagstoleranz aktiv · Hey Pam geschützt' : 'Stimme freigegeben ✅ · Hey Pam noch nicht sauber erfasst') : 'Keine Freigabe 🔒') + ' · Modell A ' + Number(r.campplusScore || 0).toFixed(3) + ' · Modell B ' + Number(r.eres2netScore || 0).toFixed(3); test.textContent = r.wakeVoiceReady ? 'Sicherheit testen' : 'Hey Pam zusätzlich prüfen'; }\n` +
`      catch (e) { statusEl.textContent = e?.message || String(e); } finally { test.disabled = false; }\n` +
`    });\n` +
`    clear.addEventListener('click', async () => { await plugin()?.clearProfile(); await refresh(); });\n` +
`    await refresh();\n` +
`  }, 500);\n` +
`})();\n`;
    writeFileSync(uiFile, ui, "utf8");
  }
}

console.log(
  `Lokale Sprechererkennung vorbereitet. ` +
  `CAMPPlus=${campplusModelDigest}, ERes2Net=${eres2netModelDigest}, ` +
  `HeyPamKWS=${kwsModelDigest}`
);
