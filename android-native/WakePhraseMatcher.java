package com.solholo.app;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Normalizes the small set of labels the local keyword graph may return for
 * the spoken wake phrase. Authentication remains the separate speaker gate.
 */
final class WakePhraseMatcher {
    static final String OWNER_ID = "pam-sol";
    static final String OWNER_NAME = "Pam";
    static final String CANONICAL_PHRASE = "Hey " + OWNER_NAME;

    private static final String HEY = "(?:hey|hei|hai|hay)";
    private static final String PERSONAL_NAME = "(?:pam|pamm)";

    private WakePhraseMatcher() {}

    static String canonicalPhrase(String rawPhrase) {
        String normalized = normalize(rawPhrase);
        if (normalized.matches("^" + HEY + "\\s+" + PERSONAL_NAME + "$")) {
            return CANONICAL_PHRASE;
        }

        String joined = normalized.replace(" ", "");
        if (joined.matches("^" + HEY + PERSONAL_NAME + "$")) {
            return CANONICAL_PHRASE;
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
