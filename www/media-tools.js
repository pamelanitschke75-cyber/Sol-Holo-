(function attachSolHoloMedia(globalScope) {
  "use strict";

  const MAX_VIDEO_FRAMES = 8;
  const MAX_FRAME_EDGE = 960;
  const FRAME_JPEG_QUALITY = 0.76;
  const MEDIA_EVENT_TIMEOUT_MS = 15000;
  const VIDEO_UPLOAD_TIMEOUT_MS = 120000;
  const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
  const MAX_VIDEO_DURATION_SECONDS = 180;
  const MAX_VIDEO_SOURCE_PIXELS = 4096 * 2160;

  const VIDEO_EXTENSION_TYPES = Object.freeze({
    "3gp": "video/3gpp",
    m4v: "video/x-m4v",
    mov: "video/quicktime",
    mp4: "video/mp4",
    webm: "video/webm"
  });

  const ALLOWED_VIDEO_TYPES = new Set(
    Object.values(VIDEO_EXTENSION_TYPES)
  );

  function fileExtension(fileName) {
    const match =
      String(fileName || "")
        .trim()
        .toLowerCase()
        .match(/\.([a-z0-9]+)$/);

    return match?.[1] || "";
  }

  function normalizeVideoMimeType(file) {
    const declaredType =
      String(file?.type || "")
        .split(";", 1)[0]
        .trim()
        .toLowerCase();

    if (ALLOWED_VIDEO_TYPES.has(declaredType)) {
      return declaredType;
    }

    if (
      declaredType &&
      declaredType !== "application/octet-stream"
    ) {
      return "";
    }

    return VIDEO_EXTENSION_TYPES[
      fileExtension(file?.name)
    ] || "";
  }

  function validateVideoFile(file) {
    if (!(file instanceof Blob)) {
      throw new Error("Bitte wähle ein Video aus.");
    }

    const mimeType =
      normalizeVideoMimeType(file);

    if (!mimeType) {
      throw new Error(
        "Dieser Videotyp wird nicht unterstützt. Bitte wähle MP4, MOV, M4V, WebM oder 3GP."
      );
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      throw new Error("Die ausgewählte Videodatei ist leer.");
    }

    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error(
        "Das Video ist größer als 20 MB. Bitte wähle einen kürzeren Ausschnitt."
      );
    }

    return {
      mimeType,
      sizeBytes: file.size
    };
  }

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
    try {
      validateVideoFile(file);
      return true;
    } catch {
      return false;
    }
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
    const videoFile =
      validateVideoFile(file);

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

      if (durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
        throw new Error(
          "Das Video ist länger als 3 Minuten. Bitte wähle einen kürzeren Ausschnitt."
        );
      }

      if (
        !video.videoWidth ||
        !video.videoHeight ||
        video.videoWidth * video.videoHeight >
          MAX_VIDEO_SOURCE_PIXELS
      ) {
        throw new Error(
          "Die Videoauflösung ist größer als 4K und kann auf diesem Handy nicht sicher vorbereitet werden."
        );
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
        frames,
        mimeType: videoFile.mimeType,
        sizeBytes: videoFile.sizeBytes
      };
    } finally {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    }
  }

  function uploadVideoForAudioAnalysis({
    backendUrl,
    durationSeconds,
    file,
    onProgress = null,
    onStage = null,
    signal = null
  }) {
    const videoFile =
      validateVideoFile(file);

    const cleanDuration =
      Number(durationSeconds);

    if (
      !Number.isFinite(cleanDuration) ||
      cleanDuration <= 0 ||
      cleanDuration > MAX_VIDEO_DURATION_SECONDS
    ) {
      return Promise.reject(
        new Error("Die Videolänge ist ungültig oder größer als 3 Minuten.")
      );
    }

    const endpoint =
      `${String(backendUrl || "").replace(/\/$/, "")}/sol/video-transcript`;

    return new Promise((resolve, reject) => {
      const request =
        new XMLHttpRequest();

      let settled =
        false;

      const createAbortError = () => {
        const error =
          new Error("Videosenden wurde abgebrochen.");

        error.name =
          "AbortError";

        return error;
      };

      const cleanup = () => {
        signal?.removeEventListener(
          "abort",
          handleSignalAbort
        );
      };

      const finish = (callback, value) => {
        if (settled) {
          return;
        }

        settled =
          true;

        cleanup();
        callback(value);
      };

      const handleSignalAbort = () => {
        request.abort();
      };

      request.open(
        "POST",
        endpoint,
        true
      );

      request.timeout =
        VIDEO_UPLOAD_TIMEOUT_MS;

      request.setRequestHeader(
        "Content-Type",
        videoFile.mimeType
      );

      request.setRequestHeader(
        "X-Sol-Video-Duration",
        String(cleanDuration)
      );

      request.setRequestHeader(
        "X-Sol-Video-Confirmation",
        "send-once"
      );

      request.upload.addEventListener(
        "progress",
        (event) => {
          if (!event.lengthComputable) {
            return;
          }

          const percent =
            Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  (event.loaded / event.total) * 100
                )
              )
            );

          if (typeof onProgress === "function") {
            onProgress(percent);
          }
        }
      );

      request.upload.addEventListener(
        "load",
        () => {
          if (typeof onProgress === "function") {
            onProgress(100);
          }

          if (typeof onStage === "function") {
            onStage("analyzing");
          }
        }
      );

      request.addEventListener(
        "load",
        () => {
          let data =
            null;

          try {
            data =
              JSON.parse(
                request.responseText || "{}"
              );
          } catch {
            finish(
              reject,
              new Error(
                request.status >= 200 && request.status < 300
                  ? "Die Ton-Auswertung hat keine gültige Antwort geliefert."
                  : `Serverfehler (${request.status || "ohne Status"}).`
              )
            );

            return;
          }

          if (
            request.status < 200 ||
            request.status >= 300
          ) {
            finish(
              reject,
              new Error(
                data?.error ||
                "Das Video konnte nicht sicher übertragen werden."
              )
            );

            return;
          }

          finish(resolve, data);
        }
      );

      request.addEventListener(
        "error",
        () =>
          finish(
            reject,
            new Error(
              "Die Videoübertragung ist fehlgeschlagen. Das ausgewählte Video bleibt zum erneuten Senden erhalten."
            )
          )
      );

      request.addEventListener(
        "timeout",
        () =>
          finish(
            reject,
            new Error(
              "Die Videoübertragung hat zu lange gedauert. Das ausgewählte Video bleibt erhalten."
            )
          )
      );

      request.addEventListener(
        "abort",
        () =>
          finish(
            reject,
            createAbortError()
          )
      );

      if (signal?.aborted) {
        finish(
          reject,
          createAbortError()
        );

        return;
      }

      signal?.addEventListener(
        "abort",
        handleSignalAbort,
        {
          once: true
        }
      );

      if (typeof onStage === "function") {
        onStage("uploading");
      }

      request.send(file);
    });
  }

  globalScope.SolHoloMedia = Object.freeze({
    extractVideoFrames,
    formatDuration,
    isSupportedVideoFile,
    limits: Object.freeze({
      maxDurationSeconds: MAX_VIDEO_DURATION_SECONDS,
      maxSizeBytes: MAX_VIDEO_BYTES
    }),
    normalizeVideoMimeType,
    uploadVideoForAudioAnalysis,
    validateVideoFile
  });
})(window);
