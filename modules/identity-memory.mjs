/**
 * Sol Holo - Identitaets- und Gedaechtnisrichtlinie
 *
 * Dieses Modul ist absichtlich unabhaengig von Express, PostgreSQL und der UI.
 * Text und Sprache durchlaufen dadurch exakt dieselbe Speicherentscheidung.
 */

export const MEMORY_DECISION = Object.freeze({
  IGNORE: "ignore",
  CLARIFY_IDENTITY: "clarify_identity",
  IDENTITY_CONFLICT: "identity_conflict",
  REQUIRE_CONFIRMATION: "require_confirmation",
  REJECT: "reject",
  PERSIST: "persist"
});

const IDENTITY_QUESTION = "Spricht gerade Pam oder Steffi?";

const DEFAULT_IDENTITY_DEFINITIONS = Object.freeze([
  Object.freeze({
    speakerId: "pam",
    displayName: "Pam",
    canonicalOwnerId: "pam-sol",
    speakerAliases: Object.freeze(["pam"]),
    ownerAliases: Object.freeze(["pam-sol-001"])
  }),
  Object.freeze({
    speakerId: "steffi",
    displayName: "Steffi",
    canonicalOwnerId: "steffi-sol",
    speakerAliases: Object.freeze(["steffi"]),
    ownerAliases: Object.freeze([])
  })
]);

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("de-DE");
}

function uniqueNormalized(values) {
  const result = [];
  const seen = new Set();

  for (const value of values) {
    const normalized = normalizeKey(value);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

/**
 * Erstellt eine kleine, explizite Identitaetsregistrierung.
 * Namen im Nachrichtentext oder der Schreibstil werden niemals ausgewertet.
 */
export function createIdentityRegistry(
  definitions = DEFAULT_IDENTITY_DEFINITIONS
) {
  const identities = new Map();
  const speakers = new Map();
  const owners = new Map();

  for (const definition of definitions) {
    const speakerId = normalizeKey(definition?.speakerId);
    const displayName = String(definition?.displayName ?? "").trim();
    const canonicalOwnerId = normalizeKey(
      definition?.canonicalOwnerId
    );

    if (!speakerId || !displayName || !canonicalOwnerId) {
      throw new TypeError(
        "Jede Identitaet braucht speakerId, displayName und canonicalOwnerId."
      );
    }

    if (identities.has(speakerId)) {
      throw new TypeError("speakerId ist doppelt vergeben.");
    }

    const identity = Object.freeze({
      speakerId,
      displayName,
      canonicalOwnerId,
      speakerAliases: Object.freeze(
        uniqueNormalized([
          speakerId,
          ...(definition.speakerAliases ?? [])
        ])
      ),
      ownerAliases: Object.freeze(
        uniqueNormalized([
          canonicalOwnerId,
          ...(definition.ownerAliases ?? [])
        ])
      )
    });

    identities.set(speakerId, identity);

    for (const alias of identity.speakerAliases) {
      const existing = speakers.get(alias);

      if (existing && existing.speakerId !== speakerId) {
        throw new TypeError("Sprecher-Alias ist doppelt vergeben.");
      }

      speakers.set(alias, identity);
    }

    for (const alias of identity.ownerAliases) {
      const existing = owners.get(alias);

      if (existing && existing.speakerId !== speakerId) {
        throw new TypeError("Owner-Alias ist doppelt vergeben.");
      }

      owners.set(alias, identity);
    }
  }

  const choices = Object.freeze(
    [...identities.values()].map((identity) =>
      Object.freeze({
        speakerId: identity.speakerId,
        displayName: identity.displayName
      })
    )
  );

  return Object.freeze({
    resolveSpeaker(value) {
      return speakers.get(normalizeKey(value)) ?? null;
    },

    resolveOwner(value) {
      return owners.get(normalizeKey(value)) ?? null;
    },

    getOwnerScope(value) {
      const identity = owners.get(normalizeKey(value));
      return identity ? [...identity.ownerAliases] : [];
    },

    getIdentity(speakerId) {
      return identities.get(normalizeKey(speakerId)) ?? null;
    },

    choices
  });
}

export const DEFAULT_IDENTITY_REGISTRY = createIdentityRegistry();

export function resolveCanonicalOwnerId(
  ownerId,
  registry = DEFAULT_IDENTITY_REGISTRY
) {
  return registry.resolveOwner(ownerId)?.canonicalOwnerId ?? null;
}

/**
 * Liefert die kanonische und alle bekannten Legacy-IDs fuer einen Owner.
 * Neue Eintraege verwenden ausschliesslich die kanonische ID. Die Liste ist
 * fuer einen spaeteren, explizit bestaetigten Legacy-Abruf bzw. Import gedacht.
 */
export function getLegacyOwnerScope(
  ownerId,
  registry = DEFAULT_IDENTITY_REGISTRY
) {
  return registry.getOwnerScope(ownerId);
}

export function normalizeMemorySource(source) {
  const normalized = normalizeKey(source);

  if (["text", "typed", "keyboard"].includes(normalized)) {
    return "text";
  }

  if (
    ["voice", "speech", "audio", "microphone", "transcript"].includes(
      normalized
    )
  ) {
    return "voice";
  }

  return null;
}

function identityPrompt(
  reason,
  registry = DEFAULT_IDENTITY_REGISTRY
) {
  return {
    kind: MEMORY_DECISION.CLARIFY_IDENTITY,
    persist: false,
    reason,
    prompt: IDENTITY_QUESTION,
    choices: registry.choices
  };
}

/**
 * Loest nur ausdrueckliche technische Identitaetssignale auf.
 * Inhalte, erwaehnte Namen, Thema und Schreibstil bleiben unberuecksichtigt.
 */
export function resolveMemoryIdentity(
  input,
  registry = DEFAULT_IDENTITY_REGISTRY
) {
  const selectedValue = input?.selectedSpeakerId ?? input?.speakerId;
  const verifiedValue = input?.verifiedSpeakerId;
  const signals = [];
  const unknownSignals = [];

  for (const [type, value] of [
    ["selected", selectedValue],
    ["verified", verifiedValue]
  ]) {
    if (!normalizeKey(value)) {
      continue;
    }

    const identity = registry.resolveSpeaker(value);

    if (!identity) {
      unknownSignals.push(type);
      continue;
    }

    signals.push({ type, identity });
  }

  if (signals.length === 0) {
    return identityPrompt(
      unknownSignals.length > 0
        ? "unknown_speaker"
        : "missing_speaker",
      registry
    );
  }

  const distinctSpeakerIds = new Set(
    signals.map(({ identity }) => identity.speakerId)
  );

  if (unknownSignals.length > 0 || distinctSpeakerIds.size !== 1) {
    return {
      ...identityPrompt("conflicting_identity_signals", registry),
      kind: MEMORY_DECISION.IDENTITY_CONFLICT
    };
  }

  const identity = signals[0].identity;
  const requestedOwnerValue = input?.ownerId ?? input?.requestedOwnerId;

  if (normalizeKey(requestedOwnerValue)) {
    const requestedOwner = registry.resolveOwner(requestedOwnerValue);

    if (
      !requestedOwner ||
      requestedOwner.canonicalOwnerId !== identity.canonicalOwnerId
    ) {
      return {
        ...identityPrompt("speaker_owner_mismatch", registry),
        kind: MEMORY_DECISION.IDENTITY_CONFLICT
      };
    }
  }

  return {
    kind: "resolved",
    speakerId: identity.speakerId,
    displayName: identity.displayName,
    ownerId: identity.canonicalOwnerId
  };
}

const MEMORY_COMMAND_PATTERNS = Object.freeze([
  /^\s*(?:sol[\s,:\-]*)?merke\s+dir\s+dauerhaft\s*:?\s*(.*)$/iu,
  /^\s*(?:sol[\s,:\-]*)?(?:bitte\s+)?speichere\s+(?:das\s+)?dauerhaft\s*:?\s*(.*)$/iu
]);

/**
 * Erkennt nur direkte Speicheranweisungen. Eine beilaufige persoenliche Aussage
 * wird nicht als dauerhafte Bestaetigung interpretiert.
 */
export function extractExplicitMemoryRequest(value) {
  const original = String(value ?? "");

  for (const pattern of MEMORY_COMMAND_PATTERNS) {
    const match = original.match(pattern);

    if (match) {
      return {
        requested: true,
        content: String(match[1] ?? "").trim(),
        confirmationMethod: "direct_memory_command"
      };
    }
  }

  return {
    requested: false,
    content: original.trim(),
    confirmationMethod: null
  };
}

function resolveConfirmedBy(value, registry) {
  if (!normalizeKey(value)) {
    return null;
  }

  return registry.resolveSpeaker(value);
}

/**
 * Zentrale, quellunabhaengige Speicherentscheidung.
 *
 * Rueckgabewert kind === "persist" ist die einzige Freigabe fuer einen
 * dauerhaften Datenbank-Write. Alle anderen Ergebnisse muessen schreibfrei
 * bleiben.
 */
export function evaluateIdentityMemoryWrite(
  input,
  { registry = DEFAULT_IDENTITY_REGISTRY } = {}
) {
  const sourceType = normalizeMemorySource(input?.source);

  if (!sourceType) {
    return {
      kind: MEMORY_DECISION.REJECT,
      persist: false,
      reason: "unsupported_source"
    };
  }

  const role = normalizeKey(input?.role || "user");

  if (role !== "user") {
    return {
      kind: MEMORY_DECISION.REJECT,
      persist: false,
      reason: "only_user_content_can_be_personal_memory"
    };
  }

  const originalContent =
    input?.memoryContent ?? input?.transcript ?? input?.content ?? "";
  const explicitRequest = extractExplicitMemoryRequest(originalContent);
  const confirmation = input?.confirmation ?? {};
  const requested =
    input?.intent === "remember" ||
    explicitRequest.requested ||
    confirmation.confirmed === true;

  // Die Sprechertrennung gilt fuer jeden eingehenden Nutzerbeitrag, nicht nur
  // fuer einen spaeteren Write. So kann auch ein persoenlicher Abruf niemals
  // auf Basis einer geratenen Identitaet stattfinden.
  const identity = resolveMemoryIdentity(input, registry);

  if (identity.kind !== "resolved") {
    return identity;
  }

  if (!requested) {
    return {
      kind: MEMORY_DECISION.IGNORE,
      persist: false,
      reason: "no_explicit_memory_request",
      speakerId: identity.speakerId,
      displayName: identity.displayName,
      ownerId: identity.ownerId
    };
  }

  const content = explicitRequest.content;

  if (!content) {
    return {
      kind: MEMORY_DECISION.REJECT,
      persist: false,
      reason: "empty_memory_content"
    };
  }

  let confirmationMethod = explicitRequest.confirmationMethod;
  let confirmedBy = identity.speakerId;

  if (!explicitRequest.requested) {
    const confirmer = resolveConfirmedBy(
      confirmation.confirmedBy,
      registry
    );

    if (confirmation.confirmed !== true || !confirmer) {
      return {
        kind: MEMORY_DECISION.REQUIRE_CONFIRMATION,
        persist: false,
        reason: "explicit_confirmation_required",
        prompt: `Soll ich das fuer ${identity.displayName} dauerhaft speichern?`,
        speakerId: identity.speakerId,
        ownerId: identity.ownerId
      };
    }

    if (confirmer.speakerId !== identity.speakerId) {
      return {
        ...identityPrompt("confirmation_speaker_mismatch", registry),
        kind: MEMORY_DECISION.IDENTITY_CONFLICT
      };
    }

    confirmedBy = confirmer.speakerId;
    confirmationMethod = normalizeKey(confirmation.method) ||
      "explicit_confirmation";
  }

  return {
    kind: MEMORY_DECISION.PERSIST,
    persist: true,
    memory: {
      ownerId: identity.ownerId,
      speakerId: identity.speakerId,
      role: "user",
      sourceType,
      content,
      confirmed: true,
      confirmedBy,
      confirmationMethod
    }
  };
}

/**
 * Ausschliesslich fuer technische Audit-Logs. Der Inhalt, Suchbegriffe,
 * Gesundheitsangaben und Einwilligungstexte werden nie uebernommen.
 */
export function toSafeIdentityMemoryAuditEvent(decision) {
  const memory = decision?.kind === MEMORY_DECISION.PERSIST
    ? decision.memory
    : null;

  return {
    event: "identity_memory_decision",
    outcome: decision?.kind ?? "unknown",
    reason: decision?.reason ?? null,
    ownerId: memory?.ownerId ?? decision?.ownerId ?? null,
    speakerId: memory?.speakerId ?? decision?.speakerId ?? null,
    sourceType: memory?.sourceType ?? null,
    contentLogged: false
  };
}
