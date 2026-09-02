(function installSolHoloMotionProfile(globalScope){
  "use strict";

  /*
    Nur abgeleitete Bewegungswerte aus der privaten Video-Referenz.
    Das Video selbst und einzelne Bildframes werden nicht in der App verteilt.
  */
  const profile = {
    version:"2026-09-02-natural-mouth-jaw-2",

    speech:{
      maximumOpen:0.62,
      restingOpen:0.012,
      attackRetention:0.58,
      releaseRetention:0.80,
      wideMaximum:0.52,
      roundMaximum:0.50,
      upperLipShare:0.18,
      lowerLipShare:0.72,
      travelByFace:0.027,
      travelByMouth:0.84,
      wideScale:0.24,
      roundScale:0.23,
      minimumMouthScale:0.88,
      maximumMouthScale:1.13,
      jawTravelByFace:0.014,
      jawTravelByMouth:0.46,
      jawLipShare:0.66,
      jawWidenShare:0.10,
      cheekShare:0.055,
      cheekLiftShare:0.10,
      cornerLiftShare:0.18,
      rigAttackMs:34,
      rigReleaseMs:86,
      shapeAttackMs:48,
      shapeReleaseMs:96,
      neutralEpsilon:0.007
    },

    fallback:{
      baseOpen:0.035,
      minimumOpen:0.010,
      maximumOpen:0.54,
      closureDepth:0.44,
      syllableRate:0.0174,
      consonantRate:0.039,
      phraseRate:0.0055
    },

    blink:{
      firstMinimumDelayMs:1450,
      firstMaximumDelayMs:2700,
      minimumDelayMs:3100,
      maximumDelayMs:6100,
      minimumDurationMs:170,
      maximumDurationMs:215,
      closureAmount:0.62
    }
  };

  Object.values(profile).forEach(value => {
    if(value && typeof value === "object"){
      Object.freeze(value);
    }
  });

  globalScope.SolHoloMotionProfile =
    Object.freeze(profile);
})(window);
