package com.solholo.app;

public final class SpeakerVerificationPolicyTest {
    public static void main(String[] args) {
        acceptsOwnerRangeObservedAfterFreshEnrollment();
        rejectsStrongCampplusWhenEres2netDisagrees();
        rejectsUnrelatedSpeakerRange();
        rejectsInvalidMeasurements();
        buildsNormalizedCentroidFromAllSamples();
        System.out.println("SpeakerVerificationPolicyTest: OK");
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
