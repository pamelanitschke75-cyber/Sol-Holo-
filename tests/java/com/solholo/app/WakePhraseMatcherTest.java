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
        assertMatch("Hey Pam");
        if (!"pam-sol".equals(WakePhraseMatcher.OWNER_ID)) {
            throw new AssertionError("Der Weckname muss an Pams Owner-ID gebunden bleiben");
        }
    }

    private static void acceptsPunctuationAndCase() {
        assertMatch("HEY, PAM!");
        assertMatch("Hey Pamm.");
    }

    private static void acceptsCommonRecognizerSpellings() {
        assertMatch("Hei Pam");
        assertMatch("Hai Pamm");
        assertMatch("Hay Pam");
        assertMatch("Hey Päm");
    }

    private static void acceptsJoinedRecognizerResult() {
        assertMatch("HeyPam");
        assertMatch("HaiPamm");
    }

    private static void rejectsOtherPhrasesAndExtraWords() {
        assertNoMatch("Hey Sol");
        assertNoMatch("Hallo Pam");
        assertNoMatch("Hey Steffi");
        assertNoMatch("Hey Pam bitte");
        assertNoMatch("Ich sagte Hey Pam");
        assertNoMatch("");
    }

    private static void assertMatch(String phrase) {
        String actual = WakePhraseMatcher.canonicalPhrase(phrase);
        if (!"Hey Pam".equals(actual)) {
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
