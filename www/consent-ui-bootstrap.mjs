import {
  createConsentSignatureComponent
} from "./consent-signature.mjs";

const CONSENT_PURPOSES = Object.freeze({
  "health-read-v1": Object.freeze({
    purpose:
      "Ausgewählte Health-Connect-Daten ausschließlich nach einer sichtbaren Android-Freigabe lesen.",
    version: "health-read-v1"
  }),
  "voice-enrollment-v1": Object.freeze({
    purpose:
      "Eine neue persönliche Stimmprobe für die lokale Sprechererkennung einrichten oder eine bestehende Stimmprobe ersetzen.",
    version: "voice-enrollment-v1"
  })
});

function selectedIdentity() {
  return window.SolHoloIdentity?.selected?.() || null;
}

function requireSelectedIdentity(status) {
  const identity = selectedIdentity();
  if (identity) {
    return identity;
  }

  window.SolHoloIdentity?.require?.();
  status.textContent =
    "Die feste Holo-ID ist nicht verfügbar. Sicherheitsdaten bleiben gesperrt.";
  return null;
}

const settingsSystemGroup =
  document.getElementById("settingsSystemTitle")?.closest(".settingsGroup");

if (settingsSystemGroup) {
  const securityGroup = document.createElement("section");
  securityGroup.className = "settingsGroup glassCard";
  securityGroup.setAttribute("aria-labelledby", "settingsSecurityTitle");
  securityGroup.innerHTML = `
    <div class="settingsGroupHeader">
      <span class="settingsGroupIcon" aria-hidden="true">🔒</span>
      <div>
        <h3 id="settingsSecurityTitle">Sicherheit &amp; Einwilligungen</h3>
        <p>Nur Pams fest gebundener Geräteschlüssel und freiwillige Freigaben</p>
      </div>
    </div>
    <div class="profileStatusGrid settingsStatusGrid">
      <div class="profileStatus glassCard">
        <strong>Dieses Gerät</strong>
        <span id="accessSecurityDeviceState">Pam’s Holo</span>
      </div>
      <div class="profileStatus glassCard">
        <strong>Kryptografische Uhr</strong>
        <span id="accessSecurityWatchState">Gerätetest noch offen</span>
      </div>
    </div>
    <button id="registerSecureDeviceButton" class="secondaryButton" type="button">
      Dieses Gerät sicher registrieren
    </button>
    <p id="accessSecurityStatus" class="permissionNote" role="status" aria-live="polite">
      Diese Installation registriert ausschließlich Pams fest gebundene Holo-ID.
    </p>
    <div class="settingsSubsection">
      <label for="consentPurposeSelect"><strong>Neue Einwilligung auswählen</strong></label>
      <select id="consentPurposeSelect">
        <option value="">Keine Vorauswahl</option>
        <option value="voice-enrollment-v1">Neue Stimmprobe einrichten oder ersetzen</option>
        <option value="health-read-v1">Ausgewählte Health-Daten lesen</option>
      </select>
      <p class="permissionNote">
        Es wird nichts automatisch freigegeben. Erst Zweck wählen, vollständig ausfüllen
        und den nativen Android-Sicherheitsdialog bestätigen.
      </p>
      <div id="consentSignatureSlot"></div>
    </div>
  `;

  settingsSystemGroup.before(securityGroup);

  const securityStatus =
    document.getElementById("accessSecurityStatus");
  const deviceState =
    document.getElementById("accessSecurityDeviceState");
  const watchState =
    document.getElementById("accessSecurityWatchState");
  const registerButton =
    document.getElementById("registerSecureDeviceButton");
  const purposeSelect =
    document.getElementById("consentPurposeSelect");
  const consentSlot =
    document.getElementById("consentSignatureSlot");

  let consentComponent = null;

  function securityPlugin() {
    return window.Capacitor?.Plugins?.SolAccessSecurity || null;
  }

  function destroyConsentComponent() {
    consentComponent?.destroy();
    consentComponent = null;
    consentSlot.replaceChildren();
  }

  async function loadSecurityStatus() {
    const identity = selectedIdentity();
    const plugin = securityPlugin();

    if (!identity) {
      deviceState.textContent = "Holo-ID nicht verfügbar";
      watchState.textContent = "Gerätetest noch offen";
      securityStatus.textContent =
        "Die feste Holo-ID ist nicht verfügbar. Es wird nichts registriert.";
      registerButton.disabled = true;
      return;
    }

    if (!plugin) {
      deviceState.textContent = "Nur in der Android-App";
      watchState.textContent = "Companion-Test noch offen";
      securityStatus.textContent =
        "Die sichere Registrierung ist nur in der installierten Android-App verfügbar.";
      registerButton.disabled = true;
      return;
    }

    registerButton.disabled = false;
    securityStatus.textContent =
      `Sicherheitsstatus wird nur für ${identity.displayName}s Holo geprüft …`;

    try {
      const status = await plugin.getStatus({ ownerId: identity.ownerId });
      if (selectedIdentity()?.ownerId !== identity.ownerId) {
        return;
      }

      deviceState.textContent = status?.device?.registered
        ? "Hardwaregeschützt registriert"
        : status?.device?.state === "reparatur_erforderlich"
          ? "Reparatur erforderlich"
          : "Noch nicht registriert";
      watchState.textContent = status?.watch?.configured
        ? "Kryptografisch eingerichtet"
        : "Companion-/HCE-Test noch offen";
      securityStatus.textContent = status?.device?.registered
        ? `${identity.displayName}s Geräteschlüssel ist getrennt registriert. Biometrie oder Geräte-PIN bestätigt sensible Aktionen.`
        : `${identity.displayName}s Holo besitzt noch keinen registrierten Geräteschlüssel.`;
    } catch {
      deviceState.textContent = "Status nicht verfügbar";
      watchState.textContent = "Nicht als Faktor aktiv";
      securityStatus.textContent =
        "Der persönliche Sicherheitsstatus konnte nicht sicher gelesen werden.";
    }
  }

  async function nativeConsentSigner(request) {
    const identity = requireSelectedIdentity(securityStatus);
    const plugin = securityPlugin();

    if (!identity || !plugin) {
      throw new Error("NATIVE_SIGNER_UNAVAILABLE");
    }

    if (request?.payload?.ownerId !== identity.ownerId) {
      throw new Error("OWNER_SCOPE_MISMATCH");
    }

    return plugin.signConsentPayload({
      canonicalPayload: request.canonicalPayload,
      ownerId: identity.ownerId,
      payloadSha256: request.payloadSha256
    });
  }

  function mountConsentComponent() {
    destroyConsentComponent();
    const selectedPurpose = CONSENT_PURPOSES[purposeSelect.value];
    const identity = selectedIdentity();
    if (!selectedPurpose || !identity) {
      return;
    }

    consentComponent = createConsentSignatureComponent({
      container: consentSlot,
      owners: [
        { id: identity.ownerId, label: identity.displayName }
      ],
      purpose: selectedPurpose.purpose,
      purposeVersion: selectedPurpose.version,
      signer: nativeConsentSigner,
      title: "Neue freiwillige Einwilligung unterschreiben",
      onStatus(event) {
        if (event.state === "native-signature-created") {
          securityStatus.textContent =
            "Der Beleg wurde nativ und owner-gebunden signiert. Zeichnungspunkte wurden weder gespeichert noch übertragen.";
        }
      }
    });
  }

  registerButton.addEventListener("click", async () => {
    const identity = requireSelectedIdentity(securityStatus);
    const plugin = securityPlugin();
    if (!identity || !plugin) {
      return;
    }

    registerButton.disabled = true;
    securityStatus.textContent =
      `Android bestätigt jetzt ${identity.displayName}s getrennte Geräteregistrierung.`;
    try {
      await plugin.registerCurrentDevice({ ownerId: identity.ownerId });
    } catch {
      securityStatus.textContent =
        "Die Registrierung wurde abgebrochen oder nicht sicher bestätigt.";
    } finally {
      await loadSecurityStatus();
    }
  });

  purposeSelect.addEventListener("change", mountConsentComponent);

  window.addEventListener("solholoidentitychange", () => {
    purposeSelect.value = "";
    destroyConsentComponent();
    void loadSecurityStatus();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void loadSecurityStatus();
    }
  });

  void loadSecurityStatus();
}
