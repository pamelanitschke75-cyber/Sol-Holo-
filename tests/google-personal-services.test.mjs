import assert from "node:assert/strict";
import test from "node:test";

import {
  GOOGLE_PERSONAL_LIMITS,
  GOOGLE_PERSONAL_OPERATIONS,
  GOOGLE_PERSONAL_SCOPES,
  GooglePersonalServicesError,
  createGooglePersonalServices
} from "../modules/google-personal-services.mjs";

const OWNER_A = "owner-alpha";
const OWNER_B = "owner-bravo";
const REQUEST_ID = "request-0001";

function request(ownerId, operation) {
  return { explicit: true, ownerId, operation, requestId: REQUEST_ID };
}

function assertErrorCode(code) {
  return (error) => {
    assert.ok(error instanceof GooglePersonalServicesError);
    assert.equal(error.code, code);
    return true;
  };
}

function createGoogleApiStub() {
  const calls = [];
  const gmail = {
    users: {
      messages: {
        async get(options) {
          calls.push({ service: "gmail.get", options });
          if (options.format === "full") {
            return {
              data: {
                id: options.id,
                payload: {
                  mimeType: "multipart/alternative",
                  parts: [
                    {
                      mimeType: "text/plain",
                      body: { data: "SGFsbG8gT2ZmaWNlIQ" }
                    }
                  ]
                }
              }
            };
          }
          return {
            data: {
              id: options.id,
              internalDate: "1720000000000",
              labelIds: ["INBOX"],
              sizeEstimate: 120,
              threadId: "thread_123",
              payload: {
                headers: [
                  { name: "Subject", value: "Planung" },
                  { name: "From", value: "sender@example.test" }
                ]
              }
            }
          };
        },
        async list(options) {
          calls.push({ service: "gmail.list", options });
          return {
            data: {
              messages: [{ id: "msg_12345", threadId: "thread_123" }],
              resultSizeEstimate: 3
            }
          };
        }
      }
    }
  };
  const people = {
    people: {
      async searchContacts(options) {
        calls.push({ service: "contacts.search", options });
        return {
          data: {
            results: [{
              person: {
                resourceName: "people/c123",
                names: [{ displayName: "Ada Lovelace", metadata: { primary: true } }],
                emailAddresses: [{ value: "ada@example.test" }],
                phoneNumbers: [{ value: "+49 123" }]
              }
            }]
          }
        };
      }
    }
  };
  const drive = {
    files: {
      async get(options) {
        calls.push({ service: "drive.get", options });
        return {
          data: {
            id: options.fileId,
            name: "Briefing",
            mimeType: "application/pdf",
            modifiedTime: "2026-08-01T10:00:00Z",
            size: "42"
          }
        };
      },
      async list(options) {
        calls.push({ service: "drive.list", options });
        return {
          data: {
            files: [{
              id: "file_12345",
              mimeType: "application/pdf",
              modifiedTime: "2026-08-01T10:00:00Z",
              name: "Team's Briefing",
              size: "42",
              starred: true
            }],
            nextPageToken: "not-returned"
          }
        };
      }
    }
  };

  return {
    calls,
    googleApi: {
      drive: ({ auth, version }) => {
        calls.push({ service: "drive.client", auth, version });
        return drive;
      },
      gmail: ({ auth, version }) => {
        calls.push({ service: "gmail.client", auth, version });
        return gmail;
      },
      people: ({ auth, version }) => {
        calls.push({ service: "contacts.client", auth, version });
        return people;
      }
    }
  };
}

function createServices({ authorization, provider } = {}) {
  const stub = createGoogleApiStub();
  const auth = { marker: "owner-bound-auth" };
  const getOwnerGoogleAuthorization = provider || (async ({ ownerId }) => (
    authorization || {
      ownerId,
      auth,
      scopes: [
        GOOGLE_PERSONAL_SCOPES.GMAIL_READONLY,
        GOOGLE_PERSONAL_SCOPES.CONTACTS_READONLY,
        GOOGLE_PERSONAL_SCOPES.DRIVE_READONLY
      ]
    }
  ));
  return {
    ...stub,
    services: createGooglePersonalServices({ getOwnerGoogleAuthorization, googleApi: stub.googleApi })
  };
}

test("Gmail search is bounded and returns selected metadata only", async () => {
  const { calls, services } = createServices();
  const result = await services.searchGmail({
    ownerId: OWNER_A,
    query: "  planning  ",
    limit: 999,
    request: request(OWNER_A, GOOGLE_PERSONAL_OPERATIONS.GMAIL_SEARCH)
  });

  assert.equal(calls.filter((call) => call.service === "gmail.list").length, 1);
  assert.equal(calls.filter((call) => call.service === "gmail.get").length, 1);
  assert.equal(calls.find((call) => call.service === "gmail.list").options.maxResults, GOOGLE_PERSONAL_LIMITS.MAX_SEARCH_RESULTS);
  assert.deepEqual(result.messages[0], {
    messageId: "msg_12345",
    threadId: "thread_123",
    labelIds: ["INBOX"],
    internalDate: "1720000000000",
    sizeBytes: 120,
    from: "sender@example.test",
    to: null,
    cc: null,
    subject: "Planung",
    date: null,
    rfc822MessageId: null
  });
  assert.equal(result.truncated, true);
});

test("only an explicitly selected Gmail message yields message text", async () => {
  const { calls, services } = createServices();
  const result = await services.readSelectedGmailMessage({
    ownerId: OWNER_A,
    messageId: "msg_12345",
    request: request(OWNER_A, GOOGLE_PERSONAL_OPERATIONS.GMAIL_READ_SELECTED)
  });

  assert.equal(result.text, "Hallo Office!");
  assert.equal(result.textSource, "plain");
  assert.equal(calls.filter((call) => call.service === "gmail.get").length, 2);
  assert.deepEqual(calls.filter((call) => call.service === "gmail.get").map((call) => call.options.format), ["metadata", "full"]);
});

test("Contacts and Drive searches use narrow read-only APIs and normalized results", async () => {
  const { calls, services } = createServices();
  const contacts = await services.searchContacts({
    ownerId: OWNER_A,
    query: "Ada",
    limit: 1,
    request: request(OWNER_A, GOOGLE_PERSONAL_OPERATIONS.CONTACTS_SEARCH)
  });
  const files = await services.searchDriveFiles({
    ownerId: OWNER_A,
    query: "Team's",
    limit: "2",
    request: request(OWNER_A, GOOGLE_PERSONAL_OPERATIONS.DRIVE_SEARCH)
  });

  assert.deepEqual(contacts.contacts, [{
    resourceName: "people/c123",
    displayName: "Ada Lovelace",
    emailAddresses: ["ada@example.test"],
    phoneNumbers: ["+49 123"]
  }]);
  assert.equal(calls.filter((call) => call.service === "contacts.search").length, 1);
  assert.equal(calls.find((call) => call.service === "drive.list").options.q, "trashed = false and name contains 'Team\\'s'");
  assert.deepEqual(files.files, [{
    fileId: "file_12345",
    name: "Team's Briefing",
    mimeType: "application/pdf",
    modifiedTime: "2026-08-01T10:00:00Z",
    sizeBytes: "42",
    webViewLink: null,
    shared: false,
    starred: true
  }]);
  assert.equal(files.truncated, true);
});

test("cross-owner authorization fails closed before an API client is created", async () => {
  const { calls, services } = createServices({
    authorization: {
      ownerId: OWNER_B,
      auth: { marker: "wrong-owner" },
      scopes: [GOOGLE_PERSONAL_SCOPES.GMAIL_READONLY]
    }
  });

  await assert.rejects(
    services.searchGmail({
      ownerId: OWNER_A,
      query: "planning",
      request: request(OWNER_A, GOOGLE_PERSONAL_OPERATIONS.GMAIL_SEARCH)
    }),
    assertErrorCode("OWNER_AUTHORIZATION_MISMATCH")
  );
  assert.deepEqual(calls, []);
});

test("missing scopes fail closed before every Google API call", async () => {
  const { calls, services } = createServices({
    authorization: {
      ownerId: OWNER_A,
      auth: { marker: "narrow-auth" },
      scopes: [GOOGLE_PERSONAL_SCOPES.GMAIL_READONLY]
    }
  });

  await assert.rejects(
    services.searchDriveFiles({
      ownerId: OWNER_A,
      query: "briefing",
      request: request(OWNER_A, GOOGLE_PERSONAL_OPERATIONS.DRIVE_SEARCH)
    }),
    assertErrorCode("REQUIRED_SCOPE_MISSING")
  );
  assert.deepEqual(calls, []);
});

test("missing owner and unknown authorization make no API calls", async () => {
  const missingOwner = createServices();
  const unknownAuthorization = createServices({ provider: async () => null });

  await assert.rejects(
    missingOwner.services.searchContacts({
      query: "Ada",
      request: request(OWNER_A, GOOGLE_PERSONAL_OPERATIONS.CONTACTS_SEARCH)
    }),
    assertErrorCode("OWNER_REQUIRED")
  );
  await assert.rejects(
    unknownAuthorization.services.readSelectedGmailMessage({
      ownerId: OWNER_A,
      messageId: "msg_12345",
      request: request(OWNER_A, GOOGLE_PERSONAL_OPERATIONS.GMAIL_READ_SELECTED)
    }),
    assertErrorCode("OWNER_AUTHORIZATION_NOT_FOUND")
  );
  assert.deepEqual(missingOwner.calls, []);
  assert.deepEqual(unknownAuthorization.calls, []);
});

test("invalid selected IDs are rejected before a Gmail API call", async () => {
  const { calls, services } = createServices();

  await assert.rejects(
    services.readSelectedGmailMessage({
      ownerId: OWNER_A,
      messageId: "bad!",
      request: request(OWNER_A, GOOGLE_PERSONAL_OPERATIONS.GMAIL_READ_SELECTED)
    }),
    assertErrorCode("INVALID_IDENTIFIER")
  );
  assert.deepEqual(calls, []);
});
