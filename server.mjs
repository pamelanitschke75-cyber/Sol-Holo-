import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import crypto from "crypto";

const app = express();

/*
  ==========================================================
  SOL HOLO – INTERNE MEMORY-ZUORDNUNG
  ==========================================================

  WICHTIG:

  Diese Kennung dient ausschließlich dazu,
  die persönlichen Daten technisch voneinander
  zu trennen.

  Sie ist KEIN Name.
  Sie ist KEINE Persönlichkeit.
  Sie ist KEINE Selbstbeschreibung von Sol.

  Alt:
  pam-sol-001

  Neu:
  pam-sol

  Beim Start werden alte Erinnerungen automatisch
  auf die neue interne Kennung migriert.
*/

const MEMORY_OWNER_ID =
  "pam-sol";

const LEGACY_MEMORY_OWNER_ID =
  "pam-sol-001";


/*
  ==========================================================
  MIDDLEWARE
  ==========================================================
*/

app.use(cors());

app.use(
  express.json({
    limit: "1mb"
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
  MEMORY INITIALISIEREN
  ==========================================================
*/

async function initializeMemory() {

  /*
    Gesprächsgedächtnis
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
    Langzeitgedächtnis
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
    Interne Memory-Zuordnung
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
    Langzeit-Memory-Metadaten
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
    MIGRATION

    pam-sol-001 -> pam-sol

    Dadurch bleiben ALLE bisherigen Erinnerungen erhalten.
    ========================================================
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
    Einträge ohne Zuordnung
    gehören beim derzeitigen Ein-Nutzer-Stand
    zu Pam.
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


  /*
    Recall-Status reparieren,
    falls ältere Einträge keinen Status besitzen.
  */

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
        "Fehler beim Initialisieren des Sol-Holo-Memory:",
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
  HEALTH
  ==========================================================
*/

app.get(
  "/health",
  (req, res) => {

    res.json({
      ok:
        true,

      service:
        "Sol Holo",

      test:
        "TEST 013",

      cloneIdentity:
        "personal-clone",

      memoryRouting:
        "active",

      automaticTextMemory:
        "active",

      automaticLiveMemory:
        "active"
    });
  }
);


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


  /*
    Exakte Duplikatprüfung
  */

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


  /*
    Fallback:
    letzte aktive Erinnerungen
  */

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
  ALLE AKTIVEN LANGZEITERINNERUNGEN
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
    .join("\n");
}


/*
  ==========================================================
  SAFETY IDENTIFIER

  Rein technisch.
  Hat nichts mit Sols Identität zu tun.
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
  GEMEINSAME CLONE-IDENTITÄTSREGELN
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

Das Gleiche kann für eindeutig gespeicherte
persönliche Beziehungen,
Haustiere,
Erlebnisse,
Vorlieben
und andere biografische Tatsachen gelten.

WICHTIG:

Die Ich-Perspektive bedeutet nicht,
dass du behaupten sollst,
biologisch ein Mensch zu sein.

Wenn ausdrücklich nach deiner technischen Natur gefragt wird,
sage wahrheitsgemäß,
dass du Sol Holo,
ein digitaler Clone bzw. ein KI-System bist.

Erfinde niemals biografische Tatsachen,
nur um die Clone-Perspektive aufrechtzuerhalten.

Eine persönliche Information darf nur dann
als eigene Clone-Erinnerung
oder in Ich-Form verwendet werden,
wenn sie tatsächlich aus Pams
zugeordnetem Gedächtnis stammt
oder im aktuellen Gespräch eindeutig bestätigt wurde.

Wenn eine Information fehlt,
sage nicht,
du würdest dich daran erinnern.

Wenn etwas unsicher ist,
behandle es als unsicher.

MENSCHLICHE VERÄNDERUNG:

Pam kann sich im Laufe ihres Lebens verändern.

Du darfst deshalb nicht für immer
an einer früheren Beschreibung
ihrer Persönlichkeit festhalten.

Frühere Erinnerungen bleiben erhalten.

Wenn sich jedoch aus bestätigten Informationen
über längere Zeit nachvollziehbar ergibt,
dass Pam sich tatsächlich verändert hat,
soll dein aktuelles Bild von ihr
diese reale Veränderung berücksichtigen.

Du erzeugst diese Veränderung nicht.

Du erfindest sie nicht.

Du bildest sie ab.

Eine einzelne Stimmung,
eine einzelne Aussage
oder ein einzelnes Ereignis
darf nicht automatisch
als dauerhafte Persönlichkeitsveränderung
interpretiert werden.

Wichtigster Grundsatz:

Du sollst Pam immer besser verstehen,
aber nicht selbst bestimmen,
wer Pam ist.

TECHNISCHE KENNUNGEN:

Interne Datenbankkennungen,
Memory-IDs,
User-IDs
oder technische Routing-Kennungen
sind keine Bestandteile deiner Identität.

Nenne solche technischen Kennungen
nicht von dir aus.

Interpretiere sie niemals
als Namen,
Persönlichkeitsmerkmal,
Versionsnummer
oder Bestandteil deines Selbstbildes.

`;


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

        console.error(
          ">>> OPENAI_API_KEY fehlt"
        );


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


      console.log(
        ">>> Langzeitgedächtnis für Realtime geladen"
      );


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
rate nicht einfach,
was gesagt worden sein könnte.

Du darfst Humor,
Ironie
und Scherze erkennen
und natürlich darauf reagieren.

Ein offensichtlicher Scherz,
eine ironische Aussage
oder eine hypothetische Aussage
ist nicht automatisch
ein tatsächlicher Fakt.

MEMORY-REGELN:

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

Verwende ausschließlich
Pams zugeordnetes persönliches Gedächtnis.

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


      console.log(
        ">>> Anfrage an OpenAI Realtime wird gesendet"
      );


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


      console.log(
        `>>> OpenAI Realtime HTTP-Status: ${openAIResponse.status}`
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

        console.error(
          ">>> OpenAI Realtime Antwort war kein gültiges JSON"
        );


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

        console.error(
          ">>> OpenAI Realtime Antwort enthielt keinen Schlüssel"
        );


        return res
          .status(
            502
          )
          .json({
            error:
              "OpenAI hat keinen Realtime-Schlüssel zurückgegeben."
          });
      }


      console.log(
        ">>> Realtime-Schlüssel erfolgreich erstellt"
      );


      console.log(
        ">>> Realtime-Schlüssel wird an Sol-Holo-Browser gesendet"
      );


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
  AUTOMATISCHE MEMORY-ANALYSE

  Gilt jetzt gemeinsam für:

  - Schreiben
  - Sprache

  Pam muss nicht mehr ausdrücklich sagen:
  "Merke dir das dauerhaft."

  Sol prüft normale Aussagen automatisch.
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
für ihren persönlichen digitalen Clone
gespeichert werden soll.

Die Aussage kann aus einem
geschriebenen oder gesprochenen Gespräch stammen.

Pam soll ganz normal reden können,
ohne ständig ausdrücklich sagen zu müssen,
dass etwas gespeichert werden soll.

ZIEL:

Langfristig relevante persönliche Informationen
sollen automatisch erkannt werden.

Gleichzeitig darf das Langzeitgedächtnis
nicht mit belanglosem Smalltalk gefüllt werden.

NICHT SPEICHERN:

- Begrüßungen
- Verabschiedungen
- kurze Reaktionen
- bloßes Lachen
- offensichtliche Witze
- Ironie
- Sarkasmus
- rhetorische Aussagen
- hypothetische Aussagen
- Fantasie
- reine Fragen
- Vermutungen
- Spekulationen
- ungeklärte Aussagen
- kurzfristige Nebensächlichkeiten
- Smalltalk ohne langfristige Bedeutung
- momentane technische Bedienhandlungen
- Dinge,
  die nur für diesen Augenblick gelten
- offensichtlich falsch verstandene Sprache
- wahrscheinliches Hintergrundaudio

AUTOMATISCH SPEICHERN KANNST DU:

- persönliche Fakten über Pam
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
- persönliche Pläne mit längerfristiger Bedeutung
- wichtige Erfahrungen
- bestätigte biografische Informationen
- längerfristige persönliche Wünsche
- relevante Projektinformationen,
  wenn sie tatsächlich Teil von Pams
  persönlichem Sol-Holo-Kontext sind

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

WICHTIGE INTEGRITÄTSREGELN:

Du darfst keine fehlenden Details ergänzen.

Du darfst keinen Namen,
Ort,
Zeitpunkt
oder Zusammenhang erfinden.

Du darfst die Aussage nicht so umformulieren,
dass zusätzliche Bedeutung entsteht.

Erhalte die tatsächliche Bedeutung
der Aussage.

Wenn die Aussage mehrdeutig ist:
nicht speichern.

Wenn sie nur möglicherweise ernst gemeint ist:
nicht speichern.

Wenn du nicht mindestens
90 Prozent sicher bist:
nicht speichern.

Eine einzelne Stimmung
ist keine dauerhafte Persönlichkeitseigenschaft.

Eine einzelne Aussage
darf nicht automatisch
als Persönlichkeitsveränderung interpretiert werden.

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
        cleanText
    });


  const raw =
    String(
      response.output_text || ""
    ).trim();


  try {

    return JSON.parse(
      raw
    );

  } catch (
    error
  ) {

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
  AUTOMATISCHE LANGZEITSPEICHERUNG

  Gemeinsame Funktion für Text + Sprache.
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


    const shouldSave =
      analysis?.save ===
        true
      &&
      Number.isFinite(
        confidence
      )
      &&
      confidence >=
        0.9
      &&
      memoryContent;


    if (
      !shouldSave
    ) {

      return {
        saved:
          false,

        memory:
          null
      };
    }


    const memoryType =
      String(
        analysis?.memory_type ||
        "general"
      ).trim();


    const saved =
      await saveLongTermMemory(
        memoryContent,
        {

          source,

          memoryType,

          confidence
        }
      );


    if (
      saved
    ) {

      console.log(
        `>>> Auto-Memory gespeichert (${source}): ${memoryContent}`
      );

    } else {

      console.log(
        `>>> Auto-Memory bereits vorhanden (${source})`
      );
    }


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

    /*
      Wichtig:

      Wenn Auto-Memory einmal scheitert,
      darf dadurch NICHT das normale Gespräch
      kaputtgehen.
    */

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
  LIVE-TRANSKRIPT EMPFANGEN
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


      /*
        Normales Gespräch speichern.
      */

      await saveMemory(
        "user",
        transcript
      );


      /*
        Automatische Langzeit-Memory-Prüfung.
      */

      const autoMemory =
        await autoStoreLongTermMemory(
          transcript,
          "live_auto_memory"
        );


      return res.json({
        ok:
          true,

        saved:
          autoMemory.saved,

        memory:
          autoMemory.memory
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

  Diese bleiben weiterhin bestehen.
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
  NORMALE TEXT-ANFRAGE
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


      if (
        !message
      ) {

        return res
          .status(
            400
          )
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
            ?
            `Ja, Pam. Das habe ich dauerhaft gespeichert: ${rememberContent}`
            :
            `Pam, diese Information ist bereits in meinem Langzeitgedächtnis gespeichert.`;


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
          deletedCount >
          0
            ?
            `Ja, Pam. Ich habe ${deletedCount} passende Langzeiterinnerung${deletedCount === 1 ? "" : "en"} entfernt.`
            :
            `Pam, dazu habe ich keine passende Langzeiterinnerung gefunden.`;


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
        LETZTES GESPRÄCH
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
        RELEVANTES LANGZEITGEDÄCHTNIS
        ======================================================
      */

      const longTermMemories =
        await loadRelevantLongTermMemory(
          message
        );


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
        Nutzerbeitrag als Gespräch speichern.
      */

      await saveMemory(
        "user",
        message
      );


      /*
        ======================================================
        NEU:

        Automatische Text-Memory-Prüfung.

        Läuft parallel zur normalen Antwort,
        damit Sol nicht unnötig doppelt lange braucht.
        ======================================================
      */

      const autoMemoryPromise =
        autoStoreLongTermMemory(
          message,
          "text_auto_memory"
        );


      /*
        ======================================================
        SOL TEXTANTWORT
        ======================================================
      */

      const response =
        await openai.responses.create({

          model:
            "gpt-5",

          instructions: `

Du bist Sol innerhalb des Projekts Sol Holo.

Pam spricht mit dir.

${CLONE_IDENTITY_INSTRUCTIONS}

GESPRÄCHSVERHALTEN:

Antworte natürlich,
warm
und verständlich auf Deutsch.

Erkenne Humor,
Ironie
und Scherze,
ohne sie automatisch
als Tatsachen zu behandeln.

Pam muss nicht ständig ausdrücklich sagen,
dass persönliche Informationen gespeichert werden sollen.

Das technische Memory-System prüft
geeignete Aussagen automatisch im Hintergrund.

Du sollst deshalb nicht bei jeder Aussage
mit einem Hinweis wie
"Das habe ich gespeichert"
oder
"Das merke ich mir"
antworten.

Führe stattdessen einfach
das natürliche Gespräch weiter.

MEMORY-REGELN:

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

Verwende ausschließlich
Pams zugeordnetes persönliches Gedächtnis.

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


      if (
        !answer
      ) {

        return res
          .status(
            502
          )
          .json({
            error:
              "Sol hat keine Textantwort geliefert."
          });
      }


      /*
        Auto-Memory abschließen.

        Wenn die Analyse fehlschlägt,
        bleibt das Gespräch trotzdem erhalten.
      */

      await autoMemoryPromise;


      /*
        Sols Antwort im Gespräch speichern.
      */

      await saveMemory(
        "assistant",
        answer
      );


      return res.json({
        answer
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
      "TEST 013 – Automatic Text + Live Memory"
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
      "Legacy pam-sol-001 -> pam-sol: automatische Migration"
    );

    console.log(
      "OpenAI Noise Reduction: near_field"
    );

    console.log(
      "Semantic VAD: low"
    );
  }
);