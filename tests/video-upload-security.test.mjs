import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_TRANSCRIPT_LENGTH,
  MAX_VIDEO_UPLOAD_BYTES,
  normalizeVideoAudioStatus,
  normalizeVideoMimeType,
  normalizeVideoTranscript,
  validateVideoUpload
} from "../video-upload-security.mjs";

function createMp4Buffer(
  length = 32
) {
  const buffer =
    Buffer.alloc(length);

  buffer.write("ftyp", 4, "ascii");

  return buffer;
}

function createWebmBuffer() {
  return Buffer.from([
    0x1a,
    0x45,
    0xdf,
    0xa3,
    0x42,
    0x86
  ]);
}

test(
  "akzeptiert geprüfte MP4- und WebM-Daten",
  () => {
    assert.deepEqual(
      validateVideoUpload({
        buffer:
          createMp4Buffer(),
        durationSeconds:
          42.5,
        mimeType:
          "video/mp4; codecs=avc1"
      }),
      {
        byteLength: 32,
        durationSeconds: 42.5,
        extension: "mp4",
        mimeType: "video/mp4"
      }
    );

    assert.equal(
      validateVideoUpload({
        buffer:
          createWebmBuffer(),
        durationSeconds:
          5,
        mimeType:
          "video/webm"
      }).extension,
      "webm"
    );
  }
);

test(
  "lehnt falschen Typ und falsche Dateisignatur ab",
  () => {
    assert.throws(
      () =>
        validateVideoUpload({
          buffer:
            createMp4Buffer(),
          durationSeconds:
            5,
          mimeType:
            "application/octet-stream"
        }),
      /Videotyp/
    );

    assert.throws(
      () =>
        validateVideoUpload({
          buffer:
            Buffer.alloc(32),
          durationSeconds:
            5,
          mimeType:
            "video/mp4"
        }),
      /stimmt nicht/
    );
  }
);

test(
  "erzwingt Größen- und Dauergrenzen",
  () => {
    const oversized =
      createMp4Buffer(
        MAX_VIDEO_UPLOAD_BYTES + 1
      );

    assert.throws(
      () =>
        validateVideoUpload({
          buffer:
            oversized,
          durationSeconds:
            5,
          mimeType:
            "video/mp4"
        }),
      /20 MB/
    );

    assert.throws(
      () =>
        validateVideoUpload({
          buffer:
            createMp4Buffer(),
          durationSeconds:
            MAX_VIDEO_DURATION_SECONDS +
            0.01,
          mimeType:
            "video/mp4"
        }),
      /3 Minuten/
    );
  }
);

test(
  "bereinigt Transkript und Audio-Status ohne Inhalte zu erfinden",
  () => {
    assert.equal(
      normalizeVideoTranscript(
        "  Hallo\u0000 Pam  "
      ),
      "Hallo Pam"
    );

    assert.throws(
      () =>
        normalizeVideoTranscript(
          "x".repeat(
            MAX_VIDEO_TRANSCRIPT_LENGTH +
            1
          )
        ),
      /zu lang/
    );

    assert.equal(
      normalizeVideoAudioStatus(
        "transcribed"
      ),
      "transcribed"
    );

    assert.equal(
      normalizeVideoAudioStatus(
        "irgendetwas"
      ),
      "unavailable"
    );

    assert.equal(
      normalizeVideoMimeType(
        " Video/MP4; codecs=avc1 "
      ),
      "video/mp4"
    );
  }
);
