import test from "node:test";
import assert from "node:assert/strict";

import {
  MEMORY_DECISION,
  evaluateIdentityMemoryWrite,
  extractExplicitMemoryRequest,
  getLegacyOwnerScope,
  resolveCanonicalOwnerId,
  resolveMemoryIdentity,
  toSafeIdentityMemoryAuditEvent
} from "../modules/identity-memory.mjs";
import {
  IdentityMemoryStoreError,
  createIdentityMemoryStore
} from "../modules/identity-memory-store.mjs";
import {
  ConversationContextError,
  buildIdentityRequiredPayload,
  createVolatileConversationStore
} from "../modules/identity-memory-runtime.mjs";

function directMemoryInput(overrides = {}) {
  return {
    source: "text",
    role: "user",
    selectedSpeakerId: "pam",
    content: "Sol, merke dir dauerhaft: Die Sonnenblume ist unser Testwort.",
    ...overrides
  };
}

function createRecordingDatabase() {
  const calls = [];
  let nextId = 1;

  return {
    calls,
    async query(sql, parameters = []) {
      calls.push({ sql, parameters });

      if (/INSERT INTO sol_identity_memory/u.test(sql)) {
        return {
          rows: [
            {
              id: nextId++,
              canonical_owner_id: parameters[0],
              speaker_id: parameters[1],
              source_type: parameters[3],
              recall_status: "active"
            }
          ]
        };
      }

      return { rows: [] };
    }
  };
}

test("Legacy-Owner-ID pam-sol-001 wird sicher auf pam-sol abgebildet", () => {
  assert.equal(resolveCanonicalOwnerId("pam-sol-001"), "pam-sol");
  assert.deepEqual(
    getLegacyOwnerScope("pam-sol-001"),
    ["pam-sol", "pam-sol-001"]
  );
});

test("direkter Speicherbefehl wird eng und ohne Inhaltsinferenz erkannt", () => {
  assert.deepEqual(
    extractExplicitMemoryRequest(
      "Sol, merke dir dauerhaft: Die Sonnenblume ist unser Testwort."
    ),
    {
      requested: true,
      content: "Die Sonnenblume ist unser Testwort.",
      confirmationMethod: "direct_memory_command"
    }
  );

  assert.equal(
    extractExplicitMemoryRequest(
      "Steffi hat gesagt, dass Pam etwas speichern wollte."
    ).requested,
    false
  );
});

test("normale Nachrichten werden nicht automatisch dauerhaft gespeichert", () => {
  const decision = evaluateIdentityMemoryWrite({
    source: "text",
    selectedSpeakerId: "pam",
    content: "Heute scheint die Sonne."
  });

  assert.equal(decision.kind, MEMORY_DECISION.IGNORE);
  assert.equal(decision.persist, false);
  assert.equal(decision.speakerId, "pam");
  assert.equal(decision.ownerId, "pam-sol");
});

test("auch eine normale Nachricht ohne Sprecherzuordnung fragt Pam oder Steffi", () => {
  const decision = evaluateIdentityMemoryWrite({
    source: "text",
    content: "Heute scheint die Sonne."
  });

  assert.equal(decision.kind, MEMORY_DECISION.CLARIFY_IDENTITY);
  assert.equal(decision.persist, false);
  assert.equal(decision.prompt, "Spricht gerade Pam oder Steffi?");
});

test("unklare Sprecheridentitaet loest Pam-oder-Steffi-Abfrage aus", () => {
  const decision = evaluateIdentityMemoryWrite({
    source: "voice",
    transcript: "Sol, merke dir dauerhaft: Sonnenblume."
  });

  assert.equal(decision.kind, MEMORY_DECISION.CLARIFY_IDENTITY);
  assert.equal(decision.persist, false);
  assert.equal(decision.prompt, "Spricht gerade Pam oder Steffi?");
  assert.deepEqual(
    decision.choices.map(({ speakerId }) => speakerId),
    ["pam", "steffi"]
  );
});

test("Sprecherwahl und verifizierte Stimme duerfen sich nicht widersprechen", () => {
  const decision = evaluateIdentityMemoryWrite(
    directMemoryInput({
      source: "voice",
      selectedSpeakerId: "pam",
      verifiedSpeakerId: "steffi"
    })
  );

  assert.equal(decision.kind, MEMORY_DECISION.IDENTITY_CONFLICT);
  assert.equal(decision.persist, false);
  assert.equal(decision.prompt, "Spricht gerade Pam oder Steffi?");
});

test("Sprecher und angeforderter Owner muessen zusammenpassen", () => {
  const decision = evaluateIdentityMemoryWrite(
    directMemoryInput({ ownerId: "steffi-sol" })
  );

  assert.equal(decision.kind, MEMORY_DECISION.IDENTITY_CONFLICT);
  assert.equal(decision.persist, false);
});

test("Text und Sprachtranskript benutzen dieselbe Speicherregel", () => {
  const content =
    "Sol, merke dir dauerhaft: Die Sonnenblume ist unser Testwort.";
  const textDecision = evaluateIdentityMemoryWrite({
    source: "text",
    selectedSpeakerId: "pam",
    content
  });
  const voiceDecision = evaluateIdentityMemoryWrite({
    source: "voice",
    verifiedSpeakerId: "pam",
    transcript: content
  });

  assert.equal(textDecision.kind, MEMORY_DECISION.PERSIST);
  assert.equal(voiceDecision.kind, MEMORY_DECISION.PERSIST);
  assert.deepEqual(
    {
      ...textDecision.memory,
      sourceType: null
    },
    {
      ...voiceDecision.memory,
      sourceType: null
    }
  );
  assert.equal(textDecision.memory.sourceType, "text");
  assert.equal(voiceDecision.memory.sourceType, "voice");
});

test("zweistufige Speicherung verlangt ausdrueckliche Bestaetigung derselben Person", () => {
  const waiting = evaluateIdentityMemoryWrite({
    source: "text",
    selectedSpeakerId: "pam",
    intent: "remember",
    memoryContent: "Die Sonnenblume ist unser Testwort."
  });

  assert.equal(waiting.kind, MEMORY_DECISION.REQUIRE_CONFIRMATION);
  assert.equal(waiting.persist, false);

  const confirmed = evaluateIdentityMemoryWrite({
    source: "text",
    selectedSpeakerId: "pam",
    intent: "remember",
    memoryContent: "Die Sonnenblume ist unser Testwort.",
    confirmation: {
      confirmed: true,
      confirmedBy: "pam",
      method: "confirmation_dialog"
    }
  });

  assert.equal(confirmed.kind, MEMORY_DECISION.PERSIST);
  assert.equal(confirmed.memory.confirmedBy, "pam");
  assert.equal(confirmed.memory.confirmationMethod, "confirmation_dialog");

  const wrongPerson = evaluateIdentityMemoryWrite({
    source: "text",
    selectedSpeakerId: "pam",
    intent: "remember",
    memoryContent: "Die Sonnenblume ist unser Testwort.",
    confirmation: {
      confirmed: true,
      confirmedBy: "steffi"
    }
  });

  assert.equal(wrongPerson.kind, MEMORY_DECISION.IDENTITY_CONFLICT);
  assert.equal(wrongPerson.persist, false);
});

test("Pam- und Steffi-Erinnerungen erhalten strikt verschiedene Owner", () => {
  const commonMemory =
    "Sol, merke dir dauerhaft: Unser gemeinsamer Ausflug war am See.";
  const pam = evaluateIdentityMemoryWrite(
    directMemoryInput({ content: commonMemory })
  );
  const steffi = evaluateIdentityMemoryWrite(
    directMemoryInput({
      selectedSpeakerId: "steffi",
      content: commonMemory
    })
  );

  assert.equal(pam.memory.ownerId, "pam-sol");
  assert.equal(steffi.memory.ownerId, "steffi-sol");
  assert.notEqual(pam.memory.ownerId, steffi.memory.ownerId);
  assert.equal(pam.memory.content, steffi.memory.content);
  assert.equal(pam.memory.confirmedBy, "pam");
  assert.equal(steffi.memory.confirmedBy, "steffi");
});

test("Identitaet wird nicht aus Namen im Inhalt geraten", () => {
  const resolution = resolveMemoryIdentity({
    content: "Pam und Steffi stehen beide in diesem Satz."
  });

  assert.equal(resolution.kind, MEMORY_DECISION.CLARIFY_IDENTITY);
});

test("Audit-Ereignis enthaelt keine Gesundheits- oder Einwilligungsinhalte", () => {
  const privateContent =
    "Sol, merke dir dauerhaft: PRIVATE_GESUNDHEIT_UND_EINWILLIGUNG.";
  const decision = evaluateIdentityMemoryWrite(
    directMemoryInput({ content: privateContent })
  );
  const audit = toSafeIdentityMemoryAuditEvent(decision);
  const serialized = JSON.stringify(audit);

  assert.equal(audit.contentLogged, false);
  assert.equal(serialized.includes("PRIVATE_GESUNDHEIT"), false);
  assert.equal(serialized.includes("EINWILLIGUNG"), false);
});

test("Store legt nur additive Tabellen/Indizes an und veraendert Legacy-Daten nicht", async () => {
  const database = createRecordingDatabase();
  const store = createIdentityMemoryStore({ database });

  await store.initialize();

  const schemaSql = database.calls.map(({ sql }) => sql).join("\n");
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS sol_identity_memory/u);
  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS/u);
  assert.doesNotMatch(schemaSql, /\b(?:DROP|DELETE|TRUNCATE|ALTER)\b/iu);
});

test("Store verweigert jeden Write ohne positive Policy-Entscheidung", async () => {
  const database = createRecordingDatabase();
  const auditEvents = [];
  const store = createIdentityMemoryStore({
    database,
    audit: async (event) => auditEvents.push(event)
  });
  const ignored = evaluateIdentityMemoryWrite({
    source: "text",
    selectedSpeakerId: "pam",
    content: "Nur eine normale Nachricht."
  });

  await assert.rejects(
    store.saveConfirmed(ignored),
    (error) =>
      error instanceof IdentityMemoryStoreError &&
      error.code === "WRITE_NOT_CONFIRMED"
  );

  assert.equal(
    database.calls.some(({ sql }) => /INSERT INTO sol_identity_memory/u.test(sql)),
    false
  );
  assert.equal(auditEvents[0].contentLogged, false);
});

test("Store schreibt bestaetigte Inhalte kanonisch und liest owner-scoped", async () => {
  const database = createRecordingDatabase();
  const store = createIdentityMemoryStore({ database });
  const decision = evaluateIdentityMemoryWrite(
    directMemoryInput({ ownerId: "pam-sol-001" })
  );

  const saved = await store.saveConfirmed(decision);
  assert.equal(saved.canonical_owner_id, "pam-sol");

  const insertCall = database.calls.find(({ sql }) =>
    /INSERT INTO sol_identity_memory/u.test(sql)
  );
  assert.equal(insertCall.parameters[0], "pam-sol");
  assert.equal(insertCall.parameters[4], "Die Sonnenblume ist unser Testwort.");

  await store.listConfirmed({
    ownerId: "pam-sol-001",
    speakerId: "pam"
  });
  const listCall = database.calls.at(-1);
  assert.match(listCall.sql, /WHERE canonical_owner_id = \$1/u);
  assert.equal(listCall.parameters[0], "pam-sol");
  assert.match(listCall.sql, /confirmed IS TRUE/u);
});

test("Fehler eines optionalen Audits veraendern einen bestaetigten Write nicht", async () => {
  const database = createRecordingDatabase();
  const store = createIdentityMemoryStore({
    database,
    audit: async () => {
      throw new Error("Audit nicht verfuegbar");
    }
  });
  const decision = evaluateIdentityMemoryWrite(directMemoryInput());

  const saved = await store.saveConfirmed(decision);

  assert.equal(saved.canonical_owner_id, "pam-sol");
  assert.equal(
    database.calls.filter(({ sql }) =>
      /INSERT INTO sol_identity_memory/u.test(sql)
    ).length,
    1
  );
});

test("Store blockiert einen Pam-/Steffi-Cross-Owner-Abruf vor der Datenbank", async () => {
  const database = createRecordingDatabase();
  const store = createIdentityMemoryStore({ database });

  await assert.rejects(
    store.listConfirmed({
      ownerId: "steffi-sol",
      speakerId: "pam"
    }),
    (error) =>
      error instanceof IdentityMemoryStoreError &&
      error.code === "OWNER_ACCESS_MISMATCH"
  );

  assert.equal(database.calls.length, 0);
});

test("owner-scoped Suche und Vergessen verwenden nur parametrisierte neue Tabelle", async () => {
  const database = createRecordingDatabase();
  const store = createIdentityMemoryStore({ database });

  await store.searchConfirmed({
    ownerId: "pam-sol-001",
    speakerId: "pam",
    searchText: "unser Testwort"
  });
  const searchCall = database.calls.at(-1);
  assert.match(searchCall.sql, /FROM sol_identity_memory/u);
  assert.match(searchCall.sql, /canonical_owner_id = \$1/u);
  assert.equal(searchCall.parameters[0], "pam-sol");
  assert.equal(searchCall.parameters[1], "unser Testwort");

  await store.blockConfirmed({
    ownerId: "pam-sol",
    speakerId: "pam",
    searchText: "Sonnenblume"
  });
  const blockCall = database.calls.at(-1);
  assert.match(blockCall.sql, /UPDATE sol_identity_memory/u);
  assert.match(blockCall.sql, /canonical_owner_id = \$1/u);
  assert.equal(blockCall.parameters[0], "pam-sol");
  assert.equal(blockCall.parameters[1], "pam");
  assert.equal(blockCall.parameters[2], "%Sonnenblume%");
});

test("fluechtiger Kontext ist zufaellig, begrenzt und Owner-gebunden", () => {
  let currentTime = 1000;
  let idCounter = 0;
  const context = createVolatileConversationStore({
    now: () => currentTime,
    createId: () => `server-id-${++idCounter}`,
    ttlMs: 1000,
    maxMessages: 2
  });
  const clientUuid = "cc8dd6d4-ef72-4e5b-9f15-64f79ba44c35";
  const opened = context.open({
    conversationId: clientUuid,
    ownerId: "pam-sol",
    speakerId: "pam"
  });

  assert.equal(opened.conversationId, clientUuid);
  context.append({
    conversationId: opened.conversationId,
    ownerId: "pam-sol",
    speakerId: "pam",
    role: "user",
    content: "eins"
  });
  context.append({
    conversationId: opened.conversationId,
    ownerId: "pam-sol",
    speakerId: "pam",
    role: "assistant",
    content: "zwei"
  });
  context.append({
    conversationId: opened.conversationId,
    ownerId: "pam-sol",
    speakerId: "pam",
    role: "user",
    content: "drei"
  });

  assert.deepEqual(
    context.get({
      conversationId: opened.conversationId,
      ownerId: "pam-sol",
      speakerId: "pam"
    }).map(({ content }) => content),
    ["zwei", "drei"]
  );

  assert.throws(
    () => context.get({
      conversationId: opened.conversationId,
      ownerId: "steffi-sol",
      speakerId: "steffi"
    }),
    (error) =>
      error instanceof ConversationContextError &&
      error.code === "CONVERSATION_IDENTITY_MISMATCH"
  );

  currentTime += 1001;
  assert.equal(context.size(), 0);
});

test("Identity-Rueckfrage hat ein stabiles, inhaltsfreies API-Schema", () => {
  const decision = evaluateIdentityMemoryWrite({
    source: "text",
    content: "PRIVATE_INHALT"
  });
  const payload = buildIdentityRequiredPayload(decision);

  assert.deepEqual(payload, {
    error: "identity_required",
    code: "IDENTITY_REQUIRED",
    identityRequired: true,
    question: "Spricht gerade Pam oder Steffi?",
    choices: [
      { speakerId: "pam", displayName: "Pam" },
      { speakerId: "steffi", displayName: "Steffi" }
    ],
    persisted: false
  });
  assert.equal(JSON.stringify(payload).includes("PRIVATE_INHALT"), false);
});
