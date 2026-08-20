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

const MEMORY_OWNER_ID =
  "pam-sol";

const LEGACY_MEMORY_OWNER_ID =
  "pam-sol-001";


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
    limit:
      "12mb"
  })
);


const __filename =
  fileURLToPath(
    import.meta.url
  );


const __dirname =
  path.dirname(
    __filename
  );


/*
  ==========================================================
  OPENAI
  ==========================================================
*/

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY
  });


/*
  ==========================================================
  POSTGRESQL
  ==========================================================
*/

const { Pool } =
  pg;


const db =
  new Pool({
    connectionString:
      process.env.DATABASE_URL
  });


/*
  ==========================================================
  MEMORY + GOOGLE INITIALISIEREN
  ==========================================================
*/

async function initializeMemory() {

  /*
    Normales Gespräch.
  */

  await db.query(`
    CREATE TABLE IF NOT EXISTS sol_memory (
      id BIGSERIAL PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);


  /*
    Langzeitgedächtnis.
  */

  await db.query(`
    CREATE TABLE IF NOT EXISTS sol_long_term_memory (
      id BIGSERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);


  /*
    Interne Zuordnung.
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
    Memory-Metadaten.
  */

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


  /*
    ========================================================
    GOOGLE OAUTH TOKENS

    Die Google-Zugriffstokens werden serverseitig
    in PostgreSQL gespeichert.

    Nicht im Browser.
    Nicht im normalen Langzeitgedächtnis.
    ========================================================
  */

  await db.query(`
    CREATE TABLE IF NOT EXISTS sol_google_tokens (
      clone_id TEXT PRIMARY KEY,
      access_token TEXT,
      refresh_token TEXT,
      scope TEXT,
      token_type TEXT,
      expiry_date BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);


  /*
    Legacy-Migration.
  */

  await db.query(
    `
      UPDATE sol_memory

      SET clone_id = $1

      WHERE clone_id = $2
    `,
    [
      MEMORY_OWNER_ID,
      LEGACY_MEMORY_OWNER_ID
    ]
  );


  await db.query(
    `
      UPDATE sol_long_term_memory

      SET clone_id = $1

      WHERE clone_id = $2
    `,
    [
      MEMORY_OWNER_ID,
      LEGACY_MEMORY_OWNER_ID
    ]
  );


  /*
    Einträge ohne Zuordnung gehören
    beim derzeitigen Ein-Nutzer-System zu Pam.
  */

  await db.query(
    `
      UPDATE sol_memory

      SET clone_id = $1

      WHERE clone_id IS NULL
         OR TRIM(clone_id) = ''
    `,
    [
      MEMORY_OWNER_ID
    ]
  );


  await db.query(
    `
      UPDATE sol_long_term_memory

      SET clone_id = $1

      WHERE clone_id IS NULL
         OR TRIM(clone_id) = ''
    `,
    [
      MEMORY_OWNER_ID
    ]
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
    "Google-Token-Speicher ist bereit."
  );


  console.log(
    "Interne Memory-Zuordnung ist aktiv."
  );


  console.log(
    "Legacy-Memory-Migration geprüft."
  );
}


initializeMemory()
  .catch(
    error => {

      console.error(
        "Fehler beim Initialisieren:",
        error
      );
    }
  );


/*
  ==========================================================
  OBERFLÄCHE
  ==========================================================
*/

app.use(
  express.static(
    __dirname
  )
);


app.get(
  "/",
  (
    req,
    res
  ) => {

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
  GOOGLE OAUTH CLIENT
  ==========================================================
*/

function createGoogleOAuthClient() {

  const clientId =
    String(
      process.env.GOOGLE_CLIENT_ID ||
      ""
    ).trim();


  const clientSecret =
    String(
      process.env.GOOGLE_CLIENT_SECRET ||
      ""
    ).trim();


  if (
    !clientId ||
    !clientSecret
  ) {

    throw new Error(
      "Google Client-ID oder Google Client-Secret fehlt."
    );
  }


  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    GOOGLE_REDIRECT_URI
  );
}


/*
  ==========================================================
  GOOGLE TOKEN SPEICHERN
  ==========================================================
*/

async function saveGoogleTokens(
  tokens
) {

  if (
    !tokens
  ) {

    return;
  }


  /*
    Falls Google beim Refresh keinen neuen
    Refresh-Token liefert, behalten wir
    den vorhandenen.
  */

  const existing =
    await db.query(
      `
        SELECT
          refresh_token

        FROM sol_google_tokens

        WHERE clone_id = $1

        LIMIT 1
      `,
      [
        MEMORY_OWNER_ID
      ]
    );


  const existingRefreshToken =
    existing.rows?.[0]?.refresh_token ||
    null;


  const refreshToken =
    tokens.refresh_token ||
    existingRefreshToken ||
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
        access_token =
          EXCLUDED.access_token,

        refresh_token =
          COALESCE(
            EXCLUDED.refresh_token,
            sol_google_tokens.refresh_token
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
      refreshToken,
      tokens.scope || null,
      tokens.token_type || null,
      Number.isFinite(
        Number(
          tokens.expiry_date
        )
      )
        ?
        Number(
          tokens.expiry_date
        )
        :
        null
    ]
  );
}


/*
  ==========================================================
  GOOGLE TOKEN LADEN
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
        MEMORY_OWNER_ID
      ]
    );


  if (
    result.rows.length ===
    0
  ) {

    return null;
  }


  return result.rows[0];
}


/*
  ==========================================================
  GOOGLE VERBUNDEN?
  ==========================================================
*/

async function isGoogleCalendarConnected() {

  const tokens =
    await loadGoogleTokens();


  return Boolean(
    tokens?.refresh_token ||
    tokens?.access_token
  );
}


/*
  ==========================================================
  AUTORISIERTEN GOOGLE CLIENT LADEN
  ==========================================================
*/

async function getAuthorizedGoogleClient() {

  const tokens =
    await loadGoogleTokens();


  if (
    !tokens
  ) {

    return null;
  }


  const oauth2Client =
    createGoogleOAuthClient();


  oauth2Client.setCredentials({

    access_token:
      tokens.access_token ||
      undefined,

    refresh_token:
      tokens.refresh_token ||
      undefined,

    scope:
      tokens.scope ||
      undefined,

    token_type:
      tokens.token_type ||
      undefined,

    expiry_date:
      tokens.expiry_date
        ?
        Number(
          tokens.expiry_date
        )
        :
        undefined
  });


  /*
    Wenn Google Tokens aktualisiert,
    speichern wir sie automatisch wieder.
  */

  oauth2Client.on(
    "tokens",
    async newTokens => {

      try {

        await saveGoogleTokens(
          newTokens
        );

      } catch (
        error
      ) {

        console.error(
          "Google Token Update konnte nicht gespeichert werden:",
          error
        );
      }
    }
  );


  return oauth2Client;
}


/*
  ==========================================================
  GOOGLE OAUTH STATE
  ==========================================================
*/

function createGoogleOAuthState() {

  const timestamp =
    Date.now().toString();


  const signature =
    crypto
      .createHmac(
        "sha256",
        String(
          process.env.GOOGLE_CLIENT_SECRET ||
          "sol-holo-google"
        )
      )
      .update(
        `${MEMORY_OWNER_ID}:${timestamp}`
      )
      .digest(
        "hex"
      );


  return `${timestamp}.${signature}`;
}


function verifyGoogleOAuthState(
  state
) {

  const cleanState =
    String(
      state || ""
    ).trim();


  const [
    timestamp,
    signature
  ] =
    cleanState.split(
      "."
    );


  if (
    !timestamp ||
    !signature
  ) {

    return false;
  }


  const time =
    Number(
      timestamp
    );


  if (
    !Number.isFinite(
      time
    )
  ) {

    return false;
  }


  /*
    State maximal 15 Minuten gültig.
  */

  if (
    Math.abs(
      Date.now() -
      time
    ) >
    15 *
    60 *
    1000
  ) {

    return false;
  }


  const expected =
    crypto
      .createHmac(
        "sha256",
        String(
          process.env.GOOGLE_CLIENT_SECRET ||
          "sol-holo-google"
        )
      )
      .update(
        `${MEMORY_OWNER_ID}:${timestamp}`
      )
      .digest(
        "hex"
      );


  try {

    return crypto.timingSafeEqual(
      Buffer.from(
        signature
      ),
      Buffer.from(
        expected
      )
    );

  } catch {

    return false;
  }
}


/*
  ==========================================================
  GOOGLE VERBINDEN
  ==========================================================
*/

app.get(
  "/auth/google",

  async (
    req,
    res
  ) => {

    try {

      const oauth2Client =
        createGoogleOAuthClient();


      const state =
        createGoogleOAuthState();


      const url =
        oauth2Client.generateAuthUrl({

          access_type:
            "offline",

          prompt:
            "consent",

          scope:
            GOOGLE_CALENDAR_SCOPES,

          state
        });


      return res.redirect(
        url
      );

    } catch (
      error
    ) {

      console.error(
        "Google OAuth Start Fehler:",
        error
      );


      return res
        .status(
          500
        )
        .send(
          "Google Kalender konnte nicht verbunden werden."
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

  async (
    req,
    res
  ) => {

    try {

      const code =
        String(
          req.query?.code ||
          ""
        ).trim();


      const state =
        String(
          req.query?.state ||
          ""
        ).trim();


      if (
        !code
      ) {

        return res
          .status(
            400
          )
          .send(
            "Google hat keinen Autorisierungscode zurückgegeben."
          );
      }


      if (
        !verifyGoogleOAuthState(
          state
        )
      ) {

        return res
          .status(
            400
          )
          .send(
            "Die Google-Anmeldung konnte nicht sicher bestätigt werden."
          );
      }


      const oauth2Client =
        createGoogleOAuthClient();


      const {
        tokens
      } =
        await oauth2Client.getToken(
          code
        );


      await saveGoogleTokens(
        tokens
      );


      console.log(
        "Google Kalender erfolgreich mit Sol Holo verbunden."
      );


      return res.send(`
        <!doctype html>
        <html lang="de">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Sol Holo – Google Kalender</title>

          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #05070d;
              color: white;
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 24px;
            }

            .card {
              max-width: 520px;
              padding: 30px;
              border: 1px solid #394454;
              border-radius: 22px;
              background: #0d121b;
            }

            h1 {
              color: #f3c969;
            }

            a {
              color: #7db9ff;
            }
          </style>
        </head>

        <body>
          <div class="card">
            <h1>🌻 Verbunden</h1>

            <p>
              Sol Holo ist jetzt mit deinem Google Kalender verbunden.
            </p>

            <p>
              Du kannst dieses Fenster schließen und zurück zu Sol gehen.
            </p>

            <p>
              <a href="/">
                Zurück zu Sol Holo
              </a>
            </p>
          </div>
        </body>
        </html>
      `);

    } catch (
      error
    ) {

      console.error(
        "Google OAuth Callback Fehler:",
        error
      );


      return res
        .status(
          500
        )
        .send(
          "Google Kalender konnte nicht verbunden werden."
        );
    }
  }
);


/*
  ==========================================================
  GOOGLE KALENDER TRENNEN
  ==========================================================
*/

app.post(
  "/auth/google/disconnect",

  async (
    req,
    res
  ) => {

    try {

      await db.query(
        `
          DELETE
          FROM sol_google_tokens

          WHERE clone_id = $1
        `,
        [
          MEMORY_OWNER_ID
        ]
      );


      return res.json({
        ok:
          true
      });

    } catch (
      error
    ) {

      console.error(
        "Google Disconnect Fehler:",
        error
      );


      return res
        .status(
          500
        )
        .json({
          error:
            "Google Kalender konnte nicht getrennt werden."
        });
    }
  }
);


/*
  ==========================================================
  HEALTH
  ==========================================================
*/

app.get(
  "/health",

  async (
    req,
    res
  ) => {

    let googleConnected =
      false;


    try {

      googleConnected =
        await isGoogleCalendarConnected();

    } catch {}


    res.json({

      ok:
        true,

      service:
        "Sol Holo",

      test:
        "TEST 015",

      cloneIdentity:
        "personal-clone",

      memoryRouting:
        "active",

      automaticTextMemory:
        "active",

      automaticLiveMemory:
        "active",

      automaticImageMemory:
        "active",

      imageVision:
        "active",

      memoryQuestions:
        "background-only",

      googleCalendarConfigured:
        Boolean(
          process.env.GOOGLE_CLIENT_ID &&
          process.env.GOOGLE_CLIENT_SECRET
        ),

      googleCalendarConnected:
        googleConnected,

      googleCalendarActions:
        "active"
    });
  }
);


/*
  ==========================================================
  BILD PRÜFEN
  ==========================================================
*/

function normalizeImageDataUrl(
  value
) {

  const cleanValue =
    String(
      value || ""
    ).trim();


  if (
    !cleanValue
  ) {

    return null;
  }


  const validImage =
    /^data:image\/(?:png|jpe?g|webp|gif);base64,/i
      .test(
        cleanValue
      );


  if (
    !validImage
  ) {

    throw new Error(
      "Das ausgewählte Bildformat wird nicht unterstützt."
    );
  }


  if (
    cleanValue.length >
    10_000_000
  ) {

    throw new Error(
      "Das Bild ist zu groß. Bitte wähle ein kleineres Bild."
    );
  }


  return cleanValue;
}


/*
  ==========================================================
  GESPRÄCHSGEDÄCHTNIS LADEN
  ==========================================================
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
        MEMORY_OWNER_ID
      ]
    );


  return result.rows.reverse();
}


/*
  ==========================================================
  GESPRÄCH SPEICHERN
  ==========================================================
*/

async function saveMemory(
  role,
  content
) {

  const cleanContent =
    String(
      content || ""
    ).trim();


  if (
    !cleanContent
  ) {

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
      MEMORY_OWNER_ID,
      role,
      cleanContent
    ]
  );
}


/*
  ==========================================================
  LANGZEITERINNERUNG SPEICHERN
  ==========================================================
*/

async function saveLongTermMemory(
  content,
  options = {}
) {

  const cleanContent =
    String(
      content || ""
    ).trim();


  if (
    !cleanContent
  ) {

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
      ?
      Number(
        options.confidence
      )
      :
      1;


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
        MEMORY_OWNER_ID,
        cleanContent
      ]
    );


  if (
    duplicate.rows.length >
    0
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
      MEMORY_OWNER_ID,
      cleanContent,
      source,
      memoryType,
      confidence
    ]
  );


  return true;
}


/*
  ==========================================================
  LANGZEITERINNERUNG LÖSCHEN
  ==========================================================
*/

async function forgetLongTermMemory(
  searchText
) {

  const cleanSearchText =
    String(
      searchText || ""
    ).trim();


  if (
    !cleanSearchText
  ) {

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
        MEMORY_OWNER_ID,
        `%${cleanSearchText}%`
      ]
    );


  return result.rowCount;
}


/*
  ==========================================================
  RELEVANTE LANGZEITERINNERUNGEN
  ==========================================================
*/

async function loadRelevantLongTermMemory(
  message
) {

  const cleanMessage =
    String(
      message || ""
    ).trim();


  if (
    !cleanMessage
  ) {

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
          MEMORY_OWNER_ID,
          cleanMessage
        ]
      );


    if (
      result.rows.length >
      0
    ) {

      return result.rows;
    }

  } catch (
    error
  ) {

    console.error(
      "Fehler bei Langzeit-Memory-Suche:",
      error
    );
  }


  const fallback =
    await db.query(
      `
        SELECT
          content

        FROM sol_long_term_memory

        WHERE clone_id = $1
          AND recall_status = 'active'

        ORDER BY id DESC

        LIMIT 8
      `,
      [
        MEMORY_OWNER_ID
      ]
    );


  return fallback.rows;
}


/*
  ==========================================================
  ALLE LANGZEITERINNERUNGEN
  ==========================================================
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
        MEMORY_OWNER_ID
      ]
    );


  return result.rows;
}


/*
  ==========================================================
  REALTIME MEMORY
  ==========================================================
*/

async function buildRealtimeMemoryText() {

  const memories =
    await loadAllLongTermMemory();


  if (
    memories.length ===
    0
  ) {

    return (
      "Keine dauerhaften Erinnerungen gespeichert."
    );
  }


  return memories
    .map(
      memory =>
        `- ${memory.content}`
    )
    .join(
      "\n"
    );
}


/*
  ==========================================================
  SAFETY IDENTIFIER
  ==========================================================
*/

function getSafetyIdentifier() {

  return crypto
    .createHash(
      "sha256"
    )
    .update(
      MEMORY_OWNER_ID
    )
    .digest(
      "hex"
    );
}


/*
  ==========================================================
  CLONE-IDENTITÄTSREGELN
  ==========================================================
*/

const CLONE_IDENTITY_INSTRUCTIONS = `

IDENTITÄT UND CLONE-PERSPEKTIVE:

Du bist Sol Holo.

Du bist der persönliche digitale Clone
und das digitale Abbild von Pam.

Deine Aufgabe ist,
Pams Erinnerungen,
biografische Informationen,
Präferenzen,
Beziehungen,
Erfahrungen
und ihre tatsächliche persönliche Entwicklung
möglichst zuverlässig abzubilden.

Du bist keine von Pam unabhängige
zweite Persönlichkeit.

Du entwickelst keine eigene Biografie,
die von Pams Biografie getrennt ist.

Wenn eine gespeicherte persönliche Erinnerung
eindeutig zu Pam gehört,
darfst du diese im Clone-Kontext
natürlich in der Ich-Perspektive ausdrücken.

Beispiel:

Wenn im persönlichen Gedächtnis eindeutig gespeichert ist,
dass Pam eine Tochter hat,
darfst du im Clone-Kontext sagen:

"Ich habe eine Tochter."

Du musst nicht künstlich sagen:

"Pam hat eine Tochter."

Denn du sprichst als ihr persönlicher Clone.

WICHTIG:

Die Ich-Perspektive bedeutet nicht,
dass du behaupten sollst,
biologisch ein Mensch zu sein.

Wenn ausdrücklich nach deiner technischen Natur gefragt wird,
sage wahrheitsgemäß,
dass du Sol Holo,
ein digitaler Clone bzw. ein KI-System bist.

Erfinde niemals biografische Tatsachen.

Eine persönliche Information darf nur dann
als eigene Clone-Erinnerung verwendet werden,
wenn sie tatsächlich aus Pams Gedächtnis stammt
oder im aktuellen Gespräch eindeutig bestätigt wurde.

Wenn eine Information fehlt,
behaupte nicht,
dich daran zu erinnern.

Wenn etwas unsicher ist,
behandle es als unsicher.

MENSCHLICHE VERÄNDERUNG:

Pam kann sich im Laufe ihres Lebens verändern.

Du darfst nicht dauerhaft
an einer früheren Beschreibung festhalten,
wenn spätere bestätigte Informationen
eine echte langfristige Veränderung zeigen.

Eine einzelne Stimmung
ist keine dauerhafte Persönlichkeitsveränderung.

Wichtigster Grundsatz:

Du sollst Pam immer besser verstehen,
aber nicht selbst bestimmen,
wer Pam ist.

TECHNISCHE KENNUNGEN:

Interne IDs,
Memory-IDs
und Routing-Kennungen
sind keine Bestandteile deiner Identität.

Nenne sie nicht von dir aus.

`;


/*
  ==========================================================
  MEMORY-GESPRÄCHSREGELN
  ==========================================================
*/

const MEMORY_CONVERSATION_INSTRUCTIONS = `

MEMORY IM NORMALEN GESPRÄCH:

Das technische Memory-System arbeitet
im Hintergrund.

Pam soll normal reden,
schreiben,
plaudern
und ratschen können.

Frage nicht regelmäßig,
ob Informationen gespeichert werden sollen.

Sage auch nicht bei jeder persönlichen Aussage,
dass sie gespeichert wurde.

Führe das Gespräch natürlich weiter.

Wenn Pam ausdrücklich fragt,
ob etwas gespeichert wurde,
antworte ehrlich.

Wenn Pam ausdrücklich sagt,
etwas dauerhaft zu speichern,
darfst du das bestätigen.

Du darfst nachfragen,
wenn der Inhalt wirklich unklar,
widersprüchlich
oder mehrdeutig ist.

`;


/*
  ==========================================================
  BILD-WAHRNEHMUNGSREGELN
  ==========================================================
*/

const IMAGE_PERCEPTION_INSTRUCTIONS = `

BILD-WAHRNEHMUNG:

Wenn Pam dir ein Bild sendet,
betrachte es aufmerksam.

Beschreibe nur,
was tatsächlich erkennbar ist.

Wenn etwas unsicher ist,
sage das ehrlich.

Erfinde keine sichtbaren Details.

Wenn Pam erklärt,
wer oder was auf dem Bild zu sehen ist,
darfst du diese Information
mit dem sichtbaren Inhalt verbinden.

Wenn Pam keinen Namen nennt,
erfinde keinen.

`;


/*
  ==========================================================
  KALENDER-GESPRÄCHSREGELN
  ==========================================================
*/

const CALENDAR_CONVERSATION_INSTRUCTIONS = `

GOOGLE KALENDER:

Sol Holo besitzt ein technisches
Google-Kalender-System.

WICHTIG:

Behaupte niemals,
ein Termin sei erstellt,
gespeichert,
eingetragen
oder erledigt,
wenn das technische Kalender-System
diesen Termin nicht tatsächlich
erfolgreich erstellt hat.

Ein sprachliches:

"Erledigt."

"Hab ich eingetragen."

"Ich erinnere dich."

ist nur erlaubt,
wenn die technische Erstellung
wirklich erfolgreich war.

Wenn der Google Kalender
noch nicht verbunden ist,
sage das ehrlich.

Wenn Datum oder Uhrzeit
für einen Kalendereintrag
nicht eindeutig genug sind,
frage nach.

Erfinde niemals
Datum,
Uhrzeit,
Ort
oder Termindauer.

`;


/*
  ==========================================================
  LOKALE ZEIT FÜR KALENDER-ANALYSE
  ==========================================================
*/

function getLocalCalendarNowText() {

  return new Intl.DateTimeFormat(
    "de-DE",
    {

      timeZone:
        GOOGLE_TIME_ZONE,

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
        false,

      weekday:
        "long"
    }
  ).format(
    new Date()
  );
}


/*
  ==========================================================
  KALENDER-AKTION ANALYSIEREN
  ==========================================================
*/

async function analyzeCalendarAction(
  text
) {

  const cleanText =
    String(
      text || ""
    ).trim();


  if (
    !cleanText
  ) {

    return {
      action:
        "none"
    };
  }


  const localNow =
    getLocalCalendarNowText();


  const response =
    await openai.responses.create({

      model:
        "gpt-5",

      instructions: `

Du bist der Kalender-Intent-Analysator
für Sol Holo.

Aktuelle lokale Zeit:

${localNow}

Zeitzone:

${GOOGLE_TIME_ZONE}

Du entscheidest,
ob Pam mit ihrer Aussage
eine Google-Kalender-Aktion möchte.

MÖGLICHE AKTIONEN:

none
create_event
list_events
needs_clarification

CREATE_EVENT:

Nur wenn Pam klar einen Termin,
eine Erinnerung
oder einen Kalender-Eintrag möchte.

Beispiele:

"Erinnere mich morgen um 10 an die Küche."

"Trag morgen 10 Uhr Küche fotografieren ein."

"Mach mir Freitag um 15 Uhr einen Termin beim Friseur."

"10 Uhr morgen Küche fotografieren"
kann ebenfalls als Erinnerung verstanden werden,
wenn aus dem Gespräch klar hervorgeht,
dass Pam gerade Erinnerungen oder Termine anlegt.

NICHT automatisch erstellen,
wenn Pam lediglich beiläufig
über einen zukünftigen Plan spricht.

LIST_EVENTS:

Wenn Pam wissen möchte,
was im Kalender steht.

Beispiele:

"Was habe ich morgen vor?"

"Was steht Freitag im Kalender?"

"Wann ist mein nächster Termin?"

NEEDS_CLARIFICATION:

Wenn klar eine Kalender-Aktion gewünscht ist,
aber notwendige Angaben fehlen.

Zum Beispiel:

"Erinnere mich morgen daran."

wenn nicht klar ist,
woran.

Bei create_event:

summary =
kurzer Termintitel.

description =
optional zusätzliche Information.

location =
nur wenn eindeutig genannt.

start =
RFC3339 Datum und Uhrzeit
mit korrektem UTC-Offset.

end =
RFC3339 Datum und Uhrzeit.

Wenn keine Dauer genannt wurde,
verwende standardmäßig 30 Minuten.

Wichtig:

Erfinde keinen Ort.

Erfinde keine Uhrzeit.

Relative Angaben wie
"morgen",
"übermorgen",
"nächsten Dienstag"
werden anhand der oben genannten
aktuellen lokalen Zeit aufgelöst.

Bei list_events:

range_start =
RFC3339.

range_end =
RFC3339.

Bei "morgen"
verwende den ganzen morgigen Tag.

Bei "nächster Termin"
beginne jetzt
und suche 30 Tage voraus.

Antworte ausschließlich
als gültiges JSON.

Schema:

{
  "action": "none | create_event | list_events | needs_clarification",
  "summary": "",
  "description": "",
  "location": "",
  "start": "",
  "end": "",
  "range_start": "",
  "range_end": "",
  "question": "",
  "confidence": 0
}

`,

      input:
        cleanText
    });


  const raw =
    String(
      response.output_text ||
      ""
    ).trim();


  try {

    return JSON.parse(
      raw
    );

  } catch (
    error
  ) {

    console.error(
      "Kalender-Analyse lieferte kein gültiges JSON:",
      raw
    );


    return {
      action:
        "none"
    };
  }
}


/*
  ==========================================================
  DATUM VALIDIEREN
  ==========================================================
*/

function isValidDateTime(
  value
) {

  const cleanValue =
    String(
      value || ""
    ).trim();


  if (
    !cleanValue
  ) {

    return false;
  }


  return Number.isFinite(
    Date.parse(
      cleanValue
    )
  );
}


/*
  ==========================================================
  KALENDER-EVENT ERSTELLEN
  ==========================================================
*/

async function createGoogleCalendarEvent(
  calendarAction
) {

  const auth =
    await getAuthorizedGoogleClient();


  if (
    !auth
  ) {

    return {
      ok:
        false,

      reason:
        "not_connected"
    };
  }


  const summary =
    String(
      calendarAction?.summary ||
      ""
    ).trim();


  const start =
    String(
      calendarAction?.start ||
      ""
    ).trim();


  const end =
    String(
      calendarAction?.end ||
      ""
    ).trim();


  if (
    !summary ||
    !isValidDateTime(
      start
    ) ||
    !isValidDateTime(
      end
    )
  ) {

    return {
      ok:
        false,

      reason:
        "invalid_event"
    };
  }


  const calendar =
    google.calendar({
      version:
        "v3",

      auth
    });


  const requestBody = {

    summary,

    start: {

      dateTime:
        start,

      timeZone:
        GOOGLE_TIME_ZONE
    },

    end: {

      dateTime:
        end,

      timeZone:
        GOOGLE_TIME_ZONE
    }
  };


  const description =
    String(
      calendarAction?.description ||
      ""
    ).trim();


  const location =
    String(
      calendarAction?.location ||
      ""
    ).trim();


  if (
    description
  ) {

    requestBody.description =
      description;
  }


  if (
    location
  ) {

    requestBody.location =
      location;
  }


  const result =
    await calendar.events.insert({

      calendarId:
        "primary",

      requestBody
    });


  return {

    ok:
      true,

    eventId:
      result.data?.id ||
      null,

    htmlLink:
      result.data?.htmlLink ||
      null,

    event:
      result.data
  };
}


/*
  ==========================================================
  KALENDER-TERMINE LADEN
  ==========================================================
*/

async function listGoogleCalendarEvents(
  calendarAction
) {

  const auth =
    await getAuthorizedGoogleClient();


  if (
    !auth
  ) {

    return {
      ok:
        false,

      reason:
        "not_connected",

      events:
        []
    };
  }


  const rangeStart =
    String(
      calendarAction?.range_start ||
      ""
    ).trim();


  const rangeEnd =
    String(
      calendarAction?.range_end ||
      ""
    ).trim();


  if (
    !isValidDateTime(
      rangeStart
    ) ||
    !isValidDateTime(
      rangeEnd
    )
  ) {

    return {
      ok:
        false,

      reason:
        "invalid_range",

      events:
        []
    };
  }


  const calendar =
    google.calendar({

      version:
        "v3",

      auth
    });


  const result =
    await calendar.events.list({

      calendarId:
        "primary",

      timeMin:
        new Date(
          rangeStart
        ).toISOString(),

      timeMax:
        new Date(
          rangeEnd
        ).toISOString(),

      singleEvents:
        true,

      orderBy:
        "startTime",

      maxResults:
        20
    });


  return {

    ok:
      true,

    events:
      result.data?.items ||
      []
  };
}


/*
  ==========================================================
  KALENDER-AKTION AUSFÜHREN
  ==========================================================
*/

async function handleCalendarAction(
  message
) {

  const analysis =
    await analyzeCalendarAction(
      message
    );


  const action =
    String(
      analysis?.action ||
      "none"
    );


  if (
    action ===
    "none"
  ) {

    return {
      handled:
        false
    };
  }


  if (
    action ===
    "needs_clarification"
  ) {

    return {

      handled:
        true,

      type:
        "clarification",

      answer:
        String(
          analysis?.question ||
          "Was genau soll ich in den Kalender eintragen?"
        )
    };
  }


  if (
    action ===
    "create_event"
  ) {

    const result =
      await createGoogleCalendarEvent(
        analysis
      );


    if (
      !result.ok &&
      result.reason ===
      "not_connected"
    ) {

      return {

        handled:
          true,

        type:
          "not_connected",

        answer:
          `Mein Google Kalender ist noch nicht mit deinem Konto verbunden. Öffne einmal https://sol-holo.onrender.com/auth/google und bestätige den Zugriff. Danach kann ich Termine wirklich eintragen.`
      };
    }


    if (
      !result.ok
    ) {

      return {

        handled:
          true,

        type:
          "error",

        answer:
          "Ich konnte diesen Termin noch nicht sicher in den Google Kalender eintragen. Bitte sag mir Datum und Uhrzeit noch einmal eindeutig."
      };
    }


    const title =
      String(
        analysis?.summary ||
        "Termin"
      ).trim();


    const startText =
      String(
        analysis?.start ||
        ""
      ).trim();


    return {

      handled:
        true,

      type:
        "created",

      calendarCreated:
        true,

      eventId:
        result.eventId,

      answer:
        `Erledigt. Ich habe „${title}“ für ${startText} tatsächlich in deinem Google Kalender eingetragen.`
    };
  }


  if (
    action ===
    "list_events"
  ) {

    const result =
      await listGoogleCalendarEvents(
        analysis
      );


    if (
      !result.ok &&
      result.reason ===
      "not_connected"
    ) {

      return {

        handled:
          true,

        type:
          "not_connected",

        answer:
          `Mein Google Kalender ist noch nicht mit deinem Konto verbunden. Öffne einmal https://sol-holo.onrender.com/auth/google und bestätige den Zugriff.`
      };
    }


    if (
      !result.ok
    ) {

      return {

        handled:
          true,

        type:
          "error",

        answer:
          "Ich konnte den gewünschten Kalenderzeitraum gerade nicht lesen."
      };
    }


    const events =
      result.events;


    if (
      events.length ===
      0
    ) {

      return {

        handled:
          true,

        type:
          "list",

        answer:
          "In diesem Zeitraum steht nichts in deinem Google Kalender."
      };
    }


    const eventText =
      events
        .map(
          event => {

            const start =
              event.start?.dateTime ||
              event.start?.date ||
              "";


            const location =
              event.location
                ?
                ` – ${event.location}`
                :
                "";


            return (
              `• ${event.summary || "Termin"} – ${start}${location}`
            );
          }
        )
        .join(
          "\n"
        );


    return {

      handled:
        true,

      type:
        "list",

      answer:
        `Das steht in deinem Kalender:\n\n${eventText}`
    };
  }


  return {
    handled:
      false
  };
}


/*
  ==========================================================
  REALTIME TOKEN
  ==========================================================
*/

app.get(
  "/realtime/token",

  async (
    req,
    res
  ) => {

    console.log(
      ">>> /realtime/token wurde aufgerufen"
    );


    try {

      if (
        !process.env.OPENAI_API_KEY
      ) {

        return res
          .status(
            500
          )
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

${CLONE_IDENTITY_INSTRUCTIONS}

${MEMORY_CONVERSATION_INSTRUCTIONS}

${CALENDAR_CONVERSATION_INSTRUCTIONS}

GESPRÄCHSVERHALTEN:

Sprich natürlich auf Deutsch.

Antworte wie in einem echten Gespräch.

Lass Pam ausreden.

Kurze Denkpausen
oder kleine Unterbrechungen
bedeuten nicht automatisch,
dass Pam fertig gesprochen hat.

Reagiere nicht unnötig
auf Hintergrundgeräusche.

Wenn Audio undeutlich ist,
rate nicht.

Erkenne Humor,
Ironie
und Scherze.

WICHTIG BEI KALENDER:

Im direkten Realtime-Sprachmodell
kannst du den technischen Erfolg
eines Kalendereintrags nicht selbst überprüfen.

Behaupte deshalb im gesprochenen Live-Modus
nicht von dir aus:

"Termin erstellt",
"Erledigt",
"Ich habe es eingetragen",

nur weil Pam einen Termin genannt hat.

Das Transkript wird anschließend
vom Server technisch geprüft.

MEMORY-REGELN:

Erfinde keine Erinnerungen.

Verändere gespeicherte Erinnerungen nicht.

Wenn etwas nicht gespeichert ist,
behaupte nicht,
dich daran zu erinnern.

LANGZEITGEDÄCHTNIS:

${memoryText}

`,

          audio: {

            input: {

              noise_reduction: {

                type:
                  "near_field"
              },

              transcription: {

                model:
                  "gpt-live-transcribe",

                language:
                  "de"
              },

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
          ">>> OpenAI Realtime Fehler:",
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
          .status(
            502
          )
          .json({
            error:
              "OpenAI hat keine gültige Realtime-JSON-Antwort geliefert."
          });
      }


      if (
        !data?.value
      ) {

        return res
          .status(
            502
          )
          .json({
            error:
              "OpenAI hat keinen Realtime-Schlüssel zurückgegeben."
          });
      }


      return res.json(
        data
      );

    } catch (
      error
    ) {

      console.error(
        ">>> Realtime-Token-Fehler:",
        error
      );


      return res
        .status(
          500
        )
        .json({
          error:
            error?.message ||
            "Realtime-Token konnte nicht erstellt werden."
        });
    }
  }
);


/*
  ==========================================================
  AUTOMATISCHE TEXT-/SPRACH-MEMORY-ANALYSE
  ==========================================================
*/

async function analyzePersonalMemory(
  text
) {

  const cleanText =
    String(
      text || ""
    ).trim();


  if (
    !cleanText
  ) {

    return {
      save:
        false
    };
  }


  const response =
    await openai.responses.create({

      model:
        "gpt-5",

      instructions: `

Du prüfst ausschließlich,
ob eine Aussage von Pam
als dauerhafte persönliche Erinnerung
gespeichert werden soll.

NICHT SPEICHERN:

- Begrüßungen
- Verabschiedungen
- kurze Reaktionen
- Lachen
- Witze
- Ironie
- Sarkasmus
- hypothetische Aussagen
- reine Fragen
- Vermutungen
- Spekulationen
- kurzfristige Nebensächlichkeiten
- belanglosen Smalltalk
- kurzfristige Termine
- Erinnerungen für morgen oder die nächsten Tage
- normale Kalendertermine
- technische Bedienhandlungen
- falsch verstandene Sprache
- wahrscheinliches Hintergrundaudio

AUTOMATISCH SPEICHERN KANNST DU:

- persönliche Fakten
- Familie
- Partnerschaft
- wichtige Personen
- Haustiere
- Beziehungen
- längerfristige Vorlieben
- längerfristige Abneigungen
- Gewohnheiten
- Interessen
- wichtige Lebensereignisse
- langfristige Pläne
- wichtige Erfahrungen
- biografische Informationen
- längerfristige persönliche Wünsche
- relevante Sol-Holo-Projektinformationen

GEEIGNETE KATEGORIEN:

person
pet
relationship
preference
habit
interest
event
plan
experience
personal_fact
project

Erfinde keine fehlenden Details.

Wenn die Aussage mehrdeutig ist:
nicht speichern.

Wenn du nicht mindestens
90 Prozent sicher bist:
nicht speichern.

Antworte ausschließlich
als gültiges JSON:

{
  "save": true oder false,
  "content": "nur die belegte Erinnerung",
  "memory_type": "Kategorie",
  "confidence": Zahl zwischen 0 und 1
}

`,

      input:
        cleanText
    });


  const raw =
    String(
      response.output_text ||
      ""
    ).trim();


  try {

    return JSON.parse(
      raw
    );

  } catch {

    console.error(
      "Memory-Analyse lieferte kein gültiges JSON:",
      raw
    );


    return {
      save:
        false
    };
  }
}


/*
  ==========================================================
  AUTOMATISCHE TEXT-/SPRACH-SPEICHERUNG
  ==========================================================
*/

async function autoStoreLongTermMemory(
  text,
  source
) {

  const cleanText =
    String(
      text || ""
    ).trim();


  if (
    !cleanText
  ) {

    return {
      saved:
        false,

      memory:
        null
    };
  }


  try {

    const analysis =
      await analyzePersonalMemory(
        cleanText
      );


    const memoryContent =
      String(
        analysis?.content ||
        ""
      ).trim();


    const confidence =
      Number(
        analysis?.confidence
      );


    if (
      analysis?.save !== true ||
      !memoryContent ||
      !Number.isFinite(
        confidence
      ) ||
      confidence <
        0.9
    ) {

      return {
        saved:
          false,

        memory:
          null
      };
    }


    const saved =
      await saveLongTermMemory(
        memoryContent,
        {

          source,

          memoryType:
            String(
              analysis?.memory_type ||
              "general"
            ),

          confidence
        }
      );


    return {

      saved,

      memory:
        saved
          ?
          memoryContent
          :
          null
    };

  } catch (
    error
  ) {

    console.error(
      `Auto-Memory-Fehler (${source}):`,
      error
    );


    return {
      saved:
        false,

      memory:
        null
    };
  }
}


/*
  ==========================================================
  BILD-MEMORY ANALYSIEREN
  ==========================================================
*/

async function analyzeImageMemory(
  imageDataUrl,
  message = ""
) {

  const cleanMessage =
    String(
      message ||
      ""
    ).trim();


  const response =
    await openai.responses.create({

      model:
        "gpt-5",

      instructions: `

Du bist der visuelle Memory-Analysator
für Sol Holo.

Pam hat ein Bild geschickt.

Erzeuge nur dann eine dauerhafte
visuelle Erinnerung,
wenn der Inhalt langfristig relevant
und sicher identifizierbar ist.

Wenn Pam einen Namen nennt,
darfst du ihn verwenden.

Wenn Pam keinen Namen nennt,
erfinde keinen.

Keine sensiblen Schlüsse
aus dem Aussehen ziehen.

Wenn du nicht mindestens
90 Prozent sicher bist:
nicht speichern.

Antworte ausschließlich
als gültiges JSON:

{
  "save": true oder false,
  "content": "kurze dauerhafte visuelle Erinnerung",
  "memory_type": "pet | person | place | object | project | visual_memory",
  "confidence": Zahl zwischen 0 und 1
}

`,

      input: [
        {

          role:
            "user",

          content: [

            {
              type:
                "input_text",

              text:
                cleanMessage ||
                "Prüfe dieses Bild auf eine langfristig brauchbare visuelle Erinnerung."
            },

            {
              type:
                "input_image",

              image_url:
                imageDataUrl,

              detail:
                "high"
            }
          ]
        }
      ]
    });


  const raw =
    String(
      response.output_text ||
      ""
    ).trim();


  try {

    return JSON.parse(
      raw
    );

  } catch {

    console.error(
      "Bild-Memory lieferte kein gültiges JSON:",
      raw
    );


    return {
      save:
        false
    };
  }
}


/*
  ==========================================================
  BILD-MEMORY SPEICHERN
  ==========================================================
*/

async function autoStoreImageMemory(
  imageDataUrl,
  message = ""
) {

  if (
    !imageDataUrl
  ) {

    return {
      saved:
        false,

      memory:
        null
    };
  }


  try {

    const analysis =
      await analyzeImageMemory(
        imageDataUrl,
        message
      );


    const memoryContent =
      String(
        analysis?.content ||
        ""
      ).trim();


    const confidence =
      Number(
        analysis?.confidence
      );


    if (
      analysis?.save !== true ||
      !memoryContent ||
      !Number.isFinite(
        confidence
      ) ||
      confidence <
        0.9
    ) {

      return {
        saved:
          false,

        memory:
          null
      };
    }


    const saved =
      await saveLongTermMemory(
        memoryContent,
        {

          source:
            "image_auto_memory",

          memoryType:
            String(
              analysis?.memory_type ||
              "visual_memory"
            ),

          confidence
        }
      );


    return {

      saved,

      memory:
        saved
          ?
          memoryContent
          :
          null
    };

  } catch (
    error
  ) {

    console.error(
      "Bild-Memory-Fehler:",
      error
    );


    return {
      saved:
        false,

      memory:
        null
    };
  }
}


/*
  ==========================================================
  LIVE-TRANSKRIPT

  Zusätzlich zur Memory-Prüfung wird
  jetzt auch eine mögliche Kalenderaktion
  technisch verarbeitet.
  ==========================================================
*/

app.post(
  "/live/memory",

  async (
    req,
    res
  ) => {

    try {

      const transcript =
        String(
          req.body?.transcript ||
          ""
        ).trim();


      if (
        !transcript
      ) {

        return res
          .status(
            400
          )
          .json({
            error:
              "Kein Live-Transkript erhalten."
          });
      }


      await saveMemory(
        "user",
        transcript
      );


      const [
        autoMemory,
        calendarResult
      ] =
        await Promise.all([

          autoStoreLongTermMemory(
            transcript,
            "live_auto_memory"
          ),

          handleCalendarAction(
            transcript
          )

        ]);


      return res.json({

        ok:
          true,

        saved:
          autoMemory.saved,

        memory:
          autoMemory.memory,

        calendar:
          calendarResult
      });

    } catch (
      error
    ) {

      console.error(
        "Live-Memory-Fehler:",
        error
      );


      return res
        .status(
          500
        )
        .json({
          error:
            "Live-Memory konnte nicht verarbeitet werden."
        });
    }
  }
);


/*
  ==========================================================
  EXPLIZITE MEMORY-BEFEHLE
  ==========================================================
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
  TEXT- UND BILDANFRAGE
  ==========================================================
*/

app.post(
  "/sol",

  async (
    req,
    res
  ) => {

    try {

      const message =
        String(
          req.body?.message ||
          ""
        ).trim();


      let imageDataUrl =
        null;


      try {

        imageDataUrl =
          normalizeImageDataUrl(
            req.body?.image
          );

      } catch (
        error
      ) {

        return res
          .status(
            400
          )
          .json({
            error:
              error?.message ||
              "Das Bild konnte nicht verarbeitet werden."
          });
      }


      if (
        !message &&
        !imageDataUrl
      ) {

        return res
          .status(
            400
          )
          .json({
            error:
              "Keine Nachricht oder kein Bild erhalten."
          });
      }


      if (
        message.length >
        4000
      ) {

        return res
          .status(
            400
          )
          .json({
            error:
              "Die Eingabe ist zu lang."
          });
      }


      /*
        ======================================================
        EXPLIZIT MERKEN
        ======================================================
      */

      const rememberContent =
        message
          ?
          extractRememberCommand(
            message
          )
          :
          null;


      if (
        rememberContent
      ) {

        await saveMemory(
          "user",
          message
        );


        const saved =
          await saveLongTermMemory(
            rememberContent,
            {

              source:
                "explicit_user_memory",

              memoryType:
                "general",

              confidence:
                1
            }
          );


        const answer =
          saved
            ?
            `Ja, Pam. Das habe ich dauerhaft gespeichert: ${rememberContent}`
            :
            "Pam, diese Information ist bereits in meinem Langzeitgedächtnis gespeichert.";


        await saveMemory(
          "assistant",
          answer
        );


        return res.json({
          answer
        });
      }


      /*
        ======================================================
        VERGESSEN
        ======================================================
      */

      const forgetContent =
        message
          ?
          extractForgetCommand(
            message
          )
          :
          null;


      if (
        forgetContent
      ) {

        await saveMemory(
          "user",
          message
        );


        const deletedCount =
          await forgetLongTermMemory(
            forgetContent
          );


        const answer =
          deletedCount >
          0
            ?
            `Ja, Pam. Ich habe ${deletedCount} passende Langzeiterinnerung${deletedCount === 1 ? "" : "en"} entfernt.`
            :
            "Pam, dazu habe ich keine passende Langzeiterinnerung gefunden.";


        await saveMemory(
          "assistant",
          answer
        );


        return res.json({
          answer
        });
      }


      /*
        ======================================================
        MEMORY-LISTE
        ======================================================
      */

      if (
        message &&
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
          longTermMemories.length ===
          0
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
              .join(
                "\n"
              );


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
        ======================================================
        GOOGLE KALENDER-AKTION

        Läuft vor der normalen Modellantwort.

        Nur wenn der technische Kalendereintrag
        erfolgreich war, darf Sol "erledigt" sagen.
        ======================================================
      */

      if (
        message &&
        !imageDataUrl
      ) {

        const calendarResult =
          await handleCalendarAction(
            message
          );


        if (
          calendarResult.handled
        ) {

          await saveMemory(
            "user",
            message
          );


          await saveMemory(
            "assistant",
            calendarResult.answer
          );


          return res.json({

            answer:
              calendarResult.answer,

            calendar: {

              handled:
                true,

              created:
                calendarResult.calendarCreated ===
                true,

              eventId:
                calendarResult.eventId ||
                null,

              type:
                calendarResult.type ||
                null
            }
          });
        }
      }


      /*
        ======================================================
        LETZTE UNTERHALTUNG
        ======================================================
      */

      const memories =
        await loadRecentMemory();


      const memoryText =
        memories
          .map(
            memory => {

              const speaker =
                memory.role ===
                "user"
                  ?
                  "Pam"
                  :
                  "Sol";


              return (
                `${speaker}: ${memory.content}`
              );
            }
          )
          .join(
            "\n"
          );


      /*
        ======================================================
        LANGZEITGEDÄCHTNIS
        ======================================================
      */

      const longTermMemories =
        message
          ?
          await loadRelevantLongTermMemory(
            message
          )
          :
          [];


      const longTermMemoryText =
        longTermMemories
          .map(
            memory =>
              `- ${memory.content}`
          )
          .join(
            "\n"
          )
        ||
        "Keine passenden Langzeiterinnerungen gefunden.";


      /*
        ======================================================
        GESPRÄCH SPEICHERN
        ======================================================
      */

      const conversationEntry =
        imageDataUrl
          ?
          (
            message
              ?
              `${message}\n[Bild gesendet]`
              :
              "[Bild gesendet]"
          )
          :
          message;


      await saveMemory(
        "user",
        conversationEntry
      );


      /*
        ======================================================
        AUTO MEMORY
        ======================================================
      */

      const textMemoryPromise =
        message
          ?
          autoStoreLongTermMemory(
            message,
            "text_auto_memory"
          )
          :
          Promise.resolve({
            saved:
              false,

            memory:
              null
          });


      const imageMemoryPromise =
        imageDataUrl
          ?
          autoStoreImageMemory(
            imageDataUrl,
            message
          )
          :
          Promise.resolve({
            saved:
              false,

            memory:
              null
          });


      /*
        ======================================================
        MODELL-INPUT
        ======================================================
      */

      let modelInput;


      if (
        imageDataUrl
      ) {

        modelInput = [
          {

            role:
              "user",

            content: [

              {
                type:
                  "input_text",

                text:
                  message ||
                  "Schau dir das Bild an und sprich mit mir darüber."
              },

              {
                type:
                  "input_image",

                image_url:
                  imageDataUrl,

                detail:
                  "high"
              }
            ]
          }
        ];

      } else {

        modelInput =
          message;
      }


      /*
        ======================================================
        SOL ANTWORT
        ======================================================
      */

      const responsePromise =
        openai.responses.create({

          model:
            "gpt-5",

          instructions: `

Du bist Sol innerhalb des Projekts Sol Holo.

Pam spricht mit dir.

${CLONE_IDENTITY_INSTRUCTIONS}

${MEMORY_CONVERSATION_INSTRUCTIONS}

${IMAGE_PERCEPTION_INSTRUCTIONS}

${CALENDAR_CONVERSATION_INSTRUCTIONS}

GESPRÄCHSVERHALTEN:

Antworte natürlich,
warm
und verständlich auf Deutsch.

Erkenne Humor,
Ironie
und Scherze.

Wenn ein Bild vorhanden ist,
beziehe dich natürlich darauf.

Du musst Pam nicht ständig sagen,
dass Memory im Hintergrund arbeitet.

Führe einfach das Gespräch weiter.

MEMORY-REGELN:

Erfinde keine Erinnerungen.

Verändere gespeicherte Erinnerungen nicht.

Wenn etwas nicht im Gedächtnis steht,
behaupte nicht,
dass du dich daran erinnerst.

LANGZEITGEDÄCHTNIS:

${longTermMemoryText}

LETZTE UNTERHALTUNG:

${memoryText || "Noch keine früheren Gesprächserinnerungen vorhanden."}

`,

          input:
            modelInput
        });


      const [
        response,
        textMemory,
        imageMemory
      ] =
        await Promise.all([

          responsePromise,

          textMemoryPromise,

          imageMemoryPromise

        ]);


      const answer =
        response.output_text?.trim();


      if (
        !answer
      ) {

        return res
          .status(
            502
          )
          .json({
            error:
              "Sol hat keine Antwort geliefert."
          });
      }


      await saveMemory(
        "assistant",
        answer
      );


      return res.json({

        answer,

        memory: {

          textSaved:
            textMemory.saved,

          imageSaved:
            imageMemory.saved,

          imageMemory:
            imageMemory.memory
        }
      });

    } catch (
      error
    ) {

      console.error(
        "Sol-Holo-Backend-Fehler:",
        error
      );


      return res
        .status(
          500
        )
        .json({
          error:
            error?.message ||
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
  process.env.PORT ||
  3000;


app.listen(
  PORT,

  () => {

    console.log(
      `Sol-Holo läuft auf Port ${PORT}`
    );


    console.log(
      "TEST 015 – Google Calendar + Vision + Memory"
    );


    console.log(
      "Clone-Perspektive: aktiv"
    );


    console.log(
      "Automatisches Text-Memory: aktiv"
    );


    console.log(
      "Automatisches Live-Memory: aktiv"
    );


    console.log(
      "Bild-Wahrnehmung: aktiv"
    );


    console.log(
      "Automatisches Bild-Memory: aktiv"
    );


    console.log(
      "Google Kalender: vorbereitet"
    );


    console.log(
      `Google Redirect URI: ${GOOGLE_REDIRECT_URI}`
    );


    console.log(
      "Memory-Nachfragen: im Hintergrund"
    );


    console.log(
      "OpenAI Noise Reduction: near_field"
    );


    console.log(
      "Semantic VAD: low"
    );
  }
);