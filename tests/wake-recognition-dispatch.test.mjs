import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serviceSource = await readFile(
  new URL("../android-native/HeyHoSolService.java", import.meta.url),
  "utf8"
);
const spotterSource = await readFile(
  new URL("../android-native/SolWakeKeywordSpotter.java", import.meta.url),
  "utf8"
);
const installerSource = await readFile(
  new URL("../scripts/install-speaker-identity.mjs", import.meta.url),
  "utf8"
);

function methodSource(startMarker, endMarker) {
  const start = serviceSource.indexOf(startMarker);
  const end = serviceSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `${startMarker} fehlt`);
  assert.notEqual(end, -1, `${endMarker} fehlt`);
  return serviceSource.slice(start, end);
}

test("derselbe lokale PCM-Strom erreicht Weckruf- und Sprecherprüfung", () => {
  const pump = methodSource(
    "private void pump(SecureAudioListener listener)",
    "short[] finishAndSnapshot()"
  );
  assert.match(pump, /captured\.append\(buffer, count\)/u);
  assert.match(pump, /keywordSpotter\.accept\(buffer, count\)/u);
  assert.ok(
    pump.indexOf("captured.append(buffer, count)")
      < pump.indexOf("keywordSpotter.accept(buffer, count)"),
    "PCM muss vor der lokalen Erkennung im geschützten Ringspeicher liegen"
  );
  assert.match(serviceSource, /session\.finishAndSnapshot\(\)/u);
  assert.match(serviceSource, /SolSpeakerIdentityPlugin\.verifyWakeAudio/u);
});

test("Samsung muss keine aufgenommene Datei an SpeechRecognizer übernehmen", () => {
  assert.match(serviceSource, /new SolWakeKeywordSpotter/u);
  assert.match(spotterSource, /KeywordSpotterConfig\.builder/u);
  assert.match(spotterSource, /stream\.acceptWaveform/u);
  assert.doesNotMatch(serviceSource, /SpeechRecognizer|RecognizerIntent/u);
  assert.doesNotMatch(serviceSource, /ParcelFileDescriptor|prepareRecognitionSource/u);
});

test("nur Hey Sol erreicht weiterhin beide Besitzerprüfungen", () => {
  assert.match(serviceSource, /SECURE_WAKE_PHRASE = "Hey Sol"/u);
  assert.match(serviceSource, /WakePhraseMatcher\.canonicalPhrase/u);
  assert.match(spotterSource, /WakePhraseMatcher\.canonicalPhrase/u);
  assert.match(installerSource, /HH EY1 S OW1 L @Hey_Sol/u);
  assert.match(installerSource, /HH EY1 Z OW1 L @Hey_Sohl/u);
  assert.doesNotMatch(installerSource, /@Hallo_Sol|@Hello_Sol/u);
  assert.match(serviceSource, /measuredCampplusScore/u);
  assert.match(serviceSource, /measuredEres2netScore/u);
});
