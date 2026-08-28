package com.solholo.app;

import android.app.Notification;
import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.speech.tts.TextToSpeech;

import java.util.ArrayDeque;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Queue;
import java.util.UUID;

public class WhatsAppNotificationListener extends NotificationListenerService {
    public static final String PREFERENCES_NAME = "sol_holo_private_settings";
    public static final String ENABLED_KEY = "whatsapp_drive_mode_enabled";

    private static final long DUPLICATE_WINDOW_MS = 45_000L;
    private static final int MAX_RECENT_MESSAGES = 40;
    private static volatile WhatsAppNotificationListener activeInstance;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Queue<String> pendingSpeech = new ArrayDeque<>();
    private final LinkedHashMap<String, Long> recentMessages = new LinkedHashMap<>();

    private TextToSpeech textToSpeech;
    private boolean textToSpeechReady;

    @Override
    public void onCreate() {
        super.onCreate();
        activeInstance = this;
    }

    @Override
    public void onNotificationPosted(StatusBarNotification statusBarNotification) {
        if (statusBarNotification == null || !isDrivingModeEnabled()) {
            return;
        }

        String packageName = statusBarNotification.getPackageName();
        if (!"com.whatsapp".equals(packageName) && !"com.whatsapp.w4b".equals(packageName)) {
            return;
        }

        Notification notification = statusBarNotification.getNotification();
        if (notification == null || (notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) {
            return;
        }

        if (Notification.CATEGORY_CALL.equals(notification.category)) {
            return;
        }

        Bundle extras = notification.extras;
        if (extras == null) {
            return;
        }

        String sender = cleanText(extras.getCharSequence(Notification.EXTRA_TITLE));
        String message = extractMessage(extras);
        if (message.isEmpty()) {
            return;
        }

        long messageTime = notification.when > 0
            ? notification.when
            : statusBarNotification.getPostTime();
        String fingerprint = statusBarNotification.getKey()
            + "\n" + sender
            + "\n" + message
            + "\n" + messageTime;

        if (wasRecentlyRead(fingerprint)) {
            return;
        }

        String spokenText = sender.isEmpty() || "WhatsApp".equalsIgnoreCase(sender)
            ? "Neue WhatsApp-Nachricht. " + message
            : "WhatsApp von " + sender + ". " + message;
        queueSpeech(spokenText);
    }

    private boolean isDrivingModeEnabled() {
        return getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getBoolean(ENABLED_KEY, false);
    }

    private String extractMessage(Bundle extras) {
        String message = cleanText(extras.getCharSequence(Notification.EXTRA_TEXT));
        if (!message.isEmpty()) {
            return message;
        }

        message = cleanText(extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
        if (!message.isEmpty()) {
            return message;
        }

        CharSequence[] lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
        if (lines != null) {
            for (int index = lines.length - 1; index >= 0; index -= 1) {
                message = cleanText(lines[index]);
                if (!message.isEmpty()) {
                    return message;
                }
            }
        }

        return "";
    }

    private String cleanText(CharSequence value) {
        if (value == null) {
            return "";
        }

        return value.toString().replaceAll("\\s+", " ").trim();
    }

    private synchronized boolean wasRecentlyRead(String fingerprint) {
        long now = System.currentTimeMillis();
        recentMessages.entrySet().removeIf(
            entry -> now - entry.getValue() > DUPLICATE_WINDOW_MS
        );

        if (recentMessages.containsKey(fingerprint)) {
            return true;
        }

        recentMessages.put(fingerprint, now);
        while (recentMessages.size() > MAX_RECENT_MESSAGES) {
            String oldestKey = recentMessages.keySet().iterator().next();
            recentMessages.remove(oldestKey);
        }

        return false;
    }

    private void queueSpeech(String text) {
        mainHandler.post(() -> {
            pendingSpeech.add(text);

            if (textToSpeechReady && textToSpeech != null) {
                speakPendingMessages();
                return;
            }

            if (textToSpeech == null) {
                textToSpeech = new TextToSpeech(
                    getApplicationContext(),
                    this::onTextToSpeechInitialized
                );
            }
        });
    }

    private void onTextToSpeechInitialized(int status) {
        mainHandler.post(() -> {
            if (status != TextToSpeech.SUCCESS || textToSpeech == null) {
                pendingSpeech.clear();
                shutdownTextToSpeech();
                return;
            }

            int languageStatus = textToSpeech.setLanguage(Locale.GERMANY);
            textToSpeechReady = languageStatus != TextToSpeech.LANG_MISSING_DATA
                && languageStatus != TextToSpeech.LANG_NOT_SUPPORTED;

            if (textToSpeechReady) {
                speakPendingMessages();
            } else {
                pendingSpeech.clear();
                shutdownTextToSpeech();
            }
        });
    }

    private void speakPendingMessages() {
        while (textToSpeechReady && textToSpeech != null && !pendingSpeech.isEmpty()) {
            String message = pendingSpeech.remove();
            textToSpeech.speak(
                message,
                TextToSpeech.QUEUE_ADD,
                null,
                "sol-holo-whatsapp-" + UUID.randomUUID()
            );
        }
    }

    public static void stopSpeakingNow() {
        WhatsAppNotificationListener listener = activeInstance;
        if (listener != null) {
            listener.mainHandler.post(listener::stopSpeaking);
        }
    }

    private void stopSpeaking() {
        pendingSpeech.clear();
        if (textToSpeech != null) {
            textToSpeech.stop();
        }
    }

    private void shutdownTextToSpeech() {
        textToSpeechReady = false;
        if (textToSpeech != null) {
            textToSpeech.shutdown();
            textToSpeech = null;
        }
    }

    @Override
    public void onDestroy() {
        stopSpeaking();
        shutdownTextToSpeech();
        if (activeInstance == this) {
            activeInstance = null;
        }
        super.onDestroy();
    }
}
