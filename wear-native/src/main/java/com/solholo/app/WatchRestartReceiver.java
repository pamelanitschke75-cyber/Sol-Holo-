package com.solholo.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Android does not allow a microphone foreground service to be created from
 * BOOT_COMPLETED. This receiver therefore offers the smallest legal recovery:
 * one visible tap opens the app, and the visible Activity restores listening.
 */
public final class WatchRestartReceiver extends BroadcastReceiver {
    private static final int REMINDER_NOTIFICATION_ID = 2841;
    private static final String REMINDER_CHANNEL_ID = "pam_watch_restart";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!WatchWakeService.wasListeningRequested(context)) {
            return;
        }
        NotificationManager manager = context.getSystemService(
            NotificationManager.class
        );
        if (manager == null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            REMINDER_CHANNEL_ID,
            "Pam nach Neustart",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(
            "Erinnert nach einem Watch-Neustart oder Update an die Mikrofonaktivierung."
        );
        manager.createNotificationChannel(channel);
        Intent openIntent = new Intent(context, WatchMainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            context,
            2,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification notification = new Notification.Builder(
            context,
            REMINDER_CHANNEL_ID
        )
            .setSmallIcon(R.drawable.ic_pam_mic)
            .setContentTitle("Pam auf der Watch wieder aktivieren")
            .setContentText("Einmal tippen – danach hört die Watch wieder auf „Hey Pam“.")
            .setContentIntent(openPendingIntent)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .build();
        manager.notify(REMINDER_NOTIFICATION_ID, notification);
    }

    static void cancelReminder(Context context) {
        NotificationManager manager = context.getSystemService(
            NotificationManager.class
        );
        if (manager != null) {
            manager.cancel(REMINDER_NOTIFICATION_ID);
        }
    }
}
