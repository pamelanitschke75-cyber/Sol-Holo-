import { randomUUID } from "node:crypto";

export class ConversationContextError extends Error {
  constructor(code) {
    super("Der fluechtige Gespraechskontext wurde abgelehnt.");
    this.name = "ConversationContextError";
    this.code = code;
  }
}

function cleanKey(value) {
  return String(value ?? "").normalize("NFKC").trim();
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, minimum), maximum);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value
  );
}

/**
 * Kurzlebiger RAM-Kontext fuer Gespraechsfluss ohne Datenbank-Write.
 *
 * - zufaellige serverseitige conversationId
 * - strikt an speakerId + ownerId gebunden
 * - TTL, Nachrichtenlimit und Gesamtzahlbegrenzung
 * - kein Logger und keine Serialisierung auf Datentraeger
 */
export function createVolatileConversationStore({
  now = () => Date.now(),
  createId = () => randomUUID(),
  ttlMs = 30 * 60 * 1000,
  maxConversations = 500,
  maxMessages = 24,
  maxContentChars = 6000
} = {}) {
  const conversations = new Map();
  const safeTtlMs = boundedInteger(ttlMs, 30 * 60 * 1000, 1000, 24 * 60 * 60 * 1000);
  const safeMaxConversations = boundedInteger(maxConversations, 500, 1, 5000);
  const safeMaxMessages = boundedInteger(maxMessages, 24, 2, 100);
  const safeMaxContentChars = boundedInteger(maxContentChars, 6000, 100, 20000);

  function cleanup() {
    const currentTime = now();

    for (const [conversationId, conversation] of conversations.entries()) {
      if (conversation.expiresAt <= currentTime) {
        conversations.delete(conversationId);
      }
    }
  }

  function assertIdentity(ownerId, speakerId) {
    const cleanOwnerId = cleanKey(ownerId).toLocaleLowerCase("de-DE");
    const cleanSpeakerId = cleanKey(speakerId).toLocaleLowerCase("de-DE");

    if (!cleanOwnerId || !cleanSpeakerId) {
      throw new ConversationContextError("IDENTITY_REQUIRED");
    }

    return { ownerId: cleanOwnerId, speakerId: cleanSpeakerId };
  }

  function requireConversation(conversationId, ownerId, speakerId) {
    cleanup();
    const cleanConversationId = cleanKey(conversationId);
    const identity = assertIdentity(ownerId, speakerId);
    const conversation = conversations.get(cleanConversationId);

    if (!conversation) {
      throw new ConversationContextError("CONVERSATION_NOT_FOUND");
    }

    if (
      conversation.ownerId !== identity.ownerId ||
      conversation.speakerId !== identity.speakerId
    ) {
      throw new ConversationContextError("CONVERSATION_IDENTITY_MISMATCH");
    }

    conversation.lastAccessAt = now();
    conversation.expiresAt = conversation.lastAccessAt + safeTtlMs;
    return conversation;
  }

  function evictOldestIfNeeded() {
    while (conversations.size >= safeMaxConversations) {
      let oldestId = null;
      let oldestAccess = Number.POSITIVE_INFINITY;

      for (const [conversationId, conversation] of conversations.entries()) {
        if (conversation.lastAccessAt < oldestAccess) {
          oldestAccess = conversation.lastAccessAt;
          oldestId = conversationId;
        }
      }

      if (!oldestId) {
        break;
      }

      conversations.delete(oldestId);
    }
  }

  return Object.freeze({
    open({ conversationId, ownerId, speakerId }) {
      cleanup();
      const identity = assertIdentity(ownerId, speakerId);
      const requestedId = cleanKey(conversationId);

      if (requestedId && conversations.has(requestedId)) {
        requireConversation(
          requestedId,
          identity.ownerId,
          identity.speakerId
        );
        return { conversationId: requestedId, created: false };
      }

      // Eine kryptografisch zufaellige UUID des Clients darf den fluechtigen
      // Browser-/App-Dialog stabil halten. Freie oder vorhersehbare IDs werden
      // nie uebernommen, sondern serverseitig ersetzt.
      evictOldestIfNeeded();

      let generatedId = isUuid(requestedId)
        ? requestedId
        : cleanKey(createId());
      while (!generatedId || conversations.has(generatedId)) {
        generatedId = cleanKey(createId());
      }

      const currentTime = now();
      conversations.set(generatedId, {
        ownerId: identity.ownerId,
        speakerId: identity.speakerId,
        messages: [],
        lastAccessAt: currentTime,
        expiresAt: currentTime + safeTtlMs
      });

      return { conversationId: generatedId, created: true };
    },

    append({ conversationId, ownerId, speakerId, role, content }) {
      const conversation = requireConversation(
        conversationId,
        ownerId,
        speakerId
      );
      const cleanRole = cleanKey(role).toLocaleLowerCase("de-DE");
      const cleanContent = String(content ?? "").trim();

      if (!["user", "assistant"].includes(cleanRole)) {
        throw new ConversationContextError("INVALID_ROLE");
      }

      if (!cleanContent) {
        return false;
      }

      conversation.messages.push({
        role: cleanRole,
        content: cleanContent.slice(0, safeMaxContentChars)
      });

      if (conversation.messages.length > safeMaxMessages) {
        conversation.messages.splice(
          0,
          conversation.messages.length - safeMaxMessages
        );
      }

      return true;
    },

    get({ conversationId, ownerId, speakerId }) {
      const conversation = requireConversation(
        conversationId,
        ownerId,
        speakerId
      );

      return conversation.messages.map((message) => ({ ...message }));
    },

    cleanup,

    size() {
      cleanup();
      return conversations.size;
    }
  });
}

export function buildIdentityRequiredPayload(decision) {
  const conflict = decision?.kind === "identity_conflict";

  return {
    error: conflict ? "identity_conflict" : "identity_required",
    code: conflict ? "IDENTITY_CONFLICT" : "IDENTITY_REQUIRED",
    identityRequired: true,
    question: decision?.prompt || "Spricht gerade Pam oder Steffi?",
    choices: Array.isArray(decision?.choices)
      ? decision.choices.map(({ speakerId, displayName }) => ({
          speakerId,
          displayName
        }))
      : [
          { speakerId: "pam", displayName: "Pam" },
          { speakerId: "steffi", displayName: "Steffi" }
        ],
    persisted: false
  };
}
