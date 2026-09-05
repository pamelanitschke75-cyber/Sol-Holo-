import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync("www/index.html", "utf8");
const serverSource = fs.readFileSync("server.mjs", "utf8");

test("Realtime gibt echte Kalenderergebnisse zurück an die Sprachsitzung", () => {
  for (const expected of [
    "handleRealtimeCalendarResult",
    "data?.calendar?.handled",
    "LOKALES_KALENDERERGEBNIS",
    "`${BACKEND_URL}/calendar/action`",
    "interactive:true"
  ]) {
    assert.ok(appSource.includes(expected), expected);
  }

  assert.ok(serverSource.includes('"/calendar/action"'));
  assert.ok(serverSource.includes("hasTrustedGooglePersonalReadGate(req)"));
  assert.match(
    serverSource,
    /calendarResult\?\.handled &&[\s\S]{0,180}appendConversationMessage/
  );
  assert.ok(
    serverSource.includes(
      "Dadurch wird weder das Sprachtranskript doppelt gespeichert"
    )
  );
});

test("Samsung Notes und Google Maps werden nicht als Backend-Freigabe dargestellt", () => {
  assert.match(
    serverSource,
    /Samsung Notes ist eine lokale Android-Funktion und braucht keine[\s\S]{0,100}Freischaltung durch das Sol-Holo-Backend/
  );
  assert.match(
    serverSource,
    /Google Maps wird direkt von der Android-App geöffnet[\s\S]{0,140}keine[\s\S]{0,80}Backend-Freigabe/
  );
  assert.ok(appSource.includes("handleRealtimeLocalDeviceTranscript"));
  assert.ok(appSource.includes("LOKALES_NAVIGATIONSERGEBNIS"));
});
