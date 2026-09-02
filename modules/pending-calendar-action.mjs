const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_PENDING = 500;

function cleanPart(value, label) {
  const text = String(value || "").trim();
  if (!text || text.length > 160) {
    throw new TypeError(`${label} is required.`);
  }
  return text;
}

function pendingKey({ ownerId, speakerId, conversationId }) {
  return [
    cleanPart(ownerId, "ownerId"),
    cleanPart(speakerId, "speakerId"),
    cleanPart(conversationId, "conversationId")
  ].join("\u0000");
}

export function isCalendarConfirmation(message) {
  const text = String(message || "")
    .trim()
    .replace(/^(?:(?:hey\s+)?sol)\s*[,;:!.-]?\s*/iu, "")
    .trim();
  return /^(?:ja\s*[,;-]?\s*)?(?:(?:bitte\s+)?trag(?:e|t)?(?:\s+bitte)?\s+ein|(?:bitte\s+)?(?:eintragen|anlegen|speichern)(?:\s+bitte)?)[.!?]*$/iu
    .test(text);
}

export function isCalendarCancellation(message) {
  return /^(?:nein\s*[,;-]?\s*)?(?:abbrechen|abbruch|doch\s+nicht|nicht\s+eintragen|nicht\s+speichern)[.!?]*$/iu
    .test(String(message || "").trim());
}

export function createPendingCalendarActionStore({
  now = () => Date.now(),
  ttlMs = DEFAULT_TTL_MS,
  maxPending = DEFAULT_MAX_PENDING
} = {}) {
  const entries = new Map();

  function cleanup() {
    const current = now();
    for (const [key, entry] of entries) {
      if (entry.expiresAtMillis <= current) {
        entries.delete(key);
      }
    }
    while (entries.size > maxPending) {
      entries.delete(entries.keys().next().value);
    }
  }

  function remember(scope, { parsed, originalMessage }) {
    cleanup();
    if (
      parsed?.action !== "create" ||
      !String(parsed?.summary || "").trim() ||
      !String(parsed?.start || "").trim() ||
      !String(parsed?.end || "").trim()
    ) {
      throw new TypeError("A complete parsed calendar action is required.");
    }
    const createdAtMillis = now();
    const entry = Object.freeze({
      parsed: Object.freeze({ ...parsed }),
      originalMessage: String(originalMessage || "").trim(),
      createdAtMillis,
      expiresAtMillis: createdAtMillis + ttlMs
    });
    entries.set(pendingKey(scope), entry);
    return entry;
  }

  function peek(scope) {
    cleanup();
    return entries.get(pendingKey(scope)) || null;
  }

  function clear(scope) {
    cleanup();
    return entries.delete(pendingKey(scope));
  }

  return Object.freeze({
    remember,
    peek,
    clear
  });
}
