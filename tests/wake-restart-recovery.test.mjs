import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const receiverSource = await readFile(
  new URL("../android-native/HeyPamRestartReceiver.java", import.meta.url),
  "utf8"
);
const serviceSource = await readFile(
  new URL("../android-native/HeyHoSolService.java", import.meta.url),
  "utf8"
);
const pluginSource = await readFile(
  new URL("../android-native/HeyHoSolPlugin.java", import.meta.url),
  "utf8"
);
const installerSource = await readFile(
  new URL("../scripts/install-whatsapp-driving-mode.mjs", import.meta.url),
  "utf8"
);
const backupUiSource = await readFile(
  new URL("../www/sol-holo-backup.mjs", import.meta.url),
  "utf8"
);
const backupCoreSource = await readFile(
  new URL("../www/sol-holo-backup-core.mjs", import.meta.url),
  "utf8"
);

test("Neustart und App-Update erhalten Pams gewählten Hintergrundmodus", () => {
  assert.match(receiverSource, /Intent\.ACTION_BOOT_COMPLETED/u);
  assert.match(receiverSource, /Intent\.ACTION_MY_PACKAGE_REPLACED/u);
  assert.match(receiverSource, /HeyHoSolPlugin\.MODE_KEY/u);
  assert.match(receiverSource, /HeyHoSolPlugin\.MODE_BACKGROUND\.equals\(savedMode\)/u);
  assert.doesNotMatch(receiverSource, /remove\(HeyHoSolPlugin\.MODE_KEY\)/u);
});

test("Android 14 startet das Mikrofon erst nach Pams Benachrichtigungstipp", () => {
  const onReceiveStart = receiverSource.indexOf("public void onReceive(");
  const cancelStart = receiverSource.indexOf("static void cancelReminder(");
  assert.notEqual(onReceiveStart, -1);
  assert.notEqual(cancelStart, -1);
  const onReceive = receiverSource.slice(onReceiveStart, cancelStart);

  assert.doesNotMatch(onReceive, /startForegroundService|startService/u);
  assert.match(receiverSource, /PendingIntent\.getForegroundService/u);
  assert.match(receiverSource, /HeyHoSolService\.startIntent/u);
  assert.match(receiverSource, /"Jetzt aktivieren"/u);
  assert.match(receiverSource, /einmal tippen, dann hört „Hey Pam“ wieder/u);
});

test("die Neustart-Erinnerung verschwindet erst bei echter Hörbereitschaft", () => {
  const readyStart = serviceSource.indexOf("listening = true;");
  const readyEnd = serviceSource.indexOf("mainHandler.postDelayed(", readyStart);
  assert.notEqual(readyStart, -1);
  assert.notEqual(readyEnd, -1);
  assert.match(
    serviceSource.slice(readyStart, readyEnd),
    /HeyPamRestartReceiver\.cancelReminder\(this\)/u
  );
  assert.match(
    pluginSource,
    /if \(MODE_OFF\.equals\(mode\)\) \{\s*HeyPamRestartReceiver\.cancelReminder/u
  );
});

test("das ausgelieferte Manifest empfängt Neustart und eigene Aktualisierung", () => {
  assert.match(installerSource, /HeyPamRestartReceiver\.java/u);
  assert.match(installerSource, /android\.permission\.RECEIVE_BOOT_COMPLETED/u);
  assert.match(installerSource, /android\.intent\.action\.BOOT_COMPLETED/u);
  assert.match(installerSource, /android\.intent\.action\.MY_PACKAGE_REPLACED/u);
  assert.match(installerSource, /android:name="\.HeyPamRestartReceiver"/u);
});

test("ein Handywechsel hat einen vollständigen sicheren Wiederanlauf", () => {
  assert.match(backupUiSource, /Neues Handy – kurz und sicher/u);
  assert.match(backupUiSource, /Originalsignierte Pam’s-Holo-App installieren/u);
  assert.match(backupUiSource, /Pams Stimme 3× neu aufnehmen/u);
  assert.match(backupUiSource, /Hintergrund einmal aktivieren/u);
  assert.match(backupCoreSource, /Stimmprofile und Sprecher-Embeddings/u);
  assert.match(backupCoreSource, /BACKUP_OWNER_ID = "pam-sol"/u);
  assert.match(backupCoreSource, /BACKUP_PACKAGE_NAME = "com\.solholo\.app"/u);
});
