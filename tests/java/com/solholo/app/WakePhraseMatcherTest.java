package com.solholo.app;

public final class WakePhraseMatcherTest {
    public static void main(String[] args) {
        acceptsCanonicalPhrase();
        acceptsPunctuationAndCase();
        acceptsCommonRecognizerSpellings();
        acceptsJoinedRecognizerResult();
        rejectsOtherPhrasesAndExtraWords();
        System.out.println("WakePhraseMatcherTest: OK");
    }

    private static void acceptsCanonicalPhrase() {
        assertMatch("Hey Sol");
    }

    private static void acceptsPunctuationAndCase() {
        assertMatch("HEY, SOL!");
        assertMatch("Hey Soul.");
    }

    private static void acceptsCommonRecognizerSpellings() {
        assertMatch("Hei Soll");
        assertMatch("Hai Sohl");
        assertMatch("Hey Zoll");
        assertMatch("Hey so");
        assertMatch("Hey Sohn");
        assertMatch("Hay Saul");
    }

    private static void acceptsJoinedRecognizerResult() {
        assertMatch("HeySol");
        assertMatch("HeySoul");
        assertMatch("HaiZoll");
    }

    private static void rejectsOtherPhrasesAndExtraWords() {
        assertNoMatch("Hallo Sol");
        assertNoMatch("Hey Steffi");
        assertNoMatch("Hey Sol bitte");
        assertNoMatch("Ich sagte Hey Sol");
        assertNoMatch("");
    }

    private static void assertMatch(String phrase) {
        String actual = WakePhraseMatcher.canonicalPhrase(phrase);
        if (!"Hey Sol".equals(actual)) {
            throw new AssertionError("Muss erkannt werden: " + phrase);
        }
    }

    private static void assertNoMatch(String phrase) {
        String actual = WakePhraseMatcher.canonicalPhrase(phrase);
        if (!actual.isEmpty()) {
            throw new AssertionError("Darf nicht erkannt werden: " + phrase);
        }
    }
}
