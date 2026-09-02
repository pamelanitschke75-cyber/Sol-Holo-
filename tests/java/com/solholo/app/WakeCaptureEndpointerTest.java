package com.solholo.app;

import java.io.ByteArrayOutputStream;

public final class WakeCaptureEndpointerTest {
    private static final int FRAME_SAMPLES =
        WakeCaptureEndpointer.FRAME_SAMPLES;

    public static void main(String[] args) {
        staysOpenDuringSilence();
        staysOpenForTooShortNoise();
        staysOpenForQuietSpeech();
        endsPromptlyAfterCompleteWakeSpeech();
        toleratesShortPauseInsideWakePhrase();
        System.out.println("WakeCaptureEndpointerTest: OK");
    }

    private static void staysOpenDuringSilence() {
        WakeCaptureEndpointer detector = new WakeCaptureEndpointer();
        byte[] silence = frames(120, 40);
        assertFalse(
            detector.acceptPcm16LittleEndian(silence, silence.length),
            "Leiser Raum darf kein Aufnahmeende auslösen"
        );
        assertFalse(detector.speechStarted(), "Stille ist keine Stimme");
    }

    private static void staysOpenForTooShortNoise() {
        WakeCaptureEndpointer detector = new WakeCaptureEndpointer();
        byte[] impulse = concat(
            frames(8, 30),
            frames(3, 2_000),
            frames(40, 30)
        );
        assertFalse(
            detector.acceptPcm16LittleEndian(impulse, impulse.length),
            "Ein kurzes Geräusch darf die sichere Aufnahme nicht abschließen"
        );
        assertTrue(
            detector.activeFrames() < WakeCaptureEndpointer.MIN_ACTIVE_FRAMES,
            "Ein kurzes Geräusch darf die Frühende-Bedingung nicht erfüllen"
        );
    }

    private static void endsPromptlyAfterCompleteWakeSpeech() {
        WakeCaptureEndpointer detector = new WakeCaptureEndpointer();
        byte[] utterance = concat(
            frames(10, 35),
            frames(18, 2_400),
            frames(WakeCaptureEndpointer.END_SILENCE_FRAMES, 35)
        );
        assertTrue(
            detector.acceptPcm16LittleEndian(utterance, utterance.length),
            "Eine vollständige kurze Äußerung muss nach der Sprechpause enden"
        );
        assertTrue(
            detector.activeFrames() >= WakeCaptureEndpointer.MIN_ACTIVE_FRAMES,
            "Die Mindestsprechdauer muss erfüllt sein"
        );
    }

    private static void staysOpenForQuietSpeech() {
        WakeCaptureEndpointer detector = new WakeCaptureEndpointer();
        byte[] quietUtterance = concat(
            frames(10, 30),
            frames(20, 180),
            frames(WakeCaptureEndpointer.END_SILENCE_FRAMES, 30)
        );
        assertFalse(
            detector.acceptPcm16LittleEndian(
                quietUtterance,
                quietUtterance.length
            ),
            "Leise Sprache darf nur das Frühende auslassen, nicht verworfen werden"
        );
    }

    private static void toleratesShortPauseInsideWakePhrase() {
        WakeCaptureEndpointer detector = new WakeCaptureEndpointer();
        byte[] utterance = concat(
            frames(8, 30),
            frames(8, 2_200),
            frames(8, 30),
            frames(8, 2_100),
            frames(WakeCaptureEndpointer.END_SILENCE_FRAMES, 30)
        );
        assertTrue(
            detector.acceptPcm16LittleEndian(utterance, utterance.length),
            "Eine kurze Pause zwischen Hey und Sol muss erlaubt bleiben"
        );
    }

    private static byte[] frames(int frameCount, int amplitude) {
        ByteArrayOutputStream output = new ByteArrayOutputStream(
            frameCount * FRAME_SAMPLES * 2
        );
        for (int frame = 0; frame < frameCount; frame++) {
            for (int sample = 0; sample < FRAME_SAMPLES; sample++) {
                int signed = (sample & 1) == 0 ? amplitude : -amplitude;
                output.write(signed & 0xff);
                output.write((signed >> 8) & 0xff);
            }
        }
        return output.toByteArray();
    }

    private static byte[] concat(byte[]... blocks) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        for (byte[] block : blocks) {
            output.write(block, 0, block.length);
        }
        return output.toByteArray();
    }

    private static void assertTrue(boolean value, String message) {
        if (!value) throw new AssertionError(message);
    }

    private static void assertFalse(boolean value, String message) {
        if (value) throw new AssertionError(message);
    }
}
