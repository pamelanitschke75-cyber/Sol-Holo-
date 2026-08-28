(function attachSolHoloMedia(globalScope) {
  "use strict";

  const MAX_VIDEO_FRAMES = 8;
  const MAX_FRAME_EDGE = 960;
  const FRAME_JPEG_QUALITY = 0.76;
  const MEDIA_EVENT_TIMEOUT_MS = 15000;

  function waitForMediaEvent(target, eventName) {
    return new Promise((resolve, reject) => {
      let timeoutId = null;

      const cleanup = () => {
        target.removeEventListener(eventName, handleSuccess);
        target.removeEventListener("error", handleError);

        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
      };

      const handleSuccess = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        reject(
          new Error(
            "Das Video konnte auf diesem Handy nicht geöffnet werden."
          )
        );
      };

      timeoutId = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            "Das Vorbereiten des Videos hat zu lange gedauert."
          )
        );
      }, MEDIA_EVENT_TIMEOUT_MS);

      target.addEventListener(eventName, handleSuccess, { once: true });
      target.addEventListener("error", handleError, { once: true });
    });
  }

  function isSupportedVideoFile(file) {
    const mimeType = String(file?.type || "").toLowerCase();
    const fileName = String(file?.name || "");

    return (
      mimeType.startsWith("video/") ||
      /\.(?:mp4|m4v|mov|webm|3gp)$/i.test(fileName)
    );
  }

  function formatDuration(seconds) {
    const roundedSeconds = Math.max(0, Math.round(Number(seconds) || 0));
    const minutes = Math.floor(roundedSeconds / 60);
    const remainingSeconds = roundedSeconds % 60;

    if (minutes === 0) {
      return `${remainingSeconds} Sek.`;
    }

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")} Min.`;
  }

  function chooseFrameTimes(durationSeconds) {
    if (durationSeconds <= 0.35) {
      return [0];
    }

    const frameCount = Math.min(
      MAX_VIDEO_FRAMES,
      Math.max(3, Math.ceil(durationSeconds / 3))
    );

    const start = Math.min(0.15, durationSeconds * 0.05);
    const end = Math.max(start, durationSeconds - Math.min(0.15, durationSeconds * 0.05));

    if (frameCount === 1 || end <= start) {
      return [start];
    }

    return Array.from(
      { length: frameCount },
      (_, index) => start + ((end - start) * index) / (frameCount - 1)
    );
  }

  async function seekVideo(video, timeSeconds) {
    const safeTime = Math.max(
      0,
      Math.min(timeSeconds, Math.max(0, video.duration - 0.01))
    );

    if (
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      Math.abs(video.currentTime - safeTime) < 0.025
    ) {
      return;
    }

    const seeked = waitForMediaEvent(video, "seeked");
    video.currentTime = safeTime;
    await seeked;

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForMediaEvent(video, "loadeddata");
    }
  }

  function captureVideoFrame(video) {
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    if (!sourceWidth || !sourceHeight) {
      throw new Error("Aus dem Video konnte kein Bild gelesen werden.");
    }

    const scale = Math.min(
      1,
      MAX_FRAME_EDGE / Math.max(sourceWidth, sourceHeight)
    );
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("Das Video konnte nicht vorbereitet werden.");
    }

    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#000000";
    context.fillRect(0, 0, width, height);
    context.drawImage(video, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", FRAME_JPEG_QUALITY);
  }

  async function extractVideoFrames(file, onProgress = null) {
    if (!isSupportedVideoFile(file)) {
      throw new Error("Bitte wähle ein unterstütztes Video aus.");
    }

    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    try {
      const metadataReady = waitForMediaEvent(video, "loadedmetadata");
      video.load();
      await metadataReady;

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        await waitForMediaEvent(video, "loadeddata");
      }

      const durationSeconds = Number(video.duration);

      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        throw new Error("Die Länge des Videos konnte nicht gelesen werden.");
      }

      const frameTimes = chooseFrameTimes(durationSeconds);
      const frames = [];

      for (let index = 0; index < frameTimes.length; index += 1) {
        await seekVideo(video, frameTimes[index]);
        frames.push(captureVideoFrame(video));

        if (typeof onProgress === "function") {
          onProgress(index + 1, frameTimes.length);
        }
      }

      return {
        durationSeconds,
        frames
      };
    } finally {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    }
  }

  globalScope.SolHoloMedia = Object.freeze({
    extractVideoFrames,
    formatDuration,
    isSupportedVideoFile
  });
})(window);
