package com.solholo.app;

public final class WearWakePayloadPolicyTest {
    public static void main(String[] args) {
        long now = 1_800_000_000_000L;
        int sampleCount = 24_000;
        byte[] pcm = new byte[sampleCount * 2];
        String session = "12345678-1234-1234-1234-123456789abc";

        expect(
            "",
            WearWakePayloadPolicy.rejectionReason(
                "pam-sol",
                "Hey Pam",
                session,
                16_000,
                sampleCount,
                now - 1_000L,
                now,
                pcm
            ),
            "gültiger Watch-Weckruf"
        );
        expect(
            "owner",
            reason("jemand-anderes", "Hey Pam", session, 16_000, sampleCount, now, now, pcm),
            "falscher Owner"
        );
        expect(
            "phrase",
            reason("pam-sol", "Hey Google", session, 16_000, sampleCount, now, now, pcm),
            "falscher Weckruf"
        );
        expect(
            "session",
            reason("pam-sol", "Hey Pam", "kurz", 16_000, sampleCount, now, now, pcm),
            "ungültige Sitzung"
        );
        expect(
            "sample_rate",
            reason("pam-sol", "Hey Pam", session, 8_000, sampleCount, now, now, pcm),
            "falsche Abtastrate"
        );
        expect(
            "sample_count",
            reason("pam-sol", "Hey Pam", session, 16_000, 7_999, now, now, new byte[15_998]),
            "zu kurzer Weckruf"
        );
        expect(
            "sample_count",
            reason("pam-sol", "Hey Pam", session, 16_000, 38_401, now, now, new byte[76_802]),
            "zu langer Weckruf"
        );
        expect(
            "stale",
            reason("pam-sol", "Hey Pam", session, 16_000, sampleCount, now - 30_001L, now, pcm),
            "abgelaufener Weckruf"
        );
        expect(
            "stale",
            reason("pam-sol", "Hey Pam", session, 16_000, sampleCount, now + 5_001L, now, pcm),
            "zu weit in der Zukunft"
        );
        expect(
            "pcm",
            reason("pam-sol", "Hey Pam", session, 16_000, sampleCount, now, now, new byte[10]),
            "PCM-Länge passt nicht"
        );
        System.out.println("WearWakePayloadPolicyTest: OK");
    }

    private static String reason(
        String ownerId,
        String phrase,
        String sessionId,
        int sampleRate,
        int sampleCount,
        long createdAt,
        long now,
        byte[] pcm
    ) {
        return WearWakePayloadPolicy.rejectionReason(
            ownerId,
            phrase,
            sessionId,
            sampleRate,
            sampleCount,
            createdAt,
            now,
            pcm
        );
    }

    private static void expect(String expected, String actual, String label) {
        if (!expected.equals(actual)) {
            throw new AssertionError(
                label + ": erwartet=" + expected + ", erhalten=" + actual
            );
        }
    }
}
