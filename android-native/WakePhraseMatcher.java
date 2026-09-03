package com.solholo.app;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Normalizes the small set of labels the local keyword graph may return for
 * the spoken wake phrase. Authentication remains the separate speaker gate.
 */
final class WakePhraseMatcher {
    private static final String HEY = "(?:hey|hei|hai|hay)";
    private static final String SOL =
        "(?:sol|soll|soul|sohl|zoll|so|sole|saul|son|sohn)";

    private WakePhraseMatcher() {}

    static String canonicalPhrase(String rawPhrase) {
        String normalized = normalize(rawPhrase);
        if (normalized.matches("^" + HEY + "\\s+" + SOL + "$")) {
            return "Hey Sol";
        }

        String joined = normalized.replace(" ", "");
        if (joined.matches("^" + HEY + SOL + "$")) {
            return "Hey Sol";
        }

        return "";
    }

    private static String normalize(String rawPhrase) {
        return Normalizer
            .normalize(String.valueOf(rawPhrase), Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z ]", " ")
            .replaceAll("\\s+", " ")
            .trim();
    }
}
