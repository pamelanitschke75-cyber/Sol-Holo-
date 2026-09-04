import {
  ensureTrustedAppSession
} from "./trusted-app-session.mjs";

const APP_OWNER_ID = "pam-sol";
const APP_ACCESS_ACTION = "unlock_app";
const VERIFIED_LOCKED_WAKE_MAX_AGE_MILLIS = 120_000;

const bootScreen = document.getElementById("solHoloBootScreen");
const app = document.getElementById("app");

let authenticationInProgress = false;
let unlocked = false;
let hiddenAtMillis = 0;
let verifiedLockedVoiceSession = false;

function securityPlugin() {
  return window.Capacitor?.Plugins?.SolAccessSecurity || null;
}

function wakePlugin() {
  return window.Capacitor?.Plugins?.HeyHoSol || null;
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
  verifiedLockedVoiceSession = false;
  unlocked = false;
  document.documentElement.classList.remove("solholo-locked-voice");
  document.documentElement.classList.add("solholo-booting");
  bootScreen.hidden = false;
  bootScreen.removeAttribute("aria-hidden");
  app?.setAttribute("aria-hidden", "true");
  lockMarkup(options);
}

function revealApp() {
  verifiedLockedVoiceSession = false;
  unlocked = true;
  hiddenAtMillis = 0;
  document.documentElement.classList.remove("solholo-locked-voice");
  document.documentElement.classList.remove("solholo-booting");
  bootScreen.hidden = true;
  bootScreen.setAttribute("aria-hidden", "true");
  app?.removeAttribute("aria-hidden");
}

function lockAfterBackground() {
  if (authenticationInProgress) return;
  if (verifiedLockedVoiceSession) {
    const plugin = wakePlugin();
    if (plugin && typeof plugin.finishLockedVoiceSession === "function") {
      void plugin.finishLockedVoiceSession().catch(() => {});
    }
    showLocked({
      message:
        "Das Gespräch im Sperrbildschirm wurde beendet. Deine persönlichen Inhalte bleiben geschützt."
    });
    try {
      if (typeof window.stopLiveConversation === "function") {
        void window.stopLiveConversation();
      }
    } catch {}
    return;
  }
  if (!unlocked) return;
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

function isVerifiedLockedWake(event) {
  const detectedAt = Number(event?.detectedAt || 0);
  const ageMillis = Date.now() - detectedAt;
  return event?.detected === true &&
    event?.lockedAtDetection === true &&
    event?.speakerVerified === true &&
    detectedAt > 0 &&
    ageMillis >= 0 &&
    ageMillis <= VERIFIED_LOCKED_WAKE_MAX_AGE_MILLIS;
}

function enterVerifiedLockedVoiceSession(event) {
  if (!isVerifiedLockedWake(event)) return false;

  verifiedLockedVoiceSession = true;
  unlocked = false;
  hiddenAtMillis = 0;
  document.documentElement.classList.remove("solholo-booting");
  document.documentElement.classList.add("solholo-locked-voice");
  bootScreen.hidden = true;
  bootScreen.setAttribute("aria-hidden", "true");
  app?.removeAttribute("aria-hidden");
  window.dispatchEvent(new CustomEvent(
    "sol-holo-locked-voice-session",
    { detail: { active: true, detectedAt: Number(event.detectedAt) } }
  ));
  return true;
}

async function enterPendingVerifiedLockedWake() {
  const plugin = wakePlugin();
  if (!plugin || typeof plugin.peekWakeEvent !== "function") return false;
  try {
    return enterVerifiedLockedVoiceSession(await plugin.peekWakeEvent());
  } catch {
    return false;
  }
}

async function restoreVisibleAccess() {
  if (await enterPendingVerifiedLockedWake()) return;
  await authenticateAndReveal();
}

window.beginSolHoloVerifiedLockedWakeSession = async event =>
  enterVerifiedLockedVoiceSession(event);

window.finishSolHoloVerifiedLockedWakeSession = () => {
  if (!verifiedLockedVoiceSession) return false;
  const plugin = wakePlugin();
  if (plugin && typeof plugin.finishLockedVoiceSession === "function") {
    void plugin.finishLockedVoiceSession().catch(() => {});
  }
  showLocked({
    message:
      "Das Sperrbildschirm-Gespräch ist beendet. Pam’s Holo bleibt sicher gesperrt."
  });
  window.dispatchEvent(new CustomEvent(
    "sol-holo-locked-voice-session",
    { detail: { active: false } }
  ));
  return true;
};

async function authenticateAndReveal({ needsRegistration = false } = {}) {
  if (authenticationInProgress || verifiedLockedVoiceSession) return;
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
    if (grant?.trustedSessionAuthorizationId) {
      void ensureTrustedAppSession({
        interactive: false,
        authorizationId: grant.trustedSessionAuthorizationId,
        authorizationExpiresAtMillis:
          grant.trustedSessionAuthorizationExpiresAtMillis
      });
    }
  } catch (error) {
    const registrationRequired =
      needsRegistration ||
      error?.code === "REGISTERED_DEVICE_REQUIRED";
    showLocked({
      needsRegistration: registrationRequired,
      message: registrationRequired
        ? error?.code === "BIOMETRIC_PROMPT_START_FAILED"
          ? "Das Android-Sicherheitsfenster konnte nicht geöffnet werden. Bitte Pam’s Holo vollständig im Vordergrund öffnen und erneut registrieren."
          : "Dieses Gerät muss zuerst einmal sicher für pam-sol registriert werden."
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
    if (await enterPendingVerifiedLockedWake()) {
      return;
    }
    const status = await plugin.getStatus({ ownerId: APP_OWNER_ID });
    if (verifiedLockedVoiceSession) {
      return;
    }
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
    void restoreVisibleAccess();
  }
});

void initializeAppLock();
