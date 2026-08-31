package com.solholo.app;

/**
 * Pure speaker-verification policy kept separate from Android APIs so its
 * security boundaries can be regression-tested on every build.
 */
final class SpeakerVerificationPolicy {
    // ERes2Net is the discriminating model. CAMPPlus remains a second,
    // deliberately low sanity gate because it is less stable on short speech.
    static final float ERES2NET_OWNER_THRESHOLD = 0.58f;
    static final float CAMPPLUS_SANITY_FLOOR = 0.10f;

    private SpeakerVerificationPolicy() {}

    static boolean isOwner(float campplusScore, float eres2netScore) {
        return isFinite(campplusScore)
            && isFinite(eres2netScore)
            && campplusScore >= CAMPPLUS_SANITY_FLOOR
            && eres2netScore >= ERES2NET_OWNER_THRESHOLD;
    }

    /**
     * Builds one normalized owner profile from all enrollment embeddings.
     * Averaging before comparison follows sherpa-onnx's SpeakerEmbeddingManager.
     */
    static float[] normalizedCentroid(float[][] embeddings) {
        if (embeddings == null || embeddings.length == 0) {
            throw new IllegalArgumentException("Keine Stimmproben vorhanden");
        }
        if (embeddings[0] == null || embeddings[0].length == 0) {
            throw new IllegalArgumentException("Stimmprofil ist leer");
        }

        int dimensions = embeddings[0].length;
        double[] sum = new double[dimensions];
        for (float[] embedding : embeddings) {
            if (embedding == null || embedding.length != dimensions) {
                throw new IllegalArgumentException("Stimmprofil hat uneinheitliche Dimensionen");
            }
            for (int i = 0; i < dimensions; i++) {
                if (!isFinite(embedding[i])) {
                    throw new IllegalArgumentException("Stimmprofil enthält ungültige Werte");
                }
                sum[i] += embedding[i];
            }
        }

        double normSquared = 0d;
        for (double value : sum) {
            normSquared += value * value;
        }
        if (normSquared <= 0d || Double.isNaN(normSquared) || Double.isInfinite(normSquared)) {
            throw new IllegalArgumentException("Stimmprofil kann nicht normalisiert werden");
        }

        double norm = Math.sqrt(normSquared);
        float[] centroid = new float[dimensions];
        for (int i = 0; i < dimensions; i++) {
            centroid[i] = (float)(sum[i] / norm);
        }
        return centroid;
    }

    static float cosine(float[] a, float[] b) {
        if (a == null || b == null || a.length == 0 || a.length != b.length) {
            throw new IllegalArgumentException("Stimmvektoren sind nicht vergleichbar");
        }

        double dot = 0d;
        double normA = 0d;
        double normB = 0d;
        for (int i = 0; i < a.length; i++) {
            if (!isFinite(a[i]) || !isFinite(b[i])) {
                throw new IllegalArgumentException("Stimmvektor enthält ungültige Werte");
            }
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA <= 0d || normB <= 0d) {
            throw new IllegalArgumentException("Stimmvektor ist leer");
        }
        return (float)(dot / (Math.sqrt(normA) * Math.sqrt(normB)));
    }

    private static boolean isFinite(float value) {
        return !Float.isNaN(value) && !Float.isInfinite(value);
    }
}
