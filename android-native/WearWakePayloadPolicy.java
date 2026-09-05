package com.solholo.app;

/**
 * Fail-closed validation for the short PCM handoff from Pam's paired watch.
 * The Data Layer already requires matching application IDs and signatures;
 * these checks additionally reject stale, malformed, oversized, or replayed
 * wake candidates before the owner voice models ever see them.
 */
final class WearWakePayloadPolicy {
    static final String OWNER_ID = "pam-sol";
    static final String WAKE_PHRASE = "Hey Pam";
    static final int SAMPLE_RATE = 16_000;
    static final int MIN_SAMPLE_COUNT = SAMPLE_RATE * 500 / 1_000;
    static final int MAX_SAMPLE_COUNT = SAMPLE_RATE * 2_400 / 1_000;
    static final int MAX_PCM_BYTES = MAX_SAMPLE_COUNT * 2;
    static final long MAX_AGE_MILLIS = 30_000L;
    static final long MAX_FUTURE_SKEW_MILLIS = 5_000L;

    private WearWakePayloadPolicy() {}

    static String rejectionReason(
        String ownerId,
        String phrase,
        String sessionId,
        int sampleRate,
        int sampleCount,
        long createdAtMillis,
        long nowMillis,
        byte[] pcm16LittleEndian
    ) {
        if (!OWNER_ID.equals(ownerId)) {
            return "owner";
        }
        if (!WAKE_PHRASE.equals(phrase)) {
            return "phrase";
        }
        if (
            sessionId == null
                || !sessionId.matches("[A-Za-z0-9_-]{16,80}")
        ) {
            return "session";
        }
        if (sampleRate != SAMPLE_RATE) {
            return "sample_rate";
        }
        if (
            sampleCount < MIN_SAMPLE_COUNT
                || sampleCount > MAX_SAMPLE_COUNT
        ) {
            return "sample_count";
        }
        if (
            createdAtMillis <= 0L
                || nowMillis < createdAtMillis - MAX_FUTURE_SKEW_MILLIS
                || nowMillis - createdAtMillis > MAX_AGE_MILLIS
        ) {
            return "stale";
        }
        if (
            pcm16LittleEndian == null
                || pcm16LittleEndian.length == 0
                || pcm16LittleEndian.length > MAX_PCM_BYTES
                || (pcm16LittleEndian.length & 1) != 0
                || pcm16LittleEndian.length != sampleCount * 2
        ) {
            return "pcm";
        }
        return "";
    }
}
