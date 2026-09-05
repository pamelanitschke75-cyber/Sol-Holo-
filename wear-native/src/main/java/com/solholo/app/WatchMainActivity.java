package com.solholo.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public final class WatchMainActivity extends Activity {
    private static final int PERMISSION_REQUEST = 2408;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextView statusView;
    private Button startButton;
    private Button stopButton;
    private boolean resumed;

    private final Runnable refreshRunnable = new Runnable() {
        @Override
        public void run() {
            refreshStatus();
            if (resumed) {
                handler.postDelayed(this, 1_000L);
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(buildContent());
    }

    @Override
    protected void onResume() {
        super.onResume();
        resumed = true;
        handler.removeCallbacks(refreshRunnable);
        handler.post(refreshRunnable);

        if (
            WatchWakeService.wasListeningRequested(this)
                && !WatchWakeService.isRunning()
                && hasMicrophonePermission()
                && hasNotificationPermission()
        ) {
            startListeningService();
        }
    }

    @Override
    protected void onPause() {
        resumed = false;
        handler.removeCallbacks(refreshRunnable);
        super.onPause();
    }

    @Override
    public void onRequestPermissionsResult(
        int requestCode,
        String[] permissions,
        int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != PERMISSION_REQUEST) {
            return;
        }
        if (hasMicrophonePermission() && hasNotificationPermission()) {
            startListeningService();
        } else {
            WatchWakeService.publishStatus(
                this,
                "blocked",
                hasMicrophonePermission()
                    ? "Benachrichtigungen sind noch nicht freigegeben."
                    : "Mikrofon ist noch nicht freigegeben."
            );
        }
        refreshStatus();
    }

    private View buildContent() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(3, 8, 23));

        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        int side = dp(26);
        column.setPadding(side, dp(30), side, dp(32));
        scroll.addView(
            column,
            new ScrollView.LayoutParams(
                ScrollView.LayoutParams.MATCH_PARENT,
                ScrollView.LayoutParams.WRAP_CONTENT
            )
        );

        TextView title = text("Pam ♾️ Watch8", 22f, Color.WHITE, true);
        title.setGravity(Gravity.CENTER);
        column.addView(title, matchWrap(dp(8)));

        TextView wakePhrase = text("„Hey Pam“", 20f, Color.rgb(194, 157, 255), true);
        wakePhrase.setGravity(Gravity.CENTER);
        column.addView(wakePhrase, matchWrap(dp(16)));

        statusView = text("Status wird geprüft …", 15f, Color.WHITE, false);
        statusView.setGravity(Gravity.CENTER);
        statusView.setPadding(dp(14), dp(14), dp(14), dp(14));
        statusView.setBackground(roundRect(Color.rgb(15, 26, 57), Color.rgb(83, 132, 255)));
        column.addView(statusView, matchWrap(dp(14)));

        startButton = button("Hintergrund aktivieren", Color.rgb(104, 64, 220));
        startButton.setOnClickListener(view -> requestAndStart());
        column.addView(startButton, matchHeight(dp(56), dp(10)));

        stopButton = button("Aus", Color.rgb(28, 38, 69));
        stopButton.setOnClickListener(view -> {
            Intent intent = new Intent(this, WatchWakeService.class)
                .setAction(WatchWakeService.ACTION_STOP);
            startService(intent);
            handler.postDelayed(this::refreshStatus, 250L);
        });
        column.addView(stopButton, matchHeight(dp(52), dp(16)));

        TextView explanation = text(
            "Die Watch erkennt den Weckruf lokal. Dein vorhandenes 3/3-Stimmprofil bleibt geschützt auf dem S23. In diesem ersten Watch-Schritt spricht Pam nach der Freigabe über das Handy.",
            12.5f,
            Color.rgb(183, 190, 211),
            false
        );
        explanation.setGravity(Gravity.CENTER);
        column.addView(explanation, matchWrap(0));

        return scroll;
    }

    private void requestAndStart() {
        if (!hasMicrophonePermission()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                requestPermissions(
                    new String[] {
                        Manifest.permission.RECORD_AUDIO,
                        Manifest.permission.POST_NOTIFICATIONS
                    },
                    PERMISSION_REQUEST
                );
            } else {
                requestPermissions(
                    new String[] { Manifest.permission.RECORD_AUDIO },
                    PERMISSION_REQUEST
                );
            }
            return;
        }

        if (!hasNotificationPermission()) {
            requestPermissions(
                new String[] { Manifest.permission.POST_NOTIFICATIONS },
                PERMISSION_REQUEST
            );
            return;
        }
        startListeningService();
    }

    private void startListeningService() {
        Intent intent = new Intent(this, WatchWakeService.class)
            .setAction(WatchWakeService.ACTION_START);
        startForegroundService(intent);
        WatchWakeService.rememberListeningRequested(this, true);
        handler.postDelayed(this::refreshStatus, 350L);
    }

    private boolean hasMicrophonePermission() {
        return checkSelfPermission(Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasNotificationPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
    }

    private void refreshStatus() {
        if (statusView == null) {
            return;
        }
        boolean running = WatchWakeService.isRunning();
        String status = WatchWakeService.readStatus(this);
        if (status.trim().isEmpty()) {
            status = running
                ? "Watch hört auf „Hey Pam“ ✅"
                : "Watch-Hintergrund ist aus.";
        }
        statusView.setText(status);
        statusView.setTextColor(
            running ? Color.rgb(140, 255, 193) : Color.rgb(215, 219, 235)
        );
        startButton.setEnabled(!running);
        startButton.setText(running ? "Hintergrund aktiv" : "Hintergrund aktivieren");
        stopButton.setEnabled(running || WatchWakeService.wasListeningRequested(this));
    }

    private TextView text(String value, float size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) {
            view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        }
        return view;
    }

    private Button button(String label, int backgroundColor) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextColor(Color.WHITE);
        button.setTextSize(15f);
        button.setAllCaps(false);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setBackground(roundRect(backgroundColor, Color.rgb(132, 102, 255)));
        return button;
    }

    private GradientDrawable roundRect(int fill, int stroke) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(24));
        drawable.setStroke(dp(1), stroke);
        return drawable;
    }

    private LinearLayout.LayoutParams matchWrap(int bottomMargin) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.bottomMargin = bottomMargin;
        return params;
    }

    private LinearLayout.LayoutParams matchHeight(int height, int bottomMargin) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            height
        );
        params.bottomMargin = bottomMargin;
        return params;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
