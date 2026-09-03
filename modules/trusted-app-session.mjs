import {
  createHash,
  createPublicKey,
  randomBytes,
  randomUUID,
  verify
} from "node:crypto";

export const TRUSTED_APP_SESSION_HEADER =
  "x-sol-holo-trusted-session";

export const TRUSTED_APP_SESSION_ACTION =
  "bind_trusted_app_session";

export const TRUSTED_APP_SESSION_PURPOSE =
  "owner_personal_services";

const DEFAULT_CHALLENGE_TTL_MS = 2 * 60 * 1000;
const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_ACTIVE_CHALLENGES = 500;
const MAX_ACTIVE_SESSIONS = 1000;
const OWNER_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const REGISTRATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export class TrustedAppSessionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TrustedAppSessionError";
    this.code = code;
  }
}

function requiredText(value, code, label, maximum = 4096) {
  const text = String(value || "").trim();
  if (!text || text.length > maximum) {
    throw new TrustedAppSessionError(code, `${label} ist ungültig.`);
  }
  return text;
}

function requiredOwnerId(value) {
  const ownerId = requiredText(
    value,
    "TRUSTED_SESSION_OWNER_INVALID",
    "ownerId",
    64
  );
  if (!OWNER_ID_PATTERN.test(ownerId)) {
    throw new TrustedAppSessionError(
      "TRUSTED_SESSION_OWNER_INVALID",
      "Die ownerId der sicheren App-Sitzung ist ungültig."
    );
  }
  return ownerId;
}

function requiredRegistrationId(value) {
  const registrationId = requiredText(
    value,
    "TRUSTED_SESSION_DEVICE_INVALID",
    "Geräteregistrierung",
    64
  );
  if (!REGISTRATION_ID_PATTERN.test(registrationId)) {
    throw new TrustedAppSessionError(
      "TRUSTED_SESSION_DEVICE_INVALID",
      "Die Geräteregistrierung der sicheren App-Sitzung ist ungültig."
    );
  }
  return registrationId;
}

function requiredBase64Url(value, code, label, maximum = 8192) {
  const text = requiredText(value, code, label, maximum);
  if (!BASE64URL_PATTERN.test(text)) {
    throw new TrustedAppSessionError(code, `${label} ist nicht Base64URL-kodiert.`);
  }
  return text;
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedRequestOwner(req) {
  return String(
    req?.body?.ownerId ?? req?.query?.ownerId ?? ""
  ).trim();
}

export function trustedSessionCanonicalPayload({
  ownerId,
  registrationId,
  challengeId,
  nonceBase64Url,
  issuedAtMillis,
  expiresAtMillis,
  packageName = "com.solholo.app"
}) {
  const safeOwnerId = requiredOwnerId(ownerId);
  const safeRegistrationId = requiredRegistrationId(registrationId);
  const safeChallengeId = requiredRegistrationId(challengeId);
  const safeNonce = requiredBase64Url(
    nonceBase64Url,
    "TRUSTED_SESSION_CHALLENGE_INVALID",
    "Challenge-Nonce",
    128
  );
  const safePackageName = requiredText(
    packageName,
    "TRUSTED_SESSION_PACKAGE_INVALID",
    "Paketname",
    160
  );
  const issuedAt = Number(issuedAtMillis);
  const expiresAt = Number(expiresAtMillis);
  if (
    !Number.isSafeInteger(issuedAt) ||
    !Number.isSafeInteger(expiresAt) ||
    issuedAt <= 0 ||
    expiresAt <= issuedAt
  ) {
    throw new TrustedAppSessionError(
      "TRUSTED_SESSION_CHALLENGE_INVALID",
      "Die Zeitgrenzen der sicheren App-Challenge sind ungültig."
    );
  }

  return [
    "SOL_HOLO_TRUSTED_APP_SESSION_V1",
    safePackageName,
    safeOwnerId,
    safeRegistrationId,
    safeChallengeId,
    safeNonce,
    String(issuedAt),
    String(expiresAt),
    TRUSTED_APP_SESSION_PURPOSE
  ].join("\n");
}

export function createTrustedAppSessionManager({
  database,
  now = () => Date.now(),
  randomId = () => randomUUID(),
  randomBytesValue = (size) => randomBytes(size),
  challengeTtlMs = DEFAULT_CHALLENGE_TTL_MS,
  sessionTtlMs = DEFAULT_SESSION_TTL_MS
} = {}) {
  if (!database || typeof database.query !== "function") {
    throw new TypeError("Trusted app sessions require a database.");
  }

  const challenges = new Map();
  const sessions = new Map();

  function cleanup() {
    const current = now();
    for (const [id, challenge] of challenges) {
      if (challenge.expiresAtMillis <= current || challenge.consumed) {
        challenges.delete(id);
      }
    }
    for (const [tokenHash, session] of sessions) {
      if (session.expiresAtMillis <= current) {
        sessions.delete(tokenHash);
      }
    }
    while (challenges.size > MAX_ACTIVE_CHALLENGES) {
      challenges.delete(challenges.keys().next().value);
    }
    while (sessions.size > MAX_ACTIVE_SESSIONS) {
      sessions.delete(sessions.keys().next().value);
    }
  }

  async function initialize() {
    await database.query(`
      CREATE TABLE IF NOT EXISTS sol_trusted_app_devices (
        owner_id TEXT PRIMARY KEY,
        registration_id TEXT NOT NULL,
        package_name TEXT NOT NULL,
        public_key_x509_base64url TEXT NOT NULL,
        certificate_sha256 TEXT NOT NULL,
        verified_via TEXT NOT NULL,
        registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  function parseDeviceRegistration(value) {
    const ownerId = requiredOwnerId(value?.ownerId);
    const registrationId = requiredRegistrationId(value?.registrationId);
    const packageName = requiredText(
      value?.packageName,
      "TRUSTED_SESSION_PACKAGE_INVALID",
      "Paketname",
      160
    );
    if (packageName !== "com.solholo.app") {
      throw new TrustedAppSessionError(
        "TRUSTED_SESSION_PACKAGE_INVALID",
        "Die sichere Sitzung gehört nicht zur Pam’s-Holo-App."
      );
    }
    const certificateSha256 = requiredText(
      value?.certificateSha256,
      "TRUSTED_SESSION_CERTIFICATE_INVALID",
      "Gerätezertifikat",
      64
    ).toLowerCase();
    if (!SHA256_PATTERN.test(certificateSha256)) {
      throw new TrustedAppSessionError(
        "TRUSTED_SESSION_CERTIFICATE_INVALID",
        "Der Fingerabdruck des Gerätezertifikats ist ungültig."
      );
    }
    const publicKeyX509Base64Url = requiredBase64Url(
      value?.publicKeyX509Base64Url,
      "TRUSTED_SESSION_PUBLIC_KEY_INVALID",
      "Öffentlicher Geräteschlüssel",
      4096
    );
    let publicKey;
    try {
      publicKey = createPublicKey({
        key: Buffer.from(publicKeyX509Base64Url, "base64url"),
        format: "der",
        type: "spki"
      });
    } catch {
      throw new TrustedAppSessionError(
        "TRUSTED_SESSION_PUBLIC_KEY_INVALID",
        "Der öffentliche Geräteschlüssel ist nicht lesbar."
      );
    }
    if (
      publicKey.asymmetricKeyType !== "ec" ||
      publicKey.asymmetricKeyDetails?.namedCurve !== "prime256v1"
    ) {
      throw new TrustedAppSessionError(
        "TRUSTED_SESSION_PUBLIC_KEY_INVALID",
        "Für die sichere App-Sitzung wird ein P-256-Geräteschlüssel benötigt."
      );
    }
    return {
      ownerId,
      registrationId,
      packageName,
      publicKeyX509Base64Url,
      certificateSha256
    };
  }

  async function registerDevice(value, { googleAccountVerified = false } = {}) {
    if (!googleAccountVerified) {
      throw new TrustedAppSessionError(
        "TRUSTED_SESSION_OWNER_PROOF_REQUIRED",
        "Die Geräteregistrierung verlangt die bestätigte Google-Owner-Zuordnung."
      );
    }
    const device = parseDeviceRegistration(value);
    await database.query(
      `
        INSERT INTO sol_trusted_app_devices (
          owner_id,
          registration_id,
          package_name,
          public_key_x509_base64url,
          certificate_sha256,
          verified_via,
          registered_at,
          last_verified_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (owner_id)
        DO UPDATE SET
          registration_id = EXCLUDED.registration_id,
          package_name = EXCLUDED.package_name,
          public_key_x509_base64url = EXCLUDED.public_key_x509_base64url,
          certificate_sha256 = EXCLUDED.certificate_sha256,
          verified_via = EXCLUDED.verified_via,
          registered_at = NOW(),
          last_verified_at = NOW()
      `,
      [
        device.ownerId,
        device.registrationId,
        device.packageName,
        device.publicKeyX509Base64Url,
        device.certificateSha256,
        "google_account_match"
      ]
    );
    // Rebinding replaces the owner device. Any proof created by the previous
    // installation must stop working immediately, not only after its TTL.
    for (const [challengeId, challenge] of challenges) {
      if (challenge.ownerId === device.ownerId) {
        challenges.delete(challengeId);
      }
    }
    for (const [tokenHash, session] of sessions) {
      if (session.ownerId === device.ownerId) {
        sessions.delete(tokenHash);
      }
    }
    return { ...device, registered: true };
  }

  async function loadDevice(ownerId, registrationId) {
    const safeOwnerId = requiredOwnerId(ownerId);
    const safeRegistrationId = requiredRegistrationId(registrationId);
    const result = await database.query(
      `
        SELECT
          owner_id,
          registration_id,
          package_name,
          public_key_x509_base64url,
          certificate_sha256
        FROM sol_trusted_app_devices
        WHERE owner_id = $1
          AND registration_id = $2
        LIMIT 1
      `,
      [safeOwnerId, safeRegistrationId]
    );
    return result.rows?.[0] || null;
  }

  async function createChallenge({ ownerId, registrationId }) {
    cleanup();
    const device = await loadDevice(ownerId, registrationId);
    if (!device) {
      throw new TrustedAppSessionError(
        "TRUSTED_SESSION_DEVICE_NOT_BOUND",
        "Dieses Gerät ist noch nicht sicher mit dem Backend verbunden."
      );
    }
    const issuedAtMillis = now();
    const expiresAtMillis = issuedAtMillis + challengeTtlMs;
    const challenge = {
      ownerId: device.owner_id,
      registrationId: device.registration_id,
      packageName: device.package_name,
      challengeId: randomId(),
      nonceBase64Url: randomBytesValue(32).toString("base64url"),
      issuedAtMillis,
      expiresAtMillis,
      consumed: false,
      publicKeyX509Base64Url: device.public_key_x509_base64url
    };
    challenge.canonicalPayload = trustedSessionCanonicalPayload(challenge);
    challenges.set(challenge.challengeId, challenge);
    return {
      ownerId: challenge.ownerId,
      registrationId: challenge.registrationId,
      packageName: challenge.packageName,
      challengeId: challenge.challengeId,
      nonceBase64Url: challenge.nonceBase64Url,
      // Epoch milliseconds cross older Capacitor/Android bridges reliably as
      // decimal strings. The canonical payload still normalizes them back to
      // exact safe integers, so this changes transport only, not what is
      // signed or the server-side expiry enforcement.
      issuedAtMillis: String(issuedAtMillis),
      expiresAtMillis: String(expiresAtMillis),
      purpose: TRUSTED_APP_SESSION_PURPOSE,
      action: TRUSTED_APP_SESSION_ACTION
    };
  }

  async function completeChallenge({
    ownerId,
    registrationId,
    challengeId,
    signatureBase64Url
  }) {
    cleanup();
    const safeOwnerId = requiredOwnerId(ownerId);
    const safeRegistrationId = requiredRegistrationId(registrationId);
    const safeChallengeId = requiredRegistrationId(challengeId);
    const signature = requiredBase64Url(
      signatureBase64Url,
      "TRUSTED_SESSION_SIGNATURE_INVALID",
      "Challenge-Signatur",
      1024
    );
    const challenge = challenges.get(safeChallengeId);
    challenges.delete(safeChallengeId);
    if (
      !challenge ||
      challenge.consumed ||
      challenge.expiresAtMillis <= now()
    ) {
      throw new TrustedAppSessionError(
        "TRUSTED_SESSION_CHALLENGE_EXPIRED",
        "Die sichere App-Challenge ist unbekannt, abgelaufen oder bereits verwendet."
      );
    }
    challenge.consumed = true;
    if (
      challenge.ownerId !== safeOwnerId ||
      challenge.registrationId !== safeRegistrationId
    ) {
      throw new TrustedAppSessionError(
        "TRUSTED_SESSION_SCOPE_MISMATCH",
        "Die sichere App-Challenge gehört zu einer anderen Holo-Instanz oder Installation."
      );
    }
    const publicKey = createPublicKey({
      key: Buffer.from(challenge.publicKeyX509Base64Url, "base64url"),
      format: "der",
      type: "spki"
    });
    const signatureValid = verify(
      "sha256",
      Buffer.from(challenge.canonicalPayload, "utf8"),
      publicKey,
      Buffer.from(signature, "base64url")
    );
    if (!signatureValid) {
      throw new TrustedAppSessionError(
        "TRUSTED_SESSION_SIGNATURE_INVALID",
        "Der registrierte Geräteschlüssel hat die Challenge nicht bestätigt."
      );
    }

    const sessionToken = randomBytesValue(32).toString("base64url");
    const tokenHash = sha256Hex(sessionToken);
    const issuedAtMillis = now();
    const expiresAtMillis = issuedAtMillis + sessionTtlMs;
    sessions.set(tokenHash, {
      ownerId: safeOwnerId,
      registrationId: safeRegistrationId,
      issuedAtMillis,
      expiresAtMillis
    });
    await database.query(
      `
        UPDATE sol_trusted_app_devices
        SET last_verified_at = NOW()
        WHERE owner_id = $1
          AND registration_id = $2
      `,
      [safeOwnerId, safeRegistrationId]
    );
    return {
      trusted: true,
      ownerId: safeOwnerId,
      registrationId: safeRegistrationId,
      sessionToken,
      issuedAtMillis,
      expiresAtMillis,
      headerName: TRUSTED_APP_SESSION_HEADER
    };
  }

  function validateRequest(req) {
    cleanup();
    const token = String(
      req?.headers?.[TRUSTED_APP_SESSION_HEADER] || ""
    ).trim();
    if (!token || !BASE64URL_PATTERN.test(token) || token.length > 256) {
      return null;
    }
    const session = sessions.get(sha256Hex(token));
    if (!session || session.expiresAtMillis <= now()) {
      return null;
    }
    const claimedOwnerId = normalizedRequestOwner(req);
    if (claimedOwnerId && claimedOwnerId !== session.ownerId) {
      return null;
    }
    return {
      ownerId: session.ownerId,
      registrationId: session.registrationId,
      issuedAtMillis: session.issuedAtMillis,
      expiresAtMillis: session.expiresAtMillis
    };
  }

  return Object.freeze({
    initialize,
    parseDeviceRegistration,
    registerDevice,
    loadDevice,
    createChallenge,
    completeChallenge,
    validateRequest
  });
}
