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
    private static final String SAMPLE_PREFIX = "owner_embedding_";
    private static final String MODEL_ASSET = "sol-speaker-model.onnx";
    private static final int SAMPLE_RATE = 16000;
    private static final int RECORD_MS = 3200;
    private static final int REQUIRED_SAMPLES = 3;
    private static final float TEST_THRESHOLD = 0.68f;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private SpeakerEmbeddingExtractor extractor;

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private int sampleCount() {
        int count = 0;
        for (int i = 1; i <= REQUIRED_SAMPLES; i++) {
            if (prefs().contains(SAMPLE_PREFIX + i)) count++;
        }
        return count;
    }

    private JSObject status() {
        JSObject out = new JSObject();
        int count = sampleCount();
        out.put("sampleCount", count);
        out.put("requiredSamples", REQUIRED_SAMPLES);
        out.put("profileReady", count >= REQUIRED_SAMPLES);
        out.put("threshold", TEST_THRESHOLD);
        out.put("localOnly", true);
        out.put("rawAudioStored", false);
        return out;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void clearProfile(PluginCall call) {
        prefs().edit().clear().apply();
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
                float[] embedding = captureEmbedding();
                int next = Math.min(sampleCount() + 1, REQUIRED_SAMPLES);
                prefs().edit().putString(SAMPLE_PREFIX + next, encode(embedding)).apply();
                JSObject out = status();
                out.put("savedSample", next);
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
                float[] current = captureEmbedding();
                float[] owner = ownerMeanEmbedding();
                float score = cosine(owner, current);
                JSObject out = status();
                out.put("score", score);
                out.put("accepted", score >= TEST_THRESHOLD);
                resolveOnMain(call, out);
            } catch (Exception error) {
                rejectOnMain(call, "Stimmtest konnte nicht verarbeitet werden: " + error.getMessage(), error);
            } finally {
                resumeWakeService();
            }
        });
    }

    private float[] captureEmbedding() throws Exception {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            throw new IllegalStateException("Mikrofonfreigabe fehlt");
        }

        SpeakerEmbeddingExtractor localExtractor = extractor();
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

        OnlineStream stream = null;
        try {
            stream = localExtractor.createStream();
            recorder.startRecording();
            long deadline = System.currentTimeMillis() + RECORD_MS;
            short[] buffer = new short[1600];
            while (System.currentTimeMillis() < deadline) {
                int n = recorder.read(buffer, 0, buffer.length);
                if (n <= 0) continue;
                float[] samples = new float[n];
                for (int i = 0; i < n; i++) samples[i] = buffer[i] / 32768.0f;
                stream.acceptWaveform(samples, SAMPLE_RATE);
            }
            stream.inputFinished();
            if (!localExtractor.isReady(stream)) {
                throw new IllegalStateException("Die Stimmprobe war zu kurz oder zu leise");
            }
            return localExtractor.compute(stream);
        } finally {
            try { recorder.stop(); } catch (Exception ignored) {}
            recorder.release();
            if (stream != null) stream.release();
        }
    }

    private synchronized SpeakerEmbeddingExtractor extractor() {
        if (extractor != null) return extractor;
        SpeakerEmbeddingExtractorConfig config = new SpeakerEmbeddingExtractorConfig(
            MODEL_ASSET,
            2,
            false,
            "cpu"
        );
        extractor = new SpeakerEmbeddingExtractor(getContext().getAssets(), config);
        return extractor;
    }

    private float[] ownerMeanEmbedding() {
        float[][] all = new float[REQUIRED_SAMPLES][];
        for (int i = 0; i < REQUIRED_SAMPLES; i++) {
            String encoded = prefs().getString(SAMPLE_PREFIX + (i + 1), "");
            if (encoded == null || encoded.isEmpty()) {
                throw new IllegalStateException("Stimmprofil ist unvollständig");
            }
            all[i] = decode(encoded);
        }
        int dim = all[0].length;
        float[] mean = new float[dim];
        for (float[] embedding : all) {
            if (embedding.length != dim) throw new IllegalStateException("Stimmprofil ist beschädigt");
            for (int i = 0; i < dim; i++) mean[i] += embedding[i];
        }
        for (int i = 0; i < dim; i++) mean[i] /= REQUIRED_SAMPLES;
        return mean;
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
        if (extractor != null) {
            extractor.release();
            extractor = null;
        }
        super.handleOnDestroy();
    }
}
