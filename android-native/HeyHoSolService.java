package com.solholo.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
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
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class HeyHoSolService extends Service implements RecognitionListener {
    public static final String ACTION_START = "com.solholo.app.HEY_HO_SOL_START";
    public static final String ACTION_PAUSE = "com.solholo.app.HEY_HO_SOL_PAUSE";
    public static final String ACTION_RESUME = "com.solholo.app.HEY_HO_SOL_RESUME";
    public static final String ACTION_STOP = "com.solholo.app.HEY_HO_SOL_STOP";
    public static final String MODE_EXTRA = "mode";

    private static final String CHANNEL_ID = "hey_ho_sol_background";
    private static final int NOTIFICATION_ID = 2408;
    private static final int SECURE_SAMPLE_RATE = 16000;
    private static final int SECURE_CAPTURE_MS = 5000;
    private static final int CAPTURE_WATCHDOG_MS = SECURE_CAPTURE_MS + 2000;
    private static final int RECOGNITION_WATCHDOG_MS = 8000;
    private static final int MIN_SECURE_CAPTURE_BYTES =
        SECURE_SAMPLE_RATE * 2 * 500 / 1000;
    private static final String SECURE_WAKE_PHRASE = "Hey Sol";

    private static volatile boolean running;
    private static volatile boolean listening;
    private static volatile boolean processingAudio;
    private static volatile boolean pausedForConversation;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService speakerExecutor =
        Executors.newSingleThreadExecutor();
    private final Runnable restartRunnable = this::startRecognition;
    private final Runnable fallbackResumeRunnable = () -> {
        if (running && !pausedForConversation) {
            startRecognition();
        }
    };
    private final Runnable recognitionWatchdogRunnable =
        this::recoverTimedOutRecognition;

    private SpeechRecognizer speechRecognizer;
    private String currentMode = HeyHoSolPlugin.MODE_OFF;
    private boolean destroyed;
    private boolean wakeHandled;
    private boolean recognitionStarted;
    private boolean speakerVerificationPending;
    private boolean foregroundNotificationActive;
    private long recognitionGeneration;
    private long watchdogGeneration;
    private SecureAudioSession secureAudioSession;
    private final StringBuilder segmentedTranscript = new StringBuilder();
    private WindowManager wakeOverlayManager;
    private View wakeOverlayView;

    private static final class SecureAudioSession {
        private final AudioRecord recorder;
        private final ByteArrayOutputStream captured = new ByteArrayOutputStream(
            SECURE_SAMPLE_RATE * SECURE_CAPTURE_MS / 500
        );
        private final AtomicBoolean active = new AtomicBoolean(false);
        private final AtomicBoolean released = new AtomicBoolean(false);
        private final WakeCaptureEndpointer endpointer =
            new WakeCaptureEndpointer();
        private Thread pumpThread;
        private Thread recognitionWriterThread;
        private ParcelFileDescriptor recognitionSource;
        private ParcelFileDescriptor recognitionSink;

        SecureAudioSession() {
            int minBuffer = AudioRecord.getMinBufferSize(
                SECURE_SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            );
            if (minBuffer <= 0) {
                throw new IllegalStateException("Sicherer Audio-Puffer ist nicht verfügbar");
            }

            recorder = new AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                SECURE_SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                Math.max(minBuffer * 2, SECURE_SAMPLE_RATE)
            );
            if (recorder.getState() != AudioRecord.STATE_INITIALIZED) {
                recorder.release();
                throw new IllegalStateException("Sichere Mikrofonaufnahme konnte nicht starten");
            }
        }

        void start(Runnable captureFinished) {
            recorder.startRecording();
            if (
                recorder.getRecordingState()
                    != AudioRecord.RECORDSTATE_RECORDING
            ) {
                stopAndReleaseRecorder();
                throw new IllegalStateException(
                    "Sichere Mikrofonaufnahme ist nicht aktiv"
                );
            }
            active.set(true);
            pumpThread = new Thread(
                () -> pump(captureFinished),
                "sol-secure-audio"
            );
            pumpThread.start();
        }

        boolean isCapturing() {
            return active.get();
        }

        boolean hasCompleteSpeechCandidate() {
            return endpointer.hasCompleteSpeechCandidate();
        }

        private void pump(Runnable captureFinished) {
            byte[] buffer = new byte[3200];
            long deadline = SystemClock.elapsedRealtime() + SECURE_CAPTURE_MS;

            try {
                while (
                    active.get()
                        && SystemClock.elapsedRealtime() < deadline
                ) {
                    int count = recorder.read(buffer, 0, buffer.length);
                    if (count <= 0) {
                        continue;
                    }
                    synchronized (captured) {
                        captured.write(buffer, 0, count);
                    }
                    if (endpointer.acceptPcm16LittleEndian(buffer, count)) {
                        break;
                    }
                }
            } catch (RuntimeException ignored) {
                // Missing or interrupted audio rejects this recognition cycle.
            } finally {
                active.set(false);
                stopAndReleaseRecorder();
                if (captureFinished != null) {
                    captureFinished.run();
                }
            }
        }

        ParcelFileDescriptor prepareRecognitionSource() throws IOException {
            byte[] pcm;
            synchronized (captured) {
                pcm = captured.toByteArray();
            }
            if (pcm.length < MIN_SECURE_CAPTURE_BYTES) {
                throw new IOException("Sichere Mikrofonaufnahme ist zu kurz");
            }

            ParcelFileDescriptor[] pipe = ParcelFileDescriptor.createPipe();
            recognitionSource = pipe[0];
            recognitionSink = pipe[1];

            ParcelFileDescriptor sink = recognitionSink;
            recognitionWriterThread = new Thread(
                () -> streamRecognitionAudio(sink, pcm),
                "sol-recognition-audio"
            );
            recognitionWriterThread.start();
            return recognitionSource;
        }

        private void streamRecognitionAudio(
            ParcelFileDescriptor sink,
            byte[] pcm
        ) {
            try (
                ParcelFileDescriptor.AutoCloseOutputStream output =
                    new ParcelFileDescriptor.AutoCloseOutputStream(sink)
            ) {
                output.write(pcm);
                output.flush();
            } catch (IOException ignored) {
                // A cancelled recognition closes the pipe and rejects this cycle.
            } finally {
                if (recognitionSink == sink) {
                    recognitionSink = null;
                }
            }
        }

        byte[] finishAndSnapshot() {
            stopWithoutWaiting();
            Thread thread = pumpThread;
            if (thread != null && thread != Thread.currentThread()) {
                try {
                    thread.join(1500L);
                } catch (InterruptedException error) {
                    Thread.currentThread().interrupt();
                }
            }
            closeRecognitionPipe();
            joinRecognitionWriter();
            synchronized (captured) {
                return captured.toByteArray();
            }
        }

        void cancel() {
            stopWithoutWaiting();
            closeRecognitionPipe();
            joinRecognitionWriter();
        }

        private void stopWithoutWaiting() {
            active.set(false);
            try {
                recorder.stop();
            } catch (RuntimeException ignored) {
            }
            if (pumpThread == null) {
                stopAndReleaseRecorder();
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

        private void closeRecognitionPipe() {
            ParcelFileDescriptor source = recognitionSource;
            recognitionSource = null;
            if (source != null) {
                try {
                    source.close();
                } catch (IOException ignored) {
                }
            }

            ParcelFileDescriptor sink = recognitionSink;
            recognitionSink = null;
            if (sink != null) {
                try {
                    sink.close();
                } catch (IOException ignored) {
                }
            }
        }

        private void joinRecognitionWriter() {
            Thread thread = recognitionWriterThread;
            recognitionWriterThread = null;
            if (thread == null || thread == Thread.currentThread()) {
                return;
            }
            try {
                thread.join(1_500L);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
            }
        }
    }

    public static Intent startIntent(Context context, String mode) {
        return new Intent(context, HeyHoSolService.class)
            .setAction(ACTION_START)
            .putExtra(MODE_EXTRA, mode);
    }

    public static void pause(Context context) {
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

        if (
            !hasMicrophonePermission()
                || !onDeviceRecognitionAvailable()
                || !SolSpeakerIdentityPlugin.isProfileReady(this)
        ) {
            saveError(
                !hasMicrophonePermission()
                    ? "Mikrofonfreigabe fehlt."
                    : !onDeviceRecognitionAvailable()
                        ? "Sichere Offline-Spracherkennung ist nicht verfügbar."
                        : "Bitte zuerst Pams Stimmprofil vollständig einrichten."
            );
            saveMode(HeyHoSolPlugin.MODE_OFF);
            stopWakeService();
            return START_NOT_STICKY;
        }

        if (HeyHoSolPlugin.MODE_BACKGROUND.equals(currentMode)) {
            startBackgroundNotification(
                "Sag den vollständigen sicheren Prüfsatz"
            );
        } else if (foregroundNotificationActive) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            foregroundNotificationActive = false;
        }

        if (ACTION_PAUSE.equals(action)) {
            pausedForConversation = true;
            pauseRecognition();
            updateBackgroundNotification("Pausiert, solange Sol mit dir spricht");
            HeyHoSolPlugin.publishStatusEvent();
            return serviceRestartMode();
        }

        pausedForConversation = false;
        startRecognition();
        return serviceRestartMode();
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

    private boolean onDeviceRecognitionAvailable() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && SpeechRecognizer.isOnDeviceRecognitionAvailable(this);
    }

    private void startRecognition() {
        mainHandler.removeCallbacks(restartRunnable);
        mainHandler.removeCallbacks(fallbackResumeRunnable);

        if (
            destroyed
                || pausedForConversation
                || recognitionStarted
                || speakerVerificationPending
                || !onDeviceRecognitionAvailable()
                || !SolSpeakerIdentityPlugin.isProfileReady(this)
        ) {
            return;
        }

        SecureAudioSession session;
        try {
            session = new SecureAudioSession();
        } catch (RuntimeException error) {
            saveError("Die sichere Audio-Prüfung konnte nicht vorbereitet werden.");
            scheduleRestart(2_000L);
            return;
        }

        wakeHandled = false;
        segmentedTranscript.setLength(0);
        recognitionGeneration++;
        long generation = recognitionGeneration;
        secureAudioSession = session;
        recognitionStarted = true;
        listening = false;
        processingAudio = false;
        HeyHoSolPlugin.publishStatusEvent();
        updateBackgroundNotification("Mikrofon startet …");

        watchdogGeneration = recognitionGeneration;
        mainHandler.postDelayed(
            recognitionWatchdogRunnable,
            CAPTURE_WATCHDOG_MS
        );
        try {
            session.start(
                () -> mainHandler.post(
                    () -> onSecureCaptureFinished(session, generation)
                )
            );
            listening = true;
            saveError("");
            HeyHoSolPlugin.publishStatusEvent();
            updateBackgroundNotification(
                "Sag: „" + SECURE_WAKE_PHRASE + "“"
            );
        } catch (RuntimeException error) {
            mainHandler.removeCallbacks(recognitionWatchdogRunnable);
            if (secureAudioSession == session) {
                secureAudioSession = null;
            }
            session.cancel();
            recognitionStarted = false;
            listening = false;
            processingAudio = false;
            saveError("Der sichere Offline-Sprachdienst konnte nicht gestartet werden.");
            scheduleRestart(1_500L);
        }
    }

    private void onSecureCaptureFinished(
        SecureAudioSession session,
        long generation
    ) {
        if (
            destroyed
                || generation != recognitionGeneration
                || secureAudioSession != session
                || !recognitionStarted
                || speakerVerificationPending
                || wakeHandled
        ) {
            return;
        }

        listening = false;
        processingAudio = true;
        HeyHoSolPlugin.publishStatusEvent();
        updateBackgroundNotification("„Hey Sol“ wird lokal geprüft …");

        if (!session.hasCompleteSpeechCandidate()) {
            discardAudioAndRestart(generation, 80L);
            return;
        }

        mainHandler.removeCallbacks(recognitionWatchdogRunnable);
        watchdogGeneration = recognitionGeneration;
        mainHandler.postDelayed(
            recognitionWatchdogRunnable,
            RECOGNITION_WATCHDOG_MS
        );

        try {
            ParcelFileDescriptor audioSource =
                session.prepareRecognitionSource();
            if (speechRecognizer == null) {
                speechRecognizer =
                    SpeechRecognizer.createOnDeviceSpeechRecognizer(this);
                speechRecognizer.setRecognitionListener(this);
            }
            speechRecognizer.startListening(
                buildRecognitionIntent(audioSource)
            );
        } catch (IOException | RuntimeException error) {
            saveError(
                "Die sichere Aufnahme konnte nicht lokal ausgewertet werden."
            );
            resetSpeechRecognizer();
            discardAudioAndRestart(generation, 1_000L);
        }
    }

    private Intent buildRecognitionIntent(
        ParcelFileDescriptor audioSource
    ) {
        Intent recognizerIntent = new Intent(
            RecognizerIntent.ACTION_RECOGNIZE_SPEECH
        );
        recognizerIntent.putExtra(
            RecognizerIntent.EXTRA_LANGUAGE_MODEL,
            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
        );
        recognizerIntent.putExtra(
            RecognizerIntent.EXTRA_PARTIAL_RESULTS,
            false
        );
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "de-DE");

        ArrayList<String> biasingPhrases = new ArrayList<>();
        biasingPhrases.add(SECURE_WAKE_PHRASE);
        biasingPhrases.add("Hey Soul");
        biasingPhrases.add("Hey Soll");
        recognizerIntent.putStringArrayListExtra(
            RecognizerIntent.EXTRA_BIASING_STRINGS,
            biasingPhrases
        );
        recognizerIntent.putExtra(
            RecognizerIntent.EXTRA_AUDIO_SOURCE,
            audioSource
        );
        recognizerIntent.putExtra(
            RecognizerIntent.EXTRA_AUDIO_SOURCE_CHANNEL_COUNT,
            1
        );
        recognizerIntent.putExtra(
            RecognizerIntent.EXTRA_AUDIO_SOURCE_ENCODING,
            AudioFormat.ENCODING_PCM_16BIT
        );
        recognizerIntent.putExtra(
            RecognizerIntent.EXTRA_AUDIO_SOURCE_SAMPLING_RATE,
            SECURE_SAMPLE_RATE
        );
        recognizerIntent.putExtra(
            RecognizerIntent.EXTRA_SEGMENTED_SESSION,
            RecognizerIntent.EXTRA_AUDIO_SOURCE
        );
        return recognizerIntent;
    }

    private void scheduleRestart(long delayMillis) {
        mainHandler.removeCallbacks(recognitionWatchdogRunnable);
        recognitionStarted = false;
        listening = false;
        processingAudio = false;
        HeyHoSolPlugin.publishStatusEvent();

        if (!destroyed && !pausedForConversation) {
            mainHandler.removeCallbacks(restartRunnable);
            mainHandler.postDelayed(restartRunnable, delayMillis);
        }
    }

    private void pauseRecognition() {
        mainHandler.removeCallbacks(restartRunnable);
        mainHandler.removeCallbacks(fallbackResumeRunnable);
        mainHandler.removeCallbacks(recognitionWatchdogRunnable);
        recognitionGeneration++;
        recognitionStarted = false;
        listening = false;
        processingAudio = false;
        speakerVerificationPending = false;
        cancelSecureAudioSession();

        if (speechRecognizer != null) {
            try {
                speechRecognizer.cancel();
            } catch (RuntimeException ignored) {
            }
        }
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

    private boolean handleRecognitionResults(Bundle results) {
        if (wakeHandled || results == null) {
            return false;
        }

        ArrayList<String> phrases = results.getStringArrayList(
            SpeechRecognizer.RESULTS_RECOGNITION
        );
        if (phrases == null) {
            return false;
        }

        for (String phrase : phrases) {
            String canonicalPhrase = matchingWakePhrase(phrase);
            if (
                canonicalPhrase.isEmpty()
                    && segmentedTranscript.length() > 0
            ) {
                canonicalPhrase = matchingWakePhrase(
                    segmentedTranscript + " " + phrase
                );
            }
            if (!canonicalPhrase.isEmpty()) {
                wakeHandled = true;
                verifySpeakerBeforeWake(
                    canonicalPhrase,
                    recognitionGeneration
                );
                return true;
            }
        }
        return false;
    }

    private boolean handleSegmentedRecognitionResults() {
        if (wakeHandled || segmentedTranscript.length() == 0) {
            return false;
        }
        String canonicalPhrase = matchingWakePhrase(
            segmentedTranscript.toString()
        );
        if (canonicalPhrase.isEmpty()) {
            return false;
        }
        wakeHandled = true;
        verifySpeakerBeforeWake(canonicalPhrase, recognitionGeneration);
        return true;
    }

    private String matchingWakePhrase(String rawPhrase) {
        return WakePhraseMatcher.canonicalPhrase(rawPhrase);
    }

    private void verifySpeakerBeforeWake(String phrase, long generation) {
        mainHandler.removeCallbacks(recognitionWatchdogRunnable);
        SecureAudioSession session = detachSecureAudioSession();
        recognitionStarted = false;
        listening = false;
        processingAudio = false;
        speakerVerificationPending = true;
        HeyHoSolPlugin.publishStatusEvent();
        HeyHoSolPlugin.publishWakeDiagnostic("phrase_heard");
        updateBackgroundNotification("Hey Sol erkannt · Stimme wird abgeglichen");

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
                byte[] pcm = session.finishAndSnapshot();
                if (pcm.length < MIN_SECURE_CAPTURE_BYTES) {
                    throw new IllegalStateException(
                        "Die sichere Audioquelle wurde nicht vollständig verarbeitet"
                    );
                }
                short[] samples = pcm16LittleEndian(pcm);
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
                accepted = false;
                if (
                    error.getMessage() != null
                        && !error.getMessage().trim().isEmpty()
                ) {
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
                updateBackgroundNotification(
                    "Keine Freigabe · sicherer Weckruf wartet weiter"
                );
                scheduleRestart(650L);
            });
        });
    }

    private void discardAudioAndRestart(long generation, long delayMillis) {
        mainHandler.removeCallbacks(recognitionWatchdogRunnable);
        SecureAudioSession session = detachSecureAudioSession();
        recognitionStarted = false;
        listening = false;
        processingAudio = false;
        speakerVerificationPending = true;
        HeyHoSolPlugin.publishStatusEvent();

        speakerExecutor.execute(() -> {
            if (session != null) {
                session.finishAndSnapshot();
            }
            mainHandler.post(() -> {
                if (destroyed || generation != recognitionGeneration) {
                    return;
                }
                speakerVerificationPending = false;
                wakeHandled = false;
                scheduleRestart(delayMillis);
            });
        });
    }

    private void recoverTimedOutRecognition() {
        long generation = watchdogGeneration;
        if (
            destroyed
                || pausedForConversation
                || speakerVerificationPending
                || wakeHandled
                || !recognitionStarted
                || generation != recognitionGeneration
        ) {
            return;
        }

        speakerVerificationPending = true;
        listening = false;
        processingAudio = false;
        HeyHoSolPlugin.publishStatusEvent();
        resetSpeechRecognizer();
        discardAudioAndRestart(generation, 250L);
    }

    private void resetSpeechRecognizer() {
        SpeechRecognizer recognizer = speechRecognizer;
        speechRecognizer = null;
        if (recognizer == null) {
            return;
        }
        try {
            recognizer.destroy();
        } catch (RuntimeException ignored) {
        }
    }

    private static short[] pcm16LittleEndian(byte[] pcm) {
        if (pcm == null || pcm.length < 2) {
            throw new IllegalStateException("Keine sichere Stimmaufnahme vorhanden");
        }
        int byteCount = pcm.length - (pcm.length % 2);
        ByteBuffer buffer = ByteBuffer
            .wrap(pcm, 0, byteCount)
            .order(ByteOrder.LITTLE_ENDIAN);
        short[] samples = new short[byteCount / 2];
        for (int index = 0; index < samples.length; index++) {
            samples[index] = buffer.getShort();
        }
        return samples;
    }

    private void handleWakePhrase(String phrase) {
        pauseRecognition();
        pausedForConversation = false;
        HeyHoSolPlugin.publishWakeEvent(this, phrase);
        updateBackgroundNotification("Weckruf erkannt · Sol öffnet sich");
        openSolHolo();

        mainHandler.postDelayed(fallbackResumeRunnable, 12_000L);
        HeyHoSolPlugin.publishStatusEvent();
    }

    private void openSolHolo() {
        if (HeyHoSolPlugin.isActivityVisible()) {
            launchSolHoloActivity();
            return;
        }

        if (!Settings.canDrawOverlays(this)) {
            saveError(
                "Für das automatische Öffnen fehlt die Android-Einblendfreigabe."
            );
            updateBackgroundNotification(
                "Weckruf gehört · Einblend-Freigabe nötig"
            );
            return;
        }

        if (!showWakeOverlay()) {
            return;
        }

        mainHandler.postDelayed(this::launchSolHoloActivity, 320L);
        mainHandler.postDelayed(this::removeWakeOverlay, 2_000L);
    }

    private void launchSolHoloActivity() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        launchIntent.putExtra("hey_ho_sol_wake", true);

        try {
            startActivity(launchIntent);
        } catch (RuntimeException error) {
            saveError(
                "Android hat das automatische Öffnen im Hintergrund verhindert."
            );
        }
    }

    private boolean showWakeOverlay() {
        removeWakeOverlay();

        TextView overlay = new TextView(this);
        overlay.setText("SH∞  Sol ist da ✦");
        overlay.setTextColor(Color.WHITE);
        overlay.setTextSize(17f);
        overlay.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        overlay.setGravity(Gravity.CENTER);
        overlay.setPadding(dp(20), dp(12), dp(20), dp(12));

        GradientDrawable background = new GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            new int[] {
                Color.rgb(84, 54, 190),
                Color.rgb(41, 112, 205)
            }
        );
        background.setCornerRadius(dp(28));
        background.setStroke(dp(1), Color.rgb(150, 209, 255));
        overlay.setBackground(background);
        overlay.setAlpha(0f);
        overlay.setElevation(dp(12));

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        params.y = dp(76);
        params.setTitle("Sol-Weckruf");

        try {
            wakeOverlayManager = (WindowManager) getSystemService(WINDOW_SERVICE);
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
            saveError(
                "Android konnte die sichtbare Sol-Einblendung nicht anzeigen."
            );
            updateBackgroundNotification(
                "Weckruf gehört · Sol über Hinweis öffnen"
            );
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
        return Math.round(
            value * getResources().getDisplayMetrics().density
        );
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
        channel.setDescription(
            "Zeigt sichtbar an, wenn Sol im Hintergrund auf den Weckruf hört."
        );
        channel.setSound(null, null);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(String text) {
        Intent openIntent = new Intent(this, MainActivity.class);
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
        removeWakeOverlay();
        if (foregroundNotificationActive) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            foregroundNotificationActive = false;
        }
        stopSelf();
        HeyHoSolPlugin.publishStatusEvent();
    }

    @Override
    public void onReadyForSpeech(Bundle params) {
        SecureAudioSession session = secureAudioSession;
        if (
            !recognitionStarted
                || processingAudio
                || session == null
                || !session.isCapturing()
        ) {
            return;
        }
        listening = true;
        HeyHoSolPlugin.publishStatusEvent();
        updateBackgroundNotification(
            "Sag: „" + SECURE_WAKE_PHRASE + "“"
        );
    }

    @Override
    public void onBeginningOfSpeech() {
    }

    @Override
    public void onRmsChanged(float rmsdB) {
    }

    @Override
    public void onBufferReceived(byte[] buffer) {
    }

    @Override
    public void onEndOfSpeech() {
        SecureAudioSession session = secureAudioSession;
        if (session == null || !session.isCapturing()) {
            listening = false;
            processingAudio = recognitionStarted;
            HeyHoSolPlugin.publishStatusEvent();
        }
    }

    @Override
    public void onError(int error) {
        mainHandler.removeCallbacks(recognitionWatchdogRunnable);
        if (
            destroyed
                || pausedForConversation
                || wakeHandled
                || speakerVerificationPending
        ) {
            return;
        }

        long delay = error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY
            ? 1_500L
            : 450L;

        if (error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) {
            resetSpeechRecognizer();
        }

        if (
            error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED
                || error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE
        ) {
            saveError(
                "Das deutsche Offline-Sprachpaket fehlt."
            );
            delay = 4_000L;
        } else if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
            saveError("Mikrofonfreigabe fehlt.");
            stopWakeService();
            return;
        }

        discardAudioAndRestart(recognitionGeneration, delay);
    }

    @Override
    public void onResults(Bundle results) {
        mainHandler.removeCallbacks(recognitionWatchdogRunnable);
        recognitionStarted = false;
        listening = false;
        processingAudio = false;
        if (speakerVerificationPending || wakeHandled) {
            return;
        }
        long generation = recognitionGeneration;
        if (segmentedTranscript.length() > 0) {
            if (
                !handleSegmentedRecognitionResults()
                    && !handleRecognitionResults(results)
            ) {
                discardAudioAndRestart(generation, 120L);
            }
            return;
        }
        if (!handleRecognitionResults(results)) {
            discardAudioAndRestart(generation, 120L);
        }
    }

    @Override
    public void onPartialResults(Bundle partialResults) {
        // Partial text never authorizes a wake. Only the complete wake phrase,
        // final recognition result and both speaker models can open Sol.
    }

    @Override
    public void onSegmentResults(Bundle segmentResults) {
        if (
            destroyed
                || speakerVerificationPending
                || wakeHandled
                || segmentResults == null
        ) {
            return;
        }
        ArrayList<String> phrases = segmentResults.getStringArrayList(
            SpeechRecognizer.RESULTS_RECOGNITION
        );
        if (phrases == null || phrases.isEmpty()) {
            return;
        }
        String phrase = String.valueOf(phrases.get(0)).trim();
        if (!phrase.isEmpty()) {
            if (segmentedTranscript.length() > 0) {
                segmentedTranscript.append(' ');
            }
            segmentedTranscript.append(phrase);

            String canonicalPhrase = matchingWakePhrase(
                segmentedTranscript.toString()
            );
            if (!canonicalPhrase.isEmpty()) {
                wakeHandled = true;
                verifySpeakerBeforeWake(
                    canonicalPhrase,
                    recognitionGeneration
                );
            }
        }
    }

    @Override
    public void onEndOfSegmentedSession() {
        mainHandler.removeCallbacks(recognitionWatchdogRunnable);
        recognitionStarted = false;
        listening = false;
        processingAudio = false;
        if (speakerVerificationPending || wakeHandled) {
            return;
        }
        long generation = recognitionGeneration;
        if (!handleSegmentedRecognitionResults()) {
            discardAudioAndRestart(generation, 120L);
        }
    }

    @Override
    public void onEvent(int eventType, Bundle params) {
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        destroyed = true;
        running = false;
        listening = false;
        processingAudio = false;
        pausedForConversation = false;
        recognitionGeneration++;
        speakerVerificationPending = false;
        mainHandler.removeCallbacksAndMessages(null);
        cancelSecureAudioSession();
        removeWakeOverlay();

        if (speechRecognizer != null) {
            try {
                speechRecognizer.destroy();
            } catch (RuntimeException ignored) {
            }
            speechRecognizer = null;
        }

        speakerExecutor.shutdownNow();

        HeyHoSolPlugin.publishStatusEvent();
        super.onDestroy();
    }
}
