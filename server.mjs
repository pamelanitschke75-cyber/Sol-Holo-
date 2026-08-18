import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const app = express();

/*
  Aktiver Sol-Holo-Klon

  Diese Kennung gehört aktuell zu Pams
  persönlichem Sol-Holo-Klon.

  Später soll die clone_id nicht fest im Code stehen,
  sondern aus dem jeweils aktiven Nutzerprofil
  bzw. der Anmeldung ermittelt werden.
*/

const CURRENT_CLONE_ID = "pam-sol-001";

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
  Memory-Tabellen anlegen und vorbereiten
*/

async function initializeMemory() {
  /*
    Bestehende Tabellen sicherstellen
  */

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

  /*
    clone_id ergänzen.

    Bestehende Erinnerungen werden nicht gelöscht.
  */

  await db.query(`
    ALTER TABLE sol_memory
    ADD COLUMN IF NOT EXISTS clone_id TEXT
  `);

  await db.query(`
    ALTER TABLE sol_long_term_memory
    ADD COLUMN IF NOT EXISTS clone_id TEXT
  `);

  /*
    Bereits vorhandene Erinnerungen
    Pams aktuellem Sol-Holo-Klon zuordnen.
  */

  await db.query(
    `
      UPDATE sol_memory
      SET clone_id = $1
      WHERE clone_id IS NULL
         OR TRIM(clone_id) = ''
    `,
    [CURRENT_CLONE_ID]
  );

  await db.query(
    `
      UPDATE sol_long_term_memory
      SET clone_id = $1
      WHERE clone_id IS NULL
         OR TRIM(clone_id) = ''
    `,
    [CURRENT_CLONE_ID]
  );

  console.log("Sol-Holo-Memory ist bereit.");
  console.log(
    `Bestehende Erinnerungen sind Klon ${CURRENT_CLONE_ID} zugeordnet.`
  );
}

initializeMemory().catch((error) => {
  console.error(
    "Fehler beim Initialisieren des Sol-Holo-Memory:",
    error
  );
});

/*
  Sol-Holo-Oberfläche ausliefern
*/

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

/*
  Letzte Gesprächserinnerungen laden

  Nur Erinnerungen des aktuell aktiven Klons.
*/

async function loadRecentMemory() {
  const result = await db.query(
    `
      SELECT role, content
      FROM sol_memory
      WHERE clone_id = $1
      ORDER BY id DESC
      LIMIT 30
    `,
    [CURRENT_CLONE_ID]
  );

  return result.rows.reverse();
}

/*
  Gesprächserinnerung speichern

  Jede neue Gesprächserinnerung wird
  dem aktiven Klon zugeordnet.
*/

async function saveMemory(role, content) {
  await db.query(
    `
      INSERT INTO sol_memory (
        clone_id,
        role,
        content
      )
      VALUES ($1, $2, $3)
    `,
    [
      CURRENT_CLONE_ID,
      role,
      content
    ]
  );
}

/*
  Langzeiterinnerung speichern

  Jede neue dauerhafte Erinnerung wird
  dem aktiven Klon zugeordnet.
*/

async function saveLongTermMemory(content) {
  const cleanContent =
    String(content || "").trim();

  if (!cleanContent) {
    return false;
  }

  /*
    Duplikate werden nur innerhalb
    desselben Klons geprüft.
  */

  const duplicate = await db.query(
    `
      SELECT id
      FROM sol_long_term_memory
      WHERE clone_id = $1
        AND LOWER(content) = LOWER($2)
      LIMIT 1
    `,
    [
      CURRENT_CLONE_ID,
      cleanContent
    ]
  );

  if (duplicate.rows.length > 0) {
    return false;
  }

  await db.query(
    `
      INSERT INTO sol_long_term_memory (
        clone_id,
        content
      )
      VALUES ($1, $2)
    `,
    [
      CURRENT_CLONE_ID,
      cleanContent
    ]
  );

  return true;
}

/*
  Langzeiterinnerung vergessen

  WICHTIG:
  Diese Funktion löscht aktuell noch tatsächlich
  aus der Datenbank.

  Später wird diese Logik entsprechend der
  neuen Memory Architecture getrennt in:

  - background
  - blocked
  - deleted

  Auch hier wird bereits nur innerhalb
  des aktiven Klons gearbeitet.
*/

async function forgetLongTermMemory(searchText) {
  const cleanSearchText =
    String(searchText || "").trim();

  if (!cleanSearchText) {
    return 0;
  }

  const result = await db.query(
    `
      DELETE FROM sol_long_term_memory
      WHERE clone_id = $1
        AND LOWER(content) LIKE LOWER($2)
      RETURNING id
    `,
    [
      CURRENT_CLONE_ID,
      `%${cleanSearchText}%`
    ]
  );

  return result.rowCount;
}

/*
  Relevante Langzeiterinnerungen laden

  Nur Erinnerungen des aktiven Klons.
*/

async function loadRelevantLongTermMemory(message) {
  const cleanMessage =
    String(message || "").trim();

  if (!cleanMessage) {
    return [];
  }

  /*
    Zuerst versuchen wir eine Volltextsuche.

    Falls nichts gefunden wird,
    werden einige aktuelle Langzeiterinnerungen
    desselben Klons als Fallback geladen.
  */

  try {
    const result = await db.query(
      `
        SELECT
          content,
          ts_rank(
            to_tsvector(
              'german',
              content
            ),
            plainto_tsquery(
              'german',
              $2
            )
          ) AS relevance
        FROM sol_long_term_memory
        WHERE clone_id = $1
          AND to_tsvector(
                'german',
                content
              )
              @@
              plainto_tsquery(
                'german',
                $2
              )
        ORDER BY
          relevance DESC,
          id DESC
        LIMIT 12
      `,
      [
        CURRENT_CLONE_ID,
        cleanMessage
      ]
    );

    if (result.rows.length > 0) {
      return result.rows;
    }
  } catch (error) {
    console.error(
      "Fehler bei Langzeit-Memory-Suche:",
      error
    );
  }

  const fallback = await db.query(
    `
      SELECT content
      FROM sol_long_term_memory
      WHERE clone_id = $1
      ORDER BY id DESC
      LIMIT 8
    `,
    [CURRENT_CLONE_ID]
  );

  return fallback.rows;
}

/*
  Alle Langzeiterinnerungen laden

  Nur Erinnerungen des aktiven Klons.
*/

async function loadAllLongTermMemory() {
  const result = await db.query(
    `
      SELECT
        id,
        content,
        created_at
      FROM sol_long_term_memory
      WHERE clone_id = $1
      ORDER BY id ASC
    `,
    [CURRENT_CLONE_ID]
  );

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
    const message =
      String(
        req.body?.message || ""
      ).trim();

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

    const rememberContent =
      extractRememberCommand(
        message
      );

    if (rememberContent) {
      await saveMemory(
        "user",
        message
      );

      const saved =
        await saveLongTermMemory(
          rememberContent
        );

      const answer =
        saved
          ? `Ja, Pam. Das habe ich dauerhaft gespeichert: ${rememberContent}`
          : `Pam, diese Information ist bereits in meinem Langzeitgedächtnis gespeichert.`;

      await saveMemory(
        "assistant",
        answer
      );

      return res.json({
        answer
      });
    }

    /*
      Befehl:
      "Sol, vergiss dauerhaft: ..."
    */

    const forgetContent =
      extractForgetCommand(
        message
      );

    if (forgetContent) {
      await saveMemory(
        "user",
        message
      );

      const deletedCount =
        await forgetLongTermMemory(
          forgetContent
        );

      const answer =
        deletedCount > 0
          ? `Ja, Pam. Ich habe ${deletedCount} passende Langzeiterinnerung${deletedCount === 1 ? "" : "en"} entfernt.`
          : `Pam, dazu habe ich keine passende Langzeiterinnerung gefunden.`;

      await saveMemory(
        "assistant",
        answer
      );

      return res.json({
        answer
      });
    }

    /*
      Befehl:
      "Sol, was weißt du dauerhaft?"
    */

    if (
      isListMemoryCommand(
        message
      )
    ) {
      await saveMemory(
        "user",
        message
      );

      const longTermMemories =
        await loadAllLongTermMemory();

      let answer;

      if (
        longTermMemories.length === 0
      ) {
        answer =
          "Pam, mein Langzeitgedächtnis enthält momentan noch keine Einträge.";
      } else {
        const memoryList =
          longTermMemories
            .map(
              (memory, index) =>
                `${index + 1}. ${memory.content}`
            )
            .join("\n");

        answer =
          `Pam, aktuell habe ich folgende dauerhafte Erinnerungen gespeichert:\n\n${memoryList}`;
      }

      await saveMemory(
        "assistant",
        answer
      );

      return res.json({
        answer
      });
    }

    /*
      Frühere Unterhaltung laden
    */

    const memories =
      await loadRecentMemory();

    const memoryText =
      memories
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
      await loadRelevantLongTermMemory(
        message
      );

    const longTermMemoryText =
      longTermMemories
        .map(
          (memory) =>
            `- ${memory.content}`
        )
        .join("\n") ||
      "Keine passenden Langzeiterinnerungen gefunden.";

    /*
      Aktuelle Nachricht speichern
    */

    await saveMemory(
      "user",
      message
    );

    /*
      Sol antworten lassen
    */

    const response =
      await openai.responses.create({
        model: "gpt-5",

        instructions: `
Du bist Sol innerhalb des Projekts Sol Holo.

Pam spricht mit dir.

Der aktuell aktive persönliche Sol-Holo-Klon
hat die technische Kennung:

${CURRENT_CLONE_ID}

Diese Kennung ist ausschließlich eine interne
technische Zuordnung.

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

Du besitzt aktuell zwei Arten von Gedächtnis:

1. Gesprächsgedächtnis:
   Die letzten gespeicherten Gesprächsnachrichten
   des aktuell aktiven Klons.

2. Langzeitgedächtnis:
   Dauerhaft gespeicherte Informationen
   des aktuell aktiven Klons.

Verwende Erinnerungen nur dann,
wenn sie für die aktuelle Unterhaltung
wirklich relevant sind.

Erfinde keine Erinnerungen.

Verändere gespeicherte Erinnerungen
nicht so, dass sie nachträglich besser
zu einer gewünschten Darstellung passen.

Wenn eine Information nicht im Gedächtnis steht,
behaupte nicht, dass du dich daran erinnerst.

Wenn du dir bei einer Erinnerung nicht sicher bist,
stelle Unsicherheit nicht als Gewissheit dar.

Verwende ausschließlich Erinnerungen,
die dem aktuell aktiven Klon zugeordnet wurden.

LANGZEITGEDÄCHTNIS:

${longTermMemoryText}

LETZTE UNTERHALTUNG:

${memoryText || "Noch keine früheren Gesprächserinnerungen vorhanden."}
`,

        input: message
      });

    const answer =
      response.output_text?.trim();

    if (!answer) {
      return res.status(502).json({
        error:
          "Sol hat keine Textantwort geliefert."
      });
    }

    /*
      Sols Antwort speichern
    */

    await saveMemory(
      "assistant",
      answer
    );

    return res.json({
      answer
    });

  } catch (error) {
    console.error(
      "Sol-Holo-Backend-Fehler:",
      error
    );

    return res.status(500).json({
      error:
        "Die Anfrage an Sol konnte nicht verarbeitet werden."
    });
  }
});

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Sol-Holo läuft auf Port ${PORT}`
  );
});