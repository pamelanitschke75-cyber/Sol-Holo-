package com.solholo.app;

import java.util.Arrays;

/**
 * Selects the leading spoken clause from the strict verification sentence.
 * The displayed sentence starts with the owner's personal wake phrase, so this gives the wake gate a
 * duration- and phrase-matched owner template without retaining raw audio.
 */
final class WakeVoiceTemplateSelector {
    private static final int FRAME_SAMPLES = 320;
    private static final int MIN_ACTIVE_FRAMES = 12;
    private static final int MAX_SPEECH_GAP_FRAMES = 10;
    private static final int PADDING_FRAMES = 6;
    private static final int MAX_REGION_FRAMES = 55;
    private static final float MIN_SPEECH_RMS = 0.006f;

    private WakeVoiceTemplateSelector() {}

    static float[] extract(short[] captured, int count) {
        return extract(captured, count, false);
    }

    static float[] extractLatest(short[] captured, int count) {
        return extract(captured, count, true);
    }

    private static float[] extract(
        short[] captured,
        int count,
        boolean preferLatestClause
    ) {
        if (captured == null || count <= 0) {
            throw new IllegalArgumentException("Keine Aufnahme für den Kurz-Weckruf vorhanden");
        }

        int safeCount = Math.min(count, captured.length);
        int frameCount = safeCount / FRAME_SAMPLES;
        if (frameCount < MIN_ACTIVE_FRAMES) {
            throw new IllegalArgumentException("Der Kurz-Weckruf ist zu kurz");
        }

        float[] frameRms = new float[frameCount];
        for (int frame = 0; frame < frameCount; frame++) {
            double sum = 0d;
            int offset = frame * FRAME_SAMPLES;
            for (int index = 0; index < FRAME_SAMPLES; index++) {
                double sample = captured[offset + index] / 32768.0;
                sum += sample * sample;
            }
            frameRms[frame] = (float)Math.sqrt(sum / FRAME_SAMPLES);
        }

        float[] sorted = frameRms.clone();
        Arrays.sort(sorted);
        float noiseFloor = sorted[(int)Math.floor((sorted.length - 1) * 0.20)];
        float speechLevel = sorted[(int)Math.floor((sorted.length - 1) * 0.90)];
        if (speechLevel < MIN_SPEECH_RMS) {
            throw new IllegalArgumentException("Keine deutliche Stimme im Kurz-Weckruf erkannt");
        }

        float activityThreshold = Math.max(
            MIN_SPEECH_RMS,
            noiseFloor + (speechLevel - noiseFloor) * 0.18f
        );
        int start = -1;
        int lastActive = -1;
        int activeFrames = 0;
        int gapFrames = 0;
        int selectedStart = -1;
        int selectedLastActive = -1;

        for (int frame = 0; frame < frameCount; frame++) {
            boolean active = frameRms[frame] >= activityThreshold;
            if (active) {
                if (start < 0) {
                    start = frame;
                    activeFrames = 0;
                }
                lastActive = frame;
                activeFrames++;
                gapFrames = 0;
            } else if (start >= 0) {
                gapFrames++;
            }

            boolean endedByPause = start >= 0
                && gapFrames > MAX_SPEECH_GAP_FRAMES;
            boolean reachedMaximum = start >= 0
                && frame - start + 1 >= MAX_REGION_FRAMES;
            if (
                !endedByPause
                    && (!reachedMaximum || preferLatestClause)
            ) {
                continue;
            }

            if (activeFrames >= MIN_ACTIVE_FRAMES) {
                int cappedLastActive = Math.min(
                    lastActive,
                    start + MAX_REGION_FRAMES - 1
                );
                if (!preferLatestClause) {
                    return copyAsFloat(
                        captured,
                        safeCount,
                        start,
                        cappedLastActive
                    );
                }
                selectedStart = start;
                selectedLastActive = cappedLastActive;
            }

            start = -1;
            lastActive = -1;
            activeFrames = 0;
            gapFrames = 0;
        }

        if (start >= 0 && activeFrames >= MIN_ACTIVE_FRAMES) {
            selectedStart = start;
            selectedLastActive = Math.min(
                lastActive,
                start + MAX_REGION_FRAMES - 1
            );
        }

        if (selectedStart >= 0) {
            return copyAsFloat(
                captured,
                safeCount,
                selectedStart,
                selectedLastActive
            );
        }

        throw new IllegalArgumentException("Hey Pam war zu kurz oder zu leise");
    }

    private static float[] copyAsFloat(
        short[] captured,
        int count,
        int firstActiveFrame,
        int lastActiveFrame
    ) {
        int startSample = Math.max(
            0,
            (firstActiveFrame - PADDING_FRAMES) * FRAME_SAMPLES
        );
        int endSample = Math.min(
            count,
            (lastActiveFrame + PADDING_FRAMES + 1) * FRAME_SAMPLES
        );
        float[] selected = new float[endSample - startSample];
        for (int index = startSample; index < endSample; index++) {
            selected[index - startSample] = captured[index] / 32768.0f;
        }
        return selected;
    }
}
