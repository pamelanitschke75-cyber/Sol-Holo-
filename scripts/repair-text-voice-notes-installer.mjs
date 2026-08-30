import {
  readFileSync,
  writeFileSync
} from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const installerPath = join(
  process.cwd(),
  "scripts",
  "install-text-voice-notes.mjs"
);

let text = readFileSync(installerPath, "utf8");

const replacements = [
  [
    '          answer: data?.duplicate\n            ? `Diese Notiz war gerade schon gespeichert: „${notePreview(content)}“`\n            : `Notiz gespeichert: „${notePreview(content)}“`,',
    '          answer: data?.duplicate\n            ? "Diese Notiz war gerade schon gespeichert: „" + notePreview(content) + "“"\n            : "Notiz gespeichert: „" + notePreview(content) + "“",'
  ],
  [
    '          `https://sol-holo.onrender.com/notes?limit=${limit}`,',
    '          "https://sol-holo.onrender.com/notes?limit=" + encodeURIComponent(String(limit)),'
  ],
  [
    '          const prefix = date ? `${index + 1}. ${date}: ` : `${index + 1}. `;',
    '          const prefix = date\n            ? String(index + 1) + ". " + date + ": "\n            : String(index + 1) + ". ";'
  ],
  [
    '          answer: `Deine letzten Notizen:\\n${lines.join("\\\\n")}`,' ,
    '          answer: "Deine letzten Notizen:\\n" + lines.join("\\n"),'
  ],
  [
    'patchUiFile(join(projectRoot, "www", "sol-holo-ui.js"));\npatchUiFile(join(projectRoot, "sol-holo-ui.js"));\npatchIndexFile(join(projectRoot, "www", "index.html"));\npatchIndexFile(join(projectRoot, "index.html"));',
    'patchUiFile(join(projectRoot, "www", "sol-holo-ui.js"));\npatchIndexFile(join(projectRoot, "www", "index.html"));'
  ]
];

for (const [before, after] of replacements) {
  if (text.includes(before)) {
    text = text.replace(before, after);
  }
}

const forbidden = [
  '? `Diese Notiz war gerade schon gespeichert:',
  ': `Notiz gespeichert:',
  '`https://sol-holo.onrender.com/notes?limit=${limit}`',
  'const prefix = date ? `${index + 1}. ${date}: ` : `${index + 1}. `',
  'answer: `Deine letzten Notizen:'
];

for (const pattern of forbidden) {
  if (text.includes(pattern)) {
    throw new Error(
      `Notiz-Installer konnte nicht vollständig repariert werden: ${pattern}`
    );
  }
}

writeFileSync(installerPath, text, "utf8");

const check = spawnSync(
  process.execPath,
  ["--check", installerPath],
  {
    encoding: "utf8"
  }
);

if (check.status !== 0) {
  throw new Error(
    "Notiz-Installer ist nach der Reparatur syntaktisch ungültig:\n" +
    String(check.stderr || check.stdout || "")
  );
}

console.log(
  "Notiz-Installer geprüft: Text, Sprache und Holo-Layout können weiter gebaut werden."
);
