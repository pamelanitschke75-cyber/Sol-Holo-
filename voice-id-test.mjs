/*
  SOL HOLO
  VOICE ID – TEST 002

  Ziel:
  Pam / Steffi / unknown

  Dieser Test läuft GETRENNT von:
  - server.mjs
  - LiveSpeak
  - Memory
  - Sol Holo UI

  Dadurch bleibt der funktionierende
  Sol-Holo-Stand unangetastet.
*/

import fs from "fs";
import OpenAI from "openai";

/*
  OpenAI
*/

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY
  });


/*
  Sprecher
*/

const SPEAKERS = {

  pam: {
    id: "pam",
    name: "Pam",

    /*
      Für den echten API-Test
      sollte dieser Referenzclip
      2–10 Sekunden lang sein.
    */

    referenceAudio:
      "Pam's Stimme vom 19.08.2026.m4a"
  },

  steffi: {
    id: "steffi",
    name: "Steffi",

    /*
      Für den echten API-Test
      sollte dieser Referenzclip
      2–10 Sekunden lang sein.
    */

    referenceAudio:
      "Steffis Stimme vom 19.08.2026.m4a"
  }

};


/*
  Audiodatei in Data-URL umwandeln
*/

function audioFileToDataUrl(
  filePath
) {

  if (
    !fs.existsSync(
      filePath
    )
  ) {

    throw new Error(
      `Audiodatei nicht gefunden: ${filePath}`
    );
  }

  const audioBuffer =
    fs.readFileSync(
      filePath
    );

  const base64 =
    audioBuffer.toString(
      "base64"
    );

  return (
    `data:audio/mp4;base64,${base64}`
  );
}


/*
  Sprechername normalisieren
*/

function normalizeSpeaker(
  speaker
) {

  const value =
    String(
      speaker || ""
    )
      .trim()
      .toLowerCase();

  if (
    value === "pam"
  ) {

    return "pam";

  }

  if (
    value === "steffi"
  ) {

    return "steffi";

  }

  return "unknown";
}


/*
  Gesamtergebnis aus allen
  Sprechersegmenten bestimmen
*/

function determineMainSpeaker(
  segments
) {

  const totals = {

    pam:
      0,

    steffi:
      0,

    unknown:
      0

  };


  for (
    const segment
    of segments
  ) {

    const speaker =
      normalizeSpeaker(
        segment?.speaker
      );

    const start =
      Number(
        segment?.start ||
        0
      );

    const end =
      Number(
        segment?.end ||
        0
      );

    const duration =
      Math.max(
        0,
        end - start
      );

    totals[
      speaker
    ] +=
      duration;

  }


  console.log(
    "Sprechzeiten:",
    totals
  );


  /*
    Höchsten Wert bestimmen
  */

  const sorted =
    Object.entries(
      totals
    )
      .sort(
        (
          a,
          b
        ) =>
          b[1] - a[1]
      );


  const [
    bestSpeaker,
    bestDuration
  ] =
    sorted[0];


  const secondDuration =
    sorted[1]?.[1] ||
    0;


  /*
    Keine brauchbare Sprache
  */

  if (
    bestDuration <= 0
  ) {

    return {

      speaker:
        "unknown",

      confidence:
        0,

      reason:
        "Keine verwertbaren Sprechersegmente."

    };

  }


  /*
    Wenn OpenAI keinen bekannten
    Sprecher zuordnen konnte
  */

  if (
    bestSpeaker ===
    "unknown"
  ) {

    return {

      speaker:
        "unknown",

      confidence:
        0,

      reason:
        "Sprecher konnte keiner bekannten Referenz zugeordnet werden."

    };

  }


  /*
    Einfache relative Sicherheit

    Noch KEINE biometrische
    Sicherheitsgarantie.

    Nur Testwert für TEST 002.
  */

  const totalKnown =
    totals.pam +
    totals.steffi;

  const confidence =
    totalKnown > 0
      ? bestDuration /
        totalKnown
      : 0;


  /*
    Wenn Pam und Steffi
    fast gleich stark vorkommen,
    lieber UNKNOWN.
  */

  if (
    Math.abs(
      bestDuration -
      secondDuration
    ) < 0.75
  ) {

    return {

      speaker:
        "unknown",

      confidence,

      reason:
        "Sprecherzuordnung zu unsicher."

    };

  }


  return {

    speaker:
      bestSpeaker,

    confidence,

    reason:
      "Bekannter Sprecher erkannt."

  };

}


/*
  Hauptfunktion
*/

async function identifySpeaker(
  testAudioPath
) {

  console.log(
    "--------------------------------"
  );

  console.log(
    "SOL HOLO VOICE ID – TEST 002"
  );

  console.log(
    "--------------------------------"
  );


  if (
    !process.env.OPENAI_API_KEY
  ) {

    throw new Error(
      "OPENAI_API_KEY fehlt."
    );

  }


  if (
    !testAudioPath
  ) {

    throw new Error(
      "Keine Test-Audiodatei angegeben."
    );

  }


  if (
    !fs.existsSync(
      testAudioPath
    )
  ) {

    throw new Error(
      `Test-Audio nicht gefunden: ${testAudioPath}`
    );

  }


  /*
    Referenzstimmen laden
  */

  console.log(
    "Pam-Referenz wird geladen ..."
  );

  const pamReference =
    audioFileToDataUrl(
      SPEAKERS.pam
        .referenceAudio
    );


  console.log(
    "Steffi-Referenz wird geladen ..."
  );

  const steffiReference =
    audioFileToDataUrl(
      SPEAKERS.steffi
        .referenceAudio
    );


  console.log(
    "Test-Audio:",
    testAudioPath
  );


  /*
    OpenAI Speaker Diarization

    OpenAI kann bekannte Sprecher
    anhand kurzer Referenzclips
    auf Sprechersegmente abbilden.
  */

  const transcript =
    await openai
      .audio
      .transcriptions
      .create({

        file:
          fs.createReadStream(
            testAudioPath
          ),

        model:
          "gpt-4o-transcribe-diarize",

        response_format:
          "diarized_json",

        chunking_strategy:
          "auto",

        known_speaker_names: [
          "Pam",
          "Steffi"
        ],

        known_speaker_references: [
          pamReference,
          steffiReference
        ]

      });


  /*
    Segmente anzeigen
  */

  const segments =
    Array.isArray(
      transcript?.segments
    )
      ? transcript.segments
      : [];


  console.log(
    ""
  );

  console.log(
    "Erkannte Segmente:"
  );


  for (
    const segment
    of segments
  ) {

    console.log(
      `[${segment.start}–${segment.end}] ${segment.speaker}: ${segment.text}`
    );

  }


  /*
    Hauptergebnis
  */

  const result =
    determineMainSpeaker(
      segments
    );


  console.log(
    ""
  );

  console.log(
    "VOICE-ID ERGEBNIS:"
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );


  return {

    result,

    transcript:
      transcript?.text ||
      "",

    segments

  };

}


/*
  Kommandozeile

  Beispiel:

  node voice-id-test.mjs test-pam.m4a

  oder:

  node voice-id-test.mjs test-steffi.m4a
*/

const testAudioPath =
  process.argv[2];


if (
  !testAudioPath
) {

  console.log(
    ""
  );

  console.log(
    "VOICE-ID TEST 002 ist installiert."
  );

  console.log(
    ""
  );

  console.log(
    "Zum Testen:"
  );

  console.log(
    "node voice-id-test.mjs <test-audio.m4a>"
  );

  console.log(
    ""
  );

  console.log(
    "Mögliche Ergebnisse:"
  );

  console.log(
    "pam"
  );

  console.log(
    "steffi"
  );

  console.log(
    "unknown"
  );

} else {

  identifySpeaker(
    testAudioPath
  )
    .then(
      () => {

        console.log(
          ""
        );

        console.log(
          "VOICE-ID TEST 002 beendet."
        );

      }
    )
    .catch(
      (error) => {

        console.error(
          ""
        );

        console.error(
          "VOICE-ID TEST 002 FEHLER:"
        );

        console.error(
          error
        );

        process.exitCode =
          1;

      }
    );

}