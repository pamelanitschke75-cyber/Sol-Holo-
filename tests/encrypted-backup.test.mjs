import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  BACKUP_FORMAT,
  BACKUP_OWNER_ID,
  BACKUP_STORAGE_KEYS,
  applyBackupRestore,
  backupFileName,
  createBackupSnapshot,
  decryptBackup,
  encryptBackup,
  planBackupRestore
} from "../www/sol-holo-backup-core.mjs";

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

const password = "Pam-Sol-Holo-Test-2026!";

test("Sicherung verwendet eine Positivliste und schließt Geheimnisse/Biometrie aus", () => {
  const storage = new MemoryStorage({
    [BACKUP_STORAGE_KEYS.notes]: JSON.stringify([{
      id: "note-1",
      title: "Sicher",
      text: "Diese Notiz darf in die Kopie.",
      source: "Pam",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_001
    }]),
    [BACKUP_STORAGE_KEYS.pendingDialogs]: JSON.stringify([{
      sourceEventId: "app-1234567890abcdef",
      messages: [{ role: "user", content: "Noch nicht synchronisiert" }]
    }]),
    [BACKUP_STORAGE_KEYS.selectedVoice]: "coral",
    [BACKUP_STORAGE_KEYS.introSeen]: "1",
    "sol-holo:pam-sol:clone-photo:v2": "data:image/jpeg;base64,GEHEIM",
    "sol-holo:pam-sol:clone-mouth:v2": "{\"biometric\":true}",
    "sol_holo_access_security_v1_pam-sol": "PRIVATE_KEY_METADATA",
    "oauth-token": "TOKEN"
  });

  const snapshot = createBackupSnapshot(storage, "2026-09-04T12:00:00.000Z");
  const serialized = JSON.stringify(snapshot);

  assert.equal(snapshot.ownerId, BACKUP_OWNER_ID);
  assert.equal(snapshot.data.notes.length, 1);
  assert.equal(snapshot.data.pendingDialogs.length, 1);
  assert.equal(snapshot.data.preferences.selectedVoice, "coral");
  assert.doesNotMatch(serialized, /GEHEIM|PRIVATE_KEY_METADATA|TOKEN|biometric/u);
  assert.deepEqual(Object.keys(snapshot.data).sort(), [
    "notes",
    "pendingDialogs",
    "preferences"
  ]);
});

test("AES-GCM-Sicherung lässt sich nur unverändert mit dem Passwort öffnen", async () => {
  const snapshot = createBackupSnapshot(new MemoryStorage({
    [BACKUP_STORAGE_KEYS.notes]: JSON.stringify([{
      id: "note-crypto",
      text: "Nur verschlüsselt",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000
    }])
  }), "2026-09-04T12:00:00.000Z");

  const encrypted = await encryptBackup(snapshot, password, webcrypto);
  const envelope = JSON.parse(encrypted);
  assert.equal(envelope.format, BACKUP_FORMAT);
  assert.equal(encrypted.includes("Nur verschlüsselt"), false);

  const restored = await decryptBackup(encrypted, password, webcrypto);
  assert.equal(restored.data.notes[0].text, "Nur verschlüsselt");

  await assert.rejects(
    decryptBackup(encrypted, "Falsches-Passwort-2026!", webcrypto),
    /Passwort falsch oder Sicherungsdatei verändert/u
  );

  const tampered = JSON.parse(encrypted);
  const last = tampered.ciphertextBase64.at(-1);
  tampered.ciphertextBase64 =
    tampered.ciphertextBase64.slice(0, -1) + (last === "A" ? "B" : "A");
  await assert.rejects(
    decryptBackup(JSON.stringify(tampered), password, webcrypto),
    /Passwort falsch oder Sicherungsdatei verändert/u
  );
});

test("Wiederherstellung ist owner-fest, additiv und berührt nur erlaubte Schlüssel", () => {
  const storage = new MemoryStorage({
    [BACKUP_STORAGE_KEYS.notes]: JSON.stringify([{
      id: "note-existing",
      title: "Bleibt",
      text: "Bestehende Notiz",
      source: "Pam",
      createdAt: 100,
      updatedAt: 100
    }]),
    [BACKUP_STORAGE_KEYS.pendingDialogs]: JSON.stringify([{
      sourceEventId: "app-existing-123456",
      messages: [{ role: "user", content: "Bestehend" }]
    }]),
    "oauth-token": "UNVERÄNDERT"
  });
  const snapshot = createBackupSnapshot(new MemoryStorage({
    [BACKUP_STORAGE_KEYS.notes]: JSON.stringify([{
      id: "note-new",
      title: "Neu",
      text: "Neue Notiz",
      source: "Pam",
      createdAt: 200,
      updatedAt: 200
    }]),
    [BACKUP_STORAGE_KEYS.pendingDialogs]: JSON.stringify([{
      sourceEventId: "app-new-dialog-12345",
      messages: [{ role: "assistant", content: "Neu" }]
    }]),
    [BACKUP_STORAGE_KEYS.selectedVoice]: "sage",
    [BACKUP_STORAGE_KEYS.introSeen]: "1"
  }), "2026-09-04T12:00:00.000Z");

  const plan = planBackupRestore(storage, snapshot);
  assert.equal(plan.summary.notesAdded, 1);
  assert.equal(plan.summary.pendingAdded, 1);
  applyBackupRestore(storage, plan);

  const notes = JSON.parse(storage.getItem(BACKUP_STORAGE_KEYS.notes));
  const dialogs = JSON.parse(storage.getItem(BACKUP_STORAGE_KEYS.pendingDialogs));
  assert.deepEqual(new Set(notes.map((note) => note.id)), new Set([
    "note-existing",
    "note-new"
  ]));
  assert.deepEqual(new Set(dialogs.map((dialog) => dialog.sourceEventId)), new Set([
    "app-existing-123456",
    "app-new-dialog-12345"
  ]));
  assert.equal(storage.getItem("oauth-token"), "UNVERÄNDERT");

  assert.throws(
    () => planBackupRestore(storage, { ...snapshot, ownerId: "other-owner" }),
    /gehört nicht zu Pams/u
  );
});

test("Dateiname ist stabil, lesbar und hat die eigene Endung", () => {
  assert.equal(
    backupFileName(new Date(2026, 8, 4, 9, 7)),
    "Pams-Holo-Sicherung-2026-09-04-0907.solholo-backup"
  );
});

test("ein Speicherfehler rollt die Wiederherstellung vollständig zurück", () => {
  const storage = new MemoryStorage({
    [BACKUP_STORAGE_KEYS.notes]: "[]",
    [BACKUP_STORAGE_KEYS.selectedVoice]: "coral"
  });
  const originalSetItem = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    if (key === BACKUP_STORAGE_KEYS.pendingDialogs) {
      throw new Error("quota");
    }
    originalSetItem(key, value);
  };
  const plan = {
    ownerId: BACKUP_OWNER_ID,
    writes: new Map([
      [BACKUP_STORAGE_KEYS.notes, "[{\"id\":\"new\"}]"],
      [BACKUP_STORAGE_KEYS.pendingDialogs, "[]"]
    ]),
    summary: {}
  };

  assert.throws(
    () => applyBackupRestore(storage, plan),
    /sicher zurückgerollt/u
  );
  assert.equal(storage.getItem(BACKUP_STORAGE_KEYS.notes), "[]");
  assert.equal(storage.getItem(BACKUP_STORAGE_KEYS.pendingDialogs), null);
});

test("Android-Dateibrücke nutzt den Systempicker und speichert nur Chiffretext", async () => {
  const source = await readFile(
    new URL("../android-native/SolBackupPlugin.java", import.meta.url),
    "utf8"
  );
  const installer = await readFile(
    new URL("../scripts/install-access-security.mjs", import.meta.url),
    "utf8"
  );
  const html = await readFile(new URL("../www/index.html", import.meta.url), "utf8");

  assert.match(source, /Intent\.ACTION_CREATE_DOCUMENT/u);
  assert.match(source, /Intent\.ACTION_OPEN_DOCUMENT/u);
  assert.match(source, /MAX_BACKUP_BYTES = 12 \* 1024 \* 1024/u);
  assert.doesNotMatch(source, /READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE/u);
  assert.match(installer, /registerPlugin\(SolBackupPlugin\.class\)/u);
  assert.match(installer, /sol_holo_access_security_v1_pam-sol\.xml/u);
  assert.match(installer, /sol_holo_speaker_identity\.xml/u);
  assert.match(html, /sol-holo-backup\.mjs\?v=1/u);
  assert.match(html, /sol-holo-backup\.css\?v=1/u);
});
