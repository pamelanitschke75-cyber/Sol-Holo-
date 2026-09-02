import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const server = fs.readFileSync(
  new URL("../server.mjs", import.meta.url),
  "utf8"
);

const html = fs.readFileSync(
  new URL("../www/index.html", import.meta.url),
  "utf8"
);

function routeBlock(path, nextPath) {
  const start = server.indexOf(path);
  const end = nextPath
    ? server.indexOf(nextPath, start + path.length)
    : server.length;

  assert.ok(start >= 0, `${path} route missing`);
  assert.ok(end > start, `${path} route boundary missing`);
  return server.slice(start, end);
}

test("Vollzeitgedächtnis bleibt additiv und idempotent", () => {
  assert.match(
    server,
    /ALTER TABLE sol_fulltime_memory[\s\S]*?ADD COLUMN IF NOT EXISTS source_event_id TEXT/u
  );
  assert.match(
    server,
    /CREATE UNIQUE INDEX IF NOT EXISTS sol_fulltime_memory_event_uidx[\s\S]*?WHERE source_event_id IS NOT NULL/u
  );
  assert.match(
    server,
    /INSERT INTO sol_fulltime_memory[\s\S]*?ON CONFLICT DO NOTHING[\s\S]*?RETURNING id/u
  );
  assert.doesNotMatch(
    server,
    /DROP TABLE\s+sol_fulltime_memory|TRUNCATE\s+sol_fulltime_memory/u
  );
});

test("Text und Sol-Antwort werden Wort für Wort ownergebunden gespeichert", () => {
  const solRoute = routeBlock(
    'app.post("/sol"',
    "const PORT ="
  );

  assert.match(solRoute, /resolveRequestIdentity\(/u);
  assert.match(
    solRoute,
    /saveFulltimeMemory\(\s*"user",\s*userMemoryMessage/u
  );
  assert.match(
    solRoute,
    /const saveFulltimeAssistant\s*=[\s\S]*?saveFulltimeMemory\(\s*"assistant"/u
  );
  assert.match(solRoute, /await saveFulltimeAssistant\(\s*answer/u);
  assert.match(
    solRoute,
    /Der vollständige Dialog[\s\S]*?Wort für Wort ownergebunden gespeichert/u
  );
});

test("Sprachtranskripte beider Rollen landen im Vollzeitgedächtnis", () => {
  const liveRoute = routeBlock(
    '"/live/memory"',
    "LANGZEITGEDÄCHTNIS"
  );

  assert.match(liveRoute, /resolveRequestIdentity\(/u);
  assert.match(
    liveRoute,
    /saveFulltimeMemory\(\s*role,\s*transcript/u
  );
  assert.match(liveRoute, /fulltimeSaved/u);
});

test("privater Verlauf wird nur der signierten App-Sitzung paginiert geliefert", () => {
  const historyRoute = routeBlock(
    '"/fulltime/history"',
    '"/fulltime/history/append"'
  );

  assert.match(historyRoute, /requireTrustedOwnerIdentity\(/u);
  assert.match(historyRoute, /loadOwnerFulltimeHistoryPage\(/u);
  assert.match(historyRoute, /Cache-Control/u);
  assert.match(
    server,
    /WHERE clone_id = \$1[\s\S]*?id < \$2::bigint[\s\S]*?ORDER BY id DESC/u
  );
});

test("App lädt sämtliche Seiten chronologisch zurück in den sichtbaren Chat", () => {
  assert.match(html, /async function loadFulltimeHistory\(\)/u);
  assert.match(
    html,
    /while\(true\)[\s\S]*?\/fulltime\/history[\s\S]*?beforeId[\s\S]*?limit:500/u
  );
  assert.match(html, /messages\.sort\(/u);
  assert.match(html, /chat\.replaceChildren\(\)/u);
  assert.match(html, /entry\?\.role ===[\s\S]*?"assistant"/u);
  assert.match(html, /solholo:trusted-session/u);
});

test("lokale App-Antworten warten verlustfrei auf die sichere Synchronisierung", () => {
  assert.match(html, /SOL_FULLTIME_PENDING_KEY/u);
  assert.match(html, /queueFulltimeDialog\(/u);
  assert.match(html, /flushPendingFulltimeDialogs\(/u);
  assert.match(html, /\/fulltime\/history\/append/u);
  assert.doesNotMatch(html, /localStorage\.clear\s*\(/u);
  assert.doesNotMatch(html, /indexedDB\.deleteDatabase\s*\(/u);
});

test("persönliche Rückfragen durchsuchen bestätigte und vollständige Historie", () => {
  const searchRoute = routeBlock(
    '"/memory/search"',
    "REALTIME →"
  );

  assert.match(searchRoute, /identityMemoryStore\.searchConfirmed/u);
  assert.match(searchRoute, /loadRelevantOwnerFulltimeMemory/u);
  assert.match(
    server,
    /PASSENDE EINTRÄGE AUS BESTÄTIGTEN ERINNERUNGEN UND VOLLZEITGEDÄCHTNIS/u
  );
});
