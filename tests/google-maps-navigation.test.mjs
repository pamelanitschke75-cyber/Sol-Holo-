import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const uiSource = fs.readFileSync("www/sol-holo-ui.js", "utf8");
const functionStart = uiSource.indexOf(
  "function googleMapsNavigationFromNaturalRequest"
);
const functionEnd = uiSource.indexOf(
  "\n\n  window.extractSolHoloGoogleMapsNavigation",
  functionStart
);

if (functionStart < 0 || functionEnd < 0) {
  throw new Error("Google-Maps-Spracherkennung wurde nicht gefunden.");
}

const context = {};
vm.createContext(context);
vm.runInContext(
  `${uiSource.slice(functionStart, functionEnd)}\n` +
    "this.extractNavigation = googleMapsNavigationFromNaturalRequest;",
  context
);

test("erkennt ausdrückliche Google-Maps-Navigationsaufträge", () => {
  const examples = new Map([
    [
      "Sol, navigiere mich bitte zu Paukner in Offenbach",
      { action: "navigate", destination: "Paukner in Offenbach", mode: "driving" }
    ],
    [
      "Hey Pam, bring mich nach Hause zu Fuß",
      { action: "navigate", destination: "Zuhause", mode: "walking" }
    ],
    [
      "Starte die Navigation nach München mit dem Fahrrad",
      { action: "navigate", destination: "München", mode: "bicycling" }
    ],
    [
      "Google Maps Route nach Berlin mit der Bahn",
      { action: "navigate", destination: "Berlin", mode: "transit" }
    ],
    [
      "Öffne bitte Google Maps",
      { action: "open", destination: "", mode: "driving" }
    ]
  ]);

  for (const [spokenText, expected] of examples) {
    assert.deepEqual(
      { ...context.extractNavigation(spokenText) },
      expected,
      spokenText
    );
  }
});

test("öffnet Karten nicht bei Fragen, Notizen oder Kalendertexten", () => {
  for (const spokenText of [
    "Wie komme ich nach Berlin?",
    "Notiere die Route nach Berlin",
    "Trage den Termin bei Google Maps in den Kalender ein",
    "Ich mag Karten"
  ]) {
    assert.equal(context.extractNavigation(spokenText), null, spokenText);
  }
});

test("native Navigation bleibt Google Maps und fordert keine Standortberechtigung", () => {
  const nativeSource = fs.readFileSync(
    "android-native/SolNavigationPlugin.java",
    "utf8"
  );
  const installerSource = fs.readFileSync(
    "scripts/install-google-maps-navigation.mjs",
    "utf8"
  );

  for (const expected of [
    '@CapacitorPlugin(name = "SolNavigation")',
    '"com.google.android.apps.maps"',
    '.scheme("google.navigation")',
    'Uri.parse("https://www.google.com/maps/dir/")',
    "intent.setPackage(GOOGLE_MAPS_PACKAGE)",
    'result.put("locationPermissionRequired", false)'
  ]) {
    assert.ok(nativeSource.includes(expected), expected);
  }

  assert.ok(
    installerSource.includes("registerPlugin(SolNavigationPlugin.class)")
  );
  assert.ok(
    installerSource.includes("com.google.android.apps.maps")
  );
  assert.doesNotMatch(
    nativeSource + installerSource,
    /ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION/
  );
});
