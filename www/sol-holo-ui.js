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

  const profileCloneImage = document.querySelector("#profileView .profileLogo");
  const profilePhotoButton = document.createElement("button");
  profilePhotoButton.id = "profilePhotoButton";
  profilePhotoButton.className = "profilePhotoButton";
  profilePhotoButton.type = "button";
  profilePhotoButton.setAttribute(
    "aria-label",
    "Eigenes Sol-Holo-Bild aus der Galerie auswählen"
  );
  profileCloneImage.id = "profileCloneImage";
  profileCloneImage.alt = "Persönliches Bild von Pam und Sol Holo";
  profileCloneImage.replaceWith(profilePhotoButton);
  profilePhotoButton.append(profileCloneImage);
  profilePhotoButton.insertAdjacentHTML(
    "beforeend",
    '<span id="profileMouthMarker" class="profileMouthMarker" hidden></span>' +
    '<span class="profilePhotoEdit">✎ Bild ändern</span>'
  );

  const profileMeta = document.querySelector("#profileView .profileMeta");
  profileMeta.insertAdjacentHTML(
    "afterend",
    '<input id="profilePhotoInput" type="file" accept="image/*" hidden>' +
    '<div id="profilePhotoActions" class="profilePhotoActions" hidden>' +
      '<button id="profileMouthButton" type="button">👄 Mund festlegen</button>' +
      '<button id="profilePhotoResetButton" type="button">SH♾️ zurück</button>' +
    '</div>' +
    '<div id="profileMouthControls" class="profileMouthControls" hidden>' +
      '<strong>Mund genau einstellen</strong>' +
      '<p>Tippe zuerst im Bild genau auf die Mitte des Mundes.</p>' +
      '<label>Links ↔ Rechts <output id="profileMouthXValue">50.0 %</output>' +
        '<input id="profileMouthX" type="range" min="8" max="92" ' +
          'step="0.25" value="50"></label>' +
      '<label>Hoch ↕ Runter <output id="profileMouthYValue">58.0 %</output>' +
        '<input id="profileMouthY" type="range" min="8" max="92" ' +
          'step="0.25" value="58"></label>' +
      '<label>Mundbreite <output id="profileMouthWidthValue">16 %</output>' +
        '<input id="profileMouthWidth" type="range" min="6" max="32" ' +
          'step="0.5" value="16"></label>' +
      '<label>Mundhöhe <output id="profileMouthHeightValue">7.5 %</output>' +
        '<input id="profileMouthHeight" type="range" min="3.5" max="18" ' +
          'step="0.5" value="7.5"></label>' +
      '<div class="profileMouthConfirmRow">' +
        '<button id="profileMouthConfirmButton" class="confirm" type="button">' +
          '✅ Mundposition bestätigen' +
        '</button>' +
        '<button id="profileMouthCancelButton" type="button">Abbrechen</button>' +
      '</div>' +
    '</div>' +
    '<p id="profilePhotoHelp" class="profilePhotoHelp">' +
      'Bild antippen und aus der Galerie wählen · bleibt nur auf diesem Gerät.' +
    '</p>'
  );

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

  const phoneContactsRow = document.getElementById("phoneContactsRow");
  phoneContactsRow.insertAdjacentHTML(
    "afterend",
    '<button id="samsungGalleryRow" class="serviceRow" type="button">' +
      '<span class="rowIcon">▣</span>' +
      '<span class="rowText">' +
        '<span class="rowTitle">Samsung Galerie</span>' +
        '<span class="rowMeta">Galerie öffnen · dein Bild selbst auswählen</span>' +
      '</span>' +
      '<span id="samsungGalleryStatus" class="serviceStatus connected">Verbunden</span>' +
    '</button>' +
    '<button id="smartThingsRow" class="serviceRow" type="button">' +
      '<span class="rowIcon">⌂</span>' +
      '<span class="rowText">' +
        '<span class="rowTitle">SmartThings Zuhause</span>' +
        '<span class="rowMeta">Räume &amp; Geräte · Aktion erst nach Bestätigung</span>' +
      '</span>' +
      '<span id="smartThingsStatus" class="serviceStatus setup">Wird geprüft …</span>' +
    '</button>' +
    '<button id="samsungNotesRow" class="serviceRow" type="button">' +
      '<span class="rowIcon">✎</span>' +
      '<span class="rowText">' +
        '<span class="rowTitle">Samsung Notes</span>' +
        '<span class="rowMeta">Ausgewählte Notiz über „Teilen“ an Sol geben</span>' +
      '</span>' +
      '<span id="samsungNotesStatus" class="serviceStatus setup">Über Teilen</span>' +
    '</button>' +
    '<button id="healthConnectRow" class="serviceRow" type="button">' +
      '<span class="rowIcon">♡</span>' +
      '<span class="rowText">' +
        '<span class="rowTitle">Health Connect</span>' +
        '<span class="rowMeta">Samsung Health &amp; andere Quellen · nur lesen</span>' +
      '</span>' +
      '<span id="healthConnectStatus" class="serviceStatus setup">Wird geprüft …</span>' +
    '</button>'
  );

  document.querySelector("#servicesView .permissionNote").textContent =
    "Sol Holo liest keine WhatsApp-Nachricht, keinen Kontakt, kein Bild, keine " +
    "Notiz und keinen Health-Wert ohne deine sichtbare Auswahl oder Freigabe. " +
    "Ein SmartThings-Gerät wird nur nach deiner Bestätigung geschaltet.";

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
  const clonePhotoKey = "sol-holo-clone-photo-v1";
  const cloneMouthKey = "sol-holo-clone-mouth-v1";
  const onboarding = document.getElementById("onboardingScreen");
  const profilePhotoInput = document.getElementById("profilePhotoInput");
  const profilePhotoActions = document.getElementById("profilePhotoActions");
  const profileMouthButton = document.getElementById("profileMouthButton");
  const profilePhotoResetButton = document.getElementById(
    "profilePhotoResetButton"
  );
  const profilePhotoHelp = document.getElementById("profilePhotoHelp");
  const profileMouthMarker = document.getElementById("profileMouthMarker");
  const profileMouthControls = document.getElementById("profileMouthControls");
  const profileMouthX = document.getElementById("profileMouthX");
  const profileMouthY = document.getElementById("profileMouthY");
  const profileMouthWidth = document.getElementById("profileMouthWidth");
  const profileMouthHeight = document.getElementById("profileMouthHeight");
  const profileMouthXValue = document.getElementById("profileMouthXValue");
  const profileMouthYValue = document.getElementById("profileMouthYValue");
  const profileMouthWidthValue = document.getElementById(
    "profileMouthWidthValue"
  );
  const profileMouthHeightValue = document.getElementById(
    "profileMouthHeightValue"
  );
  const profileMouthConfirmButton = document.getElementById(
    "profileMouthConfirmButton"
  );
  const profileMouthCancelButton = document.getElementById(
    "profileMouthCancelButton"
  );
  let toastTimer = null;
  let customClonePhoto = "";
  let cloneMouthCalibrationActive = false;
  let cloneMouthBeforeCalibration = null;
  let customCloneMouth = {
    x: 0.5,
    y: 0.58,
    width: 0.16,
    height: 0.075
  };
  let googleConnected = false;
  let googleStatus = {
    connected: false,
    allRequestedAccessGranted: false,
    services: {}
  };
  let smartThingsStatus = {
    configured: false,
    connected: false,
    selectedDevicesOnly: true,
    actionsRequireConfirmation: true
  };
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
    pausedForConversation: false,
    overlayPermissionGranted: false
  };
  let wakeActionRunning = false;
  let wakeListenersRegistered = false;
  let lastWakeDetectedAt = 0;
  let pendingWakePrompt = "";
  let phoneStatus = {
    supported: false,
    contactsPermissionGranted: false,
    phoneStatePermissionGranted: false,
    connected: false,
    callState: "idle",
    incomingCall: false
  };
  let phoneActionRunning = false;
  let phoneListenersRegistered = false;
  let noteImportRunning = false;
  let noteListenerRegistered = false;
  let healthStatus = {
    supported: false,
    readOnly: true,
    availablePermissionCount: 0,
    grantedPermissionCount: 0,
    connected: false,
    allGranted: false
  };
  let healthActionRunning = false;

  function showToast(text) {
    uiToast.textContent = String(text || "");
    uiToast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      uiToast.classList.remove("visible");
    }, 4200);
  }

  function clampCloneValue(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value) || 0));
  }

  function normalizedCloneMouth(value) {
    return {
      x: clampCloneValue(value?.x || 0.5, 0.08, 0.92),
      y: clampCloneValue(value?.y || 0.58, 0.08, 0.92),
      width: clampCloneValue(value?.width || 0.16, 0.06, 0.32),
      height: clampCloneValue(value?.height || 0.075, 0.035, 0.18)
    };
  }

  function updateCloneMouthMarker() {
    const mouth = normalizedCloneMouth(customCloneMouth);
    profileMouthMarker.style.left = `${mouth.x * 100}%`;
    profileMouthMarker.style.top = `${mouth.y * 100}%`;
    profileMouthMarker.style.width = `${mouth.width * 100}%`;
    profileMouthMarker.style.height = `${mouth.height * 100}%`;
    profileMouthMarker.hidden =
      !customClonePhoto || !cloneMouthCalibrationActive;
  }

  function updateCloneMouthControls() {
    const mouth = normalizedCloneMouth(customCloneMouth);
    const xPercent = mouth.x * 100;
    const yPercent = mouth.y * 100;
    const widthPercent = mouth.width * 100;
    const heightPercent = mouth.height * 100;
    profileMouthX.value = String(xPercent);
    profileMouthY.value = String(yPercent);
    profileMouthWidth.value = String(widthPercent);
    profileMouthHeight.value = String(heightPercent);
    profileMouthXValue.textContent = `${xPercent.toFixed(1)} %`;
    profileMouthYValue.textContent = `${yPercent.toFixed(1)} %`;
    profileMouthWidthValue.textContent = `${widthPercent.toFixed(1)} %`;
    profileMouthHeightValue.textContent = `${heightPercent.toFixed(1)} %`;
  }

  function applyCustomCloneAppearance(photo, mouth) {
    customClonePhoto = String(photo || "");
    customCloneMouth = normalizedCloneMouth(mouth);

    if (!customClonePhoto) {
      cloneMouthCalibrationActive = false;
      cloneMouthBeforeCalibration = null;
      profileCloneImage.src = "sol-holo-logo.png";
      profilePhotoButton.classList.remove("customPhoto", "calibrating");
      profilePhotoActions.hidden = true;
      profileMouthButton.hidden = false;
      profileMouthControls.hidden = true;
      profileMouthMarker.hidden = true;
      profilePhotoHelp.textContent =
        "Bild antippen und aus der Galerie wählen · bleibt nur auf diesem Gerät.";
      window.SolHoloClone?.reset();
      return;
    }

    profileCloneImage.src = customClonePhoto;
    profilePhotoButton.classList.add("customPhoto");
    profilePhotoActions.hidden = false;
    profileMouthButton.hidden = true;
    profileMouthControls.hidden = true;
    profileMouthMarker.hidden = true;
    profilePhotoHelp.textContent =
      "Dein Gesicht wird lokal auf diesem Gerät erkannt …";
    updateCloneMouthMarker();
    window.SolHoloClone?.setImage(customClonePhoto);
    window.SolHoloClone?.setMouthGeometry(customCloneMouth);
  }

  function restoreCustomCloneAppearance() {
    try {
      const savedPhoto = localStorage.getItem(clonePhotoKey) || "";
      const savedMouth = JSON.parse(
        localStorage.getItem(cloneMouthKey) || "null"
      );
      if (savedPhoto.startsWith("data:image/")) {
        applyCustomCloneAppearance(savedPhoto, savedMouth);
      }
    } catch (error) {
      console.error("Sol-Holo-Bild wiederherstellen:", error);
    }
  }

  window.addEventListener("sol-holo-face-rig-status", event => {
    if (!customClonePhoto || cloneMouthCalibrationActive) {
      return;
    }

    const state = String(event.detail?.state || "off");

    if (state === "ready") {
      profileMouthButton.hidden = true;
      profilePhotoHelp.textContent =
        "Gesicht lokal erkannt · Augen, Wangen, Kiefer und Lippen bewegen sich mit Sol.";
      return;
    }

    if (state === "loading" || state === "analysing") {
      profileMouthButton.hidden = true;
      profilePhotoHelp.textContent =
        "Dein Gesicht wird lokal auf diesem Gerät erkannt …";
      return;
    }

    if (state === "fallback") {
      profileMouthButton.hidden = false;
      profilePhotoHelp.textContent =
        "Gesicht nicht eindeutig erkannt · Mundposition kann manuell festgelegt werden.";
    }
  });

  function readImageElement(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Bild konnte nicht geöffnet werden."));
      image.src = source;
    });
  }

  async function prepareClonePhoto(file) {
    if (!file || !String(file.type || "").startsWith("image/")) {
      throw new Error("Bitte ein Bild aus der Galerie auswählen.");
    }

    const source = URL.createObjectURL(file);
    try {
      const image = await readImageElement(source);
      const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
      const scale = Math.min(1, 1200 / Math.max(1, largestSide));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { alpha: false });
      context.fillStyle = "#020714";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/webp", 0.86);
    } finally {
      URL.revokeObjectURL(source);
    }
  }

  function beginCloneMouthCalibration() {
    if (!customClonePhoto) {
      profilePhotoInput.click();
      return;
    }

    cloneMouthBeforeCalibration = {
      ...customCloneMouth
    };
    cloneMouthCalibrationActive = true;
    profilePhotoButton.classList.add("calibrating");
    profileMouthControls.hidden = false;
    updateCloneMouthControls();
    updateCloneMouthMarker();
    profilePhotoButton.setAttribute(
      "aria-label",
      "Mundbox durch Antippen genau positionieren"
    );
    profilePhotoHelp.textContent =
      "Mund antippen, Position und Größe fein einstellen, dann mit ✅ bestätigen.";
    showToast("Tippe auf den Mund und stelle die blaue Box genau ein 👄");
  }

  function moveCloneMouthCalibration(event) {
    const imageRect = profileCloneImage.getBoundingClientRect();
    if (imageRect.width <= 0 || imageRect.height <= 0) {
      return;
    }

    customCloneMouth = normalizedCloneMouth({
      ...customCloneMouth,
      x: (event.clientX - imageRect.left) / imageRect.width,
      y: (event.clientY - imageRect.top) / imageRect.height
    });

    updateCloneMouthMarker();
    updateCloneMouthControls();
    window.SolHoloClone?.setMouthGeometry(customCloneMouth);
    profilePhotoHelp.textContent =
      "Die blaue Box kann weiter versetzt oder mit den Reglern angepasst werden.";
  }

  function previewCloneMouthGeometry() {
    customCloneMouth = normalizedCloneMouth({
      x: Number(profileMouthX.value) / 100,
      y: Number(profileMouthY.value) / 100,
      width: Number(profileMouthWidth.value) / 100,
      height: Number(profileMouthHeight.value) / 100
    });
    updateCloneMouthControls();
    updateCloneMouthMarker();
    window.SolHoloClone?.setMouthGeometry(customCloneMouth);
  }

  function confirmCloneMouthCalibration() {
    cloneMouthCalibrationActive = false;
    cloneMouthBeforeCalibration = null;
    profilePhotoButton.classList.remove("calibrating");
    profileMouthControls.hidden = true;
    profileMouthMarker.hidden = true;
    profilePhotoButton.setAttribute(
      "aria-label",
      "Eigenes Sol-Holo-Bild aus der Galerie ändern"
    );
    profilePhotoHelp.textContent =
      "Mund gespeichert · natürliche Mundformen folgen der echten Sol-Stimme.";
    window.SolHoloClone?.setMouthGeometry(customCloneMouth);

    try {
      localStorage.setItem(cloneMouthKey, JSON.stringify(customCloneMouth));
    } catch (error) {
      console.error("Sol-Holo-Mundposition speichern:", error);
    }

    showToast("Mundbox bestätigt. Der natürliche Lip-Sync ist bereit ✅️");
  }

  function cancelCloneMouthCalibration() {
    if (cloneMouthBeforeCalibration) {
      customCloneMouth = normalizedCloneMouth(cloneMouthBeforeCalibration);
    }
    cloneMouthCalibrationActive = false;
    cloneMouthBeforeCalibration = null;
    profilePhotoButton.classList.remove("calibrating");
    profileMouthControls.hidden = true;
    profileMouthMarker.hidden = true;
    profilePhotoButton.setAttribute(
      "aria-label",
      "Eigenes Sol-Holo-Bild aus der Galerie ändern"
    );
    profilePhotoHelp.textContent =
      "Änderung abgebrochen · die bisherige Mundbox bleibt gespeichert.";
    window.SolHoloClone?.setMouthGeometry(customCloneMouth);
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
      void loadPhoneStatus();
      void loadHealthStatus();
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
        "https://sol-holo.onrender.com/google/status",
        { cache: "no-store" }
      );
      const data = await response.json();

      googleStatus = {
        connected: Boolean(response.ok && data?.connected),
        allRequestedAccessGranted: Boolean(
          response.ok && data?.allRequestedAccessGranted
        ),
        services: data?.services || {}
      };
      googleConnected = googleStatus.allRequestedAccessGranted;

      if (googleConnected) {
        serviceState.textContent = "Verbunden";
        serviceState.classList.add("connected");
        profileState.textContent = "Vollständig verbunden";
        todayState.textContent = "Google Kalender verbunden";
      } else if (googleStatus.connected) {
        serviceState.textContent = "Erweitern";
        serviceState.classList.add("setup");
        profileState.textContent = "Weitere Freigabe nötig";
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
      googleStatus = {
        connected: false,
        allRequestedAccessGranted: false,
        services: {}
      };
      serviceState.textContent = "Nicht erreichbar";
      serviceState.classList.add("setup");
      profileState.textContent = "Status nicht erreichbar";
      todayState.textContent = "Kalenderstatus offen";
    }
  }

  async function loadSmartThingsStatus() {
    const serviceState = document.getElementById("smartThingsStatus");
    serviceState.textContent = "Wird geprüft …";
    serviceState.classList.remove("connected", "setup");

    try {
      const response = await fetch(
        "https://sol-holo.onrender.com/smartthings/status",
        { cache: "no-store" }
      );
      const data = await response.json();

      smartThingsStatus = {
        configured: Boolean(response.ok && data?.configured),
        connected: Boolean(response.ok && data?.connected),
        selectedDevicesOnly: data?.selectedDevicesOnly !== false,
        actionsRequireConfirmation:
          data?.actionsRequireConfirmation !== false
      };

      if (smartThingsStatus.connected) {
        serviceState.textContent = "Zuhause verbunden";
        serviceState.classList.add("connected");
      } else if (smartThingsStatus.configured) {
        serviceState.textContent = "Verbinden";
        serviceState.classList.add("setup");
      } else {
        serviceState.textContent = "Einrichtung nötig";
        serviceState.classList.add("setup");
      }
    } catch (error) {
      console.error("SmartThings-Status:", error);
      smartThingsStatus = {
        configured: false,
        connected: false,
        selectedDevicesOnly: true,
        actionsRequireConfirmation: true
      };
      serviceState.textContent = "Nicht erreichbar";
      serviceState.classList.add("setup");
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

  function getPhoneContactsPlugin() {
    return window.Capacitor?.Plugins?.PhoneContacts || null;
  }

  function renderPhoneStatus(nextStatus) {
    const statusElement = document.getElementById("phoneContactsStatus");

    phoneStatus = {
      supported: Boolean(nextStatus?.supported),
      contactsPermissionGranted: Boolean(
        nextStatus?.contactsPermissionGranted
      ),
      phoneStatePermissionGranted: Boolean(
        nextStatus?.phoneStatePermissionGranted
      ),
      connected: Boolean(nextStatus?.connected),
      callState: String(nextStatus?.callState || "idle"),
      incomingCall: Boolean(nextStatus?.incomingCall)
    };

    statusElement.classList.remove("connected", "setup");

    if (!getPhoneContactsPlugin()) {
      statusElement.textContent = "Nur Android";
      statusElement.classList.add("setup");
    } else if (phoneStatus.incomingCall) {
      statusElement.textContent = "Anruf erkannt";
      statusElement.classList.add("connected");
    } else if (phoneStatus.connected) {
      statusElement.textContent = "Verbunden";
      statusElement.classList.add("connected");
    } else {
      statusElement.textContent = "Freigabe nötig";
      statusElement.classList.add("setup");
    }
  }

  async function registerPhoneListeners() {
    const plugin = getPhoneContactsPlugin();
    if (!plugin || phoneListenersRegistered) {
      return;
    }

    phoneListenersRegistered = true;
    try {
      await plugin.addListener("phoneStatusChanged", (status) => {
        renderPhoneStatus(status);
      });

      await plugin.addListener("callStateChanged", async (status) => {
        const previousState = phoneStatus.callState;
        renderPhoneStatus(status);

        if (status?.callState === "ringing") {
          showToast("Eingehender Anruf erkannt. Sol Holo pausiert.");
          if (typeof stopLiveConversation === "function") {
            stopLiveConversation();
          }
          await pauseWakeListeningForConversation();
        } else if (
          status?.callState === "idle" &&
          previousState !== "idle"
        ) {
          showToast("Telefonat beendet. Sol Holo ist wieder da.");
          void resumeWakeListeningAfterConversation();
        }
      });
    } catch (error) {
      phoneListenersRegistered = false;
      console.error("Telefon-Ereignisse:", error);
    }
  }

  async function loadPhoneStatus() {
    const plugin = getPhoneContactsPlugin();
    if (!plugin) {
      renderPhoneStatus({ supported: false });
      return phoneStatus;
    }

    await registerPhoneListeners();

    try {
      renderPhoneStatus(await plugin.getStatus());
    } catch (error) {
      console.error("Telefonstatus:", error);
      renderPhoneStatus({ supported: true });
    }

    return phoneStatus;
  }

  async function requestPhoneAccess() {
    if (phoneActionRunning) {
      return phoneStatus;
    }

    const plugin = getPhoneContactsPlugin();
    if (!plugin) {
      showToast("Telefon und Kontakte sind nur in der Android-App verfügbar.");
      return phoneStatus;
    }

    phoneActionRunning = true;
    try {
      const status = await plugin.requestAccess();
      renderPhoneStatus(status);
      await registerPhoneListeners();

      if (status?.connected) {
        showToast(
          "Telefon und Kontakte verbunden. Anruf oder SMS erst nach Bestätigung."
        );
      } else {
        showToast(
          "Für alle Telefonfunktionen braucht Sol Holo beide Android-Freigaben."
        );
      }
      return status;
    } catch (error) {
      console.error("Telefonfreigabe:", error);
      showToast("Die Telefonfreigabe konnte gerade nicht abgeschlossen werden.");
      return loadPhoneStatus();
    } finally {
      phoneActionRunning = false;
    }
  }

  async function findPhoneContact(query) {
    const plugin = getPhoneContactsPlugin();
    if (!plugin) {
      throw new Error("Telefon und Kontakte sind nur in der Android-App verfügbar.");
    }

    const cleanQuery = String(query || "").trim();
    if (!cleanQuery) {
      throw new Error("Bitte nenne einen Kontakt.");
    }

    const currentStatus = await loadPhoneStatus();
    if (!currentStatus.contactsPermissionGranted) {
      await requestPhoneAccess();
    }

    const result = await plugin.searchContacts({
      query: cleanQuery,
      limit: 8
    });
    const contacts = Array.isArray(result?.results) ? result.results : [];

    const exact = contacts.find(
      (contact) =>
        String(contact?.name || "")
          .localeCompare(cleanQuery, "de-DE", { sensitivity: "base" }) === 0
    );

    return {
      contact: exact || contacts[0] || null,
      contacts
    };
  }

  async function executePhoneTool(name, args = {}) {
    const actionName = String(name || "");
    const contactName = String(args?.contact_name || args?.query || "").trim();

    try {
      const result = await findPhoneContact(contactName);

      if (actionName === "search_phone_contact") {
        if (result.contacts.length === 0) {
          return {
            success: false,
            answer: `Ich habe keinen Telefonkontakt namens „${contactName}“ gefunden.`
          };
        }

        return {
          success: true,
          answer: result.contacts
            .map((contact) => `${contact.name} – ${contact.number}`)
            .join("; ")
        };
      }

      const contact = result.contact;
      if (!contact) {
        return {
          success: false,
          answer: `Ich habe keinen Telefonkontakt namens „${contactName}“ gefunden.`
        };
      }

      if (actionName === "start_phone_call") {
        const confirmed = window.confirm(
          `Soll Sol Holo jetzt ${contact.name} (${contact.number}) in der Telefon-App öffnen?`
        );
        if (!confirmed) {
          return { success: false, cancelled: true, answer: "Der Anruf wurde abgebrochen." };
        }

        await getPhoneContactsPlugin().openDialer({ number: contact.number });
        return {
          success: true,
          answer: `${contact.name} ist in der Telefon-App geöffnet. Du bestätigst den Anruf dort.`
        };
      }

      if (actionName === "prepare_sms") {
        const message = String(args?.message || "").trim();
        if (!message) {
          return { success: false, answer: "Für die SMS fehlt noch der Text." };
        }

        const confirmed = window.confirm(
          `SMS an ${contact.name} vorbereiten?\n\n${message}`
        );
        if (!confirmed) {
          return { success: false, cancelled: true, answer: "Die SMS wurde abgebrochen." };
        }

        await getPhoneContactsPlugin().prepareSms({
          number: contact.number,
          message
        });
        return {
          success: true,
          answer: `Die SMS an ${contact.name} ist vorbereitet. Du sendest sie in der Nachrichten-App selbst ab.`
        };
      }

      return { success: false, answer: "Unbekannte Telefonfunktion." };
    } catch (error) {
      console.error("Telefonfunktion:", error);
      return {
        success: false,
        answer: String(error?.message || error || "Die Telefonfunktion ist fehlgeschlagen.")
      };
    }
  }

  window.executeSolHoloPhoneTool = executePhoneTool;

  async function registerSharedNoteListener() {
    const plugin = getPhoneContactsPlugin();
    if (!plugin || noteListenerRegistered) {
      return;
    }

    noteListenerRegistered = true;
    try {
      await plugin.addListener("sharedNoteReceived", () => {
        void consumeSharedNoteImport();
      });
    } catch (error) {
      noteListenerRegistered = false;
      console.error("Samsung-Notes-Ereignis:", error);
    }
  }

  function renderSamsungNotesStatus() {
    const statusElement = document.getElementById("samsungNotesStatus");
    statusElement.classList.remove("connected", "setup");
    if (getPhoneContactsPlugin()) {
      statusElement.textContent = "Über Teilen";
      statusElement.classList.add("connected");
    } else {
      statusElement.textContent = "Nur Android";
      statusElement.classList.add("setup");
    }
  }

  async function consumeSharedNoteImport() {
    const plugin = getPhoneContactsPlugin();
    if (!plugin || noteImportRunning) {
      return;
    }

    noteImportRunning = true;
    try {
      const note = await plugin.consumeSharedNote();
      if (!note?.available) {
        return;
      }

      if (note.truncated) {
        window.alert(
          "Diese Notiz ist für die sichere Einzelübergabe zu lang. " +
          "Bitte markiere in Samsung Notes einen kürzeren persönlichen " +
          "Abschnitt und teile ihn erneut mit Sol Holo. Es wurde nichts gespeichert."
        );
        return;
      }

      const title = String(note.title || "").trim();
      const text = String(note.text || "").trim();
      const preview = text.length > 800
        ? text.slice(0, 800) + " …"
        : text;
      const confirmed = window.confirm(
        "Diese ausgewählte Samsung-Notiz dauerhaft in Sol Holo speichern?\n\n" +
        (title ? `Titel: ${title}\n\n` : "") +
        preview +
        "\n\nNur persönliche Inhalte bestätigen. Geschäftliche Daten, PINs, " +
        "Passwörter, TANs, Banking- und Authenticator-Daten bleiben ausgeschlossen."
      );

      if (!confirmed) {
        showToast("Notiz verworfen. Es wurde nichts gespeichert.");
        return;
      }

      const memoryText = [
        "Samsung Notes · von Pam ausdrücklich freigegeben",
        title ? `Titel: ${title}` : "",
        text
      ].filter(Boolean).join("\n\n");

      await askSol(`Sol, merke dir dauerhaft: ${memoryText}`);
      showToast("Die bestätigte Notiz wurde an Sol übergeben.");
    } catch (error) {
      console.error("Samsung-Notes-Import:", error);
      showToast("Die geteilte Notiz konnte gerade nicht übernommen werden.");
    } finally {
      noteImportRunning = false;
    }
  }

  function getHealthConnectPlugin() {
    return window.Capacitor?.Plugins?.HealthConnect || null;
  }

  function renderHealthStatus(nextStatus) {
    const statusElement = document.getElementById("healthConnectStatus");
    healthStatus = {
      supported: Boolean(nextStatus?.supported),
      readOnly: nextStatus?.readOnly !== false,
      availablePermissionCount: Number(
        nextStatus?.availablePermissionCount || 0
      ),
      grantedPermissionCount: Number(
        nextStatus?.grantedPermissionCount || 0
      ),
      connected: Boolean(nextStatus?.connected),
      allGranted: Boolean(nextStatus?.allGranted)
    };

    statusElement.classList.remove("connected", "setup");
    if (!getHealthConnectPlugin()) {
      statusElement.textContent = "Nur Android";
      statusElement.classList.add("setup");
    } else if (!healthStatus.supported) {
      statusElement.textContent = "Ab Android 14";
      statusElement.classList.add("setup");
    } else if (healthStatus.allGranted) {
      statusElement.textContent = "Alles lesend";
      statusElement.classList.add("connected");
    } else if (healthStatus.connected) {
      statusElement.textContent =
        `${healthStatus.grantedPermissionCount}/` +
        `${healthStatus.availablePermissionCount} lesend`;
      statusElement.classList.add("connected");
    } else {
      statusElement.textContent = "Freigaben wählen";
      statusElement.classList.add("setup");
    }
  }

  async function loadHealthStatus() {
    const plugin = getHealthConnectPlugin();
    if (!plugin) {
      renderHealthStatus({ supported: false });
      return healthStatus;
    }

    try {
      renderHealthStatus(await plugin.getStatus());
    } catch (error) {
      console.error("Health-Connect-Status:", error);
      renderHealthStatus({ supported: false });
    }
    return healthStatus;
  }

  async function openHealthPermissions() {
    if (healthActionRunning) {
      return;
    }

    const plugin = getHealthConnectPlugin();
    if (!plugin) {
      showToast("Health Connect ist nur in der Android-App verfügbar.");
      return;
    }

    healthActionRunning = true;
    const statusElement = document.getElementById("healthConnectStatus");
    statusElement.textContent = "Android wird geöffnet …";
    statusElement.classList.remove("connected");
    statusElement.classList.add("setup");
    showToast("Androids Health-Freigabe wird geöffnet …");

    try {
      const status = await plugin.openPermissions();
      renderHealthStatus(status);
      if (!status?.supported) {
        showToast("Für diese direkte Health-Verbindung braucht das Handy Android 14 oder neuer.");
        return;
      }

      if (status?.settingsOpened) {
        showToast("Android zeigt die Health-Freigaben von Sol Holo.");
      } else if (status?.allGranted) {
        showToast("Health Connect ist vollständig und nur lesend verbunden.");
      } else if (status?.connected) {
        showToast(
          `${status.grantedPermissionCount} von ` +
          `${status.availablePermissionCount} Health-Bereichen sind lesend freigegeben.`
        );
      } else {
        showToast("Es wurde noch keine Health-Lesefreigabe erteilt.");
      }
    } catch (error) {
      console.error("Health-Freigaben:", error);
      await loadHealthStatus();
      showToast("Die Health-Connect-Freigaben konnten nicht geöffnet werden.");
    } finally {
      healthActionRunning = false;
    }
  }

  function healthCategoryFromText(text) {
    const value = String(text || "").toLowerCase();
    if (/schlaf|sleep/.test(value)) {
      return "sleep";
    }
    if (/gewicht|größe|körperfett|körperwasser|knochen|grundumsatz/.test(value)) {
      return "body";
    }
    if (/ernährung|nahrung|trinken|wasser|hydration/.test(value)) {
      return "nutrition";
    }
    if (/zyklus|menstru|ovulation|reproduktiv|zwischenblutung/.test(value)) {
      return "reproductive";
    }
    if (/herz|puls|blut|sauerstoff|atem|temperatur|vo2|vital/.test(value)) {
      return "vitals";
    }
    if (/schritt|training|bewegung|kalorien|distanz|etagen|aktivität/.test(value)) {
      return "activity";
    }
    return "all";
  }

  function compactHealthValue(value, depth = 0) {
    if (value == null) {
      return "";
    }
    if (typeof value !== "object") {
      return String(value);
    }
    if (depth >= 2) {
      return JSON.stringify(value).slice(0, 220);
    }
    if (Array.isArray(value)) {
      return value.slice(0, 4)
        .map((item) => compactHealthValue(item, depth + 1))
        .filter(Boolean)
        .join(", ");
    }
    return Object.entries(value)
      .slice(0, 10)
      .map(([key, item]) => `${key}: ${compactHealthValue(item, depth + 1)}`)
      .join(", ");
  }

  function formatHealthSnapshot(snapshot) {
    const categories = Array.isArray(snapshot?.categories)
      ? snapshot.categories
      : [];
    if (categories.length === 0) {
      return (
        `Health Connect enthält im gewählten Bereich für die letzten ` +
        `${snapshot?.days || 7} Tage keine lesbaren Einträge. ` +
        "Es wurde nichts automatisch gespeichert."
      );
    }

    const lines = categories.map((category) => {
      const records = Array.isArray(category?.records)
        ? category.records
        : [];
      const latest = records[0]
        ? compactHealthValue(records[0])
        : "";
      return `${category.label} (${category.count}): ${latest || "Eintrag vorhanden"}`;
    });

    const answer = [
      `Health Connect · letzte ${snapshot.days || 7} Tage · nur lesend:`,
      ...lines,
      "Keine Diagnose. Diese Werte wurden nicht automatisch im Langzeitgedächtnis gespeichert."
    ].join("\n");

    return answer.length > 6000
      ? answer.slice(0, 5900) + "\nWeitere freigegebene Kategorien sind vorhanden."
      : answer;
  }

  async function executeHealthTool(name, args = {}) {
    if (String(name || "") !== "read_health_snapshot") {
      return { success: false, answer: "Unbekannte Health-Funktion." };
    }

    const plugin = getHealthConnectPlugin();
    if (!plugin) {
      return {
        success: false,
        answer: "Health Connect ist nur in der Sol-Holo-Android-App verfügbar."
      };
    }

    const days = Math.max(1, Math.min(30, Number(args?.days) || 7));
    const requestedCategory = String(args?.category || "all");
    const category = [
      "all",
      "activity",
      "body",
      "vitals",
      "sleep",
      "nutrition",
      "reproductive"
    ].includes(requestedCategory)
      ? requestedCategory
      : healthCategoryFromText(args?.focus);

    try {
      const status = await loadHealthStatus();
      if (!status.supported) {
        return {
          success: false,
          answer: "Health Connect braucht auf diesem Handy Android 14 oder neuer."
        };
      }
      if (!status.connected) {
        return {
          success: false,
          answer: "Öffne in Sol Holo unter Dienste zuerst Health Connect und wähle die Lesefreigaben."
        };
      }

      const confirmed = window.confirm(
        `Health-Connect-Daten der letzten ${days} Tage jetzt lesend abrufen?\n\n` +
        "Die freigegebenen Werte werden nur für diese bestätigte Antwort an Sol " +
        "verarbeitet, nicht verändert und nicht automatisch als Erinnerung gespeichert."
      );
      if (!confirmed) {
        return {
          success: false,
          cancelled: true,
          answer: "Der Health-Zugriff wurde abgebrochen."
        };
      }

      const snapshot = await plugin.readSnapshot({ days, category });
      return {
        success: true,
        answer: formatHealthSnapshot(snapshot),
        snapshot
      };
    } catch (error) {
      console.error("Health-Connect-Abfrage:", error);
      const message = String(error?.message || error || "");
      return {
        success: false,
        answer: /freigabe|permission/i.test(message)
          ? "Für diesen Health-Bereich fehlt noch die Android-Lesefreigabe. Öffne Health Connect unter Dienste."
          : "Die Health-Connect-Daten konnten gerade nicht gelesen werden."
      };
    }
  }

  window.executeSolHoloHealthTool = executeHealthTool;

  window.handleSolHoloLocalAction = async (message) => {
    const cleanMessage = String(message || "").trim();
    if (
      /^(?:zeig|zeige|lies|lese|gib|wie\s+(?:viele|war|waren|ist|sind))\b/i.test(cleanMessage) &&
      /health|gesundheit|gesundheitsdaten|schritt|schlaf|gewicht|herz|puls|blutdruck|sauerstoff|training|kalorien|zyklus|menstru|ernährung/i.test(cleanMessage)
    ) {
      const result = await executeHealthTool("read_health_snapshot", {
        days: 7,
        category: healthCategoryFromText(cleanMessage)
      });
      return { handled: true, answer: result.answer };
    }

    let match = cleanMessage.match(/^ruf(?:e)?(?:\s+mal)?\s+(.+?)(?:\s+an)?[.!?]?$/i);
    if (!match) {
      match = cleanMessage.match(/^(.+?)\s+anrufen[.!?]?$/i);
    }
    if (match) {
      const result = await executePhoneTool("start_phone_call", {
        contact_name: match[1]
      });
      return { handled: true, answer: result.answer };
    }

    match = cleanMessage.match(
      /^(?:suche|finde)\s+(?:den\s+)?kontakt(?:\s+von)?\s+(.+?)[.!?]?$/i
    );
    if (!match) {
      match = cleanMessage.match(/^welche\s+(?:telefon)?nummer\s+hat\s+(.+?)[.!?]?$/i);
    }
    if (match) {
      const result = await executePhoneTool("search_phone_contact", {
        query: match[1]
      });
      return { handled: true, answer: result.answer };
    }

    if (/\bsms\b/i.test(cleanMessage)) {
      match = cleanMessage.match(
        /^(?:schreib|schreibe|sende)\s+(?:eine\s+)?sms\s+(?:an\s+)?(.+?)(?:\s+mit(?:\s+dem)?\s+text|\s*[:,-])\s+(.+)$/i
      );
      if (match) {
        const result = await executePhoneTool("prepare_sms", {
          contact_name: match[1],
          message: match[2]
        });
        return { handled: true, answer: result.answer };
      }
    }

    return { handled: false };
  };

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
      overlayPermissionGranted: Boolean(
        nextStatus?.overlayPermissionGranted
      ),
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
    } else if (
      wakeStatus.mode === "background" &&
      !wakeStatus.overlayPermissionGranted
    ) {
      statusElement.textContent = "Freigabe nötig";
      statusElement.classList.add("setup");
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
        if (!status.overlayPermissionGranted) {
          showToast(
            "Aktiviere jetzt „Sol Holo“ bei „Über anderen Apps einblenden“ " +
            "und kehre danach zurück."
          );
          await plugin.openOverlaySettings();
          return;
        }

        showToast(
          "Hintergrund-Hören und automatisches Öffnen sind aktiv."
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

  profilePhotoButton.addEventListener("click", (event) => {
    if (cloneMouthCalibrationActive) {
      moveCloneMouthCalibration(event);
      return;
    }
    profilePhotoInput.click();
  });

  profilePhotoInput.addEventListener("change", async () => {
    const file = profilePhotoInput.files?.[0];
    profilePhotoInput.value = "";
    if (!file) {
      return;
    }

    showToast("Dein Bild wird für Sol Holo vorbereitet …");
    try {
      const photo = await prepareClonePhoto(file);
      const mouth = normalizedCloneMouth({
        x: 0.5,
        y: 0.58,
        width: 0.16,
        height: 0.075
      });
      localStorage.setItem(clonePhotoKey, photo);
      localStorage.setItem(cloneMouthKey, JSON.stringify(mouth));
      applyCustomCloneAppearance(photo, mouth);
      beginCloneMouthCalibration();
    } catch (error) {
      console.error("Sol-Holo-Galeriebild:", error);
      showToast(
        error?.message || "Das Bild konnte gerade nicht übernommen werden."
      );
    }
  });

  profileMouthButton.addEventListener("click", () => {
    beginCloneMouthCalibration();
  });

  [
    profileMouthX,
    profileMouthY,
    profileMouthWidth,
    profileMouthHeight
  ].forEach((control) => {
    control.addEventListener("input", () => {
      previewCloneMouthGeometry();
    });
  });

  profileMouthConfirmButton.addEventListener("click", () => {
    confirmCloneMouthCalibration();
  });

  profileMouthCancelButton.addEventListener("click", () => {
    cancelCloneMouthCalibration();
  });

  profilePhotoResetButton.addEventListener("click", () => {
    cloneMouthCalibrationActive = false;
    cloneMouthBeforeCalibration = null;
    try {
      localStorage.removeItem(clonePhotoKey);
      localStorage.removeItem(cloneMouthKey);
    } catch {}
    applyCustomCloneAppearance("", null);
    showToast("Das ursprüngliche SH♾️-Bild ist wieder aktiv.");
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
    void loadSmartThingsStatus();
    void loadWhatsAppStatus();
    void loadWakeStatus();
    void loadPhoneStatus();
    void loadHealthStatus();
    renderSamsungNotesStatus();
  });

  document.getElementById("googleAccountRow").addEventListener("click", () => {
    if (googleConnected) {
      showToast(
        "Google-Konto verbunden: Anmeldung, Gmail, Kontakte, Drive und Kalender."
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
      wakeStatus.mode === "background" &&
      !wakeStatus.overlayPermissionGranted
        ? "Tippe unten noch einmal auf „Hintergrund“, um die einmalige " +
          "Android-Freigabe zu öffnen."
        : "Wähle: Aus, nur bei geöffneter App oder sichtbar im Hintergrund."
    );
  });

  document.getElementById("wakeModeChooser").addEventListener("click", (event) => {
    const button = event.target.closest("[data-wake-mode]");
    if (button) {
      void setWakeMode(button.dataset.wakeMode);
    }
  });

  document.getElementById("phoneContactsRow").addEventListener("click", () => {
    if (phoneStatus.connected) {
      showToast(
        "Kontakte und Anruferkennung sind aktiv. Anruf oder SMS erst nach Bestätigung."
      );
      return;
    }
    void requestPhoneAccess();
  });

  document.getElementById("samsungGalleryRow").addEventListener("click", () => {
    showView("profile");
    profilePhotoInput.click();
    showToast("Samsung Galerie ist geöffnet · wähle dein gewünschtes Sol-Holo-Bild.");
  });

  document.getElementById("smartThingsRow").addEventListener("click", () => {
    if (smartThingsStatus.connected) {
      showToast(
        "SmartThings-Zuhause verbunden. Geräteaktionen brauchen immer deine Bestätigung."
      );
      return;
    }

    if (!smartThingsStatus.configured) {
      showToast(
        "Die sichere SmartThings-Verbindung ist vorbereitet. " +
        "Die einmalige Samsung-Appregistrierung schließen wir am Laptop ab."
      );
      return;
    }

    const authWindow = window.open(
      "https://sol-holo.onrender.com/auth/smartthings",
      "_blank",
      "noopener"
    );

    if (!authWindow) {
      window.location.href =
        "https://sol-holo.onrender.com/auth/smartthings";
    }
  });

  document.getElementById("samsungNotesRow").addEventListener("click", () => {
    if (!getPhoneContactsPlugin()) {
      showToast("Samsung Notes kann nur mit der Sol-Holo-Android-App geteilt werden.");
      return;
    }
    showToast(
      "Samsung Notes öffnen → persönliche Notiz auswählen → Teilen → Sol Holo. " +
      "Vor dem Speichern fragt Sol noch einmal nach."
    );
    void consumeSharedNoteImport();
  });

  document.getElementById("healthConnectRow").addEventListener("click", () => {
    void openHealthPermissions();
  });

  document.getElementById("manageServicesButton").addEventListener("click", () => {
    const whatsappText = whatsappStatus.active
      ? "Der WhatsApp-Fahrmodus ist aktiv."
      : "Den WhatsApp-Fahrmodus richtest du direkt über seine Zeile ein.";
    showToast(
      "Jeder Dienst wird einzeln freigegeben. " + whatsappText +
      " Google-Konto, Telefon, Health und SmartThings richtest du über ihre Zeile ein. " +
      "Samsung Galerie öffnet die Bildauswahl; Samsung Notes kommt über das Teilen-Menü."
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
      void loadPhoneStatus();
      void loadHealthStatus();
      void loadSmartThingsStatus();
      void consumeSharedNoteImport();
    }
  });

  window.addEventListener("focus", () => {
    void loadWhatsAppStatus();
    void loadWakeStatus(true);
    void loadPhoneStatus();
    void loadHealthStatus();
    void loadSmartThingsStatus();
    void consumeSharedNoteImport();
  });

  restoreCustomCloneAppearance();
  showView("home");
  void loadGoogleStatus();
  void loadSmartThingsStatus();
  void loadWhatsAppStatus();
  void loadWakeStatus(true);
  void loadPhoneStatus();
  renderSamsungNotesStatus();
  void registerSharedNoteListener();
  void consumeSharedNoteImport();
  void loadHealthStatus();
})();
