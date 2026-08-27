from pathlib import Path
import re

SERVER = Path("server.mjs")
HTML_FILES = [Path("index.html"), Path("www/index.html")]

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

def replace_nth(text, old, new, n, label):
    starts = []
    pos = 0
    while True:
        idx = text.find(old, pos)
        if idx < 0:
            break
        starts.append(idx)
        pos = idx + len(old)
    if len(starts) < n:
        raise RuntimeError(f"{label}: expected at least {n} matches, found {len(starts)}")
    idx = starts[n - 1]
    return text[:idx] + new + text[idx + len(old):]

def replace_between(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f"{label}: start marker not found")
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f"{label}: end marker not found")
    return text[:start] + replacement + text[end:]

def regex_sub_once(text, pattern, repl, label, flags=re.S):
    out, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 regex match, found {count}")
    return out

server = SERVER.read_text(encoding="utf-8")

server = replace_once(
    server,
    'import { createHash } from "crypto";',
    'import { createHash, randomUUID } from "crypto";',
    "crypto import"
)

clone_marker = 'const CURRENT_CLONE_ID = "pam-sol-001";'
clone_insert = r'''const CURRENT_CLONE_ID = "pam-sol-001";

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
}'''
server = replace_once(server, clone_marker, clone_insert, "clone/token block")

fulltime_table_marker = r'''  await db.query(`
    CREATE TABLE IF NOT EXISTS sol_fulltime_memory (
      id BIGSERIAL PRIMARY KEY,
      clone_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);'''
fulltime_table_insert = fulltime_table_marker + r'''

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
  `);'''
server = replace_once(server, fulltime_table_marker, fulltime_table_insert, "memory indexes")

memory_start = "async function loadFulltimeMemory("
memory_end = """/*
  ==========================================================
  REALTIME → VOLLZEITGEDÄCHTNIS
  ==========================================================
*/"""
new_memory_block = r'''/*
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

async function searchPersonalMemory(
  message,
  limit = 36
) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 36));

  const [fulltime, longterm, legacy] = await Promise.all([
    loadRelevantFulltimeMemory(message, safeLimit),
    loadRelevantLongTermMemoryStrict(message, Math.min(safeLimit, 30)),
    loadRelevantLegacyMemory(message, Math.min(safeLimit, 30))
  ]);

  const combined = [...fulltime, ...longterm, ...legacy];

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

  const seen = new Set();
  const unique = [];

  for (const row of combined) {
    const key = String(row.content || "").trim().toLocaleLowerCase("de-DE");
    if (!key || seen.has(key)) {
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

'''
server = replace_between(server, memory_start, memory_end, new_memory_block, "replace fulltime retrieval")

count_loads = server.count("await loadFulltimeMemory(")
if count_loads != 2:
    raise RuntimeError(f"loadFulltimeMemory calls: expected 2, found {count_loads}")
server = server.replace("await loadFulltimeMemory(", "await loadRecentFulltimeMemory(")

recent_block = r'''    const fulltimeMemories =
      await loadRecentFulltimeMemory(
        50
      );'''
historical_block = r'''    const historicalMemories =
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
      );'''
server = replace_nth(server, recent_block, historical_block, 2, "text whole-history search")

realtime_start = server.find("const realtimeInstructions = `")
realtime_end = server.find("const sessionConfig = {", realtime_start)
if realtime_start < 0 or realtime_end < 0:
    raise RuntimeError("Realtime instruction section not found")
realtime_section = server[realtime_start:realtime_end]
old_realtime_memory_rule = r'''Wenn eine Information nicht im bereitgestellten
Gedächtnis steht, behaupte nicht, dass du dich daran
erinnerst.'''
new_realtime_memory_rule = r'''Wenn Pam nach einer persönlichen früheren Information,
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

Erfinde niemals eine Erinnerung.'''
realtime_section = replace_once(realtime_section, old_realtime_memory_rule, new_realtime_memory_rule, "realtime memory tool rule")
server = server[:realtime_start] + realtime_section + server[realtime_end:]

session_marker = r'''        instructions:
          realtimeInstructions,

        audio: {'''
session_insert = r'''        instructions:
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

        audio: {'''
server = replace_once(server, session_marker, session_insert, "realtime memory tool config")

server = replace_nth(
    server,
    "VOLLZEITGEDÄCHTNIS – LETZTE EINTRÄGE:",
    "AKTUELLER VOLLZEIT-KONTEXT (nur für Gesprächsfluss, keine Speichergrenze):",
    1,
    "realtime recent context label"
)

text_prompt_old = r'''LANGZEITGEDÄCHTNIS:

${longTermMemoryText}

VOLLZEITGEDÄCHTNIS – LETZTE EINTRÄGE:

${fulltimeMemoryText || "Noch keine Einträge vorhanden."}'''
text_prompt_new = r'''LANGZEITGEDÄCHTNIS:

${longTermMemoryText}

PASSENDE ERINNERUNGEN AUS DER GESAMTEN
GESPEICHERTEN HISTORIE:

${historicalMemoryText}

AKTUELLER VOLLZEIT-KONTEXT
(nur für Gesprächsfluss, keine Speichergrenze):

${fulltimeMemoryText || "Noch keine Einträge vorhanden."}'''
server = replace_once(server, text_prompt_old, text_prompt_new, "text prompt whole-history memory")

return_marker = r'''    console.log(
      ">>> Realtime-Input-Transkription aktiv"
    );

    return res.json(data);'''
return_insert = r'''    console.log(
      ">>> Realtime-Input-Transkription aktiv"
    );

    const memorySearchToken =
      createRealtimeMemoryToken();

    return res.json({
      ...data,

      sol_memory_token:
        memorySearchToken
    });'''
server = replace_once(server, return_marker, return_insert, "realtime memory token response")

SERVER.write_text(server, encoding="utf-8")

def patch_html(path: Path):
    text = path.read_text(encoding="utf-8")

    text = regex_sub_once(
        text,
        r'''let microphoneStream =\s*\n\s*null;''',
        '''let microphoneStream =\n  null;\n\nlet realtimeMemoryToken =\n  "";\n\nconst handledRealtimeMemoryToolCalls =\n  new Set();\n\nlet lastAssistantMemoryTranscript =\n  "";\n\nlet lastAssistantMemoryTranscriptAt =\n  0;''',
        f"{path}: realtime state"
    )

    text = regex_sub_once(
        text,
        r'''async function sendLiveTranscriptToMemory\(\s*\n\s*transcript\s*\n\)\{''',
        '''async function sendLiveTranscriptToMemory(\n  transcript,\n  role = "user"\n){''',
        f"{path}: live memory signature"
    )

    text = regex_sub_once(
        text,
        r'''transcript:\s*\n\s*cleanTranscript\s*\n\s*\}\)''',
        '''transcript:\n                cleanTranscript,\n\n              role:\n                role\n            })''',
        f"{path}: live memory role payload"
    )

    text = regex_sub_once(
        text,
        r'''function stopLiveConversation\(\)\{\s*''',
        '''function stopLiveConversation(){\n\n  realtimeMemoryToken =\n    "";\n\n  handledRealtimeMemoryToolCalls.clear();\n\n  lastAssistantMemoryTranscript =\n    "";\n\n  lastAssistantMemoryTranscriptAt =\n    0;\n\n''',
        f"{path}: stop session reset"
    )

    start_marker = "async function startLiveConversation(){"
    if text.count(start_marker) != 1:
        raise RuntimeError(f"{path}: startLiveConversation marker count={text.count(start_marker)}")

    helpers = r'''async function searchRealtimePersonalMemory(
  query
){

  const cleanQuery =
    String(
      query || ""
    ).trim();

  if(!cleanQuery){
    return "Keine Suchfrage erhalten.";
  }

  if(!realtimeMemoryToken){
    return "Die Gedächtnissuche ist in dieser Realtime-Sitzung nicht autorisiert.";
  }

  const response =
    await fetch(
      `${BACKEND_URL}/memory/search`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${realtimeMemoryToken}`
        },
        body:JSON.stringify({
          query:cleanQuery
        })
      }
    );

  const responseText =
    await response.text();

  let data = null;

  try{
    data = JSON.parse(responseText);
  }catch{
    throw new Error("Die Gedächtnissuche hat keine gültige Antwort geliefert.");
  }

  if(!response.ok){
    throw new Error(
      data?.error ||
      "Das persönliche Gedächtnis konnte nicht durchsucht werden."
    );
  }

  return String(
    data?.memory_text ||
    "Keine passende gespeicherte Erinnerung gefunden."
  );
}

function getRealtimeMemoryToolCall(
  realtimeEvent
){

  if(
    realtimeEvent?.type === "response.function_call_arguments.done" &&
    realtimeEvent?.name === "search_personal_memory"
  ){
    return {
      callId:String(realtimeEvent.call_id || ""),
      argumentsText:String(realtimeEvent.arguments || "{}")
    };
  }

  if(
    realtimeEvent?.type === "response.output_item.done" &&
    realtimeEvent?.item?.type === "function_call" &&
    realtimeEvent?.item?.name === "search_personal_memory"
  ){
    return {
      callId:String(realtimeEvent.item.call_id || ""),
      argumentsText:String(realtimeEvent.item.arguments || "{}")
    };
  }

  return null;
}

async function handleRealtimeMemoryToolCall(
  toolCall
){

  const callId = String(toolCall?.callId || "").trim();
  if(!callId || handledRealtimeMemoryToolCalls.has(callId)){
    return;
  }

  handledRealtimeMemoryToolCalls.add(callId);

  let query = "";
  try{
    const parsed = JSON.parse(toolCall.argumentsText || "{}");
    query = String(parsed?.query || "").trim();
  }catch(error){
    console.error("Realtime Memory Tool Argument Fehler:", error);
  }

  let output;
  try{
    output = await searchRealtimePersonalMemory(query);
  }catch(error){
    console.error("Realtime Memory Tool Fehler:", error);
    output = "Die persönliche Gedächtnissuche ist gerade technisch fehlgeschlagen. Erfinde keine Erinnerung.";
  }

  if(!dc || dc.readyState !== "open"){
    return;
  }

  dc.send(
    JSON.stringify({
      type:"conversation.item.create",
      item:{
        type:"function_call_output",
        call_id:callId,
        output:output
      }
    })
  );

  dc.send(
    JSON.stringify({
      type:"response.create"
    })
  );
}

function saveRealtimeAssistantTranscript(
  realtimeEvent
){

  const transcript = String(realtimeEvent?.transcript || "").trim();
  if(!transcript){
    return;
  }

  const now = Date.now();
  if(
    transcript === lastAssistantMemoryTranscript &&
    now - lastAssistantMemoryTranscriptAt < 3000
  ){
    return;
  }

  lastAssistantMemoryTranscript = transcript;
  lastAssistantMemoryTranscriptAt = now;

  sendLiveTranscriptToMemory(
    transcript,
    "assistant"
  );
}


''' + start_marker
    text = text.replace(start_marker, helpers, 1)

    token_pattern = r'''(const ephemeralKey =\s*\n\s*String\(\s*\n[\s\S]*?tokenData\?\.client_secret\?\.value[\s\S]*?\n\s*\)\.trim\(\);)'''
    token_match = re.search(token_pattern, text, flags=re.S)
    if not token_match:
        raise RuntimeError(f"{path}: ephemeral key block not found")
    token_block = token_match.group(1)
    token_insert = token_block + r'''

    realtimeMemoryToken =
      String(
        tokenData?.sol_memory_token ||
        ""
      ).trim();'''
    text = text[:token_match.start()] + token_insert + text[token_match.end():]

    speech_marker_pattern = r'''(\s*if\(\s*\n\s*realtimeEvent\.type ===\s*\n\s*"input_audio_buffer\.speech_started"\s*\n\s*\)\{)'''
    speech_match = re.search(speech_marker_pattern, text, flags=re.S)
    if not speech_match:
        raise RuntimeError(f"{path}: realtime speech event marker not found")

    event_insert = r'''

          const memoryToolCall =
            getRealtimeMemoryToolCall(
              realtimeEvent
            );

          if(memoryToolCall){
            void handleRealtimeMemoryToolCall(memoryToolCall);
            return;
          }

          if(
            realtimeEvent.type === "response.output_audio_transcript.done" ||
            realtimeEvent.type === "response.audio_transcript.done"
          ){
            saveRealtimeAssistantTranscript(realtimeEvent);
          }

'''
    text = text[:speech_match.start()] + event_insert + text[speech_match.start():]

    path.write_text(text, encoding="utf-8")

for html_path in HTML_FILES:
    patch_html(html_path)

print("Sol Holo Vollzeitgedächtnis V2 patch applied.")
