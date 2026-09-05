package com.solholo.app;

/**
 * Fixed-size PCM ring buffer with absolute sample positions. The wake-word
 * detector can therefore keep listening indefinitely while retaining only the
 * short, in-memory audio window required for the speaker gate.
 */
final class PcmRingBuffer {
    private final short[] samples;
    private long totalWritten;
    private int size;
    private int nextWrite;

    PcmRingBuffer(int capacitySamples) {
        if (capacitySamples <= 0) {
            throw new IllegalArgumentException("capacitySamples must be positive");
        }
        samples = new short[capacitySamples];
    }

    synchronized void append(short[] source, int count) {
        if (source == null || count < 0 || count > source.length) {
            throw new IllegalArgumentException("invalid PCM input");
        }
        for (int index = 0; index < count; index++) {
            samples[nextWrite] = source[index];
            nextWrite = (nextWrite + 1) % samples.length;
            if (size < samples.length) {
                size++;
            }
            totalWritten++;
        }
    }

    synchronized long totalWritten() {
        return totalWritten;
    }

    synchronized short[] snapshotFrom(long absoluteStartSample) {
        long earliest = totalWritten - size;
        long start = Math.max(earliest, Math.min(absoluteStartSample, totalWritten));
        int length = (int)(totalWritten - start);
        short[] result = new short[length];
        if (length == 0) {
            return result;
        }

        int oldestIndex = (nextWrite - size + samples.length) % samples.length;
        int offset = (int)(start - earliest);
        for (int index = 0; index < length; index++) {
            result[index] = samples[(oldestIndex + offset + index) % samples.length];
        }
        return result;
    }

    synchronized short[] snapshotLatest(int maximumSamples) {
        if (maximumSamples <= 0) {
            throw new IllegalArgumentException("maximumSamples must be positive");
        }
        long start = totalWritten - Math.min(size, maximumSamples);
        return snapshotFrom(start);
    }
}
