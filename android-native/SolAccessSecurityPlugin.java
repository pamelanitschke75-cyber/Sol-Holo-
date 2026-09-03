package com.solholo.app;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyInfo;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.cert.Certificate;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Native, local foundation for Sol Holo access security.
 *
 * <p>Critical grants require a fresh Android Keystore challenge from the
 * registered phone plus a fresh Android system authentication. The system
 * prompt accepts Class 3 biometrics or the device screen-lock credential.
 * Android reports "biometric" versus "device credential", but deliberately
 * does not expose a reliable generic distinction between face and fingerprint.
 * This plugin therefore never claims which biometric modality was used.</p>
 *
 * <p>NFC UIDs, NDEF values and ordinary tags are never accepted. The watch and
 * external NFC-key APIs remain fail-closed until a user-selected companion,
 * transport and attestation verifier have pinned a public key.</p>
 */
@CapacitorPlugin(name = "SolAccessSecurity")
public final class SolAccessSecurityPlugin extends Plugin {
    private static final String APP_OWNER_ID = "pam-sol";
    private static final String PREFS = "sol_holo_access_security_v1";
    private static final String DEVICE_KEY_ALIAS_PREFIX =
        "sol_holo_registered_device_signing_v1_";

    private static final String PREF_DEVICE_CERT_SHA256 =
        "registered_device_certificate_sha256";
    private static final String PREF_DEVICE_REGISTRATION_ID =
        "registered_device_registration_id";
    private static final String PREF_DEVICE_REGISTERED_AT =
        "registered_device_registered_at";
    private static final String PREF_DEVICE_AUTH_METHOD =
        "registered_device_enrollment_auth_method";
    private static final String PREF_DEVICE_ATTESTATION_CHAIN_SIZE =
        "registered_device_attestation_chain_size";

    private static final String PREF_WATCH_PUBLIC_KEY =
        "registered_watch_public_key_x509";
    private static final String PREF_WATCH_KEY_ALGORITHM =
        "registered_watch_key_algorithm";
    private static final String PREF_WATCH_CREDENTIAL_ID =
        "registered_watch_credential_id";
    private static final String PREF_WATCH_PROVIDER_ID =
        "registered_watch_provider_id";
    private static final String PREF_WATCH_ATTESTATION_VERIFIED =
        "registered_watch_attestation_verified";
    private static final String PREF_WATCH_EXPLICITLY_SELECTED =
        "registered_watch_explicitly_selected";
    private static final String PREF_WATCH_HCE_RUNTIME_VERIFIED =
        "registered_watch_hce_runtime_verified";
    private static final String PREF_WATCH_COUNTER =
        "registered_watch_last_counter";

    private static final int SYSTEM_AUTHENTICATORS =
        BiometricManager.Authenticators.BIOMETRIC_STRONG
            | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
    private static final int MIN_RELIABLE_AUTH_TYPE_API = 30;
    private static final long FRESH_PROOF_MS = 60_000L;
    private static final long GRANT_TTL_MS = 90_000L;
    private static final long WATCH_CHALLENGE_TTL_MS = 45_000L;
    private static final long WATCH_PROOF_TTL_MS = 30_000L;
    private static final int CHALLENGE_BYTES = 32;
    // Consent canonical JSON only contains the explicit receipt fields. A
    // bounded request prevents this native signer from becoming a generic
    // large-content signing oracle.
    private static final int MAX_CONSENT_CANONICAL_PAYLOAD_BYTES = 16 * 1024;
    private static final String CONSENT_SIGNATURE_ALGORITHM =
        "SHA256withECDSA";
    private static final String CONSENT_SIGNATURE_FORMAT =
        "base64url-no-padding-der";
    private static final String TRUSTED_SESSION_ACTION =
        "bind_trusted_app_session";
    private static final String TRUSTED_SESSION_PURPOSE =
        "owner_personal_services";
    private static final String TRUSTED_SESSION_PACKAGE =
        "com.solholo.app";
    private static final long TRUSTED_SESSION_MAX_CHALLENGE_MS = 3 * 60_000L;

    private final SecureRandom secureRandom = new SecureRandom();
    private final AtomicBoolean systemAuthenticationInProgress =
        new AtomicBoolean(false);
    private final ConcurrentHashMap<String, CriticalGrant> grants =
        new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, WatchChallenge> watchChallenges =
        new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ConsumedWatchChallenge> consumedWatchChallenges =
        new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, WatchProof> watchProofs =
        new ConcurrentHashMap<>();

    /**
     * Contract for a future, explicitly selected NFC security-key provider.
     * No implementation is installed in this build. A provider must validate
     * a one-time challenge and an attestation chain; tag IDs are not inputs.
     */
    interface NfcSecurityKeyAttestationVerifier {
        String selectedProviderId();

        boolean verifyRegistrationAttestation(
            byte[] challenge,
            byte[] credentialPublicKey,
            List<byte[]> attestationChain,
            byte[] signedChallenge
        ) throws Exception;
    }

    private enum AuthenticationPurpose {
        REGISTER_DEVICE,
        APP_ACCESS,
        CRITICAL_ACTION,
        BIOMETRIC_RECOVERY
    }

    private static final class DeviceState {
        final boolean keyExists;
        final boolean metadataExists;
        final boolean certificateMatches;
        final boolean signatureWorks;
        final boolean hardwareBacked;
        final String securityLevel;
        final int attestationChainSize;

        DeviceState(
            boolean keyExists,
            boolean metadataExists,
            boolean certificateMatches,
            boolean signatureWorks,
            boolean hardwareBacked,
            String securityLevel,
            int attestationChainSize
        ) {
            this.keyExists = keyExists;
            this.metadataExists = metadataExists;
            this.certificateMatches = certificateMatches;
            this.signatureWorks = signatureWorks;
            this.hardwareBacked = hardwareBacked;
            this.securityLevel = securityLevel;
            this.attestationChainSize = attestationChainSize;
        }

        boolean verified() {
            return keyExists
                && metadataExists
                && certificateMatches
                && signatureWorks
                && hardwareBacked;
        }

        String state() {
            if (verified()) return "registriert";
            if (!keyExists && !metadataExists) return "nicht_eingerichtet";
            return "reparatur_erforderlich";
        }
    }

    private static final class CriticalGrant {
        final String ownerId;
        final String action;
        final long expiresAtMillis;

        CriticalGrant(String ownerId, String action, long expiresAtMillis) {
            this.ownerId = ownerId;
            this.action = action;
            this.expiresAtMillis = expiresAtMillis;
        }
    }

    private static final class WatchChallenge {
        final String ownerId;
        final String id;
        final String action;
        final String credentialId;
        final byte[] nonce;
        final long issuedAtMillis;
        final long expiresAtMillis;
        final long expectedCounter;
        final byte[] canonicalPayload;

        WatchChallenge(
            String ownerId,
            String id,
            String action,
            String credentialId,
            byte[] nonce,
            long issuedAtMillis,
            long expiresAtMillis,
            long expectedCounter,
            byte[] canonicalPayload
        ) {
            this.ownerId = ownerId;
            this.id = id;
            this.action = action;
            this.credentialId = credentialId;
            this.nonce = nonce.clone();
            this.issuedAtMillis = issuedAtMillis;
            this.expiresAtMillis = expiresAtMillis;
            this.expectedCounter = expectedCounter;
            this.canonicalPayload = canonicalPayload.clone();
        }
    }

    private static final class WatchProof {
        final String ownerId;
        final String action;
        final long verifiedAtMillis;
        final long expiresAtMillis;

        WatchProof(
            String ownerId,
            String action,
            long verifiedAtMillis,
            long expiresAtMillis
        ) {
            this.ownerId = ownerId;
            this.action = action;
            this.verifiedAtMillis = verifiedAtMillis;
            this.expiresAtMillis = expiresAtMillis;
        }
    }

    private static final class ConsumedWatchChallenge {
        final String ownerId;
        final long expiresAtMillis;

        ConsumedWatchChallenge(String ownerId, long expiresAtMillis) {
            this.ownerId = ownerId;
            this.expiresAtMillis = expiresAtMillis;
        }
    }

    private SharedPreferences prefs(String ownerId) {
        // Separate preference files make accidental cross-owner reads
        // impossible even when metadata names are identical.
        return getContext().getSharedPreferences(
            PREFS + "_" + ownerId,
            Context.MODE_PRIVATE
        );
    }

    private String deviceKeyAlias(String ownerId) {
        return DEVICE_KEY_ALIAS_PREFIX + ownerId;
    }

    private String requiredOwnerId(PluginCall call) {
        String ownerId = call.getString("ownerId", null);
        if (!SecurityFactorPolicy.isAllowedOwnerId(ownerId)) {
            call.reject(
                "Für diese Holo-Instanz ist eine bekannte ownerId erforderlich.",
                "OWNER_ID_REQUIRED_OR_NOT_ALLOWED"
            );
            return null;
        }
        if (!SecurityFactorPolicy.isOwnerBoundToInstance(ownerId, APP_OWNER_ID)) {
            call.reject(
                "Diese signierte Holo-Instanz akzeptiert ausschließlich ihre eigene ownerId.",
                "OWNER_SCOPE_MISMATCH"
            );
            return null;
        }
        return ownerId;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        String ownerId = requiredOwnerId(call);
        if (ownerId == null) return;
        call.resolve(buildStatus(ownerId));
    }

    /**
     * Returns only the public half and local identifier of the hardware-backed
     * device key. The private key never leaves Android Keystore.
     */
    @PluginMethod
    public void getTrustedSessionDevice(PluginCall call) {
        String ownerId = requiredOwnerId(call);
        if (ownerId == null) return;
        DeviceState device = inspectDeviceState(ownerId);
        if (!device.verified()) {
            call.reject(
                "Dieses Gerät ist noch nicht als sicherer Besitzfaktor registriert.",
                "REGISTERED_DEVICE_REQUIRED"
            );
            return;
        }

        try {
            KeyStore.PrivateKeyEntry entry = privateKeyEntry(
                androidKeyStore(),
                ownerId
            );
            if (entry == null || entry.getCertificate() == null) {
                throw new SecurityException("Registered device key is missing");
            }
            String registrationId = prefs(ownerId).getString(
                PREF_DEVICE_REGISTRATION_ID,
                ""
            );
            String certificateSha256 = prefs(ownerId).getString(
                PREF_DEVICE_CERT_SHA256,
                ""
            );
            if (
                !registrationId.matches(
                    "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}"
                )
                    || !certificateSha256.matches("[a-f0-9]{64}")
            ) {
                throw new SecurityException("Registered device metadata is invalid");
            }

            JSObject result = new JSObject();
            result.put("ownerId", ownerId);
            result.put("registrationId", registrationId);
            result.put("packageName", getContext().getPackageName());
            result.put(
                "publicKeyX509Base64Url",
                encodeBase64(entry.getCertificate().getPublicKey().getEncoded())
            );
            result.put("certificateSha256", certificateSha256);
            result.put("algorithm", "EC_P256_SHA256");
            result.put("hardwareBacked", device.hardwareBacked);
            result.put("keySecurityLevel", device.securityLevel);
            call.resolve(result);
        } catch (Exception error) {
            call.reject(
                "Der öffentliche Geräteschlüssel konnte nicht sicher gelesen werden.",
                "TRUSTED_SESSION_DEVICE_UNAVAILABLE",
                error
            );
        }
    }

    /**
     * Consumes a fresh one-time Android authorization and signs exactly one
     * server-issued session challenge. This is deliberately not a generic
     * signing API.
     */
    @PluginMethod
    public void signTrustedSessionChallenge(PluginCall call) {
        String ownerId = requiredOwnerId(call);
        if (ownerId == null) return;
        cleanupExpiredState();

        String authorizationId = call.getString("authorizationId", "");
        String registrationId = call.getString("registrationId", "");
        String challengeId = call.getString("challengeId", "");
        String nonceBase64Url = call.getString("nonceBase64Url", "");
        String packageName = call.getString("packageName", "");
        String purpose = call.getString("purpose", "");
        String action = call.getString("action", "");
        Long issuedAtMillis = SecurityFactorPolicy.parseEpochMillis(
            call.getData().opt("issuedAtMillis")
        );
        Long expiresAtMillis = SecurityFactorPolicy.parseEpochMillis(
            call.getData().opt("expiresAtMillis")
        );

        long now = System.currentTimeMillis();
        String localRegistrationId = prefs(ownerId).getString(
            PREF_DEVICE_REGISTRATION_ID,
            ""
        );
        byte[] nonce = null;
        try {
            nonce = decodeBase64(nonceBase64Url);
        } catch (RuntimeException ignored) {
            // The validation below rejects malformed Base64URL uniformly.
        }

        if (
            authorizationId == null
                || authorizationId.isEmpty()
                || registrationId == null
                || !registrationId.equals(localRegistrationId)
                || challengeId == null
                || !challengeId.matches(
                    "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}"
                )
                || nonce == null
                || nonce.length != CHALLENGE_BYTES
                || !TRUSTED_SESSION_PACKAGE.equals(packageName)
                || !getContext().getPackageName().equals(packageName)
                || !TRUSTED_SESSION_PURPOSE.equals(purpose)
                || !TRUSTED_SESSION_ACTION.equals(action)
                || !SecurityFactorPolicy.isTrustedSessionChallengeWindowValid(
                    issuedAtMillis,
                    expiresAtMillis,
                    TRUSTED_SESSION_MAX_CHALLENGE_MS
                )
        ) {
            if (nonce != null) Arrays.fill(nonce, (byte)0);
            call.reject(
                "Die Server-Challenge für die sichere App-Sitzung ist ungültig oder abgelaufen.",
                "TRUSTED_SESSION_CHALLENGE_INVALID"
            );
            return;
        }

        CriticalGrant grant = grants.remove(authorizationId);
        SecurityFactorPolicy.GrantDecision grantDecision =
            SecurityFactorPolicy.evaluateGrant(
                ownerId,
                grant == null ? null : grant.ownerId,
                TRUSTED_SESSION_ACTION,
                grant == null ? null : grant.action,
                now,
                grant == null ? 0L : grant.expiresAtMillis,
                grant == null
            );
        if (!grantDecision.allowed()) {
            Arrays.fill(nonce, (byte)0);
            call.reject(
                "Die einmalige Android-Freigabe für die sichere App-Sitzung fehlt oder ist abgelaufen.",
                grantDecision.reasonCode()
            );
            return;
        }

        String canonicalPayload = String.join(
            "\n",
            "SOL_HOLO_TRUSTED_APP_SESSION_V1",
            packageName,
            ownerId,
            registrationId,
            challengeId,
            nonceBase64Url,
            String.valueOf(issuedAtMillis),
            String.valueOf(expiresAtMillis),
            TRUSTED_SESSION_PURPOSE
        );
        byte[] canonicalBytes = canonicalPayload.getBytes(StandardCharsets.UTF_8);
        try {
            DeviceState device = inspectDeviceState(ownerId);
            KeyStore.PrivateKeyEntry entry = privateKeyEntry(
                androidKeyStore(),
                ownerId
            );
            if (!device.verified() || entry == null) {
                throw new SecurityException("Registered device is no longer valid");
            }
            Signature signer = Signature.getInstance("SHA256withECDSA");
            signer.initSign(entry.getPrivateKey());
            signer.update(canonicalBytes);

            JSObject result = new JSObject();
            result.put("ok", true);
            result.put("ownerId", ownerId);
            result.put("registrationId", registrationId);
            result.put("challengeId", challengeId);
            result.put("signatureBase64Url", encodeBase64(signer.sign()));
            result.put("algorithm", "SHA256withECDSA");
            result.put("authorizationConsumed", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject(
                "Die sichere App-Challenge konnte nicht mit dem registrierten Geräteschlüssel signiert werden.",
                "TRUSTED_SESSION_SIGNING_FAILED",
                error
            );
        } finally {
            Arrays.fill(nonce, (byte)0);
            Arrays.fill(canonicalBytes, (byte)0);
        }
    }

    @PluginMethod
    public void registerCurrentDevice(PluginCall call) {
        String ownerId = requiredOwnerId(call);
        if (ownerId == null) return;
        if (!supportsReliableAuthenticationType()) {
            rejectUnsupportedAndroid(call);
            return;
        }

        DeviceState current = inspectDeviceState(ownerId);
        if (current.verified()) {
            JSObject result = buildStatus(ownerId);
            result.put("alreadyRegistered", true);
            call.resolve(result);
            return;
        }
        if (current.metadataExists && !current.keyExists) {
            call.reject(
                "Die bestehende Geräteregistrierung ist beschädigt. Sie wird nicht automatisch durch einen schwächeren Weg ersetzt.",
                "DEVICE_REGISTRATION_REPAIR_REQUIRED"
            );
            return;
        }

        startSystemAuthentication(
            call,
            AuthenticationPurpose.REGISTER_DEVICE,
            ownerId,
            "register_current_device",
            false,
            ""
        );
    }

    @PluginMethod
    public void authorizeCriticalAction(PluginCall call) {
        String ownerId = requiredOwnerId(call);
        if (ownerId == null) return;
        String action = validAction(call.getString("action", ""));
        if (action == null) {
            call.reject(
                "Für die Sicherheitsfreigabe fehlt eine eindeutige Aktionskennung.",
                "INVALID_ACTION"
            );
            return;
        }
        if (!inspectDeviceState(ownerId).verified()) {
            call.reject(
                "Dieses Gerät ist noch nicht als sicherer Besitzfaktor registriert.",
                "REGISTERED_DEVICE_REQUIRED"
            );
            return;
        }

        boolean requireWatch = Boolean.TRUE.equals(
            call.getBoolean("requireRegisteredWatch", false)
        );
        String watchProofId = call.getString("watchProofId", "");
        if (requireWatch && !isWatchConfigured(ownerId)) {
            call.reject(
                "Die kryptografische Uhr ist noch nicht eingerichtet und wird deshalb nicht vorgetäuscht.",
                "REGISTERED_WATCH_NOT_CONFIGURED"
            );
            return;
        }

        startSystemAuthentication(
            call,
            AuthenticationPurpose.CRITICAL_ACTION,
            ownerId,
            action,
            requireWatch,
            watchProofId
        );
    }

    /**
     * Unlocks the owner-bound app surface after a fresh device-key proof and
     * Android system authentication. Android owns all biometric templates;
     * Sol Holo receives neither fingerprint data nor a biometric identity.
     */
    @PluginMethod
    public void authorizeAppAccess(PluginCall call) {
        String ownerId = requiredOwnerId(call);
        if (ownerId == null) return;
        if (!inspectDeviceState(ownerId).verified()) {
            call.reject(
                "Dieses Gerät muss vor dem Entsperren einmal sicher registriert werden.",
                "REGISTERED_DEVICE_REQUIRED"
            );
            return;
        }
        startSystemAuthentication(
            call,
            AuthenticationPurpose.APP_ACCESS,
            ownerId,
            "unlock_app",
            false,
            ""
        );
    }

    @PluginMethod
    public void authorizeBiometricRecovery(PluginCall call) {
        String ownerId = requiredOwnerId(call);
        if (ownerId == null) return;
        if (!inspectDeviceState(ownerId).verified()) {
            call.reject(
                "Für die Biometrie-Wiederherstellung fehlt der registrierte Gerätebeweis.",
                "REGISTERED_DEVICE_REQUIRED"
            );
            return;
        }
        startSystemAuthentication(
            call,
            AuthenticationPurpose.BIOMETRIC_RECOVERY,
            ownerId,
            "recover_biometric_access",
            false,
            ""
        );
    }

    @PluginMethod
    public void consumeCriticalAuthorization(PluginCall call) {
        String ownerId = requiredOwnerId(call);
        if (ownerId == null) return;
        cleanupExpiredState();
        String grantId = call.getString("authorizationId", "");
        String action = validAction(call.getString("action", ""));
        if (grantId == null || grantId.isEmpty() || action == null) {
            call.reject("Ungültige Freigabeanforderung.", "INVALID_GRANT_REQUEST");
            return;
        }

        // Removal happens before comparison: every grant is one-time, even if
        // a caller supplies the wrong action.
        CriticalGrant grant = grants.remove(grantId);
        long now = System.currentTimeMillis();
        SecurityFactorPolicy.GrantDecision decision =
            SecurityFactorPolicy.evaluateGrant(
                ownerId,
                grant == null ? null : grant.ownerId,
                action,
                grant == null ? null : grant.action,
                now,
                grant == null ? 0L : grant.expiresAtMillis,
                grant == null
            );
        if (!decision.allowed()) {
            call.reject(
                "Die Sicherheitsfreigabe ist ungültig, abgelaufen oder bereits verbraucht.",
                decision.reasonCode()
            );
            return;
        }

        JSObject result = new JSObject();
        result.put("allowed", true);
        result.put("action", action);
        result.put("ownerId", ownerId);
        result.put("consumed", true);
        result.put("reusable", false);
        call.resolve(result);
    }

    /**
     * Signs an already-canonical, explicit consent receipt after a fresh
     * Android confirmation. This API intentionally accepts neither canvas
     * pixels nor stroke data and retains none of the supplied content.
     */
    @PluginMethod
    public void signConsentPayload(PluginCall call) {
        String ownerId = requiredOwnerId(call);
        if (ownerId == null) return;

        String payloadSha256 = call.getString("payloadSha256", "");
        String canonicalPayload = call.getString("canonicalPayload", "");
        if (
            payloadSha256 == null
                || !payloadSha256.matches("[a-f0-9]{64}")
                || canonicalPayload == null
        ) {
            call.reject(
                "Der Signierauftrag enthält keinen gültigen kanonischen SHA-256-Wert.",
                "CONSENT_SIGN_REQUEST_INVALID"
            );
            return;
        }

        byte[] canonicalBytes = canonicalPayload.getBytes(StandardCharsets.UTF_8);
        if (
            canonicalBytes.length == 0
                || canonicalBytes.length > MAX_CONSENT_CANONICAL_PAYLOAD_BYTES
        ) {
            call.reject(
                "Der kanonische Einwilligungsbeleg ist leer oder zu groß.",
                "CONSENT_CANONICAL_PAYLOAD_INVALID"
            );
            return;
        }

        try {
            String computedHash = sha256Hex(canonicalBytes);
            if (!constantTimeEquals(payloadSha256, computedHash)) {
                call.reject(
                    "Der angegebene Hash stimmt nicht mit dem kanonischen Einwilligungsbeleg überein.",
                    "CONSENT_PAYLOAD_HASH_MISMATCH"
                );
                return;
            }
        } catch (Exception error) {
            call.reject(
                "Der kanonische Einwilligungsbeleg konnte nicht geprüft werden.",
                "CONSENT_PAYLOAD_HASH_UNAVAILABLE",
                error
            );
            return;
        }

        if (!inspectDeviceState(ownerId).verified()) {
            call.reject(
                "Für die Einwilligungssignatur fehlt der registrierte Gerätebeweis.",
                "REGISTERED_DEVICE_REQUIRED"
            );
            return;
        }

        startConsentSignatureAuthentication(
            call,
            ownerId,
            canonicalBytes,
            payloadSha256
        );
    }

    @PluginMethod
    public void beginRegisteredWatchNfcChallenge(PluginCall call) {
        String ownerId = requiredOwnerId(call);
        if (ownerId == null) return;
        String action = validAction(call.getString("action", ""));
        if (action == null) {
            call.reject("Ungültige Aktionskennung.", "INVALID_ACTION");
            return;
        }
        if (!isWatchConfigured(ownerId)) {
            call.reject(
                "Ein Watch-HCE-/Companion-Gerätetest und die attestierte Schlüsselregistrierung stehen noch aus.",
                "REGISTERED_WATCH_NOT_CONFIGURED"
            );
            return;
        }

        cleanupExpiredState();
        long now = System.currentTimeMillis();
        long lastCounter = prefs(ownerId).getLong(PREF_WATCH_COUNTER, -1L);
        if (lastCounter < 0L || lastCounter == Long.MAX_VALUE) {
            call.reject(
                "Der geschützte Uhrzähler ist nicht gültig.",
                "WATCH_COUNTER_INVALID"
            );
            return;
        }

        String id = randomId();
        byte[] nonce = randomBytes(CHALLENGE_BYTES);
        long expiresAt = now + WATCH_CHALLENGE_TTL_MS;
        long expectedCounter = lastCounter + 1L;
        String credentialId = prefs(ownerId).getString(PREF_WATCH_CREDENTIAL_ID, "");
        byte[] canonical = canonicalWatchPayload(
            ownerId,
            id,
            action,
            credentialId,
            nonce,
            now,
            expiresAt,
            expectedCounter
        );
        watchChallenges.put(
            id,
            new WatchChallenge(
                ownerId,
                id,
                action,
                credentialId,
                nonce,
                now,
                expiresAt,
                expectedCounter,
                canonical
            )
        );

        JSObject result = new JSObject();
        result.put("challengeId", id);
        result.put("ownerId", ownerId);
        result.put("challengeBase64", encodeBase64(nonce));
        result.put("canonicalPayloadBase64", encodeBase64(canonical));
        result.put("expectedCounter", expectedCounter);
        result.put("expiresAtMillis", expiresAt);
        result.put("explicitConfirmationOnWatchRequired", true);
        result.put("nfcUidAccepted", false);
        result.put("serviceCategory", "CATEGORY_OTHER");
        result.put("walletRoleRequested", false);
        call.resolve(result);
    }

    @PluginMethod
    public void completeRegisteredWatchNfcChallenge(PluginCall call) {
        String ownerId = requiredOwnerId(call);
        if (ownerId == null) return;
        cleanupExpiredState();
        String challengeId = call.getString("challengeId", "");
        if (challengeId == null || challengeId.isEmpty()) {
            call.reject("Watch-Challenge fehlt.", "WATCH_CHALLENGE_MISSING");
            return;
        }
        ConsumedWatchChallenge consumed = consumedWatchChallenges.get(challengeId);
        if (consumed != null) {
            call.reject(
                constantTimeEquals(consumed.ownerId, ownerId)
                    ? "Diese Watch-Challenge wurde bereits verwendet."
                    : "Diese Watch-Challenge gehört zu einer anderen Holo-Instanz.",
                constantTimeEquals(consumed.ownerId, ownerId)
                    ? "WATCH_CHALLENGE_REPLAYED"
                    : "WATCH_OWNER_SCOPE_MISMATCH"
            );
            return;
        }

        // Consume before validation so an attacker cannot try several
        // signatures or counters against the same nonce.
        WatchChallenge challenge = watchChallenges.remove(challengeId);
        if (challenge == null) {
            call.reject(
                "Die Watch-Challenge ist unbekannt oder abgelaufen.",
                "WATCH_CHALLENGE_INVALID"
            );
            return;
        }
        consumedWatchChallenges.put(
            challengeId,
            new ConsumedWatchChallenge(challenge.ownerId, challenge.expiresAtMillis)
        );

        if (!constantTimeEquals(challenge.ownerId, ownerId)) {
            call.reject(
                "Diese Watch-Challenge gehört zu einer anderen Holo-Instanz.",
                "WATCH_OWNER_SCOPE_MISMATCH"
            );
            return;
        }

        if (!isWatchConfigured(ownerId)) {
            call.reject(
                "Die attestierte Uhrregistrierung ist nicht eingerichtet.",
                "REGISTERED_WATCH_NOT_CONFIGURED"
            );
            return;
        }

        Number counterValue = (Number)call.getData().opt("counter");
        long counter = counterValue == null ? Long.MIN_VALUE : counterValue.longValue();
        boolean explicitConfirmation = Boolean.TRUE.equals(
            call.getBoolean("explicitUserConfirmation", false)
        );
        String signatureBase64 = call.getString("signatureBase64", "");
        boolean signatureVerified = verifyWatchSignature(
            ownerId,
            challenge.canonicalPayload,
            signatureBase64
        );
        long now = System.currentTimeMillis();
        long lastCounter = prefs(ownerId).getLong(PREF_WATCH_COUNTER, -1L);

        SecurityFactorPolicy.WatchProofDecision decision =
            SecurityFactorPolicy.evaluateRegisteredWatchProof(
                ownerId,
                challenge.ownerId,
                hasPinnedWatchPublicKey(ownerId),
                prefs(ownerId).getBoolean(PREF_WATCH_ATTESTATION_VERIFIED, false),
                signatureVerified,
                constantTimeEquals(challenge.id, challengeId),
                false,
                explicitConfirmation,
                challenge.issuedAtMillis,
                challenge.expiresAtMillis,
                now,
                lastCounter,
                counter
            );
        if (!decision.allowed() || counter != challenge.expectedCounter) {
            call.reject(
                "Der kryptografische Uhrbeweis wurde nicht freigegeben.",
                decision.allowed()
                    ? "WATCH_COUNTER_CHALLENGE_MISMATCH"
                    : decision.reasonCode()
            );
            return;
        }

        if (!prefs(ownerId).edit().putLong(PREF_WATCH_COUNTER, counter).commit()) {
            call.reject(
                "Der geschützte Uhrzähler konnte nicht dauerhaft aktualisiert werden.",
                "WATCH_COUNTER_PERSIST_FAILED"
            );
            return;
        }

        String proofId = randomId();
        watchProofs.put(
            proofId,
            new WatchProof(ownerId, challenge.action, now, now + WATCH_PROOF_TTL_MS)
        );
        JSObject result = new JSObject();
        result.put("verified", true);
        result.put("watchProofId", proofId);
        result.put("ownerId", ownerId);
        result.put("action", challenge.action);
        result.put("expiresAtMillis", now + WATCH_PROOF_TTL_MS);
        result.put("counter", counter);
        result.put("explicitConfirmationVerifiedBySignedPayload", true);
        result.put("nfcUidAccepted", false);
        call.resolve(result);
    }

    @PluginMethod
    public void beginNfcSecurityKeyAttestation(PluginCall call) {
        if (requiredOwnerId(call) == null) return;
        // What is missing is a user-selected key type, its protocol and trust
        // anchors. Returning a fake challenge before those exist would create
        // the appearance of security without a verifier, so this API
        // intentionally fails closed. Private approval metadata is not part of
        // this public runtime contract.
        call.reject(
            "Ein kryptografischer NFC-Schlüsseltyp und dessen Attestierungsprüfer sind noch nicht ausgewählt.",
            "NFC_SECURITY_KEY_NOT_CONFIGURED"
        );
    }

    @PluginMethod
    public void submitSimpleNfcTag(PluginCall call) {
        if (requiredOwnerId(call) == null) return;
        call.reject(
            "Eine NFC-ID, ein NDEF-Wert oder ein einfacher NFC-Tag ist ausdrücklich kein Sicherheitsfaktor.",
            "SIMPLE_NFC_TAG_NEVER_ACCEPTED"
        );
    }

    private JSObject buildStatus(String ownerId) {
        cleanupExpiredState();
        DeviceState device = inspectDeviceState(ownerId);
        BiometricManager manager = BiometricManager.from(getContext());
        int combinedStatus = manager.canAuthenticate(SYSTEM_AUTHENTICATORS);
        int biometricStatus = manager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        );
        int credentialStatus = manager.canAuthenticate(
            BiometricManager.Authenticators.DEVICE_CREDENTIAL
        );
        KeyguardManager keyguard = (KeyguardManager)getContext().getSystemService(
            Context.KEYGUARD_SERVICE
        );
        boolean deviceCredentialSet = keyguard != null && keyguard.isDeviceSecure();

        JSObject deviceStatus = new JSObject();
        deviceStatus.put("state", device.state());
        deviceStatus.put("registered", device.verified());
        deviceStatus.put("keyExists", device.keyExists);
        deviceStatus.put("metadataExists", device.metadataExists);
        deviceStatus.put("certificateMatches", device.certificateMatches);
        deviceStatus.put("freshChallengeSignatureWorks", device.signatureWorks);
        deviceStatus.put("hardwareBacked", device.hardwareBacked);
        deviceStatus.put("keySecurityLevel", device.securityLevel);
        deviceStatus.put("attestationChainSize", device.attestationChainSize);
        deviceStatus.put("remoteAttestationVerified", false);
        deviceStatus.put("applicationIdPreserved", getContext().getPackageName());

        JSObject systemAuth = new JSObject();
        systemAuth.put("minimumApi", MIN_RELIABLE_AUTH_TYPE_API);
        systemAuth.put("supported", supportsReliableAuthenticationType());
        systemAuth.put("strongBiometricOrCredentialStatus", combinedStatus);
        systemAuth.put("strongBiometricStatus", biometricStatus);
        systemAuth.put("deviceCredentialStatus", credentialStatus);
        systemAuth.put("deviceCredentialSet", deviceCredentialSet);
        systemAuth.put("allowsBiometricClass", "BIOMETRIC_STRONG_CLASS_3");
        systemAuth.put("allowsDeviceCredential", true);
        systemAuth.put("weakBiometricAccepted", false);
        systemAuth.put("confirmationRequired", true);
        systemAuth.put("reportsBiometricVsCredential", true);
        systemAuth.put("reportsFaceVsFingerprintSeparately", false);
        systemAuth.put(
            "modalityLimit",
            "Android meldet generisch Biometrie oder Geräte-PIN/-Muster/-Passwort; Gesicht und Finger werden appübergreifend nicht zuverlässig getrennt gemeldet."
        );

        JSObject watch = new JSObject();
        watch.put("factorName", "registered_watch_nfc");
        watch.put("state", isWatchConfigured(ownerId) ? "eingerichtet" : "nicht_eingerichtet");
        watch.put("configured", isWatchConfigured(ownerId));
        watch.put("publicKeyPinned", hasPinnedWatchPublicKey(ownerId));
        watch.put(
            "registrationAttested",
            prefs(ownerId).getBoolean(PREF_WATCH_ATTESTATION_VERIFIED, false)
        );
        watch.put(
            "explicitlySelectedByOwner",
            prefs(ownerId).getBoolean(PREF_WATCH_EXPLICITLY_SELECTED, false)
        );
        watch.put(
            "watchHceRuntimeVerified",
            prefs(ownerId).getBoolean(PREF_WATCH_HCE_RUNTIME_VERIFIED, false)
        );
        watch.put("companionImplemented", false);
        watch.put("transportImplemented", false);
        watch.put("challengeBytes", CHALLENGE_BYTES);
        watch.put("challengeTtlMillis", WATCH_CHALLENGE_TTL_MS);
        watch.put("signatureRequired", true);
        watch.put("explicitConfirmationOnWatchRequired", true);
        watch.put("monotonicCounterRequired", true);
        watch.put("replayProtection", true);
        watch.put("rawNfcIdAccepted", false);
        watch.put("nfcServiceCategory", "CATEGORY_OTHER");
        watch.put("defaultWalletRequested", false);
        watch.put("existingFidoServiceRepurposed", false);

        PackageManager packageManager = getContext().getPackageManager();
        JSObject nfc = new JSObject();
        nfc.put("newGeneralInAppPromptPlanned", false);
        nfc.put(
            "phoneNfcFeaturePresent",
            packageManager.hasSystemFeature(PackageManager.FEATURE_NFC)
        );
        nfc.put(
            "phoneHceFeaturePresent",
            packageManager.hasSystemFeature(
                PackageManager.FEATURE_NFC_HOST_CARD_EMULATION
            )
        );
        nfc.put("securityKeyState", "nicht_eingerichtet");
        nfc.put("selectedSecurityKeyProvider", "");
        nfc.put("attestationVerifierConfigured", false);
        nfc.put("simpleTagAccepted", false);
        nfc.put("paymentCategoryUsed", false);
        nfc.put("walletRoleRequested", false);
        nfc.put("googleWalletConfigurationChanged", false);
        nfc.put("nearbyServiceChanged", false);
        nfc.put("fidoNfcEmulationServiceReused", false);
        nfc.put("digitalCarKeyServiceChanged", false);

        JSObject policy = new JSObject();
        policy.put("criticalActionMinimumIndependentCategories", 2);
        policy.put(
            "normalCriticalAction",
            "registered_device + (system_strong_biometric OR device_credential)"
        );
        policy.put(
            "biometricRecovery",
            "registered_device + device_credential"
        );
        policy.put(
            "highRiskWithWatch",
            "registered_device + registered_watch_nfc + (system_strong_biometric OR device_credential)"
        );
        policy.put("singleNfcTagCanAuthorize", false);
        policy.put("grantsOneTime", true);
        policy.put("grantTtlMillis", GRANT_TTL_MS);

        JSObject status = new JSObject();
        status.put("version", 1);
        status.put("ownerId", ownerId);
        status.put("localOnly", true);
        status.put("rawBiometricDataStored", false);
        status.put("device", deviceStatus);
        status.put("systemAuthentication", systemAuth);
        status.put("watch", watch);
        status.put("nfc", nfc);
        status.put("policy", policy);
        status.put(
            "criticalActionReady",
            device.verified()
                && supportsReliableAuthenticationType()
                && combinedStatus == BiometricManager.BIOMETRIC_SUCCESS
        );
        status.put(
            "recoveryReadyWithoutBiometric",
            device.verified() && deviceCredentialSet
        );
        return status;
    }

    private void startSystemAuthentication(
        PluginCall call,
        AuthenticationPurpose purpose,
        String ownerId,
        String action,
        boolean requireWatch,
        String watchProofId
    ) {
        if (!supportsReliableAuthenticationType()) {
            rejectUnsupportedAndroid(call);
            return;
        }
        if (!systemAuthenticationInProgress.compareAndSet(false, true)) {
            call.reject(
                "Eine Android-Sicherheitsprüfung läuft bereits.",
                "AUTHENTICATION_ALREADY_IN_PROGRESS"
            );
            return;
        }

        int authenticators = purpose == AuthenticationPurpose.BIOMETRIC_RECOVERY
            ? BiometricManager.Authenticators.DEVICE_CREDENTIAL
            : SYSTEM_AUTHENTICATORS;
        int availability = BiometricManager.from(getContext()).canAuthenticate(
            authenticators
        );
        if (availability != BiometricManager.BIOMETRIC_SUCCESS) {
            systemAuthenticationInProgress.set(false);
            JSObject details = new JSObject();
            details.put("androidBiometricStatus", availability);
            details.put("requestedAuthenticators", authenticators);
            call.reject(
                "Die angeforderte Android-Systemauthentifizierung ist derzeit nicht verfügbar.",
                "SYSTEM_AUTHENTICATION_UNAVAILABLE",
                details
            );
            return;
        }

        if (!(getActivity() instanceof FragmentActivity)) {
            systemAuthenticationInProgress.set(false);
            call.reject(
                "Die Android-Sicherheitsanzeige kann in dieser App-Ansicht nicht geöffnet werden.",
                "BIOMETRIC_HOST_ACTIVITY_UNAVAILABLE"
            );
            return;
        }

        FragmentActivity activity = (FragmentActivity)getActivity();
        activity.runOnUiThread(() -> {
            try {
                launchSystemAuthenticationPrompt(
                    call,
                    activity,
                    purpose,
                    ownerId,
                    action,
                    requireWatch,
                    watchProofId,
                    authenticators
                );
            } catch (RuntimeException error) {
                systemAuthenticationInProgress.set(false);
                call.reject(
                    "Die Android-Sicherheitsanzeige konnte nicht sicher geöffnet werden. Bitte die App vollständig im Vordergrund öffnen und erneut versuchen.",
                    "BIOMETRIC_PROMPT_START_FAILED",
                    error
                );
            }
        });
    }

    private void launchSystemAuthenticationPrompt(
        PluginCall call,
        FragmentActivity activity,
        AuthenticationPurpose purpose,
        String ownerId,
        String action,
        boolean requireWatch,
        String watchProofId,
        int authenticators
    ) {
        if (
            activity.isFinishing()
                || activity.isDestroyed()
                || activity.getSupportFragmentManager().isStateSaved()
        ) {
            throw new IllegalStateException(
                "Biometric host activity is not in a safe foreground state"
            );
        }
        Executor executor = ContextCompat.getMainExecutor(getContext());
        BiometricPrompt prompt = new BiometricPrompt(
            activity,
            executor,
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationError(
                    int errorCode,
                    CharSequence errString
                ) {
                    systemAuthenticationInProgress.set(false);
                    JSObject details = new JSObject();
                    details.put("androidErrorCode", errorCode);
                    call.reject(
                        "Android-Sicherheitsprüfung beendet: " + errString,
                        "SYSTEM_AUTHENTICATION_ERROR",
                        details
                    );
                }

                @Override
                public void onAuthenticationSucceeded(
                    BiometricPrompt.AuthenticationResult result
                ) {
                    systemAuthenticationInProgress.set(false);
                    try {
                        SecurityFactorPolicy.Factor authFactor =
                            systemAuthenticationFactor(result);
                        if (authFactor == null) {
                            call.reject(
                                "Android hat den verwendeten Sicherheitsfaktor nicht eindeutig gemeldet.",
                                "UNKNOWN_SYSTEM_AUTHENTICATION_TYPE"
                            );
                            return;
                        }

                        if (purpose == AuthenticationPurpose.REGISTER_DEVICE) {
                            registerOrAdoptDeviceAfterAuthentication(
                                ownerId,
                                authFactor
                            );
                            JSObject response = buildStatus(ownerId);
                            response.put("registeredNow", true);
                            response.put(
                                "enrollmentAuthentication",
                                factorName(authFactor)
                            );
                            response.put(
                                "identityLimit",
                                "Die lokale Registrierung bindet diese App-Installation an dieses Gerät; sie ist kein amtlicher Identitätsnachweis."
                            );
                            call.resolve(response);
                            return;
                        }

                        if (
                            purpose == AuthenticationPurpose.BIOMETRIC_RECOVERY
                                && authFactor
                                    != SecurityFactorPolicy.Factor.DEVICE_CREDENTIAL
                        ) {
                            call.reject(
                                "Die Wiederherstellung verlangt ausdrücklich die Android-Geräte-PIN, das Muster oder Passwort.",
                                "DEVICE_CREDENTIAL_REQUIRED"
                            );
                            return;
                        }

                        issueCriticalGrant(
                            call,
                            purpose,
                            ownerId,
                            action,
                            authFactor,
                            requireWatch,
                            watchProofId
                        );
                    } catch (Exception error) {
                        call.reject(
                            "Die lokale Sicherheitsprüfung konnte nicht abgeschlossen werden.",
                            "LOCAL_SECURITY_OPERATION_FAILED",
                            error
                        );
                    }
                }

                @Override
                public void onAuthenticationFailed() {
                    // A failed biometric attempt is non-terminal. Android keeps
                    // the trusted system dialog open and may offer the device
                    // credential fallback without treating one miss as attack.
                }
            }
        );

        String title = purpose == AuthenticationPurpose.REGISTER_DEVICE
            ? "Dieses Gerät für Sol Holo registrieren"
            : purpose == AuthenticationPurpose.APP_ACCESS
                ? "Pam’s Holo entsperren"
                : purpose == AuthenticationPurpose.BIOMETRIC_RECOVERY
                    ? "Zugang mit Geräte-PIN wiederherstellen"
                    : "Kritische Sol-Holo-Aktion bestätigen";
        String subtitle = purpose == AuthenticationPurpose.BIOMETRIC_RECOVERY
            ? "Bitte Android-Geräte-PIN, Muster oder Passwort verwenden"
            : "Starke Android-Biometrie oder Geräte-PIN verwenden";
        BiometricPrompt.PromptInfo promptInfo =
            new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setAllowedAuthenticators(authenticators)
                .setConfirmationRequired(true)
                .build();
        prompt.authenticate(promptInfo);
    }

    private void startConsentSignatureAuthentication(
        PluginCall call,
        String ownerId,
        byte[] canonicalPayload,
        String payloadSha256
    ) {
        if (!supportsReliableAuthenticationType()) {
            rejectUnsupportedAndroid(call);
            return;
        }
        if (!systemAuthenticationInProgress.compareAndSet(false, true)) {
            call.reject(
                "Eine Android-Sicherheitsprüfung läuft bereits.",
                "AUTHENTICATION_ALREADY_IN_PROGRESS"
            );
            return;
        }

        int availability = BiometricManager.from(getContext()).canAuthenticate(
            SYSTEM_AUTHENTICATORS
        );
        if (availability != BiometricManager.BIOMETRIC_SUCCESS) {
            systemAuthenticationInProgress.set(false);
            Arrays.fill(canonicalPayload, (byte)0);
            JSObject details = new JSObject();
            details.put("androidBiometricStatus", availability);
            details.put("requestedAuthenticators", SYSTEM_AUTHENTICATORS);
            call.reject(
                "Die Android-Systemauthentifizierung ist derzeit nicht verfügbar.",
                "SYSTEM_AUTHENTICATION_UNAVAILABLE",
                details
            );
            return;
        }
        if (!(getActivity() instanceof FragmentActivity)) {
            systemAuthenticationInProgress.set(false);
            Arrays.fill(canonicalPayload, (byte)0);
            call.reject(
                "Die Android-Sicherheitsanzeige kann in dieser App-Ansicht nicht geöffnet werden.",
                "BIOMETRIC_HOST_ACTIVITY_UNAVAILABLE"
            );
            return;
        }

        FragmentActivity activity = (FragmentActivity)getActivity();
        activity.runOnUiThread(() -> {
            try {
                launchConsentSignaturePrompt(
                    call,
                    activity,
                    ownerId,
                    canonicalPayload,
                    payloadSha256
                );
            } catch (RuntimeException error) {
                systemAuthenticationInProgress.set(false);
                Arrays.fill(canonicalPayload, (byte)0);
                call.reject(
                    "Die Android-Sicherheitsanzeige konnte nicht sicher geöffnet werden. Bitte die App vollständig im Vordergrund öffnen und erneut versuchen.",
                    "BIOMETRIC_PROMPT_START_FAILED",
                    error
                );
            }
        });
    }

    private void launchConsentSignaturePrompt(
        PluginCall call,
        FragmentActivity activity,
        String ownerId,
        byte[] canonicalPayload,
        String payloadSha256
    ) {
        if (
            activity.isFinishing()
                || activity.isDestroyed()
                || activity.getSupportFragmentManager().isStateSaved()
        ) {
            throw new IllegalStateException(
                "Biometric host activity is not in a safe foreground state"
            );
        }
        Executor executor = ContextCompat.getMainExecutor(getContext());
        BiometricPrompt prompt = new BiometricPrompt(
            activity,
            executor,
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationError(
                    int errorCode,
                    CharSequence errString
                ) {
                    systemAuthenticationInProgress.set(false);
                    Arrays.fill(canonicalPayload, (byte)0);
                    JSObject details = new JSObject();
                    details.put("androidErrorCode", errorCode);
                    call.reject(
                        "Android-Sicherheitsprüfung beendet: " + errString,
                        "SYSTEM_AUTHENTICATION_ERROR",
                        details
                    );
                }

                @Override
                public void onAuthenticationSucceeded(
                    BiometricPrompt.AuthenticationResult result
                ) {
                    try {
                        SecurityFactorPolicy.Factor authFactor =
                            systemAuthenticationFactor(result);
                        if (authFactor == null) {
                            call.reject(
                                "Android hat den verwendeten Sicherheitsfaktor nicht eindeutig gemeldet.",
                                "UNKNOWN_SYSTEM_AUTHENTICATION_TYPE"
                            );
                            return;
                        }

                        long now = System.currentTimeMillis();
                        List<SecurityFactorPolicy.Evidence> evidence =
                            new ArrayList<>();
                        evidence.add(
                            SecurityFactorPolicy.Evidence.verified(
                                ownerId,
                                SecurityFactorPolicy.Factor.REGISTERED_DEVICE,
                                now,
                                now + FRESH_PROOF_MS
                            )
                        );
                        evidence.add(
                            SecurityFactorPolicy.Evidence.verified(
                                ownerId,
                                authFactor,
                                now,
                                now + FRESH_PROOF_MS
                            )
                        );
                        SecurityFactorPolicy.Decision decision =
                            SecurityFactorPolicy.evaluate(
                                SecurityFactorPolicy.Operation.CRITICAL_ACTION,
                                ownerId,
                                evidence,
                                now
                            );
                        if (!decision.allowed()) {
                            call.reject(
                                "Die Mehrfaktor-Regel hat die Einwilligungssignatur nicht freigegeben.",
                                decision.reasonCode()
                            );
                            return;
                        }
                        if (!performFreshDeviceChallenge(ownerId, "consent-sign")) {
                            call.reject(
                                "Der registrierte Geräte-Schlüssel konnte die frische Challenge nicht bestätigen.",
                                "REGISTERED_DEVICE_PROOF_FAILED"
                            );
                            return;
                        }
                        call.resolve(
                            signCanonicalConsentPayload(
                                ownerId,
                                payloadSha256,
                                canonicalPayload
                            )
                        );
                    } catch (Exception error) {
                        call.reject(
                            "Die lokale Einwilligungssignatur konnte nicht erstellt werden.",
                            "CONSENT_SIGNING_FAILED",
                            error
                        );
                    } finally {
                        Arrays.fill(canonicalPayload, (byte)0);
                        systemAuthenticationInProgress.set(false);
                    }
                }

                @Override
                public void onAuthenticationFailed() {
                    // Android keeps the trusted dialog open for another
                    // biometric attempt or its device-credential fallback.
                }
            }
        );
        BiometricPrompt.PromptInfo promptInfo =
            new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Einwilligung kryptografisch bestätigen")
                .setSubtitle(
                    "Starke Android-Biometrie oder Geräte-PIN verwenden"
                )
                .setAllowedAuthenticators(SYSTEM_AUTHENTICATORS)
                .setConfirmationRequired(true)
                .build();
        prompt.authenticate(promptInfo);
    }

    private JSObject signCanonicalConsentPayload(
        String ownerId,
        String payloadSha256,
        byte[] canonicalPayload
    ) throws Exception {
        DeviceState device = inspectDeviceState(ownerId);
        if (!device.verified()) {
            throw new SecurityException("Registered device state is no longer valid");
        }
        KeyStore.PrivateKeyEntry entry = privateKeyEntry(
            androidKeyStore(),
            ownerId
        );
        if (entry == null) {
            throw new SecurityException("Registered device key is missing");
        }
        Signature signer = Signature.getInstance(CONSENT_SIGNATURE_ALGORITHM);
        signer.initSign(entry.getPrivateKey());
        signer.update(canonicalPayload);
        String certificateFingerprint = prefs(ownerId).getString(
            PREF_DEVICE_CERT_SHA256,
            ""
        );
        if (!certificateFingerprint.matches("[a-f0-9]{64}")) {
            throw new SecurityException("Registered device key identifier is invalid");
        }

        JSObject result = new JSObject();
        result.put("ok", true);
        result.put("ownerId", ownerId);
        result.put("payloadSha256", payloadSha256);
        result.put("signature", encodeBase64(signer.sign()));
        result.put("algorithm", CONSENT_SIGNATURE_ALGORITHM);
        result.put(
            "keyId",
            "sol-holo-device-v1:" + ownerId + ":" + certificateFingerprint
        );
        result.put("signatureFormat", CONSENT_SIGNATURE_FORMAT);
        return result;
    }

    private void issueCriticalGrant(
        PluginCall call,
        AuthenticationPurpose purpose,
        String ownerId,
        String action,
        SecurityFactorPolicy.Factor authFactor,
        boolean requireWatch,
        String watchProofId
    ) throws Exception {
        long now = System.currentTimeMillis();
        if (!performFreshDeviceChallenge(ownerId, action)) {
            call.reject(
                "Der registrierte Geräte-Schlüssel konnte die frische Challenge nicht bestätigen.",
                "REGISTERED_DEVICE_PROOF_FAILED"
            );
            return;
        }

        List<SecurityFactorPolicy.Evidence> evidence = new ArrayList<>();
        evidence.add(
            SecurityFactorPolicy.Evidence.verified(
                ownerId,
                SecurityFactorPolicy.Factor.REGISTERED_DEVICE,
                now,
                now + FRESH_PROOF_MS
            )
        );
        evidence.add(
            SecurityFactorPolicy.Evidence.verified(
                ownerId,
                authFactor,
                now,
                now + FRESH_PROOF_MS
            )
        );

        SecurityFactorPolicy.Operation operation =
            purpose == AuthenticationPurpose.BIOMETRIC_RECOVERY
                ? SecurityFactorPolicy.Operation.BIOMETRIC_RECOVERY
                : SecurityFactorPolicy.Operation.CRITICAL_ACTION;
        if (requireWatch) {
            WatchProof watchProof = watchProofs.remove(watchProofId);
            if (
                watchProof == null
                    || !constantTimeEquals(watchProof.ownerId, ownerId)
                || now >= watchProof.expiresAtMillis
                    || !constantTimeEquals(watchProof.action, action)
            ) {
                call.reject(
                    "Der Uhrbeweis fehlt, ist abgelaufen oder gehört zu einer anderen Aktion.",
                    "WATCH_PROOF_INVALID_OR_EXPIRED"
                );
                return;
            }
            evidence.add(
                SecurityFactorPolicy.Evidence.verified(
                    ownerId,
                    SecurityFactorPolicy.Factor.REGISTERED_WATCH_NFC,
                    watchProof.verifiedAtMillis,
                    watchProof.expiresAtMillis
                )
            );
            operation = SecurityFactorPolicy.Operation.HIGH_RISK_WITH_WATCH;
        }

        SecurityFactorPolicy.Decision decision = SecurityFactorPolicy.evaluate(
            operation,
            ownerId,
            evidence,
            now
        );
        if (!decision.allowed()) {
            call.reject(
                "Die Mehrfaktor-Regel hat die Aktion nicht freigegeben.",
                decision.reasonCode()
            );
            return;
        }

        String grantId = randomId();
        long expiresAt = now + GRANT_TTL_MS;
        grants.put(grantId, new CriticalGrant(ownerId, action, expiresAt));

        JSObject result = new JSObject();
        result.put("allowed", true);
        result.put("authorizationId", grantId);
        result.put("ownerId", ownerId);
        result.put("action", action);
        result.put("expiresAtMillis", expiresAt);
        result.put("oneTime", true);
        result.put("reasonCode", decision.reasonCode());
        result.put("acceptedFactors", factorArray(decision.acceptedFactors()));
        result.put(
            "independentCategories",
            categoryArray(decision.independentCategories())
        );
        result.put("authenticationType", factorName(authFactor));
        result.put("faceVsFingerprintKnown", false);
        if (
            purpose == AuthenticationPurpose.APP_ACCESS
                && performFreshDeviceChallenge(ownerId, TRUSTED_SESSION_ACTION)
        ) {
            // App unlock and backend-session binding use separate one-time
            // capabilities. Consuming one can never replay the other.
            String trustedSessionGrantId = randomId();
            grants.put(
                trustedSessionGrantId,
                new CriticalGrant(
                    ownerId,
                    TRUSTED_SESSION_ACTION,
                    expiresAt
                )
            );
            result.put(
                "trustedSessionAuthorizationId",
                trustedSessionGrantId
            );
            result.put(
                "trustedSessionAuthorizationExpiresAtMillis",
                expiresAt
            );
        }
        call.resolve(result);
    }

    private SecurityFactorPolicy.Factor systemAuthenticationFactor(
        BiometricPrompt.AuthenticationResult result
    ) {
        int type = result.getAuthenticationType();
        if (type == BiometricPrompt.AUTHENTICATION_RESULT_TYPE_DEVICE_CREDENTIAL) {
            return SecurityFactorPolicy.Factor.DEVICE_CREDENTIAL;
        }
        if (type == BiometricPrompt.AUTHENTICATION_RESULT_TYPE_BIOMETRIC) {
            // The prompt was configured with BIOMETRIC_STRONG, never WEAK.
            return SecurityFactorPolicy.Factor.SYSTEM_STRONG_BIOMETRIC;
        }
        return null;
    }

    private void registerOrAdoptDeviceAfterAuthentication(
        String ownerId,
        SecurityFactorPolicy.Factor authenticationFactor
    ) throws Exception {
        DeviceState before = inspectDeviceState(ownerId);
        boolean generatedNow = false;
        if (before.keyExists && before.metadataExists) {
            if (!before.verified()) {
                throw new SecurityException(
                    "Existing device registration did not verify"
                );
            }
            return;
        }

        if (!before.keyExists) {
            generateHardwareBackedDeviceKey(ownerId);
            generatedNow = true;
        }

        KeyStore keyStore = androidKeyStore();
        KeyStore.PrivateKeyEntry entry = privateKeyEntry(keyStore, ownerId);
        if (entry == null) {
            throw new SecurityException("Generated device key is missing");
        }
        String level = keySecurityLevel(entry.getPrivateKey());
        if (!isHardwareSecurityLevel(level)) {
            if (generatedNow) keyStore.deleteEntry(deviceKeyAlias(ownerId));
            throw new SecurityException(
                "Registered device key is not hardware backed"
            );
        }
        if (!challengeSignAndVerify(ownerId, entry, "device-registration")) {
            if (generatedNow) keyStore.deleteEntry(deviceKeyAlias(ownerId));
            throw new SecurityException("Device key challenge failed");
        }

        Certificate certificate = entry.getCertificate();
        Certificate[] chain = entry.getCertificateChain();
        SharedPreferences.Editor editor = prefs(ownerId).edit()
            .putString(
                PREF_DEVICE_CERT_SHA256,
                sha256Hex(certificate.getEncoded())
            )
            .putString(PREF_DEVICE_REGISTRATION_ID, randomId())
            .putLong(PREF_DEVICE_REGISTERED_AT, System.currentTimeMillis())
            .putString(
                PREF_DEVICE_AUTH_METHOD,
                factorName(authenticationFactor)
            )
            .putInt(
                PREF_DEVICE_ATTESTATION_CHAIN_SIZE,
                chain == null ? 0 : chain.length
            );
        if (!editor.commit()) {
            if (generatedNow) keyStore.deleteEntry(deviceKeyAlias(ownerId));
            throw new SecurityException(
                "Device registration metadata could not be persisted"
            );
        }

        if (!inspectDeviceState(ownerId).verified()) {
            if (generatedNow) keyStore.deleteEntry(deviceKeyAlias(ownerId));
            prefs(ownerId).edit()
                .remove(PREF_DEVICE_CERT_SHA256)
                .remove(PREF_DEVICE_REGISTRATION_ID)
                .remove(PREF_DEVICE_REGISTERED_AT)
                .remove(PREF_DEVICE_AUTH_METHOD)
                .remove(PREF_DEVICE_ATTESTATION_CHAIN_SIZE)
                .commit();
            throw new SecurityException(
                "Device registration did not pass its post-write check"
            );
        }
    }

    private void generateHardwareBackedDeviceKey(String ownerId) throws Exception {
        boolean requestStrongBox = Build.VERSION.SDK_INT >= 28
            && getContext().getPackageManager().hasSystemFeature(
                PackageManager.FEATURE_STRONGBOX_KEYSTORE
            );
        Exception strongBoxFailure = null;
        if (requestStrongBox) {
            try {
                generateDeviceKey(ownerId, true);
                return;
            } catch (Exception error) {
                strongBoxFailure = error;
                androidKeyStore().deleteEntry(deviceKeyAlias(ownerId));
            }
        }

        try {
            generateDeviceKey(ownerId, false);
        } catch (Exception teeFailure) {
            if (strongBoxFailure != null) {
                teeFailure.addSuppressed(strongBoxFailure);
            }
            throw teeFailure;
        }
    }

    private KeyPair generateDeviceKey(String ownerId, boolean strongBox) throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_EC,
            "AndroidKeyStore"
        );
        KeyGenParameterSpec.Builder builder =
            new KeyGenParameterSpec.Builder(
                deviceKeyAlias(ownerId),
                KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY
            )
                .setAlgorithmParameterSpec(new ECGenParameterSpec("secp256r1"))
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setAttestationChallenge(randomBytes(CHALLENGE_BYTES));
        // Android documents unlocked-device-required Keystore bugs on API
        // 31-34. The restriction is therefore enabled only where those bugs
        // are fixed; the independent system prompt remains mandatory on all
        // supported versions.
        if (Build.VERSION.SDK_INT >= 35) {
            builder.setUnlockedDeviceRequired(true);
        }
        if (Build.VERSION.SDK_INT >= 28 && strongBox) {
            builder.setIsStrongBoxBacked(true);
        }
        generator.initialize(builder.build());
        return generator.generateKeyPair();
    }

    private DeviceState inspectDeviceState(String ownerId) {
        boolean metadata = !prefs(ownerId).getString(
            PREF_DEVICE_CERT_SHA256,
            ""
        ).isEmpty() && !prefs(ownerId).getString(
            PREF_DEVICE_REGISTRATION_ID,
            ""
        ).isEmpty();
        try {
            KeyStore keyStore = androidKeyStore();
            boolean exists = keyStore.containsAlias(deviceKeyAlias(ownerId));
            if (!exists) {
                return new DeviceState(
                    false,
                    metadata,
                    false,
                    false,
                    false,
                    "missing",
                    0
                );
            }
            KeyStore.PrivateKeyEntry entry = privateKeyEntry(keyStore, ownerId);
            if (entry == null) {
                return new DeviceState(
                    true,
                    metadata,
                    false,
                    false,
                    false,
                    "invalid_entry",
                    0
                );
            }
            Certificate certificate = entry.getCertificate();
            Certificate[] chain = entry.getCertificateChain();
            String expected = prefs(ownerId).getString(PREF_DEVICE_CERT_SHA256, "");
            String actual = sha256Hex(certificate.getEncoded());
            String level = keySecurityLevel(entry.getPrivateKey());
            return new DeviceState(
                true,
                metadata,
                !expected.isEmpty() && constantTimeEquals(expected, actual),
                challengeSignAndVerify(ownerId, entry, "device-status"),
                isHardwareSecurityLevel(level),
                level,
                chain == null ? 0 : chain.length
            );
        } catch (Exception error) {
            return new DeviceState(
                true,
                metadata,
                false,
                false,
                false,
                "inspection_failed",
                0
            );
        }
    }

    private boolean performFreshDeviceChallenge(String ownerId, String action) {
        try {
            DeviceState state = inspectDeviceState(ownerId);
            if (!state.verified()) return false;
            KeyStore.PrivateKeyEntry entry = privateKeyEntry(androidKeyStore(), ownerId);
            return entry != null && challengeSignAndVerify(ownerId, entry, action);
        } catch (Exception error) {
            return false;
        }
    }

    private boolean challengeSignAndVerify(
        String ownerId,
        KeyStore.PrivateKeyEntry entry,
        String action
    ) throws Exception {
        String registrationId = prefs(ownerId).getString(
            PREF_DEVICE_REGISTRATION_ID,
            "pending-registration"
        );
        byte[] nonce = randomBytes(CHALLENGE_BYTES);
        String payload = "SOL_HOLO_REGISTERED_DEVICE_V1\n"
            + getContext().getPackageName() + "\n"
            + ownerId + "\n"
            + registrationId + "\n"
            + action + "\n"
            + encodeBase64(nonce) + "\n"
            + System.currentTimeMillis();
        byte[] bytes = payload.getBytes(StandardCharsets.UTF_8);

        Signature signer = Signature.getInstance("SHA256withECDSA");
        signer.initSign(entry.getPrivateKey());
        signer.update(bytes);
        byte[] signed = signer.sign();

        Signature verifier = Signature.getInstance("SHA256withECDSA");
        verifier.initVerify(entry.getCertificate().getPublicKey());
        verifier.update(bytes);
        return verifier.verify(signed);
    }

    private String keySecurityLevel(PrivateKey privateKey) throws Exception {
        KeyFactory factory = KeyFactory.getInstance(
            privateKey.getAlgorithm(),
            "AndroidKeyStore"
        );
        KeyInfo info = factory.getKeySpec(privateKey, KeyInfo.class);
        if (Build.VERSION.SDK_INT >= 31) {
            switch (info.getSecurityLevel()) {
                case KeyProperties.SECURITY_LEVEL_STRONGBOX:
                    return "strongbox";
                case KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT:
                    return "trusted_environment";
                case KeyProperties.SECURITY_LEVEL_SOFTWARE:
                    return "software";
                case KeyProperties.SECURITY_LEVEL_UNKNOWN_SECURE:
                    return "unknown_secure";
                default:
                    return "unknown";
            }
        }
        return info.isInsideSecureHardware()
            ? "trusted_environment"
            : "software";
    }

    private boolean isHardwareSecurityLevel(String level) {
        return "strongbox".equals(level)
            || "trusted_environment".equals(level)
            || "unknown_secure".equals(level);
    }

    private KeyStore androidKeyStore() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        return keyStore;
    }

    private KeyStore.PrivateKeyEntry privateKeyEntry(
        KeyStore keyStore,
        String ownerId
    )
        throws Exception {
        KeyStore.Entry entry = keyStore.getEntry(deviceKeyAlias(ownerId), null);
        return entry instanceof KeyStore.PrivateKeyEntry
            ? (KeyStore.PrivateKeyEntry)entry
            : null;
    }

    private boolean isWatchConfigured(String ownerId) {
        return prefs(ownerId).getBoolean(PREF_WATCH_EXPLICITLY_SELECTED, false)
            && prefs(ownerId).getBoolean(PREF_WATCH_ATTESTATION_VERIFIED, false)
            && prefs(ownerId).getBoolean(PREF_WATCH_HCE_RUNTIME_VERIFIED, false)
            && hasPinnedWatchPublicKey(ownerId)
            && !prefs(ownerId).getString(PREF_WATCH_PROVIDER_ID, "").isEmpty()
            && !prefs(ownerId).getString(PREF_WATCH_CREDENTIAL_ID, "").isEmpty()
            && prefs(ownerId).getLong(PREF_WATCH_COUNTER, -1L) >= 0L;
    }

    private boolean hasPinnedWatchPublicKey(String ownerId) {
        return !prefs(ownerId).getString(PREF_WATCH_PUBLIC_KEY, "").isEmpty()
            && !prefs(ownerId).getString(PREF_WATCH_KEY_ALGORITHM, "").isEmpty();
    }

    private boolean verifyWatchSignature(
        String ownerId,
        byte[] payload,
        String signatureBase64
    ) {
        if (!isWatchConfigured(ownerId) || signatureBase64 == null || signatureBase64.isEmpty()) {
            return false;
        }
        try {
            String keyAlgorithm = prefs(ownerId).getString(
                PREF_WATCH_KEY_ALGORITHM,
                ""
            );
            String signatureAlgorithm;
            if ("EC".equalsIgnoreCase(keyAlgorithm)) {
                keyAlgorithm = "EC";
                signatureAlgorithm = "SHA256withECDSA";
            } else if ("Ed25519".equalsIgnoreCase(keyAlgorithm)) {
                keyAlgorithm = "Ed25519";
                signatureAlgorithm = "Ed25519";
            } else {
                return false;
            }

            byte[] encodedKey = decodeBase64(
                prefs(ownerId).getString(PREF_WATCH_PUBLIC_KEY, "")
            );
            PublicKey publicKey = KeyFactory.getInstance(keyAlgorithm)
                .generatePublic(new X509EncodedKeySpec(encodedKey));
            Signature verifier = Signature.getInstance(signatureAlgorithm);
            verifier.initVerify(publicKey);
            verifier.update(payload);
            return verifier.verify(decodeBase64(signatureBase64));
        } catch (Exception error) {
            return false;
        }
    }

    private byte[] canonicalWatchPayload(
        String ownerId,
        String challengeId,
        String action,
        String credentialId,
        byte[] nonce,
        long issuedAt,
        long expiresAt,
        long counter
    ) {
        String value = "SOL_HOLO_REGISTERED_WATCH_NFC_V1\n"
            + getContext().getPackageName() + "\n"
            + ownerId + "\n"
            + credentialId + "\n"
            + action + "\n"
            + challengeId + "\n"
            + encodeBase64(nonce) + "\n"
            + issuedAt + "\n"
            + expiresAt + "\n"
            + counter + "\n"
            + "EXPLICIT_USER_CONFIRMATION_REQUIRED";
        return value.getBytes(StandardCharsets.UTF_8);
    }

    private void cleanupExpiredState() {
        long now = System.currentTimeMillis();
        grants.entrySet().removeIf(entry -> now >= entry.getValue().expiresAtMillis);
        watchChallenges.entrySet().removeIf(
            entry -> now >= entry.getValue().expiresAtMillis
        );
        consumedWatchChallenges.entrySet().removeIf(
            entry -> now >= entry.getValue().expiresAtMillis
        );
        watchProofs.entrySet().removeIf(
            entry -> now >= entry.getValue().expiresAtMillis
        );
    }

    private boolean supportsReliableAuthenticationType() {
        return Build.VERSION.SDK_INT >= MIN_RELIABLE_AUTH_TYPE_API;
    }

    private void rejectUnsupportedAndroid(PluginCall call) {
        call.reject(
            "Für die eindeutige Unterscheidung zwischen Android-Biometrie und Geräte-PIN wird Android 11 oder neuer benötigt.",
            "ANDROID_API_30_REQUIRED"
        );
    }

    private String validAction(String action) {
        if (action == null || !action.matches("[A-Za-z0-9._:-]{1,80}")) {
            return null;
        }
        return action;
    }

    private String randomId() {
        return UUID.randomUUID().toString();
    }

    private byte[] randomBytes(int size) {
        byte[] value = new byte[size];
        secureRandom.nextBytes(value);
        return value;
    }

    private String encodeBase64(byte[] value) {
        return Base64.encodeToString(
            value,
            Base64.NO_WRAP | Base64.URL_SAFE | Base64.NO_PADDING
        );
    }

    private byte[] decodeBase64(String value) {
        return Base64.decode(
            value,
            Base64.NO_WRAP | Base64.URL_SAFE | Base64.NO_PADDING
        );
    }

    private String sha256Hex(byte[] value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(value);
        StringBuilder out = new StringBuilder(digest.length * 2);
        for (byte item : digest) {
            out.append(String.format(Locale.ROOT, "%02x", item & 0xff));
        }
        return out.toString();
    }

    private boolean constantTimeEquals(String left, String right) {
        if (left == null || right == null) return false;
        return MessageDigest.isEqual(
            left.getBytes(StandardCharsets.UTF_8),
            right.getBytes(StandardCharsets.UTF_8)
        );
    }

    private JSArray factorArray(
        Iterable<SecurityFactorPolicy.Factor> factors
    ) {
        JSArray values = new JSArray();
        for (SecurityFactorPolicy.Factor factor : factors) {
            values.put(factorName(factor));
        }
        return values;
    }

    private JSArray categoryArray(
        Iterable<SecurityFactorPolicy.Category> categories
    ) {
        JSArray values = new JSArray();
        for (SecurityFactorPolicy.Category category : categories) {
            values.put(category.name().toLowerCase(Locale.ROOT));
        }
        return values;
    }

    private String factorName(SecurityFactorPolicy.Factor factor) {
        return factor.name().toLowerCase(Locale.ROOT);
    }
}
