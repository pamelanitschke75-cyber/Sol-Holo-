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
  ["Hey Pam, schreibe in Notes: Weckruf und Stimme funktionieren", "Weckruf und Stimme funktionieren"],
  ["Hallo Sol, schreib bitte Wasser in Samsung Notes", "Wasser"],
  ["Schreib Zucker, Milch und Kaffee in Samsung Notes", "Zucker, Milch und Kaffee"],
  ["Schreib in meine Notizen bitte Termin um 9:30 Uhr", "Termin um 9:30 Uhr"],
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

const insertionStart = uiSource.indexOf(
  "function samsungNoteInsertionFromNaturalRequest"
);
const insertionEnd = uiSource.indexOf(
  "\n\n  function insertSamsungNoteLineBelow",
  insertionStart
);
if (insertionStart < 0 || insertionEnd < 0) {
  throw new Error("Samsung-Notes-Ergänzungserkennung wurde nicht gefunden.");
}
vm.runInContext(
  `${uiSource.slice(insertionStart, insertionEnd)}\n` +
    "this.extractSamsungNoteInsertion = samsungNoteInsertionFromNaturalRequest;",
  context
);

const insertionExamples = new Map([
  ["Setze Zucker unter Zitronensaft", ["Zucker", "Zitronensaft"]],
  ["Füge Zucker unter Zitronensaft hinzu", ["Zucker", "Zitronensaft"]],
  ["Sol, bitte setze Zucker unter Zitronensaft in Samsung Notes", ["Zucker", "Zitronensaft"]],
  ["Hey Pam, setze Zucker unter Zitronensaft in Samsung Notes", ["Zucker", "Zitronensaft"]]
]);

for (const [spokenText, [addition, anchor]] of insertionExamples) {
  const actual = context.extractSamsungNoteInsertion(spokenText);
  if (actual?.addition !== addition || actual?.anchor !== anchor) {
    throw new Error(
      `Falsche Notes-Ergänzung für „${spokenText}“: ` +
        `erwartet „${anchor} / ${addition}“, erhalten ${JSON.stringify(actual)}`
    );
  }
}

const insertLineStart = uiSource.indexOf(
  "function insertSamsungNoteLineBelow"
);
const insertLineEnd = uiSource.indexOf(
  "\n\n  window.extractSolHoloSamsungNoteText",
  insertLineStart
);
if (insertLineStart < 0 || insertLineEnd < 0) {
  throw new Error("Samsung-Notes-Zeilenaufbau wurde nicht gefunden.");
}
vm.runInContext(
  `${uiSource.slice(insertLineStart, insertLineEnd)}\n` +
    "this.insertSamsungNoteLineBelow = insertSamsungNoteLineBelow;",
  context
);
assertNoteDraft("Zitronensaft", "Zitronensaft\nZucker");
assertNoteDraft("Zitronensaft\nZucker", "Zitronensaft\nZucker");

function assertNoteDraft(existing, expected) {
  const actual = context.insertSamsungNoteLineBelow(
    existing,
    "Zitronensaft",
    "Zucker"
  );
  if (actual !== expected) {
    throw new Error(
      `Falscher Samsung-Notes-Entwurf: erwartet ${JSON.stringify(expected)}, ` +
        `erhalten ${JSON.stringify(actual)}`
    );
  }
}

const phonePluginSource = fs.readFileSync(
  "android-native/PhoneContactsPlugin.java",
  "utf8"
);
const launchStart = phonePluginSource.indexOf(
  "private SamsungNoteLaunch samsungNoteLaunch"
);
const launchEnd = phonePluginSource.indexOf(
  "\n    @PluginMethod",
  launchStart
);
const launchSource = phonePluginSource.slice(launchStart, launchEnd);
const standardShareIndex = launchSource.indexOf(
  "new Intent(Intent.ACTION_SEND)"
);
const customCreateIndex = launchSource.indexOf(
  "new Intent(GOOGLE_CREATE_NOTE_ACTION)"
);

if (
  launchStart < 0 ||
  launchEnd < 0 ||
  standardShareIndex < 0 ||
  customCreateIndex < 0 ||
  standardShareIndex > customCreateIndex
) {
  throw new Error(
    "Samsung Notes muss zuerst die standardisierte ACTION_SEND-Textübergabe verwenden."
  );
}

for (const requiredSource of [
  "intent.putExtra(Intent.EXTRA_TEXT, text)",
  'result.put("saved", false)',
  'result.put("contentTransferred", true)',
  "new AlertDialog.Builder(activity)",
  '"Empfänger: " + recipient',
  '"SMS-Inhalt:\\n" + message',
  "Intent.ACTION_DIAL",
  "Intent.ACTION_SENDTO"
]) {
  if (!phonePluginSource.includes(requiredSource)) {
    throw new Error(
      `Erwartete sichere Geräteübergabe fehlt: ${requiredSource}`
    );
  }
}

if (
  phonePluginSource.includes("Intent.ACTION_CALL") ||
  phonePluginSource.includes("SmsManager")
) {
  throw new Error(
    "Anruf oder SMS darf nicht direkt ohne die sichtbare Ziel-App ausgelöst werden."
  );
}

const nativeInstallerSource = fs.readFileSync(
  "scripts/install-whatsapp-driving-mode.mjs",
  "utf8"
);
if (
  nativeInstallerSource.includes("android.permission.CALL_PHONE") ||
  nativeInstallerSource.includes("android.permission.SEND_SMS")
) {
  throw new Error(
    "Die App darf keine Berechtigung zum direkten Anrufen oder SMS-Senden anfordern."
  );
}

const healthPluginSource = fs.readFileSync(
  "android-native/HealthConnectPlugin.java",
  "utf8"
);
if (
  !healthPluginSource.includes(
    "HealthConnectManager.ACTION_MANAGE_HEALTH_PERMISSIONS"
  ) ||
  healthPluginSource.includes("RequestMultiplePermissions")
) {
  throw new Error(
    "Health Connect muss die sichtbare Android-Verwaltungsseite zum Erteilen und Widerrufen öffnen."
  );
}

const healthPrivacySource = fs.readFileSync(
  "android-native/HealthPrivacyActivity.java",
  "utf8"
);
if (
  !healthPrivacySource.includes(
    "Health-Freigaben verwalten oder widerrufen"
  )
) {
  throw new Error(
    "Der Health-Datenschutzhinweis braucht einen verständlichen Widerrufsweg."
  );
}

console.log(
  "Samsung-Notes-Textübergabe und sichere Gerätebestätigungen sind geprüft."
);
