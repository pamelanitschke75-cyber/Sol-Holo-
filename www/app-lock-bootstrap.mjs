const APP_OWNER_ID = "pam-sol";
const APP_ACCESS_ACTION = "unlock_app";

const bootScreen = document.getElementById("solHoloBootScreen");
const app = document.getElementById("app");

let authenticationInProgress = false;
let unlocked = false;
let hiddenAtMillis = 0;

function securityPlugin() {
  return window.Capacitor?.Plugins?.SolAccessSecurity || null;
}

function isNativeAndroidApp() {
  try {
    return window.Capacitor?.getPlatform?.() === "android" ||
      Boolean(securityPlugin());
  } catch {
    return false;
  }
}

function boundIdentity() {
  const identity = window.SolHoloIdentity?.bound?.();
  return identity?.ownerId === APP_OWNER_ID ? identity : null;
}

function lockMarkup({ needsRegistration = false, message = "" } = {}) {
  const buttonLabel = needsRegistration
    ? "Gerät einmal sicher registrieren"
    : "Pam’s Holo sicher entsperren";
  const status = message || (
    needsRegistration
      ? "Vor dem ersten Entsperren wird dieses Gerät fest mit pam-sol verbunden."
      : "Fingerabdruck, starke Android-Biometrie oder Geräte-PIN erforderlich."
  );

  bootScreen.innerHTML = "";
  const logo = document.createElement("strong");
  logo.textContent = "SH♾️";

  const statusNode = document.createElement("span");
  statusNode.id = "solHoloAppLockStatus";
  statusNode.setAttribute("role", "status");
  statusNode.setAttribute("aria-live", "polite");
  statusNode.textContent = status;

  const unlockButton = document.createElement("button");
  unlockButton.id = "solHoloAppUnlockButton";
  unlockButton.className = "solHoloLockButton";
  unlockButton.type = "button";
  unlockButton.textContent = buttonLabel;
  unlockButton.addEventListener("click", () => {
    void authenticateAndReveal({ needsRegistration });
  });

  const hint = document.createElement("span");
  hint.className = "solHoloLockHint";
  hint.textContent =
    "Fingerabdruckdaten bleiben ausschließlich bei Android. Sol Holo speichert keine biometrischen Rohdaten.";

  bootScreen.append(logo, statusNode, unlockButton, hint);
}

function showLocked(options = {}) {
  unlocked = false;
  document.documentElement.classList.add("solholo-booting");
  bootScreen.hidden = false;
  bootScreen.removeAttribute("aria-hidden");
  app?.setAttribute("aria-hidden", "true");
  lockMarkup(options);
}

function revealApp() {
  unlocked = true;
  hiddenAtMillis = 0;
  document.documentElement.classList.remove("solholo-booting");
  bootScreen.hidden = true;
  bootScreen.setAttribute("aria-hidden", "true");
  app?.removeAttribute("aria-hidden");
}

function lockAfterBackground() {
  if (!unlocked || authenticationInProgress) return;
  showLocked({
    message:
      "Pam’s Holo wurde nach dem Verlassen der App wieder sicher gesperrt."
  });
  try {
    if (typeof window.stopLiveConversation === "function") {
      window.stopLiveConversation();
    }
  } catch {}
}

async function authenticateAndReveal({ needsRegistration = false } = {}) {
  if (authenticationInProgress) return;
  const identity = boundIdentity();
  const plugin = securityPlugin();
  const statusNode = document.getElementById("solHoloAppLockStatus");
  const unlockButton = document.getElementById("solHoloAppUnlockButton");

  if (!identity || !plugin) {
    showLocked({
      message:
        "Die feste pam-sol-Sicherheitsbindung ist nicht verfügbar. Die App bleibt gesperrt."
    });
    return;
  }

  authenticationInProgress = true;
  if (unlockButton) unlockButton.disabled = true;
  if (statusNode) {
    statusNode.textContent = needsRegistration
      ? "Android registriert dieses Gerät jetzt sicher für pam-sol …"
      : "Android prüft jetzt Fingerabdruck, Biometrie oder Geräte-PIN …";
  }

  try {
    if (needsRegistration) {
      await plugin.registerCurrentDevice({ ownerId: APP_OWNER_ID });
      revealApp();
      return;
    }

    const grant = await plugin.authorizeAppAccess({
      ownerId: APP_OWNER_ID
    });
    if (
      grant?.allowed !== true ||
      grant?.ownerId !== APP_OWNER_ID ||
      grant?.action !== APP_ACCESS_ACTION ||
      !grant?.authorizationId
    ) {
      throw new Error("INVALID_APP_ACCESS_GRANT");
    }

    const consumed = await plugin.consumeCriticalAuthorization({
      action: APP_ACCESS_ACTION,
      authorizationId: grant.authorizationId,
      ownerId: APP_OWNER_ID
    });
    if (
      consumed?.allowed !== true ||
      consumed?.consumed !== true ||
      consumed?.ownerId !== APP_OWNER_ID
    ) {
      throw new Error("APP_ACCESS_GRANT_NOT_CONSUMED");
    }

    revealApp();
  } catch (error) {
    const registrationRequired =
      error?.code === "REGISTERED_DEVICE_REQUIRED";
    showLocked({
      needsRegistration: registrationRequired,
      message: registrationRequired
        ? "Dieses Gerät muss zuerst einmal sicher für pam-sol registriert werden."
        : "Nicht entsperrt. Deine persönlichen Inhalte bleiben vollständig verdeckt."
    });
  } finally {
    authenticationInProgress = false;
  }
}

async function initializeAppLock() {
  if (!isNativeAndroidApp()) {
    revealApp();
    return;
  }

  const identity = boundIdentity();
  const plugin = securityPlugin();
  if (!identity || !plugin) {
    showLocked({
      message:
        "Die Android-Sicherheitskomponente oder die feste pam-sol-ID fehlt. Die App bleibt gesperrt."
    });
    return;
  }

  showLocked({ message: "Sicherheitsstatus wird lokal geprüft …" });
  try {
    const status = await plugin.getStatus({ ownerId: APP_OWNER_ID });
    if (status?.ownerId !== APP_OWNER_ID) {
      throw new Error("OWNER_SCOPE_MISMATCH");
    }
    if (status?.device?.registered !== true) {
      showLocked({ needsRegistration: true });
      return;
    }
    await authenticateAndReveal();
  } catch {
    showLocked({
      message:
        "Der persönliche Sicherheitsstatus konnte nicht bestätigt werden. Die App bleibt gesperrt."
    });
  }
}

document.addEventListener("visibilitychange", () => {
  if (!isNativeAndroidApp() || authenticationInProgress) return;
  if (document.visibilityState === "hidden") {
    hiddenAtMillis = Date.now();
    lockAfterBackground();
    return;
  }
  if (
    document.visibilityState === "visible" &&
    !unlocked &&
    hiddenAtMillis > 0
  ) {
    void authenticateAndReveal();
  }
});

void initializeAppLock();
