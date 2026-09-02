import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Pams ausgelieferte Holo-Instanz enthält ausschließlich Pams lokale ID und Speicher", async () => {
  const html = await source("www/index.html");
  const ui = await source("www/sol-holo-ui.js");
  const consent = await source("www/consent-ui-bootstrap.mjs");

  for (const key of [
    "pams-holo-original-notes-v1",
    "sol-holo:pam-sol:clone-photo:v2",
    "sol-holo:pam-sol:clone-mouth:v2"
  ]) {
    assert.equal(ui.includes(key), true, `fehlender Pam-Schlüssel: ${key}`);
  }

  for (const client of [html, ui, consent]) {
    assert.doesNotMatch(client, /steffi(?:-sol|s-holo)?/iu);
  }

  assert.match(ui, /function activeNotesStorageKey\(\)/u);
  assert.match(ui, /function activeCloneStorageKeys\(\)/u);
  assert.match(ui, /if \(!storageKey\) \{\s*personalNotes = \[\]/u);
  assert.match(ui, /applyCustomCloneAppearance\("", null\);/u);
  assert.match(ui, /sol-holo:unassigned:clone-photo:v1:quarantine/u);
  assert.match(ui, /sol-holo:unassigned:clone-mouth:v1:quarantine/u);
  assert.match(ui, /sol-holo:pam-sol:clone-appearance-migration:v2/u);
  assert.match(
    ui,
    /function restoreCustomCloneAppearance\(\) \{[\s\S]*quarantineLegacyCloneAppearance\(\);[\s\S]*applyCustomCloneAppearance\("", null\);/u
  );
  assert.match(
    ui,
    /localStorage\.setItem\(legacyClonePhotoQuarantineKey, legacyPhoto\)[\s\S]*localStorage\.getItem\(legacyClonePhotoQuarantineKey\) !== legacyPhoto/u
  );
  assert.match(
    ui,
    /localStorage\.setItem\(legacyCloneMouthQuarantineKey, legacyMouth\)[\s\S]*localStorage\.getItem\(legacyCloneMouthQuarantineKey\) !== legacyMouth/u
  );
  assert.match(
    ui,
    /if \(legacyPhoto\) localStorage\.removeItem\(legacyClonePhotoKey\);[\s\S]*if \(legacyMouth\) localStorage\.removeItem\(legacyCloneMouthKey\);/u
  );
  assert.doesNotMatch(
    ui,
    /applyCustomCloneAppearance\(legacyPhoto/u
  );
  assert.match(ui, /facialIdentity: "not-verified"/u);
  assert.match(ui, /deviceOrigin: "unknown"/u);
  assert.match(ui, /locationOrigin: "unknown"/u);
  assert.match(ui, /explicitOwnerConfirmation: true/u);
  assert.match(ui, /deviceDisplayNameUsedAsIdentity: false/u);
  assert.match(ui, /locationUsedAsIdentity: false/u);
  assert.match(ui, /local-landmarks-only-not-person-identification/u);
  assert.match(ui, /quarantineUnverifiedPamCloneAppearance\(keys\)/u);
});

test("die signierte Pam-Instanz ist fest an pam-sol gebunden und lädt keine Sitzungs-ID", async () => {
  const html = await source("www/index.html");
  const appLock = await source("www/app-lock-bootstrap.mjs");

  assert.match(html, /PAM_SOL_VOICE_STORAGE_KEY/u);
  assert.match(html, /const SOL_APP_IDENTITY = Object\.freeze/u);
  assert.match(html, /ownerId:"pam-sol"/u);
  assert.match(html, /speakerId:"pam"/u);
  assert.match(
    html,
    /let selectedSpeakerId =\s*SOL_APP_IDENTITY\.speakerId;/u
  );
  assert.doesNotMatch(html, /SOL_SPEAKER_SESSION_KEY/u);
  assert.doesNotMatch(
    html,
    /data-speaker-id="(?:steffi|pam)"/u
  );
  assert.match(html, /class="solholo-booting"/u);
  assert.match(html, /id="solHoloBootScreen"/u);
  assert.match(
    appLock,
    /classList\.remove\("solholo-booting"\)/u
  );
  assert.match(html, /Eine andere Identität wird niemals geladen/u);
  assert.doesNotMatch(html, /localStorage\.getItem\(\s*SOL_VOICE_STORAGE_KEY/u);
  assert.match(html, /app-lock-bootstrap\.mjs\?v=3/u);
  assert.doesNotMatch(html, /solHoloBootScreen"\)\?\.remove/u);
  assert.match(appLock, /const APP_OWNER_ID = "pam-sol"/u);
  assert.match(appLock, /authorizeAppAccess/u);
  assert.match(appLock, /consumeCriticalAuthorization/u);
  assert.match(appLock, /document\.addEventListener\("visibilitychange"/u);
  assert.match(appLock, /document\.documentElement\.classList\.add\("solholo-booting"\)/u);
  assert.doesNotMatch(appLock, /localStorage|sessionStorage/u);
  assert.doesNotMatch(appLock, /steffi(?:-sol|s-holo)?/iu);
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
  const sessionClient = await source("www/trusted-app-session.mjs");
  const nativeSecurity = await source("android-native/SolAccessSecurityPlugin.java");

  assert.doesNotMatch(server, /GOOGLE_PERSONAL_READ_GATE_SECRET/u);
  assert.match(server, /createTrustedAppSessionManager/u);
  assert.match(server, /trustedAppSessions\.validateRequest\(req\)/u);
  assert.match(server, /hasTrustedGooglePersonalReadGate\(req\)/u);
  assert.match(server, /TRUSTED_APP_SESSION_REQUIRED/u);
  assert.match(server, /Eine ownerId allein[\s\S]*keine Authentifizierung/u);
  assert.match(server, /handleCalendarWriteRequest\([\s\S]*trustedAppSession = false/u);
  assert.match(server, /needsTrustedAppSession: true/u);
  assert.match(server, /\/auth\/google[\s\S]*hasTrustedGooglePersonalReadGate\(req\)/u);
  assert.match(server, /\/auth\/smartthings[\s\S]*hasTrustedGooglePersonalReadGate\(req\)/u);
  assert.match(server, /GOOGLE_OWNER_ACCOUNT_MISMATCH/u);
  assert.match(sessionClient, /signTrustedSessionChallenge/u);
  assert.match(sessionClient, /x-sol-holo-trusted-session/u);
  assert.doesNotMatch(sessionClient, /localStorage|sessionStorage/u);
  assert.match(nativeSecurity, /TRUSTED_SESSION_ACTION/u);
  assert.match(nativeSecurity, /signTrustedSessionChallenge\(PluginCall call\)/u);
  assert.match(nativeSecurity, /getTrustedSessionDevice\(PluginCall call\)/u);
});

test("digitale Einwilligung und Geräteschlüssel lehnen Owner-Wechsel ab", async () => {
  const bootstrap = await source("www/consent-ui-bootstrap.mjs");
  const nativeSecurity = await source("android-native/SolAccessSecurityPlugin.java");

  assert.match(bootstrap, /request\?\.payload\?\.ownerId !== identity\.ownerId/u);
  assert.match(bootstrap, /OWNER_SCOPE_MISMATCH/u);
  assert.match(nativeSecurity, /signConsentPayload\(PluginCall call\)/u);
  assert.match(nativeSecurity, /String ownerId = requiredOwnerId\(call\)/u);
  assert.match(nativeSecurity, /APP_OWNER_ID = "pam-sol"/u);
  assert.match(nativeSecurity, /authorizeAppAccess\(PluginCall call\)/u);
  assert.match(nativeSecurity, /AuthenticationPurpose\.APP_ACCESS/u);
  assert.match(nativeSecurity, /"Pam’s Holo entsperren"/u);
  assert.match(nativeSecurity, /activity\.runOnUiThread/u);
  assert.match(nativeSecurity, /BIOMETRIC_PROMPT_START_FAILED/u);
  assert.match(
    nativeSecurity,
    /getSupportFragmentManager\(\)\.isStateSaved\(\)/u
  );
  assert.match(
    nativeSecurity,
    /isOwnerBoundToInstance\(ownerId, APP_OWNER_ID\)/u
  );
  assert.match(nativeSecurity, /"OWNER_SCOPE_MISMATCH"/u);
  assert.match(nativeSecurity, /payloadSha256/u);
});
