package com.solholo.app;

import android.content.Context;
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

@CapacitorPlugin(name = "SolAudioRoute")
public class SolAudioRoutePlugin extends Plugin {
    private AudioManager audioManager;
    private boolean routeCaptured;
    private int previousMode = AudioManager.MODE_NORMAL;
    private boolean previousSpeakerphoneOn;

    @Override
    public void load() {
        audioManager = (AudioManager) getContext().getSystemService(
            Context.AUDIO_SERVICE
        );
    }

    private void runOnMainThread(Runnable action) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            action.run();
        } else {
            new Handler(Looper.getMainLooper()).post(action);
        }
    }

    @PluginMethod
    public void useSpeaker(PluginCall call) {
        runOnMainThread(() -> {
            if (audioManager == null) {
                call.reject("Die Android-Audioausgabe ist nicht verfügbar.");
                return;
            }

            if (!routeCaptured) {
                previousMode = audioManager.getMode();
                previousSpeakerphoneOn = audioManager.isSpeakerphoneOn();
                routeCaptured = true;
            }

            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            boolean speakerSelected = false;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                for (
                    AudioDeviceInfo device
                        : audioManager.getAvailableCommunicationDevices()
                ) {
                    if (device.getType() == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                        speakerSelected = audioManager.setCommunicationDevice(device);
                        break;
                    }
                }
            }

            if (!speakerSelected) {
                audioManager.setSpeakerphoneOn(true);
                speakerSelected = audioManager.isSpeakerphoneOn();
            }

            JSObject result = new JSObject();
            result.put("speakerSelected", speakerSelected);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void restore(PluginCall call) {
        runOnMainThread(() -> {
            restorePreviousRoute();
            call.resolve();
        });
    }

    private void restorePreviousRoute() {
        if (audioManager == null || !routeCaptured) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            audioManager.clearCommunicationDevice();
        }
        audioManager.setSpeakerphoneOn(previousSpeakerphoneOn);
        audioManager.setMode(previousMode);
        routeCaptured = false;
    }

    @Override
    protected void handleOnDestroy() {
        restorePreviousRoute();
        super.handleOnDestroy();
    }
}
