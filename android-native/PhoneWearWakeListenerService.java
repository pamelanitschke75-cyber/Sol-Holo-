package com.solholo.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;

import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataItem;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;
import com.google.android.gms.wearable.WearableListenerService;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Receives only bounded Hey-Pam candidates from the same-signed Wear OS app.
 * Raw PCM stays in memory, is deleted from the Data Layer after consumption,
 * and can wake the phone only after the existing 3/3 owner profile accepts it.
 */
public final class PhoneWearWakeListenerService extends WearableListenerService {
    static final String WAKE_PATH_PREFIX = "/solholo/watch/wake/";
    static final String STATUS_PATH_PREFIX = "/solholo/watch/status/";

    private static final String PREFERENCES_NAME = "sol_holo_wear_bridge";
    private static final String LAST_SESSION_KEY = "last_consumed_session";
    private static final ExecutorService VERIFICATION_EXECUTOR =
        Executors.newSingleThreadExecutor();

    @Override
    public void onDataChanged(DataEventBuffer dataEvents) {
        for (DataEvent event : dataEvents) {
            if (event.getType() != DataEvent.TYPE_CHANGED) {
                continue;
            }
            DataItem item = event.getDataItem();
            Uri uri = item.getUri();
            String path = uri == null ? null : uri.getPath();
            if (path == null || !path.startsWith(WAKE_PATH_PREFIX)) {
                continue;
            }

            DataMap map;
            try {
                map = DataMapItem.fromDataItem(item).getDataMap();
            } catch (RuntimeException ignored) {
                deleteDataItem(uri);
                continue;
            }

            WakeCandidate candidate = new WakeCandidate(
                uri,
                path.substring(WAKE_PATH_PREFIX.length()),
                map.getString("ownerId"),
                map.getString("phrase"),
                map.getString("sessionId"),
                map.getInt("sampleRate"),
                map.getInt("sampleCount"),
                map.getLong("createdAtMillis"),
                map.getByteArray("pcm16le")
            );
            deleteDataItem(uri);
            VERIFICATION_EXECUTOR.execute(() -> processCandidate(candidate));
        }
    }

    private void processCandidate(WakeCandidate candidate) {
        long now = System.currentTimeMillis();
        String rejection = WearWakePayloadPolicy.rejectionReason(
            candidate.ownerId,
            candidate.phrase,
            candidate.sessionId,
            candidate.sampleRate,
            candidate.sampleCount,
            candidate.createdAtMillis,
            now,
            candidate.pcm16le
        );
        if (
            rejection.isEmpty()
                && !candidate.pathSessionId.equals(candidate.sessionId)
        ) {
            rejection = "path_session";
        }
        if (!rejection.isEmpty()) {
            publishStatus(
                candidate.pathSessionId,
                "rejected",
                "Der Watch-Weckruf war nicht mehr sicher verwendbar."
            );
            return;
        }
        if (!consumeSessionOnce(candidate.sessionId)) {
            return;
        }

        try {
            short[] samples = decodePcm(candidate.pcm16le);
            SolSpeakerIdentityPlugin.WakeVerification verification =
                SolSpeakerIdentityPlugin.verifyWakeAudio(
                    getApplicationContext(),
                    samples,
                    samples.length
                );
            if (!verification.accepted) {
                publishStatus(
                    candidate.sessionId,
                    "rejected",
                    "Die Stimme wurde nicht sicher freigegeben."
                );
                return;
            }

            HeyHoSolService.acceptVerifiedWearWake(
                candidate.phrase,
                (dispatched, message) -> publishStatus(
                    candidate.sessionId,
                    dispatched ? "accepted" : "phone_inactive",
                    message
                )
            );
        } catch (RuntimeException error) {
            String message = error.getMessage();
            if (message == null || message.trim().isEmpty()) {
                message = "Die sichere Stimmprüfung konnte nicht abgeschlossen werden.";
            }
            publishStatus(candidate.sessionId, "rejected", message);
        }
    }

    private boolean consumeSessionOnce(String sessionId) {
        SharedPreferences preferences = getSharedPreferences(
            PREFERENCES_NAME,
            Context.MODE_PRIVATE
        );
        synchronized (PhoneWearWakeListenerService.class) {
            if (sessionId.equals(preferences.getString(LAST_SESSION_KEY, ""))) {
                return false;
            }
            preferences.edit().putString(LAST_SESSION_KEY, sessionId).commit();
            return true;
        }
    }

    private short[] decodePcm(byte[] bytes) {
        short[] samples = new short[bytes.length / 2];
        ByteBuffer.wrap(bytes)
            .order(ByteOrder.LITTLE_ENDIAN)
            .asShortBuffer()
            .get(samples);
        return samples;
    }

    private void publishStatus(String sessionId, String state, String message) {
        if (
            sessionId == null
                || !sessionId.matches("[A-Za-z0-9_-]{16,80}")
        ) {
            return;
        }
        PutDataMapRequest mapRequest = PutDataMapRequest.create(
            STATUS_PATH_PREFIX + sessionId
        );
        DataMap map = mapRequest.getDataMap();
        map.putString("ownerId", WearWakePayloadPolicy.OWNER_ID);
        map.putString("sessionId", sessionId);
        map.putString("state", state);
        map.putString("message", message == null ? "" : message);
        map.putLong("updatedAtMillis", System.currentTimeMillis());
        PutDataRequest request = mapRequest.asPutDataRequest();
        request.setUrgent();
        Wearable.getDataClient(getApplicationContext()).putDataItem(request);
    }

    private void deleteDataItem(Uri uri) {
        if (uri == null) {
            return;
        }
        Wearable.getDataClient(getApplicationContext()).deleteDataItems(uri);
    }

    private static final class WakeCandidate {
        final Uri uri;
        final String pathSessionId;
        final String ownerId;
        final String phrase;
        final String sessionId;
        final int sampleRate;
        final int sampleCount;
        final long createdAtMillis;
        final byte[] pcm16le;

        WakeCandidate(
            Uri uri,
            String pathSessionId,
            String ownerId,
            String phrase,
            String sessionId,
            int sampleRate,
            int sampleCount,
            long createdAtMillis,
            byte[] pcm16le
        ) {
            this.uri = uri;
            this.pathSessionId = pathSessionId;
            this.ownerId = ownerId;
            this.phrase = phrase;
            this.sessionId = sessionId;
            this.sampleRate = sampleRate;
            this.sampleCount = sampleCount;
            this.createdAtMillis = createdAtMillis;
            this.pcm16le = pcm16le == null ? null : pcm16le.clone();
        }
    }
}
