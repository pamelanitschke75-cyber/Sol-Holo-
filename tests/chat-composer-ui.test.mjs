import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(
  new URL("../www/index.html", import.meta.url),
  "utf8"
);
const css = fs.readFileSync(
  new URL("../www/sol-holo-chat-114.css", import.meta.url),
  "utf8"
);
const ui = fs.readFileSync(
  new URL("../www/sol-holo-ui.js", import.meta.url),
  "utf8"
);
const workflow = fs.readFileSync(
  new URL("../.github/workflows/android-build.yml", import.meta.url),
  "utf8"
);

test("Build #114 bewahrt die entfernte Punkte- und Spruchzeile", () => {
  const statusBlock = html.match(
    /<div id="liveStatus"[\s\S]*?<\/div>/u
  )?.[0] || "";

  assert.ok(statusBlock);
  assert.doesNotMatch(statusBlock, /Ich bin da\./u);
  assert.doesNotMatch(statusBlock, /·······/u);
  assert.doesNotMatch(
    html,
    /liveStatus\.innerHTML\s*=\s*['"][\s\S]*?Ich bin da\./u
  );
  assert.match(html, /setLiveStatus\(\s*""\s*\)/u);
  assert.match(
    css,
    /#liveStatus\{[\s\S]*?position:absolute!important[\s\S]*?height:1px!important/u
  );
});

test("Build #114 bietet ein automatisch wachsendes Schreibfeld", () => {
  assert.match(html, /sol-holo-chat-114\.css\?v=1/u);
  assert.match(html, /id="messageInput"[\s\S]*?rows="1"/u);
  assert.match(html, /autocapitalize="sentences"/u);
  assert.match(html, /spellcheck="true"/u);
  assert.match(html, /function resizeMessageInput\(\)/u);
  assert.match(html, /messageInput\.scrollHeight/u);
  assert.match(html, /--sol-viewport-height/u);
  assert.match(html, /sol-composer-focused/u);
  assert.match(
    ui,
    /chatInput\.dispatchEvent\([\s\S]*?new Event\([\s\S]*?"input"/u
  );
});

test("Build #114 setzt Kamera und Mikrofon klein frei darunter", () => {
  assert.match(
    css,
    /grid-template-areas:[\s\S]*?"composer composer composer"[\s\S]*?"camera \. microphone"/u
  );
  assert.match(css, /--sol-composer-side-button:36px/u);
  assert.match(css, /#imageButton\{[\s\S]*?grid-area:camera/u);
  assert.match(css, /#liveButton\{[\s\S]*?grid-area:microphone/u);
  assert.match(
    css,
    /#speakerIdentityChooser\[hidden\][\s\S]*?display:none!important/u
  );
  assert.match(css, /#stageVolumeCard\{[\s\S]*?display:none!important/u);
  assert.match(workflow, /www\/sol-holo-chat-114\.css/u);
});

test("Build #114 hält das Holo klein und blendet es beim Schreiben aus", () => {
  assert.match(
    css,
    /#solCloneWrap\{[\s\S]*?height:clamp\(72px,60%,96px\)[\s\S]*?max-width:28%/u
  );
  assert.match(
    css,
    /body\.sol-composer-focused #chatView #solStage\{[\s\S]*?display:none!important/u
  );
  assert.match(
    css,
    /body\.sol-composer-focused #chatView\.active\{[\s\S]*?grid-template-rows:[\s\S]*?minmax\(0,1fr\)[\s\S]*?auto;/u
  );
  assert.match(html, /SOL_SOFT_KEYBOARD_REDUCTION_PX\s*=\s*120/u);
  assert.match(
    html,
    /viewportReduction\s*>?=\s*SOL_SOFT_KEYBOARD_REDUCTION_PX/u
  );
  assert.match(
    html,
    /classList\.toggle\([\s\S]*?"sol-composer-focused"/u
  );
});
