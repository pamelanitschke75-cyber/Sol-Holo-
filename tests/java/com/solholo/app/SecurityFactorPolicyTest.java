package com.solholo.app;

import java.util.Arrays;

import com.solholo.app.SecurityFactorPolicy.Decision;
import com.solholo.app.SecurityFactorPolicy.Evidence;
import com.solholo.app.SecurityFactorPolicy.Factor;
import com.solholo.app.SecurityFactorPolicy.GrantDecision;
import com.solholo.app.SecurityFactorPolicy.Operation;
import com.solholo.app.SecurityFactorPolicy.WatchProofDecision;

public final class SecurityFactorPolicyTest {
    private static final long NOW = 1_000_000L;
    private static final long FRESH_UNTIL = NOW + 30_000L;
    private static final String OWNER_A = "pam-sol";
    private static final String OWNER_B = "steffi-sol";

    public static void main(String[] args) {
        acceptsRegisteredDeviceAndStrongBiometric();
        acceptsRegisteredDeviceAndDeviceCredential();
        rejectsSingleFactor();
        rejectsTwoFactorsFromOnlyPossessionCategory();
        rejectsSystemAuthenticationWithoutRegisteredDevice();
        rejectsExpiredOrFutureEvidence();
        neverAcceptsSimpleNfcTag();
        requiresDeviceCredentialForBiometricRecovery();
        acceptsFreshCryptographicWatchAsAdditionalHighRiskFactor();
        rejectsUnverifiedOrExpiredWatchProof();
        neverTreatsWatchNfcIdentifierAsWatchProof();
        acceptsCompleteSignedWatchChallenge();
        rejectsWatchReplayExpiryCounterAndMissingConfirmation();
        rejectsUnpinnedUnattestedOrInvalidWatchSignature();
        rejectsCrossOwnerEvidenceEvenWhenFactorsOtherwisePass();
        rejectsCrossOwnerWatchProof();
        rejectsCrossOwnerAndReplayedGrant();
        rejectsMissingOrUnknownOwnerWithoutFallback();
        allowsDeviceReplacementOnlyWithCryptographicRecoveryKey();
        System.out.println("SecurityFactorPolicyTest: OK");
    }

    private static void acceptsRegisteredDeviceAndStrongBiometric() {
        Decision decision = evaluate(
            Operation.CRITICAL_ACTION,
            verified(Factor.REGISTERED_DEVICE),
            verified(Factor.SYSTEM_STRONG_BIOMETRIC)
        );
        assertAllowed(
            decision,
            "Registriertes Gerät plus starke Systembiometrie muss freigeben"
        );
        assertEquals(
            2,
            decision.independentCategories().size(),
            "Besitz und Biometrie müssen getrennte Kategorien bleiben"
        );
    }

    private static void acceptsRegisteredDeviceAndDeviceCredential() {
        assertAllowed(
            evaluate(
                Operation.CRITICAL_ACTION,
                verified(Factor.REGISTERED_DEVICE),
                verified(Factor.DEVICE_CREDENTIAL)
            ),
            "Die Android-Geräte-PIN muss der sichere Biometrie-Ersatz sein"
        );
    }

    private static void rejectsSingleFactor() {
        assertDenied(
            evaluate(
                Operation.CRITICAL_ACTION,
                verified(Factor.REGISTERED_DEVICE)
            ),
            "Ein registriertes Gerät allein darf nichts Kritisches freigeben"
        );
    }

    private static void rejectsTwoFactorsFromOnlyPossessionCategory() {
        Decision decision = evaluate(
            Operation.CRITICAL_ACTION,
            verified(Factor.REGISTERED_DEVICE),
            verified(Factor.REGISTERED_WATCH_NFC)
        );
        assertDenied(
            decision,
            "Telefon plus Uhr sind zwei Geräte, aber nur eine Faktorkategorie"
        );
        assertEquals(
            1,
            decision.independentCategories().size(),
            "Zwei Besitzfaktoren dürfen nicht als zwei unabhängige Kategorien zählen"
        );
    }

    private static void rejectsSystemAuthenticationWithoutRegisteredDevice() {
        assertReason(
            "MISSING_REGISTERED_DEVICE",
            evaluate(
                Operation.CRITICAL_ACTION,
                verified(Factor.SYSTEM_STRONG_BIOMETRIC),
                verified(Factor.DEVICE_CREDENTIAL)
            ),
            "Systemauthentifizierung darf die Geräteregistrierung nicht ersetzen"
        );
    }

    private static void rejectsExpiredOrFutureEvidence() {
        Evidence expired = Evidence.verified(
            OWNER_A,
            Factor.REGISTERED_DEVICE,
            NOW - 10_000L,
            NOW
        );
        Evidence future = Evidence.verified(
            OWNER_A,
            Factor.DEVICE_CREDENTIAL,
            NOW + 1L,
            NOW + 10_000L
        );
        Decision decision = SecurityFactorPolicy.evaluate(
            Operation.CRITICAL_ACTION,
            OWNER_A,
            Arrays.asList(expired, future),
            NOW
        );
        assertDenied(decision, "Abgelaufene oder zukünftige Beweise müssen sperren");
        assertTrue(
            decision.rejectedFactors().contains(Factor.REGISTERED_DEVICE),
            "Abgelaufener Gerätebeweis muss als verworfen erscheinen"
        );
        assertTrue(
            decision.rejectedFactors().contains(Factor.DEVICE_CREDENTIAL),
            "Zukünftiger PIN-Beweis muss als verworfen erscheinen"
        );
    }

    private static void neverAcceptsSimpleNfcTag() {
        Decision decision = evaluate(
            Operation.CRITICAL_ACTION,
            verified(Factor.REGISTERED_DEVICE),
            // Even a compromised caller marking this as "verified" must not
            // turn a UID or NDEF payload into a security factor.
            verified(Factor.SIMPLE_NFC_TAG)
        );
        assertDenied(
            decision,
            "Ein NFC-Aufkleber oder eine NFC-ID darf nie als Faktor zählen"
        );
        assertFalse(
            decision.acceptedFactors().contains(Factor.SIMPLE_NFC_TAG),
            "Ein einfacher NFC-Tag darf nie in akzeptierten Faktoren stehen"
        );
        assertTrue(
            decision.rejectedFactors().contains(Factor.SIMPLE_NFC_TAG),
            "Der einfache NFC-Tag muss ausdrücklich verworfen werden"
        );
    }

    private static void requiresDeviceCredentialForBiometricRecovery() {
        assertAllowed(
            evaluate(
                Operation.BIOMETRIC_RECOVERY,
                verified(Factor.REGISTERED_DEVICE),
                verified(Factor.DEVICE_CREDENTIAL)
            ),
            "Biometrie-Ausfall muss über Gerät plus Geräte-PIN auffangbar sein"
        );
        assertReason(
            "RECOVERY_REQUIRES_DEVICE_CREDENTIAL",
            evaluate(
                Operation.BIOMETRIC_RECOVERY,
                verified(Factor.REGISTERED_DEVICE),
                verified(Factor.SYSTEM_STRONG_BIOMETRIC)
            ),
            "Biometrie darf nicht ihre eigene Wiederherstellung bestätigen"
        );
    }

    private static void acceptsFreshCryptographicWatchAsAdditionalHighRiskFactor() {
        Decision decision = evaluate(
            Operation.HIGH_RISK_WITH_WATCH,
            verified(Factor.REGISTERED_DEVICE),
            verified(Factor.REGISTERED_WATCH_NFC),
            verified(Factor.DEVICE_CREDENTIAL)
        );
        assertAllowed(
            decision,
            "Eine frisch signierende, registrierte Uhr darf Zusatzfaktor sein"
        );
        assertTrue(
            decision.acceptedFactors().contains(Factor.REGISTERED_WATCH_NFC),
            "Der kryptografische Uhrbeweis muss sichtbar angenommen werden"
        );
    }

    private static void rejectsUnverifiedOrExpiredWatchProof() {
        Decision unverified = SecurityFactorPolicy.evaluate(
            Operation.HIGH_RISK_WITH_WATCH,
            OWNER_A,
            Arrays.asList(
                verified(Factor.REGISTERED_DEVICE),
                Evidence.unverified(OWNER_A, Factor.REGISTERED_WATCH_NFC),
                verified(Factor.DEVICE_CREDENTIAL)
            ),
            NOW
        );
        assertReason(
            "MISSING_CRYPTOGRAPHIC_WATCH_PROOF",
            unverified,
            "Eine nur behauptete Uhr darf nicht freigeben"
        );

        Evidence expiredWatch = Evidence.verified(
            OWNER_A,
            Factor.REGISTERED_WATCH_NFC,
            NOW - 5_000L,
            NOW
        );
        Decision expired = SecurityFactorPolicy.evaluate(
            Operation.HIGH_RISK_WITH_WATCH,
            OWNER_A,
            Arrays.asList(
                verified(Factor.REGISTERED_DEVICE),
                expiredWatch,
                verified(Factor.DEVICE_CREDENTIAL)
            ),
            NOW
        );
        assertReason(
            "MISSING_CRYPTOGRAPHIC_WATCH_PROOF",
            expired,
            "Ein abgelaufener Uhrbeweis muss sperren"
        );
    }

    private static void neverTreatsWatchNfcIdentifierAsWatchProof() {
        Decision decision = evaluate(
            Operation.HIGH_RISK_WITH_WATCH,
            verified(Factor.REGISTERED_DEVICE),
            verified(Factor.SIMPLE_NFC_TAG),
            verified(Factor.DEVICE_CREDENTIAL)
        );
        assertReason(
            "MISSING_CRYPTOGRAPHIC_WATCH_PROOF",
            decision,
            "NFC-ID oder Tag-Nähe ist keine Signatur einer registrierten Uhr"
        );
    }

    private static void acceptsCompleteSignedWatchChallenge() {
        WatchProofDecision decision = watchProof(
            true,
            true,
            true,
            true,
            false,
            true,
            NOW - 1_000L,
            NOW + 10_000L,
            41L,
            42L
        );
        assertTrue(
            decision.allowed(),
            "Eine gepinnte, attestierte und frisch bestätigte Uhrensignatur muss gelten"
        );
    }

    private static void rejectsWatchReplayExpiryCounterAndMissingConfirmation() {
        assertWatchReason(
            "WATCH_CHALLENGE_REPLAYED",
            watchProof(
                true, true, true, true, true, true,
                NOW - 1_000L, NOW + 10_000L, 7L, 8L
            ),
            "Eine bereits verbrauchte Challenge darf nicht wiederverwendet werden"
        );
        assertWatchReason(
            "WATCH_CHALLENGE_EXPIRED",
            watchProof(
                true, true, true, true, false, true,
                NOW - 10_000L, NOW, 7L, 8L
            ),
            "Eine abgelaufene Watch-Challenge muss sperren"
        );
        assertWatchReason(
            "WATCH_COUNTER_NOT_MONOTONIC",
            watchProof(
                true, true, true, true, false, true,
                NOW - 1_000L, NOW + 10_000L, 7L, 7L
            ),
            "Ein wiederholter oder übersprungener Zähler darf nicht gelten"
        );
        assertWatchReason(
            "WATCH_CONFIRMATION_REQUIRED",
            watchProof(
                true, true, true, true, false, false,
                NOW - 1_000L, NOW + 10_000L, 7L, 8L
            ),
            "Ohne ausdrückliche Bestätigung an der Uhr darf keine Signatur freigeben"
        );
    }

    private static void rejectsUnpinnedUnattestedOrInvalidWatchSignature() {
        assertWatchReason(
            "WATCH_PUBLIC_KEY_NOT_PINNED",
            watchProof(
                false, true, true, true, false, true,
                NOW - 1_000L, NOW + 10_000L, 7L, 8L
            ),
            "Ein beliebiger Uhrenschlüssel darf nicht akzeptiert werden"
        );
        assertWatchReason(
            "WATCH_REGISTRATION_NOT_ATTESTED",
            watchProof(
                true, false, true, true, false, true,
                NOW - 1_000L, NOW + 10_000L, 7L, 8L
            ),
            "Ein ungeprüft registrierter Uhrenschlüssel muss gesperrt bleiben"
        );
        assertWatchReason(
            "WATCH_SIGNATURE_INVALID",
            watchProof(
                true, true, false, true, false, true,
                NOW - 1_000L, NOW + 10_000L, 7L, 8L
            ),
            "Eine ungültige Signatur darf niemals als Uhrbesitz zählen"
        );
        assertWatchReason(
            "WATCH_CHALLENGE_MISMATCH",
            watchProof(
                true, true, true, false, false, true,
                NOW - 1_000L, NOW + 10_000L, 7L, 8L
            ),
            "Eine Signatur über eine andere Challenge muss gesperrt werden"
        );
    }

    private static void allowsDeviceReplacementOnlyWithCryptographicRecoveryKey() {
        assertAllowed(
            evaluate(
                Operation.REPLACE_REGISTERED_DEVICE,
                verified(Factor.CRYPTOGRAPHIC_NFC_KEY),
                verified(Factor.DEVICE_CREDENTIAL)
            ),
            "Ein attestierter NFC-Schlüssel plus Wissen darf Wiederherstellung erlauben"
        );
        assertReason(
            "DEVICE_REPLACEMENT_REQUIRES_CRYPTOGRAPHIC_NFC_KEY",
            evaluate(
                Operation.REPLACE_REGISTERED_DEVICE,
                verified(Factor.SIMPLE_NFC_TAG),
                verified(Factor.DEVICE_CREDENTIAL)
            ),
            "Ein einfacher NFC-Tag darf nie ein verlorenes Gerät ersetzen"
        );
        assertReason(
            "DEVICE_REPLACEMENT_REQUIRES_CRYPTOGRAPHIC_NFC_KEY",
            evaluate(
                Operation.REPLACE_REGISTERED_DEVICE,
                verified(Factor.REGISTERED_WATCH_NFC),
                verified(Factor.DEVICE_CREDENTIAL)
            ),
            "Eine Uhr darf ohne extern wiederhergestellten Schlüssel-Pin kein verlorenes Telefon ersetzen"
        );
    }

    private static void rejectsCrossOwnerEvidenceEvenWhenFactorsOtherwisePass() {
        Decision mixed = SecurityFactorPolicy.evaluate(
            Operation.CRITICAL_ACTION,
            OWNER_A,
            Arrays.asList(
                verified(Factor.REGISTERED_DEVICE),
                Evidence.verified(
                    OWNER_B,
                    Factor.DEVICE_CREDENTIAL,
                    NOW,
                    FRESH_UNTIL
                )
            ),
            NOW
        );
        assertReason(
            "CROSS_OWNER_EVIDENCE",
            mixed,
            "Der PIN-Nachweis einer anderen Holo-Instanz darf nicht kombiniert werden"
        );

        Decision injected = SecurityFactorPolicy.evaluate(
            Operation.CRITICAL_ACTION,
            OWNER_A,
            Arrays.asList(
                verified(Factor.REGISTERED_DEVICE),
                verified(Factor.DEVICE_CREDENTIAL),
                Evidence.verified(
                    OWNER_B,
                    Factor.REGISTERED_WATCH_NFC,
                    NOW,
                    FRESH_UNTIL
                )
            ),
            NOW
        );
        assertReason(
            "CROSS_OWNER_EVIDENCE",
            injected,
            "Schon ein eingemischter fremder Proof muss fail-closed sperren"
        );
    }

    private static void rejectsCrossOwnerWatchProof() {
        WatchProofDecision decision = SecurityFactorPolicy
            .evaluateRegisteredWatchProof(
                OWNER_A,
                OWNER_B,
                true,
                true,
                true,
                true,
                false,
                true,
                NOW - 1_000L,
                NOW + 10_000L,
                NOW,
                4L,
                5L
            );
        assertWatchReason(
            "WATCH_OWNER_SCOPE_MISMATCH",
            decision,
            "Eine registrierte Uhr darf nicht zwischen Holo-Instanzen wechseln"
        );
    }

    private static void rejectsCrossOwnerAndReplayedGrant() {
        GrantDecision crossOwner = SecurityFactorPolicy.evaluateGrant(
            OWNER_A,
            OWNER_B,
            "delete_memory",
            "delete_memory",
            NOW,
            FRESH_UNTIL,
            false
        );
        assertGrantReason(
            "CROSS_OWNER_GRANT",
            crossOwner,
            "Eine Freigabe einer anderen Holo-Instanz darf nicht nutzbar sein"
        );

        GrantDecision replay = SecurityFactorPolicy.evaluateGrant(
            OWNER_A,
            OWNER_A,
            "delete_memory",
            "delete_memory",
            NOW,
            FRESH_UNTIL,
            true
        );
        assertGrantReason(
            "GRANT_ALREADY_CONSUMED",
            replay,
            "Ein verbrauchter Grant darf auch im richtigen Owner-Scope nicht erneut gelten"
        );
    }

    private static void rejectsMissingOrUnknownOwnerWithoutFallback() {
        assertReason(
            "OWNER_NOT_ALLOWED",
            SecurityFactorPolicy.evaluate(
                Operation.CRITICAL_ACTION,
                null,
                Arrays.asList(
                    verified(Factor.REGISTERED_DEVICE),
                    verified(Factor.DEVICE_CREDENTIAL)
                ),
                NOW
            ),
            "Ohne ownerId darf keine Standard-Holo-Instanz gewählt werden"
        );
        assertReason(
            "OWNER_NOT_ALLOWED",
            SecurityFactorPolicy.evaluate(
                Operation.CRITICAL_ACTION,
                "unknown-sol",
                Arrays.asList(
                    verified(Factor.REGISTERED_DEVICE),
                    verified(Factor.DEVICE_CREDENTIAL)
                ),
                NOW
            ),
            "Unbekannte ownerIds dürfen nicht auf eine andere Instanz zurückfallen"
        );
        assertWatchReason(
            "OWNER_NOT_ALLOWED",
            SecurityFactorPolicy.evaluateRegisteredWatchProof(
                null,
                OWNER_A,
                true,
                true,
                true,
                true,
                false,
                true,
                NOW - 1_000L,
                NOW + 10_000L,
                NOW,
                4L,
                5L
            ),
            "Eine Watch-Challenge ohne Owner darf nicht verwertbar sein"
        );
        assertGrantReason(
            "OWNER_NOT_ALLOWED",
            SecurityFactorPolicy.evaluateGrant(
                null,
                OWNER_A,
                "delete_memory",
                "delete_memory",
                NOW,
                FRESH_UNTIL,
                false
            ),
            "Ein Grant ohne erwarteten Owner darf nicht verwertbar sein"
        );
        try {
            Evidence.verified(null, Factor.REGISTERED_DEVICE, NOW, FRESH_UNTIL);
            throw new AssertionError("Evidence ohne ownerId darf nicht erzeugt werden");
        } catch (IllegalArgumentException expected) {
            // Expected: Evidence has no default owner scope.
        }
    }

    private static Decision evaluate(Operation operation, Evidence... evidence) {
        return SecurityFactorPolicy.evaluate(
            operation,
            OWNER_A,
            Arrays.asList(evidence),
            NOW
        );
    }

    private static WatchProofDecision watchProof(
        boolean publicKeyPinned,
        boolean registrationAttested,
        boolean signatureVerified,
        boolean challengeMatches,
        boolean challengeAlreadyConsumed,
        boolean explicitUserConfirmation,
        long issuedAtMillis,
        long expiresAtMillis,
        long lastAcceptedCounter,
        long responseCounter
    ) {
        return SecurityFactorPolicy.evaluateRegisteredWatchProof(
            OWNER_A,
            OWNER_A,
            publicKeyPinned,
            registrationAttested,
            signatureVerified,
            challengeMatches,
            challengeAlreadyConsumed,
            explicitUserConfirmation,
            issuedAtMillis,
            expiresAtMillis,
            NOW,
            lastAcceptedCounter,
            responseCounter
        );
    }

    private static Evidence verified(Factor factor) {
        return Evidence.verified(OWNER_A, factor, NOW, FRESH_UNTIL);
    }

    private static void assertAllowed(Decision decision, String message) {
        assertTrue(decision.allowed(), message + " (" + decision.reasonCode() + ")");
    }

    private static void assertDenied(Decision decision, String message) {
        assertFalse(decision.allowed(), message + " (" + decision.reasonCode() + ")");
    }

    private static void assertReason(
        String expected,
        Decision decision,
        String message
    ) {
        assertDenied(decision, message);
        if (!expected.equals(decision.reasonCode())) {
            throw new AssertionError(
                message + ": expected=" + expected + ", actual=" + decision.reasonCode()
            );
        }
    }

    private static void assertWatchReason(
        String expected,
        WatchProofDecision decision,
        String message
    ) {
        assertFalse(decision.allowed(), message + " (" + decision.reasonCode() + ")");
        if (!expected.equals(decision.reasonCode())) {
            throw new AssertionError(
                message + ": expected=" + expected + ", actual=" + decision.reasonCode()
            );
        }
    }

    private static void assertGrantReason(
        String expected,
        GrantDecision decision,
        String message
    ) {
        assertFalse(decision.allowed(), message + " (" + decision.reasonCode() + ")");
        if (!expected.equals(decision.reasonCode())) {
            throw new AssertionError(
                message + ": expected=" + expected + ", actual=" + decision.reasonCode()
            );
        }
    }

    private static void assertEquals(int expected, int actual, String message) {
        if (expected != actual) {
            throw new AssertionError(
                message + ": expected=" + expected + ", actual=" + actual
            );
        }
    }

    private static void assertTrue(boolean value, String message) {
        if (!value) throw new AssertionError(message);
    }

    private static void assertFalse(boolean value, String message) {
        assertTrue(!value, message);
    }
}
