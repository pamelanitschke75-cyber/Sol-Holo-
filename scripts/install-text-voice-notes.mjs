import {
  existsSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();

function replaceOnce(text, before, after, label) {
  if (text.includes(after)) {
    return text;
  }

  const first = text.indexOf(before);
  if (first < 0) {
    throw new Error(`${label}: erwartete Stelle nicht gefunden.`);
  }

  if (text.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: erwartete Stelle ist nicht eindeutig.`);
  }

  return text.slice(0, first) + after + text.slice(first + before.length);
}

function patchServer() {
  const serverPath = join(projectRoot, "server.mjs");
  let server = readFileSync(serverPath, "utf8");

  if (!server.includes("CREATE TABLE IF NOT EXISTS sol_notes")) {
    const marker = `  /*
    Vollzeitgedächtnis: Die Daten werden NICHT rotiert oder`;

    const noteTable = `  await db.query(\`
    CREATE TABLE IF NOT EXISTS sol_notes (
      id BIGSERIAL PRIMARY KEY,
      clone_id TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'text',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  \`);

  await db.query(\`
    CREATE INDEX IF NOT EXISTS sol_notes_clone_created_idx
    ON sol_notes (
      clone_id,
      created_at DESC
    )
  \`);

${marker}`;

    server = replaceOnce(
      server,
      marker,
      noteTable,
      "Notiztabelle"
    );
  }

  if (!server.includes('app.post("/notes"')) {
    const marker = `/*
  ==========================================================
  ANFRAGE AN SOL
  ==========================================================
*/`;

    const routes = `/*
  ==========================================================
  PERSÖNLICHE NOTIZEN – SCHRIFT UND SPRACHE
  ==========================================================
*/

function cleanNoteSource(value) {
  const source = String(value || "text")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);

  return source || "text";
}

app.post("/notes", async (req, res) => {
  try {
    const content = String(req.body?.content || "").trim();
    const source = cleanNoteSource(req.body?.source);

    if (!content) {
      return res.status(400).json({
        ok: false,
        error: "EMPTY_NOTE"
      });
    }

    if (content.length > 4000) {
      return res.status(413).json({
        ok: false,
        error: "NOTE_TOO_LONG"
      });
    }

    const duplicate = await db.query(
      \`
        SELECT id, content, source, created_at, updated_at
        FROM sol_notes
        WHERE clone_id = $1
          AND content = $2
          AND created_at > NOW() - INTERVAL '8 seconds'
        ORDER BY id DESC
        LIMIT 1
      \`,
      [CURRENT_CLONE_ID, content]
    );

    if (duplicate.rows[0]) {
      return res.json({
        ok: true,
        duplicate: true,
        note: duplicate.rows[0]
      });
    }

    const inserted = await db.query(
      \`
        INSERT INTO sol_notes (
          clone_id,
          content,
          source
        )
        VALUES ($1, $2, $3)
        RETURNING id, content, source, created_at, updated_at
      \`,
      [CURRENT_CLONE_ID, content, source]
    );

    await db.query(
      \`
        INSERT INTO sol_fulltime_memory (
          clone_id,
          role,
          content
        )
        VALUES ($1, 'user', $2)
      \`,
      [
        CURRENT_CLONE_ID,
        \`Persönliche Notiz [\${source}]: \${content}\`
      ]
    );

    return res.json({
      ok: true,
      duplicate: false,
      note: inserted.rows[0]
    });
  } catch (error) {
    console.error("Notiz speichern:", error);
    return res.status(500).json({
      ok: false,
      error: "NOTE_SAVE_FAILED"
    });
  }
});

app.get("/notes", async (req, res) => {
  try {
    const requestedLimit = Number(req.query?.limit || 20);
    const limit = Math.max(
      1,
      Math.min(100, Number.isFinite(requestedLimit) ? requestedLimit : 20)
    );

    const result = await db.query(
      \`
        SELECT id, content, source, created_at, updated_at
        FROM sol_notes
        WHERE clone_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT $2
      \`,
      [CURRENT_CLONE_ID, limit]
    );

    return res.json({
      ok: true,
      notes: result.rows
    });
  } catch (error) {
    console.error("Notizen laden:", error);
    return res.status(500).json({
      ok: false,
      error: "NOTES_LOAD_FAILED"
    });
  }
});

${marker}`;

    server = replaceOnce(
      server,
      marker,
      routes,
      "Notiz-API"
    );
  }

  if (!server.includes("NOTIZFUNKTION TEXT UND SPRACHE")) {
    const marker = "    const realtimeInstructions = `";
    const replacement = `${marker}

NOTIZFUNKTION TEXT UND SPRACHE:
Wenn Pam ausdrücklich sagt, dass etwas notiert, als Notiz
festgehalten oder aufgeschrieben werden soll, MUSST du das
Tool \"create_note\" verwenden. Bestätige die Speicherung
erst, nachdem das Tool Erfolg gemeldet hat.
Wenn Pam nach ihren Notizen fragt oder sie sehen/vorgelesen
haben möchte, verwende \"list_notes\".
Wenn Pam Samsung Notes öffnen möchte, verwende
\"open_samsung_notes\".
Diese Regeln gelten gleichermaßen für gesprochene und
geschriebene Anweisungen.`;

    server = replaceOnce(
      server,
      marker,
      replacement,
      "Realtime-Notizanweisung"
    );
  }

  if (!server.includes('name:\n              "create_note"')) {
    const marker = `          {
            type:
              "function",

            name:
              "prepare_sms",`;

    const noteTools = `          {
            type:
              "function",

            name:
              "create_note",

            description:
              "Speichert genau den von Pam ausdrücklich genannten Inhalt als persönliche Notiz. Verwende dieses Tool bei Formulierungen wie notiere, mach eine Notiz, schreib als Notiz oder halte als Notiz fest.",

            parameters: {
              type:
                "object",

              properties: {
                content: {
                  type:
                    "string",
                  description:
                    "Der eigentliche Inhalt der Notiz ohne einleitende Befehlswörter."
                }
              },

              required: [
                "content"
              ],

              additionalProperties:
                false
            }
          },
          {
            type:
              "function",

            name:
              "list_notes",

            description:
              "Lädt Pams zuletzt gespeicherte persönliche Notizen, wenn Pam ihre Notizen sehen, hören oder auflisten möchte.",

            parameters: {
              type:
                "object",

              properties: {
                limit: {
                  type:
                    "integer",
                  minimum:
                    1,
                  maximum:
                    50
                }
              },

              additionalProperties:
                false
            }
          },
          {
            type:
              "function",

            name:
              "open_samsung_notes",

            description:
              "Öffnet Samsung Notes auf Pams Android-Handy, wenn Pam ausdrücklich Samsung Notes oder ihre Notizen-App öffnen möchte.",

            parameters: {
              type:
                "object",
              properties: {},
              additionalProperties:
                false
            }
          },
${marker}`;

    server = replaceOnce(
      server,
      marker,
      noteTools,
      "Realtime-Notiztools"
    );
  }

  writeFileSync(serverPath, server, "utf8");
}

function noteClientBlock() {
  return `  function normalizePersonalNoteText(value) {
    return String(value || "")
      .replace(/\\s+/g, " ")
      .trim();
  }

  function notePreview(value, maximum = 130) {
    const text = normalizePersonalNoteText(value);
    return text.length > maximum
      ? text.slice(0, maximum - 1) + "…"
      : text;
  }

  function noteCommandFromText(message) {
    const text = normalizePersonalNoteText(message);
    if (!text) {
      return null;
    }

    const withoutSol = text.replace(/^sol\\s*[,;:.-]?\\s*/i, "");

    if (/^(?:zeig(?:e)?|lies|lese|nenn(?:e)?|gib)\\s+(?:mir\\s+)?(?:meine\\s+)?notizen\\b/i.test(withoutSol) ||
        /^(?:welche|was\\s+für)\\s+notizen\\b/i.test(withoutSol)) {
      return {
        name: "list_notes",
        args: { limit: 20 }
      };
    }

    if (/^(?:öffne|oeffne|starte)\\s+(?:bitte\\s+)?(?:samsung\\s+notes|meine\\s+notizen(?:-app)?|die\\s+notizen(?:-app)?)\\b/i.test(withoutSol)) {
      return {
        name: "open_samsung_notes",
        args: {}
      };
    }

    const patterns = [
      /^(?:notiere|notier)\\s*(?:bitte\\s*)?[:,-]?\\s*(.+)$/i,
      /^(?:mach|mache|erstelle)\\s+(?:mir\\s+)?(?:bitte\\s+)?(?:eine\\s+)?notiz\\s*(?:mit|dazu|darüber)?\\s*[:,-]?\\s*(.+)$/i,
      /^(?:schreib|schreibe)\\s+(?:mir\\s+)?(?:bitte\\s+)?(?:als\\s+)?notiz\\s*[:,-]?\\s*(.+)$/i,
      /^(?:halt|halte)\\s+(?:bitte\\s+)?(?:als\\s+)?notiz\\s+fest\\s*[:,-]?\\s*(.+)$/i,
      /^(?:merk|merke)\\s+(?:dir\\s+)?(?:bitte\\s+)?(?:als\\s+)?notiz\\s*[:,-]?\\s*(.+)$/i
    ];

    for (const pattern of patterns) {
      const match = withoutSol.match(pattern);
      const content = normalizePersonalNoteText(match?.[1]);
      if (content) {
        return {
          name: "create_note",
          args: {
            content,
            source: "text"
          }
        };
      }
    }

    return null;
  }

  async function executeSolHoloNoteTool(name, args = {}) {
    const action = String(name || "");

    if (action === "open_samsung_notes") {
      const plugin = getPhoneContactsPlugin();
      if (!plugin?.openSamsungNotes) {
        return {
          success: false,
          answer: "Samsung Notes kann nur in der Pam’s-Holo-App für Android geöffnet werden."
        };
      }

      try {
        await plugin.openSamsungNotes();
        return {
          success: true,
          answer: "Samsung Notes ist geöffnet. Wähle dort bei Bedarf eine Notiz und teile sie mit Pam’s Holo."
        };
      } catch (error) {
        console.error("Samsung Notes per Notiztool öffnen:", error);
        return {
          success: false,
          answer: "Samsung Notes konnte gerade nicht geöffnet werden."
        };
      }
    }

    if (action === "create_note") {
      const content = normalizePersonalNoteText(args?.content);
      if (!content) {
        return {
          success: false,
          answer: "Der Notiztext fehlt noch."
        };
      }

      if (content.length > 4000) {
        return {
          success: false,
          answer: "Die Notiz ist zu lang. Bitte teile sie in zwei kürzere Notizen."
        };
      }

      try {
        const response = await fetch(
          "https://sol-holo.onrender.com/notes",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              content,
              source: String(args?.source || "text")
            })
          }
        );
        const data = await response.json();

        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "Notiz konnte nicht gespeichert werden.");
        }

        return {
          success: true,
          answer: data?.duplicate
            ? `Diese Notiz war gerade schon gespeichert: „${notePreview(content)}“`
            : `Notiz gespeichert: „${notePreview(content)}“`,
          note: data?.note || null
        };
      } catch (error) {
        console.error("Persönliche Notiz speichern:", error);
        return {
          success: false,
          answer: "Die Notiz konnte gerade nicht gespeichert werden."
        };
      }
    }

    if (action === "list_notes") {
      const requestedLimit = Number(args?.limit || 20);
      const limit = Math.max(
        1,
        Math.min(50, Number.isFinite(requestedLimit) ? requestedLimit : 20)
      );

      try {
        const response = await fetch(
          `https://sol-holo.onrender.com/notes?limit=${limit}`,
          { cache: "no-store" }
        );
        const data = await response.json();

        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "Notizen konnten nicht geladen werden.");
        }

        const notes = Array.isArray(data?.notes) ? data.notes : [];
        if (notes.length === 0) {
          return {
            success: true,
            answer: "Du hast noch keine persönlichen Notizen gespeichert.",
            notes
          };
        }

        const lines = notes.map((note, index) => {
          const date = note?.created_at
            ? new Date(note.created_at).toLocaleDateString("de-DE")
            : "";
          const prefix = date ? `${index + 1}. ${date}: ` : `${index + 1}. `;
          return prefix + notePreview(note?.content, 240);
        });

        return {
          success: true,
          answer: `Deine letzten Notizen:\n${lines.join("\\n")}`,
          notes
        };
      } catch (error) {
        console.error("Persönliche Notizen laden:", error);
        return {
          success: false,
          answer: "Deine Notizen konnten gerade nicht geladen werden."
        };
      }
    }

    return {
      success: false,
      answer: "Unbekannte Notizfunktion."
    };
  }

  window.executeSolHoloNoteTool = executeSolHoloNoteTool;
`;
}

function patchUiFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  let ui = readFileSync(filePath, "utf8");

  if (!ui.includes("function noteCommandFromText(message)")) {
    const marker = `  window.handleSolHoloLocalAction = async (message) => {`;
    ui = replaceOnce(
      ui,
      marker,
      noteClientBlock() + "\n" + marker,
      `Notizfunktionen in ${filePath}`
    );
  }

  if (!ui.includes("const noteCommand = noteCommandFromText(cleanMessage);")) {
    const marker = `  window.handleSolHoloLocalAction = async (message) => {
    const cleanMessage = String(message || "").trim();`;

    const replacement = `${marker}

    const noteCommand = noteCommandFromText(cleanMessage);
    if (noteCommand) {
      const result = await executeSolHoloNoteTool(
        noteCommand.name,
        noteCommand.args
      );
      return {
        handled: true,
        answer: result.answer
      };
    }`;

    ui = replaceOnce(
      ui,
      marker,
      replacement,
      `Text-Notizbefehle in ${filePath}`
    );
  }

  if (!ui.includes('source: "samsung_notes"')) {
    const oldSamsungSave = `      await askSol(\`Sol, merke dir dauerhaft: \${memoryText}\`);
      showToast("Die bestätigte Notiz wurde an Sol übergeben.");`;

    const newSamsungSave = `      const savedNote = await executeSolHoloNoteTool(
        "create_note",
        {
          content: memoryText,
          source: "samsung_notes"
        }
      );

      if (!savedNote.success) {
        showToast(savedNote.answer);
        return;
      }

      showToast("Die bestätigte Samsung-Notiz wurde dauerhaft gespeichert.");`;

    ui = replaceOnce(
      ui,
      oldSamsungSave,
      newSamsungSave,
      `Samsung-Notizspeicherung in ${filePath}`
    );
  }

  ui = ui.replace(
    "Sol, fasse unsere letzten Gespräche und Notizen zusammen.",
    "Sol, zeig mir meine Notizen."
  );

  writeFileSync(filePath, ui, "utf8");
}

function patchIndexFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  let html = readFileSync(filePath, "utf8");

  if (!html.includes('"create_note",\n  "list_notes",\n  "open_samsung_notes"')) {
    const oldSet = `const REALTIME_LOCAL_TOOL_NAMES = new Set([
  "search_personal_memory",
  "search_phone_contact",
  "start_phone_call",
  "prepare_sms",
  "read_health_snapshot"
]);`;

    const newSet = `const REALTIME_LOCAL_TOOL_NAMES = new Set([
  "search_personal_memory",
  "create_note",
  "list_notes",
  "open_samsung_notes",
  "search_phone_contact",
  "start_phone_call",
  "prepare_sms",
  "read_health_snapshot"
]);`;

    html = replaceOnce(
      html,
      oldSet,
      newSet,
      `Realtime-Notiztoolnamen in ${filePath}`
    );
  }

  if (!html.includes("executeSolHoloNoteTool")) {
    const marker = `    }else if(toolCall?.name === "read_health_snapshot"){
      if(typeof window.executeSolHoloHealthTool === "function"){`;

    const replacement = `    }else if(
      toolCall?.name === "create_note" ||
      toolCall?.name === "list_notes" ||
      toolCall?.name === "open_samsung_notes"
    ){
      if(typeof window.executeSolHoloNoteTool === "function"){
        const noteArguments = {
          ...parsedArguments,
          source: toolCall?.name === "create_note"
            ? "voice"
            : parsedArguments?.source
        };
        const result = await window.executeSolHoloNoteTool(
          toolCall?.name,
          noteArguments
        );
        output = String(
          result?.answer ||
          "Die Notizfunktion hat keine Antwort geliefert."
        );
      }else{
        output = "Die Notizfunktion ist in dieser App-Version nicht verfügbar.";
      }
${marker}`;

    html = replaceOnce(
      html,
      marker,
      replacement,
      `Realtime-Notiztoolausführung in ${filePath}`
    );
  }

  if (!html.includes("Die Notizfunktion ist technisch fehlgeschlagen")) {
    const marker = `      : toolCall?.name === "read_health_snapshot"
        ? "Die Health-Abfrage ist technisch fehlgeschlagen. Erfinde keine Gesundheitswerte und stelle keine Diagnose."`;

    const replacement = `      : (
          toolCall?.name === "create_note" ||
          toolCall?.name === "list_notes" ||
          toolCall?.name === "open_samsung_notes"
        )
        ? "Die Notizfunktion ist technisch fehlgeschlagen. Behaupte nicht, dass eine Notiz gespeichert oder Samsung Notes geöffnet wurde."
        : toolCall?.name === "read_health_snapshot"
        ? "Die Health-Abfrage ist technisch fehlgeschlagen. Erfinde keine Gesundheitswerte und stelle keine Diagnose."`;

    html = replaceOnce(
      html,
      marker,
      replacement,
      `Realtime-Notizfehler in ${filePath}`
    );
  }

  writeFileSync(filePath, html, "utf8");
}

patchServer();
patchUiFile(join(projectRoot, "www", "sol-holo-ui.js"));
patchUiFile(join(projectRoot, "sol-holo-ui.js"));
patchIndexFile(join(projectRoot, "www", "index.html"));
patchIndexFile(join(projectRoot, "index.html"));

console.log(
  "Persönliche Notizen sind für Schrift und Sprache vorbereitet: speichern, auflisten und Samsung Notes öffnen."
);
