import { google } from "googleapis";

export const GOOGLE_PERSONAL_SCOPES = Object.freeze({
  GMAIL_READONLY: "https://www.googleapis.com/auth/gmail.readonly",
  CONTACTS_READONLY: "https://www.googleapis.com/auth/contacts.readonly",
  DRIVE_READONLY: "https://www.googleapis.com/auth/drive.readonly"
});

export const GOOGLE_PERSONAL_OPERATIONS = Object.freeze({
  GMAIL_SEARCH: "gmail.search",
  GMAIL_READ_SELECTED: "gmail.message.read-selected",
  CONTACTS_SEARCH: "contacts.search",
  DRIVE_SEARCH: "drive.search",
  DRIVE_METADATA: "drive.file.metadata"
});

export const GOOGLE_PERSONAL_LIMITS = Object.freeze({
  DEFAULT_SEARCH_RESULTS: 5,
  MAX_SEARCH_RESULTS: 10,
  MAX_QUERY_CHARS: 256,
  MAX_GMAIL_MESSAGE_BYTES: 2_000_000,
  MAX_RETURNED_TEXT_CHARS: 50_000
});

const SAFE_ERROR_MESSAGES = Object.freeze({
  OWNER_AUTH_PROVIDER_REQUIRED: "Ein owner-spezifischer Google-Autorisierungsprovider ist erforderlich.",
  OWNER_REQUIRED: "Eine eindeutige Holo-Owner-ID ist erforderlich.",
  OWNER_CONTEXT_MISMATCH: "Der Google-Request-Kontext passt nicht zur Holo-Owner-ID.",
  OWNER_AUTHORIZATION_NOT_FOUND: "Fuer diese Holo-Instanz ist keine Google-Autorisierung vorhanden.",
  OWNER_AUTHORIZATION_MISMATCH: "Die Google-Autorisierung gehoert zu einer anderen Holo-Instanz.",
  OWNER_AUTHORIZATION_UNAVAILABLE: "Die Google-Autorisierung konnte nicht sicher aufgeloest werden.",
  API_CLIENT_REQUIRED: "Der Google-API-Client ist nicht verfuegbar.",
  EXPLICIT_REQUEST_REQUIRED: "Die Google-Leseoperation wurde nicht ausdruecklich angefordert.",
  INVALID_REQUEST_CONTEXT: "Der Google-Request-Kontext ist ungueltig.",
  OPERATION_MISMATCH: "Der Google-Request-Kontext passt nicht zur Leseoperation.",
  REQUIRED_SCOPE_MISSING: "Die erforderliche Nur-Lese-Berechtigung fehlt.",
  INVALID_QUERY: "Die Suchanfrage wurde abgelehnt.",
  INVALID_IDENTIFIER: "Der ausgewaehlte Google-Eintrag ist ungueltig.",
  MESSAGE_TOO_LARGE: "Die ausgewaehlte E-Mail ist fuer diese Textansicht zu gross.",
  MESSAGE_SIZE_UNAVAILABLE: "Die Groesse der ausgewaehlten E-Mail konnte nicht sicher geprueft werden.",
  RESPONSE_TOO_LARGE: "Die Google-Antwort ist fuer diese Textansicht zu gross.",
  REMOTE_READ_FAILED: "Die Google-Leseoperation konnte nicht abgeschlossen werden."
});

const CONTROL_OR_BIDI_PATTERN =
  /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const MEANINGFUL_QUERY_PATTERN = /[\p{L}\p{N}]/u;
const OPAQUE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{5,200}$/u;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;
const OWNER_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,63}$/u;
const GMAIL_METADATA_HEADERS = Object.freeze([
  "From",
  "To",
  "Cc",
  "Subject",
  "Date",
  "Message-ID"
]);
const CONTACT_READ_MASK = "names,emailAddresses,phoneNumbers";
const CONTACT_SOURCE = "READ_SOURCE_TYPE_CONTACT";
const GMAIL_LIST_FIELDS = "messages(id,threadId),resultSizeEstimate";
const GMAIL_METADATA_FIELDS =
  "id,threadId,labelIds,internalDate,sizeEstimate,payload(headers)";
const GMAIL_FULL_FIELDS =
  "id,threadId,labelIds,internalDate,sizeEstimate,payload";
const DRIVE_LIST_FIELDS =
  "files(id,name,mimeType,modifiedTime,size,webViewLink,shared,starred)";
const DRIVE_METADATA_FIELDS =
  "id,name,mimeType,createdTime,modifiedTime,size,webViewLink,owners(displayName),shared,starred,trashed,description,capabilities(canDownload)";

export class GooglePersonalServicesError extends Error {
  constructor(code) {
    super(SAFE_ERROR_MESSAGES[code] || SAFE_ERROR_MESSAGES.REMOTE_READ_FAILED);
    this.name = "GooglePersonalServicesError";
    this.code = code;
  }
}

function asSafeString(value, maxChars = 2_048) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replaceAll("\u0000", "").slice(0, maxChars);
}

function asOptionalString(value, maxChars = 2_048) {
  const safeValue = asSafeString(value, maxChars);
  return safeValue || null;
}

function parseGrantedScopes(grantedScopes) {
  const values = grantedScopes instanceof Set
    ? [...grantedScopes]
    : Array.isArray(grantedScopes)
      ? grantedScopes
      : typeof grantedScopes === "string"
        ? grantedScopes.split(/[\s,]+/u)
        : [];

  return new Set(
    values
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function boundedSearchLimit(value) {
  if (value === undefined || value === null || value === "") {
    return GOOGLE_PERSONAL_LIMITS.DEFAULT_SEARCH_RESULTS;
  }

  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/u.test(value)
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return GOOGLE_PERSONAL_LIMITS.DEFAULT_SEARCH_RESULTS;
  }

  return Math.min(Math.floor(parsed), GOOGLE_PERSONAL_LIMITS.MAX_SEARCH_RESULTS);
}

function validateQuery(value) {
  if (typeof value !== "string") {
    throw new GooglePersonalServicesError("INVALID_QUERY");
  }

  const query = value.normalize("NFKC").trim();
  if (
    query.length < 2 ||
    query.length > GOOGLE_PERSONAL_LIMITS.MAX_QUERY_CHARS ||
    CONTROL_OR_BIDI_PATTERN.test(query) ||
    !MEANINGFUL_QUERY_PATTERN.test(query)
  ) {
    throw new GooglePersonalServicesError("INVALID_QUERY");
  }

  return query;
}

function validateOpaqueIdentifier(value) {
  const identifier = typeof value === "string" ? value.trim() : "";
  if (!OPAQUE_IDENTIFIER_PATTERN.test(identifier)) {
    throw new GooglePersonalServicesError("INVALID_IDENTIFIER");
  }

  return identifier;
}

function validateOwnerId(value) {
  if (
    typeof value !== "string" ||
    value !== value.trim() ||
    !OWNER_ID_PATTERN.test(value)
  ) {
    throw new GooglePersonalServicesError("OWNER_REQUIRED");
  }

  return value;
}

function assertExplicitRequest(request, expectedOperation, ownerId) {
  if (request?.explicit !== true) {
    throw new GooglePersonalServicesError("EXPLICIT_REQUEST_REQUIRED");
  }

  if (!REQUEST_ID_PATTERN.test(request.requestId || "")) {
    throw new GooglePersonalServicesError("INVALID_REQUEST_CONTEXT");
  }

  if (request.operation !== expectedOperation) {
    throw new GooglePersonalServicesError("OPERATION_MISMATCH");
  }

  if (request.ownerId !== ownerId) {
    throw new GooglePersonalServicesError("OWNER_CONTEXT_MISMATCH");
  }

  return request.requestId;
}

function getHeaders(payload) {
  return Array.isArray(payload?.headers) ? payload.headers : [];
}

function findHeader(payload, name) {
  const expectedName = name.toLocaleLowerCase("en-US");
  const header = getHeaders(payload).find(
    (candidate) =>
      typeof candidate?.name === "string" &&
      candidate.name.toLocaleLowerCase("en-US") === expectedName
  );

  return asOptionalString(header?.value);
}

function normalizeInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeByteString(value) {
  const stringValue = String(value ?? "");
  return /^\d{1,20}$/u.test(stringValue) ? stringValue : null;
}

function toGmailMetadata(message) {
  return {
    messageId: asSafeString(message?.id, 200),
    threadId: asOptionalString(message?.threadId, 200),
    labelIds: Array.isArray(message?.labelIds)
      ? message.labelIds
          .filter((label) => typeof label === "string")
          .slice(0, 50)
          .map((label) => asSafeString(label, 100))
      : [],
    internalDate: asOptionalString(message?.internalDate, 32),
    sizeBytes: normalizeInteger(message?.sizeEstimate),
    from: findHeader(message?.payload, "From"),
    to: findHeader(message?.payload, "To"),
    cc: findHeader(message?.payload, "Cc"),
    subject: findHeader(message?.payload, "Subject"),
    date: findHeader(message?.payload, "Date"),
    rfc822MessageId: findHeader(message?.payload, "Message-ID")
  };
}

function decodeHtmlEntities(value) {
  const namedEntities = Object.freeze({
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"'
  });

  return value.replace(
    /&(#(?:x[0-9a-f]+|\d+)|amp|apos|gt|lt|nbsp|quot);/giu,
    (match, entity) => {
      if (entity.startsWith("#")) {
        const isHex = entity[1]?.toLocaleLowerCase("en-US") === "x";
        const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
        if (Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff) {
          try {
            return String.fromCodePoint(codePoint);
          } catch {
            return "";
          }
        }
        return "";
      }

      return namedEntities[entity.toLocaleLowerCase("en-US")] ?? match;
    }
  );
}

function htmlToText(value) {
  return decodeHtmlEntities(
    value
      .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/giu, " ")
      .replace(/<\s*br\s*\/?>/giu, "\n")
      .replace(/<\s*\/\s*(?:p|div|li|tr|h[1-6])\s*>/giu, "\n")
      .replace(/<[^>]+>/gu, " ")
  )
    .replace(/[ \t]+/gu, " ")
    .replace(/\n[ \t]+/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function getPartCharset(part) {
  const contentType = findHeader(part, "Content-Type") || "";
  const match = contentType.match(/charset\s*=\s*["']?([^;\s"']+)/iu);
  return match?.[1] || "utf-8";
}

function decodeBase64Url(data, charset) {
  if (typeof data !== "string") {
    return "";
  }

  const maxEncodedChars =
    Math.ceil((GOOGLE_PERSONAL_LIMITS.MAX_GMAIL_MESSAGE_BYTES * 4) / 3) + 8;
  if (data.length > maxEncodedChars) {
    throw new GooglePersonalServicesError("RESPONSE_TOO_LARGE");
  }

  if (!/^[A-Za-z0-9_-]*={0,2}$/u.test(data)) {
    return "";
  }

  const bytes = Buffer.from(data.replaceAll("-", "+").replaceAll("_", "/"), "base64");
  if (bytes.length > GOOGLE_PERSONAL_LIMITS.MAX_GMAIL_MESSAGE_BYTES) {
    throw new GooglePersonalServicesError("RESPONSE_TOO_LARGE");
  }

  try {
    return new TextDecoder(charset, { fatal: false }).decode(bytes).replaceAll("\u0000", "");
  } catch {
    return bytes.toString("utf8").replaceAll("\u0000", "");
  }
}

function extractMessageText(payload) {
  const plainParts = [];
  const htmlParts = [];
  let attachmentBackedText = false;

  function visit(part, depth = 0) {
    if (!part || depth > 20) {
      return;
    }

    const mimeType = String(part.mimeType || "").toLocaleLowerCase("en-US");
    const isText = mimeType.startsWith("text/");
    const hasAttachment = typeof part.body?.attachmentId === "string";

    if (isText && hasAttachment) {
      attachmentBackedText = true;
    }

    if (isText && typeof part.body?.data === "string") {
      const decoded = decodeBase64Url(part.body.data, getPartCharset(part));
      if (mimeType === "text/plain") {
        plainParts.push(decoded);
      } else if (mimeType === "text/html") {
        htmlParts.push(decoded);
      }
    }

    if (Array.isArray(part.parts)) {
      for (const child of part.parts.slice(0, 100)) {
        visit(child, depth + 1);
      }
    }
  }

  visit(payload);

  const source = plainParts.some((part) => part.trim()) ? "plain" : "html";
  const rawText = source === "plain"
    ? plainParts.join("\n\n")
    : htmlParts.map(htmlToText).join("\n\n");
  const normalizedText = rawText
    .replace(/\r\n?/gu, "\n")
    .replace(/\n{4,}/gu, "\n\n\n")
    .trim();
  const truncated = normalizedText.length > GOOGLE_PERSONAL_LIMITS.MAX_RETURNED_TEXT_CHARS;

  return {
    text: normalizedText.slice(0, GOOGLE_PERSONAL_LIMITS.MAX_RETURNED_TEXT_CHARS),
    textSource: normalizedText ? source : "none",
    truncated,
    contentIncomplete: attachmentBackedText
  };
}

function escapeDriveQueryLiteral(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function toDriveSummary(file) {
  return {
    fileId: asSafeString(file?.id, 200),
    name: asOptionalString(file?.name, 1_024),
    mimeType: asOptionalString(file?.mimeType, 255),
    modifiedTime: asOptionalString(file?.modifiedTime, 64),
    sizeBytes: normalizeByteString(file?.size),
    webViewLink: asOptionalString(file?.webViewLink, 2_048),
    shared: file?.shared === true,
    starred: file?.starred === true
  };
}

function toDriveMetadata(file) {
  return {
    ...toDriveSummary(file),
    createdTime: asOptionalString(file?.createdTime, 64),
    owners: Array.isArray(file?.owners)
      ? file.owners.slice(0, 10).map((owner) => ({
          displayName: asOptionalString(owner?.displayName, 512)
        }))
      : [],
    trashed: file?.trashed === true,
    description: asOptionalString(file?.description, 4_096),
    canDownload: file?.capabilities?.canDownload === true
  };
}

function toContact(result) {
  const person = result?.person || {};
  const primaryName = Array.isArray(person.names)
    ? person.names.find((name) => name?.metadata?.primary === true) || person.names[0]
    : null;

  return {
    resourceName: asSafeString(person.resourceName, 200),
    displayName: asOptionalString(primaryName?.displayName, 512),
    emailAddresses: Array.isArray(person.emailAddresses)
      ? person.emailAddresses
          .slice(0, 10)
          .map((email) => asSafeString(email?.value, 512))
          .filter(Boolean)
      : [],
    phoneNumbers: Array.isArray(person.phoneNumbers)
      ? person.phoneNumbers
          .slice(0, 10)
          .map((phone) => asSafeString(phone?.value, 128))
          .filter(Boolean)
      : []
  };
}

/**
 * Kontrollierte Nur-Lese-Zugaenge zu persoenlichen Google-Diensten.
 *
 * `getOwnerGoogleAuthorization` muss fuer jede Operation den bereits
 * autorisierten OAuth2-Client genau des angeforderten Owners liefern. Dieses
 * Modul erzeugt weder OAuth-Clients noch Tokens oder Scopes und fuehrt keine
 * Hintergrundimporte, Folgeseiten, Downloads oder Schreiboperationen aus.
 */
export function createGooglePersonalServices({
  getOwnerGoogleAuthorization,
  googleApi = google,
  audit = () => {}
} = {}) {
  if (typeof getOwnerGoogleAuthorization !== "function") {
    throw new GooglePersonalServicesError("OWNER_AUTH_PROVIDER_REQUIRED");
  }

  if (
    !googleApi ||
    typeof googleApi.gmail !== "function" ||
    typeof googleApi.people !== "function" ||
    typeof googleApi.drive !== "function"
  ) {
    throw new GooglePersonalServicesError("API_CLIENT_REQUIRED");
  }

  function safeAudit(event) {
    if (typeof audit !== "function") {
      return;
    }

    try {
      audit(Object.freeze({ ...event }));
    } catch {
      // Audit-Ausfaelle duerfen weder private Daten offenlegen noch Reads wiederholen.
    }
  }

  async function execute({ ownerId, operation, request, requiredScope, action }) {
    const safeOwnerId = validateOwnerId(ownerId);
    const requestId = assertExplicitRequest(request, operation, safeOwnerId);
    let authorization;

    try {
      authorization = await getOwnerGoogleAuthorization({
        ownerId: safeOwnerId,
        operation
      });
    } catch {
      const error = new GooglePersonalServicesError("OWNER_AUTHORIZATION_UNAVAILABLE");
      safeAudit({
        operation,
        requestId,
        outcome: "rejected",
        errorCode: error.code
      });
      throw error;
    }

    if (!authorization) {
      const error = new GooglePersonalServicesError("OWNER_AUTHORIZATION_NOT_FOUND");
      safeAudit({
        operation,
        requestId,
        outcome: "rejected",
        errorCode: error.code
      });
      throw error;
    }

    if (authorization.ownerId !== safeOwnerId) {
      const error = new GooglePersonalServicesError("OWNER_AUTHORIZATION_MISMATCH");
      safeAudit({
        operation,
        requestId,
        outcome: "rejected",
        errorCode: error.code
      });
      throw error;
    }

    const auth = authorization.auth;
    if (!auth || (typeof auth !== "object" && typeof auth !== "function")) {
      const error = new GooglePersonalServicesError("OWNER_AUTHORIZATION_NOT_FOUND");
      safeAudit({
        operation,
        requestId,
        outcome: "rejected",
        errorCode: error.code
      });
      throw error;
    }

    // The authorization provider is deliberately owner-bound.  Its contract is
    // exactly { ownerId, auth, scopes }; do not infer scopes from a token or
    // accept a broader, unscoped authorization object.
    const scopes = parseGrantedScopes(authorization.scopes);
    if (!scopes.has(requiredScope)) {
      const error = new GooglePersonalServicesError("REQUIRED_SCOPE_MISSING");
      safeAudit({
        operation,
        requestId,
        outcome: "rejected",
        errorCode: error.code
      });
      throw error;
    }

    try {
      const result = await action({ auth });
      safeAudit({
        operation,
        requestId,
        outcome: "success",
        resultCount: Number.isInteger(result?.resultCount) ? result.resultCount : 1,
        truncated: result?.truncated === true
      });
      return result;
    } catch (caughtError) {
      const error = caughtError instanceof GooglePersonalServicesError
        ? caughtError
        : new GooglePersonalServicesError("REMOTE_READ_FAILED");
      safeAudit({
        operation,
        requestId,
        outcome: "failed",
        errorCode: error.code
      });
      throw error;
    }
  }

  return Object.freeze({
    async searchGmail({ ownerId, query, limit, request } = {}) {
      return execute({
        ownerId,
        operation: GOOGLE_PERSONAL_OPERATIONS.GMAIL_SEARCH,
        request,
        requiredScope: GOOGLE_PERSONAL_SCOPES.GMAIL_READONLY,
        action: async ({ auth }) => {
          const safeQuery = validateQuery(query);
          const maxResults = boundedSearchLimit(limit);
          const gmail = googleApi.gmail({ version: "v1", auth });
          const listResponse = await gmail.users.messages.list({
            userId: "me",
            q: safeQuery,
            maxResults,
            includeSpamTrash: false,
            fields: GMAIL_LIST_FIELDS
          });
          const listedMessages = Array.isArray(listResponse?.data?.messages)
            ? listResponse.data.messages.slice(0, maxResults)
            : [];

          const messages = await Promise.all(
            listedMessages.map(async (listedMessage) => {
              const messageId = validateOpaqueIdentifier(listedMessage?.id);
              const response = await gmail.users.messages.get({
                userId: "me",
                id: messageId,
                format: "metadata",
                metadataHeaders: [...GMAIL_METADATA_HEADERS],
                fields: GMAIL_METADATA_FIELDS
              });
              return toGmailMetadata(response?.data);
            })
          );

          return {
            messages,
            resultCount: messages.length,
            resultSizeEstimate: normalizeInteger(listResponse?.data?.resultSizeEstimate),
            truncated: Number(listResponse?.data?.resultSizeEstimate) > messages.length
          };
        }
      });
    },

    async readSelectedGmailMessage({ ownerId, messageId, request } = {}) {
      return execute({
        ownerId,
        operation: GOOGLE_PERSONAL_OPERATIONS.GMAIL_READ_SELECTED,
        request,
        requiredScope: GOOGLE_PERSONAL_SCOPES.GMAIL_READONLY,
        action: async ({ auth }) => {
          const selectedMessageId = validateOpaqueIdentifier(messageId);
          const gmail = googleApi.gmail({ version: "v1", auth });
          const metadataResponse = await gmail.users.messages.get({
            userId: "me",
            id: selectedMessageId,
            format: "metadata",
            metadataHeaders: [...GMAIL_METADATA_HEADERS],
            fields: GMAIL_METADATA_FIELDS
          });
          const sizeEstimate = normalizeInteger(metadataResponse?.data?.sizeEstimate);

          if (sizeEstimate === null) {
            throw new GooglePersonalServicesError("MESSAGE_SIZE_UNAVAILABLE");
          }
          if (sizeEstimate > GOOGLE_PERSONAL_LIMITS.MAX_GMAIL_MESSAGE_BYTES) {
            throw new GooglePersonalServicesError("MESSAGE_TOO_LARGE");
          }

          const fullResponse = await gmail.users.messages.get({
            userId: "me",
            id: selectedMessageId,
            format: "full",
            fields: GMAIL_FULL_FIELDS
          });
          const content = extractMessageText(fullResponse?.data?.payload);

          return {
            message: toGmailMetadata(metadataResponse?.data),
            ...content,
            resultCount: 1
          };
        }
      });
    },

    async searchContacts({ ownerId, query, limit, request } = {}) {
      return execute({
        ownerId,
        operation: GOOGLE_PERSONAL_OPERATIONS.CONTACTS_SEARCH,
        request,
        requiredScope: GOOGLE_PERSONAL_SCOPES.CONTACTS_READONLY,
        action: async ({ auth }) => {
          const safeQuery = validateQuery(query);
          const pageSize = boundedSearchLimit(limit);
          const people = googleApi.people({ version: "v1", auth });

          const response = await people.people.searchContacts({
            query: safeQuery,
            pageSize,
            readMask: CONTACT_READ_MASK,
            sources: [CONTACT_SOURCE]
          });
          const contacts = Array.isArray(response?.data?.results)
            ? response.data.results.slice(0, pageSize).map(toContact)
            : [];

          return {
            contacts,
            resultCount: contacts.length,
            truncated: false
          };
        }
      });
    },

    async searchDriveFiles({ ownerId, query, limit, request } = {}) {
      return execute({
        ownerId,
        operation: GOOGLE_PERSONAL_OPERATIONS.DRIVE_SEARCH,
        request,
        requiredScope: GOOGLE_PERSONAL_SCOPES.DRIVE_READONLY,
        action: async ({ auth }) => {
          const safeQuery = validateQuery(query);
          const pageSize = boundedSearchLimit(limit);
          const drive = googleApi.drive({ version: "v3", auth });
          const response = await drive.files.list({
            q: `trashed = false and name contains '${escapeDriveQueryLiteral(safeQuery)}'`,
            pageSize,
            spaces: "drive",
            corpora: "user",
            orderBy: "modifiedTime desc",
            fields: DRIVE_LIST_FIELDS
          });
          const files = Array.isArray(response?.data?.files)
            ? response.data.files.slice(0, pageSize).map(toDriveSummary)
            : [];

          return {
            files,
            resultCount: files.length,
            truncated: Boolean(response?.data?.nextPageToken)
          };
        }
      });
    },

    async getDriveFileMetadata({ ownerId, fileId, request } = {}) {
      return execute({
        ownerId,
        operation: GOOGLE_PERSONAL_OPERATIONS.DRIVE_METADATA,
        request,
        requiredScope: GOOGLE_PERSONAL_SCOPES.DRIVE_READONLY,
        action: async ({ auth }) => {
          const selectedFileId = validateOpaqueIdentifier(fileId);
          const drive = googleApi.drive({ version: "v3", auth });
          const response = await drive.files.get({
            fileId: selectedFileId,
            fields: DRIVE_METADATA_FIELDS
          });

          return {
            file: toDriveMetadata(response?.data),
            resultCount: 1,
            truncated: false
          };
        }
      });
    }
  });
}
