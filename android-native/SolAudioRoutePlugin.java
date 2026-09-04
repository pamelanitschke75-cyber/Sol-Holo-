package com.solholo.app;

import android.content.Context;
import android.media.AudioDeviceCallback;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

@CapacitorPlugin(name = "SolAudioRoute")
public class SolAudioRoutePlugin extends Plugin {
    private static final long ROUTE_REFRESH_DELAY_MILLIS = 280L;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable routeRefreshRunnable = () -> {
        if (routeCaptured) {
            applyPreferredConversationRoute();
        }
    };

    private AudioManager audioManager;
    private AudioDeviceCallback audioDeviceCallback;
    private boolean routeCaptured;
    private boolean deviceCallbackRegistered;
    private boolean legacyBluetoothScoStarted;
    private int previousMode = AudioManager.MODE_NORMAL;
    private boolean previousSpeakerphoneOn;
    private boolean previousBluetoothScoOn;

    private static final class RouteSelection {
        final boolean selected;
        final boolean external;
        final int deviceType;
        final String deviceName;

        RouteSelection(
            boolean selected,
            boolean external,
            int deviceType,
            String deviceName
        ) {
            this.selected = selected;
            this.external = external;
            this.deviceType = deviceType;
            this.deviceName = deviceName;
        }
    }

    @Override
    public void load() {
        audioManager = (AudioManager) getContext().getSystemService(
            Context.AUDIO_SERVICE
        );
        audioDeviceCallback = new AudioDeviceCallback() {
            @Override
            public void onAudioDevicesAdded(AudioDeviceInfo[] addedDevices) {
                scheduleRouteRefresh();
            }

            @Override
            public void onAudioDevicesRemoved(AudioDeviceInfo[] removedDevices) {
                scheduleRouteRefresh();
            }
        };
    }

    private void runOnMainThread(Runnable action) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            action.run();
        } else {
            mainHandler.post(action);
        }
    }

    /**
     * Selects the connected personal audio device for Sol's two-way voice
     * session. A built-in speaker is only selected when no headset, wired
     * headphones, hearing aid or USB audio device is available.
     */
    @PluginMethod
    public void usePreferredDevice(PluginCall call) {
        runOnMainThread(() -> routeConversation(call));
    }

    /**
     * Backward-compatible bridge for older web assets. It intentionally uses
     * the same headset-first policy instead of forcing the phone speaker.
     */
    @PluginMethod
    public void useSpeaker(PluginCall call) {
        runOnMainThread(() -> routeConversation(call));
    }

    private void routeConversation(PluginCall call) {
        if (audioManager == null) {
            call.reject("Die Android-Audioausgabe ist nicht verfügbar.");
            return;
        }

        capturePreviousRoute();
        registerDeviceCallback();
        RouteSelection route = applyPreferredConversationRoute();
        mainHandler.removeCallbacks(routeRefreshRunnable);
        mainHandler.postDelayed(
            routeRefreshRunnable,
            ROUTE_REFRESH_DELAY_MILLIS
        );

        JSObject result = new JSObject();
        result.put("routeSelected", route.selected);
        result.put(
            "externalDeviceSelected",
            route.selected && route.external
        );
        result.put("externalDeviceAvailable", route.external);
        result.put("speakerSelected", route.selected && !route.external);
        result.put("deviceType", route.deviceType);
        result.put("deviceName", route.deviceName);
        call.resolve(result);
    }

    private void capturePreviousRoute() {
        if (routeCaptured) {
            return;
        }
        previousMode = audioManager.getMode();
        previousSpeakerphoneOn = audioManager.isSpeakerphoneOn();
        previousBluetoothScoOn = audioManager.isBluetoothScoOn();
        routeCaptured = true;
    }

    private RouteSelection applyPreferredConversationRoute() {
        if (audioManager == null) {
            return new RouteSelection(false, false, 0, "");
        }

        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return applyModernConversationRoute();
        }
        return applyLegacyConversationRoute();
    }

    private RouteSelection applyModernConversationRoute() {
        List<AudioDeviceInfo> devices =
            audioManager.getAvailableCommunicationDevices();
        AudioDeviceInfo selected = preferredExternalDevice(devices);
        boolean external = selected != null;

        if (selected == null) {
            selected = deviceOfType(
                devices,
                AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
            );
        }

        if (selected == null) {
            audioManager.clearCommunicationDevice();
            audioManager.setSpeakerphoneOn(true);
            return new RouteSelection(
                audioManager.isSpeakerphoneOn(),
                false,
                AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
                "Handylautsprecher"
            );
        }

        AudioDeviceInfo current = audioManager.getCommunicationDevice();
        boolean alreadySelected =
            current != null && current.getId() == selected.getId();
        boolean routeSelected = alreadySelected
            || audioManager.setCommunicationDevice(selected);

        // Never counteract a connected headset by forcing the built-in
        // speaker when Android needs a moment to establish Bluetooth audio.
        if (!routeSelected && external) {
            mainHandler.removeCallbacks(routeRefreshRunnable);
            mainHandler.postDelayed(
                routeRefreshRunnable,
                ROUTE_REFRESH_DELAY_MILLIS
            );
        }

        return new RouteSelection(
            routeSelected,
            external,
            selected.getType(),
            String.valueOf(selected.getProductName())
        );
    }

    @SuppressWarnings("deprecation")
    private RouteSelection applyLegacyConversationRoute() {
        AudioDeviceInfo external = preferredLegacyOutputDevice();
        if (external == null) {
            if (legacyBluetoothScoStarted) {
                audioManager.stopBluetoothSco();
                legacyBluetoothScoStarted = false;
            }
            audioManager.setBluetoothScoOn(false);
            audioManager.setSpeakerphoneOn(true);
            return new RouteSelection(
                audioManager.isSpeakerphoneOn(),
                false,
                AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
                "Handylautsprecher"
            );
        }

        audioManager.setSpeakerphoneOn(false);
        if (isBluetoothDevice(external)) {
            audioManager.startBluetoothSco();
            audioManager.setBluetoothScoOn(true);
            legacyBluetoothScoStarted = true;
        }

        return new RouteSelection(
            true,
            true,
            external.getType(),
            String.valueOf(external.getProductName())
        );
    }

    private AudioDeviceInfo preferredExternalDevice(
        List<AudioDeviceInfo> devices
    ) {
        AudioDeviceInfo current = audioManager.getCommunicationDevice();
        AudioDeviceInfo preferred = null;
        int preferredPriority = 0;
        for (AudioDeviceInfo device : devices) {
            int priority = externalPriority(device);
            if (priority <= 0) {
                continue;
            }
            if (hasMatchingMediaHeadset(device)) {
                priority += 30;
            }
            if (current != null && current.getId() == device.getId()) {
                priority += 5;
            }
            if (priority > preferredPriority) {
                preferred = device;
                preferredPriority = priority;
            }
        }
        return preferred;
    }

    private boolean hasMatchingMediaHeadset(AudioDeviceInfo candidate) {
        String candidateName = normalizedDeviceName(candidate);
        if (candidateName.isEmpty()) {
            return false;
        }

        for (
            AudioDeviceInfo output
                : audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
        ) {
            int type = output.getType();
            boolean mediaHeadset =
                type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
                    || type == AudioDeviceInfo.TYPE_BLE_HEADSET;
            if (
                mediaHeadset
                    && candidateName.equals(normalizedDeviceName(output))
            ) {
                return true;
            }
        }
        return false;
    }

    private String normalizedDeviceName(AudioDeviceInfo device) {
        if (device == null || device.getProductName() == null) {
            return "";
        }
        return String.valueOf(device.getProductName())
            .trim()
            .toLowerCase(java.util.Locale.ROOT);
    }

    private AudioDeviceInfo preferredLegacyOutputDevice() {
        AudioDeviceInfo preferred = null;
        int preferredPriority = 0;
        for (
            AudioDeviceInfo device
                : audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
        ) {
            int priority = externalPriority(device);
            if (priority > preferredPriority) {
                preferred = device;
                preferredPriority = priority;
            }
        }
        return preferred;
    }

    private int externalPriority(AudioDeviceInfo device) {
        if (device == null || !device.isSink()) {
            return 0;
        }

        switch (device.getType()) {
            case AudioDeviceInfo.TYPE_BLE_HEADSET:
                return 100;
            case AudioDeviceInfo.TYPE_BLUETOOTH_SCO:
                return 95;
            case AudioDeviceInfo.TYPE_WIRED_HEADSET:
                return 90;
            case AudioDeviceInfo.TYPE_USB_HEADSET:
                return 85;
            case AudioDeviceInfo.TYPE_WIRED_HEADPHONES:
                return 80;
            case AudioDeviceInfo.TYPE_HEARING_AID:
                return 75;
            case AudioDeviceInfo.TYPE_BLUETOOTH_A2DP:
                return 70;
            case AudioDeviceInfo.TYPE_BLE_SPEAKER:
                return 65;
            default:
                return 0;
        }
    }

    private boolean isBluetoothDevice(AudioDeviceInfo device) {
        int type = device.getType();
        return type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
            || type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
            || type == AudioDeviceInfo.TYPE_BLE_HEADSET
            || type == AudioDeviceInfo.TYPE_BLE_SPEAKER;
    }

    private AudioDeviceInfo deviceOfType(
        List<AudioDeviceInfo> devices,
        int deviceType
    ) {
        for (AudioDeviceInfo device : devices) {
            if (device.getType() == deviceType) {
                return device;
            }
        }
        return null;
    }

    private void registerDeviceCallback() {
        if (
            audioManager == null
                || audioDeviceCallback == null
                || deviceCallbackRegistered
        ) {
            return;
        }
        audioManager.registerAudioDeviceCallback(
            audioDeviceCallback,
            mainHandler
        );
        deviceCallbackRegistered = true;
    }

    private void unregisterDeviceCallback() {
        if (
            audioManager == null
                || audioDeviceCallback == null
                || !deviceCallbackRegistered
        ) {
            return;
        }
        audioManager.unregisterAudioDeviceCallback(audioDeviceCallback);
        deviceCallbackRegistered = false;
    }

    private void scheduleRouteRefresh() {
        if (!routeCaptured) {
            return;
        }
        mainHandler.removeCallbacks(routeRefreshRunnable);
        mainHandler.postDelayed(
            routeRefreshRunnable,
            ROUTE_REFRESH_DELAY_MILLIS
        );
    }

    @PluginMethod
    public void restore(PluginCall call) {
        runOnMainThread(() -> {
            restorePreviousRoute();
            call.resolve();
        });
    }

    @SuppressWarnings("deprecation")
    private void restorePreviousRoute() {
        if (audioManager == null || !routeCaptured) {
            return;
        }

        routeCaptured = false;
        mainHandler.removeCallbacks(routeRefreshRunnable);
        unregisterDeviceCallback();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            audioManager.clearCommunicationDevice();
        } else {
            if (legacyBluetoothScoStarted) {
                audioManager.stopBluetoothSco();
            }
            audioManager.setBluetoothScoOn(previousBluetoothScoOn);
        }
        audioManager.setSpeakerphoneOn(previousSpeakerphoneOn);
        audioManager.setMode(previousMode);
        legacyBluetoothScoStarted = false;
    }

    @Override
    protected void handleOnDestroy() {
        restorePreviousRoute();
        super.handleOnDestroy();
    }
}
