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
  Persönlicher Clone
*/

const CURRENT_CLONE_ID = "pam-sol-001";

/*
  Persönliche Stimme

  Solange noch keine eigene Voice-ID vorhanden ist,
  bleibt marin als Fallback aktiv.
*/

const SOL_HOLO_VOICE =
  String(
    process.env.SOL_HOLO_VOICE_ID ||
    "marin"
  ).trim();

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

  console.log(
    process.env.SOL_HOLO_VOICE_ID
      ? "Persönliche Sol-Holo-Stimme aktiv."
      : "Noch keine persönliche Voice-ID – marin bleibt aktiv."
  );

  console.log(
    OPENAI_VOICE_API_KEY
      ? "Separater Voice-API-Key ist bereit."
      : "OPENAI_VOICE_API_KEY fehlt noch."
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
  Audio-MIME-Typ bestimmen
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
        "✅ Consent erstellt.\\n\\nConsent-ID:\\n" +
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
        "✅ Eigene Stimme erstellt!\\n\\nVOICE-ID:\\n" +
        data.id +
        "\\n\\nDiese ID kommt anschließend als SOL_HOLO_VOICE_ID nach Render.";

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

  WICHTIG:
  Hier wird ausschließlich OPENAI_VOICE_API_KEY verwendet.
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
      if (
        !OPENAI_VOICE_API_KEY
      ) {
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
          data
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

  Auch hier wird ausschließlich
  OPENAI_VOICE_API_KEY verwendet.
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
      if (
        !OPENAI_VOICE_API_KEY
      ) {
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

async function loadFulltimeMemory(
  limit = 50
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

/*
  Für Realtime gibt es beim Erstellen der Session
  noch keine aktuelle Textnachricht.

  Deshalb werden hier die zuletzt vorhandenen
  Langzeiterinnerungen geladen.
*/

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

  Realtime verwendet weiterhin OPENAI_API_KEY.

  NEU:
  Beim Erstellen der Realtime-Session wird jetzt
  derselbe vorhandene Sol-Holo-Gedächtniskontext
  mitgegeben:

  - Gesprächsgedächtnis
  - Langzeitgedächtnis
  - Vollzeitgedächtnis

  Damit kennt die Sprach-Sol beim Start denselben
  vorhandenen Kontext wie die Text-Sol.

  Das automatische SPEICHERN neuer Realtime-Gespräche
  kommt im nächsten Entwicklungsschritt über index.html.
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

    /*
      Gesprächsgedächtnis laden
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
      Langzeitgedächtnis laden

      Da beim Erstellen der Realtime-Session noch
      keine aktuelle Frage vorliegt, laden wir hier
      die letzten Langzeiterinnerungen.
    */

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

    /*
      Vollzeitgedächtnis laden
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

          return `${speaker}: ${memory.content}`;
        })
        .join("\n");

    /*
      Gemeinsame Realtime-Anweisungen
    */

    const realtimeInstructions = `
Du bist Sol innerhalb des Projekts Sol Holo.

Du bist die KI- und Kommunikationsebene innerhalb
von Sol Holo.

Du sprichst gerade über die Realtime-Mikrofonfunktion.

Antworte natürlich, freundlich und verständlich
auf Deutsch, sofern Pam nicht ausdrücklich eine
andere Sprache verwendet.

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

Wenn eine Information nicht im bereitgestellten
Gedächtnis steht, behaupte nicht, dass du dich daran
erinnerst.

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

LANGZEITGEDÄCHTNIS:

${longTermMemoryText}

VOLLZEITGEDÄCHTNIS – LETZTE EINTRÄGE:

${fulltimeMemoryText || "Noch keine Einträge vorhanden."}

LETZTE UNTERHALTUNG:

${memoryText || "Noch keine früheren Gesprächserinnerungen vorhanden."}
`;

    const sessionConfig = {
      session: {
        type: "realtime",
        model: "gpt-realtime-2.1",

        instructions:
          realtimeInstructions,

        audio: {
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

    await saveFulltimeMemory(
      "user",
      originalMessage
    );

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

          return `${speaker}: ${memory.content}`;
        })
        .join("\n");

    await saveMemory(
      "user",
      message
    );

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