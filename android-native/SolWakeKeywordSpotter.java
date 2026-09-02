package com.solholo.app;

import android.content.Context;
import android.content.res.AssetManager;

import com.k2fsa.sherpa.onnx.FeatureConfig;
import com.k2fsa.sherpa.onnx.KeywordSpotter;
import com.k2fsa.sherpa.onnx.KeywordSpotterConfig;
import com.k2fsa.sherpa.onnx.KeywordSpotterResult;
import com.k2fsa.sherpa.onnx.OnlineModelConfig;
import com.k2fsa.sherpa.onnx.OnlineStream;
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Small, fully local open-vocabulary keyword spotter for the one configured
 * wake phrase. It consumes the same PCM samples later checked by both speaker
 * models; no Android SpeechRecognizer hand-off and no network are involved.
 */
final class SolWakeKeywordSpotter implements AutoCloseable {
    static final int SAMPLE_RATE = 16_000;

    private static final String MODEL_VERSION_DIR = "sol-hey-sol-kws-v1";
    private static final String ENCODER_ASSET = "sol-kws-encoder.int8.onnx";
    private static final String DECODER_ASSET = "sol-kws-decoder.onnx";
    private static final String JOINER_ASSET = "sol-kws-joiner.int8.onnx";
    private static final String TOKENS_ASSET = "sol-kws-tokens.txt";
    private static final String KEYWORDS_ASSET = "sol-kws-keywords.txt";
    private static final String[] REQUIRED_ASSETS = {
        ENCODER_ASSET,
        DECODER_ASSET,
        JOINER_ASSET,
        TOKENS_ASSET,
        KEYWORDS_ASSET
    };
    private static final Object ASSET_COPY_LOCK = new Object();

    static final class Detection {
        final String phrase;
        final long firstTokenSample;

        Detection(String phrase, long firstTokenSample) {
            this.phrase = phrase;
            this.firstTokenSample = firstTokenSample;
        }
    }

    private final KeywordSpotter spotter;
    private final OnlineStream stream;
    private boolean closed;

    SolWakeKeywordSpotter(Context context) throws IOException {
        File modelDir = materializeAssets(context);
        OnlineTransducerModelConfig transducer =
            OnlineTransducerModelConfig.builder()
                .setEncoder(new File(modelDir, ENCODER_ASSET).getAbsolutePath())
                .setDecoder(new File(modelDir, DECODER_ASSET).getAbsolutePath())
                .setJoiner(new File(modelDir, JOINER_ASSET).getAbsolutePath())
                .build();
        OnlineModelConfig model = OnlineModelConfig.builder()
            .setTransducer(transducer)
            .setTokens(new File(modelDir, TOKENS_ASSET).getAbsolutePath())
            .setNumThreads(2)
            .setDebug(false)
            .setProvider("cpu")
            .setModelType("zipformer2")
            .build();
        FeatureConfig features = FeatureConfig.builder()
            .setSampleRate(SAMPLE_RATE)
            .setFeatureDim(80)
            .setDither(0.0f)
            .build();
        KeywordSpotterConfig config = KeywordSpotterConfig.builder()
            .setFeatureConfig(features)
            .setOnlineModelConfig(model)
            .setMaxActivePaths(4)
            .setKeywordsFile(
                new File(modelDir, KEYWORDS_ASSET).getAbsolutePath()
            )
            .setKeywordsScore(1.5f)
            .setKeywordsThreshold(0.25f)
            .setNumTrailingBlanks(1)
            .build();

        spotter = new KeywordSpotter(config);
        stream = spotter.createStream();
        if (stream.getPtr() == 0L) {
            spotter.release();
            throw new IllegalStateException("Hey-Sol-Erkennungsstream konnte nicht starten");
        }
    }

    Detection accept(short[] pcm, int count) {
        if (closed) {
            throw new IllegalStateException("Hey-Sol-Erkennung ist bereits beendet");
        }
        if (pcm == null || count <= 0 || count > pcm.length) {
            return null;
        }

        float[] normalized = new float[count];
        for (int index = 0; index < count; index++) {
            normalized[index] = pcm[index] / 32768.0f;
        }
        stream.acceptWaveform(normalized, SAMPLE_RATE);

        while (spotter.isReady(stream)) {
            spotter.decode(stream);
            KeywordSpotterResult result = spotter.getResult(stream);
            String canonical = WakePhraseMatcher.canonicalPhrase(
                result == null ? "" : result.getKeyword()
            );
            if (!canonical.isEmpty()) {
                float[] timestamps = result.getTimestamps();
                long firstTokenSample = 0L;
                if (timestamps != null && timestamps.length > 0) {
                    firstTokenSample = Math.max(
                        0L,
                        Math.round(timestamps[0] * SAMPLE_RATE)
                    );
                }
                return new Detection(canonical, firstTokenSample);
            }
        }
        return null;
    }

    @Override
    public void close() {
        if (closed) {
            return;
        }
        closed = true;
        stream.release();
        spotter.release();
    }

    private static File materializeAssets(Context context) throws IOException {
        synchronized (ASSET_COPY_LOCK) {
            File directory = new File(
                context.getNoBackupFilesDir(),
                MODEL_VERSION_DIR
            );
            if (!directory.isDirectory() && !directory.mkdirs()) {
                throw new IOException("Lokales Hey-Sol-Modellverzeichnis fehlt");
            }

            AssetManager assets = context.getAssets();
            for (String asset : REQUIRED_ASSETS) {
                File target = new File(directory, asset);
                if (target.isFile() && target.length() > 0L) {
                    continue;
                }
                copyAssetAtomically(assets, asset, target);
            }
            return directory;
        }
    }

    private static void copyAssetAtomically(
        AssetManager assets,
        String asset,
        File target
    ) throws IOException {
        File temporary = new File(target.getParentFile(), target.getName() + ".tmp");
        if (temporary.exists() && !temporary.delete()) {
            throw new IOException("Alte temporäre Modelldatei konnte nicht entfernt werden");
        }

        try (
            InputStream input = assets.open(asset);
            FileOutputStream output = new FileOutputStream(temporary)
        ) {
            byte[] buffer = new byte[32 * 1024];
            int count;
            while ((count = input.read(buffer)) >= 0) {
                if (count > 0) {
                    output.write(buffer, 0, count);
                }
            }
            output.getFD().sync();
        } catch (IOException error) {
            temporary.delete();
            throw error;
        }

        if (!temporary.renameTo(target)) {
            temporary.delete();
            throw new IOException("Hey-Sol-Modelldatei konnte nicht aktiviert werden");
        }
    }
}
