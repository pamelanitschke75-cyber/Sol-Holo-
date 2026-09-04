package com.solholo.app;

public final class SpeakerVerificationPolicyTest {
    public static void main(String[] args) {
        acceptsOwnerRangeObservedAfterFreshEnrollment();
        acceptsPamsMeasuredFullSentenceValues();
        acceptsPamsLatestMeasuredFullSentenceValues();
        rejectsSteffisMeasuredFullSentenceValues();
        acceptsShortWakeOnlyWhenBothModelsAgree();
        acceptsPamsShortWakeWithUnstableCampplus();
        rejectsSteffisPreviouslyMeasuredRangeForShortWake();
        acceptsVerifiedWakeTemplateOnlyWhenBothModelsAgree();
        toleratesChangedOwnerVoiceWhenOneModelRemainsStrong();
        rejectsChangedVoiceWhenTheSecondModelIsNotPlausible();
        keepsFullSentencePolicyStrict();
        rejectsShortWakeWhenOnlyOneModelAgrees();
        rejectsStrongCampplusWhenEres2netDisagrees();
        rejectsUnrelatedSpeakerRange();
        rejectsInvalidMeasurements();
        buildsNormalizedCentroidFromAllSamples();
        System.out.println("SpeakerVerificationPolicyTest: OK");
    }

    private static void acceptsShortWakeOnlyWhenBothModelsAgree() {
        assertTrue(
            SpeakerVerificationPolicy.isWakeOwner(0.52f, 0.51f),
            "Der kurze Besitzer-Weckruf muss bei Zustimmung beider Modelle freigegeben werden"
        );
    }

    private static void acceptsPamsShortWakeWithUnstableCampplus() {
        assertTrue(
            SpeakerVerificationPolicy.isWakeOwner(0.335f, 0.774f),
            "Pams ERes2Net-bestätigter Weckruf darf nicht am instabilen CAMPPlus-Modell scheitern"
        );
    }

    private static void rejectsSteffisPreviouslyMeasuredRangeForShortWake() {
        assertFalse(
            SpeakerVerificationPolicy.isWakeOwner(0.401f, 0.418f),
            "Steffis bisher höchster gemessener Bereich muss auch beim kurzen Weckruf gesperrt bleiben"
        );
        assertFalse(
            SpeakerVerificationPolicy.isWakeOwner(0.126f, 0.336f),
            "Steffis jüngster Messbereich muss auch beim kurzen Weckruf gesperrt bleiben"
        );
    }

    private static void acceptsPamsMeasuredFullSentenceValues() {
        assertTrue(
            SpeakerVerificationPolicy.isOwner(0.649f, 0.666f),
            "Pams bestätigter Sicherheitstest muss freigegeben bleiben"
        );
    }

    private static void acceptsPamsLatestMeasuredFullSentenceValues() {
        assertTrue(
            SpeakerVerificationPolicy.isOwner(0.335f, 0.774f),
            "Pams am 01.09. gemessener Vollsatz muss freigegeben werden"
        );
    }

    private static void rejectsSteffisMeasuredFullSentenceValues() {
        assertFalse(
            SpeakerVerificationPolicy.isOwner(0.126f, 0.336f),
            "Steffis am 01.09. gemessener Vollsatz muss gesperrt bleiben"
        );
    }

    private static void acceptsVerifiedWakeTemplateOnlyWhenBothModelsAgree() {
        assertTrue(
            SpeakerVerificationPolicy.isWakeTemplateOwner(0.63f, 0.71f),
            "Pams passender Hey-Pam-Abgleich muss freigegeben werden"
        );
        assertFalse(
            SpeakerVerificationPolicy.isWakeTemplateOwner(0.71f, 0.49f),
            "Ein Grenzwert in Modell A darf Modell B nicht allein ersetzen"
        );
        assertFalse(
            SpeakerVerificationPolicy.isWakeTemplateOwner(0.29f, 0.82f),
            "Ein Grenzwert in Modell B darf Modell A nicht allein ersetzen"
        );
        assertFalse(
            SpeakerVerificationPolicy.isWakeTemplateOwner(Float.NaN, 0.82f),
            "Ungültige Weckrufwerte müssen gesperrt werden"
        );
    }

    private static void toleratesChangedOwnerVoiceWhenOneModelRemainsStrong() {
        assertTrue(
            SpeakerVerificationPolicy.isWakeTemplateOwner(0.335f, 0.774f),
            "Eine heisere oder erkältete Besitzerstimme darf bei sehr starkem Modell B nicht an Modell A scheitern"
        );
        assertTrue(
            SpeakerVerificationPolicy.isWakeTemplateOwner(0.76f, 0.44f),
            "Eine veränderte Besitzerstimme darf bei sehr starkem Modell A nicht an einem noch plausiblen Modell B scheitern"
        );
    }

    private static void rejectsChangedVoiceWhenTheSecondModelIsNotPlausible() {
        assertFalse(
            SpeakerVerificationPolicy.isWakeTemplateOwner(0.29f, 0.90f),
            "Auch ein sehr starkes Modell B darf eine unplausible zweite Messung nicht übergehen"
        );
        assertFalse(
            SpeakerVerificationPolicy.isWakeTemplateOwner(0.90f, 0.41f),
            "Auch ein sehr starkes Modell A darf eine unplausible zweite Messung nicht übergehen"
        );
        assertFalse(
            SpeakerVerificationPolicy.isWakeTemplateOwner(0.401f, 0.418f),
            "Steffis bisher höchster gemessener Bereich muss trotz Alltagstoleranz gesperrt bleiben"
        );
    }

    private static void keepsFullSentencePolicyStrict() {
        assertFalse(
            SpeakerVerificationPolicy.isOwner(0.52f, 0.51f),
            "Die vollständige Sicherheitsprüfung darf nicht abgesenkt werden"
        );
    }

    private static void rejectsShortWakeWhenOnlyOneModelAgrees() {
        assertFalse(
            SpeakerVerificationPolicy.isWakeOwner(0.82f, 0.47f),
            "Modell A allein darf die kurze Stimme nicht freigeben"
        );
        assertFalse(
            SpeakerVerificationPolicy.isWakeOwner(0.09f, 0.90f),
            "Modell B allein darf die Plausibilitätskontrolle nicht umgehen"
        );
        assertFalse(
            SpeakerVerificationPolicy.isWakeOwner(Float.NaN, 0.90f),
            "Ungültige Kurzstimmenwerte müssen gesperrt werden"
        );
    }

    private static void acceptsOwnerRangeObservedAfterFreshEnrollment() {
        assertTrue(
            SpeakerVerificationPolicy.isOwner(0.25f, 0.64f),
            "Ein plausibler Besitzerwert muss freigegeben werden"
        );
    }

    private static void rejectsStrongCampplusWhenEres2netDisagrees() {
        assertFalse(
            SpeakerVerificationPolicy.isOwner(0.82f, 0.28f),
            "Ein hoher CAMPPlus-Wert darf Modell B nicht überstimmen"
        );
    }

    private static void rejectsUnrelatedSpeakerRange() {
        assertFalse(
            SpeakerVerificationPolicy.isOwner(0.78f, 0.29f),
            "Ein fremder Sprecher muss trotz hohem CAMPPlus-Wert gesperrt bleiben"
        );
        assertFalse(
            SpeakerVerificationPolicy.isOwner(0.09f, 0.90f),
            "Die zweite Plausibilitätskontrolle darf nicht umgangen werden"
        );
    }

    private static void rejectsInvalidMeasurements() {
        assertFalse(
            SpeakerVerificationPolicy.isOwner(Float.NaN, 0.90f),
            "NaN muss gesperrt werden"
        );
        assertFalse(
            SpeakerVerificationPolicy.isOwner(0.90f, Float.POSITIVE_INFINITY),
            "Unendliche Werte müssen gesperrt werden"
        );
    }

    private static void buildsNormalizedCentroidFromAllSamples() {
        float[] centroid = SpeakerVerificationPolicy.normalizedCentroid(new float[][] {
            { 1.0f, 0.0f },
            { 0.8f, 0.2f },
            { 0.8f, -0.2f }
        });
        float norm = (float)Math.sqrt(
            centroid[0] * centroid[0] + centroid[1] * centroid[1]
        );
        assertNear(1.0f, norm, 0.0001f, "Das Mittelprofil muss normalisiert sein");
        assertTrue(centroid[0] > 0.99f, "Alle drei Proben müssen das Zentrum bilden");
    }

    private static void assertTrue(boolean value, String message) {
        if (!value) throw new AssertionError(message);
    }

    private static void assertFalse(boolean value, String message) {
        assertTrue(!value, message);
    }

    private static void assertNear(float expected, float actual, float tolerance, String message) {
        if (Math.abs(expected - actual) > tolerance) {
            throw new AssertionError(message + ": expected=" + expected + ", actual=" + actual);
        }
    }
}
