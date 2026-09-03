import assert from "node:assert/strict";
import test from "node:test";

const OWNER_ID = "pam-sol";
const REGISTRATION_ID = "11111111-1111-4111-8111-111111111111";

let moduleSequence = 0;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function fixture({ signatureFailures = 0 } = {}) {
  const events = [];
  let authorizationCount = 0;
  let challengeCount = 0;
  let remainingSignatureFailures = signatureFailures;

  const plugin = {
    async getTrustedSessionDevice() {
      events.push({ type: "device" });
      return {
        ownerId: OWNER_ID,
        registrationId: REGISTRATION_ID,
        packageName: "com.solholo.app",
        hardwareBacked: true
      };
    },
    async authorizeCriticalAction() {
      authorizationCount += 1;
      events.push({ type: "authorize", number: authorizationCount });
      return {
        allowed: true,
        ownerId: OWNER_ID,
        action: "bind_trusted_app_session",
        authorizationId: `authorization-${authorizationCount}`
      };
    },
    async signTrustedSessionChallenge(challenge) {
      events.push({
        type: "sign",
        number: challengeCount,
        authorizationId: challenge.authorizationId,
        issuedAtType: typeof challenge.issuedAtMillis,
        expiresAtType: typeof challenge.expiresAtMillis
      });
      if (remainingSignatureFailures > 0) {
        remainingSignatureFailures -= 1;
        const error = new Error("Challenge ungültig");
        error.code = "TRUSTED_SESSION_CHALLENGE_INVALID";
        throw error;
      }
      return {
        ok: true,
        ownerId: OWNER_ID,
        registrationId: REGISTRATION_ID,
        challengeId: challenge.challengeId,
        signatureBase64Url: "signed"
      };
    }
  };

  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.document = {
    visibilityState: "visible",
    addEventListener() {}
  };
  globalThis.window = {
    Capacitor: { Plugins: { SolAccessSecurity: plugin } },
    SolHoloIdentity: {
      selected: () => ({
        ownerId: OWNER_ID,
        speakerId: "pam"
      })
    },
    addEventListener() {},
    dispatchEvent() {},
    setTimeout
  };

  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname;
    if (path === "/app-session/challenge") {
      challengeCount += 1;
      const now = Date.now();
      events.push({ type: "challenge", number: challengeCount });
      return jsonResponse({
        ownerId: OWNER_ID,
        registrationId: REGISTRATION_ID,
        packageName: "com.solholo.app",
        challengeId:
          `00000000-0000-4000-8000-${String(challengeCount).padStart(12, "0")}`,
        nonceBase64Url: "A".repeat(43),
        issuedAtMillis: now,
        expiresAtMillis: now + 120_000,
        purpose: "owner_personal_services",
        action: "bind_trusted_app_session"
      });
    }
    if (path === "/app-session/complete") {
      const body = JSON.parse(options.body);
      events.push({
        type: "complete",
        number: challengeCount,
        challengeId: body.challengeId
      });
      return jsonResponse({
        trusted: true,
        ownerId: OWNER_ID,
        sessionToken: `session-${challengeCount}`,
        expiresAtMillis: Date.now() + 30 * 60_000
      });
    }
    throw new Error(`Unerwarteter Testpfad: ${path}`);
  };

  moduleSequence += 1;
  const client = await import(
    `../www/trusted-app-session.mjs?refresh-test=${moduleSequence}`
  );
  return { client, events };
}

test("fordert die Challenge erst nach der frischen Android-Freigabe an", async () => {
  const { client, events } = await fixture();
  const result = await client.ensureTrustedAppSession({ interactive: true });

  assert.equal(result.trusted, true);
  assert.deepEqual(
    events.map(event => event.type),
    ["device", "authorize", "challenge", "sign", "complete"]
  );
  assert.equal(events[3].authorizationId, "authorization-1");
  assert.equal(events[3].issuedAtType, "string");
  assert.equal(events[3].expiresAtType, "string");
});

test("verwirft eine ungültige Challenge und versucht genau einmal frisch", async () => {
  const { client, events } = await fixture({ signatureFailures: 1 });
  const result = await client.ensureTrustedAppSession({ interactive: true });

  assert.equal(result.trusted, true);
  assert.deepEqual(
    events.map(event => event.type),
    [
      "device",
      "authorize",
      "challenge",
      "sign",
      "authorize",
      "challenge",
      "sign",
      "complete"
    ]
  );
  assert.equal(events[3].authorizationId, "authorization-1");
  assert.equal(events[6].authorizationId, "authorization-2");
  assert.notEqual(events[3].number, events[6].number);
});

test("wiederholt eine weiterhin ungültige Challenge kein drittes Mal", async () => {
  const { client, events } = await fixture({ signatureFailures: 2 });

  await assert.rejects(
    client.ensureTrustedAppSession({ interactive: true }),
    error => error?.code === "TRUSTED_SESSION_CHALLENGE_INVALID"
  );
  assert.equal(
    events.filter(event => event.type === "authorize").length,
    2
  );
  assert.equal(
    events.filter(event => event.type === "challenge").length,
    2
  );
});
