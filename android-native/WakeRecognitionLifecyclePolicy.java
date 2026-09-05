package com.solholo.app;

/** Pure policy for keeping the owner wake listener healthy across screen state changes. */
final class WakeRecognitionLifecyclePolicy {
    private WakeRecognitionLifecyclePolicy() {
    }

    static boolean shouldRearmForScreenTransition(
        boolean backgroundMode,
        boolean destroyed,
        boolean pausedForConversation,
        boolean speakerVerificationPending,
        boolean wakeHandled,
        boolean lockedWakeHandoffPending
    ) {
        return backgroundMode
            && !destroyed
            && !pausedForConversation
            && !speakerVerificationPending
            && !wakeHandled
            && !lockedWakeHandoffPending;
    }

    static boolean shouldKeepWakeLockForRestart(
        boolean backgroundMode,
        boolean destroyed,
        boolean pausedForConversation
    ) {
        return backgroundMode && !destroyed && !pausedForConversation;
    }
}
