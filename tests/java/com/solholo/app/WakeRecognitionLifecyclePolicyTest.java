package com.solholo.app;

public final class WakeRecognitionLifecyclePolicyTest {
    public static void main(String[] args) {
        rearmsOnlyAnIdleBackgroundListener();
        keepsCpuAwakeAcrossBackgroundRestartDelay();
        System.out.println("WakeRecognitionLifecyclePolicyTest: OK");
    }

    private static void rearmsOnlyAnIdleBackgroundListener() {
        assertTrue(rearm(true, false, false, false, false, false));
        assertFalse(rearm(false, false, false, false, false, false));
        assertFalse(rearm(true, true, false, false, false, false));
        assertFalse(rearm(true, false, true, false, false, false));
        assertFalse(rearm(true, false, false, true, false, false));
        assertFalse(rearm(true, false, false, false, true, false));
        assertFalse(rearm(true, false, false, false, false, true));
    }

    private static void keepsCpuAwakeAcrossBackgroundRestartDelay() {
        assertTrue(
            WakeRecognitionLifecyclePolicy.shouldKeepWakeLockForRestart(
                true,
                false,
                false
            )
        );
        assertFalse(
            WakeRecognitionLifecyclePolicy.shouldKeepWakeLockForRestart(
                false,
                false,
                false
            )
        );
        assertFalse(
            WakeRecognitionLifecyclePolicy.shouldKeepWakeLockForRestart(
                true,
                true,
                false
            )
        );
        assertFalse(
            WakeRecognitionLifecyclePolicy.shouldKeepWakeLockForRestart(
                true,
                false,
                true
            )
        );
    }

    private static boolean rearm(
        boolean backgroundMode,
        boolean destroyed,
        boolean pausedForConversation,
        boolean speakerVerificationPending,
        boolean wakeHandled,
        boolean lockedWakeHandoffPending
    ) {
        return WakeRecognitionLifecyclePolicy.shouldRearmForScreenTransition(
            backgroundMode,
            destroyed,
            pausedForConversation,
            speakerVerificationPending,
            wakeHandled,
            lockedWakeHandoffPending
        );
    }

    private static void assertTrue(boolean actual) {
        if (!actual) {
            throw new AssertionError("expected true");
        }
    }

    private static void assertFalse(boolean actual) {
        if (actual) {
            throw new AssertionError("expected false");
        }
    }
}
