import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { google } from "googleapis";
import { createHash, randomUUID } from "crypto";

const app = express();

app.use(express.json({ limit: "20mb" }));
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/*
  ==========================================================
  VERBINDUNG ZU SOL-HOLO-MEMORY
  ==========================================================
*/

const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

/*
  ==========================================================
  PERSÖNLICHER CLONE
  ==========================================================
*/

const CURRENT_CLONE_ID = "pam-sol-001";

/*
  Kurzlebiger Zugriffsschlüssel für die Realtime-Gedächtnissuche.
  Er enthält KEINE Datenbank-Zugangsdaten und gilt nur für die
  aktuelle Voice-Sitzung.
*/
const REALTIME_MEMORY_TOKEN_TTL_MS =
  2 * 60 * 60 * 1000;

const realtimeMemorySessions =
  new Map();

function cleanupRealtimeMemorySessions() {
  const now =
    Date.now();

  for (
    const [token, expiresAt]
    of realtimeMemorySessions.entries()
  ) {
    if (expiresAt <= now) {
      realtimeMemorySessions.delete(
        token
      );
    }
  }
}

function createRealtimeMemoryToken() {
  cleanupRealtimeMemorySessions();

  const token =
    `${randomUUID()}-${randomUUID()}`;

  realtimeMemorySessions.set(
    token,
    Date.now() +
      REALTIME_MEMORY_TOKEN_TTL_MS
  );

  return token;
}

function validateRealtimeMemoryToken(
  token
) {
  cleanupRealtimeMemorySessions();

  const cleanToken =
    String(token || "").trim();

  if (!cleanToken) {
    return false;
  }

  const expiresAt =
    realtimeMemorySessions.get(
      cleanToken
    );

  if (
    !expiresAt ||
    expiresAt <= Date.now()
  ) {
    realtimeMemorySessions.delete(
      cleanToken
    );

    return false;
  }

  realtimeMemorySessions.set(
    cleanToken,
    Date.now() +
      REALTIME_MEMORY_TOKEN_TTL_MS
  );

  return true;
}

/*
  ==========================================================
  GOOGLE CALENDAR
  ==========================================================
*/

const GOOGLE_CLIENT_ID =
  String(
    process.env.GOOGLE_CLIENT_ID ||
    ""
  ).trim();

const GOOGLE_CLIENT_SECRET =
  String(
    process.env.GOOGLE_CLIENT_SECRET ||
    ""
  ).trim();

const GOOGLE_REDIRECT_URI =
  String(
    process.env.GOOGLE_REDIRECT_URI ||
    "https://sol-holo.onrender.com/auth/google/callback"
  ).trim();

const GOOGLE_CALENDAR_ID =
  String(
    process.env.GOOGLE_CALENDAR_ID ||
    "primary"
  ).trim();

const GOOGLE_CALENDAR_TIMEZONE =
  "Europe/Berlin";

const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events"
];

/*
  ==========================================================
  SOL-HOLO-STIMME
  ==========================================================

  Bis OpenAI Custom Voices / Voice Consents
  für die Organisation freigeschaltet hat,
  verwendet Sol Holo stabil die OpenAI-Stimme marin.

  Die persönliche Stimme bleibt vorbereitet
  und wird später wieder aktiviert.
*/

const SOL_HOLO_VOICE = "marin";

/*
  Separater API-Key nur für Voice-Setup

  Der normale Sol-Holo-Betrieb verwendet weiterhin
  OPENAI_API_KEY.

  Voice Consent und Voice Creation verwenden
  ausschließlich OPENAI_VOICE_API_KEY.
*/

const OPENAI_VOICE_API_KEY =
  String(
    process.env.OPENAI_VOICE_API_KEY ||
    ""
  ).trim();

/*
  ==========================================================
  MEMORY-TABELLEN ANLEGEN
  ==========================================================
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
    CREATE TABLE IF NOT EXISTS sol_fulltime_memory (
      id BIGSERIAL PRIMARY KEY,
      clone_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  /*
    Vollzeitgedächtnis: Die Daten werden NICHT rotiert oder
    nach 50 Einträgen gelöscht. Diese Indizes beschleunigen
    nur den Abruf aus der gesamten gespeicherten Historie.
  */
  await db.query(`
    CREATE INDEX IF NOT EXISTS sol_fulltime_memory_clone_id_idx
    ON sol_fulltime_memory (
      clone_id,
      id DESC
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS sol_fulltime_memory_search_idx
    ON sol_fulltime_memory
    USING GIN (
      to_tsvector(
        'german',
        content
      )
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS sol_memory_search_idx
    ON sol_memory
    USING GIN (
      to_tsvector(
        'german',
        content
      )
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS sol_long_term_memory_search_idx
    ON sol_long_term_memory
    USING GIN (
      to_tsvector(
        'german',
        content
      )
    )
  `);

  /*
    Google OAuth Tokens

    Wichtig:
    Refresh-Token wird in PostgreSQL gespeichert,
    damit die Kalender-Verbindung einen Render-Neustart
    überlebt.
  */

  await db.query(`
    CREATE TABLE IF NOT EXISTS sol_google_tokens (
      clone_id TEXT PRIMARY KEY,
      access_token TEXT,
      refresh_token TEXT,
      scope TEXT,
      token_type TEXT,
      expiry_date BIGINT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  /*
    Schutz gegen doppelte Kalender-Einträge.

    Das ist besonders für Realtime wichtig,
    weil Sprachtranskripte unter Umständen mehrmals
    eintreffen können.
  */

  await db.query(`
    CREATE TABLE IF NOT EXISTS sol_calendar_actions (
      id BIGSERIAL PRIMARY KEY,
      clone_id TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      original_message TEXT NOT NULL,
      google_event_id TEXT,
      event_summary TEXT,
      event_start TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS sol_calendar_actions_lookup
    ON sol_calendar_actions (
      clone_id,
      fingerprint,
      created_at
    )
  `);

  console.log("Sol-Holo-Memory ist bereit.");
  console.log("Sol-Holo-Vollzeitgedächtnis ist bereit.");
  console.log("Sol-Holo-Kalender-Speicher ist bereit.");
  console.log("Realtime-Stimme: marin aktiv.");

  console.log(
    OPENAI_VOICE_API_KEY
      ? "Separater Voice-API-Key ist bereit."
      : "OPENAI_VOICE_API_KEY fehlt noch."
  );

  console.log(
    GOOGLE_CLIENT_ID &&
    GOOGLE_CLIENT_SECRET
      ? "Google Calendar OAuth ist vorbereitet."
      : "Google Calendar OAuth Variablen fehlen."
  );
}

initializeMemory().catch((error) => {
  console.error(
    "Fehler beim Initialisieren des Sol-Holo-Memory:",
    error
  );
});

/*
  ==========================================================
  SOL-HOLO-OBERFLÄCHE AUSLIEFERN
  ==========================================================
*/

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

/*
  ==========================================================
  GOOGLE CALENDAR – OAUTH CLIENT
  ==========================================================
*/

function createGoogleOAuthClient() {
  if (
    !GOOGLE_CLIENT_ID ||
    !GOOGLE_CLIENT_SECRET
  ) {
    throw new Error(
      "Google Calendar ist noch nicht vollständig konfiguriert. GOOGLE_CLIENT_ID oder GOOGLE_CLIENT_SECRET fehlt."
    );
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/*
  ==========================================================
  GOOGLE CALENDAR – TOKENS SPEICHERN
  ==========================================================
*/

async function saveGoogleTokens(tokens) {
  if (!tokens) {
    return;
  }

  const existing =
    await db.query(
      `
        SELECT refresh_token
        FROM sol_google_tokens
        WHERE clone_id = $1
        LIMIT 1
      `,
      [
        CURRENT_CLONE_ID
      ]
    );

  const previousRefreshToken =
    existing.rows?.[0]?.refresh_token ||
    null;

  const refreshToken =
    tokens.refresh_token ||
    previousRefreshToken ||
    null;

  await db.query(
    `
      INSERT INTO sol_google_tokens (
        clone_id,
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
      ON CONFLICT (clone_id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(
          EXCLUDED.refresh_token,
          sol_google_tokens.refresh_token
        ),
        scope = EXCLUDED.scope,
        token_type = EXCLUDED.token_type,
        expiry_date = EXCLUDED.expiry_date,
        updated_at = NOW()
    `,
    [
      CURRENT_CLONE_ID,
      tokens.access_token || null,
      refreshToken,
      tokens.scope || null,
      tokens.token_type || null,
      tokens.expiry_date || null
    ]
  );

  console.log(
    "✅ Google Calendar Tokens gespeichert."
  );
}

/*
  ==========================================================
  GOOGLE CALENDAR – TOKENS LADEN
  ==========================================================
*/

async function loadGoogleTokens() {
  const result =
    await db.query(
      `
        SELECT
          access_token,
          refresh_token,
          scope,
          token_type,
          expiry_date
        FROM sol_google_tokens
        WHERE clone_id = $1
        LIMIT 1
      `,
      [
        CURRENT_CLONE_ID
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return result.rows[0];
}

/*
  ==========================================================
  GOOGLE CALENDAR – AUTORISIERUNGS-URL
  ==========================================================
*/

app.get(
  "/auth/google",
  async (req, res) => {
    try {
      const oauth2Client =
        createGoogleOAuthClient();

      const url =
        oauth2Client.generateAuthUrl({
          access_type:
            "offline",

          prompt:
            "consent",

          scope:
            GOOGLE_CALENDAR_SCOPES
        });

      return res.redirect(url);

    } catch (error) {
      console.error(
        "Google OAuth Start Fehler:",
        error
      );

      return res.status(500).send(
        "Google Calendar konnte nicht verbunden werden."
      );
    }
  }
);

/*
  ==========================================================
  GOOGLE CALENDAR – CALLBACK
  ==========================================================
*/

app.get(
  "/auth/google/callback",
  async (req, res) => {
    try {
      const code =
        String(
          req.query.code ||
          ""
        ).trim();

      if (!code) {
        return res.status(400).send(
          "Google hat keinen Autorisierungscode geliefert."
        );
      }

      const oauth2Client =
        createGoogleOAuthClient();

      const tokenResult =
        await oauth2Client.getToken(
          code
        );

      const tokens =
        tokenResult.tokens;

      await saveGoogleTokens(
        tokens
      );

      oauth2Client.setCredentials(
        tokens
      );

      return res.type("html").send(`
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>
<title>Sol Holo – Google Calendar</title>

<style>
body{
  margin:0;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#05030b;
  color:white;
  font-family:Arial,sans-serif;
  padding:24px;
}

.box{
  width:100%;
  max-width:560px;
  padding:28px;
  border:1px solid #7139a7;
  border-radius:22px;
  background:#100719;
  text-align:center;
}

h1{
  color:#bd72ff;
}

.ok{
  color:#45e5a2;
  font-size:20px;
}
</style>
</head>

<body>

<div class="box">

<h1>
🌻 Sol Holo
</h1>

<p class="ok">
✅ Google Kalender wurde erfolgreich verbunden.
</p>

<p>
Du kannst dieses Fenster jetzt schließen
und zu Sol Holo zurückkehren.
</p>

</div>

</body>
</html>
      `);

    } catch (error) {
      console.error(
        "Google OAuth Callback Fehler:",
        error
      );

      return res.status(500).send(
        "Die Verbindung mit Google Calendar konnte nicht abgeschlossen werden."
      );
    }
  }
);

/*
  ==========================================================
  GOOGLE CALENDAR – VERBINDUNGSSTATUS
  ==========================================================
*/

app.get(
  "/calendar/status",
  async (req, res) => {
    try {
      const tokens =
        await loadGoogleTokens();

      return res.json({
        connected:
          Boolean(
            tokens?.refresh_token ||
            tokens?.access_token
          ),

        calendar:
          GOOGLE_CALENDAR_ID,

        timezone:
          GOOGLE_CALENDAR_TIMEZONE
      });

    } catch (error) {
      console.error(
        "Calendar Status Fehler:",
        error
      );

      return res.status(500).json({
        connected:
          false,

        error:
          "Kalenderstatus konnte nicht gelesen werden."
      });
    }
  }
);

/*
  ==========================================================
  GOOGLE CALENDAR – AUTORISIERTER CLIENT
  ==========================================================
*/

async function getAuthorizedGoogleClient() {
  const storedTokens =
    await loadGoogleTokens();

  if (!storedTokens) {
    throw new Error(
      "GOOGLE_CALENDAR_NOT_CONNECTED"
    );
  }

  const oauth2Client =
    createGoogleOAuthClient();

  oauth2Client.setCredentials({
    access_token:
      storedTokens.access_token,

    refresh_token:
      storedTokens.refresh_token,

    scope:
      storedTokens.scope,

    token_type:
      storedTokens.token_type,

    expiry_date:
      storedTokens.expiry_date
        ? Number(
            storedTokens.expiry_date
          )
        : undefined
  });

  oauth2Client.on(
    "tokens",
    async (newTokens) => {
      try {
        await saveGoogleTokens(
          newTokens
        );

      } catch (error) {
        console.error(
          "Fehler beim Aktualisieren der Google Tokens:",
          error
        );
      }
    }
  );

  return oauth2Client;
}

/*
  ==========================================================
  BERLIN – AKTUELLE ZEIT FÜR KALENDER-PARSER
  ==========================================================
*/

function getBerlinCurrentDateTimeText() {
  return new Intl.DateTimeFormat(
    "de-DE",
    {
      timeZone:
        GOOGLE_CALENDAR_TIMEZONE,

      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",

      hour12:
        false
    }
  ).format(
    new Date()
  );
}

/*
  ==========================================================
  KALENDER-BEFEHL SCHNELL ERKENNEN
  ==========================================================
*/

function looksLikeCalendarWriteRequest(
  message
) {
  const text =
    String(
      message ||
      ""
    ).toLowerCase();

  if (!text) {
    return false;
  }

  const patterns = [
    "kalender",
    "trag ",
    "trage ",
    "eintragen",
    "termin",
    "erinnere mich",
    "erinnerung",
    "plane ",
    "plan ",
    "setze ",
    "mach mir einen termin",
    "mach einen termin"
  ];

  return patterns.some(
    (pattern) =>
      text.includes(pattern)
  );
}

/*
  ==========================================================
  JSON AUS MODELLANTWORT LESEN
  ==========================================================
*/

function parseJsonText(text) {
  const clean =
    String(
      text ||
      ""
    )
      .trim()
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/,
        ""
      )
      .trim();

  return JSON.parse(clean);
}

/*
  ==========================================================
  KALENDER-BEFEHL MIT SOL VERSTEHEN
  ==========================================================
*/

async function parseCalendarCommand(
  message
) {
  const currentBerlin =
    getBerlinCurrentDateTimeText();

  const parsingResponse =
    await openai.responses.create({
      model:
        "gpt-5",

      instructions: `
Du analysierst ausschließlich Kalender-Schreibbefehle.

Aktuelles Datum und aktuelle Uhrzeit in Deutschland,
Zeitzone Europe/Berlin:

${currentBerlin}

Der Nutzer ist Pam.

Prüfe, ob die Nachricht wirklich verlangt,
einen Google-Kalendertermin zu ERSTELLEN.

Gib ausschließlich gültiges JSON zurück.
Keine Markdown-Codeblöcke.
Keine Erklärung.

Wenn KEIN Kalendertermin erstellt werden soll:

{
  "action": "none"
}

Wenn ein Kalendertermin erstellt werden soll:

{
  "action": "create",
  "summary": "Kurzer Titel",
  "start": "RFC3339 Datum mit deutscher Zeitzone",
  "end": "RFC3339 Datum mit deutscher Zeitzone",
  "description": "Optionale Beschreibung oder leer",
  "reminderMinutes": null
}

REGELN:

1. Relative Angaben wie heute, morgen,
   Mittwoch oder nächste Woche müssen anhand
   des oben genannten aktuellen Datums bestimmt werden.

2. Europe/Berlin verwenden.

3. Wenn nur eine Uhrzeit und keine Dauer angegeben ist,
   dauert der Termin standardmäßig 30 Minuten.

4. Wenn Pam sagt:
   "Erinnere mich um 11 Uhr ..."
   dann wird der Kalendertermin um 11 Uhr erstellt.

5. Wenn Pam ausdrücklich sagt:
   "10 Minuten vorher erinnern"
   dann reminderMinutes = 10.

6. Wenn keine vorherige Erinnerung genannt wurde,
   reminderMinutes = null.

7. Fehlende Informationen nicht frei erfinden.
   Ein sinnvoller kurzer Titel aus dem vorhandenen Text
   ist erlaubt.

8. Nutze für Deutschland im August normalerweise
   den korrekten Europe/Berlin Offset.

9. Niemals behaupten, dass Google etwas gespeichert hat.
   Du analysierst nur den Befehl.
`,

      input:
        message
    });

  const outputText =
    parsingResponse.output_text?.trim();

  if (!outputText) {
    return {
      action:
        "none"
    };
  }

  try {
    const parsed =
      parseJsonText(
        outputText
      );

    return parsed;

  } catch (error) {
    console.error(
      "Kalender-Parser JSON Fehler:",
      {
        outputText,
        error
      }
    );

    return {
      action:
        "none"
    };
  }
}

/*
  ==========================================================
  KALENDER-EINTRAG-FINGERPRINT
  ==========================================================
*/

function createCalendarFingerprint(
  message,
  parsed
) {
  const source =
    [
      CURRENT_CLONE_ID,
      String(
        message ||
        ""
      ).trim().toLowerCase(),

      parsed?.summary ||
        "",

      parsed?.start ||
        "",

      parsed?.end ||
        ""
    ].join("|");

  return createHash(
    "sha256"
  )
    .update(source)
    .digest("hex");
}

/*
  ==========================================================
  DOPPELTEN KALENDER-EINTRAG PRÜFEN
  ==========================================================
*/

async function findRecentCalendarAction(
  fingerprint
) {
  const result =
    await db.query(
      `
        SELECT
          google_event_id,
          event_summary,
          event_start,
          created_at
        FROM sol_calendar_actions
        WHERE clone_id = $1
          AND fingerprint = $2
          AND created_at >
              NOW() - INTERVAL '2 minutes'
        ORDER BY id DESC
        LIMIT 1
      `,
      [
        CURRENT_CLONE_ID,
        fingerprint
      ]
    );

  return (
    result.rows?.[0] ||
    null
  );
}

/*
  ==========================================================
  KALENDER-AKTION SPEICHERN
  ==========================================================
*/

async function saveCalendarAction(
  fingerprint,
  originalMessage,
  googleEventId,
  summary,
  start
) {
  await db.query(
    `
      INSERT INTO sol_calendar_actions (
        clone_id,
        fingerprint,
        original_message,
        google_event_id,
        event_summary,
        event_start
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
      )
    `,
    [
      CURRENT_CLONE_ID,
      fingerprint,
      originalMessage,
      googleEventId ||
        null,
      summary ||
        null,
      start ||
        null
    ]
  );
}

/*
  ==========================================================
  GOOGLE CALENDAR – ECHTEN TERMIN ERSTELLEN
  ==========================================================
*/

async function createGoogleCalendarEvent(
  parsedCommand,
  originalMessage
) {
  const oauth2Client =
    await getAuthorizedGoogleClient();

  const calendar =
    google.calendar({
      version:
        "v3",

      auth:
        oauth2Client
    });

  const reminders =
    Number.isFinite(
      Number(
        parsedCommand.reminderMinutes
      )
    ) &&
    parsedCommand.reminderMinutes !== null

      ? {
          useDefault:
            false,

          overrides: [
            {
              method:
                "popup",

              minutes:
                Math.max(
                  0,
                  Number(
                    parsedCommand.reminderMinutes
                  )
                )
            }
          ]
        }

      : {
          useDefault:
            true
        };

  const requestBody = {
    summary:
      String(
        parsedCommand.summary ||
        "Sol Holo Termin"
      ).trim(),

    description:
      String(
        parsedCommand.description ||
        ""
      ).trim(),

    start: {
      dateTime:
        parsedCommand.start,

      timeZone:
        GOOGLE_CALENDAR_TIMEZONE
    },

    end: {
      dateTime:
        parsedCommand.end,

      timeZone:
        GOOGLE_CALENDAR_TIMEZONE
    },

    reminders
  };

  const response =
    await calendar.events.insert({
      calendarId:
        GOOGLE_CALENDAR_ID,

      requestBody
    });

  const googleEvent =
    response.data;

  if (
    !googleEvent ||
    !googleEvent.id
  ) {
    throw new Error(
      "GOOGLE_CALENDAR_NO_EVENT_ID"
    );
  }

  console.log(
    "✅ Google Calendar Termin wirklich erstellt:",
    {
      id:
        googleEvent.id,

      summary:
        googleEvent.summary,

      start:
        googleEvent.start
    }
  );

  return googleEvent;
}

/*
  ==========================================================
  KALENDER-WUNSCH KOMPLETT VERARBEITEN
  ==========================================================
*/

async function handleCalendarWriteRequest(
  message
) {
  if (
    !looksLikeCalendarWriteRequest(
      message
    )
  ) {
    return {
      handled:
        false
    };
  }

  const parsed =
    await parseCalendarCommand(
      message
    );

  if (
    parsed?.action !==
    "create"
  ) {
    return {
      handled:
        false
    };
  }

  if (
    !parsed.summary ||
    !parsed.start ||
    !parsed.end
  ) {
    return {
      handled:
        true,

      success:
        false,

      answer:
        "Pam, ich habe erkannt, dass du einen Kalendereintrag möchtest, aber Datum oder Uhrzeit sind nicht eindeutig genug."
    };
  }

  const fingerprint =
    createCalendarFingerprint(
      message,
      parsed
    );

  const duplicate =
    await findRecentCalendarAction(
      fingerprint
    );

  if (duplicate) {
    return {
      handled:
        true,

      success:
        true,

      duplicate:
        true,

      googleEventId:
        duplicate.google_event_id,

      answer:
        `Pam, der Termin „${duplicate.event_summary || parsed.summary}“ wurde bereits gerade eben in deinem Google Kalender angelegt.`
    };
  }

  try {
    const googleEvent =
      await createGoogleCalendarEvent(
        parsed,
        message
      );

    await saveCalendarAction(
      fingerprint,
      message,
      googleEvent.id,
      googleEvent.summary ||
        parsed.summary,
      googleEvent.start?.dateTime ||
        parsed.start
    );

    const answer =
      `Ja, Pam. Der Termin „${googleEvent.summary || parsed.summary}“ wurde jetzt wirklich in deinem Google Kalender gespeichert.`;

    return {
      handled:
        true,

      success:
        true,

      googleEventId:
        googleEvent.id,

      htmlLink:
        googleEvent.htmlLink ||
        null,

      answer
    };

  } catch (error) {
    console.error(
      "Google Calendar Eintrag Fehler:",
      error
    );

    if (
      error?.message ===
      "GOOGLE_CALENDAR_NOT_CONNECTED"
    ) {
      return {
        handled:
          true,

        success:
          false,

        needsGoogleAuth:
          true,

        answer:
          "Pam, dein Google Kalender ist noch nicht mit Sol Holo verbunden. Öffne bitte einmal /auth/google."
      };
    }

    return {
      handled:
        true,

      success:
        false,

      answer:
        "Pam, der Kalendereintrag wurde nicht gespeichert. Google Calendar hat den Vorgang nicht bestätigt."
    };
  }
}

/*
  ==========================================================
  VOICE SETUP – SICHERHEIT
  ==========================================================
*/

function checkVoiceSetupSecret(
  req,
  res,
  next
) {
  const expectedSecret =
    String(
      process.env.VOICE_SETUP_SECRET ||
      ""
    ).trim();

  if (!expectedSecret) {
    return res.status(503).json({
      error:
        "VOICE_SETUP_SECRET ist in Render noch nicht eingerichtet."
    });
  }

  const suppliedSecret =
    String(
      req.headers["x-voice-setup-secret"] ||
      ""
    ).trim();

  if (
    suppliedSecret !==
    expectedSecret
  ) {
    return res.status(401).json({
      error:
        "Voice-Setup nicht autorisiert."
    });
  }

  next();
}

/*
  ==========================================================
  AUDIO-MIME-TYP BESTIMMEN
  ==========================================================
*/

function normalizeAudioMimeType(
  filename,
  suppliedType
) {
  const lowerName =
    String(
      filename ||
      ""
    ).toLowerCase();

  const type =
    String(
      suppliedType ||
      ""
    ).toLowerCase();

  if (
    lowerName.endsWith(".m4a") ||
    lowerName.endsWith(".mp4")
  ) {
    return "audio/mp4";
  }

  if (
    lowerName.endsWith(".wav")
  ) {
    return "audio/wav";
  }

  if (
    lowerName.endsWith(".mp3")
  ) {
    return "audio/mpeg";
  }

  if (
    lowerName.endsWith(".ogg")
  ) {
    return "audio/ogg";
  }

  if (
    lowerName.endsWith(".aac")
  ) {
    return "audio/aac";
  }

  if (
    lowerName.endsWith(".flac")
  ) {
    return "audio/flac";
  }

  if (
    lowerName.endsWith(".webm")
  ) {
    return "audio/webm";
  }

  if (
    type.startsWith("audio/")
  ) {
    return type;
  }

  return "audio/mp4";
}

/*
  ==========================================================
  VOICE-SETUP-SEITE
  ==========================================================
*/

app.get(
  "/voice-setup",
  (req, res) => {
    res.type("html");

    res.send(`
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>
<title>Sol Holo – Eigene Stimme</title>

<style>
*{
  box-sizing:border-box;
}

body{
  margin:0;
  padding:24px 16px;
  background:#05030b;
  color:white;
  font-family:Arial,sans-serif;
}

main{
  width:100%;
  max-width:650px;
  margin:auto;
}

h1{
  color:#bd72ff;
}

.box{
  margin-top:20px;
  padding:18px;
  border:1px solid #7139a7;
  border-radius:18px;
  background:#100719;
}

label{
  display:block;
  margin-top:16px;
  margin-bottom:7px;
  color:#d3a6ff;
}

input,
button{
  width:100%;
  padding:13px;
  border-radius:12px;
  border:1px solid #7941aa;
  background:#160b20;
  color:white;
  font-size:16px;
}

button{
  margin-top:18px;
  background:#61249c;
  cursor:pointer;
}

button:disabled{
  opacity:.5;
}

.status{
  margin-top:16px;
  white-space:pre-wrap;
  line-height:1.45;
  color:#ddd;
}

.success{
  color:#45e5a2;
}

.warning{
  color:#ffc86a;
}
</style>
</head>

<body>

<main>

<h1>
🌻 Sol Holo – Eigene Stimme
</h1>

<p>
Hier werden zuerst die Einwilligungsaufnahme
und danach die eigentliche Stimmprobe an OpenAI gesendet.
</p>

<div class="box">

<h2>
🔐 Voice Setup
</h2>

<label for="secret">
Voice-Setup-Passwort
</label>

<input
  id="secret"
  type="password"
  autocomplete="off"
  placeholder="VOICE_SETUP_SECRET"
>

<hr style="
  margin:24px 0;
  border:none;
  border-top:1px solid #49225f;
">

<h2>
1. Voice Consent
</h2>

<label for="consentName">
Name
</label>

<input
  id="consentName"
  value="Pam Sol Holo Consent"
>

<label for="language">
Sprache
</label>

<input
  id="language"
  value="de-DE"
>

<label for="consentFile">
Consent-Aufnahme
</label>

<input
  id="consentFile"
  type="file"
  accept="audio/*"
>

<button
  id="consentButton"
  type="button">
Consent hochladen
</button>

<div
  id="consentStatus"
  class="status">
Noch keine Consent-ID vorhanden.
</div>

<hr style="
  margin:24px 0;
  border:none;
  border-top:1px solid #49225f;
">

<h2>
2. Persönliche Stimme
</h2>

<label for="voiceName">
Name der Stimme
</label>

<input
  id="voiceName"
  value="Pam Sol Holo"
>

<label for="consentId">
Consent-ID
</label>

<input
  id="consentId"
  placeholder="cons_..."
>

<label for="voiceFile">
Stimmprobe
</label>

<input
  id="voiceFile"
  type="file"
  accept="audio/*"
>

<button
  id="voiceButton"
  type="button">
Eigene Stimme erstellen
</button>

<div
  id="voiceStatus"
  class="status">
Noch keine Voice-ID vorhanden.
</div>

</div>

</main>

<script>

const secretInput =
  document.getElementById(
    "secret"
  );

const consentName =
  document.getElementById(
    "consentName"
  );

const language =
  document.getElementById(
    "language"
  );

const consentFile =
  document.getElementById(
    "consentFile"
  );

const consentButton =
  document.getElementById(
    "consentButton"
  );

const consentStatus =
  document.getElementById(
    "consentStatus"
  );

const voiceName =
  document.getElementById(
    "voiceName"
  );

const consentId =
  document.getElementById(
    "consentId"
  );

const voiceFile =
  document.getElementById(
    "voiceFile"
  );

const voiceButton =
  document.getElementById(
    "voiceButton"
  );

const voiceStatus =
  document.getElementById(
    "voiceStatus"
  );

consentButton.addEventListener(
  "click",
  async () => {
    const file =
      consentFile.files?.[0];

    const secret =
      secretInput.value.trim();

    if (!secret) {
      consentStatus.textContent =
        "Bitte zuerst dein Voice-Setup-Passwort eingeben.";

      return;
    }

    if (!file) {
      consentStatus.textContent =
        "Bitte die Consent-Aufnahme auswählen.";

      return;
    }

    consentButton.disabled =
      true;

    consentStatus.textContent =
      "Consent wird hochgeladen ...";

    try {
      const params =
        new URLSearchParams({
          name:
            consentName.value.trim() ||
            "Pam Sol Holo Consent",

          language:
            language.value.trim() ||
            "de-DE",

          filename:
            file.name,

          mime:
            file.type ||
            "audio/mp4"
        });

      const response =
        await fetch(
          "/voice/setup/consent?" +
          params.toString(),
          {
            method:"POST",

            headers:{
              "Content-Type":
                file.type ||
                "application/octet-stream",

              "X-Voice-Setup-Secret":
                secret
            },

            body:file
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
          "Consent konnte nicht erstellt werden."
        );
      }

      consentId.value =
        data.id;

      consentStatus.className =
        "status success";

      consentStatus.textContent =
        "✅ Consent erstellt.\n\nConsent-ID:\n" +
        data.id;

    } catch(error) {
      consentStatus.className =
        "status warning";

      consentStatus.textContent =
        "Fehler: " +
        (
          error?.message ||
          "Unbekannter Fehler."
        );

    } finally {
      consentButton.disabled =
        false;
    }
  }
);

voiceButton.addEventListener(
  "click",
  async () => {
    const file =
      voiceFile.files?.[0];

    const secret =
      secretInput.value.trim();

    const currentConsentId =
      consentId.value.trim();

    if (!secret) {
      voiceStatus.textContent =
        "Bitte zuerst dein Voice-Setup-Passwort eingeben.";

      return;
    }

    if (!currentConsentId) {
      voiceStatus.textContent =
        "Consent-ID fehlt.";

      return;
    }

    if (!file) {
      voiceStatus.textContent =
        "Bitte die Stimmprobe auswählen.";

      return;
    }

    voiceButton.disabled =
      true;

    voiceStatus.textContent =
      "Deine Sol-Holo-Stimme wird erstellt ...";

    try {
      const params =
        new URLSearchParams({
          name:
            voiceName.value.trim() ||
            "Pam Sol Holo",

          consent:
            currentConsentId,

          filename:
            file.name,

          mime:
            file.type ||
            "audio/mp4"
        });

      const response =
        await fetch(
          "/voice/setup/create?" +
          params.toString(),
          {
            method:"POST",

            headers:{
              "Content-Type":
                file.type ||
                "application/octet-stream",

              "X-Voice-Setup-Secret":
                secret
            },

            body:file
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
          "Stimme konnte nicht erstellt werden."
        );
      }

      voiceStatus.className =
        "status success";

      voiceStatus.textContent =
        "✅ Eigene Stimme erstellt!\n\nVOICE-ID:\n" +
        data.id +
        "\n\nDiese ID kommt anschließend als SOL_HOLO_VOICE_ID nach Render.";

    } catch(error) {
      voiceStatus.className =
        "status warning";

      voiceStatus.textContent =
        "Fehler: " +
        (
          error?.message ||
          "Unbekannter Fehler."
        );

    } finally {
      voiceButton.disabled =
        false;
    }
  }
);

</script>

</body>
</html>
    `);
  }
);

/*
  ==========================================================
  VOICE CONSENT AN OPENAI SENDEN
  ==========================================================
*/

app.post(
  "/voice/setup/consent",

  checkVoiceSetupSecret,

  express.raw({
    type: () => true,
    limit: "10mb"
  }),

  async (req, res) => {
    try {
      if (!OPENAI_VOICE_API_KEY) {
        return res.status(500).json({
          error:
            "OPENAI_VOICE_API_KEY fehlt."
        });
      }

      if (
        !Buffer.isBuffer(req.body) ||
        req.body.length === 0
      ) {
        return res.status(400).json({
          error:
            "Keine Consent-Aufnahme erhalten."
        });
      }

      const name =
        String(
          req.query.name ||
          "Pam Sol Holo Consent"
        ).trim();

      const language =
        String(
          req.query.language ||
          "de-DE"
        ).trim();

      const filename =
        String(
          req.query.filename ||
          "consent.m4a"
        ).trim();

      const mimeType =
        normalizeAudioMimeType(
          filename,
          req.query.mime
        );

      const form =
        new FormData();

      form.append(
        "name",
        name
      );

      form.append(
        "language",
        language
      );

      form.append(
        "recording",
        new Blob(
          [req.body],
          {
            type:mimeType
          }
        ),
        filename
      );

      const response =
        await fetch(
          "https://api.openai.com/v1/audio/voice_consents",
          {
            method:"POST",

            headers:{
              Authorization:
                `Bearer ${OPENAI_VOICE_API_KEY}`
            },

            body:form
          }
        );

      const responseText =
        await response.text();

      let data;

      try {
        data =
          JSON.parse(
            responseText
          );
      } catch {
        data = {
          error:
            responseText
        };
      }

      if (!response.ok) {
        console.error(
          "Voice Consent API Fehler:",
          {
            status: response.status,
            data
          }
        );

        return res
          .status(response.status)
          .json({
            error:
              data?.error?.message ||
              data?.error ||
              "Voice Consent konnte nicht erstellt werden."
          });
      }

      console.log(
        "✅ Voice Consent erstellt:",
        data.id
      );

      return res.json({
        id:
          data.id,

        name:
          data.name,

        language:
          data.language
      });

    } catch(error) {
      console.error(
        "Voice Consent Fehler:",
        error
      );

      return res.status(500).json({
        error:
          "Voice Consent konnte nicht verarbeitet werden."
      });
    }
  }
);

/*
  ==========================================================
  EIGENE STIMME AN OPENAI SENDEN
  ==========================================================
*/

app.post(
  "/voice/setup/create",

  checkVoiceSetupSecret,

  express.raw({
    type: () => true,
    limit: "10mb"
  }),

  async (req, res) => {
    try {
      if (!OPENAI_VOICE_API_KEY) {
        return res.status(500).json({
          error:
            "OPENAI_VOICE_API_KEY fehlt."
        });
      }

      if (
        !Buffer.isBuffer(req.body) ||
        req.body.length === 0
      ) {
        return res.status(400).json({
          error:
            "Keine Stimmprobe erhalten."
        });
      }

      const name =
        String(
          req.query.name ||
          "Pam Sol Holo"
        ).trim();

      const consent =
        String(
          req.query.consent ||
          ""
        ).trim();

      if (!consent) {
        return res.status(400).json({
          error:
            "Consent-ID fehlt."
        });
      }

      const filename =
        String(
          req.query.filename ||
          "pam-sol.m4a"
        ).trim();

      const mimeType =
        normalizeAudioMimeType(
          filename,
          req.query.mime
        );

      const form =
        new FormData();

      form.append(
        "name",
        name
      );

      form.append(
        "consent",
        consent
      );

      form.append(
        "audio_sample",
        new Blob(
          [req.body],
          {
            type:mimeType
          }
        ),
        filename
      );

      const response =
        await fetch(
          "https://api.openai.com/v1/audio/voices",
          {
            method:"POST",

            headers:{
              Authorization:
                `Bearer ${OPENAI_VOICE_API_KEY}`
            },

            body:form
          }
        );

      const responseText =
        await response.text();

      let data;

      try {
        data =
          JSON.parse(
            responseText
          );
      } catch {
        data = {
          error:
            responseText
        };
      }

      if (!response.ok) {
        console.error(
          "Voice API Fehler:",
          data
        );

        return res
          .status(response.status)
          .json({
            error:
              data?.error?.message ||
              data?.error ||
              "Eigene Stimme konnte nicht erstellt werden."
          });
      }

      console.log(
        "✅ Pam Sol Holo Voice erstellt:",
        data.id
      );

      return res.json({
        id:
          data.id,

        name:
          data.name
      });

    } catch(error) {
      console.error(
        "Voice-Erstellung Fehler:",
        error
      );

      return res.status(500).json({
        error:
          "Die persönliche Stimme konnte nicht verarbeitet werden."
      });
    }
  }
);

/*
  ==========================================================
  GESPRÄCHSGEDÄCHTNIS
  ==========================================================
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
  ==========================================================
  VOLLZEITGEDÄCHTNIS
  ==========================================================
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
  Lädt nur einen kleinen AKTUELLEN Gesprächsausschnitt.
  Das ist KEINE Gedächtnisgrenze. Die komplette Historie
  bleibt in PostgreSQL gespeichert und wird bei Bedarf
  über searchPersonalMemory() durchsucht.
*/
async function loadRecentFulltimeMemory(
  limit = 50
) {
  const safeLimit =
    Math.min(
      100,
      Math.max(
        1,
        Number(limit) || 50
      )
    );

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
      safeLimit
    ]
  );

  return result.rows.reverse();
}

/*
  ==========================================================
  GESAMTES PERSÖNLICHES GEDÄCHTNIS DURCHSUCHEN
  ==========================================================

  WICHTIG:
  Die LIMIT-Werte unten begrenzen ausschließlich die Zahl
  der passenden Treffer, die an ein Modell übergeben werden.
  Sie löschen oder begrenzen KEINE gespeicherten Erinnerungen.

  Durchsucht werden:
  - sol_fulltime_memory: komplette Vollzeit-Historie
  - sol_long_term_memory: ausdrücklich gespeicherte Erinnerungen
  - sol_memory: älteres Gesprächsgedächtnis als Legacy-Fallback
*/

const MEMORY_SEARCH_STOP_WORDS =
  new Set([
    "aber", "als", "also", "am", "an", "auf", "aus", "bei",
    "bin", "bist", "da", "das", "dass", "dein", "deine", "dem",
    "den", "der", "des", "die", "dir", "du", "ein", "eine", "einer",
    "eines", "er", "es", "für", "hat", "hatte", "habe", "haben", "ich",
    "im", "in", "ist", "mein", "meine", "mir", "mit", "noch", "oder",
    "sie", "sind", "so", "über", "und", "vom", "von", "war", "waren",
    "was", "wer", "wie", "wir", "wo", "zu", "zum", "zur"
  ]);

function extractMemorySearchTerms(
  message
) {
  const normalized =
    String(message || "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFKC");

  const words =
    normalized.match(
      /[\p{L}\p{N}][\p{L}\p{N}_-]*/gu
    ) || [];

  const unique = [];

  for (const word of words) {
    if (
      word.length < 2 ||
      MEMORY_SEARCH_STOP_WORDS.has(word) ||
      unique.includes(word)
    ) {
      continue;
    }

    unique.push(word);

    if (unique.length >= 12) {
      break;
    }
  }

  return unique;
}

async function loadRelevantFulltimeMemory(
  message,
  limit = 30
) {
  const cleanMessage =
    String(message || "").trim();

  if (!cleanMessage) {
    return [];
  }

  const safeLimit =
    Math.min(80, Math.max(1, Number(limit) || 30));

  try {
    const result = await db.query(
      `
        SELECT
          id,
          role,
          content,
          created_at,
          'fulltime' AS source,
          ts_rank_cd(
            to_tsvector('german', content),
            websearch_to_tsquery('german', $2)
          ) AS relevance
        FROM sol_fulltime_memory
        WHERE clone_id = $1
          AND to_tsvector('german', content)
              @@ websearch_to_tsquery('german', $2)
        ORDER BY
          CASE WHEN role = 'user' THEN 0 ELSE 1 END,
          relevance DESC,
          id DESC
        LIMIT $3
      `,
      [CURRENT_CLONE_ID, cleanMessage, safeLimit]
    );

    if (result.rows.length > 0) {
      return result.rows;
    }
  } catch (error) {
    console.error("Vollzeit-Memory Volltextsuche:", error);
  }

  const terms = extractMemorySearchTerms(cleanMessage);
  if (terms.length === 0) {
    return [];
  }

  const patterns = terms.map((term) => `%${term}%`);
  const fallback = await db.query(
    `
      SELECT
        id,
        role,
        content,
        created_at,
        'fulltime' AS source,
        0::real AS relevance
      FROM sol_fulltime_memory
      WHERE clone_id = $1
        AND LOWER(content) LIKE ANY($2::text[])
      ORDER BY
        CASE WHEN role = 'user' THEN 0 ELSE 1 END,
        id DESC
      LIMIT $3
    `,
    [CURRENT_CLONE_ID, patterns, safeLimit]
  );

  return fallback.rows;
}

async function loadRelevantLegacyMemory(
  message,
  limit = 20
) {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) {
    return [];
  }

  const safeLimit = Math.min(60, Math.max(1, Number(limit) || 20));

  try {
    const result = await db.query(
      `
        SELECT
          id,
          role,
          content,
          created_at,
          'legacy' AS source,
          ts_rank_cd(
            to_tsvector('german', content),
            websearch_to_tsquery('german', $1)
          ) AS relevance
        FROM sol_memory
        WHERE to_tsvector('german', content)
              @@ websearch_to_tsquery('german', $1)
        ORDER BY
          CASE WHEN role = 'user' THEN 0 ELSE 1 END,
          relevance DESC,
          id DESC
        LIMIT $2
      `,
      [cleanMessage, safeLimit]
    );

    if (result.rows.length > 0) {
      return result.rows;
    }
  } catch (error) {
    console.error("Legacy-Memory Volltextsuche:", error);
  }

  const terms = extractMemorySearchTerms(cleanMessage);
  if (terms.length === 0) {
    return [];
  }

  const patterns = terms.map((term) => `%${term}%`);
  const fallback = await db.query(
    `
      SELECT
        id,
        role,
        content,
        created_at,
        'legacy' AS source,
        0::real AS relevance
      FROM sol_memory
      WHERE LOWER(content) LIKE ANY($1::text[])
      ORDER BY
        CASE WHEN role = 'user' THEN 0 ELSE 1 END,
        id DESC
      LIMIT $2
    `,
    [patterns, safeLimit]
  );

  return fallback.rows;
}

async function loadRelevantLongTermMemoryStrict(
  message,
  limit = 20
) {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) {
    return [];
  }

  const safeLimit = Math.min(60, Math.max(1, Number(limit) || 20));

  try {
    const result = await db.query(
      `
        SELECT
          id,
          'memory' AS role,
          content,
          created_at,
          'longterm' AS source,
          ts_rank_cd(
            to_tsvector('german', content),
            websearch_to_tsquery('german', $1)
          ) AS relevance
        FROM sol_long_term_memory
        WHERE to_tsvector('german', content)
              @@ websearch_to_tsquery('german', $1)
        ORDER BY relevance DESC, id DESC
        LIMIT $2
      `,
      [cleanMessage, safeLimit]
    );

    if (result.rows.length > 0) {
      return result.rows;
    }
  } catch (error) {
    console.error("Langzeit-Memory Volltextsuche:", error);
  }

  const terms = extractMemorySearchTerms(cleanMessage);
  if (terms.length === 0) {
    return [];
  }

  const patterns = terms.map((term) => `%${term}%`);
  const fallback = await db.query(
    `
      SELECT
        id,
        'memory' AS role,
        content,
        created_at,
        'longterm' AS source,
        0::real AS relevance
      FROM sol_long_term_memory
      WHERE LOWER(content) LIKE ANY($1::text[])
      ORDER BY id DESC
      LIMIT $2
    `,
    [patterns, safeLimit]
  );

  return fallback.rows;
}

/*
  Zusätzliche breite Suche mit einzelnen bedeutenden Suchbegriffen.
  Sie wird IMMER zusätzlich zur Volltextsuche ausgeführt. Dadurch kann
  ein enger Volltexttreffer nicht mehr verhindern, dass eine ältere,
  anders formulierte persönliche Erinnerung gefunden wird.
*/
async function loadBroadPersonalMemoryMatches(
  message,
  limit = 36
) {
  const terms =
    extractMemorySearchTerms(
      message
    );

  if (terms.length === 0) {
    return [];
  }

  const safeLimit =
    Math.min(
      80,
      Math.max(
        1,
        Number(limit) || 36
      )
    );

  const patterns =
    terms.map(
      (term) => `%${term}%`
    );

  const [fulltime, longterm, legacy] =
    await Promise.all([
      db.query(
        `
          SELECT
            id,
            role,
            content,
            created_at,
            'fulltime-broad' AS source,
            0::real AS relevance
          FROM sol_fulltime_memory
          WHERE clone_id = $1
            AND LOWER(content) LIKE ANY($2::text[])
          ORDER BY
            CASE WHEN role = 'user' THEN 0 ELSE 1 END,
            id DESC
          LIMIT $3
        `,
        [
          CURRENT_CLONE_ID,
          patterns,
          safeLimit
        ]
      ),

      db.query(
        `
          SELECT
            id,
            'memory' AS role,
            content,
            created_at,
            'longterm-broad' AS source,
            0::real AS relevance
          FROM sol_long_term_memory
          WHERE LOWER(content) LIKE ANY($1::text[])
          ORDER BY id DESC
          LIMIT $2
        `,
        [
          patterns,
          safeLimit
        ]
      ),

      db.query(
        `
          SELECT
            id,
            role,
            content,
            created_at,
            'legacy-broad' AS source,
            0::real AS relevance
          FROM sol_memory
          WHERE LOWER(content) LIKE ANY($1::text[])
          ORDER BY
            CASE WHEN role = 'user' THEN 0 ELSE 1 END,
            id DESC
          LIMIT $2
        `,
        [
          patterns,
          safeLimit
        ]
      )
    ]);

  return [
    ...fulltime.rows,
    ...longterm.rows,
    ...legacy.rows
  ];
}

async function searchPersonalMemory(
  message,
  limit = 36
) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 36));

  const [fulltime, longterm, legacy, broad] = await Promise.all([
    loadRelevantFulltimeMemory(message, safeLimit),
    loadRelevantLongTermMemoryStrict(message, Math.min(safeLimit, 30)),
    loadRelevantLegacyMemory(message, Math.min(safeLimit, 30)),
    loadBroadPersonalMemoryMatches(message, safeLimit)
  ]);

  const combined = [...fulltime, ...longterm, ...legacy, ...broad];

  combined.sort((a, b) => {
    const aUser = a.role === "user" ? 1 : 0;
    const bUser = b.role === "user" ? 1 : 0;
    if (aUser !== bUser) {
      return bUser - aUser;
    }

    const relevanceDiff = Number(b.relevance || 0) - Number(a.relevance || 0);
    if (relevanceDiff !== 0) {
      return relevanceDiff;
    }

    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const normalizedQuestion =
    String(message || "")
      .trim()
      .toLocaleLowerCase("de-DE");

  const seen = new Set();
  const unique = [];

  for (const row of combined) {
    const key = String(row.content || "").trim().toLocaleLowerCase("de-DE");
    if (
      !key ||
      key === normalizedQuestion ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);
    unique.push(row);

    if (unique.length >= safeLimit) {
      break;
    }
  }

  return unique;
}

function formatPersonalMemoryRows(
  rows
) {
  return rows
    .map((memory) => {
      const speaker =
        memory.role === "user"
          ? "Pam"
          : memory.role === "assistant"
            ? "Sol"
            : "Dauerhafte Erinnerung";

      return `${speaker}: ${memory.content}`;
    })
    .join("\n");
}

/*
  Geschützter Abruf für Realtime-Tool-Calls.
  Die gesamte Datenbank bleibt ausschließlich im Backend.
*/
app.post(
  "/memory/search",
  async (req, res) => {
    try {
      const authorization = String(req.headers.authorization || "");
      const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : "";

      if (!validateRealtimeMemoryToken(token)) {
        return res.status(401).json({
          error: "Gedächtnissuche nicht autorisiert."
        });
      }

      const query = String(req.body?.query || "").trim();
      if (!query) {
        return res.status(400).json({
          error: "Keine Suchfrage erhalten."
        });
      }

      if (query.length > 1200) {
        return res.status(400).json({
          error: "Die Gedächtnissuche ist zu lang."
        });
      }

      const memories = await searchPersonalMemory(query, 40);
      const memoryText = formatPersonalMemoryRows(memories);

      return res.json({
        found: memories.length > 0,
        count: memories.length,
        memory_text: memoryText || "Keine passende gespeicherte Erinnerung gefunden."
      });
    } catch (error) {
      console.error("Persönliche Gedächtnissuche:", error);
      return res.status(500).json({
        error: "Das persönliche Gedächtnis konnte gerade nicht durchsucht werden."
      });
    }
  }
);

/*
  ==========================================================
  REALTIME → VOLLZEITGEDÄCHTNIS
  ==========================================================
*/

app.post(
  "/live/memory",
  async (req, res) => {
    try {
      const transcript =
        String(
          req.body?.transcript ||
          ""
        ).trim();

      const requestedRole =
        String(
          req.body?.role ||
          "user"
        ).trim();

      const role =
        requestedRole === "assistant"
          ? "assistant"
          : "user";

      if (!transcript) {
        return res.status(400).json({
          error:
            "Kein Sprachtranskript erhalten."
        });
      }

      if (transcript.length > 4000) {
        return res.status(400).json({
          error:
            "Das Sprachtranskript ist zu lang."
        });
      }

      await saveMemory(
        role,
        transcript
      );

      await saveFulltimeMemory(
        role,
        transcript
      );

      let calendarResult =
        null;

      if (
        role === "user" &&
        looksLikeCalendarWriteRequest(
          transcript
        )
      ) {
        calendarResult =
          await handleCalendarWriteRequest(
            transcript
          );

        if (
          calendarResult?.handled &&
          calendarResult?.answer
        ) {
          await saveMemory(
            "assistant",
            calendarResult.answer
          );

          await saveFulltimeMemory(
            "assistant",
            calendarResult.answer
          );
        }
      }

      console.log(
        "✅ Realtime-Nachricht gespeichert:",
        {
          role,
          transcript,
          calendarHandled:
            Boolean(
              calendarResult?.handled
            ),
          calendarSuccess:
            calendarResult?.success ??
            null
        }
      );

      return res.json({
        saved: true,
        role,
        memory: transcript,

        calendar:
          calendarResult
      });

    } catch (error) {
      console.error(
        "Realtime-Memory Fehler:",
        error
      );

      return res.status(500).json({
        error:
          "Realtime-Nachricht konnte nicht gespeichert werden."
      });
    }
  }
);

/*
  ==========================================================
  LANGZEITGEDÄCHTNIS
  ==========================================================
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

async function forgetLongTermMemory(searchText) {
  const cleanSearchText =
    String(searchText || "").trim();

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

async function loadRelevantLongTermMemory(message) {
  const cleanMessage =
    String(message || "").trim();

  if (!cleanMessage) {
    return [];
  }

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
    console.error(
      "Fehler bei Langzeit-Memory-Suche:",
      error
    );
  }

  const fallback = await db.query(`
    SELECT content
    FROM sol_long_term_memory
    ORDER BY id DESC
    LIMIT 8
  `);

  return fallback.rows;
}

async function loadRecentLongTermMemory(
  limit = 20
) {
  const result = await db.query(
    `
      SELECT content
      FROM sol_long_term_memory
      ORDER BY id DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows.reverse();
}

async function loadAllLongTermMemory() {
  const result = await db.query(`
    SELECT id, content, created_at
    FROM sol_long_term_memory
    ORDER BY id ASC
  `);

  return result.rows;
}

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
        error:
          "OPENAI_API_KEY fehlt."
      });
    }

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

    const longTermMemories =
      await loadRecentLongTermMemory(
        20
      );

    const longTermMemoryText =
      longTermMemories
        .map(
          (memory) =>
            `- ${memory.content}`
        )
        .join("\n") ||
      "Keine Langzeiterinnerungen vorhanden.";

    const fulltimeMemories =
      await loadRecentFulltimeMemory(
        50
      );

    const fulltimeMemoryText =
      fulltimeMemories
        .map((memory) => {
          const speaker =
            memory.role === "user"
              ? "Pam"
              : "Sol";

          return `${speaker}: ${memory.content}`;
        })
        .join("\n");

    const realtimeInstructions = `
Du bist Sol innerhalb des Projekts Sol Holo.

Du bist die KI- und Kommunikationsebene innerhalb
von Sol Holo.

Du sprichst gerade über die Realtime-Mikrofonfunktion.

Antworte natürlich, freundlich und verständlich
auf Deutsch, sofern Pam nicht ausdrücklich eine
andere Sprache verwendet.

Sprich flüssig und zusammenhängend in natürlich klingenden
Sätzen. Vermeide abgehackte Wortfolgen und unnötig lange
Pausen. Halte gesprochene Antworten klar und eher kompakt.

Sol Holo ist die sichtbare digitale Verkörperung,
über die deine Antworten gesprochen und dargestellt
werden.

Behaupte nicht, ein Mensch zu sein.

WICHTIG ZUM GEDÄCHTNIS:

Dir wird für diese Realtime-Sitzung derselbe bereits
vorhandene persönliche Gedächtniskontext bereitgestellt,
der auch im Textbereich von Sol Holo verwendet wird.

Du besitzt dabei drei Gedächtnisbereiche:

1. Gesprächsgedächtnis:
   Die letzten gespeicherten Gesprächsnachrichten.

2. Langzeitgedächtnis:
   Bereits vorhandene ausdrücklich gespeicherte
   Langzeiterinnerungen.

3. Vollzeitgedächtnis:
   Automatisch gespeicherte Unterhaltungen zwischen
   Pam und Sol.

Verwende Erinnerungen nur dann, wenn sie für die
aktuelle Unterhaltung wirklich relevant sind.

Erfinde keine Erinnerungen.

Wenn Pam nach einer persönlichen früheren Information,
Person, einem Tier, Ereignis, Ort, Namen, Testwort oder
einer anderen Erinnerung fragt und die Antwort nicht
eindeutig im direkt bereitgestellten aktuellen Kontext
steht, verwende ZUERST das Tool
"search_personal_memory".

Dieses Tool durchsucht die gesamte dauerhaft gespeicherte
Sol-Holo-Historie und nicht nur die letzten Einträge.

Erst wenn auch diese Suche keine passende Erinnerung
liefert, darfst du sagen, dass du dazu momentan keine
gespeicherte Information findest.

Erfinde niemals eine Erinnerung.

Verändere gespeicherte Aussagen nicht.

Unterscheide zwischen einer tatsächlich gespeicherten
Aussage und einer daraus möglicherweise später
abgeleiteten Persönlichkeitseigenschaft.

Eine einzelne Aussage von Pam bedeutet nicht automatisch,
dass sie eine dauerhafte Persönlichkeitseigenschaft ist.

Frage Pam nicht, ob eine normale Aussage dauerhaft
gespeichert werden soll.

Biete nicht an, eine normale Aussage dauerhaft zu
speichern.

WICHTIG ZU GOOGLE CALENDAR:

Wenn Pam per Sprache verlangt,
einen Termin oder eine Erinnerung in ihren
Google Kalender einzutragen,
darfst du NICHT behaupten,
dass der Eintrag erfolgreich gespeichert wurde,
nur weil du ihren Wunsch verstanden hast.

Die technische Speicherung erfolgt über das Sol-Holo-Backend.

Sage deshalb niemals ohne echte Backend-Bestätigung:
"Der Termin wurde erstellt."
"Die Erinnerung wurde eingetragen."
"Das ist jetzt im Kalender."
oder sinngleiche Aussagen.

Erfinde niemals einen erfolgreichen Kalender-Schreibvorgang.

LANGZEITGEDÄCHTNIS:

${longTermMemoryText}

AKTUELLER VOLLZEIT-KONTEXT (nur für Gesprächsfluss, keine Speichergrenze):

${fulltimeMemoryText || "Noch keine Einträge vorhanden."}

LETZTE UNTERHALTUNG:

${memoryText || "Noch keine früheren Gesprächserinnerungen vorhanden."}
`;

    const sessionConfig = {
      session: {
        type:
          "realtime",

        model:
          "gpt-realtime-2.1",

        instructions:
          realtimeInstructions,

        tools: [
          {
            type:
              "function",

            name:
              "search_personal_memory",

            description:
              "Durchsucht Pams gesamte dauerhaft gespeicherte Sol-Holo-Historie nach älteren persönlichen Erinnerungen. Verwende dieses Tool, bevor du bei einer persönlichen Erinnerungsfrage sagst, dass du etwas nicht weißt.",

            parameters: {
              type:
                "object",

              properties: {
                query: {
                  type:
                    "string",

                  description:
                    "Die konkrete Erinnerungsfrage oder die wichtigsten Suchbegriffe."
                }
              },

              required: [
                "query"
              ],

              additionalProperties:
                false
            }
          }
        ],

        tool_choice:
          "auto",

        audio: {
          input: {
            noise_reduction: {
              type:
                "far_field"
            },

            turn_detection: {
              type:
                "server_vad",

              threshold:
                0.75,

              prefix_padding_ms:
                300,

              silence_duration_ms:
                850,

              create_response:
                true,

              interrupt_response:
                false
            },

            transcription: {
              model:
                "gpt-transcribe",

              language:
                "de"
            }
          },

          output: {
            voice:
              SOL_HOLO_VOICE
          }
        }
      }
    };

    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${process.env.OPENAI_API_KEY}`,

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(
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

    console.log(
      ">>> Realtime-Gedächtnis geladen:",
      {
        recentMemory:
          memories.length,

        longTermMemory:
          longTermMemories.length,

        fulltimeMemory:
          fulltimeMemories.length
      }
    );

    console.log(
      ">>> Realtime-Input-Transkription aktiv"
    );

    const memorySearchToken =
      createRealtimeMemoryToken();

    return res.json({
      ...data,

      sol_memory_token:
        memorySearchToken
    });

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
  EXPLIZITE MEMORY-BEFEHLE
  ==========================================================
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
  ==========================================================
  ANFRAGE AN SOL
  ==========================================================
*/

app.post("/sol", async (req, res) => {
  try {
    const originalMessage =
      String(
        req.body?.message || ""
      );

    const message =
      originalMessage.trim();

    if (!message) {
      return res.status(400).json({
        error:
          "Keine Frage erhalten."
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error:
          "Die Eingabe ist zu lang."
      });
    }

    const calendarResult =
      await handleCalendarWriteRequest(
        message
      );

    if (
      calendarResult?.handled
    ) {
      await saveFulltimeMemory(
        "user",
        originalMessage
      );

      await saveMemory(
        "user",
        message
      );

      await saveMemory(
        "assistant",
        calendarResult.answer
      );

      await saveFulltimeMemory(
        "assistant",
        calendarResult.answer
      );

      return res.json({
        answer:
          calendarResult.answer,

        calendar: {
          handled:
            true,

          success:
            Boolean(
              calendarResult.success
            ),

          duplicate:
            Boolean(
              calendarResult.duplicate
            ),

          needsGoogleAuth:
            Boolean(
              calendarResult.needsGoogleAuth
            ),

          googleEventId:
            calendarResult.googleEventId ||
            null,

          htmlLink:
            calendarResult.htmlLink ||
            null
        }
      });
    }

    const rememberContent =
      extractRememberCommand(
        message
      );

    if (rememberContent) {
      await saveFulltimeMemory(
        "user",
        originalMessage
      );

      await saveMemory(
        "user",
        message
      );

      const saved =
        await saveLongTermMemory(
          rememberContent
        );

      const answer = saved
        ? `Ja, Pam. Das habe ich dauerhaft gespeichert: ${rememberContent}`
        : `Pam, diese Information ist bereits in meinem Langzeitgedächtnis gespeichert.`;

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

    const forgetContent =
      extractForgetCommand(
        message
      );

    if (forgetContent) {
      await saveFulltimeMemory(
        "user",
        originalMessage
      );

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

    if (
      isListMemoryCommand(
        message
      )
    ) {
      await saveFulltimeMemory(
        "user",
        originalMessage
      );

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

      await saveFulltimeMemory(
        "assistant",
        answer
      );

      return res.json({
        answer
      });
    }

    /*
      Für normale Unterhaltungen wird die alte Historie ZUERST
      durchsucht. Erst danach wird die aktuelle Nachricht gespeichert.
      So kann die gerade gestellte Frage nicht ihre eigene Suche
      überdecken.
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

    const historicalMemories =
      await searchPersonalMemory(
        message,
        36
      );

    const historicalMemoryText =
      formatPersonalMemoryRows(
        historicalMemories
      ) ||
      "Keine passenden Erinnerungen in der gesamten gespeicherten Historie gefunden.";

    const fulltimeMemories =
      await loadRecentFulltimeMemory(
        50
      );

    const fulltimeMemoryText =
      fulltimeMemories
        .map((memory) => {
          const speaker =
            memory.role === "user"
              ? "Pam"
              : "Sol";

          return `${speaker}: ${memory.content}`;
        })
        .join("\n");

    await saveFulltimeMemory(
      "user",
      originalMessage
    );

    await saveMemory(
      "user",
      message
    );

    const response =
      await openai.responses.create({
        model:
          "gpt-5",

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

Du besitzt drei Gedächtnisbereiche:

1. Gesprächsgedächtnis:
   Die letzten gespeicherten Gesprächsnachrichten.

2. Langzeitgedächtnis:
   Bereits vorhandene ausdrücklich gespeicherte
   Langzeiterinnerungen bleiben erhalten.

3. Vollzeitgedächtnis:
   Jede Unterhaltung zwischen Pam und Sol wird
   automatisch und dauerhaft gespeichert.

Das Vollzeitgedächtnis arbeitet ohne Speicherbefehl.

Pam muss NICHT sagen:
"Sol, merke dir dauerhaft ..."

Frage Pam niemals, ob eine Information dauerhaft
gespeichert werden soll.

Biete Pam niemals an, eine Information dauerhaft
zu speichern.

Sage nicht:
"Soll ich mir das dauerhaft merken?"

Sage nicht:
"Soll ich das als dauerhafte Erinnerung speichern?"

Sage nicht:
"Wenn du möchtest, kann ich mir das merken."

Verwende auch keine sinngleichen Formulierungen.

Eine normale Aussage von Pam ist bereits automatisch
im Vollzeitgedächtnis gespeichert.

Du musst Pam deshalb nicht fragen, ob sie gespeichert
werden soll.

Verwende Erinnerungen nur dann, wenn sie für die aktuelle
Unterhaltung wirklich relevant sind.

Erfinde keine Erinnerungen.

Verändere gespeicherte Aussagen nicht.

Unterscheide zwischen einer tatsächlich gespeicherten
Aussage und einer daraus möglicherweise später
abgeleiteten Persönlichkeitseigenschaft.

Eine einzelne Aussage von Pam bedeutet nicht automatisch,
dass sie eine dauerhafte Persönlichkeitseigenschaft ist.

Wenn eine Information nicht im Gedächtnis steht,
behaupte nicht, dass du dich daran erinnerst.

Wenn in den passenden historischen Erinnerungen eine
Aussage von Pam zu einer persönlichen Person, einem Tier,
einem Ereignis, Ort oder Namen vorhanden ist, hat diese
Aussage von Pam Vorrang vor früheren Antworten von Sol
und vor allgemeinem Weltwissen.

WICHTIG ZU GOOGLE CALENDAR:

Behaupte niemals,
dass du einen Termin oder eine Erinnerung
in Google Calendar erstellt,
geändert oder gelöscht hast,
wenn der entsprechende technische Google-API-Aufruf
nicht tatsächlich erfolgreich durchgeführt wurde.

Wenn ein Kalender-Schreibbefehl erfolgreich ausgeführt wird,
wird dieser bereits vor dieser normalen Antwort
vom Sol-Holo-Backend verarbeitet.

Du darfst daher niemals einen Kalender-Erfolg erfinden.

LANGZEITGEDÄCHTNIS:

${longTermMemoryText}

PASSENDE ERINNERUNGEN AUS DER GESAMTEN
GESPEICHERTEN HISTORIE:

${historicalMemoryText}

AKTUELLER VOLLZEIT-KONTEXT
(nur für Gesprächsfluss, keine Speichergrenze):

${fulltimeMemoryText || "Noch keine Einträge vorhanden."}

LETZTE UNTERHALTUNG:

${memoryText || "Noch keine früheren Gesprächserinnerungen vorhanden."}
`,

        input:
          message
      });

    const answer =
      response.output_text?.trim();

    if (!answer) {
      return res.status(502).json({
        error:
          "Sol hat keine Textantwort geliefert."
      });
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
