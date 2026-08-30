package com.solholo.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Handler;
import android.os.Looper;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.k2fsa.sherpa.onnx.OnlineStream;
import com.k2fsa.sherpa.onnx.SpeakerEmbeddingExtractor;
import com.k2fsa.sherpa.onnx.SpeakerEmbeddingExtractorConfig;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;
import java.util.Base64;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "SolSpeakerIdentity",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class SolSpeakerIdentityPlugin extends Plugin {
    private static final String PREFS = "sol_holo_speaker_identity";
    private static final String CAMPPLUS_SAMPLE_PREFIX = "owner_campplus_embedding_";
    private static final String ERES2NET_SAMPLE_PREFIX = "owner_eres2net_embedding_";
    private static final String PROFILE_VERSION_KEY = "profile_version";
    private static final String CAMPPLUS_MODEL_ASSET = "sol-speaker-campplus.onnx";
    private static final String ERES2NET_MODEL_ASSET = "sol-speaker-eres2net.onnx";
    private static final int PROFILE_VERSION = 3;
    private static final int SAMPLE_RATE = 16000;
    private static final int RECORD_MS = 5200;
    private static final int FRAME_SAMPLES = 320;
    private static final int MIN_ACTIVE_FRAMES = 45;
    private static final int MAX_SPEECH_GAP_FRAMES = 12;
    private static final float MIN_SPEECH_RMS = 0.008f;
    private static final int REQUIRED_SAMPLES = 3;
    static final float CAMPPLUS_WAKE_THRESHOLD = 0.86f;
    static final float ERES2NET_WAKE_THRESHOLD = 0.65f;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private SpeakerEmbeddingExtractor campplusExtractor;
    private SpeakerEmbeddingExtractor eres2netExtractor;

    private static final class DualEmbedding {
        final float[] campplus;
        final float[] eres2net;

        DualEmbedding(float[] campplus, float[] eres2net) {
            this.campplus = campplus;
            this.eres2net = eres2net;
        }
    }

    private static final class ProfileScore {
        final float median;
        final float minimum;

        ProfileScore(float median, float minimum) {
            this.median = median;
            this.minimum = minimum;
        }
    }

    static final class WakeVerification {
        final boolean accepted;
        final float campplusScore;
        final float eres2netScore;

        WakeVerification(
            boolean accepted,
            float campplusScore,
            float eres2netScore
        ) {
            this.accepted = accepted;
            this.campplusScore = campplusScore;
            this.eres2netScore = eres2netScore;
        }
    }

    private static SharedPreferences profilePrefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private SharedPreferences prefs() {
        return profilePrefs(getContext());
    }

    private void ensureProfileVersion() {
        if (prefs().getInt(PROFILE_VERSION_KEY, 0) == PROFILE_VERSION) {
            return;
        }
        prefs().edit()
            .clear()
            .putInt(PROFILE_VERSION_KEY, PROFILE_VERSION)
            .apply();
    }

    private int sampleCount() {
        ensureProfileVersion();
        int count = 0;
        for (int i = 1; i <= REQUIRED_SAMPLES; i++) {
            if (
                prefs().contains(CAMPPLUS_SAMPLE_PREFIX + i)
                    && prefs().contains(ERES2NET_SAMPLE_PREFIX + i)
            ) {
                count++;
            }
        }
        return count;
    }

    private JSObject status() {
        JSObject out = new JSObject();
        int count = sampleCount();
        out.put("sampleCount", count);
        out.put("requiredSamples", REQUIRED_SAMPLES);
        out.put("profileReady", count >= REQUIRED_SAMPLES);
        out.put("profileVersion", PROFILE_VERSION);
        out.put("campplusWakeThreshold", CAMPPLUS_WAKE_THRESHOLD);
        out.put("eres2netWakeThreshold", ERES2NET_WAKE_THRESHOLD);
        out.put("localOnly", true);
        out.put("rawAudioStored", false);
        out.put("testOnly", false);
        out.put("securityGateEnabled", true);
        return out;
    }

    static boolean isProfileReady(Context context) {
        SharedPreferences preferences = profilePrefs(context);
        if (preferences.getInt(PROFILE_VERSION_KEY, 0) != PROFILE_VERSION) {
            return false;
        }
        for (int i = 1; i <= REQUIRED_SAMPLES; i++) {
            if (
                !preferences.contains(CAMPPLUS_SAMPLE_PREFIX + i)
                    || !preferences.contains(ERES2NET_SAMPLE_PREFIX + i)
            ) {
                return false;
            }
        }
        return true;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void clearProfile(PluginCall call) {
        prefs().edit()
            .clear()
            .putInt(PROFILE_VERSION_KEY, PROFILE_VERSION)
            .apply();
        getContext()
            .getSharedPreferences(HeyHoSolPlugin.PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(HeyHoSolPlugin.MODE_KEY, HeyHoSolPlugin.MODE_OFF)
            .apply();
        getContext().stopService(new android.content.Intent(
            getContext(),
            HeyHoSolService.class
        ));
        HeyHoSolPlugin.publishStatusEvent();
        call.resolve(status());
    }

    @PluginMethod
    public void enrollSample(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphoneForEnroll");
            return;
        }
        runEnrollment(call);
    }

    @PermissionCallback
    private void microphoneForEnroll(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Ohne Mikrofonfreigabe kann deine Stimme nicht eingerichtet werden.");
            return;
        }
        runEnrollment(call);
    }

    @PluginMethod
    public void verifySample(PluginCall call) {
        if (sampleCount() < REQUIRED_SAMPLES) {
            call.reject("Bitte richte deine Stimme zuerst vollständig ein.");
            return;
        }
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphoneForVerify");
            return;
        }
        runVerification(call);
    }

    @PermissionCallback
    private void microphoneForVerify(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Ohne Mikrofonfreigabe kann die Stimme nicht geprüft werden.");
            return;
        }
        runVerification(call);
    }

    private void runEnrollment(PluginCall call) {
        executor.execute(() -> {
            try {
                pauseWakeService();
                DualEmbedding embedding = captureEmbedding();
                int next = Math.min(sampleCount() + 1, REQUIRED_SAMPLES);
                prefs().edit()
                    .putInt(PROFILE_VERSION_KEY, PROFILE_VERSION)
                    .putString(CAMPPLUS_SAMPLE_PREFIX + next, encode(embedding.campplus))
                    .putString(ERES2NET_SAMPLE_PREFIX + next, encode(embedding.eres2net))
                    .apply();
                JSObject out = status();
                out.put("savedSample", next);
                mainHandler.post(HeyHoSolPlugin::publishStatusEvent);
                resolveOnMain(call, out);
            } catch (Exception error) {
                rejectOnMain(call, "Stimmprobe konnte nicht verarbeitet werden: " + error.getMessage(), error);
            } finally {
                resumeWakeService();
            }
        });
    }

    private void runVerification(PluginCall call) {
        executor.execute(() -> {
            try {
                pauseWakeService();
                DualEmbedding current = captureEmbedding();
                ProfileScore campplus = scoreAgainstProfile(
                    getContext(),
                    CAMPPLUS_SAMPLE_PREFIX,
                    current.campplus
                );
                ProfileScore eres2net = scoreAgainstProfile(
                    getContext(),
                    ERES2NET_SAMPLE_PREFIX,
                    current.eres2net
                );
                boolean accepted =
                    campplus.median >= CAMPPLUS_WAKE_THRESHOLD
                        && eres2net.median >= ERES2NET_WAKE_THRESHOLD;
                JSObject out = status();
                out.put("campplusScore", campplus.median);
                out.put("campplusMinimum", campplus.minimum);
                out.put("eres2netScore", eres2net.median);
                out.put("eres2netMinimum", eres2net.minimum);
                out.put("score", Math.min(campplus.median, eres2net.median));
                out.put("accepted", accepted);
                out.put("decision", accepted ? "owner" : "rejected");
                resolveOnMain(call, out);
            } catch (Exception error) {
                rejectOnMain(call, "Stimmtest konnte nicht verarbeitet werden: " + error.getMessage(), error);
            } finally {
                resumeWakeService();
            }
        });
    }

    private DualEmbedding captureEmbedding() throws Exception {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            throw new IllegalStateException("Mikrofonfreigabe fehlt");
        }

        SpeakerEmbeddingExtractor localCampplusExtractor = campplusExtractor();
        SpeakerEmbeddingExtractor localEres2netExtractor = eres2netExtractor();
        int minBuffer = AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        );
        if (minBuffer <= 0) throw new IllegalStateException("Audio-Puffer nicht verfügbar");

        AudioRecord recorder = new AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            Math.max(minBuffer * 2, SAMPLE_RATE)
        );

        try {
            if (recorder.getState() != AudioRecord.STATE_INITIALIZED) {
                throw new IllegalStateException("Mikrofon konnte nicht vorbereitet werden");
            }

            recorder.startRecording();
            JSObject ready = new JSObject();
            ready.put("ready", true);
            notifyListeners("speakerRecordingReady", ready);
            long deadline = System.currentTimeMillis() + RECORD_MS;
            short[] buffer = new short[1600];
            short[] captured = new short[SAMPLE_RATE * RECORD_MS / 1000];
            int capturedCount = 0;

            while (
                System.currentTimeMillis() < deadline
                    && capturedCount < captured.length
            ) {
                int n = recorder.read(buffer, 0, buffer.length);
                if (n <= 0) continue;
                int copyCount = Math.min(n, captured.length - capturedCount);
                System.arraycopy(buffer, 0, captured, capturedCount, copyCount);
                capturedCount += copyCount;
            }

            float[] voicedSamples = extractVoicedSamples(captured, capturedCount);
            return new DualEmbedding(
                computeEmbedding(localCampplusExtractor, voicedSamples),
                computeEmbedding(localEres2netExtractor, voicedSamples)
            );
        } finally {
            try { recorder.stop(); } catch (Exception ignored) {}
            recorder.release();
        }
    }

    static WakeVerification verifyWakeAudio(
        Context context,
        short[] captured,
        int capturedCount
    ) {
        if (!isProfileReady(context)) {
            throw new IllegalStateException("Stimmprofil ist nicht vollständig eingerichtet");
        }

        float[] voicedSamples = extractVoicedSamples(captured, capturedCount);
        SpeakerEmbeddingExtractor localCampplusExtractor = null;
        SpeakerEmbeddingExtractor localEres2netExtractor = null;

        try {
            localCampplusExtractor = new SpeakerEmbeddingExtractor(
                context.getAssets(),
                new SpeakerEmbeddingExtractorConfig(
                    CAMPPLUS_MODEL_ASSET,
                    2,
                    false,
                    "cpu"
                )
            );
            localEres2netExtractor = new SpeakerEmbeddingExtractor(
                context.getAssets(),
                new SpeakerEmbeddingExtractorConfig(
                    ERES2NET_MODEL_ASSET,
                    2,
                    false,
                    "cpu"
                )
            );

            ProfileScore campplus = scoreAgainstProfile(
                context,
                CAMPPLUS_SAMPLE_PREFIX,
                computeEmbedding(localCampplusExtractor, voicedSamples)
            );
            ProfileScore eres2net = scoreAgainstProfile(
                context,
                ERES2NET_SAMPLE_PREFIX,
                computeEmbedding(localEres2netExtractor, voicedSamples)
            );
            boolean accepted =
                campplus.median >= CAMPPLUS_WAKE_THRESHOLD
                    && eres2net.median >= ERES2NET_WAKE_THRESHOLD;

            return new WakeVerification(
                accepted,
                campplus.median,
                eres2net.median
            );
        } finally {
            if (localCampplusExtractor != null) {
                localCampplusExtractor.release();
            }
            if (localEres2netExtractor != null) {
                localEres2netExtractor.release();
            }
        }
    }

    private static float[] computeEmbedding(
        SpeakerEmbeddingExtractor localExtractor,
        float[] voicedSamples
    ) {
        OnlineStream stream = localExtractor.createStream();
        try {
            stream.acceptWaveform(voicedSamples, SAMPLE_RATE);
            stream.inputFinished();
            if (!localExtractor.isReady(stream)) {
                throw new IllegalStateException(
                    "Die gesprochene Stimmprobe war noch zu kurz oder zu leise"
                );
            }
            return localExtractor.compute(stream);
        } finally {
            stream.release();
        }
    }

    private static float[] extractVoicedSamples(short[] captured, int count) {
        if (count < FRAME_SAMPLES * MIN_ACTIVE_FRAMES) {
            throw new IllegalStateException("Es wurde keine vollständige Stimmprobe aufgenommen");
        }

        int frameCount = count / FRAME_SAMPLES;
        float[] frameRms = new float[frameCount];

        for (int frame = 0; frame < frameCount; frame++) {
            double sum = 0;
            int offset = frame * FRAME_SAMPLES;
            for (int index = 0; index < FRAME_SAMPLES; index++) {
                double sample = captured[offset + index] / 32768.0;
                sum += sample * sample;
            }
            frameRms[frame] = (float)Math.sqrt(sum / FRAME_SAMPLES);
        }

        float[] sortedRms = frameRms.clone();
        Arrays.sort(sortedRms);
        float noiseFloor = sortedRms[(int)Math.floor((sortedRms.length - 1) * 0.20)];
        float speechLevel = sortedRms[(int)Math.floor((sortedRms.length - 1) * 0.90)];

        if (speechLevel < MIN_SPEECH_RMS) {
            throw new IllegalStateException(
                "Keine ausreichend deutliche Stimme erkannt – bitte erst bei JETZT sprechen"
            );
        }

        float activityThreshold = Math.max(
            MIN_SPEECH_RMS,
            noiseFloor + (speechLevel - noiseFloor) * 0.24f
        );
        int regionStart = -1;
        int regionLastActive = -1;
        int regionActiveFrames = 0;
        int bestStart = -1;
        int bestLastActive = -1;
        int bestActiveFrames = 0;

        for (int frame = 0; frame < frameCount; frame++) {
            if (frameRms[frame] < activityThreshold) continue;
            if (
                regionStart < 0
                    || frame - regionLastActive - 1 > MAX_SPEECH_GAP_FRAMES
            ) {
                if (regionActiveFrames > bestActiveFrames) {
                    bestStart = regionStart;
                    bestLastActive = regionLastActive;
                    bestActiveFrames = regionActiveFrames;
                }
                regionStart = frame;
                regionActiveFrames = 0;
            }
            regionLastActive = frame;
            regionActiveFrames++;
        }

        if (regionActiveFrames > bestActiveFrames) {
            bestStart = regionStart;
            bestLastActive = regionLastActive;
            bestActiveFrames = regionActiveFrames;
        }

        if (bestActiveFrames < MIN_ACTIVE_FRAMES || bestStart < 0) {
            throw new IllegalStateException(
                "Die Stimmprobe war zu kurz – bitte den angezeigten Prüfsatz vollständig sagen"
            );
        }

        int paddingFrames = 6;
        int startSample = Math.max(
            0,
            (bestStart - paddingFrames) * FRAME_SAMPLES
        );
        int endSample = Math.min(
            count,
            (bestLastActive + paddingFrames + 1) * FRAME_SAMPLES
        );
        float[] voiced = new float[endSample - startSample];

        for (int index = startSample; index < endSample; index++) {
            voiced[index - startSample] = captured[index] / 32768.0f;
        }

        return voiced;
    }

    private synchronized SpeakerEmbeddingExtractor campplusExtractor() {
        if (campplusExtractor != null) return campplusExtractor;
        SpeakerEmbeddingExtractorConfig config = new SpeakerEmbeddingExtractorConfig(
            CAMPPLUS_MODEL_ASSET,
            2,
            false,
            "cpu"
        );
        campplusExtractor = new SpeakerEmbeddingExtractor(getContext().getAssets(), config);
        return campplusExtractor;
    }

    private synchronized SpeakerEmbeddingExtractor eres2netExtractor() {
        if (eres2netExtractor != null) return eres2netExtractor;
        SpeakerEmbeddingExtractorConfig config = new SpeakerEmbeddingExtractorConfig(
            ERES2NET_MODEL_ASSET,
            2,
            false,
            "cpu"
        );
        eres2netExtractor = new SpeakerEmbeddingExtractor(getContext().getAssets(), config);
        return eres2netExtractor;
    }

    private static ProfileScore scoreAgainstProfile(
        Context context,
        String prefix,
        float[] current
    ) {
        SharedPreferences preferences = profilePrefs(context);
        if (preferences.getInt(PROFILE_VERSION_KEY, 0) != PROFILE_VERSION) {
            throw new IllegalStateException("Stimmprofil ist nicht aktuell");
        }
        float[] scores = new float[REQUIRED_SAMPLES];
        for (int i = 0; i < REQUIRED_SAMPLES; i++) {
            String encoded = preferences.getString(prefix + (i + 1), "");
            if (encoded == null || encoded.isEmpty()) {
                throw new IllegalStateException("Stimmprofil ist unvollständig");
            }
            float[] saved = decode(encoded);
            if (saved.length != current.length) {
                throw new IllegalStateException("Stimmprofil ist beschädigt");
            }
            scores[i] = cosine(saved, current);
        }
        Arrays.sort(scores);
        return new ProfileScore(scores[1], scores[0]);
    }

    private static float cosine(float[] a, float[] b) {
        if (a.length != b.length) return -1f;
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        if (na == 0 || nb == 0) return -1f;
        return (float)(dot / (Math.sqrt(na) * Math.sqrt(nb)));
    }

    private static String encode(float[] values) {
        ByteBuffer buffer = ByteBuffer.allocate(values.length * 4).order(ByteOrder.LITTLE_ENDIAN);
        for (float value : values) buffer.putFloat(value);
        return Base64.getEncoder().encodeToString(buffer.array());
    }

    private static float[] decode(String encoded) {
        byte[] bytes = Base64.getDecoder().decode(encoded);
        ByteBuffer buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
        float[] values = new float[bytes.length / 4];
        for (int i = 0; i < values.length; i++) values[i] = buffer.getFloat();
        return values;
    }

    private void pauseWakeService() {
        HeyHoSolService.pause(getContext());
        try { Thread.sleep(250); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
    }

    private void resumeWakeService() {
        String mode = getContext()
            .getSharedPreferences(HeyHoSolPlugin.PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getString(HeyHoSolPlugin.MODE_KEY, HeyHoSolPlugin.MODE_OFF);
        HeyHoSolService.resume(getContext(), mode);
    }

    private void resolveOnMain(PluginCall call, JSObject out) {
        mainHandler.post(() -> call.resolve(out));
    }

    private void rejectOnMain(PluginCall call, String message, Exception error) {
        mainHandler.post(() -> call.reject(message, null, error));
    }

    @Override
    protected void handleOnDestroy() {
        executor.shutdownNow();
        if (campplusExtractor != null) {
            campplusExtractor.release();
            campplusExtractor = null;
        }
        if (eres2netExtractor != null) {
            eres2netExtractor.release();
            eres2netExtractor = null;
        }
        super.handleOnDestroy();
    }
}
