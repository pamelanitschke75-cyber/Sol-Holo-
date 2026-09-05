import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const ui = fs.readFileSync(
  new URL("../www/sol-holo-ui.js", import.meta.url),
  "utf8"
);
const html = fs.readFileSync(
  new URL("../www/index.html", import.meta.url),
  "utf8"
);

function functionSource(name, nextName) {
  const start = ui.indexOf(`  function ${name}`);
  const end = ui.indexOf(`  function ${nextName}`, start + 1);
  assert.notEqual(start, -1, `Funktion fehlt: ${name}`);
  assert.notEqual(end, -1, `Endmarke fehlt: ${nextName}`);
  return ui.slice(start, end);
}

test("Speichern auf Zuruf ist als gemeinsame Alltagsfreigabe sichtbar", () => {
  const row = ui.match(
    /<button id="explicitSaveRow"[\s\S]*?<\/button>/u
  )?.[0];
  assert.ok(row, "Speichern-auf-Zuruf-Zeile fehlt");
  assert.match(row, /Alltagsworker · Speichern auf Zuruf/u);
  assert.match(row, /Echte Alltagsinhalte/u);
  assert.match(row, /serviceStatus connected">Aktiv ✅/u);
  assert.match(row, /data-open-view="notes"/u);

  const labRow = ui.match(
    /<button id="openClawAlltagPreviewRow"[\s\S]*?<\/button>/u
  )?.[0];
  assert.ok(labRow, "interne Sicherheitstest-Zeile fehlt");
  assert.match(labRow, /data-lab-only="true"/u);
  assert.match(labRow, /hidden/u);
});

test("explizite Speicheraufträge und benannte Listen werden lokal erkannt", () => {
  const source = [
    functionSource("normalizeNoteSearchText", "noteSecurityWarning"),
    functionSource("cleanExplicitSaveContent", "explicitListTitle"),
    functionSource("explicitListTitle", "savedContentCategory"),
    functionSource("savedContentCategory", "explicitSaveRequestFromMessage"),
    functionSource("explicitSaveRequestFromMessage", "noteTitleFromText"),
    "return explicitSaveRequestFromMessage;"
  ].join("\n");
  const extract = new Function(source)();

  assert.deepEqual(
    extract("Sol, setze Salz auf die Einkaufsliste"),
    {
      category: "Einkaufsliste",
      content: "Salz",
      kind: "list-item",
      listTitle: "Einkaufsliste"
    }
  );
  assert.deepEqual(
    extract("Bitte merke dir, dass der Airfryer später über HomeID eingerichtet wird."),
    {
      category: "Gespeicherter Inhalt",
      content: "der Airfryer später über HomeID eingerichtet wird",
      kind: "content"
    }
  );
  assert.equal(
    extract("Kannst du alles speichern?"),
    null,
    "Eine Frage darf nicht als Speicherauftrag gelten"
  );
  assert.equal(
    extract("Schreibe Salz in Samsung Notes"),
    null,
    "Ein ausdrücklich genanntes Samsung-Notes-Ziel bleibt beim Notes-Adapter"
  );
});

test("kurze Rückbezüge wie ‚Speichere das‘ verwenden den letzten Inhalt", () => {
  const referenceFunction = functionSource(
    "explicitSaveUsesPreviousMessage",
    "recentPlainUserMessageForSave"
  );
  const usesPrevious = new Function(
    `${referenceFunction}\nreturn explicitSaveUsesPreviousMessage;`
  )();

  assert.equal(
    usesPrevious({ kind: "content", content: "das" }),
    true
  );
  assert.equal(
    usesPrevious({ kind: "list-item", content: "das" }),
    false
  );
  assert.match(ui, /recentPlainUserMessageForSave\(\)/u);
  assert.match(ui, /Was genau soll ich dauerhaft speichern\?/u);
});

test("sensible Inhalte bleiben unabhängig vom Speicherbefehl gesperrt", () => {
  const warningSource = functionSource(
    "noteSecurityWarning",
    "cleanExplicitSaveContent"
  );
  const warning = new Function(
    `${warningSource}\nreturn noteSecurityWarning;`
  )();

  assert.match(warning("Mein Passwort ist Sommer123"), /speichert ihn.+nicht/su);
  assert.equal(warning("Salz und Haferdrink kaufen"), "");
});

test("Speicheraufträge nutzen die feste Holo-ID, lokale Persistenz und Geheimnissperre", () => {
  const appendFunction = functionSource(
    "appendPersonalListItem",
    "saveExplicitRequest"
  );
  const saveFunction = functionSource("saveExplicitRequest", "findPersonalNotes");
  const handler = ui.slice(
    ui.indexOf("window.handleSolHoloLocalAction = async"),
    ui.indexOf("window.handleSolHoloRealtimeNoteTranscript = async")
  );

  assert.match(appendFunction, /activePersonalOwner\(\)/u);
  assert.match(appendFunction, /noteSecurityWarning\(cleanItem\)/u);
  assert.match(appendFunction, /storePersonalNotes/u);
  assert.match(saveFunction, /createPersonalNote/u);
  assert.match(handler, /explicitSaveRequestFromMessage/u);
  assert.match(handler, /Auf Zuruf dauerhaft gespeichert/u);
  assert.match(ui, /Passwörter, PIN, TAN, Token und Schlüssel bleiben gesperrt/u);
});

test("Sprachaufträge verwenden denselben lokalen Speicherweg", () => {
  const realtimeHandler = ui.slice(
    ui.indexOf("window.handleSolHoloRealtimeNoteTranscript = async"),
    ui.indexOf("function getHeyHoSolPlugin")
  );
  assert.match(realtimeHandler, /explicitSaveRequestFromMessage/u);
  assert.match(html, /LOKALES_SPEICHERERGEBNIS/u);
  assert.match(html, /sol-holo-ui\.js\?v=43/u);
});
