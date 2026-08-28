package com.solholo.app;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WhatsAppDrivingMode")
public class WhatsAppDrivingModePlugin extends Plugin {
    private ComponentName listenerComponent() {
        return new ComponentName(getContext(), WhatsAppNotificationListener.class);
    }

    private boolean hasNotificationAccess() {
        ComponentName component = listenerComponent();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            NotificationManager manager =
                (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            return manager != null && manager.isNotificationListenerAccessGranted(component);
        }

        String enabledListeners = Settings.Secure.getString(
            getContext().getContentResolver(),
            "enabled_notification_listeners"
        );

        if (TextUtils.isEmpty(enabledListeners)) {
            return false;
        }

        TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
        splitter.setString(enabledListeners);
        while (splitter.hasNext()) {
            ComponentName enabledComponent = ComponentName.unflattenFromString(splitter.next());
            if (component.equals(enabledComponent)) {
                return true;
            }
        }

        return false;
    }

    private boolean isEnabled() {
        return getContext()
            .getSharedPreferences(
                WhatsAppNotificationListener.PREFERENCES_NAME,
                Context.MODE_PRIVATE
            )
            .getBoolean(WhatsAppNotificationListener.ENABLED_KEY, false);
    }

    private JSObject status() {
        boolean permissionGranted = hasNotificationAccess();
        boolean enabled = isEnabled();

        JSObject result = new JSObject();
        result.put("supported", true);
        result.put("permissionGranted", permissionGranted);
        result.put("enabled", enabled);
        result.put("active", permissionGranted && enabled);
        return result;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) {
            call.reject("Der gewünschte Fahrmodus-Status fehlt.");
            return;
        }

        getContext()
            .getSharedPreferences(
                WhatsAppNotificationListener.PREFERENCES_NAME,
                Context.MODE_PRIVATE
            )
            .edit()
            .putBoolean(WhatsAppNotificationListener.ENABLED_KEY, enabled)
            .apply();

        if (!enabled) {
            WhatsAppNotificationListener.stopSpeakingNow();
        }

        call.resolve(status());
    }

    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Die Android-Einstellungen konnten nicht geöffnet werden.");
            return;
        }

        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS);
            intent.putExtra(
                Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                listenerComponent().flattenToString()
            );
        } else {
            intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        }

        try {
            activity.startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException firstError) {
            try {
                activity.startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
                call.resolve();
            } catch (ActivityNotFoundException secondError) {
                call.reject(
                    "Auf diesem Gerät wurden die Einstellungen für den Benachrichtigungszugriff nicht gefunden.",
                    null,
                    secondError
                );
            }
        }
    }
}
