import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createPendingCalendarActionStore,
  isCalendarCancellation,
  isCalendarConfirmation
} from "../modules/pending-calendar-action.mjs";

const scope = {
  ownerId: "pam-sol",
  speakerId: "pam",
  conversationId: "conversation-1"
};

const parsed = {
  action: "create",
  summary: "Arzttermin",
  start: "2026-09-03T10:00:00+02:00",
  end: "2026-09-03T10:30:00+02:00",
  reminderMinutes: 30
};

test("natural confirmation phrases all confirm the same prepared event", () => {
  for (const phrase of [
    "Ja, eintragen",
    "Sol, bitte trag ein",
    "Sol trag ein",
    "Sol tragt ein",
    "Bitte speichern"
  ]) {
    assert.equal(isCalendarConfirmation(phrase), true, phrase);
  }
  assert.equal(isCalendarConfirmation("Trag morgen Zahnarzt ein"), false);
  assert.equal(isCalendarConfirmation("Ja"), false);
});

test("pending events stay owner, speaker and conversation scoped", () => {
  let currentTime = 1000;
  const store = createPendingCalendarActionStore({
    now: () => currentTime,
    ttlMs: 100
  });
  store.remember(scope, {
    parsed,
    originalMessage: "Trag morgen um 10 Uhr Arzttermin ein"
  });
  assert.equal(store.peek(scope)?.parsed.summary, "Arzttermin");
  assert.equal(
    store.peek({ ...scope, conversationId: "conversation-2" }),
    null
  );
  assert.equal(
    store.peek({ ...scope, ownerId: "steffi-sol" }),
    null
  );
  currentTime = 1101;
  assert.equal(store.peek(scope), null);
});

test("cancellation language is explicit", () => {
  assert.equal(isCalendarCancellation("Abbrechen"), true);
  assert.equal(isCalendarCancellation("Nein, nicht eintragen"), true);
  assert.equal(isCalendarCancellation("Nein"), false);
});

test("the calendar command is the approval and only the trusted app binding may be requested", async () => {
  const server = await readFile(
    new URL("../server.mjs", import.meta.url),
    "utf8"
  );
  const handler = server.slice(
    server.indexOf("async function handleCalendarWriteRequest"),
    server.indexOf(
      "\n/*\n  ==========================================================\n  VOICE SETUP",
      server.indexOf("async function handleCalendarWriteRequest")
    )
  );
  assert.ok(handler.length > 0);
  assert.ok(
    handler.indexOf("pendingCalendarActions.remember") <
      handler.indexOf("if (!trustedAppSession)")
  );
  assert.doesNotMatch(handler, /confirmationRequired: true/u);
  assert.match(handler, /dein ausdrücklicher Kalenderauftrag gilt bereits als Freigabe/u);
  assert.match(handler, /pendingCalendarActions\.peek\(scope\)/u);
  assert.match(handler, /needsTrustedAppSession: true/u);
  assert.match(handler, /return commitCalendarAction/u);
  assert.match(server, /Google Calendar hat bestätigt/u);
  assert.doesNotMatch(handler, /parseCalendarCommand\(\s*message[\s\S]*isCalendarConfirmation/u);
});
