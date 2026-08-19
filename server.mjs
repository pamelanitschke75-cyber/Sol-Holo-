import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import crypto from "crypto";

const app = express();

/*
  Aktiver Sol-Holo-Klon
*/

const CURRENT_CLONE_ID = "pam-sol-001";

/*
  Middleware
*/

app.use(cors());

app.use(
  express.json({
    limit: "1mb"
  })
);

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

/*
  OpenAI
*/

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/*
  PostgreSQL
*/

const { Pool } = pg;

const db = new Pool({
  connectionString:
    process.env.DATABASE_URL
});

/*
  Memory initialisieren
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

  await db.query(`
    ALTER TABLE sol_memory
    ADD COLUMN IF NOT EXISTS clone_id TEXT
  `);

  await db.query(`
    ALTER TABLE sol_long_term_memory
    ADD COLUMN IF NOT EXISTS clone_id TEXT
  `);

  await db.query(`
    ALTER TABLE sol_long_term_memory
    ADD COLUMN IF NOT EXISTS source TEXT
  `);

  await db.query(`
    ALTER TABLE sol_long_term_memory
    ADD COLUMN IF NOT EXISTS memory_type TEXT
  `);

  await db.query(`
    ALTER TABLE sol_long_term_memory
    ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION
  `);

  await db.query(`
    ALTER TABLE sol_long_term_memory
    ADD COLUMN IF NOT EXISTS recall_status TEXT
    DEFAULT 'active'
  `);

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

  await db.query(`
    UPDATE sol_long_term_memory
    SET recall_status = 'active'
    WHERE recall_status IS NULL
       OR TRIM(recall_status) = ''
  `);

  console.log(
    "Sol-Holo-Memory ist bereit."
  );

  console.log(
    `Aktiver Klon: ${CURRENT_CLONE_ID}`
  );
}

initializeMemory().catch(
  (error) => {

    console.error(
      "Fehler beim Initialisieren des Sol-Holo-Memory:",
      error
    );

  }
);

/*
  Oberfläche
*/

app.use(
  express.static(__dirname)
);

app.get(
  "/",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );

  }
);

/*
  Health
*/

app.get(
  "/health",
  (req, res) => {

    res.json({
      ok: true,
      service: "Sol Holo",
      test: "TEST 011"
    });

  }
);

/*
  Gesprächsgedächtnis laden
*/

async function loadRecentMemory() {

  const result =
    await db.query(
      `
        SELECT
          role,
          content

        FROM sol_memory

        WHERE clone_id = $1

        ORDER BY id DESC

        LIMIT 30
      `,
      [
        CURRENT_CLONE_ID
      ]
    );

  return result.rows.reverse();
}

/*
  Gespräch speichern
*/

async function saveMemory(
  role,
  content
) {

  const cleanContent =
    String(
      content || ""
    ).trim();

  if (!cleanContent) {
    return;
  }

  await db.query(
    `
      INSERT INTO sol_memory (
        clone_id,
        role,
        content
      )

      VALUES (
        $1,
        $2,
        $3
      )
    `,
    [
      CURRENT_CLONE_ID,
      role,
      cleanContent
    ]
  );
}

/*
  Langzeiterinnerung speichern
*/

async function saveLongTermMemory(
  content,
  options = {}
) {

  const cleanContent =
    String(
      content || ""
    ).trim();

  if (!cleanContent) {
    return false;
  }

  const source =
    String(
      options.source ||
      "explicit_user_memory"
    );

  const memoryType =
    String(
      options.memoryType ||
      "general"
    );

  const confidence =
    Number.isFinite(
      Number(
        options.confidence
      )
    )
      ? Number(
          options.confidence
        )
      : 1;

  const duplicate =
    await db.query(
      `
        SELECT id

        FROM sol_long_term_memory

        WHERE clone_id = $1
          AND LOWER(content)
              = LOWER($2)
          AND recall_status <> 'deleted'

        LIMIT 1
      `,
      [
        CURRENT_CLONE_ID,
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
        clone_id,
        content,
        source,
        memory_type,
        confidence,
        recall_status
      )

      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'active'
      )
    `,
    [
      CURRENT_CLONE_ID,
      cleanContent,
      source,
      memoryType,
      confidence
    ]
  );

  return true;
}

/*
  Alter Löschbefehl

  Noch echter DELETE.
*/

async function forgetLongTermMemory(
  searchText
) {

  const cleanSearchText =
    String(
      searchText || ""
    ).trim();

  if (!cleanSearchText) {
    return 0;
  }

  const result =
    await db.query(
      `
        DELETE
        FROM sol_long_term_memory

        WHERE clone_id = $1

          AND LOWER(content)
              LIKE LOWER($2)

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
  Relevante Langzeiterinnerungen
*/

async function loadRelevantLongTermMemory(
  message
) {

  const cleanMessage =
    String(
      message || ""
    ).trim();

  if (!cleanMessage) {
    return [];
  }

  try {

    const result =
      await db.query(
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
            AND recall_status = 'active'

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
    await db.query(
      `
        SELECT content

        FROM sol_long_term_memory

        WHERE clone_id = $1
          AND recall_status = 'active'

        ORDER BY id DESC

        LIMIT 8
      `,
      [
        CURRENT_CLONE_ID
      ]
    );

  return fallback.rows;
}

/*
  Alle aktiven Langzeiterinnerungen
*/

async function loadAllLongTermMemory() {

  const result =
    await db.query(
      `
        SELECT
          id,
          content,
          created_at

        FROM sol_long_term_memory

        WHERE clone_id = $1
          AND recall_status = 'active'

        ORDER BY id ASC
      `,
      [
        CURRENT_CLONE_ID
      ]
    );

  return result.rows;
}

/*
  Realtime Memory
*/

async function buildRealtimeMemoryText() {

  const memories =
    await loadAllLongTermMemory();

  if (
    memories.length === 0
  ) {

    return (
      "Keine dauerhaften Erinnerungen gespeichert."
    );

  }

  return memories
    .map(
      (memory) =>
        `- ${memory.content}`
    )
    .join("\n");
}

/*
  Safety Identifier
*/

function getSafetyIdentifier() {

  return crypto
    .createHash("sha256")
    .update(
      CURRENT_CLONE_ID
    )
    .digest("hex");
}

/*
  Realtime Token
*/

app.get(
  "/realtime/token",

  async (req, res) => {

    try {

      if (
        !process.env.OPENAI_API_KEY
      ) {

        return res
          .status(500)
          .json({
            error:
              "OPENAI_API_KEY ist auf Render nicht gesetzt."
          });

      }

      const memoryText =
        await buildRealtimeMemoryText();

      const sessionConfig = {

        session: {

          type:
            "realtime",

          model:
            "gpt-realtime-2.1",

          output_modalities: [
            "audio"
          ],

          instructions: `
Du bist Sol innerhalb des Projekts Sol Holo.

Du führst ein gesprochenes Live-Gespräch mit Pam.

Der aktuell aktive persönliche Sol-Holo-Klon
hat die interne Kennung:

${CURRENT_CLONE_ID}

Sprich natürlich auf Deutsch.

Antworte wie in einem echten Gespräch.

Lass Pam ausreden.

Kurze Denkpausen oder kleine Unterbrechungen
bedeuten nicht automatisch,
dass Pam fertig gesprochen hat.

Reagiere nicht unnötig auf Hintergrundgeräusche.

Wenn Audio undeutlich ist,
rate nicht einfach,
was gesagt worden sein könnte.

Du darfst Humor,
Ironie und Scherze erkennen
und natürlich darauf reagieren.

Ein offensichtlicher Scherz,
eine ironische Aussage
oder eine hypothetische Aussage
ist nicht automatisch ein tatsächlicher Fakt.

Behaupte nicht,
ein Mensch zu sein.

Erfinde keine Erinnerungen.

Erfinde keine vergangenen Ereignisse.

Verändere gespeicherte Erinnerungen nicht,
damit sie später besser
zu einer Geschichte passen.

Wenn etwas nicht gespeichert ist,
behaupte nicht,
dich daran zu erinnern.

Wenn etwas unsicher ist,
behandle es als unsicher.

Verwende ausschließlich Erinnerungen
des aktuell aktiven Klons.

LANGZEITGEDÄCHTNIS:

${memoryText}
`,

          audio: {

            input: {

              /*
                OpenAI Realtime
                Noise Reduction

                near_field:
                für nahes Sprechen
                ins Handy / Headset
              */

              noise_reduction: {

                type:
                  "near_field"

              },

              /*
                Transkription
              */

              transcription: {

                model:
                  "gpt-live-transcribe",

                language:
                  "de"

              },

              /*
                Semantic VAD

                low:
                Pam bekommt mehr Zeit
                zum Sprechen.
              */

              turn_detection: {

                type:
                  "semantic_vad",

                eagerness:
                  "low",

                create_response:
                  true,

                interrupt_response:
                  true

              }

            },

            output: {

              voice:
                "marin"

            }

          }

        }

      };

      const openAIResponse =
        await fetch(
          "https://api.openai.com/v1/realtime/client_secrets",
          {

            method:
              "POST",

            headers: {

              Authorization:
                `Bearer ${process.env.OPENAI_API_KEY}`,

              "Content-Type":
                "application/json",

              "OpenAI-Safety-Identifier":
                getSafetyIdentifier()

            },

            body:
              JSON.stringify(
                sessionConfig
              )

          }
        );

      const responseText =
        await openAIResponse.text();

      if (
        !openAIResponse.ok
      ) {

        console.error(
          "OpenAI Realtime Fehler:",
          responseText
        );

        let openAIError =
          null;

        try {

          openAIError =
            JSON.parse(
              responseText
            );

        } catch {}

        return res
          .status(
            openAIResponse.status
          )
          .json({

            error:
              openAIError?.error?.message ||
              "OpenAI konnte keinen Realtime-Schlüssel erstellen."

          });

      }

      let data;

      try {

        data =
          JSON.parse(
            responseText
          );

      } catch {

        return res
          .status(502)
          .json({

            error:
              "OpenAI hat keine gültige Realtime-JSON-Antwort geliefert."

          });

      }

      if (
        !data?.value
      ) {

        return res
          .status(502)
          .json({

            error:
              "OpenAI hat keinen Realtime-Schlüssel zurückgegeben."

          });

      }

      return res.json(
        data
      );

    } catch (error) {

      console.error(
        "Realtime-Token-Fehler:",
        error
      );

      return res
        .status(500