import fs from "node:fs";
import vm from "node:vm";

const uiSource = fs.readFileSync("www/sol-holo-ui.js", "utf8");
const functionStart = uiSource.indexOf(
  "function samsungNoteTextFromNaturalRequest"
);
const functionEnd = uiSource.indexOf(
  "\n\n  window.extractSolHoloSamsungNoteText",
  functionStart
);

if (functionStart < 0 || functionEnd < 0) {
  throw new Error("Samsung-Notes-Spracherkennung wurde nicht gefunden.");
}

const context = {};
vm.createContext(context);
vm.runInContext(
  `${uiSource.slice(functionStart, functionEnd)}\n` +
    "this.extractSamsungNote = samsungNoteTextFromNaturalRequest;",
  context
);

const examples = new Map([
  ["Schreib bitte Zucker in Noten", "Zucker"],
  ["Schreib Zucker in Notes.", "Zucker"],
  ["Schreibe mir bitte Milch in Samsung Notes", "Milch"],
  ["Schreib bitte in Notes Kaffee", "Kaffee"],
  ["Pack bitte Eier in meine Notizen", "Eier"],
  ["Was steht in meinen Notizen?", ""]
]);

for (const [spokenText, expectedNote] of examples) {
  const actualNote = context.extractSamsungNote(spokenText);
  if (actualNote !== expectedNote) {
    throw new Error(
      `Falsche Notizerkennung für „${spokenText}“: ` +
        `erwartet „${expectedNote}“, erhalten „${actualNote}“`
    );
  }
}

console.log(
  "Natürliche Samsung-Notes-Sätze werden korrekt erkannt."
);
