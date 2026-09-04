import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serviceSource = await readFile(
  new URL("../android-native/HeyHoSolService.java", import.meta.url),
  "utf8"
);
const spotterSource = await readFile(
  new URL("../android-native/SolWakeKeywordSpotter.java", import.meta.url),
  "utf8"
);
const speakerPluginSource = await readFile(
  new URL("../android-native/SolSpeakerIdentityPlugin.java", import.meta.url),
  "utf8"
);
const uiSource = await readFile(
  new URL("../www/sol-holo-ui.js", import.meta.url),
  "utf8"
);
const installerSource = await readFile(
  new URL("../scripts/install-speaker-identity.mjs", import.meta.url),
  "utf8"
);
const drivingInstallerSource = await readFile(
  new URL("../scripts/install-whatsapp-driving-mode.mjs", import.meta.url),
  "utf8"
);
const pluginSource = await readFile(
  new URL("../android-native/HeyHoSolPlugin.java", import.meta.url),
  "utf8"
);

function methodSource(startMarker, endMarker) {
  const start = serviceSource.indexOf(startMarker);
  const end = serviceSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `${startMarker} fehlt`);
  assert.notEqual(end, -1, `${endMarker} fehlt`);
  return serviceSource.slice(start, end);
}

test("derselbe lokale PCM-Strom erreicht Weckruf- und Sprecherprüfung", () => {
  const pump = methodSource(
    "private void pump(SecureAudioListener listener)",
    "short[] finishAndSnapshot()"
  );
  assert.match(pump, /captured\.append\(buffer, count\)/u);
  assert.match(pump, /keywordSpotter\.accept\(buffer, count\)/u);
  assert.ok(
    pump.indexOf("captured.append(buffer, count)")
      < pump.indexOf("keywordSpotter.accept(buffer, count)"),
    "PCM muss vor der lokalen Erkennung im geschützten Ringspeicher liegen"
  );
  assert.match(serviceSource, /session\.finishAndSnapshot\(\)/u);
  assert.match(serviceSource, /SolSpeakerIdentityPlugin\.verifyWakeAudio/u);
});

test("nach erkanntem Hey Pam bleibt das Mikrofon für das Wortende offen", () => {
  const pump = methodSource(
    "private void pump(SecureAudioListener listener)",
    "short[] finishAndSnapshot()"
  );
  assert.match(
    serviceSource,
    /KEYWORD_POSTROLL_SAMPLES\s*=\s*SECURE_SAMPLE_RATE \* 350 \/ 1000/u
  );
  assert.match(
    pump,
    /keywordPostrollEndSample = captured\.totalWritten\(\)\s*\+ KEYWORD_POSTROLL_SAMPLES/u
  );
  assert.match(
    pump,
    /captured\.totalWritten\(\) >= keywordPostrollEndSample/u
  );
  assert.match(
    pump,
    /keywordAudioStart = Math\.max\([\s\S]*?\);\s*keywordPostrollEndSample = captured\.totalWritten\(\)/u,
    "Nach dem Keyword-Treffer muss zuerst der Nachlauf geplant werden"
  );
});

test("echter Weckruf und Sicherheitstest verwenden denselben Hey-Pam-Ausschnitt", () => {
  const verificationStart = speakerPluginSource.indexOf(
    "static WakeVerification verifyWakeAudio("
  );
  const verificationEnd = speakerPluginSource.indexOf(
    "private static float[] computeEmbedding(",
    verificationStart
  );
  assert.notEqual(verificationStart, -1);
  assert.notEqual(verificationEnd, -1);
  const verification = speakerPluginSource.slice(
    verificationStart,
    verificationEnd
  );
  assert.match(
    verification,
    /WakeVoiceTemplateSelector\.extract\(\s*captured,\s*capturedCount\s*\)/u
  );
  assert.doesNotMatch(verification, /MIN_WAKE_ACTIVE_FRAMES/u);
  assert.doesNotMatch(verification, /MAX_WAKE_SPEECH_GAP_FRAMES/u);
});

test("Samsung muss keine aufgenommene Datei an SpeechRecognizer übernehmen", () => {
  assert.match(serviceSource, /new SolWakeKeywordSpotter/u);
  assert.match(
    serviceSource,
    /MediaRecorder\.AudioSource\.MIC/u,
    "Der S23-Weckdienst muss dieselbe Mikrofonquelle wie die Android-KWS-Referenz verwenden"
  );
  assert.doesNotMatch(
    serviceSource,
    /MediaRecorder\.AudioSource\.VOICE_RECOGNITION/u
  );
  assert.match(spotterSource, /new KeywordSpotterConfig\(\)/u);
  assert.match(
    spotterSource,
    /new KeywordSpotter\(context\.getAssets\(\), config\)/u
  );
  assert.match(spotterSource, /stream\.acceptWaveform/u);
  assert.doesNotMatch(serviceSource, /SpeechRecognizer|RecognizerIntent/u);
  assert.doesNotMatch(serviceSource, /ParcelFileDescriptor|prepareRecognitionSource/u);
});

test("Sicherheitstest und echter Weckruf verwenden dieselbe Mikrofonquelle", () => {
  const captureStart = speakerPluginSource.indexOf(
    "private CapturedVoice captureVoice()"
  );
  const captureEnd = speakerPluginSource.indexOf(
    "static WakeVerification verifyWakeAudio(",
    captureStart
  );
  assert.notEqual(captureStart, -1);
  assert.notEqual(captureEnd, -1);
  const captureSource = speakerPluginSource.slice(captureStart, captureEnd);
  assert.match(captureSource, /MediaRecorder\.AudioSource\.MIC/u);
  assert.doesNotMatch(
    captureSource,
    /MediaRecorder\.AudioSource\.VOICE_RECOGNITION/u
  );
});

test("nur Pams owner-gebundenes Hey Pam erreicht beide Besitzerprüfungen", () => {
  assert.match(
    serviceSource,
    /SECURE_WAKE_PHRASE\s*=\s*WakePhraseMatcher\.CANONICAL_PHRASE/u
  );
  assert.match(serviceSource, /WakePhraseMatcher\.canonicalPhrase/u);
  assert.match(spotterSource, /WakePhraseMatcher\.canonicalPhrase/u);
  assert.match(installerSource, /PERSONAL_WAKE_OWNER_ID = "pam-sol"/u);
  assert.match(installerSource, /PERSONAL_WAKE_NAME = "Pam"/u);
  assert.match(installerSource, /HH EY1 P AE1 M @Hey_Pam/u);
  assert.match(installerSource, /HH AY1 P AE1 M @Hai_Pam/u);
  assert.match(installerSource, /HH EY1 P EH1 M @Hey_Pamm/u);
  assert.match(installerSource, /HH AY1 P EH1 M @Hai_Pamm/u);
  assert.doesNotMatch(installerSource, /@Hey_Sol|@Hallo_Sol|@Hello_Sol/u);
  assert.match(serviceSource, /measuredCampplusScore/u);
  assert.match(serviceSource, /measuredEres2netScore/u);
});

test("bestehende 3-von-3-Profile migrieren nur die kurze Hey-Pam-Vorlage", () => {
  assert.match(
    speakerPluginSource,
    /boolean accepted = templateAccepted \|\| profileAccepted/u
  );
  assert.match(
    speakerPluginSource,
    /if \(profileAccepted && !templateAccepted\)/u
  );
  assert.match(
    speakerPluginSource,
    /\.putString\(\s*WAKE_CAMPPLUS_TEMPLATE_KEY/u
  );
  assert.match(
    speakerPluginSource,
    /\.putString\(\s*WAKE_ERES2NET_TEMPLATE_KEY/u
  );
  assert.match(
    speakerPluginSource,
    /\.putString\(\s*WAKE_TEMPLATE_PHRASE_KEY,\s*WakePhraseMatcher\.CANONICAL_PHRASE/u
  );
  assert.match(
    speakerPluginSource,
    /WakePhraseMatcher\.CANONICAL_PHRASE\.equals\(wakePhrase\)/u
  );
  assert.doesNotMatch(
    speakerPluginSource,
    /PROFILE_VERSION\s*=\s*4/u,
    "Das vorhandene 3-von-3-Profil darf nicht gelöscht werden"
  );
});

test("eine vorhandene Hey-Pam-Vorlage verlangt nach Ablehnung keinen neuen Sicherheitstest", () => {
  assert.match(speakerPluginSource, /boolean templateUsed = templateScored/u);
  assert.doesNotMatch(
    speakerPluginSource,
    /templateUsed\s*=\s*templateAccepted/u
  );
  const rejectionStart = uiSource.indexOf('event?.stage === "owner_rejected"');
  assert.notEqual(rejectionStart, -1);
  assert.doesNotMatch(
    uiSource.slice(rejectionStart, rejectionStart + 500),
    /einmal Sicherheit testen/u
  );
});

test("Android 14 und 15 erhalten beide Freigaben für den Hintergrundstart", () => {
  assert.match(serviceSource, /import android\.app\.ActivityOptions;/u);
  assert.match(
    serviceSource,
    /setPendingIntentCreatorBackgroundActivityStartMode\(\s*ActivityOptions\.MODE_BACKGROUND_ACTIVITY_START_ALLOWED\s*\)/u
  );
  assert.match(
    serviceSource,
    /setPendingIntentBackgroundActivityStartMode\(\s*ActivityOptions\.MODE_BACKGROUND_ACTIVITY_START_ALLOWED\s*\)/u
  );
  assert.match(
    serviceSource,
    /PendingIntent\.getActivity\([\s\S]*?creatorOptions\.toBundle\(\)/u
  );
  assert.match(
    serviceSource,
    /wakePendingIntent\.send\([\s\S]*?senderOptions\.toBundle\(\)/u
  );
  assert.match(
    serviceSource,
    /PendingIntent\.FLAG_CANCEL_CURRENT \| PendingIntent\.FLAG_IMMUTABLE/u
  );
});

test("blockierter Hintergrundstart bleibt sichtbar und hat einen sicheren Tipp-Rückweg", () => {
  assert.match(
    serviceSource,
    /launchSolHoloActivityDirectlyIfStillHidden/u
  );
  assert.match(serviceSource, /confirmWakeActivityVisible/u);
  assert.match(
    serviceSource,
    /Hey Pam erkannt · hier tippen zum Öffnen/u
  );
  assert.match(serviceSource, /"Sol öffnen"/u);
  assert.match(
    serviceSource,
    /launchIntent\.putExtra\("hey_ho_sol_wake", true\)/u
  );
});

test("der bereits laufende Mikrofondienst wird beim Sperren direkt fortgesetzt", () => {
  const resumeStart = serviceSource.indexOf(
    "public static void resume(Context context, String mode)"
  );
  const resumeEnd = serviceSource.indexOf(
    "public static boolean isRunning()",
    resumeStart
  );
  assert.notEqual(resumeStart, -1);
  assert.notEqual(resumeEnd, -1);
  const resumeSource = serviceSource.slice(resumeStart, resumeEnd);

  assert.match(resumeSource, /HeyHoSolService service = activeService/u);
  assert.match(
    resumeSource,
    /service\.mainHandler\.post\(\(\) -> service\.resumeInPlace\(mode\)\)/u
  );
  assert.ok(
    resumeSource.indexOf("resumeInPlace(mode)")
      < resumeSource.indexOf("startForegroundService"),
    "Ein laufender Dienst muss vor jedem neuen FGS-Start direkt fortgesetzt werden"
  );
  assert.match(
    resumeSource,
    /if \(!HeyHoSolPlugin\.isActivityVisible\(\)\) \{\s*return;/u,
    "Ein entfernter Mikrofon-FGS darf nicht heimlich aus dem gesperrten Hintergrund neu entstehen"
  );
});

test("ein entfernter Mikrofondienst wird aus dem Sperrbildschirm nicht neu erzeugt", () => {
  assert.match(
    pluginSource,
    /if \(!activityVisible && !HeyHoSolService\.isRunning\(\)\) \{\s*return;/u
  );
});

test("Hey Pam bleibt bei ausgeschaltetem Bildschirm aufnahmebereit", () => {
  assert.match(serviceSource, /PowerManager\.PARTIAL_WAKE_LOCK/u);
  assert.match(serviceSource, /:hey-pam-listening/u);
  assert.match(serviceSource, /acquireRecognitionWakeLock\(\)/u);
  assert.match(serviceSource, /releaseRecognitionWakeLock\(\)/u);
  assert.match(
    drivingInstallerSource,
    /android\.permission\.WAKE_LOCK/u
  );
});

test("ein bestätigter Weckruf wartet sicher auf die echte Geräteentsperrung", () => {
  const handleWake = methodSource(
    "private void handleWakePhrase(String phrase)",
    "private boolean isDeviceLocked()"
  );
  assert.match(
    handleWake,
    /if \(isDeviceLocked\(\)\) \{\s*beginLockedWakeHandoff\(\)/u
  );
  assert.match(serviceSource, /Intent\.ACTION_USER_PRESENT/u);
  assert.match(serviceSource, /showLockedWakeOverlay\(\)/u);
  assert.match(serviceSource, /wakeScreenForSecureHandoff\(\)/u);
  assert.match(serviceSource, /continueWakeAfterDeviceUnlock\(\)/u);
  assert.match(
    serviceSource,
    /if \(!isDeviceLocked\(\)\) \{\s*continueWakeAfterDeviceUnlock\(\);\s*return;/u,
    "Ein Entsperren während der Empfänger-Anmeldung darf nicht verloren gehen"
  );
  assert.match(
    serviceSource,
    /Entsperre dein Handy sicher – Sol wartet bereits\./u
  );
  assert.doesNotMatch(
    serviceSource,
    /requestDismissKeyguard|FLAG_DISMISS_KEYGUARD/u,
    "Pams Android-Gerätesperre darf nicht umgangen werden"
  );
});

test("die sichere Entsperr-Übergabe verwirft den Weckruf nicht nach 30 Sekunden", () => {
  assert.match(
    uiSource,
    /const wakeHandoffMaxAgeMillis = 120_000/u
  );
  assert.match(
    uiSource,
    /Date\.now\(\) - detectedAt > wakeHandoffMaxAgeMillis/u
  );
});
