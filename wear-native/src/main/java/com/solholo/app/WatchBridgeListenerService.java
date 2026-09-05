package com.solholo.app;

import android.content.Context;
import android.net.Uri;
import android.os.VibrationEffect;
import android.os.Vibrator;

import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataItem;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.Wearable;
import com.google.android.gms.wearable.WearableListenerService;

public final class WatchBridgeListenerService extends WearableListenerService {
    private static final String STATUS_PATH_PREFIX = "/solholo/watch/status/";
    private static final long MAX_STATUS_AGE_MILLIS = 60_000L;

    @Override
    public void onDataChanged(DataEventBuffer dataEvents) {
        for (DataEvent event : dataEvents) {
            if (event.getType() != DataEvent.TYPE_CHANGED) {
                continue;
            }
            DataItem item = event.getDataItem();
            Uri uri = item.getUri();
            String path = uri == null ? null : uri.getPath();
            if (path == null || !path.startsWith(STATUS_PATH_PREFIX)) {
                continue;
            }
            try {
                DataMap map = DataMapItem.fromDataItem(item).getDataMap();
                String pathSession = path.substring(STATUS_PATH_PREFIX.length());
                String sessionId = map.getString("sessionId");
                String ownerId = map.getString("ownerId");
                String state = map.getString("state");
                String message = map.getString("message");
                long updatedAt = map.getLong("updatedAtMillis");
                long now = System.currentTimeMillis();
                if (
                    WearWakePayloadPolicy.OWNER_ID.equals(ownerId)
                        && pathSession.equals(sessionId)
                        && validState(state)
                        && updatedAt > 0L
                        && now >= updatedAt - WearWakePayloadPolicy.MAX_FUTURE_SKEW_MILLIS
                        && now - updatedAt <= MAX_STATUS_AGE_MILLIS
                ) {
                    String safeMessage = message == null ? "" : message.trim();
                    if (safeMessage.length() > 240) {
                        safeMessage = safeMessage.substring(0, 240);
                    }
                    WatchWakeService.receivePhoneStatus(
                        this,
                        sessionId,
                        state,
                        safeMessage
                    );
                    if ("accepted".equals(state)) {
                        vibrateConfirmation();
                    }
                }
            } catch (RuntimeException ignored) {
            } finally {
                if (uri != null) {
                    Wearable.getDataClient(getApplicationContext())
                        .deleteDataItems(uri);
                }
            }
        }
    }

    private boolean validState(String state) {
        return "checking".equals(state)
            || "accepted".equals(state)
            || "rejected".equals(state)
            || "phone_inactive".equals(state);
    }

    private void vibrateConfirmation() {
        Vibrator vibrator = (Vibrator)getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            vibrator.vibrate(
                VibrationEffect.createOneShot(
                    180L,
                    VibrationEffect.DEFAULT_AMPLITUDE
                )
            );
        }
    }
}
