const BACKEND_URL = "https://sol-holo.onrender.com";
const OWNER_ID = "pam-sol";
const SESSION_HEADER = "x-sol-holo-trusted-session";
const SESSION_ACTION = "bind_trusted_app_session";

let sessionToken = "";
let sessionExpiresAtMillis = 0;
let ensurePromise = null;
let offeredAuthorizationId = "";
let offeredAuthorizationExpiresAtMillis = 0;
let sessionGeneration = 0;

class TrustedSessionClientError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = "TrustedSessionClientError";
    this.code = code;
    this.status = status;
  }
}

function selectedIdentity() {
  const identity = window.SolHoloIdentity?.selected?.();
  return identity?.ownerId === OWNER_ID ? identity : null;
}

function securityPlugin() {
  return window.Capacitor?.Plugins?.SolAccessSecurity || null;
}

function sessionIsFresh() {
  return Boolean(
    sessionToken &&
    sessionExpiresAtMillis > Date.now() + 15_000
  );
}

function offerAuthorization(authorizationId, expiresAtMillis = 0) {
  const cleanId = String(authorizationId || "").trim();
  const expiresAt = Number(expiresAtMillis) || Date.now() + 60_000;
  if (!cleanId || expiresAt <= Date.now()) return;
  offeredAuthorizationId = cleanId;
  offeredAuthorizationExpiresAtMillis = expiresAt;
}

function takeOfferedAuthorization() {
  if (
    !offeredAuthorizationId ||
    offeredAuthorizationExpiresAtMillis <= Date.now()
  ) {
    offeredAuthorizationId = "";
    offeredAuthorizationExpiresAtMillis = 0;
    return "";
  }
  const authorizationId = offeredAuthorizationId;
  offeredAuthorizationId = "";
  offeredAuthorizationExpiresAtMillis = 0;
  return authorizationId;
}

async function waitForOfferedAuthorization(maximumWaitMillis = 45_000) {
  const deadline = Date.now() + maximumWaitMillis;
  while (Date.now() < deadline) {
    const authorizationId = takeOfferedAuthorization();
    if (authorizationId) return authorizationId;
    await wait(250);
  }
  return "";
}

export function trustedAppSessionHeaders() {
  return sessionIsFresh()
    ? { [SESSION_HEADER]: sessionToken }
    : {};
}

async function postJson(path, body, { includeSession = false } = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(includeSession ? trustedAppSessionHeaders() : {})
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new TrustedSessionClientError(
      String(data?.error || "TRUSTED_SESSION_REQUEST_FAILED"),
      String(
        data?.message ||
        "Die sichere App-Sitzung konnte nicht hergestellt werden."
      ),
      response.status
    );
  }
  return data;
}

function identityBody(identity) {
  return {
    ownerId: identity.ownerId,
    selectedSpeakerId: identity.speakerId
  };
}

async function registeredDevice(plugin) {
  const device = await plugin.getTrustedSessionDevice({
    ownerId: OWNER_ID
  });
  if (
    device?.ownerId !== OWNER_ID ||
    device?.packageName !== "com.solholo.app" ||
    device?.hardwareBacked !== true ||
    !device?.registrationId
  ) {
    throw new TrustedSessionClientError(
      "TRUSTED_SESSION_DEVICE_INVALID",
      "Die lokale S23-Geräteregistrierung ist nicht vollständig."
    );
  }
  return device;
}

async function requestChallenge(identity, device) {
  return postJson("/app-session/challenge", {
    ...identityBody(identity),
    registrationId: device.registrationId
  });
}

async function freshAuthorization(plugin) {
  const grant = await plugin.authorizeCriticalAction({
    ownerId: OWNER_ID,
    action: SESSION_ACTION,
    requireRegisteredWatch: false
  });
  if (
    grant?.allowed !== true ||
    grant?.ownerId !== OWNER_ID ||
    grant?.action !== SESSION_ACTION ||
    !grant?.authorizationId
  ) {
    throw new TrustedSessionClientError(
      "TRUSTED_SESSION_AUTHORIZATION_INVALID",
      "Android hat die sichere Sitzungsfreigabe nicht bestätigt."
    );
  }
  return grant.authorizationId;
}

async function completeChallenge({
  identity,
  device,
  challenge,
  authorizationId,
  plugin
}) {
  const expectedGeneration = sessionGeneration;
  const signed = await plugin.signTrustedSessionChallenge({
    ...challenge,
    ownerId: identity.ownerId,
    registrationId: device.registrationId,
    authorizationId
  });
  if (
    signed?.ok !== true ||
    signed?.ownerId !== identity.ownerId ||
    signed?.registrationId !== device.registrationId ||
    signed?.challengeId !== challenge.challengeId ||
    !signed?.signatureBase64Url
  ) {
    throw new TrustedSessionClientError(
      "TRUSTED_SESSION_SIGNATURE_INVALID",
      "Der registrierte Geräteschlüssel hat keine gültige Antwort geliefert."
    );
  }

  const session = await postJson("/app-session/complete", {
    ...identityBody(identity),
    registrationId: device.registrationId,
    challengeId: challenge.challengeId,
    signatureBase64Url: signed.signatureBase64Url
  });
  if (
    session?.trusted !== true ||
    session?.ownerId !== identity.ownerId ||
    !session?.sessionToken ||
    !Number.isFinite(Number(session?.expiresAtMillis))
  ) {
    throw new TrustedSessionClientError(
      "TRUSTED_SESSION_RESPONSE_INVALID",
      "Das Backend hat die sichere App-Sitzung nicht bestätigt."
    );
  }
  if (
    expectedGeneration !== sessionGeneration ||
    document.visibilityState === "hidden"
  ) {
    return { trusted: false, discardedAfterLock: true };
  }
  sessionToken = String(session.sessionToken);
  sessionExpiresAtMillis = Number(session.expiresAtMillis);
  window.dispatchEvent(new CustomEvent("solholo:trusted-session", {
    detail: { trusted: true, expiresAtMillis: sessionExpiresAtMillis }
  }));
  return {
    trusted: true,
    expiresAtMillis: sessionExpiresAtMillis
  };
}

function openOwnerProof(authUrl) {
  const authWindow = window.open(authUrl, "_blank");
  if (!authWindow) {
    throw new TrustedSessionClientError(
      "GOOGLE_OWNER_PROOF_WINDOW_BLOCKED",
      "Die Google-Bestätigung konnte nicht geöffnet werden."
    );
  }
  try {
    authWindow.opener = null;
  } catch {}
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function bootstrapDevice(identity, device) {
  const start = await postJson("/app-session/bootstrap/start", {
    ...identityBody(identity),
    device
  });
  if (!start?.attemptId || !start?.authUrl) {
    throw new TrustedSessionClientError(
      "TRUSTED_SESSION_BOOTSTRAP_INVALID",
      "Die einmalige S23-Bestätigung konnte nicht gestartet werden."
    );
  }
  openOwnerProof(start.authUrl);

  const deadline = Math.min(
    Number(start.expiresAtMillis) || Date.now() + 10 * 60_000,
    Date.now() + 10 * 60_000
  );
  while (Date.now() < deadline) {
    await wait(1_500);
    const status = await postJson("/app-session/bootstrap/status", {
      ...identityBody(identity),
      attemptId: start.attemptId,
      registrationId: device.registrationId
    });
    if (status?.status === "authorized" && status?.registered === true) {
      return;
    }
    if (status?.status === "failed" || status?.status === "expired") {
      throw new TrustedSessionClientError(
        String(status?.error || "TRUSTED_SESSION_BOOTSTRAP_FAILED"),
        String(
          status?.message ||
          "Die einmalige S23-Bestätigung wurde nicht abgeschlossen."
        )
      );
    }
  }
  throw new TrustedSessionClientError(
    "TRUSTED_SESSION_BOOTSTRAP_EXPIRED",
    "Die einmalige S23-Bestätigung ist abgelaufen."
  );
}

async function establishTrustedAppSession({
  interactive = false,
  authorizationId = "",
  authorizationExpiresAtMillis = 0
} = {}) {
  if (sessionIsFresh()) {
    return { trusted: true, expiresAtMillis: sessionExpiresAtMillis };
  }
  const identity = selectedIdentity();
  const plugin = securityPlugin();
  if (!identity || !plugin) {
    return { trusted: false, unavailable: true };
  }
  const device = await registeredDevice(plugin);
  let challenge;
  try {
    challenge = await requestChallenge(identity, device);
  } catch (error) {
    if (error?.code !== "TRUSTED_SESSION_DEVICE_NOT_BOUND") {
      throw error;
    }
    if (!interactive) {
      offerAuthorization(
        authorizationId,
        authorizationExpiresAtMillis
      );
      return { trusted: false, needsBootstrap: true };
    }
    await bootstrapDevice(identity, device);
    challenge = await requestChallenge(identity, device);
    // Returning from the Google owner proof locks the app. Its normal Android
    // unlock supplies a new one-time grant here, so no second prompt is needed.
    authorizationId = takeOfferedAuthorization() ||
      await waitForOfferedAuthorization();
  }

  if (!authorizationId) {
    if (!interactive) {
      return { trusted: false, needsAuthorization: true };
    }
    authorizationId = await freshAuthorization(plugin);
  }
  return completeChallenge({
    identity,
    device,
    challenge,
    authorizationId,
    plugin
  });
}

export async function ensureTrustedAppSession(options = {}) {
  if (sessionIsFresh()) {
    return { trusted: true, expiresAtMillis: sessionExpiresAtMillis };
  }
  if (ensurePromise) {
    offerAuthorization(
      options?.authorizationId,
      options?.authorizationExpiresAtMillis
    );
    const existingResult = await ensurePromise;
    if (options?.interactive && !existingResult?.trusted) {
      return ensureTrustedAppSession(options);
    }
    return existingResult;
  }
  ensurePromise = establishTrustedAppSession(options)
    .catch((error) => {
      if (options?.interactive) throw error;
      console.info(
        "Sichere App-Sitzung noch nicht aktiv:",
        error?.code || error?.name || "unbekannt"
      );
      return { trusted: false, error: error?.code || "unavailable" };
    })
    .finally(() => {
      ensurePromise = null;
    });
  return ensurePromise;
}

export function clearTrustedAppSession() {
  sessionGeneration += 1;
  sessionToken = "";
  sessionExpiresAtMillis = 0;
  offeredAuthorizationId = "";
  offeredAuthorizationExpiresAtMillis = 0;
}

window.SolHoloTrustedSession = Object.freeze({
  ensure: ensureTrustedAppSession,
  headers: trustedAppSessionHeaders,
  clear: clearTrustedAppSession,
  status: () => ({
    trusted: sessionIsFresh(),
    expiresAtMillis: sessionExpiresAtMillis
  })
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    clearTrustedAppSession();
  }
});
