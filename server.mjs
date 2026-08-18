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

  Aktuell:
  Pams persönlicher Sol-Holo-Klon.

  Später wird diese ID aus dem
  angemeldeten Nutzerprofil ermittelt.
*/

const CURRENT_CLONE_ID = "pam-sol-001";

app.use(express.json());
app.use(cors());

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

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

  /*
    clone_id ergänzen
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
    Vorhandene Erinnerungen
    Pams aktuellem Klon zuordnen
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
  Oberfläche ausliefern
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
      [CURRENT_CLONE_ID]
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
*/

async function saveLongTermMemory(
  content
) {

  const cleanContent =
    String(
      content || ""
    ).trim();

  if (!cleanContent) {
    return false;
  }

  const duplicate =
    await db.query(
      `
        SELECT id
        FROM sol_long_term_memory
        WHERE clone_id = $1
          AND LOWER(content)
              = LOWER($2)
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
  Langzeiterinnerung löschen

  ACHTUNG:
  Diese Funktion verwendet aktuell
  noch DELETE.

  Die neue Memory-Architektur mit
  background / blocked / deleted
  bauen wir separat ein.
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
            )
            AS relevance

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
        ORDER BY id DESC
        LIMIT 8
      `,
      [CURRENT_CLONE_ID]
    );

  return fallback.rows;
}

/*
  Alle Langzeiterinnerungen
*/

async function loadAllLongTermMemory() {

  const result =
    await