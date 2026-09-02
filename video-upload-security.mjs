const MEBIBYTE =
  1024 * 1024;

export const MAX_VIDEO_UPLOAD_BYTES =
  20 * MEBIBYTE;

export const MAX_VIDEO_DURATION_SECONDS =
  180;

export const MAX_VIDEO_TRANSCRIPT_LENGTH =
  6000;

const VIDEO_TYPE_DETAILS =
  new Map([
    [
      "video/mp4",
      {
        extension: "mp4",
        signature: "iso-base-media"
      }
    ],
    [
      "video/quicktime",
      {
        extension: "mov",
        signature: "iso-base-media"
      }
    ],
    [
      "video/x-m4v",
      {
        extension: "m4v",
        signature: "iso-base-media"
      }
    ],
    [
      "video/3gpp",
      {
        extension: "3gp",
        signature: "iso-base-media"
      }
    ],
    [
      "video/webm",
      {
        extension: "webm",
        signature: "webm"
      }
    ]
  ]);

function createVideoUploadError(
  message,
  statusCode = 400
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
}

export function normalizeVideoMimeType(
  value
) {
  return String(value || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

export function isAllowedVideoMimeType(
  value
) {
  return VIDEO_TYPE_DETAILS.has(
    normalizeVideoMimeType(value)
  );
}

function hasIsoBaseMediaSignature(
  buffer
) {
  return (
    buffer.length >= 12 &&
    buffer.subarray(4, 8).toString("ascii") ===
      "ftyp"
  );
}

function hasWebmSignature(
  buffer
) {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  );
}

export function validateVideoUpload({
  buffer,
  mimeType,
  durationSeconds
}) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0
  ) {
    throw createVideoUploadError(
      "Keine Videodaten erhalten."
    );
  }

  if (
    buffer.length >
    MAX_VIDEO_UPLOAD_BYTES
  ) {
    throw createVideoUploadError(
      "Das Video ist größer als 20 MB.",
      413
    );
  }

  const cleanMimeType =
    normalizeVideoMimeType(
      mimeType
    );

  const typeDetails =
    VIDEO_TYPE_DETAILS.get(
      cleanMimeType
    );

  if (!typeDetails) {
    throw createVideoUploadError(
      "Dieser Videotyp wird nicht unterstützt. Bitte wähle MP4, MOV, M4V, WebM oder 3GP."
    );
  }

  const hasExpectedSignature =
    typeDetails.signature ===
      "webm"
      ? hasWebmSignature(buffer)
      : hasIsoBaseMediaSignature(
          buffer
        );

  if (!hasExpectedSignature) {
    throw createVideoUploadError(
      "Die Videodatei stimmt nicht mit ihrem angegebenen Typ überein."
    );
  }

  const cleanDuration =
    Number(durationSeconds);

  if (
    !Number.isFinite(
      cleanDuration
    ) ||
    cleanDuration <= 0
  ) {
    throw createVideoUploadError(
      "Die Videolänge fehlt oder ist ungültig."
    );
  }

  if (
    cleanDuration >
    MAX_VIDEO_DURATION_SECONDS
  ) {
    throw createVideoUploadError(
      "Das Video ist länger als 3 Minuten."
    );
  }

  return {
    byteLength:
      buffer.length,
    durationSeconds:
      cleanDuration,
    extension:
      typeDetails.extension,
    mimeType:
      cleanMimeType
  };
}

export function normalizeVideoTranscript(
  value
) {
  const transcript =
    String(value || "")
      .replace(/\u0000/g, "")
      .trim();

  if (
    transcript.length >
    MAX_VIDEO_TRANSCRIPT_LENGTH
  ) {
    throw createVideoUploadError(
      "Der erkannte gesprochene Inhalt ist zu lang."
    );
  }

  return transcript;
}

export function normalizeVideoAudioStatus(
  value
) {
  const status =
    String(value || "")
      .trim()
      .toLowerCase();

  return new Set([
    "transcribed",
    "no_speech",
    "unavailable"
  ]).has(status)
    ? status
    : "unavailable";
}
