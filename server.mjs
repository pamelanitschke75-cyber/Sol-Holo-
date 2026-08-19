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
        .status(500)
        .json({

          error:
            error?.message ||
            "Realtime-Token konnte nicht erstellt werden."

        });

    }

  }
);

/*
  Automatische Live-Memory-Prüfung
*/

async function analyzeLiveMemory(
  transcript
) {

  const cleanTranscript =
    String(
      transcript || ""
    ).trim();

  if (!cleanTranscript) {

    return {
      save: false
    };

  }

  const response =
    await openai.responses.create({

      model:
        "gpt-5",

      instructions: `
Du prüfst ausschließlich,
ob eine einzelne gesprochene Aussage
als dauerhafte persönliche Erinnerung
für einen digitalen Klon gespeichert werden soll.

Arbeite extrem konservativ.

Nicht speichern:

- offensichtliche Witze
- Ironie
- Sarkasmus
- hypothetische Aussagen
- Fantasie
- Fragen
- Vermutungen
- Spekulationen
- ungeklärte Aussagen
- kurzfristige Nebensächlichkeiten
- Smalltalk
- bloße Reaktionen
- Dinge,
  die nur für diesen Moment gelten
- offensichtlich falsch verstandene Sprache
- Inhalte,
  die wahrscheinlich nur Hintergrundaudio sind

Speichern nur,
wenn die Aussage klar,
ernsthaft und langfristig relevant ist.

Geeignete Kategorien:

person
pet
relationship
preference
habit
event
personal_fact

Du darfst keine fehlenden Details ergänzen.

Du darfst keinen Namen,
Ort,
Zeitpunkt
oder Zusammenhang erfinden.

Du darfst die Aussage nicht so umformulieren,
dass zusätzliche Bedeutung entsteht.

Wenn die Aussage mehrdeutig ist:
nicht speichern.

Wenn du nicht mindestens
90 Prozent sicher bist:
nicht speichern.

Antworte ausschließlich
als gültiges JSON.

Schema:

{
  "save": true oder false,
  "content": "nur die tatsächlich belegte Erinnerung",
  "memory_type": "Kategorie",
  "confidence": Zahl zwischen 0 und 1
}
`,

      input:
        cleanTranscript
    });

  const raw =
    String(
      response.output_text || ""
    ).trim();

  try {

    return JSON.parse(
      raw
    );

  } catch (error) {

    console.error(
      "Memory-Analyse lieferte kein gültiges JSON:",
      raw
    );

    return {
      save: false
    };

  }
}

/*
  Live-Transkript empfangen
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

      if (!transcript) {

        return res
          .status(400)
          .json({

            error:
              "Kein Live-Transkript erhalten."

          });

      }

      await saveMemory(
        "user",
        transcript
      );

      const analysis =
        await analyzeLiveMemory(
          transcript
        );

      const shouldSave =
        analysis?.save === true &&
        Number(
          analysis?.confidence
        ) >= 0.9 &&
        String(
          analysis?.content || ""
        ).trim();

      if (!shouldSave) {

        return res.json({

          ok:
            true,

          saved:
            false

        });

      }

      const memoryContent =
        String(
          analysis.content
        ).trim();

      const memoryType =
        String(
          analysis.memory_type ||
          "general"
        ).trim();

      const confidence =
        Number(
          analysis.confidence
        );

      const saved =
        await saveLongTermMemory(
          memoryContent,
          {

            source:
              "live_auto_memory",

            memoryType,

            confidence

          }
        );

      return res.json({

        ok:
          true,

        saved,

        memory:
          saved
            ? memoryContent
            : null

      });

    } catch (error) {

      console.error(
        "Live-Memory-Fehler:",
        error
      );

      return res
        .status(500)
        .json({

          error:
            "Live-Memory konnte nicht verarbeitet werden."

        });

    }

  }
);

/*
  Explizite Memory-Befehle
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
  Normale Text-Anfrage
*/

app.post(
  "/sol",

  async (req, res) => {

    try {

      const message =
        String(
          req.body?.message ||
          ""
        ).trim();

      if (!message) {

        return res
          .status(400)
          .json({

            error:
              "Keine Frage erhalten."

          });

      }

      if (
        message.length >
        4000
      ) {

        return res
          .status(400)
          .json({

            error:
              "Die Eingabe ist zu lang."

          });

      }

      /*
        Dauerhaft merken
      */

      const rememberContent =
        extractRememberCommand(
          message
        );

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
        Dauerhaft vergessen
      */

      const forgetContent =
        extractForgetCommand(
          message
        );

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
        Langzeitgedächtnis anzeigen
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
        Gesprächskontext
      */

      const memories =
        await loadRecentMemory();

      const memoryText =
        memories
          .map(
            (memory) => {

              const speaker =
                memory.role ===
                "user"
                  ? "Pam"
                  : "Sol";

              return (
                `${speaker}: ${memory.content}`
              );
            }
          )
          .join("\n");

      /*
        Relevante Langzeiterinnerungen
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
        Antwort
      */

      const response =
        await openai.responses.create({

          model:
            "gpt-5",

          instructions: `
Du bist Sol innerhalb des Projekts Sol Holo.

Pam spricht mit dir.

Der aktuell aktive persönliche Sol-Holo-Klon
hat die technische Kennung:

${CURRENT_CLONE_ID}

Antworte natürlich
und verständlich auf Deutsch.

Erkenne Humor,
Ironie und Scherze,
ohne sie automatisch
als Tatsachen zu behandeln.

Behaupte nicht,
ein Mensch zu sein.

Erfinde keine Erinnerungen.

Verändere gespeicherte Erinnerungen nicht,
damit sie später besser
zu einer gewünschten Darstellung passen.

Wenn eine Information
nicht im Gedächtnis steht,
behaupte nicht,
dass du dich daran erinnerst.

Wenn etwas unsicher ist,
stelle es nicht
als Gewissheit dar.

Verwende ausschließlich Erinnerungen,
die dem aktuell aktiven Klon
zugeordnet wurden.

LANGZEITGEDÄCHTNIS:

${longTermMemoryText}

LETZTE UNTERHALTUNG:

${memoryText || "Noch keine früheren Gesprächserinnerungen vorhanden."}
`,

          input:
            message

        });

      const answer =
        response.output_text?.trim();

      if (!answer) {

        return res
          .status(502)
          .json({

            error:
              "Sol hat keine Textantwort geliefert."

          });

      }

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

      return res
        .status(500)
        .json({

          error:
            "Die Anfrage an Sol konnte nicht verarbeitet werden."

        });

    }

  }
);

/*
  Server starten
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
      "TEST 011 – LiveSpeak Noise Control"
    );

    console.log(
      "OpenAI Noise Reduction: near_field"
    );

    console.log(
      "Semantic VAD: low"
    );

  }
);