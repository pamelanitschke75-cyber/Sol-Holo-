import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual
} from "node:crypto";

const DEFAULT_BASE_URL =
  "https://api.smartthings.com/v1";

const DEFAULT_CONFIRMATION_TTL_MS =
  60_000;

const MAX_CONFIRMATION_TTL_MS =
  120_000;

const MAX_PENDING_CONFIRMATIONS =
  1000;

const MAX_PENDING_CONFIRMATIONS_PER_OWNER =
  20;

const SAFE_ACTION_DEFINITIONS =
  Object.freeze({
    "switch.off":
      Object.freeze({
        capability:
          "switch",
        command:
          "off",
        label:
          "ausschalten"
      }),
    "switch.on":
      Object.freeze({
        capability:
          "switch",
        command:
          "on",
        label:
          "einschalten"
      })
  });

export const SAFE_SMARTTHINGS_ACTIONS =
  Object.freeze(
    Object.keys(
      SAFE_ACTION_DEFINITIONS
    )
  );

export class SmartThingsControlError
  extends Error {
  constructor(
    code,
    message,
    statusCode = 400
  ) {
    super(message);

    this.name =
      "SmartThingsControlError";

    this.code =
      code;

    this.statusCode =
      statusCode;
  }
}

function fail(
  code,
  message,
  statusCode = 400
) {
  throw new SmartThingsControlError(
    code,
    message,
    statusCode
  );
}

function normalizeOwnerId(value) {
  const ownerId =
    String(value || "").trim();

  if (
    !ownerId ||
    ownerId.length > 128
  ) {
    fail(
      "INVALID_OWNER",
      "Die persönliche SmartThings-Zuordnung fehlt oder ist ungültig."
    );
  }

  return ownerId;
}

function normalizeResourceId(
  value,
  label
) {
  const resourceId =
    String(value || "").trim();

  if (
    !/^[a-z0-9_-]{1,128}$/i.test(
      resourceId
    )
  ) {
    fail(
      "INVALID_RESOURCE_ID",
      `${label} fehlt oder ist ungültig.`
    );
  }

  return resourceId;
}

function optionalResourceId(
  value,
  label
) {
  if (
    value == null ||
    String(value).trim() ===
      ""
  ) {
    return null;
  }

  return normalizeResourceId(
    value,
    label
  );
}

function limitedText(
  value,
  fallback,
  maxLength = 160
) {
  const text =
    String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  return (
    text ||
    fallback
  ).slice(
    0,
    maxLength
  );
}

function assertProviderOwner(
  value,
  ownerId,
  providerLabel
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    String(
      value.ownerId ||
      ""
    ).trim() !==
      ownerId
  ) {
    fail(
      "OWNER_SCOPE_MISMATCH",
      `${providerLabel} ist nicht eindeutig diesem persönlichen Holo zugeordnet.`,
      403
    );
  }
}

function tokenFromProviderResult(
  value,
  ownerId
) {
  assertProviderOwner(
    value,
    ownerId,
    "Die SmartThings-Verbindung"
  );

  const token =
    value.accessToken ||
    value.access_token;

  const cleanToken =
    String(token || "").trim();

  if (!cleanToken) {
    fail(
      "SMARTTHINGS_AUTH_UNAVAILABLE",
      "Die SmartThings-Verbindung ist nicht verfügbar.",
      503
    );
  }

  return cleanToken;
}

function tokenHash(value) {
  return createHash(
    "sha256"
  )
    .update(
      String(value),
      "utf8"
    )
    .digest();
}

function matchingToken(
  suppliedToken,
  expectedHash
) {
  const suppliedHash =
    tokenHash(
      suppliedToken
    );

  return (
    suppliedHash.length ===
      expectedHash.length &&
    timingSafeEqual(
      suppliedHash,
      expectedHash
    )
  );
}

function actionDefinition(actionKey) {
  const cleanActionKey =
    String(actionKey || "")
      .trim()
      .toLowerCase();

  const definition =
    SAFE_ACTION_DEFINITIONS[
      cleanActionKey
    ];

  if (!definition) {
    fail(
      "UNSAFE_COMMAND",
      "Dieser SmartThings-Befehl ist nicht für die kontrollierte Ausführung freigegeben."
    );
  }

  return {
    definition,
    key:
      cleanActionKey
  };
}

function deviceCapabilityIds(device) {
  const components =
    Array.isArray(
      device?.components
    )
      ? device.components
      : [];

  return new Set(
    components
      .filter(
        (component) =>
          String(
            component?.id ||
            ""
          ).trim() ===
          "main"
      )
      .flatMap(
        (component) =>
          Array.isArray(
            component.capabilities
          )
            ? component.capabilities
            : []
      )
      .map(
        (capability) =>
          String(
            capability?.id ||
            capability ||
            ""
          ).trim()
      )
      .filter(Boolean)
  );
}

function visibleDevice(device) {
  const deviceId =
    optionalResourceId(
      device?.deviceId,
      "Die Geräte-ID"
    );

  if (!deviceId) {
    return null;
  }

  const capabilities =
    deviceCapabilityIds(
      device
    );

  const supportedActions =
    SAFE_SMARTTHINGS_ACTIONS.filter(
      (actionKey) =>
        capabilities.has(
          SAFE_ACTION_DEFINITIONS[
            actionKey
          ].capability
        )
    );

  return Object.freeze({
    deviceId,
    label:
      limitedText(
        device?.label ||
        device?.name,
        "SmartThings-Gerät"
      ),
    locationId:
      optionalResourceId(
        device?.locationId,
        "Die Standort-ID"
      ),
    roomId:
      optionalResourceId(
        device?.roomId,
        "Die Raum-ID"
      ),
    supportedActions:
      Object.freeze(
        supportedActions
      )
  });
}

function visibleRoom(room) {
  const roomId =
    optionalResourceId(
      room?.roomId,
      "Die Raum-ID"
    );

  if (!roomId) {
    return null;
  }

  return Object.freeze({
    label:
      limitedText(
        room?.name,
        "SmartThings-Raum"
      ),
    roomId
  });
}

function normalizeAllowedIds(value) {
  const values =
    value instanceof Set
      ? [...value]
      : Array.isArray(value)
        ? value
        : [];

  return new Set(
    values
      .map(
        (deviceId) =>
          String(
            deviceId ||
            ""
          ).trim()
      )
      .filter(
        (deviceId) =>
          /^[a-z0-9_-]{1,128}$/i.test(
            deviceId
          )
      )
  );
}

function normalizedTtl(value) {
  const ttl =
    value == null
      ? DEFAULT_CONFIRMATION_TTL_MS
      : Number(value);

  if (
    !Number.isFinite(ttl) ||
    ttl < 1_000 ||
    ttl > MAX_CONFIRMATION_TTL_MS
  ) {
    fail(
      "INVALID_CONFIRMATION_TTL",
      "Die Gültigkeit einer SmartThings-Bestätigung muss zwischen 1 und 120 Sekunden liegen."
    );
  }

  return Math.round(ttl);
}

export function createSmartThingsDeviceControl({
  allowedDeviceIdsProvider,
  baseUrl = DEFAULT_BASE_URL,
  confirmationTtlMs = DEFAULT_CONFIRMATION_TTL_MS,
  fetchImpl,
  now = () => Date.now(),
  randomId = () => randomUUID(),
  randomToken = () => randomBytes(32).toString("base64url"),
  tokenProvider
} = {}) {
  if (
    typeof fetchImpl !==
    "function" ||
    typeof tokenProvider !==
    "function" ||
    typeof allowedDeviceIdsProvider !==
    "function"
  ) {
    fail(
      "INVALID_DEPENDENCIES",
      "SmartThings benötigt Fetch-, Token- und Gerätefreigabe-Provider.",
      500
    );
  }

  if (
    typeof now !==
      "function" ||
    typeof randomId !==
      "function" ||
    typeof randomToken !==
      "function"
  ) {
    fail(
      "INVALID_DEPENDENCIES",
      "Die SmartThings-Sicherheitsabhängigkeiten sind ungültig.",
      500
    );
  }

  const ttlMs =
    normalizedTtl(
      confirmationTtlMs
    );

  const cleanBaseUrl =
    String(baseUrl || "")
      .trim()
      .replace(/\/$/, "");

  if (!/^https:\/\//i.test(cleanBaseUrl)) {
    fail(
      "INVALID_BASE_URL",
      "Die SmartThings-API muss über HTTPS angesprochen werden.",
      500
    );
  }

  const pendingConfirmations =
    new Map();

  function cleanupExpiredConfirmations() {
    const currentTime =
      Number(now());

    for (
      const [confirmationId, challenge]
      of pendingConfirmations.entries()
    ) {
      if (
        !Number.isFinite(
          challenge.expiresAt
        ) ||
        challenge.expiresAt <=
          currentTime
      ) {
        pendingConfirmations.delete(
          confirmationId
        );
      }
    }
  }

  async function allowedIds(ownerId) {
    let value;

    try {
      value =
        await allowedDeviceIdsProvider({
          ownerId
        });
    } catch {
      fail(
        "DEVICE_ALLOWLIST_UNAVAILABLE",
        "Die persönliche SmartThings-Gerätefreigabe ist gerade nicht verfügbar.",
        503
      );
    }

    assertProviderOwner(
      value,
      ownerId,
      "Die SmartThings-Gerätefreigabe"
    );

    return normalizeAllowedIds(
      value.deviceIds
    );
  }

  async function accessToken(ownerId) {
    let providedToken;

    try {
      providedToken =
        await tokenProvider({
          ownerId
        });
    } catch {
      fail(
        "SMARTTHINGS_AUTH_UNAVAILABLE",
        "Die SmartThings-Verbindung ist nicht verfügbar.",
        503
      );
    }

    return tokenFromProviderResult(
      providedToken,
      ownerId
    );
  }

  async function smartThingsRequest(
    ownerId,
    path,
    options = {}
  ) {
    const token =
      await accessToken(
        ownerId
      );

    let response;

    try {
      response =
        await fetchImpl(
          `${cleanBaseUrl}${path}`,
          {
            ...options,
            headers: {
              Accept:
                "application/json",
              Authorization:
                `Bearer ${token}`,
              ...(
                options.body
                  ? {
                      "Content-Type":
                        "application/json"
                    }
                  : {}
              )
            }
          }
        );
    } catch {
      fail(
        "SMARTTHINGS_UNAVAILABLE",
        "SmartThings ist gerade nicht erreichbar.",
        503
      );
    }

    if (!response?.ok) {
      if (
        response?.status ===
          401 ||
        response?.status ===
          403
      ) {
        fail(
          "SMARTTHINGS_AUTH_FAILED",
          "Die SmartThings-Verbindung muss erneut freigegeben werden.",
          401
        );
      }

      fail(
        "SMARTTHINGS_REQUEST_FAILED",
        "SmartThings konnte die kontrollierte Anfrage nicht ausführen.",
        502
      );
    }

    return response;
  }

  async function responseJson(
    ownerId,
    path
  ) {
    const response =
      await smartThingsRequest(
        ownerId,
        path
      );

    try {
      return await response.json();
    } catch {
      fail(
        "SMARTTHINGS_INVALID_RESPONSE",
        "SmartThings hat keine gültige Antwort geliefert.",
        502
      );
    }
  }

  async function listDevices({
    locationId = null,
    ownerId
  } = {}) {
    const cleanOwnerId =
      normalizeOwnerId(
        ownerId
      );

    const cleanLocationId =
      optionalResourceId(
        locationId,
        "Die Standort-ID"
      );

    const allowed =
      await allowedIds(
        cleanOwnerId
      );

    if (
      allowed.size ===
      0
    ) {
      return [];
    }

    const query =
      cleanLocationId
        ? `?locationId=${encodeURIComponent(cleanLocationId)}`
        : "";

    const data =
      await responseJson(
        cleanOwnerId,
        `/devices${query}`
      );

    const devices =
      Array.isArray(
        data?.items
      )
        ? data.items
        : [];

    return devices
      .filter(
        (device) =>
          allowed.has(
            String(
              device?.deviceId ||
              ""
            ).trim()
          )
      )
      .map(visibleDevice)
      .filter(Boolean);
  }

  async function listRooms({
    locationId,
    ownerId
  } = {}) {
    const cleanOwnerId =
      normalizeOwnerId(
        ownerId
      );

    const cleanLocationId =
      normalizeResourceId(
        locationId,
        "Die Standort-ID"
      );

    const devices =
      await listDevices({
        locationId:
          cleanLocationId,
        ownerId:
          cleanOwnerId
      });

    const visibleRoomIds =
      new Set(
        devices
          .map(
            (device) =>
              device.roomId
          )
          .filter(Boolean)
      );

    if (
      visibleRoomIds.size ===
      0
    ) {
      return [];
    }

    const data =
      await responseJson(
        cleanOwnerId,
        `/locations/${encodeURIComponent(cleanLocationId)}/rooms`
      );

    const rooms =
      Array.isArray(
        data?.items
      )
        ? data.items
        : [];

    return rooms
      .filter(
        (room) =>
          visibleRoomIds.has(
            String(
              room?.roomId ||
              ""
            ).trim()
          )
      )
      .map(visibleRoom)
      .filter(Boolean);
  }

  async function visibleAllowedDevice(
    ownerId,
    deviceId
  ) {
    const allowed =
      await allowedIds(
        ownerId
      );

    if (!allowed.has(deviceId)) {
      fail(
        "DEVICE_NOT_ALLOWED",
        "Dieses Gerät ist für das ausgewählte persönliche Holo nicht ausdrücklich freigegeben.",
        403
      );
    }

    const data =
      await responseJson(
        ownerId,
        `/devices/${encodeURIComponent(deviceId)}`
      );

    if (
      String(
        data?.deviceId ||
        ""
      ).trim() !==
      deviceId
    ) {
      fail(
        "DEVICE_NOT_ALLOWED",
        "Das ausgewählte SmartThings-Gerät konnte nicht sicher bestätigt werden.",
        403
      );
    }

    const device =
      visibleDevice(
        data
      );

    if (!device) {
      fail(
        "DEVICE_NOT_ALLOWED",
        "Das ausgewählte SmartThings-Gerät konnte nicht sicher bestätigt werden.",
        403
      );
    }

    return device;
  }

  function createUniqueChallengeId() {
    for (
      let attempt = 0;
      attempt < 5;
      attempt += 1
    ) {
      const confirmationId =
        String(
          randomId()
        ).trim();

      if (
        /^[a-z0-9_-]{8,160}$/i.test(
          confirmationId
        ) &&
        !pendingConfirmations.has(
          confirmationId
        )
      ) {
        return confirmationId;
      }
    }

    fail(
      "CONFIRMATION_CREATION_FAILED",
      "Die SmartThings-Bestätigung konnte nicht sicher vorbereitet werden.",
      500
    );
  }

  function reserveChallengeCapacity(
    ownerId
  ) {
    cleanupExpiredConfirmations();

    if (
      pendingConfirmations.size >=
      MAX_PENDING_CONFIRMATIONS
    ) {
      fail(
        "TOO_MANY_CONFIRMATIONS",
        "Es warten bereits zu viele SmartThings-Bestätigungen. Bitte versuche es später erneut.",
        429
      );
    }

    const ownerPendingCount =
      [...pendingConfirmations.values()]
        .filter(
          (challenge) =>
            challenge.ownerId ===
            ownerId
        )
        .length;

    if (
      ownerPendingCount >=
      MAX_PENDING_CONFIRMATIONS_PER_OWNER
    ) {
      fail(
        "TOO_MANY_CONFIRMATIONS",
        "Bitte bestätige oder verwirf zuerst eine bereits vorbereitete SmartThings-Aktion.",
        429
      );
    }
  }

  async function prepareAction({
    action,
    deviceId,
    ownerId
  } = {}) {
    const cleanOwnerId =
      normalizeOwnerId(
        ownerId
      );

    const cleanDeviceId =
      normalizeResourceId(
        deviceId,
        "Die Geräte-ID"
      );

    const {
      definition,
      key:
        actionKey
    } =
      actionDefinition(
        action
      );

    const device =
      await visibleAllowedDevice(
        cleanOwnerId,
        cleanDeviceId
      );

    if (
      !device.supportedActions.includes(
        actionKey
      )
    ) {
      fail(
        "CAPABILITY_NOT_AVAILABLE",
        "Das ausgewählte Gerät unterstützt diesen sicheren Befehl nicht.",
        409
      );
    }

    reserveChallengeCapacity(
      cleanOwnerId
    );

    const confirmationId =
      createUniqueChallengeId();

    const confirmationToken =
      String(
        randomToken()
      ).trim();

    if (
      confirmationToken.length < 32 ||
      confirmationToken.length > 512
    ) {
      fail(
        "CONFIRMATION_CREATION_FAILED",
        "Die SmartThings-Bestätigung konnte nicht sicher vorbereitet werden.",
        500
      );
    }

    const createdAt =
      Number(now());

    const expiresAt =
      createdAt +
      ttlMs;

    pendingConfirmations.set(
      confirmationId,
      Object.freeze({
        actionKey,
        createdAt,
        deviceId:
          cleanDeviceId,
        deviceLabel:
          device.label,
        expiresAt,
        ownerId:
          cleanOwnerId,
        tokenHash:
          tokenHash(
            confirmationToken
          )
      })
    );

    return Object.freeze({
      confirmation:
        Object.freeze({
          expiresAt,
          id:
            confirmationId,
          token:
            confirmationToken
        }),
      preview:
        Object.freeze({
          action:
            actionKey,
          actionLabel:
            definition.label,
          deviceId:
            cleanDeviceId,
          deviceLabel:
            device.label,
          text:
            `Das ausgewählte persönliche Holo wird „${device.label}“ ${definition.label}. Erst deine ausdrückliche Bestätigung führt diesen Befehl aus.`
        }),
      requiresConfirmation:
        true
    });
  }

  async function executeConfirmedAction({
    confirmationId,
    confirmationToken,
    confirmed,
    ownerId
  } = {}) {
    const cleanOwnerId =
      normalizeOwnerId(
        ownerId
      );

    const cleanConfirmationId =
      normalizeResourceId(
        confirmationId,
        "Die Bestätigungs-ID"
      );

    const challenge =
      pendingConfirmations.get(
        cleanConfirmationId
      );

    // Jede Ausführungsanfrage verbraucht die Challenge sofort. Dadurch kann
    // auch bei gleichzeitigen Requests oder einem Upstream-Fehler kein Replay
    // stattfinden. Ein neuer Versuch braucht eine neue sichtbare Vorschau.
    pendingConfirmations.delete(
      cleanConfirmationId
    );

    if (!challenge) {
      fail(
        "CONFIRMATION_INVALID",
        "Diese SmartThings-Bestätigung ist ungültig oder wurde bereits verwendet.",
        409
      );
    }

    if (
      challenge.expiresAt <=
      Number(now())
    ) {
      fail(
        "CONFIRMATION_EXPIRED",
        "Diese SmartThings-Bestätigung ist abgelaufen. Bitte prüfe die Aktion erneut.",
        409
      );
    }

    if (
      challenge.ownerId !==
      cleanOwnerId
    ) {
      fail(
        "CONFIRMATION_OWNER_MISMATCH",
        "Diese SmartThings-Bestätigung gehört nicht zu diesem persönlichen Holo.",
        403
      );
    }

    if (confirmed !== true) {
      fail(
        "CONFIRMATION_REQUIRED",
        "Die SmartThings-Aktion wurde nicht ausdrücklich bestätigt.",
        409
      );
    }

    if (
      !matchingToken(
        confirmationToken,
        challenge.tokenHash
      )
    ) {
      fail(
        "CONFIRMATION_INVALID",
        "Die SmartThings-Bestätigung ist ungültig.",
        409
      );
    }

    const {
      definition,
      key:
        actionKey
    } =
      actionDefinition(
        challenge.actionKey
      );

    const device =
      await visibleAllowedDevice(
        cleanOwnerId,
        challenge.deviceId
      );

    if (
      !device.supportedActions.includes(
        actionKey
      )
    ) {
      fail(
        "CAPABILITY_NOT_AVAILABLE",
        "Das ausgewählte Gerät unterstützt diesen sicheren Befehl nicht mehr.",
        409
      );
    }

    await smartThingsRequest(
      cleanOwnerId,
      `/devices/${encodeURIComponent(challenge.deviceId)}/commands`,
      {
        body:
          JSON.stringify({
            commands: [
              {
                arguments:
                  [],
                capability:
                  definition.capability,
                command:
                  definition.command,
                component:
                  "main"
              }
            ]
          }),
        method:
          "POST"
      }
    );

    return Object.freeze({
      action:
        actionKey,
      actionLabel:
        definition.label,
      confirmationId:
        cleanConfirmationId,
      deviceId:
        challenge.deviceId,
      deviceLabel:
        challenge.deviceLabel,
      executed:
        true
    });
  }

  return Object.freeze({
    executeConfirmedAction,
    listDevices,
    listRooms,
    prepareAction
  });
}
