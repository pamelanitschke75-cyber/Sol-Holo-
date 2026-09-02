import assert from "node:assert/strict";
import {
  readFileSync
} from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source =
  readFileSync(
    new URL(
      "../www/media-tools.js",
      import.meta.url
    ),
    "utf8"
  );

const browserWindow =
  {};

vm.runInNewContext(
  source,
  {
    Blob,
    HTMLMediaElement: {
      HAVE_CURRENT_DATA:
        2
    },
    URL,
    XMLHttpRequest:
      class {},
    clearTimeout,
    document:
      {},
    setTimeout,
    window:
      browserWindow
  }
);

const media =
  browserWindow.SolHoloMedia;

function namedBlob({
  name,
  sizeOverride = null,
  type
}) {
  const blob =
    new Blob(
      [new Uint8Array(16)],
      {
        type
      }
    );

  Object.defineProperty(
    blob,
    "name",
    {
      value:
        name
    }
  );

  if (
    sizeOverride !==
    null
  ) {
    Object.defineProperty(
      blob,
      "size",
      {
        value:
          sizeOverride
      }
    );
  }

  return blob;
}

test(
  "akzeptiert nur die vorgesehenen Videoformate",
  () => {
    assert.equal(
      media.validateVideoFile(
        namedBlob({
          name:
            "clip.mp4",
          type:
            "video/mp4"
        })
      ).mimeType,
      "video/mp4"
    );

    assert.equal(
      media.validateVideoFile(
        namedBlob({
          name:
            "clip.webm",
          type:
            "application/octet-stream"
        })
      ).mimeType,
      "video/webm"
    );

    assert.throws(
      () =>
        media.validateVideoFile(
          namedBlob({
            name:
              "clip.avi",
            type:
              "video/x-msvideo"
          })
        ),
      /nicht unterstützt/
    );
  }
);

test(
  "erzwingt die clientseitige 20-MB-Grenze vor einem Upload",
  () => {
    assert.throws(
      () =>
        media.validateVideoFile(
          namedBlob({
            name:
              "zu-gross.mp4",
            sizeOverride:
              media.limits.maxSizeBytes +
              1,
            type:
              "video/mp4"
          })
        ),
      /20 MB/
    );

    assert.equal(
      media.limits.maxDurationSeconds,
      180
    );
  }
);
