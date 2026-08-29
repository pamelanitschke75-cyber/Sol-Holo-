(function installSolHoloMotionProfile(globalScope){
  "use strict";

  /*
    Nur abgeleitete Bewegungswerte aus der privaten Video-Referenz.
    Das Video selbst und einzelne Bildframes werden nicht in der App verteilt.
  */
  const profile = {
    version:"2026-08-29-reference-video-1",

    speech:{
      maximumOpen:0.60,
      restingOpen:0.018,
      attackRetention:0.66,
      releaseRetention:0.83,
      wideMaximum:0.48,
      roundMaximum:0.46,
      upperLipShare:0.18,
      lowerLipShare:0.82,
      travelByFace:0.020,
      travelByMouth:0.68,
      wideScale:0.036,
      roundScale:0.046,
      jawShare:0.028,
      cheekShare:0.030
    },

    fallback:{
      baseOpen:0.055,
      minimumOpen:0.018,
      maximumOpen:0.60,
      closureDepth:0.36,
      syllableRate:0.019,
      consonantRate:0.043,
      phraseRate:0.0061
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
