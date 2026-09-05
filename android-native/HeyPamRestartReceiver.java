package com.solholo.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * Restores the user-controlled background wake mode after an app update or a
 * device reboot. Android 14+ does not allow a microphone foreground service to
 * start silently from these broadcasts, so the receiver presents one explicit
 * notification action. Tapping it is a permitted user-initiated microphone-FGS
 * start and does not require navigating back to the profile screen.
 */
public final class HeyPamRestartReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "hey_pam_restart";
    private static final int NOTIFICATION_ID = 2411;
    private static final int RESTART_REQUEST_CODE = 2411;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) {
            return;
        }
        String action = intent.getAction();
        if (
            !Intent.ACTION_BOOT_COMPLETED.equals(action)
                && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
        ) {
            return;
        }

        String savedMode = context
            .getSharedPreferences(
                HeyHoSolPlugin.PREFERENCES_NAME,
                Context.MODE_PRIVATE
            )
            .getString(HeyHoSolPlugin.MODE_KEY, HeyHoSolPlugin.MODE_OFF);
        if (!HeyHoSolPlugin.MODE_BACKGROUND.equals(savedMode)) {
            cancelReminder(context);
            return;
        }

        postRestartReminder(
            context,
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                ? "Update installiert"
                : "Handy neu gestartet"
        );
    }

    static void cancelReminder(Context context) {
        NotificationManager manager = context.getSystemService(
            NotificationManager.class
        );
        if (manager != null) {
            manager.cancel(NOTIFICATION_ID);
        }
    }

    private void postRestartReminder(Context context, String reason) {
        NotificationManager manager = context.getSystemService(
            NotificationManager.class
        );
        if (manager == null) {
            return;
        }
        createChannel(manager);

        Intent serviceIntent = HeyHoSolService.startIntent(
            context,
            HeyHoSolPlugin.MODE_BACKGROUND
        );
        PendingIntent restartIntent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? PendingIntent.getForegroundService(
                context,
                RESTART_REQUEST_CODE,
                serviceIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            )
            : PendingIntent.getService(
                context,
                RESTART_REQUEST_CODE,
                serviceIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(context, CHANNEL_ID)
            : new Notification.Builder(context)
                .setPriority(Notification.PRIORITY_HIGH);
        Notification reminder = builder
            .setSmallIcon(context.getApplicationInfo().icon)
            .setContentTitle("Pam’s Holo wieder aktivieren")
            .setContentText(
                reason + " · einmal tippen, dann hört „Hey Pam“ wieder."
            )
            .setContentIntent(restartIntent)
            .setAutoCancel(true)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .addAction(
                new Notification.Action.Builder(
                    android.R.drawable.ic_media_play,
                    "Jetzt aktivieren",
                    restartIntent
                ).build()
            )
            .build();
        try {
            manager.notify(NOTIFICATION_ID, reminder);
        } catch (SecurityException ignored) {
            // Hintergrundmodus fordert die Benachrichtigungsfreigabe bereits
            // beim Einrichten an. Falls Pam sie später entzieht, startet der
            // Dienst weiterhin automatisch beim nächsten sichtbaren App-Start.
        }
    }

    private void createChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Hey Pam nach Neustart oder Update",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(
            "Einmalige Aktivierung des gespeicherten Hintergrundmodus."
        );
        channel.setSound(null, null);
        manager.createNotificationChannel(channel);
    }
}
