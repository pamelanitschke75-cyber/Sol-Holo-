/*
  SOL HOLO
  VOICE ID – TEST 001

  Zweck:
  Sprechererkennung vorbereiten,
  ohne das funktionierende Sol-Holo-System
  zu verändern.

  Ziel:

  Pam     -> pam
  Steffi  -> steffi
  unsicher -> unknown

  WICHTIG:

  Diese Datei ist momentan absichtlich
  NICHT mit server.mjs verbunden.

  Dadurch bleiben folgende bereits
  funktionierende Komponenten unangetastet:

  - Textchat
  - LiveSpeak
  - Mikrofon
  - OpenAI Realtime
  - Langzeitgedächtnis
  - Lip-Sync

  Referenzaufnahmen im Repository:

  Pam's Stimme vom 19.08.2026.m4a
  Steffis Stimme vom 19.08.2026.m4a
*/


/*
  Sprecher
*/

export const SPEAKERS = {

  pam: {
    id: "pam",
    name: "Pam",
    cloneId: "pam-sol-001",
    referenceAudio:
      "Pam's Stimme vom 19.08.2026.m4a"
  },

  steffi: {
    id: "steffi",
    name: "Steffi",
    referenceAudio:
      "Steffis Stimme vom 19.08.2026.m4a"
  },

  unknown: {
    id: "unknown",
    name: "Unbekannt"
  }

};


/*
  Sicherheitsgrenze

  Eine unsichere Sprecherzuordnung
  darf niemals automatisch einer
  bekannten Person zugeordnet werden.
*/

export const VOICE_ID_POLICY = {

  unknownOnUncertainty: true,

  allowUnknownMemory:
    false,

  allowAutomaticGuess:
    false

};


/*
  Ergebnisformat der späteren
  Sprechererkennung
*/

export function createVoiceIdResult(
  speaker = "unknown",
  confidence = 0
) {

  const normalizedSpeaker =
    String(
      speaker || "unknown"
    ).toLowerCase();

  const knownSpeaker =
    SPEAKERS[
      normalizedSpeaker
    ];

  if (!knownSpeaker) {

    return {
      speaker: "unknown",
      name: "Unbekannt",
      confidence: 0,
      verified: false
    };

  }

  const numericConfidence =
    Number(
      confidence
    );

  return {

    speaker:
      knownSpeaker.id,

    name:
      knownSpeaker.name,

    confidence:
      Number.isFinite(
        numericConfidence
      )
        ? numericConfidence
        : 0,

    verified:
      knownSpeaker.id !==
      "unknown"

  };

}


/*
  Memory-Schutz

  Noch NICHT an server.mjs angeschlossen.

  Später darf nur eine erfolgreich
  erkannte Person ihre Aussage an
  das zugehörige persönliche Memory
  weitergeben.
*/

export function mayWriteMemory(
  voiceResult
) {

  if (
    !voiceResult
  ) {
    return false;
  }

  if (
    voiceResult.speaker ===
    "unknown"
  ) {
    return false;
  }

  return (
    voiceResult.verified ===
    true
  );

}


/*
  Diagnose

  Dieser Teil bestätigt beim späteren
  Testen auf Render lediglich,
  dass das Voice-ID-Modul geladen wurde.

  Es findet hier NOCH KEINE
  biometrische Sprechererkennung statt.
*/

export function voiceIdStatus() {

  return {

    system:
      "Sol Holo Voice ID",

    test:
      "VOICE-ID TEST 001",

    ready:
      true,

    connectedToLiveSpeak:
      false,

    speakerIdentificationActive:
      false,

    references: {

      pam:
        SPEAKERS.pam
          .referenceAudio,

      steffi:
        SPEAKERS.steffi
          .referenceAudio

    },

    possibleResults: [
      "pam",
      "steffi",
      "unknown"
    ]

  };

}


console.log(
  "Sol Holo Voice ID – TEST 001 vorbereitet."
);

console.log(
  "Voice-ID ist noch NICHT mit LiveSpeak verbunden."
);