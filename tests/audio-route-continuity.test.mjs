import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const nativeRoute = fs.readFileSync(
  "android-native/SolAudioRoutePlugin.java",
  "utf8"
);
const appHtml = fs.readFileSync("www/index.html", "utf8");

test("the changed browser sources remain valid JavaScript", () => {
  const inlineScripts = [
    ...appHtml.matchAll(/<script>([\s\S]*?)<\/script>/gu)
  ];
  assert.ok(inlineScripts.length > 0);
  inlineScripts.forEach((match, index) => {
    assert.doesNotThrow(
      () => new vm.Script(match[1], { filename: `www/index-inline-${index}.js` })
    );
  });
  assert.doesNotThrow(
    () => new vm.Script(
      fs.readFileSync("www/sol-holo-ui.js", "utf8"),
      { filename: "www/sol-holo-ui.js" }
    )
  );
});

test("Sol routes a live conversation to personal audio before speaker fallback", () => {
  assert.match(nativeRoute, /public void usePreferredDevice\(PluginCall call\)/u);
  assert.match(nativeRoute, /AudioDeviceInfo\.TYPE_BLE_HEADSET/u);
  assert.match(nativeRoute, /AudioDeviceInfo\.TYPE_BLUETOOTH_SCO/u);
  assert.match(nativeRoute, /AudioDeviceInfo\.TYPE_WIRED_HEADSET/u);
  assert.match(nativeRoute, /AudioDeviceInfo\.TYPE_USB_HEADSET/u);
  assert.match(nativeRoute, /audioManager\.setCommunicationDevice\(selected\)/u);
  assert.match(nativeRoute, /audioManager\.registerAudioDeviceCallback/u);
  assert.match(nativeRoute, /hasMatchingMediaHeadset\(device\)/u);

  const modernRouteStart = nativeRoute.indexOf(
    "private RouteSelection applyModernConversationRoute()"
  );
  const externalSelection = nativeRoute.indexOf(
    "preferredExternalDevice(devices)",
    modernRouteStart
  );
  const speakerFallback = nativeRoute.indexOf(
    "AudioDeviceInfo.TYPE_BUILTIN_SPEAKER",
    modernRouteStart
  );

  assert.ok(modernRouteStart >= 0);
  assert.ok(externalSelection > modernRouteStart);
  assert.ok(speakerFallback > externalSelection);
});

test("the web voice session uses the headset-first native route", () => {
  assert.match(
    appHtml,
    /async function routeSolAudioForConversation\(\)/u
  );
  assert.match(appHtml, /plugin\.usePreferredDevice\(\)/u);
  assert.doesNotMatch(appHtml, /routeSolAudioToSpeaker/u);

  const routeBeforeMicrophone = appHtml.indexOf(
    "await routeSolAudioForConversation();",
    appHtml.indexOf("async function startLiveConversation()")
  );
  const microphoneOpen = appHtml.indexOf(
    "await openFilteredMicrophone();",
    appHtml.indexOf("async function startLiveConversation()")
  );
  assert.ok(routeBeforeMicrophone >= 0);
  assert.ok(microphoneOpen > routeBeforeMicrophone);
});

test("returning from Notes or Android settings restores route and conversation", () => {
  assert.match(
    appHtml,
    /async function recoverLiveConversationAfterAppSwitch\(\)/u
  );
  assert.match(
    appHtml,
    /document\.addEventListener\(\s*"visibilitychange"/u
  );
  assert.match(
    appHtml,
    /window\.addEventListener\(\s*"focus",\s*scheduleLiveConversationRecovery/u
  );
  assert.match(
    appHtml,
    /audioTrack\.readyState !== "live"/u
  );
  assert.match(appHtml, /audioTrack\.muted/u);
  assert.match(
    appHtml,
    /stopLiveConversation\(\{\s*resumeWake:false\s*\}\)/u
  );
});
