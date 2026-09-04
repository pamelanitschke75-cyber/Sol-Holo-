import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

const [
  manifest,
  wearGradle,
  activity,
  watchService,
  watchListener,
  restartReceiver,
  payloadPolicy,
  phoneListener,
  phoneWakeService,
  installer,
  workflow
] = await Promise.all([
  read("wear-native/src/main/AndroidManifest.xml"),
  read("wear-native/build.gradle"),
  read("wear-native/src/main/java/com/solholo/app/WatchMainActivity.java"),
  read("wear-native/src/main/java/com/solholo/app/WatchWakeService.java"),
  read("wear-native/src/main/java/com/solholo/app/WatchBridgeListenerService.java"),
  read("wear-native/src/main/java/com/solholo/app/WatchRestartReceiver.java"),
  read("android-native/WearWakePayloadPolicy.java"),
  read("android-native/PhoneWearWakeListenerService.java"),
  read("android-native/HeyHoSolService.java"),
  read("scripts/install-wear-companion.mjs"),
  read(".github/workflows/android-build.yml")
]);

test("Watch8 ist ein getrenntes, gekoppeltes Wear-OS-Paket", () => {
  assert.match(manifest, /android\.hardware\.type\.watch/u);
  assert.match(
    manifest,
    /com\.google\.android\.wearable\.standalone[\s\S]*?android:value="false"/u
  );
  assert.match(wearGradle, /applicationId "com\.solholo\.app"/u);
  assert.match(wearGradle, /minSdkVersion 30/u);
  assert.match(
    wearGradle,
    /com\.google\.android\.gms:play-services-wearable:20\.0\.1/u
  );
  assert.match(installer, /include ':wear'/u);
  assert.match(installer, /phoneVersionCode \* 10 \+ 1/u);
});

test("das Watch-Mikrofon wird nur sichtbar und ausdrücklich aktiviert", () => {
  assert.match(manifest, /android\.permission\.RECORD_AUDIO/u);
  assert.match(manifest, /android\.permission\.FOREGROUND_SERVICE_MICROPHONE/u);
  assert.match(manifest, /android:foregroundServiceType="microphone"/u);
  assert.match(activity, /requestPermissions/u);
  assert.match(activity, /Hintergrund aktivieren/u);
  assert.match(activity, /startForegroundService\(intent\)/u);
  assert.match(
    watchService,
    /ServiceInfo\.FOREGROUND_SERVICE_TYPE_MICROPHONE/u
  );
  assert.match(watchService, /setOngoing\(true\)/u);
});

test("Neustart und Update verlangen den rechtlich nötigen sichtbaren Tipp", () => {
  assert.match(restartReceiver, /BOOT_COMPLETED/u);
  assert.match(restartReceiver, /Pam auf der Watch wieder aktivieren/u);
  assert.match(restartReceiver, /Einmal tippen/u);
  assert.doesNotMatch(restartReceiver, /startForegroundService/u);
  assert.doesNotMatch(restartReceiver, /WatchWakeService\.ACTION_START/u);
  assert.match(activity, /wasListeningRequested/u);
});

test("Hey Pam wird auf der Watch lokal und mit begrenztem PCM erkannt", () => {
  assert.match(watchService, /new SolWakeKeywordSpotter/u);
  assert.match(watchService, /MediaRecorder\.AudioSource\.MIC/u);
  assert.match(watchService, /setPrivacySensitive\(true\)/u);
  assert.match(watchService, /snapshotLatest\(CAPTURE_WINDOW_SAMPLES\)/u);
  assert.match(watchService, /POSTROLL_SAMPLES/u);
  assert.match(watchService, /node\.isNearby\(\)/u);
  assert.match(watchService, /request\.setUrgent\(\)/u);
  assert.match(
    watchService,
    /deleteDataItems\(candidateUri\)[\s\S]*?WearWakePayloadPolicy\.MAX_AGE_MILLIS/u
  );
  assert.match(payloadPolicy, /MAX_AGE_MILLIS = 30_000L/u);
  assert.match(payloadPolicy, /MAX_SAMPLE_COUNT = SAMPLE_RATE \* 2_400/u);
  assert.match(payloadPolicy, /MAX_PCM_BYTES = MAX_SAMPLE_COUNT \* 2/u);
  assert.doesNotMatch(payloadPolicy, /100_000|102_400/u);
});

test("das Stimmprofil bleibt auf dem S23 und entscheidet endgültig", () => {
  assert.match(phoneListener, /SolSpeakerIdentityPlugin\.verifyWakeAudio/u);
  assert.match(phoneListener, /if \(!verification\.accepted\)/u);
  assert.match(phoneListener, /HeyHoSolService\.acceptVerifiedWearWake/u);
  assert.match(phoneListener, /deleteDataItems\(uri\)/u);
  assert.match(phoneListener, /LAST_SESSION_KEY/u);
  assert.match(payloadPolicy, /OWNER_ID = "pam-sol"/u);
  assert.match(payloadPolicy, /WAKE_PHRASE = "Hey Pam"/u);
  assert.match(watchListener, /WearWakePayloadPolicy\.OWNER_ID\.equals/u);
});

test("Watch-Weckruf nutzt nur den vorhandenen geprüften Handy-Übergabepfad", () => {
  const wearMethodStart = phoneWakeService.indexOf(
    "static void acceptVerifiedWearWake("
  );
  const wearMethodEnd = phoneWakeService.indexOf(
    "public static boolean isRunning()",
    wearMethodStart
  );
  assert.notEqual(wearMethodStart, -1);
  assert.notEqual(wearMethodEnd, -1);
  const wearMethod = phoneWakeService.slice(wearMethodStart, wearMethodEnd);
  assert.match(wearMethod, /WakePhraseMatcher\.canonicalPhrase/u);
  assert.match(wearMethod, /service\.handleWakePhrase\(canonicalPhrase\)/u);
  assert.match(wearMethod, /service\.mainHandler\.post/u);
  assert.doesNotMatch(wearMethod, /startForegroundService|startService/u);
});

test("CI baut und signiert Handy und Watch mit derselben dauerhaften Identität", () => {
  assert.match(workflow, /app:assembleRelease wear:assembleRelease/u);
  assert.match(workflow, /wear-release-unsigned\.apk/u);
  assert.match(workflow, /Pams-Holo-Watch8\.apk/u);
  assert.match(workflow, /phone_certificate_sha256/u);
  assert.match(workflow, /watch_certificate_sha256/u);
  assert.match(
    workflow,
    /test "\$phone_certificate_sha256" = "\$watch_certificate_sha256"/u
  );
  assert.match(
    workflow,
    /uses-feature: name='android\.hardware\.type\.watch'/u
  );
});

test("der erste Watch-Schritt verspricht keinen Lautsprecher-Dialog auf der Uhr", () => {
  assert.match(
    activity,
    /In diesem ersten Watch-Schritt spricht Pam nach der Freigabe über das Handy/u
  );
  assert.match(
    phoneWakeService,
    /Pam ist da · sie spricht jetzt über dein Handy/u
  );
});
