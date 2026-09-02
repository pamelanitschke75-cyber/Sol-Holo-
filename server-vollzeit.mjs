import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

/*
  LEGACY-REFERENZDATEI

  Diese Datei dokumentiert den frueheren Stand mit automatischer, ungetrennter
  Vollzeitprotokollierung. Sie ist nicht der aktive Startpunkt (siehe
  package.json) und darf in dieser Form nicht neu ausgerollt werden.

  Fuer die aktuelle Regel "nur ausdruecklich bestaetigt" sowie die strikte
  Pam-/Steffi-Trennung gelten:

  - modules/identity-memory.mjs
  - modules/identity-memory-store.mjs
  - MEMORY_ARCHITECTURE.md

  Bestehende Legacy-Daten werden nicht geloescht. Der aktive Server muss die
  neue Policy vor jedem dauerhaften Write integrieren.
*/

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
  Clone-ID von Pam
*/

const CURRENT_CLONE_ID = "pam-sol-001";

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

  /*
    NEU:
    Sol Holo Vollzeitgedächtnis

    Hier wird jede Nachricht automatisch
    und dauerhaft gespeichert.
  */

  await db.query(`
    CREATE TABLE IF NOT EXISTS sol_fulltime_memory (
      id BIGSERIAL PRIMARY KEY,
      clone_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  console.log("Sol-Holo-Memory ist bereit.");
  console.log("Sol-Holo-Vollzeitgedächtnis ist bereit.");
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
  ==========================================================
  REALTIME / MIKROFON
  ==========================================================
*/

app.post("/realtime/token", async (req, res) => {
  console.log(
    ">>> /realtime/token wurde aufgerufen"
  );

  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error(
        "OPENAI_API_KEY fehlt."
      );

      return res.status(500).json({
        error: "OPENAI_API_KEY fehlt."
      });
    }

    const sessionConfig = {
      session: {
        type: "realtime",
        model: "gpt-realtime-2.1",

        instructions:
          "Du bist Sol, die KI-Stimme innerhalb von Sol Holo. Antworte natürlich, freundlich und auf Deutsch, sofern Pam nicht ausdrücklich eine andere Sprache verwendet.",

        audio: {
          output: {
            voice: "marin"
          }
        }
      }
    };

    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${process.env.OPENAI_API_KEY}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(
          sessionConfig
        )
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Realtime API Fehler:",
        data
      );

      return res
        .status(response.status)
        .json(data);
    }

    console.log(
      ">>> Realtime-Token erfolgreich erstellt"
    );

    return res.json(data);

  } catch (error) {
    console.error(
      "Realtime Token Fehler:",
      error
    );

    return res.status(500).json({
      error:
        "Realtime-Token konnte nicht erstellt werden."
    });
  }
});

/*
  ==========================================================
  GESPRÄCHSGEDÄCHTNIS
  ==========================================================
*/

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
      INSERT INTO sol_memory (
        role,
        content
      )
      VALUES ($1, $2)
    `,
    [
      role,
      content
    ]
  );
}

/*
  ==========================================================
  VOLLZEITGEDÄCHTNIS
  ==========================================================

  Jede Nachricht wird automatisch dauerhaft gespeichert.

  Keine Anweisung wie
  "Sol, merke dir dauerhaft ..."
  erforderlich.
*/

/*
  Vollzeitgedächtnis speichern
*/

async function saveFulltimeMemory(
  role,
  content
) {
  if (
    content === undefined ||
    content === null
  ) {
    return;
  }

  /*
    WICHTIG:

    Nicht trimmen.
    Nicht umformulieren.
    Nicht zusammenfassen.

    Der Text wird genau so gespeichert,
    wie er an diese Funktion übergeben wird.
  */

  const originalContent =
    String(content);

  await db.query(
    `
      INSERT INTO sol_fulltime_memory (
        clone_id,
        role,
        content
      )
      VALUES ($1, $2, $3)
    `,
    [
      CURRENT_CLONE_ID,
      role,
      originalContent
    ]
  );
}

/*
  Vollzeitgedächtnis laden

  Wird später für Sols vollständige Erinnerung
  weiter ausgebaut.
*/

async function loadFulltimeMemory(
  limit = 100
) {
  const result = await db.query(
    `
      SELECT
        id,
        clone_id,
        role,
        content,
        created_at
      FROM sol_fulltime_memory
      WHERE clone_id = $1
      ORDER BY id DESC
      LIMIT $2
    `,
    [
      CURRENT_CLONE_ID,
      limit
    ]
  );

  return result.rows.reverse();
}

/*
  ==========================================================
  LANGZEITGEDÄCHTNIS
  ==========================================================
*/

/*
  Langzeiterinnerung speichern
*/

async function saveLongTermMemory(content) {
  const cleanContent =
    String(content || "").trim();

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
    [
      cleanContent
    ]
  );

  if (
    duplicate.rows.length > 0
  ) {
    return false;
  }

  await db.query(
    `
      INSERT INTO sol_long_term_memory (
        content
      )
      VALUES ($1)
    `,
    [
      cleanContent
    ]
  );

  return true;
}

/*
  Langzeiterinnerung vergessen
*/

async function forgetLongTermMemory(
  searchText
) {
  const cleanSearchText =
    String(searchText || "").trim();

  if (!cleanSearchText) {
    return 0;
  }

  const result = await db.query(
    `
      DELETE FROM sol_long_term_memory
      WHERE LOWER(content)
            LIKE LOWER($1)
      RETURNING id
    `,
    [
      `%${cleanSearchText}%`
    ]
  );

  return result.rowCount;
}

/*
  Relevante Langzeiterinnerungen laden
*/

async function loadRelevantLongTermMemory(
  message
) {
  const cleanMessage =
    String(message || "").trim();

  if (!cleanMessage) {
    return [];
  }

  /*
    Zuerst versuchen wir eine Volltextsuche.

    Falls nichts gefunden wird,
    werden einige aktuelle Langzeiterinnerungen
    als Fallback geladen.
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
              $1
            )
          ) AS relevance

        FROM sol_long_term_memory

        WHERE
          to_tsvector(
            'german',
            content
          )
          @@
          plainto_tsquery(
            'german',
            $1
          )

        ORDER BY
          relevance DESC,
          id DESC

        LIMIT 12
      `,
      [
        cleanMessage
      ]
    );

    if (
      result.rows.length > 0
    ) {
      return result.rows;
    }

  } catch (error) {
    console.error(
      "Fehler bei Langzeit-Memory-Suche:",
      error
    );
  }

  const fallback =
    await db.query(`
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
  const result =
    await db.query(`
      SELECT
        id,
        content,
        created_at
      FROM sol_long_term_memory
      ORDER BY id ASC
    `);

  return result.rows;
}

/*
  ==========================================================
  MEMORY-BEFEHLE
  ==========================================================
*/

/*
  Explizite Memory-Befehle erkennen
*/

function extractRememberCommand(
  message
) {
  const match =
    message.match(
      /^\s*(?:sol[\s,:\-]*)?merke\s+dir\s+dauerhaft\s*:?\s*(.+)$/i
    );

  return (
    match?.[1]?.trim() ||
    null
  );
}

function extractForgetCommand(
  message
) {
  const match =
    message.match(
      /^\s*(?:sol[\s,:\-]*)?vergiss\s+dauerhaft\s*:?\s*(.+)$/i
    );

  return (
    match?.[1]?.trim() ||
    null
  );
}

function isListMemoryCommand(
  message
) {
  return /^\s*(?:sol[\s,:\-]*)?(?:was\s+weißt\s+du\s+dauerhaft|zeige\s+(?:mir\s+)?deine\s+langzeiterinnerungen)\s*\??\s*$/i.test(
    message
  );
}

/*
  ==========================================================
  ANFRAGE AN SOL
  ==========================================================
*/

app.post(
  "/sol",
  async (req, res) => {
    try {

      /*
        Originalnachricht übernehmen

        Für das Vollzeitgedächtnis wird die Nachricht
        möglichst unverändert gespeichert.
      */

      const originalMessage =
        String(
          req.body?.message || ""
        );

      /*
        Für Verarbeitung und Befehle
        arbeiten wir weiterhin mit trim().
      */

      const message =
        originalMessage.trim();

      if (!message) {
        return res.status(400).json({
          error:
            "Keine Frage erhalten."
        });
      }

      if (
        message.length > 4000
      ) {
        return res.status(400).json({
          error:
            "Die Eingabe ist zu lang."
        });
      }

      /*
        ======================================================
        VOLLZEITGEDÄCHTNIS

        Jede gültige Nachricht von Pam wird
        sofort dauerhaft gespeichert.

        OHNE Speicherbefehl.
        OHNE Prüfung auf Wichtigkeit.
        OHNE Zusammenfassung.
        ======================================================
      */

      await saveFulltimeMemory(
        "user",
        originalMessage
      );

      /*
        ======================================================
        Befehl:
        "Sol, merke dir dauerhaft: ..."
        ======================================================

        Dieser alte Befehl bleibt bestehen,
        damit nichts vom bisherigen System
        verloren geht.

        Zusätzlich wurde die komplette Nachricht
        bereits im Vollzeitgedächtnis gespeichert.
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

        /*
          Sols Antwort ebenfalls automatisch
          ins Vollzeitgedächtnis.
        */

        await saveFulltimeMemory(
          "assistant",
          answer
        );

        return res.json({
          answer
        });
      }

      /*
        ======================================================
        Befehl:
        "Sol, vergiss dauerhaft: ..."
        ======================================================
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

        await saveFulltimeMemory(
          "assistant",
          answer
        );

        return res.json({
          answer
        });
      }

      /*
        ======================================================
        Befehl:
        "Sol, was weißt du dauerhaft?"
        ======================================================
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
                (
                  memory,
                  index
                ) =>
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

        await saveFulltimeMemory(
          "assistant",
          answer
        );

        return res.json({
          answer
        });
      }

      /*
        ======================================================
        Frühere Unterhaltung laden
        ======================================================
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

            return (
              `${speaker}: ${memory.content}`
            );
          })
          .join("\n");

      /*
        ======================================================
        Relevante Langzeiterinnerungen laden
        ======================================================
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
        ======================================================
        Vollzeitgedächtnis laden
        ======================================================

        Momentan werden nur die letzten Einträge
        als zusätzlicher Kontext geladen.

        Die vollständige Tabelle bleibt dauerhaft
        in PostgreSQL gespeichert.
      */

      const fulltimeMemories =
        await loadFulltimeMemory(
          50
        );

      const fulltimeMemoryText =
        fulltimeMemories
          .map((memory) => {
            const speaker =
              memory.role === "user"
                ? "Pam"
                : "Sol";

            return (
              `${speaker}: ${memory.content}`
            );
          })
          .join("\n");

      /*
        ======================================================
        Aktuelle Nachricht zusätzlich
        im bisherigen Gesprächsgedächtnis speichern
        ======================================================
      */

      await saveMemory(
        "user",
        message
      );

      /*
        ======================================================
        Sol antworten lassen
        ======================================================
      */

      const response =
        await openai.responses.create({
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

Du besitzt jetzt drei Gedächtnisbereiche:

1. Gesprächsgedächtnis:
   Die letzten gespeicherten Gesprächsnachrichten.

2. Langzeitgedächtnis:
   Informationen, die Pam früher ausdrücklich
   als dauerhafte Erinnerungen gespeichert hat.

3. Vollzeitgedächtnis:
   Pam und Sols Gespräche werden automatisch
   und dauerhaft gespeichert.

Das Vollzeitgedächtnis benötigt keinen besonderen
Speicherbefehl.

Pam muss nicht mehr sagen:
"Sol, merke dir dauerhaft ..."

Jede normale Unterhaltung wird automatisch gespeichert.

Erfinde keine Erinnerungen.

Verändere gespeicherte Aussagen nicht.

Unterscheide zwischen einer gespeicherten Aussage
und einer daraus möglicherweise später abgeleiteten
Persönlichkeitseigenschaft.

Eine einzelne Aussage von Pam bedeutet nicht automatisch,
dass sie eine dauerhafte Persönlichkeitseigenschaft ist.

Wenn du eine Erinnerung verwendest,
beziehe dich nur auf tatsächlich vorhandene Informationen.

LANGZEITGEDÄCHTNIS:

${longTermMemoryText}

VOLLZEITGEDÄCHTNIS – LETZTE EINTRÄGE:

${fulltimeMemoryText || "Noch keine Einträge vorhanden."}

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
        ======================================================
        Sols Antwort im bisherigen
        Gesprächsgedächtnis speichern
        ======================================================
      */

      await saveMemory(
        "assistant",
        answer
      );

      /*
        ======================================================
        Sols Antwort automatisch dauerhaft
        ins Vollzeitgedächtnis speichern
        ======================================================
      */

      await saveFulltimeMemory(
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
  }
);

/*
  ==========================================================
  SERVER STARTEN
  ==========================================================
*/

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Sol-Holo läuft auf Port ${PORT}`
    );
  }
);
