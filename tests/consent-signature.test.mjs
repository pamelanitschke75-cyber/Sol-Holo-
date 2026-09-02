import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { webcrypto } from "node:crypto";

import {
  ConsentValidationError,
  NativeSignerError,
  acceptNativeSignerResult,
  buildConsentRevocationRequest,
  buildNativeSignerRequest,
  canonicalizeConsentPayload,
  createConsentPayload,
  createSignedConsentReceipt,
  prepareConsentForNativeSigning,
  stableJson,
  validateConsentInput,
  validateNativeSignerResult
} from "../www/consent-signature.mjs";

const allowedOwnerIds = ["pam-owner", "steffi-owner"];
const validInput = {
  purpose: "Freigabe fuer eine klar bezeichnete Testfunktion",
  purposeVersion: "2.1",
  ownerId: "pam-owner",
  signerFullName: "Beispiel Person",
  explicitAcknowledgement: true,
  drawingPresent: true,
  consentInstanceId: "4e76d778-69a1-47de-8f84-3ec5ef74ec90",
  issuedAt: "2026-09-02T10:11:12.000Z"
};

test("kanonischer Consent ist stabil, normalisiert und zweckgebunden", () => {
  const first = canonicalizeConsentPayload(validInput, { allowedOwnerIds });
  const second = canonicalizeConsentPayload(
    {
      ...validInput,
      purpose: "  Freigabe   fuer eine klar bezeichnete Testfunktion  ",
      signerFullName: "Beispiel   Person"
    },
    { allowedOwnerIds }
  );

  assert.equal(first, second);
  assert.equal(first, stableJson(JSON.parse(first)));
  assert.match(first, /"purposeVersion":"2\.1"/u);
  assert.match(first, /"ownerId":"pam-owner"/u);
});

test("keine Owner-ID, Vorauswahl, Checkbox oder Zeichnung wird angenommen", () => {
  const validation = validateConsentInput(
    {
      ...validInput,
      ownerId: "",
      signerFullName: "P.",
      explicitAcknowledgement: false,
      drawingPresent: false
    },
    { allowedOwnerIds }
  );

  assert.equal(validation.ok, false);
  assert.deepEqual(
    validation.errors.map(error => error.field),
    [
      "ownerId",
      "signerFullName",
      "explicitAcknowledgement",
      "drawingPresent"
    ]
  );
  assert.throws(
    () => createConsentPayload({ ...validInput, ownerId: "other-owner" }, {
      allowedOwnerIds
    }),
    ConsentValidationError
  );
});

test("Signierauftrag enthaelt Hash und Consent, aber niemals rohe Zeichnungsdaten", async () => {
  const prepared = await prepareConsentForNativeSigning(
    {
      ...validInput,
      rawStrokePoints: [{ x: 111, y: 222 }],
      png: "data:image/png;base64,PRIVATE_DRAWING",
      debug: "PRIVATE_DRAWING"
    },
    {
      allowedOwnerIds,
      cryptoImplementation: webcrypto
    }
  );
  const request = buildNativeSignerRequest({
    ...prepared,
    rawStrokePoints: [{ x: 111, y: 222 }],
    png: "data:image/png;base64,PRIVATE_DRAWING"
  });
  const serialized = JSON.stringify(request);

  assert.match(request.payloadSha256, /^[a-f0-9]{64}$/u);
  assert.doesNotMatch(serialized, /PRIVATE_DRAWING|rawStrokePoints|image\/png/u);
  assert.equal(request.payload.visualSignatureEvidence, "canvas-mark-present");
  assert.equal(Object.hasOwn(request.payload, "drawingPresent"), false);
});

test("SHA-256 ist fuer denselben kanonischen Consent deterministisch", async () => {
  const first = await prepareConsentForNativeSigning(validInput, {
    allowedOwnerIds,
    cryptoImplementation: webcrypto
  });
  const second = await prepareConsentForNativeSigning(
    { ...validInput },
    {
      allowedOwnerIds,
      cryptoImplementation: webcrypto
    }
  );

  assert.equal(first.canonicalPayload, second.canonicalPayload);
  assert.equal(first.payloadSha256, second.payloadSha256);
});

test("nativer Signierer arbeitet fail-closed und muss exakt denselben Hash binden", async () => {
  const prepared = await prepareConsentForNativeSigning(validInput, {
    allowedOwnerIds,
    cryptoImplementation: webcrypto
  });
  const incomplete = validateNativeSignerResult(
    { ok: true, signature: "abc" },
    prepared.payloadSha256
  );
  const wrongHash = validateNativeSignerResult(
    {
      ok: true,
      payloadSha256: "0".repeat(64),
      signature: "opaque-signature",
      algorithm: "secure-hardware-algorithm",
      keyId: "native-key-reference",
      signatureFormat: "opaque"
    },
    prepared.payloadSha256
  );

  assert.equal(incomplete.ok, false);
  assert.equal(wrongHash.ok, false);
  assert.throws(
    () => acceptNativeSignerResult({}, prepared.payloadSha256),
    NativeSignerError
  );
  assert.throws(
    () => createSignedConsentReceipt(prepared, { state: "not-signed" }),
    NativeSignerError
  );
});

test("erfolgreiches Signierergebnis wird auf erlaubte Belegfelder reduziert", async () => {
  const prepared = await prepareConsentForNativeSigning(validInput, {
    allowedOwnerIds,
    cryptoImplementation: webcrypto
  });
  const accepted = acceptNativeSignerResult(
    {
      ok: true,
      payloadSha256: prepared.payloadSha256,
      signature: "opaque-native-signature",
      algorithm: "secure-hardware-algorithm",
      keyId: "native-key-reference",
      signatureFormat: "opaque",
      png: "PRIVATE_DRAWING",
      rawStrokePoints: [{ x: 1, y: 2 }],
      qualified: true
    },
    prepared.payloadSha256
  );
  const receipt = createSignedConsentReceipt(prepared, accepted);
  const serialized = JSON.stringify(receipt);

  assert.equal(receipt.state, "native-signature-created");
  assert.doesNotMatch(serialized, /PRIVATE_DRAWING|rawStrokePoints|qualified/u);
  assert.equal(receipt.nativeSignature.payloadSha256, prepared.payloadSha256);
});

test("Widerrufsauftrag ist minimal und enthaelt keine Signatur oder Zeichnung", async () => {
  const prepared = await prepareConsentForNativeSigning(validInput, {
    allowedOwnerIds,
    cryptoImplementation: webcrypto
  });
  const accepted = acceptNativeSignerResult(
    {
      ok: true,
      payloadSha256: prepared.payloadSha256,
      signature: "opaque-native-signature",
      algorithm: "secure-hardware-algorithm",
      keyId: "native-key-reference",
      signatureFormat: "opaque"
    },
    prepared.payloadSha256
  );
  const receipt = createSignedConsentReceipt(prepared, accepted);
  const revocation = buildConsentRevocationRequest(receipt, {
    requestedAt: "2026-09-03T11:12:13.000Z"
  });
  const serialized = JSON.stringify(revocation);

  assert.equal(revocation.ownerId, validInput.ownerId);
  assert.equal(revocation.payloadSha256, prepared.payloadSha256);
  assert.doesNotMatch(serialized, /opaque-native-signature|signerFullName|canvas/u);
});

test("Komponente verwendet keine Browser-Persistenz, Bildexporte oder Protokollierung", async () => {
  const source = await readFile(
    new URL("../www/consent-signature.mjs", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /localStorage|sessionStorage|indexedDB|toDataURL|toBlob|console\./u
  );
  assert.doesNotMatch(source, /Pamela|Stefanie|20\d{2}-\d{2}-\d{2}T/u);
});
