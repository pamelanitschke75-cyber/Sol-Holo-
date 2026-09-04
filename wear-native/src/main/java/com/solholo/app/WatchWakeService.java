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
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.AudioRecordingConfiguration;
import android.media.MediaRecorder;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

public final class WatchWakeService extends Service {
    static final String ACTION_START = "com.solholo.app.WATCH_WAKE_START";
    static final String ACTION_STOP = "com.solholo.app.WATCH_WAKE_STOP";
    static final String PREFERENCES_NAME = "sol_holo_watch_wake";
    static final String PREF_DESIRED = "listening_requested";
    static final String PREF_STATUS = "status_text";
    static final String PREF_STATE = "status_state";
    static final String PREF_PENDING_SESSION = "pending_session";
    static final String CHANNEL_ID = "pam_watch_wake";
    static final int NOTIFICATION_ID = 2840;

    private static final String WAKE_PATH_PREFIX = "/solholo/watch/wake/";
    private static final int SAMPLE_RATE = SolWakeKeywordSpotter.SAMPLE_RATE;
    private static final int CAPTURE_WINDOW_SAMPLES = SAMPLE_RATE * 2_400 / 1_000;
    private static final int POSTROLL_SAMPLES = SAMPLE_RATE * 350 / 1_000;
    private static final int RING_SECONDS = 5;
    private static final long HEALTH_INTERVAL_MILLIS = 4_000L;
    private static final long REPLY_TIMEOUT_MILLIS = 15_000L;

    private static volatile WatchWakeService activeService;
    private static volatile boolean running;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private SecureAudioSession audioSession;
    private PowerManager.WakeLock wakeLock;
    private boolean destroyed;
    private long recognitionGeneration;
    private long observedSamples;
    private long observedNonZeroSamples;

    private final Runnable restartRunnable = this::restartWhenReady;
    private final Runnable healthRunnable = this::verifyRecognitionHealth;

    @Override
    public void onCreate() {
        super.onCreate();
        activeService = this;
        running = true;
        ensureNotificationChannel(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            rememberListeningRequested(this, false);
            publishStatus(this, "off", "Watch-Hintergrund ist aus.");
            stopListening();
            return START_NOT_STICKY;
        }
        boolean microphoneMissing = checkSelfPermission(Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED;
        boolean notificationsMissing = android.os.Build.VERSION.SDK_INT
            >= android.os.Build.VERSION_CODES.TIRAMISU
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED;
        if (microphoneMissing || notificationsMissing) {
            rememberListeningRequested(this, false);
            publishStatus(
                this,
                "blocked",
                microphoneMissing
                    ? "Mikrofon ist noch nicht freigegeben."
                    : "Benachrichtigungen sind noch nicht freigegeben."
            );
            stopSelf();
            return START_NOT_STICKY;
        }

        rememberListeningRequested(this, true);
        WatchRestartReceiver.cancelReminder(this);
        startMicrophoneForeground(
            readStatus(this).trim().isEmpty()
                ? "Watch-Mikrofon startet …"
                : readStatus(this)
        );
        acquireWakeLock();
        startRecognition();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        destroyed = true;
        running = false;
        mainHandler.removeCallbacksAndMessages(null);
        cancelAudioSession();
        releaseWakeLock();
        if (activeService == this) {
            activeService = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    static boolean isRunning() {
        return running;
    }

    static boolean wasListeningRequested(Context context) {
        return context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getBoolean(PREF_DESIRED, false);
    }

    static void rememberListeningRequested(Context context, boolean requested) {
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(PREF_DESIRED, requested)
            .apply();
    }

    static String readStatus(Context context) {
        return context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getString(PREF_STATUS, "");
    }

    static void publishStatus(Context context, String state, String message) {
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_STATE, state == null ? "" : state)
            .putString(PREF_STATUS, message == null ? "" : message)
            .apply();
        WatchWakeService service = activeService;
        if (service != null) {
            service.mainHandler.post(
                () -> service.updateForegroundNotification(message)
            );
        }
    }

    static void receivePhoneStatus(
        Context context,
        String sessionId,
        String state,
        String message
    ) {
        String pending = context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getString(PREF_PENDING_SESSION, "");
        if (!sessionId.equals(pending)) {
            return;
        }
        android.content.SharedPreferences.Editor editor = context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_STATE, state)
            .putString(PREF_STATUS, message);
        if (!"checking".equals(state)) {
            editor.putString(PREF_PENDING_SESSION, "");
        }
        editor.apply();
        WatchWakeService service = activeService;
        if (service != null) {
            service.mainHandler.post(
                () -> service.updateForegroundNotification(message)
            );
        }
    }

    static void ensureNotificationChannel(Context context) {
        NotificationManager manager = context.getSystemService(
            NotificationManager.class
        );
        if (manager == null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Pam hört auf der Watch",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription(
            "Zeigt sichtbar an, wenn die Galaxy Watch auf „Hey Pam“ hört."
        );
        channel.setSound(null, null);
        manager.createNotificationChannel(channel);
    }

    private void startRecognition() {
        mainHandler.removeCallbacks(restartRunnable);
        mainHandler.removeCallbacks(healthRunnable);
        if (destroyed || audioSession != null) {
            return;
        }
        recognitionGeneration++;
        long generation = recognitionGeneration;
        observedSamples = 0L;
        observedNonZeroSamples = 0L;
        try {
            SecureAudioSession session = new SecureAudioSession(this);
            audioSession = session;
            session.start(new SecureAudioListener() {
                @Override
                public void onKeyword(
                    SecureAudioSession completed,
                    SolWakeKeywordSpotter.Detection detection
                ) {
                    mainHandler.post(
                        () -> onKeywordDetected(completed, detection, generation)
                    );
                }

                @Override
                public void onFailure(SecureAudioSession failed, String reason) {
                    mainHandler.post(
                        () -> onRecognitionFailure(failed, reason, generation)
                    );
                }
            });
            if (pendingSession().isEmpty()) {
                publishStatus(
                    this,
                    "listening",
                    "Watch hört auf „Hey Pam“ ✅"
                );
            } else {
                updateForegroundNotification(
                    "Watch hört weiter · Stimmprüfung am Handy läuft …"
                );
            }
            mainHandler.postDelayed(healthRunnable, HEALTH_INTERVAL_MILLIS);
        } catch (IOException | RuntimeException error) {
            cancelAudioSession();
            publishStatus(
                this,
                "recovering",
                "Watch-Mikrofon verbindet sich neu …"
            );
            mainHandler.postDelayed(restartRunnable, 1_200L);
        }
    }

    private void restartWhenReady() {
        if (destroyed) {
            return;
        }
        if (!pendingSession().isEmpty()) {
            mainHandler.postDelayed(restartRunnable, 1_000L);
            return;
        }
        startRecognition();
    }

    private void onKeywordDetected(
        SecureAudioSession completed,
        SolWakeKeywordSpotter.Detection detection,
        long generation
    ) {
        if (
            destroyed
                || generation != recognitionGeneration
                || completed != audioSession
        ) {
            completed.cancel();
            return;
        }
        audioSession = null;
        mainHandler.removeCallbacks(healthRunnable);
        short[] samples = completed.finishAndSnapshot();
        publishStatus(
            this,
            "checking",
            "Hey Pam gehört · Stimme wird am Handy geprüft …"
        );
        sendCandidate(samples, detection.phrase);
        mainHandler.postDelayed(restartRunnable, 2_500L);
    }

    private void onRecognitionFailure(
        SecureAudioSession failed,
        String reason,
        long generation
    ) {
        if (
            destroyed
                || generation != recognitionGeneration
                || failed != audioSession
        ) {
            return;
        }
        audioSession = null;
        mainHandler.removeCallbacks(healthRunnable);
        publishStatus(
            this,
            "recovering",
            "Watch-Mikrofon verbindet sich automatisch neu …"
        );
        mainHandler.postDelayed(restartRunnable, 900L);
    }

    private void verifyRecognitionHealth() {
        SecureAudioSession session = audioSession;
        if (destroyed || session == null) {
            return;
        }
        long samples = session.totalCapturedSamples();
        long nonZeroSamples = session.totalNonZeroSamples();
        if (
            session.isClientSilenced()
                || samples <= observedSamples
                || nonZeroSamples <= observedNonZeroSamples
        ) {
            publishStatus(
                this,
                "recovering",
                "Watch-Mikrofon wird automatisch neu verbunden …"
            );
            cancelAudioSession();
            mainHandler.postDelayed(restartRunnable, 500L);
            return;
        }
        observedSamples = samples;
        observedNonZeroSamples = nonZeroSamples;
        mainHandler.postDelayed(healthRunnable, HEALTH_INTERVAL_MILLIS);
    }

    private void sendCandidate(short[] samples, String phrase) {
        if (
            samples == null
                || samples.length < WearWakePayloadPolicy.MIN_SAMPLE_COUNT
                || samples.length > WearWakePayloadPolicy.MAX_SAMPLE_COUNT
        ) {
            publishStatus(
                this,
                "rejected",
                "Der Weckruf war zu kurz oder zu leise."
            );
            return;
        }

        byte[] pcm = encodePcm(samples);
        String sessionId = UUID.randomUUID().toString();
        long createdAt = System.currentTimeMillis();
        getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_PENDING_SESSION, sessionId)
            .putString(PREF_STATE, "checking")
            .putString(PREF_STATUS, "Gekoppeltes S23 wird gesucht …")
            .apply();
        updateForegroundNotification("Gekoppeltes S23 wird gesucht …");

        try {
            Wearable.getNodeClient(this).getConnectedNodes()
                .addOnSuccessListener(nodes -> {
                    if (!sessionId.equals(pendingSession())) {
                        return;
                    }
                    if (!hasNearbyNode(nodes)) {
                        failPendingSession(
                            sessionId,
                            "Das gekoppelte S23 ist gerade nicht in der Nähe."
                        );
                        return;
                    }
                    putCandidate(sessionId, createdAt, phrase, samples.length, pcm);
                })
                .addOnFailureListener(error -> failPendingSession(
                    sessionId,
                    "Die Verbindung zum S23 konnte nicht geprüft werden."
                ));
        } catch (RuntimeException error) {
            failPendingSession(
                sessionId,
                "Die Watch-Verbindung ist gerade nicht verfügbar."
            );
        }

        mainHandler.postDelayed(
            () -> {
                if (sessionId.equals(pendingSession())) {
                    failPendingSession(
                        sessionId,
                        "Das S23 hat noch nicht geantwortet."
                    );
                }
            },
            REPLY_TIMEOUT_MILLIS
        );
    }

    private void putCandidate(
        String sessionId,
        long createdAt,
        String phrase,
        int sampleCount,
        byte[] pcm
    ) {
        PutDataMapRequest mapRequest = PutDataMapRequest.create(
            WAKE_PATH_PREFIX + sessionId
        );
        DataMap map = mapRequest.getDataMap();
        map.putString("ownerId", WearWakePayloadPolicy.OWNER_ID);
        map.putString("phrase", phrase);
        map.putString("sessionId", sessionId);
        map.putInt("sampleRate", SAMPLE_RATE);
        map.putInt("sampleCount", sampleCount);
        map.putLong("createdAtMillis", createdAt);
        map.putByteArray("pcm16le", pcm);
        PutDataRequest request = mapRequest.asPutDataRequest();
        request.setUrgent();
        Wearable.getDataClient(this).putDataItem(request)
            .addOnSuccessListener(item -> {
                android.net.Uri candidateUri = item.getUri();
                mainHandler.postDelayed(
                    () -> Wearable.getDataClient(getApplicationContext())
                        .deleteDataItems(candidateUri),
                    WearWakePayloadPolicy.MAX_AGE_MILLIS
                );
                if (sessionId.equals(pendingSession())) {
                    publishStatus(
                        this,
                        "checking",
                        "Deine Stimme wird sicher am S23 geprüft …"
                    );
                }
            })
            .addOnFailureListener(error -> failPendingSession(
                sessionId,
                "Der Weckruf konnte das S23 nicht erreichen."
            ));
    }

    private boolean hasNearbyNode(List<Node> nodes) {
        if (nodes == null) {
            return false;
        }
        for (Node node : nodes) {
            if (node != null && node.isNearby()) {
                return true;
            }
        }
        return false;
    }

    private void failPendingSession(String sessionId, String message) {
        if (!sessionId.equals(pendingSession())) {
            return;
        }
        getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_PENDING_SESSION, "")
            .apply();
        publishStatus(this, "unavailable", message);
    }

    private String pendingSession() {
        return getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getString(PREF_PENDING_SESSION, "");
    }

    private byte[] encodePcm(short[] samples) {
        ByteBuffer buffer = ByteBuffer.allocate(samples.length * 2)
            .order(ByteOrder.LITTLE_ENDIAN);
        for (short sample : samples) {
            buffer.putShort(sample);
        }
        return buffer.array();
    }

    private void cancelAudioSession() {
        mainHandler.removeCallbacks(healthRunnable);
        SecureAudioSession session = audioSession;
        audioSession = null;
        recognitionGeneration++;
        if (session != null) {
            session.cancel();
        }
    }

    private void stopListening() {
        cancelAudioSession();
        releaseWakeLock();
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            return;
        }
        PowerManager manager = getSystemService(PowerManager.class);
        if (manager == null) {
            return;
        }
        wakeLock = manager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            getPackageName() + ":pam-watch-listening"
        );
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire();
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        wakeLock = null;
    }

    private void startMicrophoneForeground(String text) {
        Notification notification = buildNotification(text);
        startForeground(
            NOTIFICATION_ID,
            notification,
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
        );
    }

    private void updateForegroundNotification(String text) {
        if (!running) {
            return;
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification(text));
        }
    }

    private Notification buildNotification(String text) {
        Intent openIntent = new Intent(this, WatchMainActivity.class);
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Intent stopIntent = new Intent(this, WatchWakeService.class)
            .setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        return new Notification.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_pam_mic)
            .setContentTitle("Pam hört auf der Watch")
            .setContentText(text == null ? "" : text)
            .setContentIntent(openPendingIntent)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .addAction(
                new Notification.Action.Builder(
                    android.R.drawable.ic_media_pause,
                    "Aus",
                    stopPendingIntent
                ).build()
            )
            .build();
    }

    private interface SecureAudioListener {
        void onKeyword(
            SecureAudioSession session,
            SolWakeKeywordSpotter.Detection detection
        );

        void onFailure(SecureAudioSession session, String reason);
    }

    private static final class SecureAudioSession {
        private final AudioRecord recorder;
        private final int audioSessionId;
        private final SolWakeKeywordSpotter keywordSpotter;
        private final PcmRingBuffer captured = new PcmRingBuffer(
            SAMPLE_RATE * RING_SECONDS
        );
        private final AtomicBoolean active = new AtomicBoolean(false);
        private final AtomicBoolean released = new AtomicBoolean(false);
        private final AtomicBoolean cancelled = new AtomicBoolean(false);
        private final AtomicBoolean clientSilenced = new AtomicBoolean(false);
        private final AtomicLong nonZeroSamples = new AtomicLong(0L);
        private AudioManager.AudioRecordingCallback recordingCallback;
        private Thread pumpThread;

        SecureAudioSession(Context context) throws IOException {
            keywordSpotter = new SolWakeKeywordSpotter(context);
            int minimumBuffer = AudioRecord.getMinBufferSize(
                SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            );
            if (minimumBuffer <= 0) {
                keywordSpotter.close();
                throw new IllegalStateException("Watch-Audiopuffer fehlt");
            }
            AudioFormat format = new AudioFormat.Builder()
                .setSampleRate(SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .build();
            AudioRecord.Builder builder = new AudioRecord.Builder()
                .setAudioSource(MediaRecorder.AudioSource.MIC)
                .setAudioFormat(format)
                .setBufferSizeInBytes(Math.max(minimumBuffer * 2, SAMPLE_RATE));
            builder.setPrivacySensitive(true);
            recorder = builder.build();
            if (recorder.getState() != AudioRecord.STATE_INITIALIZED) {
                recorder.release();
                keywordSpotter.close();
                throw new IllegalStateException("Watch-Mikrofon konnte nicht starten");
            }
            audioSessionId = recorder.getAudioSessionId();
            registerSilenceCallback(context);
        }

        void start(SecureAudioListener listener) {
            recorder.startRecording();
            if (recorder.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING) {
                stopAndRelease();
                keywordSpotter.close();
                throw new IllegalStateException("Watch-Mikrofon ist nicht aktiv");
            }
            active.set(true);
            pumpThread = new Thread(() -> pump(listener), "pam-watch-kws");
            pumpThread.start();
        }

        private void pump(SecureAudioListener listener) {
            try {
                android.os.Process.setThreadPriority(
                    android.os.Process.THREAD_PRIORITY_AUDIO
                );
            } catch (RuntimeException ignored) {
            }
            short[] buffer = new short[1_600];
            SolWakeKeywordSpotter.Detection detection = null;
            long postrollEnd = Long.MAX_VALUE;
            String failure = "Watch-Mikrofon wurde unterbrochen";
            try {
                while (active.get()) {
                    int count = recorder.read(buffer, 0, buffer.length);
                    if (count == AudioRecord.ERROR_DEAD_OBJECT || count < 0) {
                        throw new IllegalStateException("Watch-Mikrofon wurde unterbrochen");
                    }
                    if (count == 0) {
                        continue;
                    }
                    long audible = 0L;
                    for (int index = 0; index < count; index++) {
                        if (buffer[index] != 0) {
                            audible++;
                        }
                    }
                    nonZeroSamples.addAndGet(audible);
                    captured.append(buffer, count);
                    if (detection == null) {
                        detection = keywordSpotter.accept(buffer, count);
                        if (detection != null) {
                            postrollEnd = captured.totalWritten() + POSTROLL_SAMPLES;
                        }
                    } else if (captured.totalWritten() >= postrollEnd) {
                        active.set(false);
                    }
                }
            } catch (RuntimeException error) {
                if (error.getMessage() != null && !error.getMessage().trim().isEmpty()) {
                    failure = error.getMessage();
                }
            } finally {
                active.set(false);
                stopAndRelease();
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
            stopAndRelease();
            joinPump();
            return captured.snapshotLatest(CAPTURE_WINDOW_SAMPLES);
        }

        long totalCapturedSamples() {
            return captured.totalWritten();
        }

        long totalNonZeroSamples() {
            return nonZeroSamples.get();
        }

        boolean isClientSilenced() {
            return clientSilenced.get();
        }

        void cancel() {
            cancelled.set(true);
            active.set(false);
            stopAndRelease();
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

        private void stopAndRelease() {
            if (!released.compareAndSet(false, true)) {
                return;
            }
            if (recordingCallback != null) {
                try {
                    recorder.unregisterAudioRecordingCallback(recordingCallback);
                } catch (RuntimeException ignored) {
                }
                recordingCallback = null;
            }
            try {
                recorder.stop();
            } catch (RuntimeException ignored) {
            }
            recorder.release();
        }

        private void registerSilenceCallback(Context context) {
            recordingCallback = new AudioManager.AudioRecordingCallback() {
                @Override
                public void onRecordingConfigChanged(
                    List<AudioRecordingConfiguration> configurations
                ) {
                    for (AudioRecordingConfiguration configuration : configurations) {
                        if (
                            configuration.getClientAudioSessionId()
                                == audioSessionId
                        ) {
                            clientSilenced.set(configuration.isClientSilenced());
                            return;
                        }
                    }
                }
            };
            try {
                recorder.registerAudioRecordingCallback(
                    context.getMainExecutor(),
                    recordingCallback
                );
            } catch (RuntimeException error) {
                recordingCallback = null;
                recorder.release();
                keywordSpotter.close();
                throw error;
            }
        }
    }
}
