package com.solholo.app;

import java.util.Collection;
import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

/**
 * Pure Java authorization policy for Sol Holo's local access factors.
 *
 * <p>This class deliberately has no Android dependencies. Native code must
 * first verify a proof (system authentication, Android Keystore signature or
 * a pinned external-key signature) and may only then create fresh evidence for
 * this policy. A raw NFC identifier is never valid evidence.</p>
 */
public final class SecurityFactorPolicy {
    public enum Category {
        POSSESSION,
        KNOWLEDGE,
        INHERENCE,
        REJECTED
    }

    public enum Factor {
        REGISTERED_DEVICE(Category.POSSESSION),
        DEVICE_CREDENTIAL(Category.KNOWLEDGE),
        SYSTEM_STRONG_BIOMETRIC(Category.INHERENCE),
        REGISTERED_WATCH_NFC(Category.POSSESSION),
        CRYPTOGRAPHIC_NFC_KEY(Category.POSSESSION),
        SIMPLE_NFC_TAG(Category.REJECTED);

        private final Category category;

        Factor(Category category) {
            this.category = category;
        }

        public Category category() {
            return category;
        }
    }

    public enum Operation {
        CRITICAL_ACTION,
        BIOMETRIC_RECOVERY,
        HIGH_RISK_WITH_WATCH,
        REPLACE_REGISTERED_DEVICE
    }

    /**
     * Evidence represents a proof already verified by trusted native code.
     * Every authorization proof is time-bounded; long-lived registrations
     * still have to prove possession using a fresh challenge.
     */
    public static final class Evidence {
        private final String ownerId;
        private final Factor factor;
        private final boolean cryptographicallyVerified;
        private final long verifiedAtMillis;
        private final long expiresAtMillis;

        private Evidence(
            String ownerId,
            Factor factor,
            boolean cryptographicallyVerified,
            long verifiedAtMillis,
            long expiresAtMillis
        ) {
            if (!isAllowedOwnerId(ownerId)) {
                throw new IllegalArgumentException("ownerId is not allowed");
            }
            if (factor == null) {
                throw new IllegalArgumentException("factor must not be null");
            }
            this.ownerId = ownerId;
            this.factor = factor;
            this.cryptographicallyVerified = cryptographicallyVerified;
            this.verifiedAtMillis = verifiedAtMillis;
            this.expiresAtMillis = expiresAtMillis;
        }

        public static Evidence verified(
            String ownerId,
            Factor factor,
            long verifiedAtMillis,
            long expiresAtMillis
        ) {
            if (expiresAtMillis <= verifiedAtMillis) {
                throw new IllegalArgumentException(
                    "verified evidence must have a positive lifetime"
                );
            }
            return new Evidence(
                ownerId,
                factor,
                true,
                verifiedAtMillis,
                expiresAtMillis
            );
        }

        public static Evidence unverified(String ownerId, Factor factor) {
            return new Evidence(ownerId, factor, false, 0L, 0L);
        }

        public String ownerId() {
            return ownerId;
        }

        public Factor factor() {
            return factor;
        }

        public boolean isFreshAndVerified(long nowMillis) {
            return cryptographicallyVerified
                && verifiedAtMillis <= nowMillis
                && nowMillis < expiresAtMillis;
        }
    }

    public static final class Decision {
        private final boolean allowed;
        private final String reasonCode;
        private final Set<Factor> acceptedFactors;
        private final Set<Factor> rejectedFactors;
        private final Set<Category> independentCategories;

        private Decision(
            boolean allowed,
            String reasonCode,
            Set<Factor> acceptedFactors,
            Set<Factor> rejectedFactors,
            Set<Category> independentCategories
        ) {
            this.allowed = allowed;
            this.reasonCode = reasonCode;
            this.acceptedFactors = immutableCopy(acceptedFactors, Factor.class);
            this.rejectedFactors = immutableCopy(rejectedFactors, Factor.class);
            this.independentCategories = immutableCopy(
                independentCategories,
                Category.class
            );
        }

        public boolean allowed() {
            return allowed;
        }

        public String reasonCode() {
            return reasonCode;
        }

        public Set<Factor> acceptedFactors() {
            return acceptedFactors;
        }

        public Set<Factor> rejectedFactors() {
            return rejectedFactors;
        }

        public Set<Category> independentCategories() {
            return independentCategories;
        }
    }

    /**
     * Result of the cryptographic proof made by a registered watch. The phone
     * may create REGISTERED_WATCH_NFC evidence only when this check allows it.
     */
    public static final class WatchProofDecision {
        private final boolean allowed;
        private final String reasonCode;

        private WatchProofDecision(boolean allowed, String reasonCode) {
            this.allowed = allowed;
            this.reasonCode = reasonCode;
        }

        public boolean allowed() {
            return allowed;
        }

        public String reasonCode() {
            return reasonCode;
        }
    }

    public static final class GrantDecision {
        private final boolean allowed;
        private final String reasonCode;

        private GrantDecision(boolean allowed, String reasonCode) {
            this.allowed = allowed;
            this.reasonCode = reasonCode;
        }

        public boolean allowed() {
            return allowed;
        }

        public String reasonCode() {
            return reasonCode;
        }
    }

    private SecurityFactorPolicy() {}

    /** Technical clone scopes currently supported by this app build. */
    public static boolean isAllowedOwnerId(String ownerId) {
        return "pam-sol".equals(ownerId) || "steffi-sol".equals(ownerId);
    }

    /**
     * A signed Holo instance may accept exactly its compile-time owner scope.
     * Supporting more than one owner in the shared policy never makes either
     * owner selectable inside a concrete installed app.
     */
    public static boolean isOwnerBoundToInstance(
        String requestedOwnerId,
        String instanceOwnerId
    ) {
        return isAllowedOwnerId(instanceOwnerId)
            && instanceOwnerId.equals(requestedOwnerId);
    }

    /**
     * Validates all non-transport invariants for a signed watch response.
     *
     * <p>The NFC UID is intentionally absent: it is not an input to this
     * decision. {@code signatureVerified} must mean that the exact canonical
     * challenge bytes were verified against the pinned public key of the
     * registered watch. The watch companion is responsible for allowing that
     * signature only after an explicit confirmation on the watch.</p>
     */
    public static WatchProofDecision evaluateRegisteredWatchProof(
        String expectedOwnerId,
        String proofOwnerId,
        boolean publicKeyPinned,
        boolean registrationAttested,
        boolean signatureVerified,
        boolean challengeMatches,
        boolean challengeAlreadyConsumed,
        boolean explicitUserConfirmation,
        long challengeIssuedAtMillis,
        long challengeExpiresAtMillis,
        long nowMillis,
        long lastAcceptedCounter,
        long responseCounter
    ) {
        if (!isAllowedOwnerId(expectedOwnerId)) {
            return watchDenied("OWNER_NOT_ALLOWED");
        }
        if (
            !isAllowedOwnerId(proofOwnerId)
                || !expectedOwnerId.equals(proofOwnerId)
        ) {
            return watchDenied("WATCH_OWNER_SCOPE_MISMATCH");
        }
        if (!publicKeyPinned) {
            return watchDenied("WATCH_PUBLIC_KEY_NOT_PINNED");
        }
        if (!registrationAttested) {
            return watchDenied("WATCH_REGISTRATION_NOT_ATTESTED");
        }
        if (!challengeMatches) {
            return watchDenied("WATCH_CHALLENGE_MISMATCH");
        }
        if (challengeAlreadyConsumed) {
            return watchDenied("WATCH_CHALLENGE_REPLAYED");
        }
        if (
            challengeIssuedAtMillis > nowMillis
                || challengeExpiresAtMillis <= challengeIssuedAtMillis
                || nowMillis >= challengeExpiresAtMillis
        ) {
            return watchDenied("WATCH_CHALLENGE_EXPIRED");
        }
        if (!explicitUserConfirmation) {
            return watchDenied("WATCH_CONFIRMATION_REQUIRED");
        }
        if (!signatureVerified) {
            return watchDenied("WATCH_SIGNATURE_INVALID");
        }
        if (
            lastAcceptedCounter < 0L
                || lastAcceptedCounter == Long.MAX_VALUE
                || responseCounter != lastAcceptedCounter + 1L
        ) {
            return watchDenied("WATCH_COUNTER_NOT_MONOTONIC");
        }
        return new WatchProofDecision(true, "WATCH_PROOF_ACCEPTED");
    }

    /** Validates the scope and one-time semantics of an issued action grant. */
    public static GrantDecision evaluateGrant(
        String expectedOwnerId,
        String grantOwnerId,
        String expectedAction,
        String grantAction,
        long nowMillis,
        long expiresAtMillis,
        boolean alreadyConsumed
    ) {
        if (!isAllowedOwnerId(expectedOwnerId)) {
            return grantDenied("OWNER_NOT_ALLOWED");
        }
        if (
            !isAllowedOwnerId(grantOwnerId)
                || !expectedOwnerId.equals(grantOwnerId)
        ) {
            return grantDenied("CROSS_OWNER_GRANT");
        }
        if (
            expectedAction == null
                || grantAction == null
                || !expectedAction.equals(grantAction)
        ) {
            return grantDenied("GRANT_ACTION_MISMATCH");
        }
        if (alreadyConsumed) {
            return grantDenied("GRANT_ALREADY_CONSUMED");
        }
        if (nowMillis >= expiresAtMillis) {
            return grantDenied("GRANT_EXPIRED");
        }
        return new GrantDecision(true, "GRANT_ACCEPTED");
    }

    /**
     * Reads an epoch-millisecond value without depending on the concrete
     * numeric wrapper chosen by the Capacitor JSON bridge. Decimal strings are
     * accepted as an exact transport representation; fractions and overflow
     * are rejected.
     */
    public static Long parseEpochMillis(Object value) {
        if (value instanceof Number) {
            Number number = (Number) value;
            double decimal = number.doubleValue();
            if (!Double.isFinite(decimal) || Math.rint(decimal) != decimal) {
                return null;
            }
            long parsed = number.longValue();
            return (double) parsed == decimal ? parsed : null;
        }
        if (value instanceof String) {
            String text = ((String) value).trim();
            if (!text.matches("[0-9]{1,19}")) {
                return null;
            }
            try {
                return Long.parseLong(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    /**
     * Validates the signed challenge shape and its bounded lifetime. Absolute
     * expiry is enforced by the issuing backend; native code additionally
     * requires a fresh one-time Android grant and therefore does not depend on
     * a possibly drifting phone wall clock.
     */
    public static boolean isTrustedSessionChallengeWindowValid(
        Long issuedAtMillis,
        Long expiresAtMillis,
        long maximumLifetimeMillis
    ) {
        return issuedAtMillis != null
            && expiresAtMillis != null
            && issuedAtMillis > 0L
            && expiresAtMillis > issuedAtMillis
            && maximumLifetimeMillis > 0L
            && expiresAtMillis - issuedAtMillis <= maximumLifetimeMillis;
    }

    public static Decision evaluate(
        Operation operation,
        String ownerId,
        Collection<Evidence> evidence,
        long nowMillis
    ) {
        if (operation == null) {
            throw new IllegalArgumentException("operation must not be null");
        }
        if (!isAllowedOwnerId(ownerId)) {
            return denied(
                "OWNER_NOT_ALLOWED",
                Collections.emptySet(),
                Collections.emptySet(),
                Collections.emptySet()
            );
        }

        EnumSet<Factor> accepted = EnumSet.noneOf(Factor.class);
        EnumSet<Factor> rejected = EnumSet.noneOf(Factor.class);
        EnumSet<Category> categories = EnumSet.noneOf(Category.class);
        boolean ownerScopeMismatch = false;

        if (evidence != null) {
            for (Evidence proof : evidence) {
                if (proof == null) {
                    continue;
                }
                Factor factor = proof.factor();
                if (!ownerId.equals(proof.ownerId())) {
                    rejected.add(factor);
                    ownerScopeMismatch = true;
                    continue;
                }
                if (factor == Factor.SIMPLE_NFC_TAG) {
                    // A UID, NDEF value or presence of a simple tag is never a
                    // cryptographic identity proof, even if a caller labels it
                    // as verified.
                    rejected.add(factor);
                    continue;
                }
                if (!proof.isFreshAndVerified(nowMillis)) {
                    rejected.add(factor);
                    continue;
                }
                accepted.add(factor);
                categories.add(factor.category());
            }
        }

        if (ownerScopeMismatch) {
            return denied(
                "CROSS_OWNER_EVIDENCE",
                accepted,
                rejected,
                categories
            );
        }

        boolean registeredDevice = accepted.contains(Factor.REGISTERED_DEVICE);
        boolean deviceCredential = accepted.contains(Factor.DEVICE_CREDENTIAL);
        boolean strongBiometric = accepted.contains(
            Factor.SYSTEM_STRONG_BIOMETRIC
        );
        boolean registeredWatch = accepted.contains(
            Factor.REGISTERED_WATCH_NFC
        );
        boolean cryptographicNfc = accepted.contains(
            Factor.CRYPTOGRAPHIC_NFC_KEY
        );

        switch (operation) {
            case CRITICAL_ACTION:
                if (!registeredDevice) {
                    return denied(
                        "MISSING_REGISTERED_DEVICE",
                        accepted,
                        rejected,
                        categories
                    );
                }
                if (!deviceCredential && !strongBiometric) {
                    return denied(
                        "MISSING_SYSTEM_AUTHENTICATION",
                        accepted,
                        rejected,
                        categories
                    );
                }
                return requireTwoCategories(
                    "ALLOWED_REGISTERED_DEVICE_AND_SYSTEM_AUTH",
                    accepted,
                    rejected,
                    categories
                );

            case BIOMETRIC_RECOVERY:
                if (!registeredDevice) {
                    return denied(
                        "RECOVERY_MISSING_REGISTERED_DEVICE",
                        accepted,
                        rejected,
                        categories
                    );
                }
                if (!deviceCredential) {
                    return denied(
                        "RECOVERY_REQUIRES_DEVICE_CREDENTIAL",
                        accepted,
                        rejected,
                        categories
                    );
                }
                return requireTwoCategories(
                    "ALLOWED_REGISTERED_DEVICE_AND_DEVICE_CREDENTIAL",
                    accepted,
                    rejected,
                    categories
                );

            case HIGH_RISK_WITH_WATCH:
                if (!registeredDevice) {
                    return denied(
                        "MISSING_REGISTERED_DEVICE",
                        accepted,
                        rejected,
                        categories
                    );
                }
                if (!registeredWatch) {
                    return denied(
                        "MISSING_CRYPTOGRAPHIC_WATCH_PROOF",
                        accepted,
                        rejected,
                        categories
                    );
                }
                if (!deviceCredential && !strongBiometric) {
                    return denied(
                        "MISSING_SYSTEM_AUTHENTICATION",
                        accepted,
                        rejected,
                        categories
                    );
                }
                return requireTwoCategories(
                    "ALLOWED_DEVICE_SYSTEM_AUTH_AND_WATCH",
                    accepted,
                    rejected,
                    categories
                );

            case REPLACE_REGISTERED_DEVICE:
                // A new device cannot prove that it is the old registered
                // device. Recovery therefore requires an already trusted,
                // cryptographic external possession factor plus knowledge.
                // A simple NFC tag and an unpinned watch key never qualify.
                if (!cryptographicNfc) {
                    return denied(
                        "DEVICE_REPLACEMENT_REQUIRES_CRYPTOGRAPHIC_NFC_KEY",
                        accepted,
                        rejected,
                        categories
                    );
                }
                if (!deviceCredential) {
                    return denied(
                        "DEVICE_REPLACEMENT_REQUIRES_DEVICE_CREDENTIAL",
                        accepted,
                        rejected,
                        categories
                    );
                }
                return requireTwoCategories(
                    "ALLOWED_CRYPTOGRAPHIC_RECOVERY_AND_CREDENTIAL",
                    accepted,
                    rejected,
                    categories
                );

            default:
                return denied(
                    "UNSUPPORTED_OPERATION",
                    accepted,
                    rejected,
                    categories
                );
        }
    }

    private static Decision requireTwoCategories(
        String allowedCode,
        Set<Factor> accepted,
        Set<Factor> rejected,
        Set<Category> categories
    ) {
        if (categories.size() < 2) {
            return denied(
                "INSUFFICIENT_INDEPENDENT_CATEGORIES",
                accepted,
                rejected,
                categories
            );
        }
        return new Decision(
            true,
            allowedCode,
            accepted,
            rejected,
            categories
        );
    }

    private static Decision denied(
        String reasonCode,
        Set<Factor> accepted,
        Set<Factor> rejected,
        Set<Category> categories
    ) {
        return new Decision(
            false,
            reasonCode,
            accepted,
            rejected,
            categories
        );
    }

    private static WatchProofDecision watchDenied(String reasonCode) {
        return new WatchProofDecision(false, reasonCode);
    }

    private static GrantDecision grantDenied(String reasonCode) {
        return new GrantDecision(false, reasonCode);
    }

    private static <T extends Enum<T>> Set<T> immutableCopy(
        Set<T> values,
        Class<T> type
    ) {
        if (values.isEmpty()) {
            return Collections.emptySet();
        }
        return Collections.unmodifiableSet(EnumSet.copyOf(values));
    }
}
