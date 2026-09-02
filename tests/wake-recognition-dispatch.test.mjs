import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serviceSource = await readFile(
  new URL("../android-native/HeyHoSolService.java", import.meta.url),
  "utf8"
);
const endpointerSource = await readFile(
  new URL("../android-native/WakeCaptureEndpointer.java", import.meta.url),
  "utf8"
);

function methodSource(startMarker, endMarker) {
  const start = serviceSource.indexOf(startMarker);
  const end = serviceSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `${startMarker} fehlt`);
  assert.notEqual(end, -1, `${endMarker} fehlt`);
  return serviceSource.slice(start, end);
}

test("jede ausreichend lange Aufnahme erreicht Androids Spracherkennung", () => {
  const captureFinished = methodSource(
    "private void onSecureCaptureFinished(",
    "private Intent buildRecognitionIntent("
  );

  assert.match(captureFinished, /session\.prepareRecognitionSource\(\)/u);
  assert.match(captureFinished, /speechRecognizer\.startListening\(/u);
  assert.doesNotMatch(
    captureFinished,
    /hasCompleteSpeechCandidate|speechStarted|activeFrames/u
  );
});

test("der Endpointer bleibt nur Zeitoptimierung und niemals Freigabe-Gate", () => {
  assert.match(endpointerSource, /only a latency hint/u);
  assert.doesNotMatch(endpointerSource, /hasCompleteSpeechCandidate/u);
  assert.match(serviceSource, /WakePhraseMatcher\.canonicalPhrase/u);
  assert.match(serviceSource, /SolSpeakerIdentityPlugin\.verifyWakeAudio/u);
  assert.match(serviceSource, /SECURE_WAKE_PHRASE = "Hey Sol"/u);
});
