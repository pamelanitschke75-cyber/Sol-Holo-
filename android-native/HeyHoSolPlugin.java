package com.solholo.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.speech.SpeechRecognizer;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "HeyHoSol",
    permissions = {
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        ),
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class HeyHoSolPlugin extends Plugin {
    public static final String PREFERENCES_NAME = "sol_holo_private_settings";
    public static final String MODE_KEY = "hey_ho_sol_mode";
    public static final String PENDING_PHRASE_KEY = "hey_ho_sol_pending_phrase";
    public static final String PENDING_TIME_KEY = "hey_ho_sol_pending_time";
    public static final String LAST_ERROR_KEY = "hey_ho_sol_last_error";

    public static final String MODE_OFF = "off";
    public static final String MODE_FOREGROUND = "foreground";
    public static final String MODE_BACKGROUND = "background";

    private static volatile HeyHoSolPlugin activePlugin;
    private static volatile boolean activityVisible;

    @Override
    public void load() {
        activePlugin = this;
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        activityVisible = true;
        startSavedModeIfNeeded();
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        activityVisible = false;

        if (MODE_FOREGROUND.equals(savedMode())) {
            getContext().stopService(new Intent(getContext(), HeyHoSolService.class));
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (MODE_FOREGROUND.equals(savedMode())) {
            getContext().stopService(new Intent(getContext(), HeyHoSolService.class));
        }

        if (activePlugin == this) {
            activePlugin = null;
        }
        super.handleOnDestroy();
    }

    public static boolean isActivityVisible() {
        return activityVisible;
    }

    private String savedMode() {
        return getContext()
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getString(MODE_KEY, MODE_OFF);
    }

    private boolean microphoneGranted() {
        return ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean notificationsGranted() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || ContextCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean onDeviceRecognitionSupported() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
    }

    private void runOnMainThread(Runnable action) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            action.run();
            return;
        }

        new Handler(Looper.getMainLooper()).post(action);
    }

    private JSObject status() {
        String mode = savedMode();
        boolean supported = onDeviceRecognitionSupported();
        boolean microphonePermissionGranted = microphoneGranted();
        boolean notificationPermissionGranted = notificationsGranted();

        JSObject result = new JSObject();
        result.put("supported", supported);
        result.put("mode", mode);
        result.put("microphonePermissionGranted", microphonePermissionGranted);
        result.put("notificationPermissionGranted", notificationPermissionGranted);
        result.put("serviceRunning", HeyHoSolService.isRunning());
        result.put("listening", HeyHoSolService.isListening());
        result.put("pausedForConversation", HeyHoSolService.isPausedForConversation());
        result.put(
            "active",
            supported
                && microphonePermissionGranted
                && !MODE_OFF.equals(mode)
                && HeyHoSolService.isRunning()
        );
        result.put(
            "lastError",
            getContext()
                .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
                .getString(LAST_ERROR_KEY, "")
        );
        return result;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        runOnMainThread(() -> call.resolve(status()));
    }

    @PluginMethod
    public void setMode(PluginCall call) {
        runOnMainThread(() -> setModeOnMainThread(call));
    }

    private void setModeOnMainThread(PluginCall call) {
        String mode = call.getString("mode", MODE_OFF);
        if (!isValidMode(mode)) {
            call.reject("Unbekannter Hey-ho-Sol-Modus.");
            return;
        }

        if (MODE_OFF.equals(mode)) {
            applyMode(mode);
            call.resolve(status());
            return;
        }

        if (!onDeviceRecognitionSupported()) {
            call.reject(
                "Für Hey ho Sol fehlt auf diesem Handy die Offline-Spracherkennung.",
                "ON_DEVICE_RECOGNITION_UNAVAILABLE"
            );
            return;
        }

        List<String> missingAliases = new ArrayList<>();
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            missingAliases.add("microphone");
        }
        if (
            MODE_BACKGROUND.equals(mode)
                && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && getPermissionState("notifications") != PermissionState.GRANTED
        ) {
            missingAliases.add("notifications");
        }

        if (!missingAliases.isEmpty()) {
            requestPermissionForAliases(
                missingAliases.toArray(new String[0]),
                call,
                "wakePermissionsCallback"
            );
            return;
        }

        applyMode(mode);
        call.resolve(status());
    }

    @PermissionCallback
    private void wakePermissionsCallback(PluginCall call) {
        String mode = call.getString("mode", MODE_OFF);
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Ohne Mikrofonfreigabe kann Sol den Weckruf nicht hören.");
            return;
        }

        if (
            MODE_BACKGROUND.equals(mode)
                && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && getPermissionState("notifications") != PermissionState.GRANTED
        ) {
            call.reject(
                "Für das Hintergrund-Hören braucht Sol den sichtbaren Android-Hinweis."
            );
            return;
        }

        applyMode(mode);
        call.resolve(status());
    }

    @PluginMethod
    public void pauseForConversation(PluginCall call) {
        runOnMainThread(() -> {
            HeyHoSolService.pause(getContext());
            call.resolve(status());
        });
    }

    @PluginMethod
    public void resumeAfterConversation(PluginCall call) {
        runOnMainThread(() -> {
            startSavedModeIfNeeded();
            HeyHoSolService.resume(getContext(), savedMode());
            call.resolve(status());
        });
    }

    @PluginMethod
    public void consumeWakeEvent(PluginCall call) {
        Context context = getContext();
        String phrase = context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getString(PENDING_PHRASE_KEY, "");
        long detectedAt = context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getLong(PENDING_TIME_KEY, 0L);

        context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(PENDING_PHRASE_KEY)
            .remove(PENDING_TIME_KEY)
            .apply();

        JSObject result = new JSObject();
        result.put("detected", !phrase.isEmpty());
        result.put("phrase", phrase);
        result.put("detectedAt", detectedAt);
        call.resolve(result);
    }

    @PluginMethod
    public void openSpeechSettings(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Die Android-Spracheinstellungen konnten nicht geöffnet werden.");
            return;
        }

        try {
            activity.startActivity(new Intent(Settings.ACTION_VOICE_INPUT_SETTINGS));
            call.resolve();
        } catch (ActivityNotFoundException error) {
            try {
                activity.startActivity(new Intent(Settings.ACTION_SETTINGS));
                call.resolve();
            } catch (ActivityNotFoundException fallbackError) {
                call.reject(
                    "Die Android-Spracheinstellungen wurden nicht gefunden.",
                    null,
                    fallbackError
                );
            }
        }
    }

    private boolean isValidMode(String mode) {
        return MODE_OFF.equals(mode)
            || MODE_FOREGROUND.equals(mode)
            || MODE_BACKGROUND.equals(mode);
    }

    private void applyMode(String mode) {
        getContext()
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(MODE_KEY, mode)
            .remove(LAST_ERROR_KEY)
            .apply();

        if (MODE_OFF.equals(mode)) {
            getContext().stopService(new Intent(getContext(), HeyHoSolService.class));
            publishStatusEvent();
            return;
        }

        startService(mode);
    }

    private void startSavedModeIfNeeded() {
        String mode = savedMode();
        if (MODE_OFF.equals(mode) || !microphoneGranted()) {
            return;
        }

        if (MODE_FOREGROUND.equals(mode) && !activityVisible) {
            return;
        }

        if (!HeyHoSolService.isRunning()) {
            startService(mode);
        }
    }

    private void startService(String mode) {
        Intent intent = HeyHoSolService.startIntent(getContext(), mode);
        if (MODE_BACKGROUND.equals(mode)) {
            ContextCompat.startForegroundService(getContext(), intent);
        } else {
            getContext().startService(intent);
        }
    }

    public static void publishWakeEvent(Context context, String phrase) {
        long detectedAt = System.currentTimeMillis();
        context
            .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PENDING_PHRASE_KEY, phrase)
            .putLong(PENDING_TIME_KEY, detectedAt)
            .apply();

        HeyHoSolPlugin plugin = activePlugin;
        if (plugin != null) {
            JSObject event = new JSObject();
            event.put("phrase", phrase);
            event.put("detectedAt", detectedAt);
            plugin.notifyListeners("wakePhraseDetected", event, true);
        }
    }

    public static void publishStatusEvent() {
        HeyHoSolPlugin plugin = activePlugin;
        if (plugin != null) {
            plugin.notifyListeners("wakeStatusChanged", plugin.status(), false);
        }
    }
}
