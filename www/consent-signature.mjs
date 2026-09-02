const CONSENT_SCHEMA = "sol-holo.explicit-consent.v1";
const SIGNER_REQUEST_SCHEMA = "sol-holo.native-sign-request.v1";
const REVOCATION_REQUEST_SCHEMA = "sol-holo.consent-revocation.v1";

let componentSequence = 0;

function normalizeText(value, maximumLength) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, maximumLength);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }

  return Object.freeze(value);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function stableJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => stableJson(item)).join(",")}]`;
  }

  if (!isPlainObject(value)) {
    throw new TypeError("Nur JSON-kompatible Objekte duerfen kanonisiert werden.");
  }

  const keys = Object.keys(value)
    .filter(key => value[key] !== undefined)
    .sort();
  return `{${keys
    .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(",")}}`;
}

function isExpandedName(value) {
  const name = normalizeText(value, 160);
  const parts = name.split(" ").filter(Boolean);

  return (
    name.length >= 4 &&
    parts.length >= 2 &&
    parts.every(part => !/^\p{L}\.?$/u.test(part))
  );
}

function isValidIsoDate(value) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime());
}

export function validateConsentInput(input, options = {}) {
  const errors = [];
  const allowedOwnerIds = new Set(
    (options.allowedOwnerIds || [])
      .map(ownerId => normalizeText(ownerId, 80))
      .filter(Boolean)
  );
  const purpose = normalizeText(input?.purpose, 1000);
  const purposeVersion = normalizeText(input?.purposeVersion, 80);
  const ownerId = normalizeText(input?.ownerId, 80);
  const signerFullName = normalizeText(input?.signerFullName, 160);
  const consentInstanceId = normalizeText(input?.consentInstanceId, 160);

  if (!purpose) {
    errors.push({ field: "purpose", code: "required" });
  }

  if (!purposeVersion) {
    errors.push({ field: "purposeVersion", code: "required" });
  }

  if (!ownerId) {
    errors.push({ field: "ownerId", code: "required" });
  } else if (allowedOwnerIds.size > 0 && !allowedOwnerIds.has(ownerId)) {
    errors.push({ field: "ownerId", code: "not-allowed" });
  }

  if (!isExpandedName(signerFullName)) {
    errors.push({ field: "signerFullName", code: "expanded-name-required" });
  }

  if (input?.explicitAcknowledgement !== true) {
    errors.push({ field: "explicitAcknowledgement", code: "required" });
  }

  if (input?.drawingPresent !== true) {
    errors.push({ field: "drawingPresent", code: "required" });
  }

  if (!consentInstanceId) {
    errors.push({ field: "consentInstanceId", code: "required" });
  }

  if (!isValidIsoDate(input?.issuedAt)) {
    errors.push({ field: "issuedAt", code: "invalid" });
  }

  return deepFreeze({
    ok: errors.length === 0,
    errors
  });
}

export class ConsentValidationError extends Error {
  constructor(errors) {
    super("Die explizite Einwilligung ist unvollstaendig.");
    this.name = "ConsentValidationError";
    this.errors = errors;
  }
}

export function createConsentPayload(input, options = {}) {
  const normalizedInput = {
    purpose: normalizeText(input?.purpose, 1000),
    purposeVersion: normalizeText(input?.purposeVersion, 80),
    ownerId: normalizeText(input?.ownerId, 80),
    signerFullName: normalizeText(input?.signerFullName, 160),
    explicitAcknowledgement: input?.explicitAcknowledgement === true,
    drawingPresent: input?.drawingPresent === true,
    consentInstanceId: normalizeText(input?.consentInstanceId, 160),
    issuedAt: input?.issuedAt
  };
  const validation = validateConsentInput(normalizedInput, options);

  if (!validation.ok) {
    throw new ConsentValidationError(validation.errors);
  }

  return deepFreeze({
    schema: CONSENT_SCHEMA,
    consentInstanceId: normalizedInput.consentInstanceId,
    purpose: normalizedInput.purpose,
    purposeVersion: normalizedInput.purposeVersion,
    ownerId: normalizedInput.ownerId,
    signerFullName: normalizedInput.signerFullName,
    explicitAcknowledgement: true,
    visualSignatureEvidence: "canvas-mark-present",
    issuedAt: new Date(normalizedInput.issuedAt).toISOString()
  });
}

export function canonicalizeConsentPayload(input, options = {}) {
  return stableJson(createConsentPayload(input, options));
}

export async function sha256Hex(value, cryptoImplementation = globalThis.crypto) {
  if (!cryptoImplementation?.subtle?.digest) {
    throw new Error("SHA-256 ist in dieser Laufzeit nicht verfuegbar.");
  }

  const bytes = new TextEncoder().encode(String(value));
  const digest = await cryptoImplementation.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export function createConsentInstanceId(
  cryptoImplementation = globalThis.crypto
) {
  if (typeof cryptoImplementation?.randomUUID === "function") {
    return cryptoImplementation.randomUUID();
  }

  if (typeof cryptoImplementation?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoImplementation.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte =>
      byte.toString(16).padStart(2, "0")
    ).join("");
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20)
    ].join("-");
  }

  throw new Error("Sichere Zufallswerte sind in dieser Laufzeit nicht verfuegbar.");
}

export async function prepareConsentForNativeSigning(
  input,
  options = {}
) {
  const payload = createConsentPayload(input, options);
  const canonicalPayload = stableJson(payload);
  const payloadSha256 = await sha256Hex(
    canonicalPayload,
    options.cryptoImplementation
  );

  return deepFreeze({
    payload,
    canonicalPayload,
    payloadSha256
  });
}

export function buildNativeSignerRequest(preparedConsent) {
  const payload = preparedConsent?.payload;
  const canonicalPayload = String(preparedConsent?.canonicalPayload || "");
  const payloadSha256 = String(preparedConsent?.payloadSha256 || "");

  if (
    !payload ||
    !canonicalPayload ||
    !/^[a-f0-9]{64}$/u.test(payloadSha256)
  ) {
    throw new Error("Der kanonische Signierauftrag ist unvollstaendig.");
  }

  // Ausschliesslich der kanonische Einwilligungsbeleg und sein Hash werden an
  // den nativen Signierer uebergeben. Canvas-Pixel und Stiftpunkte existieren
  // in diesem Auftrag absichtlich nicht.
  return deepFreeze({
    schema: SIGNER_REQUEST_SCHEMA,
    payload,
    canonicalPayload,
    payloadSha256
  });
}

export function validateNativeSignerResult(result, expectedPayloadSha256) {
  const errors = [];
  const expectedHash = String(expectedPayloadSha256 || "").toLowerCase();
  const returnedHash = String(result?.payloadSha256 || "").toLowerCase();
  const signature = String(result?.signature || "").trim();
  const algorithm = normalizeText(result?.algorithm, 120);
  const keyId = normalizeText(result?.keyId, 240);
  const signatureFormat = normalizeText(result?.signatureFormat, 80);

  if (result?.ok !== true) errors.push("signer-not-successful");
  if (!/^[a-f0-9]{64}$/u.test(expectedHash)) errors.push("expected-hash-invalid");
  if (returnedHash !== expectedHash) errors.push("payload-hash-mismatch");
  if (!signature || signature.length > 32768) errors.push("signature-invalid");
  if (!algorithm) errors.push("algorithm-required");
  if (!keyId) errors.push("key-id-required");
  if (!signatureFormat) errors.push("signature-format-required");

  return deepFreeze({
    ok: errors.length === 0,
    errors
  });
}

export class NativeSignerError extends Error {
  constructor(errors) {
    super("Der native Signierer hat kein gueltiges Ergebnis geliefert.");
    this.name = "NativeSignerError";
    this.errors = errors;
  }
}

export function acceptNativeSignerResult(result, expectedPayloadSha256) {
  const validation = validateNativeSignerResult(
    result,
    expectedPayloadSha256
  );

  if (!validation.ok) {
    throw new NativeSignerError(validation.errors);
  }

  return deepFreeze({
    state: "native-signature-created",
    payloadSha256: String(expectedPayloadSha256).toLowerCase(),
    algorithm: normalizeText(result.algorithm, 120),
    keyId: normalizeText(result.keyId, 240),
    signatureFormat: normalizeText(result.signatureFormat, 80),
    signature: String(result.signature).trim()
  });
}

export function createSignedConsentReceipt(preparedConsent, signerResult) {
  if (signerResult?.state !== "native-signature-created") {
    throw new NativeSignerError(["native-signature-required"]);
  }

  if (signerResult.payloadSha256 !== preparedConsent?.payloadSha256) {
    throw new NativeSignerError(["receipt-hash-mismatch"]);
  }

  return deepFreeze({
    state: "native-signature-created",
    payload: preparedConsent.payload,
    canonicalPayload: preparedConsent.canonicalPayload,
    payloadSha256: preparedConsent.payloadSha256,
    nativeSignature: signerResult
  });
}

export function buildConsentRevocationRequest(receipt, input = {}) {
  if (
    receipt?.state !== "native-signature-created" ||
    !/^[a-f0-9]{64}$/u.test(String(receipt?.payloadSha256 || ""))
  ) {
    throw new Error("Nur ein erfolgreich signierter Beleg kann widerrufen werden.");
  }

  if (!isValidIsoDate(input.requestedAt)) {
    throw new Error("Der Widerrufszeitpunkt ist ungueltig.");
  }

  return deepFreeze({
    schema: REVOCATION_REQUEST_SCHEMA,
    consentInstanceId: receipt.payload.consentInstanceId,
    payloadSha256: receipt.payloadSha256,
    ownerId: receipt.payload.ownerId,
    purpose: receipt.payload.purpose,
    purposeVersion: receipt.payload.purposeVersion,
    requestedAt: new Date(input.requestedAt).toISOString(),
    reason: normalizeText(input.reason, 240) || "not-specified"
  });
}

function cloneReceipt(receipt) {
  return receipt ? JSON.parse(JSON.stringify(receipt)) : null;
}

function setStyles(element, styles) {
  Object.assign(element.style, styles);
  return element;
}

function createElement(documentRef, name, text) {
  const element = documentRef.createElement(name);
  if (text !== undefined) element.textContent = text;
  return element;
}

function validateOwners(owners) {
  if (!Array.isArray(owners) || owners.length === 0) {
    throw new Error("Mindestens eine explizite Owner-ID muss konfiguriert sein.");
  }

  const normalized = owners.map(owner => ({
    id: normalizeText(owner?.id, 80),
    label: normalizeText(owner?.label, 120)
  }));

  if (normalized.some(owner => !owner.id || !owner.label)) {
    throw new Error("Jede Owner-Auswahl benoetigt ID und sichtbare Bezeichnung.");
  }

  if (new Set(normalized.map(owner => owner.id)).size !== normalized.length) {
    throw new Error("Owner-IDs muessen eindeutig sein.");
  }

  return deepFreeze(normalized);
}

export function createConsentSignatureComponent(options = {}) {
  const documentRef = options.documentRef || globalThis.document;
  const container = options.container;
  const purpose = normalizeText(options.purpose, 1000);
  const purposeVersion = normalizeText(options.purposeVersion, 80);
  const owners = validateOwners(options.owners);
  const signer = options.signer;
  const revokeConsent = options.revokeConsent;
  const cryptoImplementation = options.cryptoImplementation || globalThis.crypto;
  const clock = typeof options.clock === "function"
    ? options.clock
    : () => new Date();

  if (!documentRef?.createElement || !container?.appendChild) {
    throw new Error("Ein DOM-Container ist fuer das Unterschriftsfeld erforderlich.");
  }

  if (!purpose || !purposeVersion) {
    throw new Error("Zweck und Version muessen sichtbar konfiguriert sein.");
  }

  if (typeof signer !== "function") {
    throw new Error("Ein nativer async Signierer muss injiziert werden.");
  }

  const componentId = `consent-signature-${++componentSequence}`;
  const root = createElement(documentRef, "section");
  root.setAttribute("aria-labelledby", `${componentId}-title`);
  root.dataset.state = "idle";
  setStyles(root, {
    display: "grid",
    gap: "14px",
    padding: "18px",
    border: "1px solid currentColor",
    borderRadius: "18px",
    color: "inherit",
    background: "rgba(7, 12, 29, .82)"
  });

  const title = createElement(
    documentRef,
    "h2",
    options.title || "Explizite Einwilligung unterschreiben"
  );
  title.id = `${componentId}-title`;
  setStyles(title, { margin: "0", fontSize: "1.2rem" });
  root.appendChild(title);

  const purposeBox = createElement(documentRef, "div");
  purposeBox.setAttribute("aria-label", "Zweck und Version dieser Einwilligung");
  const purposeLabel = createElement(documentRef, "strong", "Zweck: ");
  const purposeValue = createElement(documentRef, "span", purpose);
  const versionLine = createElement(documentRef, "div");
  const versionLabel = createElement(documentRef, "strong", "Version: ");
  const versionValue = createElement(documentRef, "span", purposeVersion);
  purposeBox.append(purposeLabel, purposeValue);
  versionLine.append(versionLabel, versionValue);
  purposeBox.appendChild(versionLine);
  root.appendChild(purposeBox);

  const ownerFieldset = createElement(documentRef, "fieldset");
  const ownerLegend = createElement(
    documentRef,
    "legend",
    "Owner-ID bewusst auswaehlen"
  );
  ownerFieldset.appendChild(ownerLegend);
  setStyles(ownerFieldset, {
    display: "grid",
    gap: "8px",
    margin: "0",
    padding: "12px"
  });
  const ownerInputs = [];

  owners.forEach((owner, index) => {
    const label = createElement(documentRef, "label");
    setStyles(label, {
      display: "flex",
      alignItems: "center",
      gap: "9px",
      minHeight: "44px",
      cursor: "pointer"
    });
    const radio = createElement(documentRef, "input");
    radio.type = "radio";
    radio.name = `${componentId}-owner`;
    radio.value = owner.id;
    radio.id = `${componentId}-owner-${index}`;
    radio.checked = false;
    label.append(
      radio,
      createElement(
        documentRef,
        "span",
        `${owner.label} · Owner-ID: ${owner.id}`
      )
    );
    ownerInputs.push(radio);
    ownerFieldset.appendChild(label);
  });
  root.appendChild(ownerFieldset);

  const nameLabel = createElement(
    documentRef,
    "label",
    "Vollstaendigen ausgeschriebenen Namen eingeben"
  );
  nameLabel.htmlFor = `${componentId}-name`;
  const nameInput = createElement(documentRef, "input");
  nameInput.id = `${componentId}-name`;
  nameInput.type = "text";
  nameInput.autocomplete = "name";
  nameInput.maxLength = 160;
  nameInput.required = true;
  nameInput.spellcheck = false;
  setStyles(nameInput, {
    width: "100%",
    minHeight: "46px",
    boxSizing: "border-box",
    marginTop: "6px",
    padding: "10px 12px",
    borderRadius: "10px",
    font: "inherit"
  });
  nameLabel.appendChild(nameInput);
  root.appendChild(nameLabel);

  const acknowledgementLabel = createElement(documentRef, "label");
  setStyles(acknowledgementLabel, {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    minHeight: "44px",
    cursor: "pointer"
  });
  const acknowledgement = createElement(documentRef, "input");
  acknowledgement.type = "checkbox";
  acknowledgement.checked = false;
  acknowledgement.required = true;
  acknowledgement.setAttribute("aria-describedby", `${componentId}-purpose-note`);
  const acknowledgementText = createElement(
    documentRef,
    "span",
    "Ich habe den oben sichtbaren Zweck und die Version gelesen und bestaetige diese Einwilligung bewusst."
  );
  acknowledgementLabel.append(acknowledgement, acknowledgementText);
  root.appendChild(acknowledgementLabel);

  const purposeNote = createElement(
    documentRef,
    "p",
    "Dieses Feld erstellt einen technischen Projektbeleg. Es behauptet keine qualifizierte oder automatisch rechtswirksame elektronische Signatur."
  );
  purposeNote.id = `${componentId}-purpose-note`;
  setStyles(purposeNote, { margin: "0", fontSize: ".9rem", opacity: ".85" });
  root.appendChild(purposeNote);

  const drawingGroup = createElement(documentRef, "div");
  const drawingLabel = createElement(
    documentRef,
    "strong",
    "Unterschrift mit Stift, Finger oder Maus zeichnen"
  );
  const drawingInstructions = createElement(
    documentRef,
    "p",
    "Das Feld speichert oder uebermittelt weder Stiftpunkte noch ein Bild. Mit Entf oder Ruecktaste kann die Zeichnung geloescht werden."
  );
  drawingInstructions.id = `${componentId}-drawing-help`;
  setStyles(drawingInstructions, { margin: "5px 0 8px", fontSize: ".9rem" });
  const canvas = createElement(documentRef, "canvas");
  canvas.width = 600;
  canvas.height = 180;
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Leeres Feld fuer handschriftliche Unterschrift");
  canvas.setAttribute("aria-describedby", drawingInstructions.id);
  setStyles(canvas, {
    display: "block",
    width: "100%",
    height: "180px",
    boxSizing: "border-box",
    border: "2px solid currentColor",
    borderRadius: "12px",
    background: "#fff",
    touchAction: "none",
    cursor: "crosshair"
  });
  drawingGroup.append(drawingLabel, drawingInstructions, canvas);
  root.appendChild(drawingGroup);

  const actionRow = createElement(documentRef, "div");
  setStyles(actionRow, {
    display: "flex",
    flexWrap: "wrap",
    gap: "9px"
  });

  function actionButton(text) {
    const button = createElement(documentRef, "button", text);
    button.type = "button";
    setStyles(button, {
      minHeight: "44px",
      padding: "9px 14px",
      borderRadius: "11px",
      font: "inherit",
      cursor: "pointer"
    });
    return button;
  }

  const clearButton = actionButton("Zeichnung loeschen");
  const cancelButton = actionButton("Abbrechen");
  const signButton = actionButton("Jetzt signieren");
  const revokeButton = actionButton("Einwilligung widerrufen");
  revokeButton.hidden = true;
  actionRow.append(clearButton, cancelButton, signButton, revokeButton);
  root.appendChild(actionRow);

  const status = createElement(documentRef, "p", "Noch nicht signiert.");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  setStyles(status, { minHeight: "1.5em", margin: "0", fontWeight: "600" });
  root.appendChild(status);

  container.appendChild(root);

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    root.remove();
    throw new Error("Das Canvas-Unterschriftsfeld ist nicht verfuegbar.");
  }

  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#111";
  context.fillStyle = "#111";
  context.lineWidth = 3.2;
  context.lineCap = "round";
  context.lineJoin = "round";

  let lastPoint = null;
  let pointerId = null;
  let drawingPointCount = 0;
  let drawingDistance = 0;
  let busy = false;
  let destroyed = false;
  let receipt = null;
  let revokeArmed = false;

  function emitStatus(state, message, payloadSha256) {
    root.dataset.state = state;
    status.textContent = message;
    if (typeof options.onStatus === "function") {
      try {
        options.onStatus(
          deepFreeze({
            state,
            message,
            payloadSha256: payloadSha256 || null
          })
        );
      } catch {}
    }
  }

  function pointFromEvent(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * canvas.width / Math.max(1, bounds.width),
      y: (event.clientY - bounds.top) * canvas.height / Math.max(1, bounds.height)
    };
  }

  function clearDrawing() {
    lastPoint = null;
    pointerId = null;
    drawingPointCount = 0;
    drawingDistance = 0;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#111";
    context.fillStyle = "#111";
    canvas.setAttribute("aria-label", "Leeres Feld fuer handschriftliche Unterschrift");
  }

  function drawingPresent() {
    return drawingPointCount >= 2 && drawingDistance >= 8;
  }

  function beginStroke(event) {
    if (busy || receipt || event.button > 0) return;
    event.preventDefault();
    pointerId = event.pointerId;
    canvas.setPointerCapture?.(pointerId);
    lastPoint = pointFromEvent(event);
    drawingPointCount += 1;
    context.beginPath();
    context.arc(lastPoint.x, lastPoint.y, 1.6, 0, Math.PI * 2);
    context.fill();
  }

  function continueStroke(event) {
    if (event.pointerId !== pointerId || !lastPoint || busy || receipt) return;
    event.preventDefault();
    const nextPoint = pointFromEvent(event);
    const distance = Math.hypot(
      nextPoint.x - lastPoint.x,
      nextPoint.y - lastPoint.y
    );
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.stroke();
    drawingPointCount += 1;
    drawingDistance += distance;
    lastPoint = nextPoint;
    canvas.setAttribute("aria-label", "Handschriftliche Markierung vorhanden");
  }

  function endStroke(event) {
    if (event.pointerId !== pointerId) return;
    canvas.releasePointerCapture?.(pointerId);
    lastPoint = null;
    pointerId = null;
  }

  function selectedOwnerId() {
    return ownerInputs.find(input => input.checked)?.value || "";
  }

  function setBusy(nextBusy) {
    busy = nextBusy;
    signButton.disabled = busy || Boolean(receipt);
    clearButton.disabled = busy || Boolean(receipt);
    cancelButton.disabled = busy || Boolean(receipt);
    revokeButton.disabled = busy;
    nameInput.disabled = busy || Boolean(receipt);
    acknowledgement.disabled = busy || Boolean(receipt);
    ownerInputs.forEach(input => {
      input.disabled = busy || Boolean(receipt);
    });
  }

  function resetForm() {
    receipt = null;
    revokeArmed = false;
    ownerInputs.forEach(input => {
      input.checked = false;
      input.removeAttribute("aria-invalid");
    });
    nameInput.value = "";
    nameInput.removeAttribute("aria-invalid");
    acknowledgement.checked = false;
    acknowledgement.removeAttribute("aria-invalid");
    clearDrawing();
    revokeButton.hidden = true;
    revokeButton.textContent = "Einwilligung widerrufen";
    setBusy(false);
  }

  function focusFirstError(errors) {
    const fields = new Set(errors.map(error => error.field));
    if (fields.has("ownerId")) {
      ownerInputs.forEach(input => input.setAttribute("aria-invalid", "true"));
      ownerInputs[0]?.focus();
      return;
    }
    if (fields.has("signerFullName")) {
      nameInput.setAttribute("aria-invalid", "true");
      nameInput.focus();
      return;
    }
    if (fields.has("explicitAcknowledgement")) {
      acknowledgement.setAttribute("aria-invalid", "true");
      acknowledgement.focus();
      return;
    }
    if (fields.has("drawingPresent")) {
      canvas.setAttribute("aria-invalid", "true");
      canvas.focus();
    }
  }

  canvas.addEventListener("pointerdown", beginStroke);
  canvas.addEventListener("pointermove", continueStroke);
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);
  canvas.addEventListener("keydown", event => {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      if (!busy && !receipt) {
        clearDrawing();
        emitStatus("idle", "Zeichnung geloescht. Noch nicht signiert.");
      }
    }
  });

  clearButton.addEventListener("click", () => {
    if (busy || receipt) return;
    clearDrawing();
    canvas.removeAttribute("aria-invalid");
    emitStatus("idle", "Zeichnung geloescht. Noch nicht signiert.");
  });

  cancelButton.addEventListener("click", () => {
    if (busy || receipt) return;
    resetForm();
    emitStatus("cancelled", "Vorgang abgebrochen. Es wurde nichts signiert.");
    if (typeof options.onCancel === "function") {
      try {
        options.onCancel();
      } catch {}
    }
  });

  signButton.addEventListener("click", async () => {
    if (busy || receipt || destroyed) return;

    const now = clock();
    const input = {
      purpose,
      purposeVersion,
      ownerId: selectedOwnerId(),
      signerFullName: nameInput.value,
      explicitAcknowledgement: acknowledgement.checked,
      drawingPresent: drawingPresent(),
      consentInstanceId: createConsentInstanceId(cryptoImplementation),
      issuedAt: now instanceof Date ? now.toISOString() : String(now || "")
    };
    const validation = validateConsentInput(input, {
      allowedOwnerIds: owners.map(owner => owner.id)
    });

    nameInput.removeAttribute("aria-invalid");
    acknowledgement.removeAttribute("aria-invalid");
    canvas.removeAttribute("aria-invalid");
    ownerInputs.forEach(inputElement =>
      inputElement.removeAttribute("aria-invalid")
    );

    if (!validation.ok) {
      emitStatus(
        "invalid",
        "Noch nicht signiert. Bitte Owner-ID, ausgeschriebenen Namen, Checkbox und Zeichnung vollstaendig ausfuellen."
      );
      focusFirstError(validation.errors);
      return;
    }

    setBusy(true);
    emitStatus("signing", "Native Signatur wird sicher erstellt …");

    try {
      const prepared = await prepareConsentForNativeSigning(input, {
        allowedOwnerIds: owners.map(owner => owner.id),
        cryptoImplementation
      });
      const signerRequest = buildNativeSignerRequest(prepared);
      const rawSignerResult = await signer(signerRequest);
      const acceptedSignerResult = acceptNativeSignerResult(
        rawSignerResult,
        prepared.payloadSha256
      );
      const nextReceipt = createSignedConsentReceipt(
        prepared,
        acceptedSignerResult
      );

      if (destroyed) return;
      receipt = nextReceipt;
      clearDrawing();
      revokeButton.hidden = typeof revokeConsent !== "function";
      setBusy(false);
      emitStatus(
        "native-signature-created",
        "Native kryptografische Signatur wurde erstellt. Dies ist keine Aussage ueber eine qualifizierte rechtliche Signatur.",
        receipt.payloadSha256
      );

      if (typeof options.onSigned === "function") {
        try {
          await options.onSigned(cloneReceipt(receipt));
        } catch {
          emitStatus(
            "native-signature-created-delivery-failed",
            "Native Signatur wurde erstellt, aber der Beleg konnte nicht an die aufrufende Funktion uebergeben werden.",
            receipt.payloadSha256
          );
        }
      }
    } catch {
      if (destroyed) return;
      receipt = null;
      setBusy(false);
      emitStatus(
        "not-signed",
        "Nicht signiert. Der native Signierer hat kein erfolgreiches, zum Hash passendes Ergebnis geliefert."
      );
    }
  });

  revokeButton.addEventListener("click", async () => {
    if (busy || !receipt || destroyed || typeof revokeConsent !== "function") {
      return;
    }

    if (!revokeArmed) {
      revokeArmed = true;
      revokeButton.textContent = "Widerruf jetzt bestaetigen";
      emitStatus(
        "revocation-armed",
        "Widerruf vorbereitet. Zum endgueltigen Uebermitteln erneut bestaetigen.",
        receipt.payloadSha256
      );
      return;
    }

    setBusy(true);
    emitStatus(
      "revoking",
      "Widerruf wird uebermittelt …",
      receipt.payloadSha256
    );

    try {
      const now = clock();
      const request = buildConsentRevocationRequest(receipt, {
        requestedAt: now instanceof Date ? now.toISOString() : String(now || "")
      });
      const result = await revokeConsent(request);

      if (destroyed) return;
      if (result?.ok !== true) {
        throw new Error("revocation-not-confirmed");
      }

      revokeArmed = false;
      revokeButton.hidden = true;
      setBusy(false);
      emitStatus(
        "revoked",
        "Einwilligung wurde als widerrufen bestaetigt.",
        receipt.payloadSha256
      );
    } catch {
      if (destroyed) return;
      revokeArmed = false;
      revokeButton.textContent = "Einwilligung widerrufen";
      setBusy(false);
      emitStatus(
        "revocation-failed",
        "Widerruf wurde nicht bestaetigt. Der signierte Beleg bleibt unveraendert.",
        receipt?.payloadSha256
      );
    }
  });

  return Object.freeze({
    element: root,
    getReceipt() {
      return cloneReceipt(receipt);
    },
    reset() {
      if (busy || destroyed) return false;
      resetForm();
      emitStatus("idle", "Noch nicht signiert.");
      return true;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearDrawing();
      receipt = null;
      root.remove();
    }
  });
}

