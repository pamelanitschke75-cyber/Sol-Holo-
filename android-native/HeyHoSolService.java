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
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
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

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Locale;

public class HeyHoSolService extends Service implements RecognitionListener {
    public static final String ACTION_START = "com.solholo.app.HEY_HO_SOL_START";
    public static final String ACTION_PAUSE = "com.solholo.app.HEY_HO_SOL_PAUSE";
    public static final String ACTION_RESUME = "com.solholo.app.HEY_HO_SOL_RESUME";
    public static final String ACTION_STOP = "com.solholo.app.HEY_HO_SOL_STOP";
    public static final String MODE_EXTRA = "mode";

    private static final String CHANNEL_ID = "hey_ho_sol_background";
    private static final int NOTIFICATION_ID = 2408;

    private static volatile boolean running;
    private static volatile boolean listening;
    private static volatile boolean pausedForConversation;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable restartRunnable = this::startRecognition;
    private final Runnable fallbackResumeRunnable = () -> {
        if (running && !pausedForConversation) {
            startRecognition();
        }
    };

    private SpeechRecognizer speechRecognizer;
    private String currentMode = HeyHoSolPlugin.MODE_OFF;
    private boolean destroyed;
    private boolean wakeHandled;
    private boolean recognitionStarted;
    private boolean foregroundNotificationActive;
    private WindowManager wakeOverlayManager;
    private View wakeOverlayView;

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

        if (!hasMicrophonePermission() || !onDeviceRecognitionAvailable()) {
            saveError(
                !hasMicrophonePermission()
                    ? "Mikrofonfreigabe fehlt."
                    : "Offline-Spracherkennung ist nicht verfügbar."
            );
            stopWakeService();
            return START_NOT_STICKY;
        }

        if (HeyHoSolPlugin.MODE_BACKGROUND.equals(currentMode)) {
            startBackgroundNotification(
                "Wartet auf „Hey Sol“"
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
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            && SpeechRecognizer.isOnDeviceRecognitionAvailable(this);
    }

    private void startRecognition() {
        mainHandler.removeCallbacks(restartRunnable);
        mainHandler.removeCallbacks(fallbackResumeRunnable);

        if (
            destroyed
                || pausedForConversation
                || recognitionStarted
                || !onDeviceRecognitionAvailable()
        ) {
            return;
        }

        if (speechRecognizer == null) {
            speechRecognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(this);
            speechRecognizer.setRecognitionListener(this);
        }

        Intent recognizerIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        recognizerIntent.putExtra(
            RecognizerIntent.EXTRA_LANGUAGE_MODEL,
            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
        );
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
        recognizerIntent.putExtra(
            RecognizerIntent.EXTRA_LANGUAGE,
            Locale.GERMANY.toLanguageTag()
        );

        wakeHandled = false;
        recognitionStarted = true;

        try {
            speechRecognizer.startListening(recognizerIntent);
        } catch (RuntimeException error) {
            recognitionStarted = false;
            listening = false;
            saveError("Der Offline-Sprachdienst konnte nicht gestartet werden.");
            scheduleRestart(1_500L);
        }
    }

    private void scheduleRestart(long delayMillis) {
        recognitionStarted = false;
        listening = false;
        HeyHoSolPlugin.publishStatusEvent();

        if (!destroyed && !pausedForConversation) {
            mainHandler.removeCallbacks(restartRunnable);
            mainHandler.postDelayed(restartRunnable, delayMillis);
        }
    }

    private void pauseRecognition() {
        mainHandler.removeCallbacks(restartRunnable);
        mainHandler.removeCallbacks(fallbackResumeRunnable);
        recognitionStarted = false;
        listening = false;

        if (speechRecognizer != null) {
            try {
                speechRecognizer.cancel();
            } catch (RuntimeException ignored) {
            }
        }
    }

    private void handleRecognitionResults(Bundle results) {
        if (wakeHandled || results == null) {
            return;
        }

        ArrayList<String> phrases = results.getStringArrayList(
            SpeechRecognizer.RESULTS_RECOGNITION
        );
        if (phrases == null) {
            return;
        }

        for (String phrase : phrases) {
            String canonicalPhrase = matchingWakePhrase(phrase);
            if (!canonicalPhrase.isEmpty()) {
                wakeHandled = true;
                handleWakePhrase(canonicalPhrase);
                return;
            }
        }
    }

    private String matchingWakePhrase(String rawPhrase) {
        String normalized = Normalizer
            .normalize(String.valueOf(rawPhrase), Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z ]", " ")
            .replaceAll("\\s+", " ")
            .trim();

        String solName = "(sol|soll|soul|sohl)";

        if (normalized.matches(".*\\bhey\\s+" + solName + "\\b.*")) {
            return "Hey Sol";
        }

        return "";
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
        listening = true;
        HeyHoSolPlugin.publishStatusEvent();
        updateBackgroundNotification(
            "Wartet auf „Hey Sol“"
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
        listening = false;
        HeyHoSolPlugin.publishStatusEvent();
    }

    @Override
    public void onError(int error) {
        if (destroyed || pausedForConversation || wakeHandled) {
            return;
        }

        long delay = error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY
            ? 1_500L
            : 450L;

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

        scheduleRestart(delay);
    }

    @Override
    public void onResults(Bundle results) {
        recognitionStarted = false;
        listening = false;
        handleRecognitionResults(results);
        if (!wakeHandled) {
            scheduleRestart(350L);
        }
    }

    @Override
    public void onPartialResults(Bundle partialResults) {
        handleRecognitionResults(partialResults);
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
        pausedForConversation = false;
        mainHandler.removeCallbacksAndMessages(null);
        removeWakeOverlay();

        if (speechRecognizer != null) {
            try {
                speechRecognizer.destroy();
            } catch (RuntimeException ignored) {
            }
            speechRecognizer = null;
        }

        HeyHoSolPlugin.publishStatusEvent();
        super.onDestroy();
    }
}
