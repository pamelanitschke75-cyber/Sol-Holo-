import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const uiSource = await readFile(
  new URL("../www/sol-holo-ui.js", import.meta.url),
  "utf8"
);
const uiStyles = await readFile(
  new URL("../www/sol-holo-ui.css", import.meta.url),
  "utf8"
);
const indexSource = await readFile(
  new URL("../www/index.html", import.meta.url),
  "utf8"
);

test("die feste Hauptnavigation verarbeitet Taps in der Capture-Phase", () => {
  assert.match(
    uiSource,
    /currentBottomNav\.addEventListener\("click",[\s\S]*?showView\(button\.dataset\.view\);[\s\S]*?\}, true\);/u
  );
  assert.match(uiSource, /data-view="home" aria-label="Start"/u);
  assert.match(uiSource, /event\.preventDefault\(\)/u);
});

test("Symbole können einen Tap auf die Navigationsschaltfläche nicht abfangen", () => {
  assert.match(
    uiStyles,
    /#bottomNav\s+\.navItem\s*>\s*\*\s*\{\s*pointer-events:none;/u
  );
  assert.match(
    uiStyles,
    /#bottomNav\s*\{[\s\S]*?pointer-events:auto;[\s\S]*?touch-action:manipulation;/u
  );
});

test("das Update lädt die reparierte Navigation ohne alten WebView-Cache", () => {
  assert.match(indexSource, /sol-holo-ui\.css\?v=35/u);
  assert.match(indexSource, /sol-holo-ui\.js\?v=40/u);
});
