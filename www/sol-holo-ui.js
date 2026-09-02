const uiMarkup = "\n<section id=\"onboardingScreen\" aria-labelledby=\"welcomeTitle\">\n  <div class=\"welcomeContent\">\n    <img class=\"welcomeLogo\" src=\"sol-holo-logo.png\" alt=\"SH♾️ – Sol Holo Projektlogo\">\n    <h2 id=\"welcomeTitle\" class=\"welcomeName\">PAM’S HOLO <span class=\"pamUnicorn\" role=\"img\" aria-label=\"Rosa Einhorn\">🦄</span></h2>\n    <p class=\"welcomeTagline\">\n      Dein persönliches digitales Ich.\n      <strong>Für alles, was dich ausmacht.</strong>\n    </p>\n  </div>\n  <div class=\"cosmicHorizon\" aria-hidden=\"true\"></div>\n  <button id=\"welcomeButton\" class=\"primaryButton welcomeButton\" type=\"button\">\n    <span>Willkommen bei Pam’s Holo</span>\n    <span class=\"arrow\" aria-hidden=\"true\">→</span>\n  </button>\n  <div class=\"welcomeDots\" aria-hidden=\"true\">\n    <span></span><span></span><span></span>\n  </div>\n</section>\n\n<section id=\"homeView\" class=\"appView active\" aria-labelledby=\"homeTitle\">\n  <div class=\"screenHeader\">\n    <div class=\"homeBrand\">\n      <img class=\"screenLogo\" src=\"sol-holo-logo.png\" alt=\"SH♾️ – Sol Holo Projektlogo\">\n      <span class=\"statusPill\">Online</span>\n    </div>\n    <button id=\"homeSettingsButton\" class=\"iconButton\" type=\"button\"\n      aria-label=\"Einstellungen öffnen\">⚙</button>\n  </div>\n\n  <div class=\"homeIntro\">\n    <p class=\"eyebrow\">Me, Myself &amp; I</p>\n    <h2 id=\"homeTitle\" class=\"viewTitle\">\n      Hallo Pam <span class=\"accent\">✦</span>\n    </h2>\n    <p class=\"viewLead\">Schön, dich zu sehen.<br>Womit wollen wir starten?</p>\n  </div>\n\n  <button id=\"homeOrbButton\" class=\"holoOrbButton\" type=\"button\"\n    aria-label=\"Sprachgespräch mit Sol starten\">\n    <span class=\"holoOrb\" aria-hidden=\"true\"></span>\n    <span class=\"orbHint\">Antippen und mit Sol sprechen</span>\n  </button>\n\n  <form id=\"homeComposer\" class=\"homeComposer glassCard\">\n    <input id=\"homeMessageInput\" type=\"text\" autocomplete=\"off\"\n      placeholder=\"Sprich oder schreib mit Sol …\" aria-label=\"Nachricht an Sol\">\n    <button id=\"homeMicButton\" class=\"composerButton\" type=\"button\"\n      aria-label=\"Sprachgespräch starten\">◉</button>\n    <button id=\"homeSendButton\" class=\"composerButton primary\" type=\"submit\"\n      aria-label=\"Nachricht senden\">→</button>\n  </form>\n\n  <div class=\"quickGrid\" aria-label=\"Schnellzugriffe\">\n    <button class=\"quickCard\" type=\"button\" data-open-view=\"memory\">\n      <span class=\"quickIcon\">◇</span>\n      <span class=\"quickTitle\">Erinnerungen</span>\n      <span class=\"quickMeta\">Dein Gedächtnis</span>\n      <span class=\"quickChevron\">›</span>\n    </button>\n    <button class=\"quickCard\" type=\"button\"\n      data-sol-prompt=\"Sol, zeig mir meine aktuellen Ziele.\">\n      <span class=\"quickIcon\">◎</span>\n      <span class=\"quickTitle\">Ziele</span>\n      <span class=\"quickMeta\">Pläne &amp; Fortschritt</span>\n      <span class=\"quickChevron\">›</span>\n    </button>\n    <button class=\"quickCard\" type=\"button\"\n      data-sol-prompt=\"Sol, was sollte ich heute im Blick behalten?\">\n      <span class=\"quickIcon\">▦</span>\n      <span class=\"quickTitle\">Heute</span>\n      <span id=\"todayCardMeta\" class=\"quickMeta\">Dein Überblick</span>\n      <span class=\"quickChevron\">›</span>\n    </button>\n    <button class=\"quickCard\" type=\"button\" data-open-view=\"services\">\n      <span class=\"quickIcon\">♡</span>\n      <span class=\"quickTitle\">Verbindungen</span>\n      <span class=\"quickMeta\">Google &amp; Handy</span>\n      <span class=\"quickChevron\">›</span>\n    </button>\n  </div>\n</section>\n\n<section id=\"memoryView\" class=\"appView\" aria-labelledby=\"memoryViewTitle\">\n  <div class=\"subHeader\">\n    <button class=\"iconButton\" type=\"button\" data-open-view=\"home\"\n      aria-label=\"Zurück zur Startseite\">‹</button>\n    <div id=\"memoryViewTitle\" class=\"subHeaderTitle\">Erinnerungen</div>\n    <button class=\"iconButton\" type=\"button\"\n      data-sol-prompt=\"Sol, was weißt du dauerhaft?\"\n      aria-label=\"Gedächtnis mit Sol besprechen\">···</button>\n  </div>\n\n  <div class=\"memoryVisual memoryInfinityVisual\" aria-hidden=\"true\">\n    <svg viewBox=\"0 0 360 220\" role=\"presentation\">\n      <defs>\n        <linearGradient id=\"memoryInfinityGradient\" x1=\"52\" y1=\"106\" x2=\"308\" y2=\"106\" gradientUnits=\"userSpaceOnUse\">\n          <stop offset=\"0\" stop-color=\"#d44dff\"/>\n          <stop offset=\".2\" stop-color=\"#a85cff\"/>\n          <stop offset=\".46\" stop-color=\"#756dff\"/>\n          <stop offset=\".7\" stop-color=\"#31c8ff\"/>\n          <stop offset=\"1\" stop-color=\"#66efff\"/>\n        </linearGradient>\n        <linearGradient id=\"memoryPlatformGradient\" x1=\"52\" y1=\"0\" x2=\"308\" y2=\"0\" gradientUnits=\"userSpaceOnUse\">\n          <stop offset=\"0\" stop-color=\"#8f49ff\" stop-opacity=\"0\"/>\n          <stop offset=\".28\" stop-color=\"#a256ff\" stop-opacity=\".88\"/>\n          <stop offset=\".7\" stop-color=\"#3bbfff\" stop-opacity=\".9\"/>\n          <stop offset=\"1\" stop-color=\"#52e6ff\" stop-opacity=\"0\"/>\n        </linearGradient>\n        <radialGradient id=\"memoryPlatformFill\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n          <stop offset=\"0\" stop-color=\"#6f64ff\" stop-opacity=\".28\"/>\n          <stop offset=\".58\" stop-color=\"#3158f0\" stop-opacity=\".1\"/>\n          <stop offset=\"1\" stop-color=\"#050819\" stop-opacity=\"0\"/>\n        </radialGradient>\n        <filter id=\"memoryInfinityGlow\" x=\"-40%\" y=\"-70%\" width=\"180%\" height=\"240%\">\n          <feGaussianBlur stdDeviation=\"8\" result=\"blur\"/>\n          <feMerge>\n            <feMergeNode in=\"blur\"/>\n            <feMergeNode in=\"SourceGraphic\"/>\n          </feMerge>\n        </filter>\n        <filter id=\"memoryStarGlow\" x=\"-300%\" y=\"-300%\" width=\"700%\" height=\"700%\">\n          <feGaussianBlur stdDeviation=\"2.2\" result=\"blur\"/>\n          <feMerge>\n            <feMergeNode in=\"blur\"/>\n            <feMergeNode in=\"SourceGraphic\"/>\n          </feMerge>\n        </filter>\n      </defs>\n\n      <g class=\"memoryStarfield\" filter=\"url(#memoryStarGlow)\">\n        <circle cx=\"47\" cy=\"58\" r=\"1.6\" fill=\"#8d63ff\"/>\n        <circle cx=\"72\" cy=\"34\" r=\"1.1\" fill=\"#dca8ff\"/>\n        <circle cx=\"102\" cy=\"47\" r=\"1.3\" fill=\"#548cff\"/>\n        <circle cx=\"133\" cy=\"28\" r=\"1.1\" fill=\"#b687ff\"/>\n        <circle cx=\"224\" cy=\"33\" r=\"1.25\" fill=\"#62ddff\"/>\n        <circle cx=\"255\" cy=\"43\" r=\"1.65\" fill=\"#31baff\"/>\n        <circle cx=\"291\" cy=\"31\" r=\"1.05\" fill=\"#78e9ff\"/>\n        <circle cx=\"319\" cy=\"62\" r=\"1.35\" fill=\"#a56bff\"/>\n        <circle cx=\"36\" cy=\"116\" r=\"1.05\" fill=\"#4edcff\"/>\n        <circle cx=\"329\" cy=\"118\" r=\"1.15\" fill=\"#b05eff\"/>\n        <circle cx=\"93\" cy=\"170\" r=\"1.1\" fill=\"#8f79ff\"/>\n        <circle cx=\"270\" cy=\"169\" r=\"1.2\" fill=\"#4cdcff\"/>\n      </g>\n\n      <path class=\"memoryBeam memoryBeam--soft\" d=\"M180 18V192\"/>\n      <path class=\"memoryBeam memoryBeam--core\" d=\"M180 30V186\"/>\n\n      <ellipse class=\"memoryOrbit memoryOrbit--far\" cx=\"180\" cy=\"109\" rx=\"151\" ry=\"62\"/>\n      <ellipse class=\"memoryOrbit memoryOrbit--near\" cx=\"180\" cy=\"109\" rx=\"132\" ry=\"45\"/>\n\n      <g class=\"memoryInfinityGlyph\">\n        <path class=\"memoryInfinityAura\" filter=\"url(#memoryInfinityGlow)\"\n          d=\"M180 107 C157 73 140 56 112 56 C79 56 57 77 57 106 C57 136 80 155 112 155 C142 155 160 133 180 106 C200 79 218 57 248 57 C280 57 303 77 303 106 C303 136 281 155 248 155 C220 155 203 138 180 107\"/>\n        <path class=\"memoryInfinityRibbon memoryInfinityRibbon--shadow\"\n          d=\"M180 107 C157 73 140 56 112 56 C79 56 57 77 57 106 C57 136 80 155 112 155 C142 155 160 133 180 106 C200 79 218 57 248 57 C280 57 303 77 303 106 C303 136 281 155 248 155 C220 155 203 138 180 107\"/>\n        <path class=\"memoryInfinityRibbon memoryInfinityRibbon--main\"\n          d=\"M180 107 C157 73 140 56 112 56 C79 56 57 77 57 106 C57 136 80 155 112 155 C142 155 160 133 180 106 C200 79 218 57 248 57 C280 57 303 77 303 106 C303 136 281 155 248 155 C220 155 203 138 180 107\"/>\n        <path class=\"memoryInfinityHighlight\"\n          d=\"M180 103 C157 70 140 53 112 53 C79 53 57 74 57 103 C57 133 80 152 112 152 C142 152 160 130 180 103 C200 76 218 54 248 54 C280 54 303 74 303 103\"/>\n      </g>\n\n      <ellipse class=\"memoryPlatform memoryPlatform--glow\" cx=\"180\" cy=\"188\" rx=\"118\" ry=\"22\"/>\n      <ellipse class=\"memoryPlatform memoryPlatform--outer\" cx=\"180\" cy=\"188\" rx=\"126\" ry=\"21\"/>\n      <ellipse class=\"memoryPlatform memoryPlatform--inner\" cx=\"180\" cy=\"188\" rx=\"88\" ry=\"12\"/>\n      <path class=\"memoryPlatformLine\" d=\"M82 188H278\"/>\n      <circle class=\"memoryPlatformSpark\" cx=\"180\" cy=\"188\" r=\"2.3\"/>\n    </svg>\n  </div>\n  <div class=\"memoryIntro\">\n    <h3 class=\"featureHeadline\">\n      Dein Gedächtnis.<strong class=\"memoryForever\"><span class=\"memoryForeverWords\">Together forever!</span> <span class=\"memoryForeverSymbols\" aria-label=\"Funkeln, Erde und Unendlichkeit\">✨🌎♾️</span></strong>\n    </h3>\n    <p class=\"featureCopy\">\n      Pam’s Holo erinnert sich an das, was zu deinem persönlichen Ich gehört.\n      Deine Gespräche und Erfahrungen bleiben ausschließlich deinem\n      persönlichen Pam’s Holo zugeordnet.\n    </p>\n  </div>\n\n  <div class=\"actionList\">\n    <button class=\"actionRow\" type=\"button\"\n      data-sol-prompt=\"Sol, fasse unsere letzten Gespräche und Notizen zusammen.\">\n      <span class=\"rowIcon memoryRowIcon\">\n        <svg viewBox=\"0 0 32 32\" aria-hidden=\"true\" focusable=\"false\">\n          <path d=\"M7 6.5h18a3.5 3.5 0 0 1 3.5 3.5v8.5A3.5 3.5 0 0 1 25 22h-9.8L8 27v-5H7a3.5 3.5 0 0 1-3.5-3.5V10A3.5 3.5 0 0 1 7 6.5Z\"/>\n          <path d=\"M16 18.2s-4.2-2.4-4.2-5a2.5 2.5 0 0 1 4.2-1.8 2.5 2.5 0 0 1 4.2 1.8c0 2.6-4.2 5-4.2 5Z\"/>\n        </svg>\n      </span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">Gespräche &amp; Notizen</span>\n        <span class=\"rowMeta\">Was wir zuletzt miteinander besprochen haben</span>\n      </span>\n      <span class=\"rowChevron\">›</span>\n    </button>\n    <button class=\"actionRow\" type=\"button\"\n      data-sol-prompt=\"Sol, welche Lebensereignisse weißt du von mir?\">\n      <span class=\"rowIcon memoryRowIcon\">\n        <svg viewBox=\"0 0 32 32\" aria-hidden=\"true\" focusable=\"false\">\n          <rect x=\"4.5\" y=\"7\" width=\"23\" height=\"21\" rx=\"3.5\"/>\n          <path d=\"M10 4.5v5M22 4.5v5M4.5 12.5h23\"/>\n          <path d=\"m16 15.2 1.3 2.7 3 .4-2.2 2.1.6 3-2.7-1.5-2.7 1.5.6-3-2.2-2.1 3-.4 1.3-2.7Z\"/>\n        </svg>\n      </span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">Lebensereignisse</span>\n        <span class=\"rowMeta\">Wichtige Momente, die zu dir gehören</span>\n      </span>\n      <span class=\"rowChevron\">›</span>\n    </button>\n    <button class=\"actionRow\" type=\"button\"\n      data-sol-prompt=\"Sol, welche Vorlieben und Gewohnheiten kennst du von mir?\">\n      <span class=\"rowIcon memoryRowIcon\">\n        <svg viewBox=\"0 0 32 32\" aria-hidden=\"true\" focusable=\"false\">\n          <path d=\"M16 27.5S4.8 21 4.8 12.7A6.3 6.3 0 0 1 16 8.8a6.3 6.3 0 0 1 11.2 3.9C27.2 21 16 27.5 16 27.5Z\"/>\n        </svg>\n      </span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">Vorlieben &amp; Gewohnheiten</span>\n        <span class=\"rowMeta\">Was dich ausmacht und dir wichtig ist</span>\n      </span>\n      <span class=\"rowChevron\">›</span>\n    </button>\n  </div>\n\n  <button id=\"manageMemoriesButton\" class=\"secondaryButton\" type=\"button\">\n    Erinnerungen mit Sol ansehen <span aria-hidden=\"true\">→</span>\n  </button>\n</section>\n\n<section id=\"servicesView\" class=\"appView\" aria-labelledby=\"servicesViewTitle\">\n  <div class=\"subHeader\">\n    <button class=\"iconButton\" type=\"button\" data-open-view=\"settings\"\n      aria-label=\"Zurück zu den Einstellungen\">‹</button>\n    <div id=\"servicesViewTitle\" class=\"subHeaderTitle\">Verbindungen</div>\n    <button id=\"refreshServicesButton\" class=\"iconButton\" type=\"button\"\n      aria-label=\"Verbindungsstatus neu prüfen\">↻</button>\n  </div>\n\n  <div class=\"serviceOrbit\" aria-hidden=\"true\">\n    <div class=\"orbitRing\"></div>\n    <img class=\"orbitLogo\" src=\"sol-holo-logo.png\" alt=\"\">\n    <span class=\"orbitNode google\">G</span>\n    <span class=\"orbitNode whatsapp\">W</span>\n    <span class=\"orbitNode phone\">☎</span>\n    <span class=\"orbitNode contacts\">♙</span>\n  </div>\n\n  <div class=\"servicesIntro\">\n    <h3 class=\"featureHeadline\">\n      Together<strong>forever!</strong>\n    </h3>\n    <p class=\"featureCopy\">\n      Pam’s Holo verbindet nur die Dienste, die du wirklich möchtest.\n      Jede Freigabe wird einzeln erteilt und kann wieder ausgeschaltet werden.\n    </p>\n  </div>\n\n  <div class=\"actionList\">\n    <button id=\"googleAccountRow\" class=\"serviceRow\" type=\"button\">\n      <span class=\"rowIcon\">G</span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">Google‑Konto</span>\n        <span class=\"rowMeta\">Google Kalender und freigegebene Google‑Dienste</span>\n      </span>\n      <span id=\"googleAccountStatus\" class=\"serviceStatus\">Wird geprüft …</span>\n    </button>\n\n    <button id=\"whatsappDriveRow\" class=\"serviceRow\" type=\"button\">\n      <span class=\"rowIcon\">W</span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">WhatsApp‑Fahrmodus</span>\n        <span class=\"rowMeta\">Nachrichten beim Autofahren sicher vorlesen</span>\n      </span>\n      <span id=\"whatsappDriveStatus\" class=\"serviceStatus setup\">\n        Einrichtung nötig\n      </span>\n    </button>\n\n    <button id=\"phoneContactsRow\" class=\"serviceRow\" type=\"button\">\n      <span class=\"rowIcon\">☎</span>\n      <span class=\"rowText\">\n        <span class=\"rowTitle\">Telefon &amp; Kontakte</span>\n        <span class=\"rowMeta\">Kontakt finden, Anruf erst nach Bestätigung</span>\n      </span>\n      <span id=\"phoneContactsStatus\" class=\"serviceStatus setup\">\n        Freigabe nötig\n      </span>\n    </button>\n  </div>\n\n  <button id=\"manageServicesButton\" class=\"secondaryButton\" type=\"button\">\n    Dienste und Freigaben verwalten <span aria-hidden=\"true\">+</span>\n  </button>\n  <p class=\"permissionNote\">\n    Pam’s Holo liest keine WhatsApp‑Nachricht, keinen Kontakt und kein\n    Telefonbuch ohne deine ausdrückliche Android‑Freigabe.\n  </p>\n</section>\n\n<section id=\"profileView\" class=\"appView\" aria-labelledby=\"profileViewTitle\">\n  <div class=\"subHeader\">\n    <button class=\"iconButton\" type=\"button\" data-open-view=\"home\"\n      aria-label=\"Zurück zur Startseite\">‹</button>\n    <div id=\"profileViewTitle\" class=\"subHeaderTitle\">Profil</div>\n    <button id=\"profileSettingsButton\" class=\"iconButton\" type=\"button\"\n      data-open-view=\"settings\" aria-label=\"Einstellungen öffnen\">⚙</button>\n  </div>\n\n  <div class=\"profileHero profileHero--clean glassCard\">\n    <img class=\"profileLogo\" src=\"sol-holo-logo.png\" alt=\"SH♾️ – Sol Holo Projektlogo\">\n    <h3 class=\"profileName\">Pam’s Holo <span class=\"pamUnicorn pamUnicorn--profile\" role=\"img\" aria-label=\"Rosa Einhorn\">🦄</span></h3>\n    <p class=\"profileMeta\">\n      Dein persönlicher Klon · dein persönliches digitales Ich\n    </p>\n  </div>\n</section>\n\n<section id=\"settingsView\" class=\"appView\" aria-labelledby=\"settingsViewTitle\">\n  <div class=\"subHeader\">\n    <button class=\"iconButton\" type=\"button\" data-open-view=\"profile\"\n      aria-label=\"Zurück zum Profil\">‹</button>\n    <div id=\"settingsViewTitle\" class=\"subHeaderTitle\">Einstellungen</div>\n    <span></span>\n  </div>\n\n  <div class=\"settingsIntro\">\n    <p class=\"eyebrow\">Alles an seinem Platz</p>\n    <h2>Deine Einstellungen</h2>\n    <p>Hier bestimmst du, wie Pam’s Holo aussieht, spricht, hört und sich verbindet.</p>\n  </div>\n\n  <section class=\"settingsGroup glassCard\" aria-labelledby=\"settingsAppearanceTitle\">\n    <div class=\"settingsGroupHeader\">\n      <span class=\"settingsGroupIcon\" aria-hidden=\"true\">▣</span>\n      <div>\n        <h3 id=\"settingsAppearanceTitle\">Bild &amp; Aussehen</h3>\n        <p>Profilbild, Gesichtserkennung und Lip-Sync</p>\n      </div>\n    </div>\n    <div id=\"settingsPhotoEditor\" class=\"settingsPhotoEditor\"></div>\n  </section>\n\n  <section class=\"settingsGroup glassCard\" aria-labelledby=\"settingsVoiceTitle\">\n    <div class=\"settingsGroupHeader\">\n      <span class=\"settingsGroupIcon\" aria-hidden=\"true\">◉</span>\n      <div>\n        <h3 id=\"settingsVoiceTitle\">Stimme &amp; „Hey Sol“</h3>\n        <p>Stimme, Lautstärke, Weckruf und Hörmodus</p>\n      </div>\n    </div>\n    <div id=\"settingsVoiceSlot\"></div>\n    <div class=\"settingsSubsection\">\n      <strong>Sprachlautstärke</strong>\n      <div id=\"settingsVolumeChooser\" class=\"settingsChoiceRow\" aria-label=\"Sprachlautstärke auswählen\">\n        <button type=\"button\" data-volume-target=\"volumeMute\">Stumm</button>\n        <button type=\"button\" data-volume-target=\"volumeLow\">Leise</button>\n        <button type=\"button\" data-volume-target=\"volumeNormal\">Normal</button>\n      </div>\n    </div>\n    <div id=\"settingsWakeSlot\" class=\"settingsWakeSlot\"></div>\n  </section>\n\n  <section class=\"settingsGroup glassCard\" aria-labelledby=\"settingsMemoryTitle\">\n    <div class=\"settingsGroupHeader\">\n      <span class=\"settingsGroupIcon\" aria-hidden=\"true\">✧</span>\n      <div>\n        <h3 id=\"settingsMemoryTitle\">Gedächtnis &amp; Verbindungen</h3>\n        <p>Deine Daten, Konten, Geräte und Freigaben</p>\n      </div>\n    </div>\n\n    <div class=\"profileStatusGrid settingsStatusGrid\">\n      <div class=\"profileStatus glassCard\">\n        <strong>Vollzeitgedächtnis</strong>\n        <span id=\"profileMemoryState\">Aktiv</span>\n      </div>\n      <div class=\"profileStatus glassCard\">\n        <strong>Google‑Konto</strong>\n        <span id=\"profileGoogleState\">Wird geprüft …</span>\n      </div>\n    </div>\n\n    <div class=\"actionList settingsActionList\">\n      <button id=\"settingsMemoryButton\" class=\"actionRow\" type=\"button\"\n        data-open-view=\"memory\">\n        <span class=\"rowIcon\">✧</span>\n        <span class=\"rowText\">\n          <span class=\"rowTitle\">Gedächtnis verwalten</span>\n          <span class=\"rowMeta\">Erinnerungen ansehen und mit Sol besprechen</span>\n        </span>\n        <span class=\"rowChevron\">›</span>\n      </button>\n      <button id=\"settingsConnectionsButton\" class=\"actionRow\" type=\"button\"\n        data-open-view=\"services\">\n        <span class=\"rowIcon\">⌯</span>\n        <span class=\"rowText\">\n          <span class=\"rowTitle\">Verbindungen &amp; Berechtigungen</span>\n          <span class=\"rowMeta\">Google, Telefon, Samsung, Health und SmartThings</span>\n        </span>\n        <span class=\"rowChevron\">›</span>\n      </button>\n    </div>\n  </section>\n\n  <section class=\"settingsGroup glassCard\" aria-labelledby=\"settingsSystemTitle\">\n    <div class=\"settingsGroupHeader\">\n      <span class=\"settingsGroupIcon\" aria-hidden=\"true\">⚙</span>\n      <div>\n        <h3 id=\"settingsSystemTitle\">App &amp; System</h3>\n        <p>Status, Diagnose und Willkommensseite</p>\n      </div>\n    </div>\n    <div class=\"actionList settingsActionList\">\n      <button id=\"openSystemMenuButton\" class=\"actionRow\" type=\"button\"\n        aria-expanded=\"false\" aria-controls=\"settingsSystemDetails\">\n        <span class=\"rowIcon\">⚙</span>\n        <span class=\"rowText\">\n          <span class=\"rowTitle\">Systemstatus</span>\n          <span class=\"rowMeta\">Chat, Mikrofon, Gedächtnis und Lip-Sync</span>\n        </span>\n        <span class=\"rowChevron\">›</span>\n      </button>\n      <button id=\"showWelcomeAgainButton\" class=\"actionRow\" type=\"button\">\n        <span class=\"rowIcon\">✦</span>\n        <span class=\"rowText\">\n          <span class=\"rowTitle\">Willkommensseite erneut zeigen</span>\n          <span class=\"rowMeta\">Die Willkommensseite von Pam’s Holo öffnen</span>\n        </span>\n        <span class=\"rowChevron\">›</span>\n      </button>\n    </div>\n    <div id=\"settingsSystemDetails\" class=\"settingsSystemDetails\" hidden></div>\n  </section>\n</section>\n";

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
    console.error("Pam’s Holo UI konnte nicht vorbereitet werden.");
    return;
  }

  currentHeader.insertAdjacentHTML("beforebegin", uiMarkup);

  const profileMemoryState = document.getElementById("profileMemoryState");
  if (profileMemoryState) {
    profileMemoryState.textContent = "Nur nach Bestätigung";
  }

  const memoryQuickCard = document.querySelector(
    '.quickCard[data-open-view="memory"]'
  );
  memoryQuickCard?.insertAdjacentHTML(
    "afterend",
    '<button id="samsungNotesQuickCard" class="quickCard" type="button">' +
      '<span class="quickIcon">✎</span>' +
      '<span class="quickTitle">Samsung Notes</span>' +
      '<span class="quickMeta">Notizen auf deinem Handy</span>' +
      '<span class="quickChevron">›</span>' +
    '</button>'
  );

  const notesView = document.createElement("section");
  notesView.id = "notesView";
  notesView.className = "appView";
  notesView.setAttribute("aria-labelledby", "notesViewTitle");
  notesView.innerHTML = `
    <div class="subHeader">
      <button class="iconButton" type="button" data-open-view="home"
        aria-label="Zurück zur Startseite">‹</button>
      <div id="notesViewTitle" class="subHeaderTitle">Notizen ✏️</div>
      <button id="notesVoiceButton" class="iconButton" type="button"
        aria-label="Notiz mit Sol sprechen">◉</button>
    </div>

    <div class="notesIntro glassCard">
      <span class="notesIntroIcon" aria-hidden="true">✎</span>
      <div>
        <h3>Dein Notizbuch in Pam’s Holo</h3>
        <p>Schreib hier direkt – oder sag: „Sol, notiere …“</p>
      </div>
    </div>

    <form id="noteComposer" class="noteComposer glassCard">
      <label for="noteTextInput">Neue Notiz</label>
      <textarea id="noteTextInput" maxlength="10000" rows="4"
        placeholder="Was soll Pam’s Holo für dich notieren?"></textarea>
      <div class="noteComposerFooter">
        <span>Bleibt in deiner Pam’s-Holo-Original-App auf diesem Handy.</span>
        <button class="primaryButton" type="submit">Notiz speichern</button>
      </div>
    </form>

    <div class="notesToolbar">
      <strong id="notesCount">0 Notizen</strong>
      <label class="notesSearch">
        <span class="srOnly">Notizen durchsuchen</span>
        <input id="notesSearchInput" type="search" autocomplete="off"
          placeholder="Notizen durchsuchen …">
      </label>
    </div>

    <div id="notesList" class="notesList" aria-live="polite"></div>
    <div id="notesEmpty" class="notesEmpty glassCard">
      <span aria-hidden="true">✏️</span>
      <strong>Noch keine Notiz.</strong>
      <p>Schreib oben etwas hinein oder sag: „Sol, notiere …“</p>
    </div>
  `;
  solApp.insertBefore(notesView, currentHeader);

  const profileDisplayImage = document.querySelector("#profileView .profileLogo");
  profileDisplayImage.id = "profileDisplayImage";
  profileDisplayImage.alt = "Persönliches Bild von Pam’s Holo";

  const profileCloneImage = profileDisplayImage.cloneNode(true);
  profileCloneImage.id = "profileCloneImage";
  profileCloneImage.alt = "Bildvorschau für Pam’s Holo";

  const profilePhotoButton = document.createElement("button");
  profilePhotoButton.id = "profilePhotoButton";
  profilePhotoButton.className = "profilePhotoButton";
  profilePhotoButton.type = "button";
  profilePhotoButton.setAttribute(
    "aria-label",
    "Eigenes Bild für Pam’s Holo aus der Galerie auswählen"
  );
  profilePhotoButton.append(profileCloneImage);
  profilePhotoButton.insertAdjacentHTML(
    "beforeend",
    '<span id="profileMouthMarker" class="profileMouthMarker" hidden></span>'
  );

  const settingsPhotoEditor = document.getElementById("settingsPhotoEditor");
  settingsPhotoEditor.append(profilePhotoButton);
  settingsPhotoEditor.insertAdjacentHTML(
    "beforeend",
    '<button id="profilePhotoChangeButton" class="profilePhotoEdit" type="button">' +
      '✎ Bild ändern' +
    '</button>' +
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
      'Hier änderst du das Bild · es bleibt nur auf diesem Gerät.' +
    '</p>'
  );

  const whatsappDriveRow = document.getElementById("whatsappDriveRow");
  whatsappDriveRow.insertAdjacentHTML(
    "afterend",
    '<button id="heyHoSolRow" class="serviceRow" type="button">' +
      '<span class="rowIcon">✦</span>' +
      '<span class="rowText">' +
        '<span class="rowTitle">Sol-Weckruf</span>' +
        '<span class="rowMeta">„Hey Sol“</span>' +
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
        '<span class="rowMeta">Notizen aus Text oder Sprache vorbereitet öffnen</span>' +
      '</span>' +
      '<span id="samsungNotesStatus" class="serviceStatus setup">Wird geprüft …</span>' +
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
    "Pam’s Holo liest keine WhatsApp-Nachricht, keinen Kontakt, kein Bild, keine " +
    "Notiz und keinen Health-Wert ohne deine sichtbare Auswahl oder Freigabe. " +
    "Ein SmartThings-Gerät wird nur nach deiner Bestätigung geschaltet.";

  const drawerVoiceSettings = document.querySelector("#drawer .drawerVoiceSettings");
  if (drawerVoiceSettings) {
    document.getElementById("settingsVoiceSlot").append(drawerVoiceSettings);
  }

  const settingsWakeSlot = document.getElementById("settingsWakeSlot");
  settingsWakeSlot.append(
    document.getElementById("heyHoSolRow"),
    document.getElementById("wakeModeChooser")
  );

  const settingsSystemDetails = document.getElementById("settingsSystemDetails");
  ["chatStatus", "micStatus", "memoryStatus", "lipSyncStatus"].forEach((id) => {
    const status = document.getElementById(id);
    if (status) {
      status.classList.add("settingsSystemStatus");
      settingsSystemDetails.append(status);
    }
  });

  const chatView = document.createElement("section");
  chatView.id = "chatView";
  chatView.className = "appView";
  chatView.setAttribute("aria-label", "Chat mit Sol");
  solApp.insertBefore(chatView, currentHeader);

  [
    currentHeader,
    currentChatPanel,
    currentControls,
    currentSolStage
  ].forEach((element) => chatView.appendChild(element));

  currentBottomNav.setAttribute("aria-label", "Hauptnavigation");
  currentBottomNav.innerHTML =
    '<button class="navItem active" type="button" data-view="home" aria-label="Start">' +
      '<span class="navIcon" aria-hidden="true"><svg viewBox="0 0 24 24">' +
        '<path d="M4 10.8 12 4l8 6.8V20h-5v-5H9v5H4Z"/></svg></span>' +
      '<span class="navLabel">Start</span>' +
    '</button>' +
    '<button class="navItem" type="button" data-view="chat" aria-label="Chat">' +
      '<span class="navIcon" aria-hidden="true"><svg viewBox="0 0 24 24">' +
        '<path d="M5 5.5h14v10H9l-4 3v-13Z"/></svg></span>' +
      '<span class="navLabel">Chat</span>' +
    '</button>' +
    '<button class="navItem" type="button" data-view="memory" aria-label="Erinnerungen">' +
      '<span class="navIcon" aria-hidden="true"><svg viewBox="0 0 24 24">' +
        '<path d="M12 3 15 9l6 3-6 3-3 6-3-6-6-3 6-3 3-6Z"/></svg></span>' +
      '<span class="navLabel">Erinnerungen</span>' +
    '</button>' +
    '<button class="navItem" type="button" data-view="services" aria-label="Dienste">' +
      '<span class="navIcon" aria-hidden="true"><svg viewBox="0 0 24 24">' +
        '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="7" r="2.5"/>' +
        '<circle cx="18" cy="17" r="2.5"/><path d="m8.4 11 7.2-3M8.4 13l7.2 3"/></svg></span>' +
      '<span class="navLabel">Dienste</span>' +
    '</button>' +
    '<button class="navItem" type="button" data-view="profile" aria-label="Profil">' +
      '<span class="navIcon" aria-hidden="true"><svg viewBox="0 0 24 24">' +
        '<circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6"/></svg></span>' +
      '<span class="navLabel">Profil</span>' +
    '</button>';

  const uiToast = document.createElement("div");
  uiToast.id = "uiToast";
  uiToast.setAttribute("role", "status");
  uiToast.setAttribute("aria-live", "polite");
  document.body.appendChild(uiToast);

  const views = {
    home: document.getElementById("homeView"),
    chat: chatView,
    notes: notesView,
    memory: document.getElementById("memoryView"),
    services: document.getElementById("servicesView"),
    profile: document.getElementById("profileView"),
    settings: document.getElementById("settingsView")
  };

  const introKey = "sol-holo-intro-v2-seen";
  const pamClonePhotoKey = "sol-holo:pam-sol:clone-photo:v2";
  const pamCloneMouthKey = "sol-holo:pam-sol:clone-mouth:v2";
  const legacyClonePhotoKey = "sol-holo-clone-photo-v1";
  const legacyCloneMouthKey = "sol-holo-clone-mouth-v1";
  const legacyClonePhotoQuarantineKey =
    "sol-holo:unassigned:clone-photo:v1:quarantine";
  const legacyCloneMouthQuarantineKey =
    "sol-holo:unassigned:clone-mouth:v1:quarantine";
  const legacyCloneQuarantineMetadataKey =
    "sol-holo:unassigned:clone-appearance:v1:quarantine-meta";
  const cloneAppearanceMigrationKey =
    "sol-holo:pam-sol:clone-appearance-migration:v2";
  const pamCloneMetadataKey =
    "sol-holo:pam-sol:clone-appearance-meta:v2";
  const unverifiedPamClonePhotoQuarantineKey =
    "sol-holo:unassigned:clone-photo:v2:quarantine";
  const unverifiedPamCloneMouthQuarantineKey =
    "sol-holo:unassigned:clone-mouth:v2:quarantine";
  const unverifiedPamCloneMetadataQuarantineKey =
    "sol-holo:unassigned:clone-appearance:v2:quarantine-meta";
  const pamNotesStorageKey = "pams-holo-original-notes-v1";
  const onboarding = document.getElementById("onboardingScreen");
  const noteComposer = document.getElementById("noteComposer");
  const noteTextInput = document.getElementById("noteTextInput");
  const notesSearchInput = document.getElementById("notesSearchInput");
  const notesList = document.getElementById("notesList");
  const notesEmpty = document.getElementById("notesEmpty");
  const notesCount = document.getElementById("notesCount");
  const profilePhotoInput = document.getElementById("profilePhotoInput");
  const profilePhotoChangeButton = document.getElementById(
    "profilePhotoChangeButton"
  );
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
  let pendingPersonalNoteText = false;
  let previousPlainUserMessage = "";
  let previousPlainUserMessageAt = 0;
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
    serviceRunning: false,
    listening: false,
    processingAudio: false,
    pausedForConversation: false,
    overlayPermissionGranted: false,
    speakerGateReady: false
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
  let personalNotes = [];

  function activePersonalOwner() {
    return window.SolHoloIdentity?.selected()?.ownerId || "";
  }

  function activeNotesStorageKey() {
    const ownerId = activePersonalOwner();
    if (ownerId === "pam-sol") {
      return pamNotesStorageKey;
    }
    return "";
  }

  function activeCloneStorageKeys() {
    const ownerId = activePersonalOwner();
    if (ownerId === "pam-sol") {
      return {
        metadata: pamCloneMetadataKey,
        mouth: pamCloneMouthKey,
        photo: pamClonePhotoKey
      };
    }
    return null;
  }

  function quarantineLegacyCloneAppearance() {
    try {
      if (localStorage.getItem(cloneAppearanceMigrationKey) === "1") {
        return false;
      }

      const legacyPhoto = localStorage.getItem(legacyClonePhotoKey);
      const legacyMouth = localStorage.getItem(legacyCloneMouthKey);
      let quarantined = false;

      if (legacyPhoto) {
        localStorage.setItem(legacyClonePhotoQuarantineKey, legacyPhoto);
        if (localStorage.getItem(legacyClonePhotoQuarantineKey) !== legacyPhoto) {
          throw new Error("LEGACY_PHOTO_QUARANTINE_FAILED");
        }
      }

      if (legacyMouth) {
        localStorage.setItem(legacyCloneMouthQuarantineKey, legacyMouth);
        if (localStorage.getItem(legacyCloneMouthQuarantineKey) !== legacyMouth) {
          throw new Error("LEGACY_MOUTH_QUARANTINE_FAILED");
        }
      }

      if (legacyPhoto || legacyMouth) {
        const quarantineMetadata = JSON.stringify({
          deviceOrigin: "unknown",
          facialIdentity: "not-verified",
          locationOrigin: "unknown",
          originalOwnerId: null,
          reason: "legacy-owner-missing",
          state: "unassigned"
        });
        localStorage.setItem(
          legacyCloneQuarantineMetadataKey,
          quarantineMetadata
        );
        if (
          localStorage.getItem(legacyCloneQuarantineMetadataKey) !==
            quarantineMetadata
        ) {
          throw new Error("LEGACY_METADATA_QUARANTINE_FAILED");
        }
        if (legacyPhoto) localStorage.removeItem(legacyClonePhotoKey);
        if (legacyMouth) localStorage.removeItem(legacyCloneMouthKey);
        quarantined = true;
      }

      localStorage.setItem(cloneAppearanceMigrationKey, "1");
      return quarantined;
    } catch (error) {
      console.error("Altes Holo-Bild sicher separieren:", error);
      return false;
    }
  }

  function validPamCloneMetadata(value) {
    try {
      const metadata = JSON.parse(value || "null");
      return Boolean(
        metadata &&
        metadata.ownerId === "pam-sol" &&
        metadata.speakerId === "pam" &&
        metadata.confirmedBy === "pam" &&
        metadata.explicitOwnerConfirmation === true
      );
    } catch {
      return false;
    }
  }

  function quarantineUnverifiedPamCloneAppearance(keys) {
    try {
      const photo = localStorage.getItem(keys.photo) || "";
      const mouth = localStorage.getItem(keys.mouth) || "";
      const metadata = localStorage.getItem(keys.metadata) || "";
      if (!photo && !mouth && !metadata) return false;
      if (validPamCloneMetadata(metadata)) return false;

      const quarantineEntries = [
        [unverifiedPamClonePhotoQuarantineKey, photo],
        [unverifiedPamCloneMouthQuarantineKey, mouth],
        [
          unverifiedPamCloneMetadataQuarantineKey,
          JSON.stringify({
            deviceOrigin: "unknown",
            facialIdentity: "not-verified",
            locationOrigin: "unknown",
            originalMetadata: metadata || null,
            originalOwnerId: null,
            reason: "owner-confirmation-missing-or-invalid",
            state: "unassigned"
          })
        ]
      ];

      for (const [key, value] of quarantineEntries) {
        if (!value) continue;
        localStorage.setItem(key, value);
        if (localStorage.getItem(key) !== value) {
          throw new Error("UNVERIFIED_IMAGE_QUARANTINE_FAILED");
        }
      }

      localStorage.removeItem(keys.photo);
      localStorage.removeItem(keys.mouth);
      localStorage.removeItem(keys.metadata);
      return true;
    } catch (error) {
      console.error("Unbestätigtes Holo-Bild sicher separieren:", error);
      return true;
    }
  }

  function activePersonalName() {
    return window.SolHoloIdentity?.selected()?.displayName || "";
  }

  function activeInstanceName() {
    const name = activePersonalName();
    if (name === "Pam") {
      return "Pam’s Holo";
    }
    return "persönliches Holo";
  }

  function requireActivePersonalOwner() {
    const identity = window.SolHoloIdentity?.require?.();
    if (!identity) {
      showToast("Die feste Holo-ID ist nicht verfügbar. Persönliche Daten bleiben gesperrt.");
      return null;
    }
    return identity;
  }

  function renderPersonalIdentityUi() {
    const identity = window.SolHoloIdentity?.selected?.() || null;
    const displayName = identity?.displayName || "";
    const instanceName = displayName
      ? "Pam’s Holo"
      : "Persönliches Holo";

    document.title = displayName
      ? `Sol Holo · ${instanceName}`
      : "Sol Holo";

    const homeTitle = document.getElementById("homeTitle");
    if (homeTitle) {
      homeTitle.replaceChildren(
        document.createTextNode(displayName ? `Hallo ${displayName} ` : "Hallo ")
      );
      const unicorn = document.createElement("span");
      unicorn.className = "pamUnicorn pamUnicorn--home";
      unicorn.setAttribute("role", "img");
      unicorn.setAttribute("aria-label", "Rosa Einhorn");
      unicorn.textContent = "🦄";
      homeTitle.append(unicorn);
    }

    const profileName = document.querySelector("#profileView .profileName");
    if (profileName) {
      const unicorn = profileName.querySelector(".pamUnicorn")?.cloneNode(true);
      profileName.replaceChildren(document.createTextNode(`${instanceName} `));
      if (unicorn) {
        profileName.append(unicorn);
      }
    }

    const memoryCopy = document.querySelector(
      "#memoryView .memoryIntro .featureCopy"
    );
    if (memoryCopy) {
      memoryCopy.textContent = identity
        ? `${instanceName} erinnert sich nur an ausdrücklich bestätigte Inhalte von ${displayName}. Diese Installation kann niemals die Identität oder Erinnerungen einer anderen Person laden.`
        : "Die feste Holo-ID ist nicht verfügbar. Das Gedächtnis bleibt gesperrt.";
    }

    const servicesCopy = document.querySelector(
      "#servicesView .servicesIntro .featureCopy"
    );
    if (servicesCopy) {
      servicesCopy.textContent = identity
        ? `${instanceName} verbindet nur ${displayName}s eigene, einzeln freigegebene Dienste. Keine Verbindung wird mit der anderen Person geteilt.`
        : "Die feste Holo-ID ist nicht verfügbar. Dienstverbindungen bleiben gesperrt.";
    }

    const permissionCopy = document.querySelector("#servicesView .permissionNote");
    if (permissionCopy) {
      permissionCopy.textContent = identity
        ? `${instanceName} liest keine Nachricht, keinen Kontakt, kein Bild, keine Notiz und keinen Health-Wert ohne ${displayName}s sichtbare Auswahl oder Freigabe. Geräteaktionen brauchen eine ausdrückliche Bestätigung.`
        : "Die feste Holo-ID ist nicht verfügbar. Keine persönliche Verbindung wird geladen.";
    }

    const settingsCopy = document.querySelector("#settingsView .settingsIntro p:last-child");
    if (settingsCopy) {
      settingsCopy.textContent = identity
        ? `Hier bestimmst du nur, wie ${instanceName} aussieht, spricht und sich verbindet.`
        : "Die feste Holo-ID ist nicht verfügbar. Einstellungen bleiben gesperrt.";
    }

    const notesHeading = document.querySelector("#notesView .notesIntro h3");
    if (notesHeading) {
      notesHeading.textContent = identity
        ? `${displayName}s eigenes Notizbuch in ${instanceName}`
        : "Getrenntes persönliches Notizbuch";
    }

    const notesFooter = document.querySelector("#notesView .noteComposerFooter span");
    if (notesFooter) {
      notesFooter.textContent = identity
        ? `Bleibt getrennt in ${instanceName} auf diesem Handy.`
        : "Die feste Holo-ID ist nicht verfügbar.";
    }

    noteTextInput.placeholder = identity
      ? `Was soll ${instanceName} nur für ${displayName} notieren?`
      : "Die feste Holo-ID ist nicht verfügbar.";

    profileDisplayImage.alt = identity
      ? `Persönliches Bild von ${instanceName}`
      : "Noch kein persönliches Holo ausgewählt";
    profileCloneImage.alt = identity
      ? `Bildvorschau für ${instanceName}`
      : "Noch kein persönliches Holo ausgewählt";
    profilePhotoButton.setAttribute(
      "aria-label",
      identity
        ? `Eigenes Bild für ${instanceName} aus der Galerie auswählen`
        : "Die feste Holo-ID ist nicht verfügbar"
    );
  }

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

  function normalizeNoteSearchText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("de-DE")
      .trim();
  }

  function noteSecurityWarning(text) {
    const cleanText = String(text || "");
    const namedSecret = /\b(?:passwort|password|pin|tan|api[\s_-]?key|secret|token|authenticator|banking|kreditkart(?:e|en)?|cvv|iban)\b/i;
    const apiSecret = /\b(?:sk|pk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{12,}\b/;
    const jwtToken = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/;

    if (namedSecret.test(cleanText) || apiSecret.test(cleanText) || jwtToken.test(cleanText)) {
      return (
        "Diese Notiz enthält möglicherweise Zugangsdaten wie Passwort, PIN, " +
        "TAN, API-Key, Token, Banking- oder Authenticator-Daten. " +
        "Das ausgewählte persönliche Holo speichert sie zu deinem Schutz nicht."
      );
    }

    return "";
  }

  function noteTitleFromText(text, preferredTitle = "") {
    const title = String(preferredTitle || "").trim();
    const firstLine = String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || "Notiz";
    const selectedTitle = title || firstLine;
    return selectedTitle.length > 72
      ? `${selectedTitle.slice(0, 69).trimEnd()} …`
      : selectedTitle;
  }

  function normalizeStoredNote(note) {
    const text = String(note?.text || "").trim();
    if (!text) {
      return null;
    }

    const createdAt = Number(note?.createdAt || Date.now());
    const updatedAt = Number(note?.updatedAt || createdAt);
    return {
      id: String(note?.id || `note-${createdAt}`),
      title: noteTitleFromText(text, note?.title),
      text: text.slice(0, 10_000),
      source: String(note?.source || "Persönliches Holo"),
      createdAt,
      updatedAt
    };
  }

  function loadPersonalNotes() {
    const storageKey = activeNotesStorageKey();
    if (!storageKey) {
      personalNotes = [];
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      personalNotes = Array.isArray(stored)
        ? stored
          .map(normalizeStoredNote)
          .filter(Boolean)
          .sort((left, right) => right.updatedAt - left.updatedAt)
          .slice(0, 250)
        : [];
    } catch (error) {
      console.error("Persönliche Holo-Notizen laden:", error);
      personalNotes = [];
    }
  }

  function storePersonalNotes(nextNotes) {
    const storageKey = activeNotesStorageKey();
    if (!storageKey) {
      return false;
    }
    try {
      const normalized = nextNotes
        .map(normalizeStoredNote)
        .filter(Boolean)
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, 250);
      localStorage.setItem(storageKey, JSON.stringify(normalized));
      personalNotes = normalized;
      return true;
    } catch (error) {
      console.error("Persönliche Holo-Notizen speichern:", error);
      return false;
    }
  }

  function noteDateText(note) {
    try {
      return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(note.updatedAt));
    } catch {
      return new Date(note.updatedAt).toLocaleString("de-DE");
    }
  }

  function renderPersonalNotes(searchText = notesSearchInput?.value || "") {
    const query = normalizeNoteSearchText(searchText);
    const visibleNotes = personalNotes.filter((note) => {
      if (!query) {
        return true;
      }
      return normalizeNoteSearchText(
        `${note.title}\n${note.text}\n${note.source}`
      ).includes(query);
    });

    notesList.replaceChildren();
    notesCount.textContent = query
      ? `${visibleNotes.length} von ${personalNotes.length} Notizen`
      : `${personalNotes.length} ${personalNotes.length === 1 ? "Notiz" : "Notizen"}`;

    const quickMeta = document.getElementById("notesQuickMeta");
    if (quickMeta) {
      quickMeta.textContent = personalNotes.length
        ? `${personalNotes.length} ${personalNotes.length === 1 ? "Notiz" : "Notizen"}`
        : "Dein Notizbuch";
    }

    notesEmpty.hidden = visibleNotes.length > 0;
    const emptyTitle = notesEmpty.querySelector("strong");
    const emptyCopy = notesEmpty.querySelector("p");
    if (emptyTitle && emptyCopy) {
      emptyTitle.textContent = query
        ? "Keine passende Notiz gefunden."
        : "Noch keine Notiz.";
      emptyCopy.textContent = query
        ? "Versuch einen anderen Suchbegriff."
        : "Schreib oben etwas hinein oder sag: „Sol, notiere …“";
    }

    visibleNotes.forEach((note) => {
      const card = document.createElement("article");
      card.className = "noteCard glassCard";
      card.dataset.noteId = note.id;

      const header = document.createElement("div");
      header.className = "noteCardHeader";
      const heading = document.createElement("h3");
      heading.textContent = note.title;
      const source = document.createElement("span");
      source.className = "noteSource";
      source.textContent = note.source;
      header.append(heading, source);

      const body = document.createElement("p");
      body.className = "noteBody";
      body.textContent = note.text;

      const footer = document.createElement("div");
      footer.className = "noteCardFooter";
      const date = document.createElement("time");
      date.dateTime = new Date(note.updatedAt).toISOString();
      date.textContent = noteDateText(note);
      const actions = document.createElement("div");
      actions.className = "noteActions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.dataset.noteAction = "edit";
      editButton.dataset.noteId = note.id;
      editButton.textContent = "Bearbeiten";
      editButton.setAttribute("aria-label", `Notiz „${note.title}“ bearbeiten`);

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.dataset.noteAction = "delete";
      deleteButton.dataset.noteId = note.id;
      deleteButton.textContent = "Löschen";
      deleteButton.setAttribute("aria-label", `Notiz „${note.title}“ löschen`);

      actions.append(editButton, deleteButton);
      footer.append(date, actions);
      card.append(header, body, footer);
      notesList.appendChild(card);
    });
  }

  function createPersonalNote(text, options = {}) {
    const ownerId = activePersonalOwner();
    if (!ownerId) {
      return {
        success: false,
        identityRequired: true,
        answer: "Die feste Holo-ID ist nicht verfügbar. Es wurde keine Notiz gespeichert."
      };
    }

    const cleanText = String(text || "").trim();
    if (!cleanText) {
      return {
        success: false,
        answer: "Die Notiz ist leer. Sag oder schreib bitte, was ich notieren soll."
      };
    }

    const securityWarning = noteSecurityWarning(cleanText);
    if (securityWarning) {
      return { success: false, securityBlocked: true, answer: securityWarning };
    }

    const now = Date.now();
    const recentDuplicate = personalNotes.find((note) =>
      normalizeNoteSearchText(note.text) === normalizeNoteSearchText(cleanText) &&
      now - Number(note.createdAt || 0) <= 10 * 1000
    );
    if (recentDuplicate) {
      return {
        success: true,
        duplicate: true,
        note: recentDuplicate,
        answer: `Notiz ist bereits gespeichert: ${recentDuplicate.title}`
      };
    }

    const randomPart = globalThis.crypto?.randomUUID?.() ||
      Math.random().toString(36).slice(2, 12);
    const note = normalizeStoredNote({
      id: `note-${randomPart}`,
      title: options.title,
      text: cleanText,
      source: options.source || "Pam’s Holo",
      createdAt: now,
      updatedAt: now
    });

    if (!storePersonalNotes([note, ...personalNotes])) {
      return {
        success: false,
        answer: "Die Notiz konnte auf diesem Handy gerade nicht gespeichert werden."
      };
    }

    renderPersonalNotes();
    showToast("Notiz in Pam’s Holo gespeichert ✅️");
    return {
      success: true,
      note,
      answer: `Notiz gespeichert: ${note.title}`
    };
  }

  function findPersonalNotes(query) {
    const cleanQuery = normalizeNoteSearchText(query);
    if (!cleanQuery) {
      return [];
    }

    const exactMatches = personalNotes.filter((note) =>
      normalizeNoteSearchText(note.id) === cleanQuery ||
      normalizeNoteSearchText(note.title) === cleanQuery ||
      normalizeNoteSearchText(note.text) === cleanQuery
    );
    if (exactMatches.length) {
      return exactMatches;
    }

    return personalNotes.filter((note) =>
      normalizeNoteSearchText(`${note.title}\n${note.text}`).includes(cleanQuery)
    );
  }

  function personalNoteListAnswer(query = "") {
    const matches = query
      ? findPersonalNotes(query)
      : personalNotes;
    if (!matches.length) {
      return query
        ? `Ich finde keine Notiz zu „${query}“. Die Notizen bleiben unverändert.`
        : `Du hast noch keine Notiz in ${activeInstanceName()} gespeichert.`;
    }

    const listed = matches.slice(0, 12).map((note, index) => {
      const preview = note.text.length > 180
        ? `${note.text.slice(0, 177).trimEnd()} …`
        : note.text;
      return `${index + 1}. ${note.title}: ${preview}`;
    });
    const remainder = matches.length > listed.length
      ? `\nAußerdem gibt es noch ${matches.length - listed.length} weitere.`
      : "";
    return `${matches.length} ${matches.length === 1 ? "Notiz" : "Notizen"}:\n${listed.join("\n")}${remainder}`;
  }

  async function openSamsungNotesForReview(actionText = "ansehen") {
    if (!activePersonalOwner()) {
      return {
        success: false,
        identityRequired: true,
        answer: "Die feste Holo-ID ist nicht verfügbar."
      };
    }
    const plugin = getPhoneContactsPlugin();
    if (!plugin) {
      return {
        success: false,
        answer: "Samsung Notes kann nur aus der Sol-Holo-App für Android geöffnet werden."
      };
    }

    try {
      await plugin.openSamsungNotes();
      return {
        success: true,
        opened: true,
        saved: false,
        answer: `Samsung Notes ist geöffnet. Du kannst deine Notizen dort ${actionText}.`
      };
    } catch (error) {
      console.error("Samsung Notes öffnen:", error);
      return {
        success: false,
        answer: String(
          error?.message ||
          "Samsung Notes konnte gerade nicht geöffnet werden."
        )
      };
    }
  }

  async function prepareSamsungNote(text) {
    if (!activePersonalOwner()) {
      return {
        success: false,
        identityRequired: true,
        answer: "Die feste Holo-ID ist nicht verfügbar."
      };
    }
    const cleanText = String(text || "").trim();
    if (!cleanText) {
      return {
        success: false,
        answer: "Die Notiz ist leer. Sag oder schreib bitte, was in Samsung Notes stehen soll."
      };
    }

    const securityWarning = noteSecurityWarning(cleanText);
    if (securityWarning) {
      return { success: false, securityBlocked: true, answer: securityWarning };
    }

    const plugin = getPhoneContactsPlugin();
    if (!plugin) {
      return {
        success: false,
        answer: "Samsung Notes kann nur aus der Sol-Holo-App für Android geöffnet werden."
      };
    }

    const title = noteTitleFromText(cleanText);
    const preview = cleanText.length > 160
      ? `${cleanText.slice(0, 160)} …`
      : cleanText;

    try {
      const result = await plugin.prepareSamsungNote({
        title,
        text: cleanText
      });
      if (!result?.opened) {
        return {
          success: false,
          answer: "Samsung Notes hat sich nicht geöffnet. Es wurde nichts gespeichert."
        };
      }

      showToast(`„${preview}“ an Samsung Notes übergeben ✅️`);
      return {
        success: true,
        opened: true,
        saved: false,
        title,
        handoffMode: String(result?.handoffMode || ""),
        answer: `Samsung Notes wurde mit „${preview}“ geöffnet.`
      };
    } catch (error) {
      console.error("Samsung-Notes-Übergabe:", error);
      return {
        success: false,
        answer: String(
          error?.message ||
          "Samsung Notes konnte die Notiz gerade nicht übernehmen. Es wurde nichts gespeichert."
        )
      };
    }
  }

  async function executeNotesTool(name, args = {}) {
    if (name === "create_personal_note") {
      return prepareSamsungNote(args?.text);
    }

    if (name === "search_personal_notes") {
      return openSamsungNotesForReview("ansehen oder durchsuchen");
    }

    if (name === "update_personal_note") {
      return openSamsungNotesForReview("selbst suchen und bearbeiten");
    }

    if (name === "delete_personal_note") {
      return openSamsungNotesForReview("selbst suchen und löschen");
    }

    return { success: false, answer: "Unbekannte Samsung-Notes-Funktion." };
  }

  window.executeSolHoloNotesTool = executeNotesTool;

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
      profileDisplayImage.src = "sol-holo-logo.png";
      profileDisplayImage.classList.remove("customPhoto");
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
    profileDisplayImage.src = customClonePhoto;
    profileDisplayImage.classList.add("customPhoto");
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
    const legacyAppearanceQuarantined = quarantineLegacyCloneAppearance();
    applyCustomCloneAppearance("", null);
    const keys = activeCloneStorageKeys();
    if (!keys) {
      profilePhotoHelp.textContent =
        "Die feste Holo-ID ist nicht verfügbar. Bilder bleiben gesperrt.";
      return;
    }

    const unverifiedAppearanceQuarantined =
      quarantineUnverifiedPamCloneAppearance(keys);

    if (unverifiedAppearanceQuarantined) {
      profilePhotoHelp.textContent =
        "Ein nicht eindeutig bestätigtes Bild wurde gesperrt und separiert. Bitte wähle Pams eigenes Bild erneut aus.";
      return;
    }

    try {
      const savedPhoto = localStorage.getItem(keys.photo) || "";
      const savedMouth = JSON.parse(
        localStorage.getItem(keys.mouth) || "null"
      );
      if (savedPhoto.startsWith("data:image/")) {
        applyCustomCloneAppearance(savedPhoto, savedMouth);
      } else if (legacyAppearanceQuarantined) {
        profilePhotoHelp.textContent =
          "Ein altes, nicht eindeutig zugeordnetes Bild wurde sicher separiert. Bitte wähle Pams eigenes Bild erneut aus.";
      }
    } catch (error) {
      console.error("Persönliches Holo-Bild wiederherstellen:", error);
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
    if (!requireActivePersonalOwner()) {
      return;
    }
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
    const keys = activeCloneStorageKeys();
    if (!keys) {
      cancelCloneMouthCalibration();
      showToast("Die feste Holo-ID ist nicht verfügbar.");
      return;
    }
    cloneMouthCalibrationActive = false;
    cloneMouthBeforeCalibration = null;
    profilePhotoButton.classList.remove("calibrating");
    profileMouthControls.hidden = true;
    profileMouthMarker.hidden = true;
    profilePhotoButton.setAttribute(
      "aria-label",
      `Bild für ${activePersonalName()}s Holo aus der Galerie ändern`
    );
    profilePhotoHelp.textContent =
      "Mund gespeichert · natürliche Mundformen folgen der echten Sol-Stimme.";
    window.SolHoloClone?.setMouthGeometry(customCloneMouth);

    try {
      localStorage.setItem(keys.mouth, JSON.stringify(customCloneMouth));
    } catch (error) {
      console.error("Persönliche Holo-Mundposition speichern:", error);
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
      `Bild für ${activePersonalName() || "das persönliche"} Holo aus der Galerie ändern`
    );
    profilePhotoHelp.textContent =
      "Änderung abgebrochen · die bisherige Mundbox bleibt gespeichert.";
    window.SolHoloClone?.setMouthGeometry(customCloneMouth);
  }

  function showView(viewName) {
    const nextView = views[viewName] || views.home;
    const activeViewName = views[viewName] ? viewName : "home";

    Object.values(views).forEach((view) => {
      view?.classList.remove("active");
    });

    nextView.classList.add("active");
    solApp.dataset.activeView = activeViewName;

    const activeNavView =
      activeViewName === "settings" ? "profile" : activeViewName;

    currentBottomNav.querySelectorAll(".navItem").forEach((button) => {
      const isActive = button.dataset.view === activeNavView;
      button.classList.toggle("active", isActive);
      if (isActive) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (viewName === "services" || viewName === "settings") {
      void loadGoogleStatus();
    }

    if (viewName === "services" || viewName === "settings") {
      void loadWhatsAppStatus();
      void loadWakeStatus();
      void loadPhoneStatus();
      void loadHealthStatus();
      void loadSmartThingsStatus();
      renderSamsungNotesStatus();
    }

    if (viewName === "notes") {
      renderPersonalNotes();
    }

    if (viewName === "chat" && typeof updateMouthGeometry === "function") {
      window.requestAnimationFrame(updateMouthGeometry);
    }

    if (viewName === "chat" && typeof scrollChatToLatest === "function") {
      scrollChatToLatest();
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
    chatInput.dispatchEvent(
      new Event(
        "input",
        {
          bubbles: true
        }
      )
    );

    if (typeof sendMessage === "function") {
      await sendMessage();
    }
  }

  async function startSolVoice() {
    showView("chat");

    if (!window.SolHoloIdentity?.selected()) {
      window.SolHoloIdentity?.require();
      showToast("Die feste Holo-ID ist nicht verfügbar.");
      return;
    }

    if (
      typeof enterVoiceMode !== "function" ||
      typeof startLiveConversation !== "function"
    ) {
      await resumeWakeListeningAfterConversation();
      showToast("Der Sprachmodus ist gerade nicht verfügbar.");
      return;
    }

    enterVoiceMode();
    await pauseWakeListeningForConversation();
    await startLiveConversation();
  }

  async function loadGoogleStatus() {
    const serviceState = document.getElementById("googleAccountStatus");
    const profileState = document.getElementById("profileGoogleState");
    const todayState = document.getElementById("todayCardMeta");
    const identity = window.SolHoloIdentity?.selected?.();

    if (!identity) {
      googleConnected = false;
      googleStatus = {
        connected: false,
        allRequestedAccessGranted: false,
        services: {}
      };
      serviceState.textContent = "Holo-ID nicht verfügbar";
      serviceState.classList.add("setup");
      profileState.textContent = "Persönliche Auswahl nötig";
      todayState.textContent = "Kalender bleibt getrennt";
      return;
    }

    const identityQuery = new URLSearchParams({
      ownerId: identity.ownerId,
      selectedSpeakerId: identity.speakerId
    });

    if (serviceState) {
      serviceState.textContent = "Wird geprüft …";
      serviceState.classList.remove("connected", "setup");
    }

    try {
      const response = await fetch(
        `https://sol-holo.onrender.com/google/status?${identityQuery}`,
        { cache: "no-store" }
      );
      const data = await response.json();

      googleStatus = {
        connected: Boolean(response.ok && data?.connected),
        allRequestedAccessGranted: Boolean(
          response.ok && data?.allRequestedAccessGranted
        ),
        services: data?.services || {},
        trustedSessionRequired:
          data?.error === "TRUSTED_APP_SESSION_REQUIRED"
      };
      googleConnected = googleStatus.allRequestedAccessGranted;

      if (googleStatus.trustedSessionRequired) {
        serviceState.textContent = "Sichere Sitzung offen";
        serviceState.classList.add("setup");
        profileState.textContent = "App-Sitzung noch nicht gebunden";
        todayState.textContent = "Kalender bleibt geschützt";
      } else if (googleConnected) {
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
    const identity = window.SolHoloIdentity?.selected?.();

    if (!identity) {
      smartThingsStatus = {
        configured: false,
        connected: false,
        selectedDevicesOnly: true,
        actionsRequireConfirmation: true
      };
      serviceState.textContent = "Holo-ID nicht verfügbar";
      serviceState.classList.add("setup");
      return;
    }

    const identityQuery = new URLSearchParams({
      ownerId: identity.ownerId,
      selectedSpeakerId: identity.speakerId
    });
    serviceState.textContent = "Wird geprüft …";
    serviceState.classList.remove("connected", "setup");

    try {
      const response = await fetch(
        `https://sol-holo.onrender.com/smartthings/status?${identityQuery}`,
        { cache: "no-store" }
      );
      const data = await response.json();

      smartThingsStatus = {
        configured: Boolean(response.ok && data?.configured),
        connected: Boolean(response.ok && data?.connected),
        selectedDevicesOnly: data?.selectedDevicesOnly !== false,
        actionsRequireConfirmation:
          data?.actionsRequireConfirmation !== false,
        trustedSessionRequired:
          data?.error === "TRUSTED_APP_SESSION_REQUIRED"
      };

      if (smartThingsStatus.trustedSessionRequired) {
        serviceState.textContent = "Sichere Sitzung offen";
        serviceState.classList.add("setup");
      } else if (smartThingsStatus.connected) {
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

    if (!requireActivePersonalOwner()) {
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
          `Bitte erlaube ${activeInstanceName()} jetzt den Benachrichtigungszugriff. ` +
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
          showToast(`Eingehender Anruf erkannt. ${activeInstanceName()} pausiert.`);
          if (typeof stopLiveConversation === "function") {
            stopLiveConversation();
          }
          await pauseWakeListeningForConversation();
        } else if (
          status?.callState === "idle" &&
          previousState !== "idle"
        ) {
          showToast(`Telefonat beendet. ${activeInstanceName()} ist wieder da.`);
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

    if (!requireActivePersonalOwner()) {
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
          `Für alle Telefonfunktionen braucht ${activeInstanceName()} beide Android-Freigaben.`
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
    if (!activePersonalOwner()) {
      throw new Error("Die feste Holo-ID ist nicht verfügbar.");
    }
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
        await getPhoneContactsPlugin().openDialer({
          number: contact.number,
          recipientName: contact.name
        });
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

        await getPhoneContactsPlugin().prepareSms({
          number: contact.number,
          recipientName: contact.name,
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
      if (error?.code === "USER_CANCELLED") {
        return {
          success: false,
          cancelled: true,
          answer: "Die Aktion wurde abgebrochen."
        };
      }
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

  async function renderSamsungNotesStatus() {
    const statusElement = document.getElementById("samsungNotesStatus");
    statusElement.classList.remove("connected", "setup");
    const plugin = getPhoneContactsPlugin();
    if (!plugin) {
      statusElement.textContent = "Nur Android";
      statusElement.classList.add("setup");
      return;
    }

    try {
      const status = await plugin.getSamsungNotesStatus();
      statusElement.textContent = status?.available
        ? "Verbunden"
        : "Nicht gefunden";
      statusElement.classList.add(status?.available ? "connected" : "setup");
    } catch (error) {
      console.error("Samsung-Notes-Status:", error);
      statusElement.textContent = "Prüfung fehlgeschlagen";
      statusElement.classList.add("setup");
    }
  }

  async function consumeSharedNoteImport() {
    const plugin = getPhoneContactsPlugin();
    const identity = window.SolHoloIdentity?.selected?.();
    if (!plugin || noteImportRunning || !identity) {
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
          `Abschnitt und teile ihn erneut mit ${activeInstanceName()}. Es wurde nichts gespeichert.`
        );
        return;
      }

      const title = String(note.title || "").trim();
      const text = String(note.text || "").trim();
      const preview = text.length > 800
        ? text.slice(0, 800) + " …"
        : text;
      const confirmed = window.confirm(
        "Diese ausgewählte Samsung-Notiz im Notizbuch deiner " +
        `${activeInstanceName()} auf diesem Handy speichern?\n\n` +
        (title ? `Titel: ${title}\n\n` : "") +
        preview +
        "\n\nNur persönliche Inhalte bestätigen. Geschäftliche Daten, PINs, " +
        "Passwörter, TANs, Banking- und Authenticator-Daten bleiben ausgeschlossen."
      );

      if (!confirmed) {
        showToast("Notiz verworfen. Es wurde nichts gespeichert.");
        return;
      }

      const savedNote = createPersonalNote(text, {
        title,
        source: `Samsung Notes · von ${identity.displayName} freigegeben`
      });
      if (!savedNote.success) {
        if (savedNote.securityBlocked) {
          window.alert(savedNote.answer);
        } else {
          showToast(savedNote.answer);
        }
        return;
      }

      showToast(`Samsung-Notiz in ${activeInstanceName()} gespeichert ✅️`);
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

    if (!requireActivePersonalOwner()) {
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
        showToast(`Android zeigt die Health-Freigaben von ${activeInstanceName()}.`);
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

    if (!activePersonalOwner()) {
      return {
        success: false,
        identityRequired: true,
        answer: "Die feste Holo-ID ist nicht verfügbar."
      };
    }

    const plugin = getHealthConnectPlugin();
    if (!plugin) {
      return {
        success: false,
        answer: "Health Connect ist nur in der Sol-Holo-App für Android verfügbar."
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
          answer: `Öffne in ${activeInstanceName()} unter Dienste zuerst Health Connect und wähle die Lesefreigaben.`
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

  function samsungNoteTextFromNaturalRequest(message) {
    const cleanMessage = String(message || "").trim();
    const patterns = [
      /^(?:schreib(?:e)?|notier(?:e)?|trag(?:e)?|pack(?:e)?|setz(?:e)?)\s+(?:mir\s+)?(?:bitte\s+)?(.+?)\s+(?:bitte\s+)?(?:in|zu)\s+(?:(?:meine|die)\s+)?(?:samsungs?(?:\s+|-))?(?:notes?|noten|notizen)(?:\s+(?:rein|hinein|ein))?[.!?]*$/i,
      /^(?:schreib(?:e)?|notier(?:e)?|trag(?:e)?|pack(?:e)?|setz(?:e)?)\s+(?:mir\s+)?(?:bitte\s+)?(?:in|zu)\s+(?:(?:meine|die)\s+)?(?:samsungs?(?:\s+|-))?(?:notes?|noten|notizen)(?:\s+(?:rein|hinein|ein))?\s*[:,-]?\s*(?:bitte\s+)?(.+?)[.!?]*$/i
    ];

    for (const pattern of patterns) {
      const match = cleanMessage.match(pattern);
      const noteText = String(match?.[1] || "")
        .replace(/^[\s:,-]+|[\s.!?]+$/g, "")
        .trim();
      if (noteText) {
        return noteText;
      }
    }

    return "";
  }

  window.extractSolHoloSamsungNoteText = samsungNoteTextFromNaturalRequest;

  window.handleSolHoloLocalAction = async (message) => {
    const cleanMessage = String(message || "").trim();
    const noteMessage = cleanMessage
      .replace(/^(?:(?:hey\s+)?sol)\s*[,;:!.-]?\s*/i, "")
      .trim();

    const finishNoteCreation = async (text) => {
      const result = await executeNotesTool("create_personal_note", {
        text
      });
      if (result?.success) {
        pendingPersonalNoteText = false;
        previousPlainUserMessage = "";
        previousPlainUserMessageAt = 0;
      }
      return { handled: true, answer: result.answer };
    };

    const naturalSamsungNoteText = samsungNoteTextFromNaturalRequest(
      noteMessage
    );
    if (naturalSamsungNoteText) {
      return finishNoteCreation(naturalSamsungNoteText);
    }

    let noteMatch = noteMessage.match(
      /^notier(?:e)?\b\s*(?:mir\s+)?(?:bitte\s+)?[:,-]?\s*(.+?)[.!]?$/i
    );
    if (!noteMatch) {
      noteMatch = noteMessage.match(
        /^(?:mach|mache|schreib|schreibe)\s+(?:mir\s+)?(?:bitte\s+)?eine\s+notiz(?:\s+daraus)?\s*[:,-]?\s+(.+?)[.!]?$/i
      );
    }
    if (!noteMatch) {
      noteMatch = noteMessage.match(
        /^schreib(?:e)?\s+(?:mir\s+)?(?:bitte\s+)?(?:als\s+notiz|in\s+meine\s+notizen|auf)\s*[:,-]?\s+(.+?)[.!]?$/i
      );
    }
    if (!noteMatch) {
      noteMatch = noteMessage.match(
        /^(?:neue\s+)?notiz\s*[:,-]\s*(.+?)[.!]?$/i
      );
    }
    if (noteMatch) {
      return finishNoteCreation(noteMatch[1]);
    }

    if (pendingPersonalNoteText) {
      if (/^(?:abbrechen|abbruch|doch\s+nicht|keine\s+notiz)[.!?]*$/i.test(noteMessage)) {
        pendingPersonalNoteText = false;
        return {
          handled: true,
          answer: "Alles klar. Es wurde nichts an Samsung Notes übergeben."
        };
      }
      return finishNoteCreation(noteMessage);
    }

    const simpleNoteRequest = noteMessage
      .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D]/gu, "")
      .replace(/\s+(?:danke|dankeschön)\s*[.!?]*$/i, "")
      .trim();
    if (
      /^(?:(?:mach|mache|schreib|schreibe)\s+(?:mir\s+)?(?:bitte\s+)?(?:eine\s+)?)?(?:einfache\s+|neue\s+)?notiz(?:\s+bitte)?[.!?]*$/i.test(simpleNoteRequest)
    ) {
      const previousMessageIsUsable =
        previousPlainUserMessage &&
        Date.now() - previousPlainUserMessageAt <= 5 * 60 * 1000 &&
        previousPlainUserMessage.length <= 1000 &&
        !/[?]\s*$/.test(previousPlainUserMessage) &&
        !/^(?:ja|nein|okay|ok|danke|bitte)[.!?]*$/i.test(previousPlainUserMessage);

      if (previousMessageIsUsable) {
        return finishNoteCreation(previousPlainUserMessage);
      }

      pendingPersonalNoteText = true;
      return {
        handled: true,
        answer: "Gern. Was soll ich in Samsung Notes notieren?"
      };
    }

    noteMatch = noteMessage.match(
      /^(?:suche|finde)\s+(?:in\s+)?(?:meinen\s+)?notizen\s+(?:nach\s+)?(.+?)[.!]?$/i
    );
    if (noteMatch) {
      const result = await executeNotesTool("search_personal_notes", {
        query: noteMatch[1]
      });
      return { handled: true, answer: result.answer };
    }

    if (
      /^(?:(?:zeig|zeige|öffne|oeffne|lies|lese)\s+(?:mir\s+)?(?:bitte\s+)?(?:meine\s+)?notizen(?:\s+vor)?|was\s+habe\s+ich\s+notiert)[.!?]?$/i.test(noteMessage)
    ) {
      const result = await executeNotesTool("search_personal_notes", {
        query: ""
      });
      return { handled: true, answer: result.answer };
    }

    noteMatch = noteMessage.match(
      /^(?:lösch|lösche|entfern|entferne)\s+(?:bitte\s+)?(?:die\s+)?notiz(?:\s+mit|\s+zu|\s+über)?\s+(.+?)[.!]?$/i
    );
    if (noteMatch) {
      const result = await executeNotesTool("delete_personal_note", {
        query: noteMatch[1]
      });
      return { handled: true, answer: result.answer };
    }

    noteMatch = noteMessage.match(
      /^(?:änder|ändere|bearbeit|bearbeite)\s+(?:bitte\s+)?(?:die\s+)?notiz\s+(.+?)\s+(?:in|zu|auf)\s+(.+?)[.!]?$/i
    );
    if (noteMatch) {
      const result = await executeNotesTool("update_personal_note", {
        query: noteMatch[1],
        text: noteMatch[2]
      });
      return { handled: true, answer: result.answer };
    }

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

    previousPlainUserMessage = noteMessage;
    previousPlainUserMessageAt = Date.now();
    return { handled: false };
  };

  window.handleSolHoloRealtimeNoteTranscript = async (message) => {
    const cleanMessage = String(message || "").trim();
    const noteMessage = cleanMessage
      .replace(/^(?:(?:hey\s+)?sol)\s*[,;:!.-]?\s*/i, "")
      .trim();
    const noteIntent =
      pendingPersonalNoteText ||
      /\bnotiz(?:en)?\b|\bnotier(?:e|en|st|t)?\b|\bnotes?\b|\bnoten\b/i.test(noteMessage);

    if (!noteIntent) {
      previousPlainUserMessage = noteMessage;
      previousPlainUserMessageAt = Date.now();
      return { handled: false };
    }

    return window.handleSolHoloLocalAction(cleanMessage);
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
      serviceRunning: Boolean(nextStatus?.serviceRunning),
      listening: Boolean(nextStatus?.listening),
      processingAudio: Boolean(nextStatus?.processingAudio),
      pausedForConversation: Boolean(nextStatus?.pausedForConversation),
      speakerGateReady: Boolean(nextStatus?.speakerGateReady),
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
        (
          button.dataset.wakeMode !== "off" &&
          (!pluginAvailable || !wakeStatus.speakerGateReady)
        );
    });

    if (!pluginAvailable) {
      statusElement.textContent = "Nur Android";
      statusElement.classList.add("setup");
    } else if (!wakeStatus.supported) {
      statusElement.textContent = "Offline fehlt";
      statusElement.classList.add("setup");
    } else if (!wakeStatus.speakerGateReady) {
      statusElement.textContent = "Stimme fehlt";
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
        : wakeStatus.processingAudio
          ? "Prüft „Hey Sol“ …"
          : wakeStatus.serviceRunning
            ? "Mikrofon startet …"
            : "Startet …";
      statusElement.classList.add("connected");
    } else if (wakeStatus.mode === "foreground") {
      statusElement.textContent = wakeStatus.listening
        ? "App hört zu"
        : wakeStatus.processingAudio
          ? "Prüft „Hey Sol“ …"
          : wakeStatus.serviceRunning
            ? "Mikrofon startet …"
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
      await plugin.addListener("wakeDiagnostic", (event) => {
        const campplusScore = Number(event?.campplusScore);
        const eres2netScore = Number(event?.eres2netScore);
        const scoreText =
          Number.isFinite(campplusScore) && Number.isFinite(eres2netScore)
            ? ` · A ${campplusScore.toFixed(3)} · B ${eres2netScore.toFixed(3)}`
            : "";
        if (event?.stage === "phrase_heard") {
          showToast("„Hey Sol“ gehört · deine Stimme wird geprüft …");
        } else if (event?.stage === "owner_accepted") {
          showToast("Stimme freigegeben · Sol startet ✨");
        } else if (event?.stage === "owner_rejected") {
          showToast(
            "„Hey Sol“ gehört · Stimme nicht freigegeben 🔒" + scoreText +
            (event?.templateUsed
              ? ""
              : " · einmal Sicherheit testen")
          );
        }
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
            "Aktiviere jetzt „Pam’s Holo“ bei „Über anderen Apps einblenden“ " +
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
      event?.phrase || "Hey Sol"
    );
    showToast("Stimme freigegeben · Sol startet ✨");
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
    showView("settings");
  });

  document.getElementById("menuButton")?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.getElementById("drawer")?.classList.remove("open");
      showView("settings");
    },
    true
  );

  const settingsVolumeChooser = document.getElementById("settingsVolumeChooser");
  const syncSettingsVolume = () => {
    settingsVolumeChooser.querySelectorAll("[data-volume-target]").forEach((button) => {
      const target = document.getElementById(button.dataset.volumeTarget);
      button.classList.toggle("active", Boolean(target?.classList.contains("active")));
    });
  };
  settingsVolumeChooser.addEventListener("click", (event) => {
    const button = event.target.closest("[data-volume-target]");
    if (!button) return;
    document.getElementById(button.dataset.volumeTarget)?.click();
    window.requestAnimationFrame(syncSettingsVolume);
  });
  syncSettingsVolume();

  profilePhotoButton.addEventListener("click", (event) => {
    if (cloneMouthCalibrationActive) {
      moveCloneMouthCalibration(event);
      return;
    }
    if (!requireActivePersonalOwner()) {
      return;
    }
    profilePhotoInput.click();
  });

  profilePhotoChangeButton.addEventListener("click", () => {
    if (!requireActivePersonalOwner()) {
      return;
    }
    profilePhotoInput.click();
  });

  profilePhotoInput.addEventListener("change", async () => {
    const identity = requireActivePersonalOwner();
    const keys = activeCloneStorageKeys();
    if (!identity || !keys) {
      profilePhotoInput.value = "";
      return;
    }
    const file = profilePhotoInput.files?.[0];
    profilePhotoInput.value = "";
    if (!file) {
      return;
    }

    const confirmedForOwner = window.confirm(
      `Ist dies wirklich ${identity.displayName}s eigenes Bild und soll es ausschließlich unter ${identity.ownerId} gespeichert werden?`
    );
    if (!confirmedForOwner) {
      showToast("Bild nicht gespeichert · die Zuordnung wurde nicht bestätigt.");
      return;
    }

    showToast(`Dein Bild wird nur für ${identity.displayName}s Holo vorbereitet …`);
    try {
      const photo = await prepareClonePhoto(file);
      const mouth = normalizedCloneMouth({
        x: 0.5,
        y: 0.58,
        width: 0.16,
        height: 0.075
      });
      const metadata = JSON.stringify({
        confirmedBy: identity.speakerId,
        deviceBinding: "signed-owner-bound-instance",
        deviceDisplayNameUsedAsIdentity: false,
        explicitOwnerConfirmation: true,
        faceProcessing: "local-landmarks-only-not-person-identification",
        locationUsedAsIdentity: false,
        ownerId: identity.ownerId,
        schemaVersion: 2,
        speakerId: identity.speakerId,
        storedAt: new Date().toISOString()
      });
      localStorage.setItem(keys.photo, photo);
      localStorage.setItem(keys.mouth, JSON.stringify(mouth));
      localStorage.setItem(keys.metadata, metadata);
      if (
        localStorage.getItem(keys.photo) !== photo ||
        localStorage.getItem(keys.metadata) !== metadata
      ) {
        throw new Error("OWNER_BOUND_IMAGE_SAVE_FAILED");
      }
      applyCustomCloneAppearance(photo, mouth);
      showToast(
        "Bild owner-gebunden gespeichert · Gesichtskonturen werden nur lokal verarbeitet 🙂"
      );
    } catch (error) {
      console.error("Persönliches Holo-Galeriebild:", error);
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
    if (!requireActivePersonalOwner()) {
      return;
    }
    const keys = activeCloneStorageKeys();
    if (!keys) {
      return;
    }
    cloneMouthCalibrationActive = false;
    cloneMouthBeforeCalibration = null;
    try {
      localStorage.removeItem(keys.photo);
      localStorage.removeItem(keys.mouth);
      localStorage.removeItem(keys.metadata);
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

  noteComposer.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = createPersonalNote(noteTextInput.value, {
      source: `In ${activeInstanceName()} geschrieben`
    });
    if (result.success) {
      noteTextInput.value = "";
      noteTextInput.focus();
      return;
    }
    if (result.securityBlocked) {
      window.alert(result.answer);
    } else {
      showToast(result.answer);
    }
  });

  notesSearchInput.addEventListener("input", () => {
    renderPersonalNotes(notesSearchInput.value);
  });

  notesList.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-note-action]");
    if (!actionButton) {
      return;
    }

    const note = personalNotes.find(
      (entry) => entry.id === actionButton.dataset.noteId
    );
    if (!note) {
      showToast("Diese Notiz wurde nicht mehr gefunden.");
      renderPersonalNotes();
      return;
    }

    if (actionButton.dataset.noteAction === "delete") {
      await executeNotesTool("delete_personal_note", { query: note.id });
      return;
    }

    if (actionButton.dataset.noteAction === "edit") {
      const newText = window.prompt(
        `Notiz „${note.title}“ bearbeiten:`,
        note.text
      );
      if (newText === null || newText.trim() === note.text) {
        return;
      }
      const result = await executeNotesTool("update_personal_note", {
        query: note.id,
        text: newText
      });
      if (result.securityBlocked) {
        window.alert(result.answer);
      }
    }
  });

  document.getElementById("notesVoiceButton").addEventListener("click", () => {
    void startSolVoice();
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
    const identity = requireActivePersonalOwner();
    if (!identity) {
      return;
    }

    if (googleConnected) {
      showToast(
        `Google-Konto nur für ${identity.displayName}s Holo verbunden: Anmeldung, Gmail, Kontakte, Drive und Kalender.`
      );
      return;
    }

    if (googleStatus.trustedSessionRequired) {
      showToast(
        "Google bleibt geschützt, bis die sichere App-Sitzung gebunden ist."
      );
      return;
    }

    const identityQuery = new URLSearchParams({
      ownerId: identity.ownerId,
      selectedSpeakerId: identity.speakerId
    });
    const authUrl =
      `https://sol-holo.onrender.com/auth/google?${identityQuery}`;

    const authWindow = window.open(
      authUrl,
      "_blank",
      "noopener"
    );

    if (!authWindow) {
      window.location.href = authUrl;
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

  document.getElementById("phoneContactsRow").addEventListener("click", async () => {
    if (phoneStatus.connected) {
      const managePermissions = window.confirm(
        "Kontakte und Anruferkennung sind aktiv. Anruf oder SMS wird immer sichtbar bestätigt.\n\nAndroid-Berechtigungen jetzt verwalten oder widerrufen?"
      );
      if (managePermissions) {
        try {
          await getPhoneContactsPlugin()?.openPermissionSettings();
        } catch (error) {
          console.error("Telefon-Berechtigungen:", error);
          showToast("Die Android-Berechtigungen konnten gerade nicht geöffnet werden.");
        }
      }
      return;
    }
    void requestPhoneAccess();
  });

  document.getElementById("samsungGalleryRow").addEventListener("click", () => {
    const identity = requireActivePersonalOwner();
    if (!identity) {
      return;
    }
    showView("settings");
    profilePhotoInput.click();
    showToast(`Samsung Galerie ist geöffnet · das Bild bleibt nur bei ${identity.displayName}s Holo.`);
  });

  document.getElementById("smartThingsRow").addEventListener("click", () => {
    const identity = requireActivePersonalOwner();
    if (!identity) {
      return;
    }

    if (smartThingsStatus.connected) {
      showToast(
        "SmartThings-Zuhause verbunden. Geräteaktionen brauchen immer deine Bestätigung."
      );
      return;
    }

    if (smartThingsStatus.trustedSessionRequired) {
      showToast(
        "SmartThings bleibt geschützt, bis die sichere App-Sitzung gebunden ist."
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

    const identityQuery = new URLSearchParams({
      ownerId: identity.ownerId,
      selectedSpeakerId: identity.speakerId
    });
    const authUrl =
      `https://sol-holo.onrender.com/auth/smartthings?${identityQuery}`;

    const authWindow = window.open(
      authUrl,
      "_blank",
      "noopener"
    );

    if (!authWindow) {
      window.location.href = authUrl;
    }
  });

  const openSamsungNotes = async () => {
    const result = await openSamsungNotesForReview("ansehen");
    showToast(result.answer);
  };

  document.getElementById("samsungNotesQuickCard")?.addEventListener(
    "click",
    () => void openSamsungNotes()
  );

  document.getElementById("samsungNotesRow").addEventListener(
    "click",
    () => void openSamsungNotes()
  );

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
      "Samsung Galerie öffnet die Bildauswahl; Samsung Notes wird für Notizen direkt geöffnet."
    );
  });

  document.getElementById("openSystemMenuButton").addEventListener("click", () => {
    const details = document.getElementById("settingsSystemDetails");
    const button = document.getElementById("openSystemMenuButton");
    details.hidden = !details.hidden;
    button.setAttribute("aria-expanded", String(!details.hidden));
    button.querySelector(".rowChevron").textContent = details.hidden ? "›" : "⌄";
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

  window.addEventListener("solholoidentitychange", () => {
    renderPersonalIdentityUi();
    loadPersonalNotes();
    renderPersonalNotes("");
    restoreCustomCloneAppearance();
    void loadGoogleStatus();
    void loadSmartThingsStatus();
  });

  loadPersonalNotes();
  renderPersonalNotes();
  renderPersonalIdentityUi();
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
