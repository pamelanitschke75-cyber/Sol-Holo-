package com.solholo.app;

import android.Manifest;
import android.app.ActivityOptions;
import android.app.KeyguardManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class HeyHoSolService extends Service {
    public static final String ACTION_START = "com.solholo.app.HEY_HO_SOL_START";
    public static final String ACTION_PAUSE = "com.solholo.app.HEY_HO_SOL_PAUSE";
    public static final String ACTION_RESUME = "com.solholo.app.HEY_HO_SOL_RESUME";
    public static final String ACTION_STOP = "com.solholo.app.HEY_HO_SOL_STOP";
    public static final String MODE_EXTRA = "mode";

    private static final String CHANNEL_ID = "hey_ho_sol_background";
    private static final String WAKE_DETECTED_CHANNEL_ID =
        "hey_ho_sol_detected";
    private static final int NOTIFICATION_ID = 2408;
    private static final int WAKE_DETECTED_NOTIFICATION_ID = 2410;
    private static final int WAKE_ACTIVITY_REQUEST_CODE = 2409;
    private static final long WAKE_ACTIVITY_PENDING_DELAY_MILLIS = 320L;
    private static final long WAKE_ACTIVITY_DIRECT_FALLBACK_DELAY_MILLIS = 900L;
    private static final long WAKE_ACTIVITY_CONFIRM_DELAY_MILLIS = 2_600L;
    private static final long LOCKED_WAKE_HANDOFF_TIMEOUT_MILLIS = 120_000L;
    private static final int SECURE_SAMPLE_RATE = SolWakeKeywordSpotter.SAMPLE_RATE;
    private static final int SECURE_RING_SECONDS = 5;
    private static final int KEYWORD_PREROLL_SAMPLES =
        SECURE_SAMPLE_RATE * 350 / 1000;
    private static final int KEYWORD_POSTROLL_SAMPLES =
        SECURE_SAMPLE_RATE * 350 / 1000;
    private static final int MIN_SECURE_CAPTURE_SAMPLES =
        SECURE_SAMPLE_RATE * 500 / 1000;
    private static final String SECURE_WAKE_PHRASE =
        WakePhraseMatcher.CANONICAL_PHRASE;

    private static volatile boolean running;
    private static volatile boolean listening;
    private static volatile boolean processingAudio;
    private static volatile boolean pausedForConversation;
    private static volatile HeyHoSolService activeService;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService speakerExecutor =
        Executors.newSingleThreadExecutor();
    private final Runnable restartRunnable = this::startRecognition;
    private final Runnable fallbackResumeRunnable = () -> {
        if (running && !pausedForConversation) {
            startRecognition();
        }
    };

    private String currentMode = HeyHoSolPlugin.MODE_OFF;
    private boolean destroyed;
    private boolean wakeHandled;
    private boolean recognitionStarted;
    private boolean speakerVerificationPending;
    private boolean foregroundNotificationActive;
    private long recognitionGeneration;
    private SecureAudioSession secureAudioSession;
    private WindowManager wakeOverlayManager;
    private View wakeOverlayView;
    private PowerManager.WakeLock recognitionWakeLock;
    private boolean unlockReceiverRegistered;
    private final Runnable lockedWakeTimeoutRunnable =
        this::finishLockedWakeHandoff;
    private final BroadcastReceiver unlockReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (
                intent != null
                    && Intent.ACTION_USER_PRESENT.equals(intent.getAction())
            ) {
                mainHandler.post(() -> continueWakeAfterDeviceUnlock());
            }
        }
    };

    private interface SecureAudioListener {
        void onKeyword(
            SecureAudioSession session,
            SolWakeKeywordSpotter.Detection detection
        );

        void onFailure(SecureAudioSession session, String reason);
    }

    private static final class SecureAudioSession {
        private final AudioRecord recorder;
        private final SolWakeKeywordSpotter keywordSpotter;
        private final PcmRingBuffer captured = new PcmRingBuffer(
            SECURE_SAMPLE_RATE * SECURE_RING_SECONDS
        );
        private final AtomicBoolean active = new AtomicBoolean(false);
        private final AtomicBoolean released = new AtomicBoolean(false);
        private final AtomicBoolean cancelled = new AtomicBoolean(false);
        private Thread pumpThread;
        private volatile long keywordAudioStart;

        SecureAudioSession(Context context) throws IOException {
            keywordSpotter = new SolWakeKeywordSpotter(context);
            int minBuffer = AudioRecord.getMinBufferSize(
                SECURE_SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            );
            if (minBuffer <= 0) {
                keywordSpotter.close();
                throw new IllegalStateException("Sicherer Audio-Puffer ist nicht verfügbar");
            }

            recorder = new AudioRecord(
                // sherpa-onnx' Android-Referenz liest den Keyword-Strom aus
                // der unverfälschten Mikrofonquelle. VOICE_RECOGNITION kann
                // auf Samsung-Geräten kurze Anlaute wie "Hey" wegfiltern.
                MediaRecorder.AudioSource.MIC,
                SECURE_SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                Math.max(minBuffer * 2, SECURE_SAMPLE_RATE)
            );
            if (recorder.getState() != AudioRecord.STATE_INITIALIZED) {
                recorder.release();
                keywordSpotter.close();
                throw new IllegalStateException("Sichere Mikrofonaufnahme konnte nicht starten");
            }
        }

        void start(SecureAudioListener listener) {
            recorder.startRecording();
            if (recorder.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING) {
                stopAndReleaseRecorder();
                keywordSpotter.close();
                throw new IllegalStateException("Sichere Mikrofonaufnahme ist nicht aktiv");
            }
            active.set(true);
            pumpThread = new Thread(() -> pump(listener), "sol-local-hey-sol");
            pumpThread.start();
        }

        private void pump(SecureAudioListener listener) {
            short[] buffer = new short[1600];
            SolWakeKeywordSpotter.Detection detection = null;
            long keywordPostrollEndSample = Long.MAX_VALUE;
            String failure = "";

            try {
                while (active.get()) {
                    int count = recorder.read(buffer, 0, buffer.length);
                    if (count == AudioRecord.ERROR_DEAD_OBJECT) {
                        throw new IllegalStateException("Mikrofonverbindung wurde unterbrochen");
                    }
                    if (count <= 0) {
                        continue;
                    }
                    captured.append(buffer, count);
                    if (detection == null) {
                        detection = keywordSpotter.accept(buffer, count);
                        if (detection != null) {
                            keywordAudioStart = Math.max(
                                0L,
                                detection.firstTokenSample - KEYWORD_PREROLL_SAMPLES
                            );
                            keywordPostrollEndSample = captured.totalWritten()
                                + KEYWORD_POSTROLL_SAMPLES;
                        }
                    } else if (
                        captured.totalWritten() >= keywordPostrollEndSample
                    ) {
                        active.set(false);
                        break;
                    }
                }
            } catch (RuntimeException error) {
                if (error.getMessage() != null) {
                    failure = error.getMessage().trim();
                }
                if (failure.isEmpty()) {
                    failure = "Lokale Hey-Pam-Erkennung wurde unterbrochen";
                }
            } finally {
                active.set(false);
                stopAndReleaseRecorder();
                keywordSpotter.close();
            }

            if (cancelled.get() || listener == null) {
                return;
            }
            if (detection != null) {
                listener.onKeyword(this, detection);
            } else {
                listener.onFailure(this, failure);
            }
        }

        short[] finishAndSnapshot() {
            active.set(false);
            stopAndReleaseRecorder();
            joinPump();
            return captured.snapshotFrom(keywordAudioStart);
        }

        void cancel() {
            cancelled.set(true);
            active.set(false);
            stopAndReleaseRecorder();
            Thread thread = pumpThread;
            if (thread == null) {
                keywordSpotter.close();
                return;
            }
            joinPump();
        }

        private void joinPump() {
            Thread thread = pumpThread;
            if (thread == null || thread == Thread.currentThread()) {
                return;
            }
            try {
                thread.join(1_500L);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
            }
        }

        private void stopAndReleaseRecorder() {
            if (!released.compareAndSet(false, true)) {
                return;
            }
            try {
                recorder.stop();
            } catch (RuntimeException ignored) {
            }
            recorder.release();
        }
    }

    public static Intent startIntent(Context context, String mode) {
        return new Intent(context, HeyHoSolService.class)
            .setAction(ACTION_START)
            .putExtra(MODE_EXTRA, mode);
    }

    public static void pause(Context context) {
        HeyHoSolService service = activeService;
        if (service != null) {
            service.mainHandler.post(service::pauseForConversationInPlace);
            return;
        }
        if (!running) {
            return;
        }
        context.startService(
            new Intent(context, HeyHoSolService.class).setAction(ACTION_PAUSE)
        );
    }

    public static void resume(Context context, String mode) {
        if (HeyHoSolPlugin.MODE_OFF.equals(mode)) {
            return;
        }
        HeyHoSolService service = activeService;
        if (service != null) {
            service.mainHandler.post(() -> service.resumeInPlace(mode));
            return;
        }

        // A microphone foreground service may only be created while the app
        // is visible. If Android removed the existing service while the phone
        // was locked, the next visible Activity resume starts it again. This
        // avoids an illegal and unreliable background FGS restart.
        if (!HeyHoSolPlugin.isActivityVisible()) {
            return;
        }
        Intent intent = new Intent(context, HeyHoSolService.class)
            .setAction(ACTION_RESUME)
            .putExtra(MODE_EXTRA, mode);
        if (HeyHoSolPlugin.MODE_BACKGROUND.equals(mode)) {
            ContextCompat.startForegroundService(context, intent);
        } else if (HeyHoSolPlugin.isActivityVisible()) {
            context.startService(intent);
        }
    }

    public static boolean isRunning() {
        return running;
    }

    public static boolean isListening() {
        return listening;
    }

    public static boolean isProcessingAudio() {
        return processingAudio;
    }

    public static boolean isPausedForConversation() {
        return pausedForConversation;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        activeService = this;
        running = true;
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();
        String requestedMode = intent == null
            ? savedMode()
            : intent.getStringExtra(MODE_EXTRA);
        if (requestedMode == null || requestedMode.isEmpty()) {
            requestedMode = savedMode();
        }
        currentMode = requestedMode;

        if (ACTION_STOP.equals(action) || HeyHoSolPlugin.MODE_OFF.equals(currentMode)) {
            saveMode(HeyHoSolPlugin.MODE_OFF);
            stopWakeService();
            return START_NOT_STICKY;
        }

        if (!hasMicrophonePermission() || !SolSpeakerIdentityPlugin.isProfileReady(this)) {
            saveError(
                !hasMicrophonePermission()
                    ? "Mikrofonfreigabe fehlt."
                    : "Bitte zuerst Pams Stimmprofil vollständig einrichten."
            );
            saveMode(HeyHoSolPlugin.MODE_OFF);
            stopWakeService();
            return START_NOT_STICKY;
        }

        if (HeyHoSolPlugin.MODE_BACKGROUND.equals(currentMode)) {
            startBackgroundNotification("Lokaler Hey-Pam-Schutz startet …");
        } else if (foregroundNotificationActive) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            foregroundNotificationActive = false;
        }

        if (ACTION_PAUSE.equals(action)) {
            pauseForConversationInPlace();
            return serviceRestartMode();
        }

        resumeInPlace(currentMode);
        return serviceRestartMode();
    }

    private void pauseForConversationInPlace() {
        if (destroyed) {
            return;
        }
        pausedForConversation = true;
        pauseRecognition();
        updateBackgroundNotification("Pausiert, solange Sol mit dir spricht");
        HeyHoSolPlugin.publishStatusEvent();
    }

    private void resumeInPlace(String mode) {
        if (destroyed || HeyHoSolPlugin.MODE_OFF.equals(mode)) {
            return;
        }
        currentMode = mode;
        pausedForConversation = false;
        if (
            HeyHoSolPlugin.MODE_BACKGROUND.equals(currentMode)
                && !foregroundNotificationActive
        ) {
            startBackgroundNotification("Lokaler Hey-Pam-Schutz startet …");
        }
        startRecognition();
        HeyHoSolPlugin.publishStatusEvent();
    }

    private int serviceRestartMode() {
        return HeyHoSolPlugin.MODE_BACKGROUND.equals(currentMode)
            ? START_STICKY
            : START_NOT_STICKY;
    }

    private String savedMode() {
        return getSharedPreferences(
            HeyHoSolPlugin.PREFERENCES_NAME,
            Context.MODE_PRIVATE
        ).getString(HeyHoSolPlugin.MODE_KEY, HeyHoSolPlugin.MODE_OFF);
    }

    private void saveMode(String mode) {
        getSharedPreferences(
            HeyHoSolPlugin.PREFERENCES_NAME,
            Context.MODE_PRIVATE
        ).edit().putString(HeyHoSolPlugin.MODE_KEY, mode).apply();
    }

    private void saveError(String error) {
        getSharedPreferences(
            HeyHoSolPlugin.PREFERENCES_NAME,
            Context.MODE_PRIVATE
        ).edit().putString(HeyHoSolPlugin.LAST_ERROR_KEY, error).apply();
    }

    private boolean hasMicrophonePermission() {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED;
    }

    private void startRecognition() {
        mainHandler.removeCallbacks(restartRunnable);
        mainHandler.removeCallbacks(fallbackResumeRunnable);
        if (
            destroyed
                || pausedForConversation
                || recognitionStarted
                || speakerVerificationPending
                || !hasMicrophonePermission()
                || !SolSpeakerIdentityPlugin.isProfileReady(this)
        ) {
            return;
        }

        acquireRecognitionWakeLock();

        SecureAudioSession session;
        try {
            session = new SecureAudioSession(getApplicationContext());
        } catch (IOException | RuntimeException error) {
            saveError("Die lokale Hey-Pam-Erkennung konnte nicht vorbereitet werden.");
            updateBackgroundNotification("Hey-Pam-Modell konnte nicht starten");
            releaseRecognitionWakeLock();
            scheduleRestart(2_000L);
            return;
        }

        wakeHandled = false;
        recognitionGeneration++;
        long generation = recognitionGeneration;
        secureAudioSession = session;
        recognitionStarted = true;
        listening = false;
        processingAudio = false;
        HeyHoSolPlugin.publishStatusEvent();
        updateBackgroundNotification("Mikrofon startet …");

        try {
            session.start(new SecureAudioListener() {
                @Override
                public void onKeyword(
                    SecureAudioSession completedSession,
                    SolWakeKeywordSpotter.Detection detection
                ) {
                    mainHandler.post(
                        () -> onLocalKeywordDetected(
                            completedSession,
                            detection,
                            generation
                        )
                    );
                }

                @Override
                public void onFailure(
                    SecureAudioSession failedSession,
                    String reason
                ) {
                    mainHandler.post(
                        () -> onLocalRecognitionFailure(
                            failedSession,
                            reason,
                            generation
                        )
                    );
                }
            });
            listening = true;
            saveError("");
            HeyHoSolPlugin.publishStatusEvent();
            updateBackgroundNotification("Sag: „" + SECURE_WAKE_PHRASE + "“");
        } catch (RuntimeException error) {
            if (secureAudioSession == session) {
                secureAudioSession = null;
            }
            session.cancel();
            recognitionStarted = false;
            listening = false;
            processingAudio = false;
            saveError("Der sichere lokale Sprachdienst konnte nicht gestartet werden.");
            releaseRecognitionWakeLock();
            scheduleRestart(1_500L);
        }
    }

    private void onLocalKeywordDetected(
        SecureAudioSession session,
        SolWakeKeywordSpotter.Detection detection,
        long generation
    ) {
        if (
            destroyed
                || generation != recognitionGeneration
                || secureAudioSession != session
                || !recognitionStarted
                || speakerVerificationPending
                || wakeHandled
                || detection == null
        ) {
            return;
        }
        String phrase = WakePhraseMatcher.canonicalPhrase(detection.phrase);
        if (phrase.isEmpty()) {
            onLocalRecognitionFailure(session, "Ungültiger Weckruf", generation);
            return;
        }

        wakeHandled = true;
        listening = false;
        processingAudio = true;
        HeyHoSolPlugin.publishStatusEvent();
        verifySpeakerBeforeWake(phrase, generation);
    }

    private void onLocalRecognitionFailure(
        SecureAudioSession session,
        String reason,
        long generation
    ) {
        if (
            destroyed
                || generation != recognitionGeneration
                || secureAudioSession != session
                || speakerVerificationPending
                || wakeHandled
        ) {
            return;
        }
        secureAudioSession = null;
        recognitionStarted = false;
        listening = false;
        processingAudio = false;
        releaseRecognitionWakeLock();
        saveError(
            reason == null || reason.trim().isEmpty()
                ? "Lokale Hey-Pam-Erkennung wurde unterbrochen."
                : reason
        );
        updateBackgroundNotification("Hey-Pam-Erkennung startet neu …");
        scheduleRestart(650L);
    }

    private void verifySpeakerBeforeWake(String phrase, long generation) {
        SecureAudioSession session = detachSecureAudioSession();
        recognitionStarted = false;
        listening = false;
        processingAudio = true;
        speakerVerificationPending = true;
        HeyHoSolPlugin.publishStatusEvent();
        HeyHoSolPlugin.publishWakeDiagnostic("phrase_heard");
        updateBackgroundNotification("Hey Pam erkannt · Stimme wird abgeglichen");

        speakerExecutor.execute(() -> {
            boolean accepted = false;
            float campplusScore = Float.NaN;
            float eres2netScore = Float.NaN;
            boolean wakeTemplateUsed = false;
            String failureReason = "Stimme wurde nicht sicher freigegeben.";
            try {
                if (session == null) {
                    throw new IllegalStateException("Sichere Audioaufnahme fehlt");
                }
                short[] samples = session.finishAndSnapshot();
                if (samples.length < MIN_SECURE_CAPTURE_SAMPLES) {
                    throw new IllegalStateException("Hey Pam war zu kurz oder zu leise");
                }
                SolSpeakerIdentityPlugin.WakeVerification verification =
                    SolSpeakerIdentityPlugin.verifyWakeAudio(
                        getApplicationContext(),
                        samples,
                        samples.length
                    );
                accepted = verification.accepted;
                campplusScore = verification.campplusScore;
                eres2netScore = verification.eres2netScore;
                wakeTemplateUsed = verification.templateUsed;
            } catch (RuntimeException error) {
                if (error.getMessage() != null && !error.getMessage().trim().isEmpty()) {
                    failureReason = error.getMessage();
                }
            }

            final boolean ownerAccepted = accepted;
            final float measuredCampplusScore = campplusScore;
            final float measuredEres2netScore = eres2netScore;
            final boolean verifiedAgainstWakeTemplate = wakeTemplateUsed;
            final String rejectionReason = failureReason;
            mainHandler.post(() -> {
                if (destroyed || generation != recognitionGeneration) {
                    return;
                }
                speakerVerificationPending = false;
                processingAudio = false;
                if (ownerAccepted) {
                    saveError("");
                    HeyHoSolPlugin.publishWakeDiagnostic(
                        "owner_accepted",
                        measuredCampplusScore,
                        measuredEres2netScore,
                        verifiedAgainstWakeTemplate,
                        ""
                    );
                    handleWakePhrase(phrase);
                    return;
                }

                saveError(rejectionReason);
                wakeHandled = false;
                HeyHoSolPlugin.publishWakeDiagnostic(
                    "owner_rejected",
                    measuredCampplusScore,
                    measuredEres2netScore,
                    verifiedAgainstWakeTemplate,
                    rejectionReason
                );
                updateBackgroundNotification("Keine Freigabe · Weckruf wartet weiter");
                scheduleRestart(650L);
            });
        });
    }

    private void scheduleRestart(long delayMillis) {
        recognitionStarted = false;
        listening = false;
        processingAudio = false;
        releaseRecognitionWakeLock();
        HeyHoSolPlugin.publishStatusEvent();
        if (!destroyed && !pausedForConversation) {
            mainHandler.removeCallbacks(restartRunnable);
            mainHandler.postDelayed(restartRunnable, delayMillis);
        }
    }

    private void pauseRecognition() {
        mainHandler.removeCallbacks(restartRunnable);
        mainHandler.removeCallbacks(fallbackResumeRunnable);
        recognitionGeneration++;
        recognitionStarted = false;
        listening = false;
        processingAudio = false;
        speakerVerificationPending = false;
        cancelSecureAudioSession();
        releaseRecognitionWakeLock();
    }

    private SecureAudioSession detachSecureAudioSession() {
        SecureAudioSession session = secureAudioSession;
        secureAudioSession = null;
        return session;
    }

    private void cancelSecureAudioSession() {
        SecureAudioSession session = detachSecureAudioSession();
        if (session != null) {
            session.cancel();
        }
    }

    private void handleWakePhrase(String phrase) {
        pauseRecognition();
        pausedForConversation = false;
        HeyHoSolPlugin.publishWakeEvent(this, phrase);
        if (isDeviceLocked()) {
            beginLockedWakeHandoff();
        } else {
            updateBackgroundNotification("Weckruf erkannt · Sol öffnet sich");
            openSolHolo();
        }
        mainHandler.postDelayed(fallbackResumeRunnable, 12_000L);
        HeyHoSolPlugin.publishStatusEvent();
    }

    private boolean isDeviceLocked() {
        KeyguardManager keyguard = (KeyguardManager)getSystemService(
            Context.KEYGUARD_SERVICE
        );
        return keyguard != null && keyguard.isKeyguardLocked();
    }

    private void beginLockedWakeHandoff() {
        updateBackgroundNotification("Hey Pam erkannt · bitte sicher entsperren");
        showWakeDetectedNotification();
        registerUnlockReceiver();
        showLockedWakeOverlay();
        wakeScreenForSecureHandoff();
        if (!isDeviceLocked()) {
            continueWakeAfterDeviceUnlock();
            return;
        }
        mainHandler.removeCallbacks(lockedWakeTimeoutRunnable);
        mainHandler.postDelayed(
            lockedWakeTimeoutRunnable,
            LOCKED_WAKE_HANDOFF_TIMEOUT_MILLIS
        );
    }

    private void continueWakeAfterDeviceUnlock() {
        if (destroyed || isDeviceLocked()) {
            return;
        }
        unregisterUnlockReceiver();
        mainHandler.removeCallbacks(lockedWakeTimeoutRunnable);

        // Keep the owner-visible overlay up until Android has accepted the
        // Activity launch. On Android 15+ this also supplies the visible-window
        // condition required for a background launch with SYSTEM_ALERT_WINDOW.
        launchSolHoloActivity();
        mainHandler.postDelayed(
            this::launchSolHoloActivityDirectlyIfStillHidden,
            WAKE_ACTIVITY_DIRECT_FALLBACK_DELAY_MILLIS
        );
        mainHandler.postDelayed(this::removeWakeOverlay, 2_000L);
        mainHandler.postDelayed(
            this::confirmWakeActivityVisible,
            WAKE_ACTIVITY_CONFIRM_DELAY_MILLIS
        );
    }

    private void finishLockedWakeHandoff() {
        unregisterUnlockReceiver();
        removeWakeOverlay();
        cancelWakeDetectedNotification();
        updateBackgroundNotification("Hey Pam bereit · ich höre lokal zu");
    }

    private void registerUnlockReceiver() {
        if (unlockReceiverRegistered) {
            return;
        }
        IntentFilter filter = new IntentFilter(Intent.ACTION_USER_PRESENT);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(
                    unlockReceiver,
                    filter,
                    Context.RECEIVER_NOT_EXPORTED
                );
            } else {
                registerReceiver(unlockReceiver, filter);
            }
            unlockReceiverRegistered = true;
        } catch (RuntimeException error) {
            saveError("Android konnte die sichere Entsperr-Übergabe nicht vorbereiten.");
        }
    }

    private void unregisterUnlockReceiver() {
        if (!unlockReceiverRegistered) {
            return;
        }
        unlockReceiverRegistered = false;
        try {
            unregisterReceiver(unlockReceiver);
        } catch (RuntimeException ignored) {
        }
    }

    @SuppressWarnings("deprecation")
    private void wakeScreenForSecureHandoff() {
        PowerManager power = (PowerManager)getSystemService(POWER_SERVICE);
        if (power == null || power.isInteractive()) {
            return;
        }
        PowerManager.WakeLock screenWakeLock = power.newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK
                | PowerManager.ACQUIRE_CAUSES_WAKEUP
                | PowerManager.ON_AFTER_RELEASE,
            getPackageName() + ":hey-pam-screen"
        );
        screenWakeLock.setReferenceCounted(false);
        screenWakeLock.acquire(5_000L);
    }

    private void acquireRecognitionWakeLock() {
        if (!HeyHoSolPlugin.MODE_BACKGROUND.equals(currentMode)) {
            return;
        }
        PowerManager.WakeLock held = recognitionWakeLock;
        if (held != null && held.isHeld()) {
            return;
        }
        PowerManager power = (PowerManager)getSystemService(POWER_SERVICE);
        if (power == null) {
            return;
        }
        recognitionWakeLock = power.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            getPackageName() + ":hey-pam-listening"
        );
        recognitionWakeLock.setReferenceCounted(false);
        recognitionWakeLock.acquire();
    }

    private void releaseRecognitionWakeLock() {
        PowerManager.WakeLock held = recognitionWakeLock;
        recognitionWakeLock = null;
        if (held != null && held.isHeld()) {
            held.release();
        }
    }

    private void openSolHolo() {
        if (HeyHoSolPlugin.isActivityVisible()) {
            launchSolHoloActivityDirectly();
            return;
        }
        if (!Settings.canDrawOverlays(this)) {
            saveError("Für das automatische Öffnen fehlt die Android-Einblendfreigabe.");
            updateBackgroundNotification("Weckruf gehört · Einblend-Freigabe nötig");
            return;
        }
        if (!showWakeOverlay()) {
            return;
        }
        mainHandler.postDelayed(
            this::launchSolHoloActivity,
            WAKE_ACTIVITY_PENDING_DELAY_MILLIS
        );
        mainHandler.postDelayed(
            this::launchSolHoloActivityDirectlyIfStillHidden,
            WAKE_ACTIVITY_DIRECT_FALLBACK_DELAY_MILLIS
        );
        mainHandler.postDelayed(this::removeWakeOverlay, 2_000L);
        mainHandler.postDelayed(
            this::confirmWakeActivityVisible,
            WAKE_ACTIVITY_CONFIRM_DELAY_MILLIS
        );
    }

    private void launchSolHoloActivity() {
        Intent launchIntent = createWakeLaunchIntent();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            launchSolHoloActivityDirectly(launchIntent);
            return;
        }

        // Ab Android 14 muss der Absender eines PendingIntent seine
        // Hintergrundstart-Berechtigung ausdrücklich weitergeben. Für Apps,
        // die Android 15 als Ziel verwenden, gilt dasselbe zusätzlich für den
        // Ersteller. Pam hat den Hintergrundmodus und die sichtbare
        // Einblendfreigabe bewusst aktiviert; deshalb werden beide Seiten nur
        // für diesen owner-geprüften Weckruf freigegeben.
        ActivityOptions creatorOptions = ActivityOptions.makeBasic();
        creatorOptions.setPendingIntentCreatorBackgroundActivityStartMode(
            ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
        );
        PendingIntent wakePendingIntent = PendingIntent.getActivity(
            this,
            WAKE_ACTIVITY_REQUEST_CODE,
            launchIntent,
            PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_IMMUTABLE,
            creatorOptions.toBundle()
        );
        ActivityOptions senderOptions = ActivityOptions.makeBasic();
        senderOptions.setPendingIntentBackgroundActivityStartMode(
            ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
        );

        try {
            wakePendingIntent.send(
                this,
                0,
                null,
                null,
                null,
                null,
                senderOptions.toBundle()
            );
        } catch (PendingIntent.CanceledException | RuntimeException error) {
            saveError("Android konnte den freigegebenen Hintergrundstart nicht ausführen.");
            launchSolHoloActivityDirectly(launchIntent);
        }
    }

    private Intent createWakeLaunchIntent() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        launchIntent.putExtra("hey_ho_sol_wake", true);
        return launchIntent;
    }

    private void launchSolHoloActivityDirectlyIfStillHidden() {
        if (!HeyHoSolPlugin.isActivityVisible()) {
            launchSolHoloActivityDirectly();
        }
    }

    private void launchSolHoloActivityDirectly() {
        launchSolHoloActivityDirectly(createWakeLaunchIntent());
    }

    private void launchSolHoloActivityDirectly(Intent launchIntent) {
        try {
            startActivity(launchIntent);
        } catch (RuntimeException error) {
            saveError("Android hat das automatische Öffnen im Hintergrund verhindert.");
        }
    }

    private void confirmWakeActivityVisible() {
        if (HeyHoSolPlugin.isActivityVisible()) {
            saveError("");
            unregisterUnlockReceiver();
            cancelWakeDetectedNotification();
            updateBackgroundNotification("Hey Pam erkannt · Sol ist offen");
            return;
        }

        saveError(
            "Hey Pam wurde erkannt, aber Android hat Pams Holo nicht automatisch geöffnet."
        );
        updateBackgroundNotification("Hey Pam erkannt · hier tippen zum Öffnen");
    }

    private boolean showWakeOverlay() {
        return showWakeOverlay("SH∞  Sol ist da ✦", false);
    }

    private boolean showLockedWakeOverlay() {
        return showWakeOverlay(
            "SH∞  Hey Pam erkannt · bitte entsperren",
            true
        );
    }

    private boolean showWakeOverlay(String message, boolean overLockScreen) {
        removeWakeOverlay();
        TextView overlay = new TextView(this);
        overlay.setText(message);
        overlay.setTextColor(Color.WHITE);
        overlay.setTextSize(17f);
        overlay.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        overlay.setGravity(Gravity.CENTER);
        overlay.setPadding(dp(20), dp(12), dp(20), dp(12));

        GradientDrawable background = new GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            new int[] { Color.rgb(84, 54, 190), Color.rgb(41, 112, 205) }
        );
        background.setCornerRadius(dp(28));
        background.setStroke(dp(1), Color.rgb(150, 209, 255));
        overlay.setBackground(background);
        overlay.setAlpha(0f);
        overlay.setElevation(dp(12));

        int overlayFlags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
            | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
            | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
        if (overLockScreen) {
            overlayFlags |= WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON;
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            overlayFlags,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        params.y = dp(76);
        params.setTitle("Sol-Weckruf");

        try {
            wakeOverlayManager = (WindowManager)getSystemService(WINDOW_SERVICE);
            if (wakeOverlayManager == null) {
                throw new IllegalStateException("WindowManager fehlt");
            }
            wakeOverlayManager.addView(overlay, params);
            wakeOverlayView = overlay;
            overlay.animate().alpha(1f).setDuration(180L).start();
            return true;
        } catch (RuntimeException error) {
            wakeOverlayManager = null;
            wakeOverlayView = null;
            saveError("Android konnte die sichtbare Sol-Einblendung nicht anzeigen.");
            updateBackgroundNotification("Weckruf gehört · Sol über Hinweis öffnen");
            return false;
        }
    }

    private void removeWakeOverlay() {
        View overlay = wakeOverlayView;
        WindowManager manager = wakeOverlayManager;
        wakeOverlayView = null;
        wakeOverlayManager = null;
        if (overlay == null || manager == null) {
            return;
        }
        try {
            manager.removeViewImmediate(overlay);
        } catch (RuntimeException ignored) {
        }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Sol-Weckruf",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Zeigt sichtbar an, wenn Pam’s Holo auf „Hey Pam“ hört.");
        channel.setSound(null, null);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
            NotificationChannel detectedChannel = new NotificationChannel(
                WAKE_DETECTED_CHANNEL_ID,
                "Erkannter Sol-Weckruf",
                NotificationManager.IMPORTANCE_HIGH
            );
            detectedChannel.setDescription(
                "Zeigt die sichere Übergabe nach einem bestätigten Hey Pam an."
            );
            detectedChannel.setSound(null, null);
            manager.createNotificationChannel(detectedChannel);
        }
    }

    private Notification buildWakeDetectedNotification() {
        Intent openIntent = createWakeLaunchIntent();
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this,
            WAKE_ACTIVITY_REQUEST_CODE,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, WAKE_DETECTED_CHANNEL_ID)
            : new Notification.Builder(this).setPriority(Notification.PRIORITY_HIGH);
        builder
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle("Hey Pam erkannt")
            .setContentText("Entsperre dein Handy sicher – Sol wartet bereits.")
            .setContentIntent(openPendingIntent)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PUBLIC);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setTimeoutAfter(LOCKED_WAKE_HANDOFF_TIMEOUT_MILLIS);
        }
        return builder.build();
    }

    private void showWakeDetectedNotification() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(
                WAKE_DETECTED_NOTIFICATION_ID,
                buildWakeDetectedNotification()
            );
        }
    }

    private void cancelWakeDetectedNotification() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.cancel(WAKE_DETECTED_NOTIFICATION_ID);
        }
    }

    private Notification buildNotification(String text) {
        Intent openIntent = createWakeLaunchIntent();
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Intent stopIntent = new Intent(this, HeyHoSolService.class)
            .setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        return builder
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle("Sol-Weckruf ist aktiv")
            .setContentText(text)
            .setContentIntent(openPendingIntent)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .addAction(
                new Notification.Action.Builder(
                    android.R.drawable.ic_menu_view,
                    "Sol öffnen",
                    openPendingIntent
                ).build()
            )
            .addAction(
                new Notification.Action.Builder(
                    android.R.drawable.ic_media_pause,
                    "Ausschalten",
                    stopPendingIntent
                ).build()
            )
            .build();
    }

    private void startBackgroundNotification(String text) {
        Notification notification = buildNotification(text);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            );
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        foregroundNotificationActive = true;
    }

    private void updateBackgroundNotification(String text) {
        if (!foregroundNotificationActive) {
            return;
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification(text));
        }
    }

    private void stopWakeService() {
        pausedForConversation = false;
        pauseRecognition();
        mainHandler.removeCallbacks(lockedWakeTimeoutRunnable);
        unregisterUnlockReceiver();
        removeWakeOverlay();
        cancelWakeDetectedNotification();
        if (foregroundNotificationActive) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            foregroundNotificationActive = false;
        }
        stopSelf();
        HeyHoSolPlugin.publishStatusEvent();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        destroyed = true;
        if (activeService == this) {
            activeService = null;
        }
        running = false;
        listening = false;
        processingAudio = false;
        pausedForConversation = false;
        recognitionGeneration++;
        speakerVerificationPending = false;
        mainHandler.removeCallbacksAndMessages(null);
        cancelSecureAudioSession();
        releaseRecognitionWakeLock();
        unregisterUnlockReceiver();
        removeWakeOverlay();
        cancelWakeDetectedNotification();
        speakerExecutor.shutdownNow();
        HeyHoSolPlugin.publishStatusEvent();
        super.onDestroy();
    }
}
