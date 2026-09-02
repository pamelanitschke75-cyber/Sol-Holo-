import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import {
  hasSafeFaceGeometry,
  lowerFaceMotionWeight,
  normalizeSpeechMotion,
  smoothSpeechMotion,
  speechMotionMetrics
} from "../www/full-face-rig.mjs";

async function loadMotionProfile() {
  const source = await readFile(
    new URL("../www/sol-motion-profile.js", import.meta.url),
    "utf8"
  );
  const context = vm.createContext({});
  context.window = context;
  vm.runInContext(source, context, {
    filename: "sol-motion-profile.js"
  });
  return context.SolHoloMotionProfile;
}

const face = {
  left: 0.34,
  right: 0.66,
  top: 0.20,
  bottom: 0.62,
  width: 0.32,
  height: 0.42,
  centerX: 0.50,
  centerY: 0.41
};

const mouth = {
  left: 0.43,
  right: 0.57,
  top: 0.405,
  bottom: 0.445,
  width: 0.14,
  height: 0.04,
  centerX: 0.50,
  centerY: 0.425
};

test("Bewegungsprofil begrenzt Foto-Fallback und definiert echten Kieferweg", async () => {
  const profile = await loadMotionProfile();

  assert.match(profile.version, /natural-mouth-jaw/);
  assert.ok(profile.speech.jawTravelByFace > 0);
  assert.ok(profile.speech.jawTravelByMouth > 0);
  assert.ok(profile.speech.lowerLipShare > profile.speech.upperLipShare);
  assert.ok(profile.fallback.maximumOpen < profile.speech.maximumOpen);
  assert.ok(profile.fallback.closureDepth > profile.fallback.baseOpen);
  assert.ok(Object.isFrozen(profile));
  assert.ok(Object.isFrozen(profile.speech));
});

test("Audio-/Visem-Werte werden sicher auf das Bewegungsprofil begrenzt", async () => {
  const { speech } = await loadMotionProfile();
  const motion = normalizeSpeechMotion(
    {
      openness: 99,
      wideness: -1,
      roundness: Number.NaN
    },
    speech
  );

  assert.deepEqual(motion, {
    openness: speech.maximumOpen,
    wideness: 0,
    roundness: 0
  });
});

test("Mundoeffnung bewegt Unterlippe und Kiefer, Stille bleibt neutral", async () => {
  const { speech } = await loadMotionProfile();
  const silent = speechMotionMetrics(
    { openness: 0, wideness: 0, roundness: 0 },
    face,
    mouth,
    speech
  );
  const spoken = speechMotionMetrics(
    { openness: speech.maximumOpen, wideness: 0.18, roundness: 0.05 },
    face,
    mouth,
    speech
  );

  assert.equal(silent.verticalTravel, 0);
  assert.equal(silent.jawTravel, 0);
  assert.ok(spoken.verticalTravel > 0);
  assert.ok(spoken.jawTravel > 0);
  assert.ok(spoken.lowerTravel > spoken.upperTravel);
  assert.ok(spoken.jawTravel / spoken.verticalTravel > 0.25);
  assert.ok(spoken.jawTravel / spoken.verticalTravel < 0.80);
});

test("Breite und gerundete Viseme erzeugen unterscheidbare Mundformen", async () => {
  const { speech } = await loadMotionProfile();
  const wide = speechMotionMetrics(
    { openness: 0.32, wideness: speech.wideMaximum, roundness: 0 },
    face,
    mouth,
    speech
  );
  const round = speechMotionMetrics(
    { openness: 0.32, wideness: 0, roundness: speech.roundMaximum },
    face,
    mouth,
    speech
  );

  assert.ok(wide.shapeScale > 1.08);
  assert.ok(round.shapeScale < 0.92);
  assert.ok(wide.shapeScale > round.shapeScale);
});

test("Glaettung reagiert schnell, loest weich und schnappt am Ende neutral", async () => {
  const { speech } = await loadMotionProfile();
  const attack = smoothSpeechMotion(
    { openness: 0, wideness: 0, roundness: 0 },
    { openness: 0.60, wideness: 0.30, roundness: 0 },
    16.67,
    speech
  );
  const release = smoothSpeechMotion(
    { openness: 0.60, wideness: 0.30, roundness: 0 },
    { openness: 0.30, wideness: 0.15, roundness: 0 },
    16.67,
    speech
  );
  const neutral = smoothSpeechMotion(
    release,
    { openness: 0.002, wideness: 0.001, roundness: 0 },
    16.67,
    speech
  );

  assert.ok(attack.openness > 0 && attack.openness < 0.60);
  assert.ok(0.60 - release.openness < attack.openness);
  assert.deepEqual(neutral, {
    openness: 0,
    wideness: 0,
    roundness: 0
  });
});

test("Unterkiefergewicht sitzt am Kinn und nicht im oberen Gesicht", () => {
  const aboveMouth = lowerFaceMotionWeight(
    { x: 0.50, y: 0.36 },
    face,
    mouth
  );
  const centerChin = lowerFaceMotionWeight(
    { x: 0.50, y: face.bottom },
    face,
    mouth
  );
  const sideChin = lowerFaceMotionWeight(
    { x: face.right, y: face.bottom },
    face,
    mouth
  );

  assert.equal(aboveMouth, 0);
  assert.equal(centerChin, 1);
  assert.ok(sideChin > 0.60 && sideChin < centerChin);
});

test("Unsichere Foto-Landmarks fallen zur lokalen Mundbewegung zurueck", () => {
  const leftEye = {
    left: 0.40,
    right: 0.46,
    top: 0.31,
    bottom: 0.34,
    width: 0.06,
    height: 0.03,
    centerX: 0.43,
    centerY: 0.325
  };
  const rightEye = {
    ...leftEye,
    left: 0.54,
    right: 0.60,
    centerX: 0.57
  };

  assert.equal(
    hasSafeFaceGeometry(face, mouth, leftEye, rightEye),
    true
  );
  assert.equal(
    hasSafeFaceGeometry(
      face,
      { ...mouth, centerY: 0.29, top: 0.27, bottom: 0.31 },
      leftEye,
      rightEye
    ),
    false
  );
  assert.equal(
    hasSafeFaceGeometry(
      face,
      { ...mouth, width: face.width * 0.9 },
      leftEye,
      rightEye
    ),
    false
  );
});
