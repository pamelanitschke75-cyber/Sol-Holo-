import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const ui = fs.readFileSync(
  new URL("../www/sol-holo-ui.js", import.meta.url),
  "utf8"
);
const html = fs.readFileSync(
  new URL("../www/index.html", import.meta.url),
  "utf8"
);
const server = fs.readFileSync(
  new URL("../server.mjs", import.meta.url),
  "utf8"
);

function between(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Startmarke fehlt: ${startMarker}`);
  assert.notEqual(end, -1, `Endmarke fehlt: ${endMarker}`);
  return text.slice(start, end);
}

test("the Android UI exposes one clearly synthetic Alltag preview action", () => {
  const row = ui.match(
    /<button id="openClawAlltagPreviewRow"[\s\S]*?<\/button>/u
  )?.[0];
  assert.ok(row, "Alltagsworker-Testzeile fehlt");
  assert.match(row, /Alltagsworker · fiktiver Test/u);
  assert.match(row, /Nur Testdaten lesen/u);
  assert.doesNotMatch(row, /data-sol-prompt/u);
  assert.doesNotMatch(row, /input|textarea/u);
});

test("the visible dispatch requires confirmation and a trusted app session", () => {
  const runFunction = between(
    ui,
    "async function runOpenClawAlltagPreview()",
    "function normalizeNoteSearchText"
  );
  assert.match(runFunction, /window\.confirm/u);
  assert.match(runFunction, /keine echten Daten/u);
  assert.match(runFunction, /SolHoloTrustedSession\?\.ensure/u);
  assert.match(runFunction, /interactive: true/u);
  assert.match(runFunction, /RUN_FIXED_SYNTHETIC_ALLTAG_PREVIEW/u);
  assert.match(runFunction, /\/openclaw\/alltag-preview/u);
  assert.doesNotMatch(runFunction, /messageInput|homeMessageInput/u);
});

test("worker output is rendered as text and checked for every safety control", () => {
  const renderFunction = between(
    ui,
    "function renderOpenClawAlltagPreview(",
    "async function runOpenClawAlltagPreview()"
  );
  assert.match(renderFunction, /textContent = String\(entry\)/u);
  assert.match(renderFunction, /external_action_performed !== false/u);
  assert.match(renderFunction, /data_written !== false/u);
  assert.match(renderFunction, /boundary_crossed !== false/u);
  assert.match(renderFunction, /human_review_required !== true/u);
  assert.doesNotMatch(renderFunction, /innerHTML/u);
});

test("the backend route is owner-gated before the preview service runs", () => {
  const route = between(
    server,
    'app.post(\n  "/openclaw/alltag-preview"',
    "async function handleGooglePersonalRead"
  );
  assert.ok(
    route.indexOf("requireTrustedOwnerIdentity") <
      route.indexOf(".run(req.body)"),
    "Trusted-Owner-Gate muss vor dem Worker-Aufruf stehen"
  );
  assert.match(route, /no-store/u);
  assert.match(route, /productive: false/u);
  assert.match(route, /persisted: false/u);
});

test("the Android asset versions include the new preview UI", () => {
  assert.match(html, /sol-holo-ui\.css\?v=36/u);
  assert.match(html, /sol-holo-ui\.js\?v=42/u);
});
