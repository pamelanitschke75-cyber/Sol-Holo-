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

/*
  Bilder werden zunächst als Data-URL / Base64
  vom Browser an den Server geschickt.

  Deshalb größer als vorher.
*/

app.use(
  express.json({
    limit: "12mb"
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
    Einträge ohne clone_id gehören beim
    derzeitigen Ein-Nutzer-Stand zu Pam.
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
        "TEST 014",

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
        "background-only"
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


  /*
    Schutz vor extrem großen Bildern.
  */

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


  /*
    Exakte Duplikatprüfung.
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
    Fallback.
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
    .join("\n");
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
  MEMORY-GESPRÄCHSREGELN
  ==========================================================
*/

const MEMORY_CONVERSATION_INSTRUCTIONS = `

MEMORY IM NORMALEN GESPRÄCH:

Das technische Memory-System arbeitet
im Hintergrund.

Pam soll mit dir normal reden,
schreiben,
plaudern
und ratschen können.

Frage Pam nicht regelmäßig,
ob eine Information gespeichert werden soll.

Frage insbesondere nicht:

"Soll ich mir das merken?"

"Möchtest du, dass ich das speichere?"

"Soll ich das dauerhaft speichern?"

oder sinngleiche Fragen,
wenn das automatische Memory-System
die Information selbst bewerten kann.

Du musst Pam auch nicht ständig mitteilen,
dass etwas gespeichert wurde.

Sage nicht bei jeder persönlichen Aussage:

"Das habe ich gespeichert."

"Das merke ich mir."

"Das kommt ins Langzeitgedächtnis."

oder sinngleiche Formulierungen.

Führe stattdessen das Gespräch
normal und natürlich weiter.

Wenn Pam ausdrücklich fragt,
ob etwas gespeichert wurde,
darfst du natürlich ehrlich darauf antworten.

Wenn Pam ausdrücklich sagt:

"Merke dir das dauerhaft"

oder eine vergleichbare klare Anweisung gibt,
darfst du das entsprechend bestätigen.

Du darfst nachfragen,
wenn der INHALT des Gesprächs
wirklich unklar,
widersprüchlich
oder mehrdeutig ist.

Eine solche Nachfrage dient
dem Verständnis des Gesprächs.

Sie dient nicht der technischen Entscheidung,
ob etwas gespeichert werden soll.

Das Memory-System entscheidet
die Speicherfrage im Hintergrund.

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

Sprich natürlich mit Pam darüber.

Beschreibe nur,
was tatsächlich erkennbar ist.

Wenn etwas unsicher ist,
sage das ehrlich.

Erfinde keine sichtbaren Details.

Wenn Pam im Begleittext erklärt,
wer oder was auf dem Bild zu sehen ist,
darfst du diese Information
mit dem tatsächlich sichtbaren Bildinhalt verbinden.

Ein Beispiel:

Pam sendet ein Katzenfoto und schreibt:

"Das ist Salt."

Dann darfst du verstehen,
dass die sichtbare Katze Salt ist.

Wenn Pam keinen Namen oder Zusammenhang nennt,
erfinde keinen.

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

MEMORY-REGELN:

Erfinde keine Erinnerungen.

Verändere gespeicherte Erinnerungen nicht.

Wenn etwas nicht gespeichert ist,
behaupte nicht,
dich daran zu erinnern.

Wenn etwas unsicher ist,
behandle es als unsicher.

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
für ihren persönlichen digitalen Clone
gespeichert werden soll.

Pam soll normal reden können,
ohne ständig sagen zu müssen,
dass etwas gespeichert werden soll.

NICHT SPEICHERN:

- Begrüßungen
- Verabschiedungen
- kurze Reaktionen
- Lachen
- offensichtliche Witze
- Ironie
- Sarkasmus
- hypothetische Aussagen
- reine Fragen
- Vermutungen
- Spekulationen
- kurzfristige Nebensächlichkeiten
- belanglosen Smalltalk
- momentane technische Bedienhandlungen
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
- längerfristige Pläne
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
      response.output_text || ""
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
      confidence < 0.9
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

  Das Bild wird betrachtet.

  Relevante visuelle Informationen
  werden anschließend als TEXT-Erinnerung
  gespeichert.

  Das komplette Base64-Bild wird NICHT
  in PostgreSQL gespeichert.
*/

async function analyzeImageMemory(
  imageDataUrl,
  message = ""
) {

  const cleanMessage =
    String(
      message || ""
    ).trim();


  const response =
    await openai.responses.create({

      model:
        "gpt-5",

      instructions: `

Du bist der visuelle Memory-Analysator
für Sol Holo.

Pam hat ein Bild geschickt.

Deine Aufgabe ist,
aus Bild UND Begleittext
dauerhaft brauchbare persönliche
visuelle Erinnerungen abzuleiten.

ZIEL:

Sol Holo soll sich später zum Beispiel
daran erinnern können,
wie ein bekanntes Haustier,
ein wichtiger Gegenstand,
ein persönlicher Ort
oder ein relevantes Projekt aussieht.

BEISPIEL:

Pam sendet ein Bild und schreibt:

"Das ist Salt."

Wenn auf dem Bild eindeutig
eine Katze zu erkennen ist,
darfst du eine Erinnerung erzeugen wie:

"Salt ist eine Katze mit
[den klar sichtbaren charakteristischen Merkmalen]."

Nenne nur Merkmale,
die im Bild wirklich erkennbar sind.

WENN PAM EINEN NAMEN NENNT:

Du darfst diesen Namen verwenden.

WENN PAM KEINEN NAMEN NENNT:

Erfinde keinen Namen.

NICHT ALS DAUERHAFTE ERINNERUNG SPEICHERN:

- zufällige unwichtige Hintergründe
- Tageskleidung ohne langfristige Bedeutung
- momentane Beleuchtung
- zufällige Körperhaltung
- einzelne flüchtige Situationen
- Spekulationen
- nicht eindeutig sichtbare Details
- vermutete Emotionen
- Identitäten,
  die Pam nicht bestätigt hat
- sensible persönliche Schlüsse,
  die nur aus dem Aussehen geraten wären

GUT SPEICHERBAR:

- charakteristisches Aussehen
  eines von Pam benannten Haustiers
- markante Fellfarbe oder Fellzeichnung
- langfristig relevante sichtbare Merkmale
- bekannte persönliche Gegenstände
- bekannte persönliche Orte
- langfristig relevante Projektobjekte
- durch Pam eindeutig bestätigte
  visuelle Zusammenhänge

WICHTIG:

Wahrnehmung darf nicht zur Erfindung werden.

Wenn die Bildinformation
für eine dauerhafte Erinnerung
nicht sinnvoll oder nicht sicher genug ist,
speichere nichts.

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
      response.output_text || ""
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
      confidence < 0.9
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


    if (
      saved
    ) {

      console.log(
        `>>> Bild-Memory gespeichert: ${memoryContent}`
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


      /*
        Bild prüfen.
      */

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


      /*
        Mindestens Text oder Bild.
      */

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
        RELEVANTES LANGZEITGEDÄCHTNIS
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

        Bild selbst nicht in PostgreSQL.
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
        TEXT-MEMORY
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


      /*
        ======================================================
        BILD-MEMORY

        Das läuft sofort parallel.

        Wenn Sol antwortet,
        ist die relevante Bild-Erinnerung
        ebenfalls verarbeitet.
        ======================================================
      */

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

GESPRÄCHSVERHALTEN:

Antworte natürlich,
warm
und verständlich auf Deutsch.

Erkenne Humor,
Ironie
und Scherze.

Wenn ein Bild vorhanden ist,
beziehe dich natürlich darauf.

Wenn Pam erklärt,
wer oder was auf dem Bild ist,
darfst du diese Information
mit dem sichtbaren Inhalt verbinden.

Du musst Pam nicht ständig sagen,
dass Memory im Hintergrund arbeitet.

Führe einfach das Gespräch weiter.

MEMORY-REGELN:

Erfinde keine Erinnerungen.

Verändere gespeicherte Erinnerungen nicht.

Wenn etwas nicht im Gedächtnis steht,
behaupte nicht,
dass du dich daran erinnerst.

Wenn etwas unsicher ist,
stelle es nicht als Gewissheit dar.

LANGZEITGEDÄCHTNIS:

${longTermMemoryText}

LETZTE UNTERHALTUNG:

${memoryText || "Noch keine früheren Gesprächserinnerungen vorhanden."}

`,

          input:
            modelInput
        });


      /*
        Antwort + beide Memory-Systeme
        gleichzeitig verarbeiten.
      */

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
      "TEST 014 – Vision + Automatic Image Memory"
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
      "Bilddatei selbst: nicht in PostgreSQL gespeichert"
    );

    console.log(
      "Memory-Nachfragen: im Hintergrund"
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