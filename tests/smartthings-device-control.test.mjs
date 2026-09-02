import assert from "node:assert/strict";
import test from "node:test";

import {
  SAFE_SMARTTHINGS_ACTIONS,
  SmartThingsControlError,
  createSmartThingsDeviceControl
} from "../modules/smartthings-device-control.mjs";

const DEVICE_ONE =
  Object.freeze({
    components: [
      {
        capabilities: [
          {
            id:
              "switch"
          },
          {
            id:
              "lock"
          }
        ],
        id:
          "main"
      }
    ],
    deviceId:
      "device-1",
    label:
      "Wohnzimmerlampe",
    locationId:
      "location-1",
    roomId:
      "room-1"
  });

const DEVICE_TWO =
  Object.freeze({
    components: [
      {
        capabilities: [
          {
            id:
              "switch"
          }
        ],
        id:
          "main"
      }
    ],
    deviceId:
      "device-2",
    label:
      "Nicht freigegebenes Gerät",
    locationId:
      "location-1",
    roomId:
      "room-2"
  });

function jsonResponse(
  value,
  status = 200
) {
  return {
    json:
      async () => value,
    ok:
      status >= 200 &&
      status < 300,
    status
  };
}

function assertControlCode(code) {
  return (error) => {
    assert.ok(
      error instanceof
        SmartThingsControlError
    );

    assert.equal(
      error.code,
      code
    );

    return true;
  };
}

function createHarness({
  allowed = new Set([
    "device-1"
  ]),
  allowedProvider = null,
  confirmationTtlMs = 60_000,
  fetchHandler = null,
  initialNow = 1_000,
  scopedTokenProvider = null
} = {}) {
  const requests =
    [];

  let currentNow =
    initialNow;

  let tokenCalls =
    0;

  const defaultFetchHandler =
    async (
      url,
      options
    ) => {
      const parsedUrl =
        new URL(url);

      if (
        parsedUrl.pathname ===
        "/v1/devices"
      ) {
        return jsonResponse({
          items: [
            DEVICE_ONE,
            DEVICE_TWO
          ]
        });
      }

      if (
        parsedUrl.pathname ===
        "/v1/devices/device-1"
      ) {
        return jsonResponse(
          DEVICE_ONE
        );
      }

      if (
        parsedUrl.pathname ===
        "/v1/locations/location-1/rooms"
      ) {
        return jsonResponse({
          items: [
            {
              name:
                "Wohnzimmer",
              roomId:
                "room-1"
            },
            {
              name:
                "Verdeckter Raum",
              roomId:
                "room-2"
            }
          ]
        });
      }

      if (
        parsedUrl.pathname ===
          "/v1/devices/device-1/commands" &&
        options.method ===
          "POST"
      ) {
        return jsonResponse({
          accepted:
            true
        });
      }

      return jsonResponse(
        {},
        404
      );
    };

  const control =
    createSmartThingsDeviceControl({
      allowedDeviceIdsProvider:
        allowedProvider ||
        (
          async ({
            ownerId
          }) => ({
            deviceIds:
              allowed,
            ownerId
          })
        ),
      confirmationTtlMs,
      fetchImpl:
        async (
          url,
          options
        ) => {
          requests.push({
            options,
            url
          });

          return (
            fetchHandler ||
            defaultFetchHandler
          )(
            url,
            options
          );
        },
      now:
        () => currentNow,
      randomId:
        () => "confirm-00000001",
      randomToken:
        () =>
          "confirmation-token-0000000000000000000000000001",
      tokenProvider:
        scopedTokenProvider ||
        (
          async ({
            ownerId
          }) => {
          tokenCalls += 1;

          return {
            access_token:
              "secret-access-token",
            ownerId
          };
          }
        )
    });

  return {
    advance(milliseconds) {
      currentNow +=
        milliseconds;
    },
    allowed,
    control,
    requests,
    tokenCalls:
      () => tokenCalls
  };
}

test(
  "zeigt ausschließlich explizit freigegebene Geräte und deren Räume",
  async () => {
    const harness =
      createHarness();

    const devices =
      await harness.control
        .listDevices({
          locationId:
            "location-1",
          ownerId:
            "pam-sol"
        });

    assert.deepEqual(
      devices,
      [
        {
          deviceId:
            "device-1",
          label:
            "Wohnzimmerlampe",
          locationId:
            "location-1",
          roomId:
            "room-1",
          supportedActions: [
            "switch.off",
            "switch.on"
          ]
        }
      ]
    );

    const rooms =
      await harness.control
        .listRooms({
          locationId:
            "location-1",
          ownerId:
            "pam-sol"
        });

    assert.deepEqual(
      rooms,
      [
        {
          label:
            "Wohnzimmer",
          roomId:
            "room-1"
        }
      ]
    );

    assert.ok(
      harness.requests.every(
        (request) =>
          request.options.headers.Authorization ===
          "Bearer secret-access-token"
      )
    );

    assert.equal(
      devices.some(
        (device) =>
          device.deviceId ===
          "device-2"
      ),
      false
    );
  }
);

test(
  "ruft ohne freigegebene Geräte weder Token noch SmartThings ab",
  async () => {
    const harness =
      createHarness({
        allowed:
          new Set()
      });

    assert.deepEqual(
      await harness.control
        .listDevices({
          ownerId:
            "pam-sol"
        }),
      []
    );

    assert.equal(
      harness.requests.length,
      0
    );

    assert.equal(
      harness.tokenCalls(),
      0
    );
  }
);

test(
  "trennt Geräte- und Tokenzugriff strikt zwischen Pam und Steffi",
  async () => {
    const ownerDevices =
      new Map([
        [
          "pam-sol",
          new Set([
            "device-1"
          ])
        ],
        [
          "steffi-breeze",
          new Set([
            "device-2"
          ])
        ]
      ]);

    const harness =
      createHarness({
        allowedProvider:
          async ({
            ownerId
          }) => ({
            deviceIds:
              ownerDevices.get(
                ownerId
              ) ||
              new Set(),
            ownerId
          }),
        scopedTokenProvider:
          async ({
            ownerId
          }) => ({
            access_token:
              ownerId ===
                "pam-sol"
                ? "pam-token"
                : "steffi-token",
            ownerId
          })
      });

    const pamDevices =
      await harness.control
        .listDevices({
          ownerId:
            "pam-sol"
        });

    const steffiDevices =
      await harness.control
        .listDevices({
          ownerId:
            "steffi-breeze"
        });

    assert.deepEqual(
      pamDevices.map(
        (device) =>
          device.deviceId
      ),
      [
        "device-1"
      ]
    );

    assert.deepEqual(
      steffiDevices.map(
        (device) =>
          device.deviceId
      ),
      [
        "device-2"
      ]
    );

    assert.equal(
      harness.requests[0]
        .options.headers.Authorization,
      "Bearer pam-token"
    );

    assert.equal(
      harness.requests[1]
        .options.headers.Authorization,
      "Bearer steffi-token"
    );

    await assert.rejects(
      harness.control
        .prepareAction({
          action:
            "switch.on",
          deviceId:
            "device-1",
          ownerId:
            "steffi-breeze"
        }),
      assertControlCode(
        "DEVICE_NOT_ALLOWED"
      )
    );
  }
);

test(
  "lehnt ungebundene oder fremd gebundene Provider-Rückgaben ab",
  async (context) => {
    await context.test(
      "globale Gerätefreigabe",
      async () => {
        const harness =
          createHarness({
            allowedProvider:
              async () => ({
                deviceIds: [
                  "device-1"
                ],
                ownerId:
                  "pam-sol"
              })
          });

        await assert.rejects(
          harness.control
            .listDevices({
              ownerId:
                "steffi-breeze"
            }),
          assertControlCode(
            "OWNER_SCOPE_MISMATCH"
          )
        );

        assert.equal(
          harness.requests.length,
          0
        );
      }
    );

    await context.test(
      "globaler Token ohne ownerId",
      async () => {
        const harness =
          createHarness({
            scopedTokenProvider:
              async () =>
                "global-token"
          });

        await assert.rejects(
          harness.control
            .listDevices({
              ownerId:
                "pam-sol"
            }),
          assertControlCode(
            "OWNER_SCOPE_MISMATCH"
          )
        );

        assert.equal(
          harness.requests.length,
          0
        );
      }
    );
  }
);

test(
  "prepareAction erstellt nur eine verständliche Vorschau und führt nichts aus",
  async () => {
    const harness =
      createHarness();

    const prepared =
      await harness.control
        .prepareAction({
          action:
            "switch.on",
          deviceId:
            "device-1",
          ownerId:
            "pam-sol"
        });

    assert.equal(
      prepared.requiresConfirmation,
      true
    );

    assert.equal(
      prepared.preview.deviceLabel,
      "Wohnzimmerlampe"
    );

    assert.match(
      prepared.preview.text,
      /Erst deine ausdrückliche Bestätigung/
    );

    assert.equal(
      prepared.confirmation.expiresAt,
      61_000
    );

    assert.equal(
      harness.requests.filter(
        (request) =>
          request.options.method ===
          "POST"
      ).length,
      0
    );
  }
);

test(
  "führt ausschließlich den bestätigten Allowlist-Befehl aus und blockiert Replay",
  async () => {
    const harness =
      createHarness();

    const prepared =
      await harness.control
        .prepareAction({
          action:
            "switch.off",
          deviceId:
            "device-1",
          ownerId:
            "pam-sol"
        });

    const executeRequest = {
      confirmationId:
        prepared.confirmation.id,
      confirmationToken:
        prepared.confirmation.token,
      confirmed:
        true,
      ownerId:
        "pam-sol"
    };

    const result =
      await harness.control
        .executeConfirmedAction(
          executeRequest
        );

    assert.equal(
      result.executed,
      true
    );

    const commandRequests =
      harness.requests.filter(
        (request) =>
          request.options.method ===
          "POST"
      );

    assert.equal(
      commandRequests.length,
      1
    );

    assert.deepEqual(
      JSON.parse(
        commandRequests[0]
          .options.body
      ),
      {
        commands: [
          {
            arguments:
              [],
            capability:
              "switch",
            command:
              "off",
            component:
              "main"
          }
        ]
      }
    );

    await assert.rejects(
      harness.control
        .executeConfirmedAction(
          executeRequest
        ),
      assertControlCode(
        "CONFIRMATION_INVALID"
      )
    );

    assert.equal(
      harness.requests.filter(
        (request) =>
          request.options.method ===
          "POST"
      ).length,
      1
    );
  }
);

test(
  "blockiert unsichere Kommandos bereits vor Geräte- oder Tokenzugriff",
  async () => {
    const harness =
      createHarness();

    await assert.rejects(
      harness.control
        .prepareAction({
          action:
            "lock.unlock",
          deviceId:
            "device-1",
          ownerId:
            "pam-sol"
        }),
      assertControlCode(
        "UNSAFE_COMMAND"
      )
    );

    assert.deepEqual(
      SAFE_SMARTTHINGS_ACTIONS,
      [
        "switch.off",
        "switch.on"
      ]
    );

    assert.equal(
      harness.requests.length,
      0
    );
  }
);

test(
  "lehnt fehlende ausdrückliche Bestätigung ab und verbraucht die Challenge",
  async () => {
    const harness =
      createHarness();

    const prepared =
      await harness.control
        .prepareAction({
          action:
            "switch.on",
          deviceId:
            "device-1",
          ownerId:
            "pam-sol"
        });

    const request = {
      confirmationId:
        prepared.confirmation.id,
      confirmationToken:
        prepared.confirmation.token,
      confirmed:
        false,
      ownerId:
        "pam-sol"
    };

    await assert.rejects(
      harness.control
        .executeConfirmedAction(
          request
        ),
      assertControlCode(
        "CONFIRMATION_REQUIRED"
      )
    );

    await assert.rejects(
      harness.control
        .executeConfirmedAction({
          ...request,
          confirmed:
            true
        }),
      assertControlCode(
        "CONFIRMATION_INVALID"
      )
    );
  }
);

test(
  "Expiry, Owner-Mismatch und falscher Token scheitern geschlossen",
  async (context) => {
    await context.test(
      "abgelaufen",
      async () => {
        const harness =
          createHarness({
            confirmationTtlMs:
              1_000
          });

        const prepared =
          await harness.control
            .prepareAction({
              action:
                "switch.on",
              deviceId:
                "device-1",
              ownerId:
                "pam-sol"
            });

        harness.advance(
          1_001
        );

        await assert.rejects(
          harness.control
            .executeConfirmedAction({
              confirmationId:
                prepared.confirmation.id,
              confirmationToken:
                prepared.confirmation.token,
              confirmed:
                true,
              ownerId:
                "pam-sol"
            }),
          assertControlCode(
            "CONFIRMATION_EXPIRED"
          )
        );
      }
    );

    await context.test(
      "falscher Owner",
      async () => {
        const harness =
          createHarness();

        const prepared =
          await harness.control
            .prepareAction({
              action:
                "switch.on",
              deviceId:
                "device-1",
              ownerId:
                "pam-sol"
            });

        await assert.rejects(
          harness.control
            .executeConfirmedAction({
              confirmationId:
                prepared.confirmation.id,
              confirmationToken:
                prepared.confirmation.token,
              confirmed:
                true,
              ownerId:
                "other-owner"
            }),
          assertControlCode(
            "CONFIRMATION_OWNER_MISMATCH"
          )
        );

        await assert.rejects(
          harness.control
            .executeConfirmedAction({
              confirmationId:
                prepared.confirmation.id,
              confirmationToken:
                prepared.confirmation.token,
              confirmed:
                true,
              ownerId:
                "pam-sol"
            }),
          assertControlCode(
            "CONFIRMATION_INVALID"
          )
        );
      }
    );

    await context.test(
      "falscher Token",
      async () => {
        const harness =
          createHarness();

        const prepared =
          await harness.control
            .prepareAction({
              action:
                "switch.on",
              deviceId:
                "device-1",
              ownerId:
                "pam-sol"
            });

        await assert.rejects(
          harness.control
            .executeConfirmedAction({
              confirmationId:
                prepared.confirmation.id,
              confirmationToken:
                "wrong-confirmation-token-000000000000000000000",
              confirmed:
                true,
              ownerId:
                "pam-sol"
            }),
          assertControlCode(
            "CONFIRMATION_INVALID"
          )
        );
      }
    );
  }
);

test(
  "prüft die Gerätefreigabe unmittelbar vor der Ausführung erneut",
  async () => {
    const allowed =
      new Set([
        "device-1"
      ]);

    const harness =
      createHarness({
        allowed
      });

    const prepared =
      await harness.control
        .prepareAction({
          action:
            "switch.on",
          deviceId:
            "device-1",
          ownerId:
            "pam-sol"
        });

    allowed.clear();

    await assert.rejects(
      harness.control
        .executeConfirmedAction({
          confirmationId:
            prepared.confirmation.id,
          confirmationToken:
            prepared.confirmation.token,
          confirmed:
            true,
          ownerId:
            "pam-sol"
        }),
      assertControlCode(
        "DEVICE_NOT_ALLOWED"
      )
    );

    assert.equal(
      harness.requests.filter(
        (request) =>
          request.options.method ===
          "POST"
      ).length,
      0
    );
  }
);

test(
  "gibt weder Upstream-Inhalte noch Token in Fehlern preis",
  async () => {
    const harness =
      createHarness({
        fetchHandler:
          async () =>
            jsonResponse(
              {
                error:
                  "private upstream content secret-access-token"
              },
              500
            )
      });

    await assert.rejects(
      harness.control
        .listDevices({
          ownerId:
            "pam-sol"
        }),
      (error) => {
        assert.equal(
          error.code,
          "SMARTTHINGS_REQUEST_FAILED"
        );

        assert.doesNotMatch(
          error.message,
          /private|secret-access-token/i
        );

        return true;
      }
    );
  }
);
