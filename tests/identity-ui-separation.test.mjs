import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Pam und Steffi besitzen getrennte lokale Notiz-, Bild- und Mundspeicher", async () => {
  const ui = await source("www/sol-holo-ui.js");

  for (const key of [
    "pams-holo-original-notes-v1",
    "steffis-holo-original-notes-v1",
    "sol-holo-clone-photo-v1",
    "steffis-holo-clone-photo-v1",
    "sol-holo-clone-mouth-v1",
    "steffis-holo-clone-mouth-v1"
  ]) {
    assert.equal(ui.includes(key), true, `fehlender getrennter Schlüssel: ${key}`);
  }

  assert.match(ui, /function activeNotesStorageKey\(\)/u);
  assert.match(ui, /function activeCloneStorageKeys\(\)/u);
  assert.match(ui, /if \(!storageKey\) \{\s*personalNotes = \[\]/u);
  assert.match(ui, /applyCustomCloneAppearance\("", null\);/u);
});

test("jede Holo-Instanz besitzt eine eigene Stimme und keine Vorauswahl", async () => {
  const html = await source("www/index.html");

  assert.match(html, /PAM_SOL_VOICE_STORAGE_KEY/u);
  assert.match(html, /STEFFI_SOL_VOICE_STORAGE_KEY/u);
  assert.match(html, /"steffis-holo-realtime-voice-v1"/u);
  assert.match(html, /selectedSpeakerId[\s\S]*?: "";/u);
  assert.match(html, /Bitte vor dem Schreiben oder Sprechen auswählen/u);
  assert.doesNotMatch(html, /localStorage\.getItem\(\s*SOL_VOICE_STORAGE_KEY/u);
});

test("Google- und SmartThings-Zuordnung bindet OAuth-State und Tokenzeile an den Owner", async () => {
  const server = await source("server.mjs");

  assert.match(server, /"pam-sol"[\s\S]*cloneId: CURRENT_CLONE_ID/u);
  assert.match(server, /"steffi-sol"[\s\S]*cloneId: "steffi-sol-001"/u);
  assert.match(server, /googleOAuthStates\.set\(state, \{[\s\S]*ownerId/u);
  assert.match(server, /smartThingsOAuthStates\.set\([\s\S]*ownerId/u);
  assert.match(server, /async function loadGoogleTokens\(ownerId\)/u);
  assert.match(server, /async function loadSmartThingsTokens\(ownerId\)/u);
  assert.match(server, /cloneIdForOwner\(ownerId\)/u);
});

test("private Google-Inhalte bleiben ohne vertrauenswürdige App-Sitzung fail-closed", async () => {
  const server = await source("server.mjs");

  assert.match(server, /GOOGLE_PERSONAL_READ_GATE_SECRET/u);
  assert.match(server, /hasTrustedGooglePersonalReadGate\(req\)/u);
  assert.match(server, /TRUSTED_APP_SESSION_REQUIRED/u);
  assert.match(server, /Eine ownerId allein[\s\S]*keine Authentifizierung/u);
  assert.match(server, /handleCalendarWriteRequest\([\s\S]*trustedAppSession = false/u);
  assert.match(server, /needsTrustedAppSession: true/u);
  assert.match(server, /\/auth\/google[\s\S]*hasTrustedGooglePersonalReadGate\(req\)/u);
  assert.match(server, /\/auth\/smartthings[\s\S]*hasTrustedGooglePersonalReadGate\(req\)/u);
});

test("digitale Einwilligung und Geräteschlüssel lehnen Owner-Wechsel ab", async () => {
  const bootstrap = await source("www/consent-ui-bootstrap.mjs");
  const nativeSecurity = await source("android-native/SolAccessSecurityPlugin.java");

  assert.match(bootstrap, /request\?\.payload\?\.ownerId !== identity\.ownerId/u);
  assert.match(bootstrap, /OWNER_SCOPE_MISMATCH/u);
  assert.match(nativeSecurity, /signConsentPayload\(PluginCall call\)/u);
  assert.match(nativeSecurity, /String ownerId = requiredOwnerId\(call\)/u);
  assert.match(nativeSecurity, /payloadSha256/u);
});
