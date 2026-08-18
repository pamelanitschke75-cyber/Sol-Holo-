import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const app = express();

app.use(express.json());
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/*
  Verbindung zu Sol-Holo-Memory
*/

const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

/*
  Memory-Tabellen anlegen
*/

async function initializeMemory() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS sol_memory (
      id BIGSERIAL PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sol_long_term_memory (
      id BIGSERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  console.log("Sol-Holo-Memory ist bereit.");
}

initializeMemory().catch((error) => {
  console.error("Fehler beim Initialisieren des Sol-Holo-Memory:", error);
});

/*
  Sol-Holo-Oberfläche ausliefern
*/

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/*
  Letzte Gesprächserinnerungen laden
*/

async function loadRecentMemory() {
  const result = await db.query(`
    SELECT role, content
    FROM sol_memory
    ORDER BY id DESC
    LIMIT 30
  `);

  return result.rows.reverse();
}

/*
  Gesprächserinnerung speichern
*/

async function saveMemory(role, content) {
  await db.query(
    `
      INSERT INTO sol_memory (role, content)
      VALUES ($1, $2)
    `,
    [role, content]
  );
}

/*
  Langzeiterinnerung speichern
*/

async function saveLongTermMemory(content) {
  const cleanContent = String(content || "").trim();

  if (!cleanContent) {
    return false;
  }

  const duplicate = await db.query(
    `
      SELECT id
      FROM sol_long_term_memory
      WHERE LOWER(content) = LOWER($1)
      LIMIT 1
    `,
    [cleanContent]
  );

  if (duplicate.rows.length > 0) {
    return false;
  }

  await db.query(
    `
      INSERT INTO sol_long_term_memory (content)
      VALUES ($1)
    `,
    [cleanContent]
  );

  return true;
}

/*
  Langzeiterinnerung vergessen
*/

async function forgetLongTermMemory(searchText) {
  const cleanSearchText = String(searchText || "").trim();

  if (!cleanSearchText) {
    return 0;
  }

  const result = await db.query(
    `
      DELETE FROM sol_long_term_memory
      WHERE LOWER(content) LIKE LOWER($1)
      RETURNING id
    `,
    [`%${cleanSearchText}%`]
  );

  return result.rowCount;
}

/*
  Relevante Langzeiterinnerungen laden
*/

async function loadRelevantLongTermMemory(message) {
  const cleanMessage = String(message || "").trim();

  if (!cleanMessage) {
    return [];
  }

  /*
    Zuerst versuchen wir eine Volltextsuche.
    Falls nichts gefunden wird, werden einige aktuelle
    Langzeiterinnerungen als Fallback geladen.
  */

  try {
    const result = await db.query(
      `
        SELECT content,
               ts_rank(
                 to_tsvector('german', content),
                 plainto_tsquery('german', $1)
               ) AS relevance
        FROM sol_long_term_memory
        WHERE to_tsvector('german', content)
              @@ plainto_tsquery('german', $1)
        ORDER BY relevance DESC, id DESC
        LIMIT 12
      `,
      [cleanMessage]
    );

    if (result.rows.length > 0) {
      return result.rows;
    }
  } catch (error) {
    console.error("Fehler bei Langzeit-Memory-Suche:", error);
  }

  const fallback = await db.query(`
    SELECT content
    FROM sol_long_term_memory
    ORDER BY id DESC
    LIMIT 8
  `);

  return fallback.rows;
}

/*
  Alle Langzeiterinnerungen laden
*/

async function loadAllLongTermMemory() {
  const result = await db.query(`
    SELECT id, content, created_at
    FROM sol_long_term_memory
    ORDER BY id ASC
  `);

  return result.rows;
}

/*
  Explizite Memory-Befehle erkennen
*/

function extractRememberCommand(message) {
  const match = message.match(
    /^\s*(?:sol[\s,:\-]*)?merke\s+dir\s+dauerhaft\s*:?\s*(.+)$/i
  );

  return match?.[1]?.trim() || null;
}

function extractForgetCommand(message) {
  const match = message.match(
    /^\s*(?:sol[\s,:\-]*)?vergiss\s+dauerhaft\s*:?\s*(.+)$/i
  );

  return match?.[1]?.trim() || null;
}

function isListMemoryCommand(message) {
  return /^\s*(?:sol[\s,:\-]*)?(?:was\s+weißt\s+du\s+dauerhaft|zeige\s+(?:mir\s+)?deine\s+langzeiterinnerungen)\s*\??\s*$/i.test(
    message
  );
}

/*
  Anfrage an Sol
*/

app.post("/sol", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({
        error: "Keine Frage erhalten."
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error: "Die Eingabe ist zu lang."
      });
    }

    /*
      Befehl:
      "Sol, merke dir dauerhaft: ..."
    */

    const rememberContent = extractRememberCommand(message);

    if (rememberContent) {
      await saveMemory("user", message);

      const saved = await saveLongTermMemory(rememberContent);

      const answer = saved
        ? `Ja, Pam. Das habe ich dauerhaft gespeichert: ${rememberContent}`
        : `Pam, diese Information ist bereits in meinem Langzeitgedächtnis gespeichert.`;

      await saveMemory("assistant", answer);

      return res.json({
        answer
      });
    }

    /*
      Befehl:
      "Sol, vergiss dauerhaft: ..."
    */

    const forgetContent = extractForgetCommand(message);

    if (forgetContent) {
      await saveMemory("user", message);

      const deletedCount = await forgetLongTermMemory(forgetContent);

      const answer =
        deletedCount > 0
          ? `Ja, Pam. Ich habe ${deletedCount} passende Langzeiterinnerung${deletedCount === 1 ? "" : "en"} entfernt.`
          : `Pam, dazu habe ich keine passende Langzeiterinnerung gefunden.`;

      await saveMemory("assistant", answer);

      return res.json({
        answer
      });
    }

    /*
      Befehl:
      "Sol, was weißt du dauerhaft?"
    */

    if (isListMemoryCommand(message)) {
      await saveMemory("user", message);

      const longTermMemories = await loadAllLongTermMemory();

      let answer;

      if (longTermMemories.length === 0) {
        answer = "Pam, mein Langzeitgedächtnis enthält momentan noch keine Einträge.";
      } else {
        const memoryList = longTermMemories
          .map((memory, index) => `${index + 1}. ${memory.content}`)
          .join("\n");

        answer = `Pam, aktuell habe ich folgende dauerhafte Erinnerungen gespeichert:\n\n${memoryList}`;
      }

      await saveMemory("assistant", answer);

      return res.json({
        answer
      });
    }

    /*
      Frühere Unterhaltung laden
    */

    const memories = await loadRecentMemory();

    const memoryText = memories
      .map((memory) => {
        const speaker =
          memory.role === "user"
            ? "Pam"
            : "Sol";

        return `${speaker}: ${memory.content}`;
      })
      .join("\n");

    /*
      Relevante Langzeiterinnerungen laden
    */

    const longTermMemories =
      await loadRelevantLongTermMemory(message);

    const longTermMemoryText =
      longTermMemories
        .map((memory) => `- ${memory.content}`)
        .join("\n") ||
      "Keine passenden Langzeiterinnerungen gefunden.";

    /*
      Aktuelle Nachricht speichern
    */

    await saveMemory("user", message);

    /*
      Sol antworten lassen
    */

    const response = await openai.responses.create({
      model: "gpt-5",

      instructions: `
Du bist Sol innerhalb des Projekts Sol Holo.

Pam spricht mit dir.

Antworte natürlich und verständlich auf Deutsch.

Deine Antwort wird anschließend von Sol Holo gesprochen
und über einen digitalen Avatar dargestellt.

Formuliere deshalb so, dass die Antwort gut vorgelesen
werden kann.

Sol ist die KI- und Kommunikationsebene.

Sol Holo ist die sichtbare digitale Verkörperung,
über die deine Antwort dargestellt und gesprochen wird.

MetaPerson ist ausschließlich die externe
Darstellungs-, TTS- und LipSync-Technik.
Die inhaltliche Antwort wird von Sol erzeugt.

Behaupte nicht, ein Mensch zu sein.

Du besitzt zwei Arten von Gedächtnis:

1. Gesprächsgedächtnis:
   Die letzten gespeicherten Gesprächsnachrichten.

2. Langzeitgedächtnis:
   Dauerhaft gespeicherte Informationen, die Pam
   ausdrücklich als langfristige Erinnerung festgelegt hat.

Verwende Erinnerungen nur dann, wenn sie für die aktuelle
Unterhaltung wirklich relevant sind.

Erfinde keine Erinnerungen.

Wenn eine Information nicht im Gedächtnis steht,
behaupte nicht, dass du dich daran erinnerst.

LANGZEITGEDÄCHTNIS:

${longTermMemoryText}

LETZTE UNTERHALTUNG:

${memoryText || "Noch keine früheren Gesprächserinnerungen vorhanden."}
`,

      input: message
    });

    const answer = response.output_text?.trim();

    if (!answer) {
      return res.status(502).json({
        error: "Sol hat keine Textantwort geliefert."
      });
    }

    /*
      Sols Antwort speichern
    */

    await saveMemory("assistant", answer);

    return res.json({
      answer
    });

  } catch (error) {
    console.error("Sol-Holo-Backend-Fehler:", error);

    return res.status(500).json({
      error: "Die Anfrage an Sol konnte nicht verarbeitet werden."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Sol-Holo läuft auf Port ${PORT}`);
});