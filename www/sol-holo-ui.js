const uiMarkup = "\n<section id=\"onboardingScreen\" aria-labelledby=\"welcomeTitle\">\n  <div class=\"welcomeContent\">\n    <img class=\"welcomeLogo\" src=\"sol-holo-logo.png\" alt=\"SH♾️ – Sol Holo\">\n    <h2 id=\"welcomeTitle\" class=\"welcomeName\">SOL HOLO</h2>\n    <p class=\"welcomeTagline\">\n      Dein persönliches digitales Ich.\n      <strong>Für alles, was dich ausmacht.</strong>\n    </p>\n  </div>\n  <div class=\"cosmicHorizon\" aria-hidden=\"true\"></div>\n  <button id=\"welcomeButton\" class=\"primaryButton welcomeButton\" type=\"button\">\n    <span>Willkommen bei Sol Holo</span>\n    <span class=\"arrow\" aria-hidden=\"true\">→</span>\n  </button>\n  <div class=\"welcomeDots\" aria-hidden=\"true\">\n    <span></span><span></span><span></span>\n  </div>\n</section>\n\n<section id=\"homeView\" class=\"appView active\" aria-labelledby=\"homeTitle\">\n  <div class=\"screenHeader\">\n    <div class=\"homeBrand\">\n      <img class=\"screenLogo\" src=\"sol-holo-logo.png\" alt=\"SH♾️ – Sol Holo\">\n      <span class=\"statusPill\">Online</span>\n    </div>\n    <button id=\"homeSettingsButton\" class=\"iconButton\" type=\"button\"\n      aria-label=\"Profil und Einstellungen öffnen\">✦</button>\n  </div>\n\n  <div class=\"homeIntro\">\n    <p class=\"eyebrow\">Me, Myself &amp; I</p>\n    <h2 id=\"homeTitle\" class=\"viewTitle\">\n      Hallo Pam <span class=\"accent\">✦</span>\n    </h2>\n    <p class=\"viewLead\">Schön, dich zu sehen.<br>Womit wollen wir starten?</p>\n  </div>\n\n  <button id=\"homeOrbButton\" class=\"holoOrbButton\" type=\"button\"\n    aria-label=\"Sprachgespräch mit Sol starten\">\n    <span class=\"holoOrb\" aria-hidden=\"true\"></span>\n    <span class=\"orbHint\">Antippen und mit Sol sprechen</span>\n  </button>\n\n  <form id=\"homeComposer\" class=\"homeComposer glassCard\">\n    <input id=\"homeMessageInput\" type=\"text\" autocomplete=\"off\"\n      placeholder=\"Sprich oder schreib mit Sol …\" aria-label=\"Nachricht an Sol\">\n    <button id=\"homeMicButton\" class=\"composerButton\" type=\"button\"\n      aria-label=\"Sprachgespräch starten\">◉</button>\n    <button id=\"homeSendButton\" class=\"composerButton primary\" type=\"submit\"\n      aria-label=\"Nachricht senden\">→</button>\n  </form>\n\n  <div class=\"quickGrid\" aria-label=\"Schnellzugriffe\">\n    <button class=\"quickCard\" type=\"button\" data-open-view=\"memory\">\n      <span class=\"quickIcon\">◇</span>\n      <span class=\"quickTitle\">Erinnerungen</span>\n      <span class=\"quickMeta\">Dein Gedächtnis</span>\n      <span class=\"quickChevron\">›</span>\n    </button>\n    <button class=\"quickCard\" type=\"button\"\n      data-sol-prompt=\"Sol, zeig mir meine aktuellen Ziele.\">\n      <span class=\"quickIcon\">◎</span>\n      <span class=\"quickTitle\">Ziele</span>\n      <span class=\"quickMeta\">Pläne &amp; Fortschritt</span>\n      <span class=\"quickChevron\">›</span>\n    </button>\n    <button class=\"quickCard\" type=\"button\"\n      data-sol-prompt=\"Sol, was sollte ich heute im Blick behalten?\">\n      <span class=\"quickIcon\">▦</span>\n      <span class=\"quickTitle\">Heute</span>\n      <span id=\"todayCardMeta\" class=\"quickMeta\">Dein Überblick</span>\n      <span class=\"quickChevron\">›</span>\n    </button>\n    <button class=\"quickCard\" type=\"button\" data-open-view=\"services\">\n      <span class=\"quickIcon\">♡</span>\n      <span class=\"quickTitle\">Verbindungen</span>\n      <span class=\"quickMeta\">Google &amp; Handy</span>\n      <span class=\"quickChevron\">›</span>\n    </button>\n  </div>\n</section>\n\n<section id=\"memoryView\" class=\"appView\" aria-labelledby=\"memoryViewTitle\">\n  <div class=\"subHeader\">\n    <button class=\"iconButton\" type=\"button\" data-open-view=\"home\"\n      aria-label=\"Zurück zur Startseite\">‹</button>\n    <div id=\"memoryViewTitle\" class=\"subHeaderTitle\">Erinnerungen</div>\n    <button class=\"iconButton\" type=\"button\"\n      data-sol-prompt=\"Sol, was weißt du dauerhaft?\"\n      aria-label=\"Gedächtnis mit Sol besprechen\">···</button>\n  </div>\n\n  <div class=\"memoryVisual\" aria-hidden=\"true\">\n    <svg viewBox=\"0 0 320 190\">\n      <defs>\n        <linearGradient id=\"cubeTop\" x1=\"0\" x2=\"1\">\n          <stop offset=\"0\" stop-color=\"#8f6dff\" stop-opacity=\".88\"/>\n          <stop offset=\"1\" stop-color=\"#52e2ff\" stop-opacity=\".72\"/>\n        </linearGradient>\n        <linearGradient id=\"cubeLeft\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#4732bb\" stop-opacity=\".74\"/>\n          <stop offset=\"1\" stop-color=\"#151c66\" stop-opacity=\".45\"/>\n        </linearGradient>\n        <linearGradient id=\"cubeRight\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#245bb8\" stop-opacity=\".72\"/>\n          <stop offset=\"1\" stop-color=\"#32177d\" stop-opacity=\".42\"/>\n        </linearGradient>\n        <filter id=\"cubeGlow\">\n          <feGaussianBlur stdDeviation=\"4\" result=\"blur\"/>\n          <feMerge><feMergeNode in=\"blur\"/><feMergeNode in=\"SourceGraphic\"/></feMerge>\n        </filter>\n        <g id=\"memoryCube\">\n          <polygon points=\"0,15 25,0 50,15 25,30\" fill=\"url(#cubeTop)\"/>\n          <polygon points=\"0,15 25,30 25,60 0,45\" fill=\"url(#cubeLeft)\"/>\n          <polygon points=\"25,30 50,15 50,45 25,60\" fill=\"url(#cubeRight)\"/>\n          <path d=\"M0 15 25 30 50 15M25 30v30\" fill=\"none\"\n            stroke=\"#a9c4ff\" stroke-opacity=\".62\" stroke-width=\".8\"/>\n        </g>\n      </defs>\n      <ellipse cx=\"160\" cy=\"167\" rx=\"116\" ry=\"17\" fill=\"none\"\n        stroke=\"#6c5dff\" stroke-opacity=\".42\"/>\n      <ellipse cx=\"160\" cy=\"167\" rx=\"82\" ry=\"10\" fill=\"#5948ff\"\n        fill-opacity=\".09\" stroke=\"#47d8ff\" stroke-opacity=\".28\"/>\n      <g filter=\"url(#cubeGlow)\">\n        <use href=\"#memoryCube\" x=\"85\" y=\"91\"/>\n        <use href=\"#memoryCube\" x=\"135\" y=\"91\"/>\n        <use href=\"#memoryCube\" x=\"185\" y=\"91\"/>\n        <use href=\"#memoryCube\" x=\"110\" y=\"46\"/>\n        <use href=\"#memoryCube\" x=\"160\" y=\"46\"/>\n        <use href=\"#memoryCube\" x=\"135\" y=\"1\"/>\n      </g>\n    </svg>\n  </div>\n\n  <div class=\"memoryIntro\">\n    <h3 class=\"featureHeadline\">\n      Dein Gedächtnis.<strong>Sicher. Privat. Nur für dich.</strong>\n    </h3>\n    <p class=\"featureCopy\">\n      Sol Holo erinnert sich an das, was zu deinem persönlichen Ich gehört.\n      Deine Gespräche und Erfahrungen bleiben deinem eigenen Sol‑Holo‑Klon\n      zugeordnet.\n    </p>\n  </div>\n\n  <div class=\"actionList\">\n    <button class=\"actionRow\" type=\"button\"\n      data-sol-prompt=\"Sol, fasse unsere letzten Gespräche und Notizen zusammen.\">\n      <span class=\"rowIcon\">✎</span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">Gespräche &amp; Notizen</span>\n        <span class=\"rowMeta\">Was wir zuletzt miteinander besprochen haben</span>\n      </span>\n      <span class=\"rowChevron\">›</span>\n    </button>\n    <button class=\"actionRow\" type=\"button\"\n      data-sol-prompt=\"Sol, welche Lebensereignisse weißt du von mir?\">\n      <span class=\"rowIcon\">⌁</span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">Lebensereignisse</span>\n        <span class=\"rowMeta\">Wichtige Momente, die zu dir gehören</span>\n      </span>\n      <span class=\"rowChevron\">›</span>\n    </button>\n    <button class=\"actionRow\" type=\"button\"\n      data-sol-prompt=\"Sol, welche Vorlieben und Gewohnheiten kennst du von mir?\">\n      <span class=\"rowIcon\">♡</span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">Vorlieben &amp; Gewohnheiten</span>\n        <span class=\"rowMeta\">Was dich ausmacht und wie du denkst</span>\n      </span>\n      <span class=\"rowChevron\">›</span>\n    </button>\n  </div>\n\n  <button id=\"manageMemoriesButton\" class=\"secondaryButton\" type=\"button\">\n    Erinnerungen mit Sol ansehen <span aria-hidden=\"true\">→</span>\n  </button>\n</section>\n\n<section id=\"servicesView\" class=\"appView\" aria-labelledby=\"servicesViewTitle\">\n  <div class=\"subHeader\">\n    <button class=\"iconButton\" type=\"button\" data-open-view=\"home\"\n      aria-label=\"Zurück zur Startseite\">‹</button>\n    <div id=\"servicesViewTitle\" class=\"subHeaderTitle\">Dienste</div>\n    <button id=\"refreshServicesButton\" class=\"iconButton\" type=\"button\"\n      aria-label=\"Verbindungsstatus neu prüfen\">↻</button>\n  </div>\n\n  <div class=\"serviceOrbit\" aria-hidden=\"true\">\n    <div class=\"orbitRing\"></div>\n    <img class=\"orbitLogo\" src=\"sol-holo-logo.png\" alt=\"\">\n    <span class=\"orbitNode google\">G</span>\n    <span class=\"orbitNode whatsapp\">W</span>\n    <span class=\"orbitNode phone\">☎</span>\n    <span class=\"orbitNode contacts\">♙</span>\n  </div>\n\n  <div class=\"servicesIntro\">\n    <h3 class=\"featureHeadline\">\n      Alles verbunden.<strong>Alles für dich.</strong>\n    </h3>\n    <p class=\"featureCopy\">\n      Sol Holo verbindet nur die Dienste, die du wirklich möchtest.\n      Jede Freigabe wird einzeln erteilt und kann wieder ausgeschaltet werden.\n    </p>\n  </div>\n\n  <div class=\"actionList\">\n    <button id=\"googleAccountRow\" class=\"serviceRow\" type=\"button\">\n      <span class=\"rowIcon\">G</span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">Google‑Konto</span>\n        <span class=\"rowMeta\">Google Kalender und freigegebene Google‑Dienste</span>\n      </span>\n      <span id=\"googleAccountStatus\" class=\"serviceStatus\">Wird geprüft …</span>\n    </button>\n\n    <button id=\"whatsappDriveRow\" class=\"serviceRow\" type=\"button\">\n      <span class=\"rowIcon\">W</span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">WhatsApp‑Fahrmodus</span>\n        <span class=\"rowMeta\">Nachrichten beim Autofahren sicher vorlesen</span>\n      </span>\n      <span id=\"whatsappDriveStatus\" class=\"serviceStatus setup\">\n        Einrichtung nötig\n      </span>\n    </button>\n\n    <button id=\"phoneContactsRow\" class=\"serviceRow\" type=\"button\">\n      <span class=\"rowIcon\">☎</span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">Telefon &amp; Kontakte</span>\n        <span class=\"rowMeta\">Kontakt finden, Anruf erst nach Bestätigung</span>\n      </span>\n      <span id=\"phoneContactsStatus\" class=\"serviceStatus setup\">\n        Freigabe nötig\n      </span>\n    </button>\n  </div>\n\n  <button id=\"manageServicesButton\" class=\"secondaryButton\" type=\"button\">\n    Dienste und Freigaben verwalten <span aria-hidden=\"true\">+</span>\n  </button>\n  <p class=\"permissionNote\">\n    Sol Holo liest keine WhatsApp‑Nachricht, keinen Kontakt und kein\n    Telefonbuch ohne deine ausdrückliche Android‑Freigabe.\n  </p>\n</section>\n\n<section id=\"profileView\" class=\"appView\" aria-labelledby=\"profileViewTitle\">\n  <div class=\"subHeader\">\n    <button class=\"iconButton\" type=\"button\" data-open-view=\"home\"\n      aria-label=\"Zurück zur Startseite\">‹</button>\n    <div id=\"profileViewTitle\" class=\"subHeaderTitle\">Profil</div>\n    <span></span>\n  </div>\n\n  <div class=\"profileHero glassCard\">\n    <img class=\"profileLogo\" src=\"sol-holo-logo.png\" alt=\"SH♾️ – Sol Holo\">\n    <h3 class=\"profileName\">Pam &amp; Sol Holo</h3>\n    <p class=\"profileMeta\">\n      Dein eigener Sol‑Holo‑Klon · getrennt und nur dir zugeordnet\n    </p>\n  </div>\n\n  <div class=\"profileStatusGrid\">\n    <div class=\"profileStatus glassCard\">\n      <strong>Vollzeitgedächtnis</strong>\n      <span id=\"profileMemoryState\">Aktiv</span>\n    </div>\n    <div class=\"profileStatus glassCard\">\n      <strong>Google‑Konto</strong>\n      <span id=\"profileGoogleState\">Wird geprüft …</span>\n    </div>\n  </div>\n\n  <div class=\"actionList\">\n    <button id=\"openSystemMenuButton\" class=\"actionRow\" type=\"button\">\n      <span class=\"rowIcon\">⚙</span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">Systemstatus</span>\n        <span class=\"rowMeta\">Chat, Mikrofon, Gedächtnis und Lip‑Sync</span>\n      </span>\n      <span class=\"rowChevron\">›</span>\n    </button>\n    <button id=\"showWelcomeAgainButton\" class=\"actionRow\" type=\"button\">\n      <span class=\"rowIcon\">✦</span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">Willkommensseite erneut zeigen</span>\n        <span class=\"rowMeta\">Das neue Sol‑Holo‑Startbild öffnen</span>\n      </span>\n      <span class=\"rowChevron\">›</span>\n    </button>\n  </div>\n</section>\n";

(() => {
  "use strict";

  const solApp = document.getElementById("app");
  const currentHeader = solApp?.querySelector(":scope > header");
  const currentControls = document.getElementById("controls");
  const currentChatPanel = document.getElementById("chatPanel");
  const currentSolStage = document.getElementById("solStage");
  const currentBottomNav = document.getElementById("bottomNav");

  if (
    !solApp ||
    !currentHeader ||
    !currentControls ||
    !currentChatPanel ||
    !currentSolStage ||
    !currentBottomNav
  ) {
    console.error("Sol Holo UI konnte nicht vorbereitet werden.");
    return;
  }

  currentHeader.insertAdjacentHTML("beforebegin", uiMarkup);

  const whatsappDriveRow = document.getElementById("whatsappDriveRow");
  whatsappDriveRow.insertAdjacentHTML(
    "afterend",
    '<button id="heyHoSolRow" class="serviceRow" type="button">' +
      '<span class="rowIcon">✦</span>' +
      '<span class="rowText">' +
        '<span class="rowTitle">Sol-Weckruf</span>' +
        '<span class="rowMeta">„Hallo Sol“ · „Hello Sol“</span>' +
      '</span>' +
      '<span id="heyHoSolStatus" class="serviceStatus setup">Wird geprüft …</span>' +
    '</button>' +
    '<div id="wakeModeChooser" class="wakeModeChooser" ' +
      'aria-label="Sol-Weckruf-Hörmodus auswählen">' +
      '<button type="button" data-wake-mode="off">Aus</button>' +
      '<button type="button" data-wake-mode="foreground">App offen</button>' +
      '<button type="button" data-wake-mode="background">Hintergrund</button>' +
    '</div>'
  );

  const chatView = document.createElement("section");
  chatView.id = "chatView";
  chatView.className = "appView";
  chatView.setAttribute("aria-label", "Chat mit Sol");
  solApp.insertBefore(chatView, currentHeader);

  [
    currentHeader,
    currentControls,
    currentChatPanel,
    currentSolStage
  ].forEach((element) => chatView.appendChild(element));

  currentBottomNav.setAttribute("aria-label", "Hauptnavigation");
  currentBottomNav.innerHTML =
    '<button class="navItem active" type="button" data-view="home" aria-label="Start">' +
      '<span class="navIcon">⌂</span><span class="navLabel">Start</span>' +
    '</button>' +
    '<button class="navItem" type="button" data-view="chat" aria-label="Chat">' +
      '<span class="navIcon">◌</span><span class="navLabel">Chat</span>' +
    '</button>' +
    '<button class="navItem" type="button" data-view="memory" aria-label="Erinnerungen">' +
      '<span class="navIcon">◇</span><span class="navLabel">Erinnerungen</span>' +
    '</button>' +
    '<button class="navItem" type="button" data-view="services" aria-label="Dienste">' +
      '<span class="navIcon">∞</span><span class="navLabel">Dienste</span>' +
    '</button>' +
    '<button class="navItem" type="button" data-view="profile" aria-label="Profil">' +
      '<span class="navIcon">○</span><span class="navLabel">Profil</span>' +
    '</button>';

  const uiToast = document.createElement("div");
  uiToast.id = "uiToast";
  uiToast.setAttribute("role", "status");
  uiToast.setAttribute("aria-live", "polite");
  document.body.appendChild(uiToast);

  const views = {
    home: document.getElementById("homeView"),
    chat: chatView,
    memory: document.getElementById("memoryView"),
    services: document.getElementById("servicesView"),
    profile: document.getElementById("profileView")
  };

  const introKey = "sol-holo-intro-v2-seen";
  const onboarding = document.getElementById("onboardingScreen");
  let toastTimer = null;
  let googleConnected = false;
  let whatsappStatus = {
    supported: false,
    permissionGranted: false,
    enabled: false,
    active: false
  };
  let whatsappActionRunning = false;
  let wakeStatus = {
    supported: false,
    mode: "off",
    active: false,
    listening: false,
    pausedForConversation: false
  };
  let wakeActionRunning = false;
  let wakeListenersRegistered = false;
  let lastWakeDetectedAt = 0;
  let pendingWakePrompt = "";

  function showToast(text) {
    uiToast.textContent = String(text || "");
    uiToast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      uiToast.classList.remove("visible");
    }, 4200);
  }

  function showView(viewName) {
    const nextView = views[viewName] || views.home;

    Object.values(views).forEach((view) => {
      view?.classList.remove("active");
    });

    nextView.classList.add("active");

    currentBottomNav.querySelectorAll(".navItem").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === viewName
      );
    });

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (viewName === "services" || viewName === "profile") {
      void loadGoogleStatus();
    }

    if (viewName === "services") {
      void loadWhatsAppStatus();
      void loadWakeStatus();
    }

    if (viewName === "chat" && typeof updateMouthGeometry === "function") {
      window.requestAnimationFrame(updateMouthGeometry);
    }
  }

  async function askSol(prompt) {
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt) {
      return;
    }

    showView("chat");
    const chatInput = document.getElementById("messageInput");
    chatInput.value = cleanPrompt;

    if (typeof sendMessage === "function") {
      await sendMessage();
    }
  }

  async function startSolVoice() {
    await pauseWakeListeningForConversation();
    showView("chat");

    if (
      typeof enterVoiceMode !== "function" ||
      typeof startLiveConversation !== "function"
    ) {
      await resumeWakeListeningAfterConversation();
      showToast("Der Sprachmodus ist gerade nicht verfügbar.");
      return;
    }

    enterVoiceMode();
    await startLiveConversation();
  }

  async function loadGoogleStatus() {
    const serviceState = document.getElementById("googleAccountStatus");
    const profileState = document.getElementById("profileGoogleState");
    const todayState = document.getElementById("todayCardMeta");

    if (serviceState) {
      serviceState.textContent = "Wird geprüft …";
      serviceState.classList.remove("connected", "setup");
    }

    try {
      const response = await fetch(
        "https://sol-holo.onrender.com/calendar/status",
        { cache: "no-store" }
      );
      const data = await response.json();

      googleConnected = Boolean(response.ok && data?.connected);

      if (googleConnected) {
        serviceState.textContent = "Verbunden";
        serviceState.classList.add("connected");
        profileState.textContent = "Kalender verbunden";
        todayState.textContent = "Google Kalender verbunden";
      } else {
        serviceState.textContent = "Verbinden";
        serviceState.classList.add("setup");
        profileState.textContent = "Noch nicht verbunden";
        todayState.textContent = "Kalender verknüpfen";
      }
    } catch (error) {
      console.error("Google-Kontostatus:", error);
      googleConnected = false;
      serviceState.textContent = "Nicht erreichbar";
      serviceState.classList.add("setup");
      profileState.textContent = "Status nicht erreichbar";
      todayState.textContent = "Kalenderstatus offen";
    }
  }

  function getWhatsAppDrivingModePlugin() {
    return window.Capacitor?.Plugins?.WhatsAppDrivingMode || null;
  }

  function renderWhatsAppStatus(nextStatus) {
    const statusElement = document.getElementById("whatsappDriveStatus");
    const row = document.getElementById("whatsappDriveRow");

    whatsappStatus = {
      supported: Boolean(nextStatus?.supported),
      permissionGranted: Boolean(nextStatus?.permissionGranted),
      enabled: Boolean(nextStatus?.enabled),
      active: Boolean(nextStatus?.active)
    };

    statusElement.classList.remove("connected", "setup");
    row.setAttribute("aria-pressed", String(whatsappStatus.active));

    if (!whatsappStatus.supported) {
      statusElement.textContent = "Nur Android";
      statusElement.classList.add("setup");
    } else if (!whatsappStatus.permissionGranted) {
      statusElement.textContent = "Freigabe nötig";
      statusElement.classList.add("setup");
    } else if (whatsappStatus.active) {
      statusElement.textContent = "Aktiv";
      statusElement.classList.add("connected");
    } else {
      statusElement.textContent = "Aus";
      statusElement.classList.add("setup");
    }
  }

  async function loadWhatsAppStatus() {
    const plugin = getWhatsAppDrivingModePlugin();
    if (!plugin) {
      renderWhatsAppStatus({ supported: false });
      return whatsappStatus;
    }

    try {
      const status = await plugin.getStatus();
      renderWhatsAppStatus(status);
    } catch (error) {
      console.error("WhatsApp-Fahrmodusstatus:", error);
      renderWhatsAppStatus({ supported: true });
      document.getElementById("whatsappDriveStatus").textContent =
        "Status offen";
    }

    return whatsappStatus;
  }

  async function toggleWhatsAppDrivingMode() {
    if (whatsappActionRunning) {
      return;
    }

    const plugin = getWhatsAppDrivingModePlugin();
    if (!plugin) {
      showToast("Der WhatsApp-Fahrmodus ist nur in der Android-App verfügbar.");
      renderWhatsAppStatus({ supported: false });
      return;
    }

    const row = document.getElementById("whatsappDriveRow");
    whatsappActionRunning = true;
    row.disabled = true;

    try {
      const currentStatus = await plugin.getStatus();

      if (!currentStatus.permissionGranted) {
        await plugin.setEnabled({ enabled: true });
        showToast(
          "Bitte erlaube Sol Holo jetzt den Benachrichtigungszugriff. " +
          "Danach ist der WhatsApp-Fahrmodus aktiv."
        );
        await plugin.openNotificationAccessSettings();
        renderWhatsAppStatus({
          supported: true,
          permissionGranted: false,
          enabled: true,
          active: false
        });
        return;
      }

      const nextStatus = await plugin.setEnabled({
        enabled: !currentStatus.active
      });
      renderWhatsAppStatus(nextStatus);

      if (nextStatus.active) {
        showToast(
          "WhatsApp-Fahrmodus aktiv: Neue Nachrichten werden vorgelesen."
        );
      } else {
        showToast("WhatsApp-Fahrmodus ausgeschaltet.");
      }
    } catch (error) {
      console.error("WhatsApp-Fahrmodus:", error);
      showToast(
        "Der WhatsApp-Fahrmodus konnte gerade nicht geändert werden."
      );
      await loadWhatsAppStatus();
    } finally {
      whatsappActionRunning = false;
      row.disabled = false;
    }
  }

  function getHeyHoSolPlugin() {
    return window.Capacitor?.Plugins?.HeyHoSol || null;
  }

  function renderWakeStatus(nextStatus) {
    const statusElement = document.getElementById("heyHoSolStatus");
    const chooser = document.getElementById("wakeModeChooser");
    const pluginAvailable = Boolean(getHeyHoSolPlugin());

    wakeStatus = {
      supported: Boolean(nextStatus?.supported),
      mode: String(nextStatus?.mode || "off"),
      active: Boolean(nextStatus?.active),
      listening: Boolean(nextStatus?.listening),
      pausedForConversation: Boolean(nextStatus?.pausedForConversation),
      lastError: String(nextStatus?.lastError || "")
    };

    statusElement.classList.remove("connected", "setup");
    chooser.querySelectorAll("[data-wake-mode]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.wakeMode === wakeStatus.mode
      );
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.wakeMode === wakeStatus.mode)
      );
      button.disabled =
        wakeActionRunning ||
        (!pluginAvailable && button.dataset.wakeMode !== "off");
    });

    if (!pluginAvailable) {
      statusElement.textContent = "Nur Android";
      statusElement.classList.add("setup");
    } else if (!wakeStatus.supported) {
      statusElement.textContent = "Offline fehlt";
      statusElement.classList.add("setup");
    } else if (wakeStatus.pausedForConversation) {
      statusElement.textContent = "Sol spricht";
      statusElement.classList.add("connected");
    } else if (wakeStatus.mode === "background") {
      statusElement.textContent = wakeStatus.listening
        ? "Hintergrund aktiv"
        : "Startet …";
      statusElement.classList.add("connected");
    } else if (wakeStatus.mode === "foreground") {
      statusElement.textContent = wakeStatus.listening
        ? "App hört zu"
        : "App offen";
      statusElement.classList.add("connected");
    } else {
      statusElement.textContent = "Aus";
      statusElement.classList.add("setup");
    }
  }

  async function registerWakeListeners() {
    const plugin = getHeyHoSolPlugin();
    if (!plugin || wakeListenersRegistered) {
      return;
    }

    wakeListenersRegistered = true;
    try {
      await plugin.addListener("wakePhraseDetected", (event) => {
        void handleWakePhraseDetected(event);
      });
      await plugin.addListener("wakeStatusChanged", (status) => {
        renderWakeStatus(status);
      });
    } catch (error) {
      wakeListenersRegistered = false;
      console.error("Hey-ho-Sol-Ereignisse:", error);
    }
  }

  async function consumePendingWakeEvent() {
    const plugin = getHeyHoSolPlugin();
    if (!plugin) {
      return;
    }

    try {
      const event = await plugin.consumeWakeEvent();
      if (event?.detected) {
        await handleWakePhraseDetected(event);
      }
    } catch (error) {
      console.error("Hey-ho-Sol-Weckruf:", error);
    }
  }

  async function loadWakeStatus(consumeEvent = false) {
    const plugin = getHeyHoSolPlugin();
    if (!plugin) {
      renderWakeStatus({ supported: false, mode: "off" });
      return wakeStatus;
    }

    await registerWakeListeners();

    try {
      const status = await plugin.getStatus();
      renderWakeStatus(status);
      if (consumeEvent) {
        await consumePendingWakeEvent();
      }
    } catch (error) {
      console.error("Hey-ho-Sol-Status:", error);
      renderWakeStatus({ supported: true, mode: "off" });
      document.getElementById("heyHoSolStatus").textContent = "Status offen";
    }

    return wakeStatus;
  }

  async function setWakeMode(mode) {
    if (wakeActionRunning) {
      return;
    }

    const plugin = getHeyHoSolPlugin();
    if (!plugin) {
      showToast("Der Sol-Weckruf ist nur in der Android-App verfügbar.");
      return;
    }

    wakeActionRunning = true;
    renderWakeStatus(wakeStatus);

    try {
      const status = await plugin.setMode({ mode });
      renderWakeStatus(status);

      if (mode === "background") {
        showToast(
          "Hintergrund-Hören aktiv. Android zeigt dauerhaft an, " +
          "dass Sol auf deinen Weckruf wartet."
        );
      } else if (mode === "foreground") {
        showToast("Sol hört nur auf den Weckruf, solange die App geöffnet ist.");
      } else {
        showToast("Der Sol-Weckruf ist ausgeschaltet.");
      }
    } catch (error) {
      const message = String(error?.message || error || "");
      console.error("Hey-ho-Sol-Modus:", error);

      if (message.toLowerCase().includes("offline")) {
        showToast(
          "Die Offline-Spracherkennung fehlt. " +
          "Ich öffne die Android-Spracheinstellungen."
        );
        try {
          await plugin.openSpeechSettings();
        } catch {}
      } else {
        showToast(message || "Der Sol-Weckruf konnte gerade nicht aktiviert werden.");
      }

      await loadWakeStatus();
    } finally {
      wakeActionRunning = false;
      renderWakeStatus(wakeStatus);
    }
  }

  async function pauseWakeListeningForConversation() {
    const plugin = getHeyHoSolPlugin();
    if (!plugin || wakeStatus.mode === "off") {
      return;
    }

    try {
      const status = await plugin.pauseForConversation();
      renderWakeStatus(status);
      await new Promise((resolve) => window.setTimeout(resolve, 260));
    } catch (error) {
      console.error("Hey ho Sol pausieren:", error);
    }
  }

  async function resumeWakeListeningAfterConversation() {
    const plugin = getHeyHoSolPlugin();
    if (!plugin) {
      return;
    }

    try {
      const status = await plugin.resumeAfterConversation();
      renderWakeStatus(status);
    } catch (error) {
      console.error("Hey ho Sol fortsetzen:", error);
    }
  }

  async function handleWakePhraseDetected(event) {
    const detectedAt = Number(event?.detectedAt || Date.now());
    if (
      detectedAt <= lastWakeDetectedAt ||
      Date.now() - detectedAt > 30_000
    ) {
      return;
    }

    lastWakeDetectedAt = detectedAt;
    pendingWakePrompt = String(
      event?.phrase || "Hallo Sol"
    );
    showToast("Sol-Weckruf gehört ✨");
    await startSolVoice();
  }

  window.consumeSolHoloWakePrompt = () => {
    const prompt = pendingWakePrompt;
    pendingWakePrompt = "";
    return prompt;
  };

  window.pauseHeyHoSolForConversation = pauseWakeListeningForConversation;
  window.resumeHeyHoSolAfterConversation =
    resumeWakeListeningAfterConversation;

  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-open-view]");
    if (viewButton) {
      showView(viewButton.dataset.openView);
      return;
    }

    const promptButton = event.target.closest("[data-sol-prompt]");
    if (promptButton) {
      void askSol(promptButton.dataset.solPrompt);
    }
  });

  currentBottomNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (button) {
      showView(button.dataset.view);
    }
  });

  document.getElementById("welcomeButton").addEventListener("click", () => {
    onboarding.classList.add("hidden");
    try {
      localStorage.setItem(introKey, "1");
    } catch {}
    showView("home");
  });

  document.getElementById("homeSettingsButton").addEventListener("click", () => {
    showView("profile");
  });

  document.getElementById("homeComposer").addEventListener("submit", (event) => {
    event.preventDefault();
    const homeInput = document.getElementById("homeMessageInput");
    const text = homeInput.value.trim();
    if (text) {
      homeInput.value = "";
      void askSol(text);
    }
  });

  document.getElementById("homeMicButton").addEventListener("click", () => {
    void startSolVoice();
  });

  document.getElementById("homeOrbButton").addEventListener("click", () => {
    void startSolVoice();
  });

  document.getElementById("manageMemoriesButton").addEventListener("click", () => {
    void askSol("Sol, was weißt du dauerhaft?");
  });

  document.getElementById("refreshServicesButton").addEventListener("click", () => {
    void loadGoogleStatus();
    void loadWhatsAppStatus();
    void loadWakeStatus();
  });

  document.getElementById("googleAccountRow").addEventListener("click", () => {
    if (googleConnected) {
      showToast(
        "Dein Google-Konto ist über den Google Kalender mit Sol Holo verbunden."
      );
      return;
    }

    const authWindow = window.open(
      "https://sol-holo.onrender.com/auth/google",
      "_blank",
      "noopener"
    );

    if (!authWindow) {
      window.location.href = "https://sol-holo.onrender.com/auth/google";
    }
  });

  document.getElementById("whatsappDriveRow").addEventListener("click", () => {
    void toggleWhatsAppDrivingMode();
  });

  document.getElementById("heyHoSolRow").addEventListener("click", () => {
    showToast(
      "Wähle: Aus, nur bei geöffneter App oder sichtbar im Hintergrund."
    );
  });

  document.getElementById("wakeModeChooser").addEventListener("click", (event) => {
    const button = event.target.closest("[data-wake-mode]");
    if (button) {
      void setWakeMode(button.dataset.wakeMode);
    }
  });

  document.getElementById("phoneContactsRow").addEventListener("click", () => {
    showToast(
      "Telefon und Kontakte werden erst nach deiner Android-Freigabe verbunden. " +
      "Ein Anruf startet niemals ohne deine Bestätigung."
    );
  });

  document.getElementById("manageServicesButton").addEventListener("click", () => {
    const whatsappText = whatsappStatus.active
      ? "Der WhatsApp-Fahrmodus ist aktiv."
      : "Den WhatsApp-Fahrmodus richtest du direkt über seine Zeile ein.";
    showToast(
      "Jeder Dienst wird einzeln freigegeben. " + whatsappText +
      " Telefon und Kontakte folgen als eigener Android-Schritt."
    );
  });

  document.getElementById("openSystemMenuButton").addEventListener("click", () => {
    document.getElementById("drawer")?.classList.add("open");
  });

  document.getElementById("showWelcomeAgainButton").addEventListener("click", () => {
    try {
      localStorage.removeItem(introKey);
    } catch {}
    onboarding.classList.remove("hidden");
  });

  try {
    if (localStorage.getItem(introKey) === "1") {
      onboarding.classList.add("hidden");
    }
  } catch {}

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void loadWhatsAppStatus();
      void loadWakeStatus(true);
    }
  });

  window.addEventListener("focus", () => {
    void loadWhatsAppStatus();
    void loadWakeStatus(true);
  });

  showView("home");
  void loadGoogleStatus();
  void loadWhatsAppStatus();
  void loadWakeStatus(true);
})();
