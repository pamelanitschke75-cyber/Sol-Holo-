import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import crypto from "crypto";
import { google } from "googleapis";

const app = express();

/*
  ==========================================================
  SOL HOLO – INTERNE MEMORY-ZUORDNUNG
  ==========================================================
*/

const MEMORY_OWNER_ID = "pam-sol";
const LEGACY_MEMORY_OWNER_ID = "pam-sol-001";

/*
  ==========================================================
  GOOGLE KALENDER
  ==========================================================
*/

const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "https://sol-holo.onrender.com/auth/google/callback";

const GOOGLE_TIME_ZONE =
  process.env.GOOGLE_TIME_ZONE ||
  "Europe/Berlin";

const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events"
];

/*
  ==========================================================
  MIDDLEWARE
  ==========================================================
*/

app.use(cors());

app.use(
  express.json({
    limit: "12mb"
  })
);

/*
  ==========================================================
  DATEIPFADE
  ==========================================================
*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
  ==========================================================
  OPENAI
  ==========================================================
*/

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/*
  ==========================================================
  POSTGRESQL
  ==========================================================
*/

const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? {
              rejectUnauthorized: false
            }
          : false
    })
  : null;

/*
  ==========================================================
  GOOGLE OAUTH CLIENT
  ==========================================================
*/

function getGoogleOAuthClient() {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET
  ) {
    return null;
  }

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/*
  ==========================================================
  DATENBANK INITIALISIEREN
  ==========================================================
*/

async function initializeDatabase() {
  if (!pool) {
    console.log(
      "Keine DATABASE_URL gesetzt – Datenbankfunktionen deaktiviert."
    );

    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sol_long_term_memory (
        id BIGSERIAL PRIMARY KEY,
        owner_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS
      sol_long_term_memory_owner_idx
      ON sol_long_term_memory(owner_id)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS google_calendar_tokens (
        id BIGSERIAL PRIMARY KEY,
        owner_id TEXT UNIQUE NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        scope TEXT,
        token_type TEXT,
        expiry_date BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log("Datenbank bereit.");
  } catch (error) {
    console.error(
      "Fehler beim Initialisieren der Datenbank:",
      error
    );
  }
}

/*
  ==========================================================
  LANGZEITGEDÄCHTNIS LESEN
  ==========================================================
*/

async function getLongTermMemories() {
  if (!pool) {
    return [];
  }

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        owner_id,
        content,
        created_at,
        updated_at
      FROM sol_long_term_memory
      WHERE owner_id = $1
         OR owner_id = $2
      ORDER BY created_at ASC
      `,
      [
        MEMORY_OWNER_ID,
        LEGACY_MEMORY_OWNER_ID
      ]
    );

    return result.rows;
  } catch (error) {
    console.error(
      "Fehler beim Lesen des Langzeitgedächtnisses:",
      error
    );

    return [];
  }
}

/*
  ==========================================================
  LANGZEITGEDÄCHTNIS SPEICHERN
  ==========================================================
*/

async function saveLongTermMemory(content) {
  if (!pool) {
    throw new Error(
      "Datenbank ist nicht verfügbar."
    );
  }

  const cleanContent =
    String(content || "").trim();

  if (!cleanContent) {
    throw new Error(
      "Leere Erinnerung kann nicht gespeichert werden."
    );
  }

  const result = await pool.query(
    `
    INSERT INTO sol_long_term_memory (
      owner_id,
      content
    )
    VALUES ($1, $2)
    RETURNING *
    `,
    [
      MEMORY_OWNER_ID,
      cleanContent
    ]
  );

  return result.rows[0];
}

/*
  ==========================================================
  LANGZEITGEDÄCHTNIS LÖSCHEN
  ==========================================================
*/

async function deleteLongTermMemory(searchText) {
  if (!pool) {
    throw new Error(
      "Datenbank ist nicht verfügbar."
    );
  }

  const cleanSearch =
    String(searchText || "").trim();

  if (!cleanSearch) {
    return 0;
  }

  const result = await pool.query(
    `
    DELETE FROM sol_long_term_memory
    WHERE (
      owner_id = $1
      OR owner_id = $2
    )
    AND content ILIKE $3
    `,
    [
      MEMORY_OWNER_ID,
      LEGACY_MEMORY_OWNER_ID,
      `%${cleanSearch}%`
    ]
  );

  return result.rowCount || 0;
}

/*
  ==========================================================
  MEMORY-BEFEHLE ERKENNEN
  ==========================================================
*/

function extractSaveMemoryCommand(text) {
  const patterns = [
    /^sol[,\s]*merke dir dauerhaft[:\s]*(.+)$/i,
    /^merke dir dauerhaft[:\s]*(.+)$/i,
    /^speichere dauerhaft[:\s]*(.+)$/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractDeleteMemoryCommand(text) {
  const patterns = [
    /^sol[,\s]*vergiss dauerhaft[:\s]*(.+)$/i,
    /^vergiss dauerhaft[:\s]*(.+)$/i,
    /^lösche dauerhaft[:\s]*(.+)$/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function isShowMemoryCommand(text) {
  const normalized =
    text.toLowerCase().trim();

  return (
    normalized.includes(
      "was weißt du dauerhaft"
    ) ||
    normalized.includes(
      "langzeitgedächtnis anzeigen"
    ) ||
    normalized.includes(
      "zeige dein langzeitgedächtnis"
    ) ||
    normalized.includes(
      "zeige mir deine dauerhaften erinnerungen"
    )
  );
}

/*
  ==========================================================
  GOOGLE TOKEN LADEN
  ==========================================================
*/

async function loadGoogleTokens() {
  if (!pool) {
    return null;
  }

  try {
    const result = await pool.query(
      `
      SELECT *
      FROM google_calendar_tokens
      WHERE owner_id = $1
      LIMIT 1
      `,
      [MEMORY_OWNER_ID]
    );

    if (!result.rows.length) {
      return null;
    }

    const row = result.rows[0];

    return {
      access_token:
        row.access_token || undefined,

      refresh_token:
        row.refresh_token || undefined,

      scope:
        row.scope || undefined,

      token_type:
        row.token_type || undefined,

      expiry_date:
        row.expiry_date
          ? Number(row.expiry_date)
          : undefined
    };
  } catch (error) {
    console.error(
      "Google-Tokens konnten nicht geladen werden:",
      error
    );

    return null;
  }
}

/*
  ==========================================================
  GOOGLE TOKEN SPEICHERN
  ==========================================================
*/

async function saveGoogleTokens(tokens) {
  if (!pool) {
    return;
  }

  await pool.query(
    `
    INSERT INTO google_calendar_tokens (
      owner_id,
      access_token,
      refresh_token,
      scope,
      token_type,
      expiry_date,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      NOW()
    )

    ON CONFLICT (owner_id)

    DO UPDATE SET
      access_token =
        EXCLUDED.access_token,

      refresh_token =
        COALESCE(
          EXCLUDED.refresh_token,
          google_calendar_tokens.refresh_token
        ),

      scope =
        EXCLUDED.scope,

      token_type =
        EXCLUDED.token_type,

      expiry_date =
        EXCLUDED.expiry_date,

      updated_at =
        NOW()
    `,
    [
      MEMORY_OWNER_ID,
      tokens.access_token || null,
      tokens.refresh_token || null,
      tokens.scope || null,
      tokens.token_type || null,
      tokens.expiry_date || null
    ]
  );
}

/*
  ==========================================================
  GOOGLE AUTH
  ==========================================================
*/

app.get(
  "/auth/google",
  async (req, res) => {
    try {
      const oauth2Client =
        getGoogleOAuthClient();

      if (!oauth2Client) {
        return res.status(500).send(
          "Google Kalender ist noch nicht vollständig konfiguriert."
        );
      }

      const state =
        crypto.randomBytes(24).toString("hex");

      const url =
        oauth2Client.generateAuthUrl({
          access_type: "offline",
          prompt: "consent",
          scope:
            GOOGLE_CALENDAR_SCOPES,
          state
        });

      res.redirect(url);
    } catch (error) {
      console.error(
        "Google Auth Fehler:",
        error
      );

      res.status(500).send(
        "Google-Anmeldung konnte nicht gestartet werden."
      );
    }
  }
);

/*
  ==========================================================
  GOOGLE CALLBACK
  ==========================================================
*/

app.get(
  "/auth/google/callback",
  async (req, res) => {
    try {
      const code =
        String(req.query.code || "");

      if (!code) {
        return res.status(400).send(
          "Google hat keinen Autorisierungscode zurückgegeben."
        );
      }

      const oauth2Client =
        getGoogleOAuthClient();

      if (!oauth2Client) {
        return res.status(500).send(
          "Google Kalender ist nicht konfiguriert."
        );
      }

      const { tokens } =
        await oauth2Client.getToken(code);

      oauth2Client.setCredentials(tokens);

      await saveGoogleTokens(tokens);

      res.send(`
        <!doctype html>
        <html lang="de">
          <head>
            <meta charset="utf-8">
            <meta
              name="viewport"
              content="width=device-width,initial-scale=1"
            >
            <title>
              Sol Holo – Google Kalender
            </title>
          </head>

          <body
            style="
              margin:0;
              min-height:100vh;
              display:flex;
              align-items:center;
              justify-content:center;
              background:#05070d;
              color:white;
              font-family:Arial,sans-serif;
              text-align:center;
              padding:24px;
            "
          >
            <div>
              <h1>Sol Holo 🌻</h1>

              <p>
                Google Kalender wurde erfolgreich verbunden.
              </p>

              <p>
                Du kannst dieses Fenster jetzt schließen.
              </p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error(
        "Google Callback Fehler:",
        error
      );

      res.status(500).send(
        "Google Kalender konnte nicht verbunden werden."
      );
    }
  }
);

/*
  ==========================================================
  GOOGLE STATUS
  ==========================================================
*/

app.get(
  "/calendar/status",
  async (req, res) => {
    try {
      const tokens =
        await loadGoogleTokens();

      res.json({
        connected:
          Boolean(
            tokens &&
            (
              tokens.access_token ||
              tokens.refresh_token
            )
          )
      });
    } catch (error) {
      console.error(
        "Kalender-Status Fehler:",
        error
      );

      res.status(500).json({
        connected: false
      });
    }
  }
);

/*
  ==========================================================
  GOOGLE KALENDER – EVENT ERSTELLEN
  ==========================================================
*/

app.post(
  "/calendar/event",
  async (req, res) => {
    try {
      const oauth2Client =
        getGoogleOAuthClient();

      if (!oauth2Client) {
        return res.status(500).json({
          error:
            "Google Kalender ist nicht konfiguriert."
        });
      }

      const tokens =
        await loadGoogleTokens();

      if (!tokens) {
        return res.status(401).json({
          error:
            "Google Kalender ist noch nicht verbunden."
        });
      }

      oauth2Client.setCredentials(tokens);

      oauth2Client.on(
        "tokens",
        async newTokens => {
          try {
            await saveGoogleTokens({
              ...tokens,
              ...newTokens
            });
          } catch (error) {
            console.error(
              "Aktualisierte Google-Tokens konnten nicht gespeichert werden:",
              error
            );
          }
        }
      );

      const calendar =
        google.calendar({
          version: "v3",
          auth: oauth2Client
        });

      const {
        summary,
        description,
        start,
        end
      } = req.body || {};

      if (!summary || !start) {
        return res.status(400).json({
          error:
            "Titel und Startzeit werden benötigt."
        });
      }

      const startDate =
        new Date(start);

      if (
        Number.isNaN(
          startDate.getTime()
        )
      ) {
        return res.status(400).json({
          error:
            "Ungültige Startzeit."
        });
      }

      let endDate;

      if (end) {
        endDate =
          new Date(end);
      } else {
        endDate =
          new Date(
            startDate.getTime() +
              60 * 60 * 1000
          );
      }

      const result =
        await calendar.events.insert({
          calendarId: "primary",

          requestBody: {
            summary:
              String(summary),

            description:
              description
                ? String(description)
                : undefined,

            start: {
              dateTime:
                startDate.toISOString(),

              timeZone:
                GOOGLE_TIME_ZONE
            },

            end: {
              dateTime:
                endDate.toISOString(),

              timeZone:
                GOOGLE_TIME_ZONE
            }
          }
        });

      res.json({
        ok: true,
        event:
          result.data
      });
    } catch (error) {
      console.error(
        "Kalender Event Fehler:",
        error
      );

      res.status(500).json({
        error:
          "Kalendereintrag konnte nicht erstellt werden."
      });
    }
  }
);

/*
  ==========================================================
  REALTIME TOKEN
  ==========================================================
*/

app.post(
  "/realtime/token",
  async (req, res) => {
    console.log(
      ">>> /realtime/token wurde aufgerufen"
    );

    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          error:
            "OPENAI_API_KEY fehlt."
        });
      }

      const response =
        await fetch(
          "https://api.openai.com/v1/realtime/client_secrets",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${process.env.OPENAI_API_KEY}`,

              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                session: {
                  type: "realtime",

                  model:
                    process.env.OPENAI_REALTIME_MODEL ||
                    "gpt-realtime-2.1",

                  instructions:
                    "Du bist Sol, die KI-Stimme innerhalb von Sol Holo. Antworte natürlich, freundlich und auf Deutsch, sofern die Nutzerin nicht ausdrücklich eine andere Sprache verwendet.",

                  audio: {
                    output: {
                      voice:
                        process.env.OPENAI_REALTIME_VOICE ||
                        "marin"
                    }
                  }
                }
              })
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

      res.json(data);
    } catch (error) {
      console.error(
        "Realtime Token Fehler:",
        error
      );

      res.status(500).json({
        error:
          "Realtime-Token konnte nicht erstellt werden."
      });
    }
  }
);

/*
  ==========================================================
  SOL CHAT
  ==========================================================
*/

app.post(
  "/sol",
  async (req, res) => {
    try {
      const userMessage =
        String(
          req.body?.message ||
          req.body?.text ||
          ""
        ).trim();

      if (!userMessage) {
        return res.status(400).json({
          error:
            "Keine Nachricht erhalten."
        });
      }

      /*
        DAUERHAFT SPEICHERN
      */

      const memoryToSave =
        extractSaveMemoryCommand(
          userMessage
        );

      if (memoryToSave) {
        const saved =
          await saveLongTermMemory(
            memoryToSave
          );

        return res.json({
          reply:
            `Ja. Ich habe dauerhaft gespeichert: ${saved.content}`,

          memorySaved: true
        });
      }

      /*
        DAUERHAFT LÖSCHEN
      */

      const memoryToDelete =
        extractDeleteMemoryCommand(
          userMessage
        );

      if (memoryToDelete) {
        const deletedCount =
          await deleteLongTermMemory(
            memoryToDelete
          );

        return res.json({
          reply:
            deletedCount > 0
              ? `Ich habe ${deletedCount} passende dauerhafte Erinnerung(en) gelöscht.`
              : "Ich habe dazu keine passende dauerhafte Erinnerung gefunden.",

          memoryDeleted:
            deletedCount
        });
      }

      /*
        MEMORY ANZEIGEN
      */

      if (
        isShowMemoryCommand(
          userMessage
        )
      ) {
        const memories =
          await getLongTermMemories();

        if (!memories.length) {
          return res.json({
            reply:
              "Ich habe aktuell keine dauerhaften Erinnerungen gespeichert.",

            memories: []
          });
        }

        const formatted =
          memories
            .map(
              (memory, index) =>
                `${index + 1}. ${memory.content}`
            )
            .join("\n");

        return res.json({
          reply:
            `Das weiß ich dauerhaft:\n\n${formatted}`,

          memories
        });
      }

      /*
        NORMALE SOL-ANTWORT
      */

      const memories =
        await getLongTermMemories();

      const memoryText =
        memories.length
          ? memories
              .map(
                memory =>
                  `- ${memory.content}`
              )
              .join("\n")
          : "Keine dauerhaften Erinnerungen vorhanden.";

      const instructions = `
Du bist Sol.

Du sprichst mit der Nutzerin über die Oberfläche Sol Holo.

Wichtige Regeln:

- Antworte natürlich und freundlich.
- Antworte standardmäßig auf Deutsch.
- Sol und Sol Holo sind nicht dasselbe.
- Du bist Sol, die KI.
- Sol Holo ist das eigenständige Projekt bzw. System der Nutzerin.
- Erfinde keine Erinnerungen.
- Behaupte niemals, etwas dauerhaft gespeichert zu haben, wenn es nicht tatsächlich in der Datenbank gespeichert wurde.
- Dauerhafte Erinnerungen dienen nur als Kontext.
- Behandle persönliche Erinnerungen sorgfältig.

Dauerhafte Erinnerungen:

${memoryText}
      `.trim();

      const response =
        await openai.responses.create({
          model:
            process.env.OPENAI_MODEL ||
            "gpt-5.6",

          instructions,

          input:
            userMessage
        });

      const reply =
        response.output_text?.trim() ||
        "Ich konnte gerade keine Antwort erzeugen.";

      res.json({
        reply
      });
    } catch (error) {
      console.error(
        "Fehler in /sol:",
        error
      );

      res.status(500).json({
        error:
          "Sol konnte die Anfrage gerade nicht verarbeiten."
      });
    }
  }
);

/*
  ==========================================================
  MEMORY API
  ==========================================================
*/

app.get(
  "/memory",
  async (req, res) => {
    try {
      const memories =
        await getLongTermMemories();

      res.json({
        memories
      });
    } catch (error) {
      console.error(
        "Memory API Fehler:",
        error
      );

      res.status(500).json({
        error:
          "Langzeitgedächtnis konnte nicht geladen werden."
      });
    }
  }
);

/*
  ==========================================================
  HEALTH CHECK
  ==========================================================
*/

app.get(
  "/health",
  (req, res) => {
    res.json({
      ok: true,
      service: "Sol Holo",
      time:
        new Date().toISOString()
    });
  }
);

/*
  ==========================================================
  WEB-APP AUSLIEFERN
  ==========================================================
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
  ==========================================================
  SERVER START
  ==========================================================
*/

const PORT =
  Number(
    process.env.PORT
  ) || 3000;

async function startServer() {
  await initializeDatabase();

  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `Sol Holo läuft auf Port ${PORT}`
      );
    }
  );
}

startServer().catch(
  error => {
    console.error(
      "Server konnte nicht gestartet werden:",
      error
    );

    process.exit(1);
  }
);