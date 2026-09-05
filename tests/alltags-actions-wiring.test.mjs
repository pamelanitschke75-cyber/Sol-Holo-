import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const server = fs.readFileSync(
  new URL("../server.mjs", import.meta.url),
  "utf8"
);
const ui = fs.readFileSync(
  new URL("../www/sol-holo-ui.js", import.meta.url),
  "utf8"
);
const html = fs.readFileSync(
  new URL("../www/index.html", import.meta.url),
  "utf8"
);
const android = fs.readFileSync(
  new URL("../android-native/PhoneContactsPlugin.java", import.meta.url),
  "utf8"
);
const serviceWorker = fs.readFileSync(
  new URL("../www/service-worker.js", import.meta.url),
  "utf8"
);

function sourceFunction(name, nextName) {
  const start = server.indexOf(`function ${name}`);
  const end = server.indexOf(`function ${nextName}`, start + 1);
  assert.notEqual(start, -1, `Server-Funktion fehlt: ${name}`);
  assert.notEqual(end, -1, `Server-Endmarke fehlt: ${nextName}`);
  return server.slice(start, end);
}

test("Live-Wetter nutzt die vorhandene OpenAI-Websuche und zeigt Quellen", () => {
  assert.match(server, /type:\s*"web_search"/u);
  assert.match(server, /tool_choice:\s*"required"/u);
  assert.match(server, /additionalProviderRequired:\s*false/u);
  assert.match(server, /collectResponseWebSources/u);
  assert.match(html, /messageSources/u);
  assert.match(html, /LOKALES_WETTERERGEBNIS/u);
  assert.match(ui, /\/weather\/status/u);
  assert.match(serviceWorker, /sol-holo-128-raffituekke-alltagsaktionen/u);
});

test("ein ausdrücklicher Kalenderauftrag wird ohne zweite Inhaltsfreigabe ausgeführt", () => {
  const start = server.indexOf("async function handleCalendarWriteRequest");
  const end = server.indexOf("app.post(\n  \"/calendar/action\"", start);
  const handler = server.slice(start, end);

  assert.match(handler, /return commitCalendarAction/u);
  assert.match(handler, /dein ausdrücklicher Kalenderauftrag gilt bereits als Freigabe/u);
  assert.doesNotMatch(handler, /confirmationRequired:\s*true/u);
  assert.match(html, /Google Calendar hat den Eintrag bestätigt/u);
  assert.match(server, /hasConcreteTime && asksToSchedule/u);
  assert.match(ui, /hasConcreteTime && asksToSchedule/u);
  assert.match(html, /retryPath/u);
  assert.doesNotMatch(
    html.slice(
      html.indexOf("async function sendMessage"),
      html.indexOf("function saveRealtimeAssistantTranscript")
    ),
    /await sendMessage\(\s*message,\s*fulltimeEventId/u,
    "Die sichere Sitzungsbindung darf den gesamten Nutzerauftrag nicht rekursiv erneut senden"
  );
});

test("Sol erkennt natürliche Gmail-Fragen und liest nur ownergebundene Metadaten", () => {
  const detector = new Function(
    `${sourceFunction("normalizeNaturalIntentText", "looksLikeLiveWeatherRequest")}\n` +
    `${sourceFunction("looksLikeGmailReadRequest", "gmailQueryForNaturalRequest")}\n` +
    "return looksLikeGmailReadRequest;"
  )();

  assert.equal(
    detector("Sol, habe ich eine wichtige Mail bekommen?"),
    true
  );
  assert.equal(
    detector("Schreib bitte eine Mail an Anna"),
    false
  );
  assert.match(server, /googlePersonalServices\.searchGmail/u);
  assert.match(server, /GMAIL_SEARCH/u);
  assert.match(server, /Ich habe dafür keine Mailinhalte geöffnet/u);
  assert.match(server, /app\.post\(\s*"\/gmail\/action"/u);
  assert.match(server, /name:\s*"search_gmail"/u);
  assert.match(html, /searchRealtimeGmail/u);
  assert.match(html, /"search_gmail"/u);
});

test("Sol prüft natürliche Öffnungszeiten live statt aus Modellwissen zu raten", () => {
  const detector = new Function(
    `${sourceFunction("normalizeNaturalIntentText", "looksLikeLiveWeatherRequest")}\n` +
    `${sourceFunction("looksLikeLiveWeatherRequest", "weatherRequestScope")}\n` +
    `${sourceFunction("looksLikeLiveEverydayWebRequest", "handleLiveEverydayWebRequest").replace(/\basync\s*$/u, "")}\n` +
    "return looksLikeLiveEverydayWebRequest;"
  )();

  assert.equal(
    detector("Wann macht der dm morgen in München am Hauptbahnhof auf?"),
    true
  );
  assert.equal(detector("Erzähl mir etwas über München"), false);
  assert.match(server, /handleLiveEverydayWebRequest/u);
  assert.match(server, /bevorzuge offizielle oder primäre Quellen/u);
  assert.match(html, /data\?\.web\?\.sources/u);
});

test("Google Maps hat einen echten nativen Android-Ausführungsweg", () => {
  assert.match(android, /public void openGoogleMaps\(PluginCall call\)/u);
  assert.match(android, /google\.navigation:q=/u);
  assert.match(android, /com\.google\.android\.apps\.maps/u);
  assert.match(ui, /plugin\.openGoogleMaps/u);
});

test("Notizen werden lokal gespeichert und Samsung Notes ehrlich übergeben", () => {
  const toolStart = ui.indexOf("async function executeNotesTool");
  const toolEnd = ui.indexOf("window.executeSolHoloNotesTool", toolStart);
  const handler = ui.slice(toolStart, toolEnd);

  assert.match(handler, /createPersonalNote\(text/u);
  assert.match(handler, /prepareSamsungNote\(text\)/u);
  assert.match(handler, /localSaved:\s*true/u);
  assert.match(handler, /ist die Notiz gespeichert/u);
  assert.match(android, /directWriteSupported", false/u);
  assert.match(android, /reviewAndSaveInSamsungNotesRequired", true/u);
});
