package com.solholo.app;

/**
 * Ends a buffered wake recording shortly after a likely short utterance.
 * This class is only a latency hint. Microphone levels vary, so it must never
 * authorize or reject captured audio. The exact phrase matcher and both
 * independent speaker models still have to authorize every wake.
 */
final class WakeCaptureEndpointer {
    static final int FRAME_SAMPLES = 320; // 20 ms at 16 kHz
    static final int MIN_ACTIVE_FRAMES = 12; // 240 ms of clear speech
    static final int END_SILENCE_FRAMES = 22; // 440 ms after speech
    static final float MIN_SPEECH_RMS = 0.006f;

    private double frameSquareSum;
    private int frameSampleCount;
    private float noiseFloor = 0.0015f;
    private int consecutiveActiveFrames;
    private int activeFrames;
    private int trailingSilenceFrames;
    private boolean speechStarted;

    boolean acceptPcm16LittleEndian(byte[] pcm, int count) {
        if (pcm == null || count <= 1) {
            return false;
        }

        int safeCount = Math.min(count, pcm.length);
        safeCount -= safeCount % 2;
        for (int offset = 0; offset < safeCount; offset += 2) {
            int low = pcm[offset] & 0xff;
            int high = pcm[offset + 1];
            short sample = (short)((high << 8) | low);
            double normalized = sample / 32768.0;
            frameSquareSum += normalized * normalized;
            frameSampleCount++;

            if (frameSampleCount < FRAME_SAMPLES) {
                continue;
            }

            float rms = (float)Math.sqrt(
                frameSquareSum / FRAME_SAMPLES
            );
            frameSquareSum = 0d;
            frameSampleCount = 0;
            if (acceptFrame(rms)) {
                return true;
            }
        }

        return false;
    }

    boolean speechStarted() {
        return speechStarted;
    }

    int activeFrames() {
        return activeFrames;
    }

    private boolean acceptFrame(float rms) {
        float threshold = Math.max(
            MIN_SPEECH_RMS,
            noiseFloor * 2.8f
        );
        boolean active = rms >= threshold;

        if (!speechStarted) {
            if (active) {
                consecutiveActiveFrames++;
                if (consecutiveActiveFrames >= 2) {
                    speechStarted = true;
                    activeFrames = consecutiveActiveFrames;
                    trailingSilenceFrames = 0;
                }
            } else {
                consecutiveActiveFrames = 0;
                noiseFloor = updateNoiseFloor(noiseFloor, rms);
            }
            return false;
        }

        if (active) {
            activeFrames++;
            trailingSilenceFrames = 0;
            return false;
        }

        trailingSilenceFrames++;
        return activeFrames >= MIN_ACTIVE_FRAMES
            && trailingSilenceFrames >= END_SILENCE_FRAMES;
    }

    private static float updateNoiseFloor(float current, float measured) {
        float bounded = Math.min(measured, MIN_SPEECH_RMS * 0.95f);
        return current * 0.94f + bounded * 0.06f;
    }
}
