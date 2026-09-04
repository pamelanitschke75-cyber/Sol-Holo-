const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

export const BACKUP_FORMAT = "sol-holo-encrypted-backup";
export const BACKUP_VERSION = 1;
export const BACKUP_OWNER_ID = "pam-sol";
export const BACKUP_PACKAGE_NAME = "com.solholo.app";
export const BACKUP_KDF_ITERATIONS = 310_000;
export const BACKUP_MAX_BYTES = 12 * 1024 * 1024;
export const BACKUP_MIN_PASSWORD_LENGTH = 12;

export const BACKUP_STORAGE_KEYS = Object.freeze({
  notes: "pams-holo-original-notes-v1",
  pendingDialogs: "sol-holo-fulltime-pending-v1",
  selectedVoice: "sol-holo-realtime-voice-v1",
  introSeen: "sol-holo-intro-v2-seen"
});

export const EXCLUDED_BACKUP_CATEGORIES = Object.freeze([
  "Android- und Signierschlüssel",
  "Passwörter, Tokens und Sitzungen",
  "Stimmprofile und Sprecher-Embeddings",
  "Fotos, Gesichtsdaten und Lip-Sync-Geometrie",
  "nicht eindeutig zugeordnete Quarantänedaten"
]);

const ALLOWED_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar"
]);

function cryptoApi(override) {
  const api = override || globalThis.crypto;
  if (!api?.subtle || typeof api.getRandomValues !== "function") {
    throw new Error("Sichere Verschlüsselung ist auf diesem Gerät nicht verfügbar.");
  }
  return api;
}

function cleanText(value, maximumLength) {
  return String(value ?? "").trim().slice(0, maximumLength);
}

function finiteTimestamp(value, fallback) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0
    ? Math.trunc(timestamp)
    : fallback;
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeNotes(value, now = Date.now()) {
  return parseArray(value)
    .map((note, index) => {
      const text = cleanText(note?.text, 10_000);
      if (!text) return null;
      const createdAt = finiteTimestamp(note?.createdAt, now + index);
      const updatedAt = finiteTimestamp(note?.updatedAt, createdAt);
      return {
        id: cleanText(note?.id, 180) || `restored-note-${createdAt}-${index}`,
        title: cleanText(note?.title, 72) || text.split(/\r?\n/u)[0].slice(0, 72),
        text,
        source: cleanText(note?.source, 120) || "Persönliches Holo",
        createdAt,
        updatedAt
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, 250);
}

export function normalizePendingDialogs(value) {
  return parseArray(value)
    .map((dialog) => {
      const sourceEventId = cleanText(dialog?.sourceEventId, 160);
      if (!/^[a-zA-Z0-9:_-]{16,160}$/u.test(sourceEventId)) return null;
      const messages = (Array.isArray(dialog?.messages) ? dialog.messages : [])
        .slice(0, 8)
        .map((message) => ({
          role: message?.role === "assistant" ? "assistant" : "user",
          content: String(message?.content ?? "").slice(0, 8_000)
        }))
        .filter((message) => message.content.trim());
      return messages.length ? { sourceEventId, messages } : null;
    })
    .filter(Boolean)
    .slice(-200);
}

function readStorage(storage, key) {
  try {
    return storage?.getItem?.(key) ?? null;
  } catch {
    return null;
  }
}

export function createBackupSnapshot(storage, now = new Date()) {
  const createdAt = new Date(now);
  if (Number.isNaN(createdAt.getTime())) {
    throw new Error("Der Sicherungszeitpunkt ist ungültig.");
  }

  const notes = normalizeNotes(readStorage(storage, BACKUP_STORAGE_KEYS.notes));
  const pendingDialogs = normalizePendingDialogs(
    readStorage(storage, BACKUP_STORAGE_KEYS.pendingDialogs)
  );
  const selectedVoice = cleanText(
    readStorage(storage, BACKUP_STORAGE_KEYS.selectedVoice),
    40
  ).toLowerCase();
  const introSeen = readStorage(storage, BACKUP_STORAGE_KEYS.introSeen) === "1";

  return {
    format: "sol-holo-local-data",
    version: 1,
    ownerId: BACKUP_OWNER_ID,
    packageName: BACKUP_PACKAGE_NAME,
    createdAt: createdAt.toISOString(),
    data: {
      notes,
      pendingDialogs,
      preferences: {
        introSeen,
        selectedVoice: ALLOWED_VOICES.has(selectedVoice)
          ? selectedVoice
          : "coral"
      }
    },
    exclusions: [...EXCLUDED_BACKUP_CATEGORIES]
  };
}

export function validateBackupSnapshot(snapshot) {
  if (
    snapshot?.format !== "sol-holo-local-data" ||
    snapshot?.version !== 1 ||
    snapshot?.ownerId !== BACKUP_OWNER_ID ||
    snapshot?.packageName !== BACKUP_PACKAGE_NAME
  ) {
    throw new Error("Diese Datei gehört nicht zu Pams fest gebundener Holo-Instanz.");
  }

  const createdAt = new Date(snapshot.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    throw new Error("Die Sicherungsdatei enthält keinen gültigen Zeitpunkt.");
  }

  return {
    ...snapshot,
    createdAt: createdAt.toISOString(),
    data: {
      notes: normalizeNotes(snapshot.data?.notes),
      pendingDialogs: normalizePendingDialogs(snapshot.data?.pendingDialogs),
      preferences: {
        introSeen: snapshot.data?.preferences?.introSeen === true,
        selectedVoice: ALLOWED_VOICES.has(
          cleanText(snapshot.data?.preferences?.selectedVoice, 40).toLowerCase()
        )
          ? cleanText(snapshot.data?.preferences?.selectedVoice, 40).toLowerCase()
          : "coral"
      }
    },
    exclusions: [...EXCLUDED_BACKUP_CATEGORIES]
  };
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  let binary;
  try {
    binary = atob(String(value || ""));
  } catch {
    throw new Error("Die Sicherungsdatei ist beschädigt.");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function associatedData(iterations) {
  return TEXT_ENCODER.encode(
    `${BACKUP_FORMAT}:${BACKUP_VERSION}:PBKDF2-SHA-256:${iterations}:AES-GCM-256`
  );
}

async function deriveKey(password, salt, iterations, api) {
  const material = await api.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return api.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function validatePassword(password) {
  const cleanPassword = String(password || "");
  if (cleanPassword.length < BACKUP_MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Das Sicherungspasswort braucht mindestens ${BACKUP_MIN_PASSWORD_LENGTH} Zeichen.`
    );
  }
  return cleanPassword;
}

export async function encryptBackup(snapshot, password, cryptoOverride) {
  const api = cryptoApi(cryptoOverride);
  const cleanPassword = validatePassword(password);
  const validated = validateBackupSnapshot(snapshot);
  const plaintext = TEXT_ENCODER.encode(JSON.stringify(validated));
  if (plaintext.byteLength > BACKUP_MAX_BYTES) {
    throw new Error("Die lokale Sicherung ist größer als 12 MB.");
  }

  const salt = api.getRandomValues(new Uint8Array(16));
  const iv = api.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(
    cleanPassword,
    salt,
    BACKUP_KDF_ITERATIONS,
    api
  );
  const ciphertext = new Uint8Array(await api.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: associatedData(BACKUP_KDF_ITERATIONS),
      tagLength: 128
    },
    key,
    plaintext
  ));

  const serialized = JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    crypto: {
      cipher: "AES-GCM-256",
      kdf: "PBKDF2",
      hash: "SHA-256",
      iterations: BACKUP_KDF_ITERATIONS,
      saltBase64: bytesToBase64(salt),
      ivBase64: bytesToBase64(iv)
    },
    ciphertextBase64: bytesToBase64(ciphertext)
  });
  if (TEXT_ENCODER.encode(serialized).byteLength > BACKUP_MAX_BYTES) {
    throw new Error("Die verschlüsselte Sicherungsdatei ist größer als 12 MB.");
  }
  return serialized;
}

export async function decryptBackup(serializedEnvelope, password, cryptoOverride) {
  const api = cryptoApi(cryptoOverride);
  const cleanPassword = validatePassword(password);
  const text = String(serializedEnvelope || "");
  if (!text || TEXT_ENCODER.encode(text).byteLength > BACKUP_MAX_BYTES) {
    throw new Error("Die Sicherungsdatei ist leer oder größer als 12 MB.");
  }

  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new Error("Die ausgewählte Datei ist keine Sol-Holo-Sicherung.");
  }

  const iterations = Number(envelope?.crypto?.iterations);
  if (
    envelope?.format !== BACKUP_FORMAT ||
    envelope?.version !== BACKUP_VERSION ||
    envelope?.crypto?.cipher !== "AES-GCM-256" ||
    envelope?.crypto?.kdf !== "PBKDF2" ||
    envelope?.crypto?.hash !== "SHA-256" ||
    iterations !== BACKUP_KDF_ITERATIONS
  ) {
    throw new Error("Format oder Verschlüsselung dieser Sicherung ist ungültig.");
  }

  const salt = base64ToBytes(envelope.crypto.saltBase64);
  const iv = base64ToBytes(envelope.crypto.ivBase64);
  const ciphertext = base64ToBytes(envelope.ciphertextBase64);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 17) {
    throw new Error("Die Sicherungsdatei ist unvollständig.");
  }

  try {
    const key = await deriveKey(cleanPassword, salt, iterations, api);
    const plaintext = await api.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: associatedData(iterations),
        tagLength: 128
      },
      key,
      ciphertext
    );
    return validateBackupSnapshot(JSON.parse(TEXT_DECODER.decode(plaintext)));
  } catch (error) {
    if (error?.message?.includes("Pams fest gebundener")) throw error;
    throw new Error("Passwort falsch oder Sicherungsdatei verändert.");
  }
}

function mergeNotes(currentNotes, backupNotes) {
  const merged = new Map();
  for (const note of normalizeNotes(currentNotes)) merged.set(note.id, note);
  let added = 0;
  let updated = 0;
  for (const note of normalizeNotes(backupNotes)) {
    const current = merged.get(note.id);
    if (!current) {
      if (merged.size < 250) {
        merged.set(note.id, note);
        added += 1;
      }
    } else if (note.updatedAt > current.updatedAt) {
      merged.set(note.id, note);
      updated += 1;
    }
  }
  return {
    values: [...merged.values()]
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, 250),
    added,
    updated,
    skipped: Math.max(0, normalizeNotes(backupNotes).length - added - updated)
  };
}

function mergePendingDialogs(currentDialogs, backupDialogs) {
  const current = normalizePendingDialogs(currentDialogs);
  const merged = new Map(current.map((dialog) => [dialog.sourceEventId, dialog]));
  let added = 0;
  for (const dialog of normalizePendingDialogs(backupDialogs)) {
    if (!merged.has(dialog.sourceEventId) && merged.size < 200) {
      merged.set(dialog.sourceEventId, dialog);
      added += 1;
    }
  }
  return {
    values: [...merged.values()].slice(-200),
    added,
    skipped: Math.max(0, normalizePendingDialogs(backupDialogs).length - added)
  };
}

export function planBackupRestore(storage, snapshot) {
  const validated = validateBackupSnapshot(snapshot);
  const notes = mergeNotes(
    readStorage(storage, BACKUP_STORAGE_KEYS.notes),
    validated.data.notes
  );
  const pendingDialogs = mergePendingDialogs(
    readStorage(storage, BACKUP_STORAGE_KEYS.pendingDialogs),
    validated.data.pendingDialogs
  );
  const writes = new Map();
  if (notes.values.length) {
    writes.set(BACKUP_STORAGE_KEYS.notes, JSON.stringify(notes.values));
  }
  if (pendingDialogs.values.length) {
    writes.set(
      BACKUP_STORAGE_KEYS.pendingDialogs,
      JSON.stringify(pendingDialogs.values)
    );
  }
  writes.set(
    BACKUP_STORAGE_KEYS.selectedVoice,
    validated.data.preferences.selectedVoice
  );
  writes.set(
    BACKUP_STORAGE_KEYS.introSeen,
    validated.data.preferences.introSeen ? "1" : "0"
  );

  return {
    ownerId: validated.ownerId,
    createdAt: validated.createdAt,
    writes,
    summary: {
      notesAdded: notes.added,
      notesUpdated: notes.updated,
      notesSkipped: notes.skipped,
      pendingAdded: pendingDialogs.added,
      pendingSkipped: pendingDialogs.skipped,
      settingsRestored: 2
    }
  };
}

export function applyBackupRestore(storage, plan) {
  if (plan?.ownerId !== BACKUP_OWNER_ID || !(plan?.writes instanceof Map)) {
    throw new Error("Der Wiederherstellungsplan ist ungültig.");
  }
  const previous = new Map();
  for (const [key] of plan.writes) {
    if (!Object.values(BACKUP_STORAGE_KEYS).includes(key)) {
      throw new Error("Die Sicherung versucht einen nicht erlaubten Speicher zu ändern.");
    }
    previous.set(key, storage.getItem(key));
  }
  try {
    for (const [key, value] of plan.writes) {
      storage.setItem(key, value);
    }
  } catch (error) {
    for (const [key, value] of previous) {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    }
    throw new Error("Die lokale Wiederherstellung wurde sicher zurückgerollt.", {
      cause: error
    });
  }
  return { ...plan.summary };
}

export function backupFileName(now = new Date()) {
  const date = new Date(now);
  const pad = (value) => String(value).padStart(2, "0");
  return `Pams-Holo-Sicherung-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.solholo-backup`;
}
