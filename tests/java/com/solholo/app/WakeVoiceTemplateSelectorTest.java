package com.solholo.app;

public final class WakeVoiceTemplateSelectorTest {
    private static final int FRAME_SAMPLES = 320;

    public static void main(String[] args) {
        selectsHeySolBeforeTheLongSentenceContinues();
        ignoresAShortLeadingNoise();
        capsContinuousSpeechToTheWakePhraseWindow();
        rejectsSilence();
        System.out.println("WakeVoiceTemplateSelectorTest: OK");
    }

    private static void selectsHeySolBeforeTheLongSentenceContinues() {
        short[] audio = new short[260 * FRAME_SAMPLES];
        fillFrames(audio, 20, 48, (short)5000);
        fillFrames(audio, 70, 210, (short)5000);

        float[] selected = WakeVoiceTemplateSelector.extract(audio, audio.length);
        assertBetween(
            selected.length,
            30 * FRAME_SAMPLES,
            45 * FRAME_SAMPLES,
            "Nur der führende Weckruf darf als Vorlage ausgewählt werden"
        );
    }

    private static void ignoresAShortLeadingNoise() {
        short[] audio = new short[260 * FRAME_SAMPLES];
        fillFrames(audio, 4, 7, (short)7000);
        fillFrames(audio, 30, 60, (short)5000);
        fillFrames(audio, 82, 210, (short)5000);

        float[] selected = WakeVoiceTemplateSelector.extract(audio, audio.length);
        assertBetween(
            selected.length,
            32 * FRAME_SAMPLES,
            48 * FRAME_SAMPLES,
            "Ein kurzes Geräusch vor Hey Sol darf nicht gespeichert werden"
        );
    }

    private static void capsContinuousSpeechToTheWakePhraseWindow() {
        short[] audio = new short[260 * FRAME_SAMPLES];
        fillFrames(audio, 15, 190, (short)5000);

        float[] selected = WakeVoiceTemplateSelector.extract(audio, audio.length);
        assertBetween(
            selected.length,
            60 * FRAME_SAMPLES,
            70 * FRAME_SAMPLES,
            "Ohne Satzpause muss die Vorlage zeitlich begrenzt bleiben"
        );
    }

    private static void rejectsSilence() {
        try {
            WakeVoiceTemplateSelector.extract(
                new short[260 * FRAME_SAMPLES],
                260 * FRAME_SAMPLES
            );
            throw new AssertionError("Stille darf keine Weckruf-Vorlage erzeugen");
        } catch (IllegalArgumentException expected) {
            // Expected secure rejection.
        }
    }

    private static void fillFrames(
        short[] audio,
        int firstFrame,
        int endFrameExclusive,
        short amplitude
    ) {
        for (
            int index = firstFrame * FRAME_SAMPLES;
            index < endFrameExclusive * FRAME_SAMPLES;
            index++
        ) {
            audio[index] = amplitude;
        }
    }

    private static void assertBetween(
        int value,
        int minimum,
        int maximum,
        String message
    ) {
        if (value < minimum || value > maximum) {
            throw new AssertionError(
                message + ": value=" + value + ", range=" + minimum + ".." + maximum
            );
        }
    }
}
