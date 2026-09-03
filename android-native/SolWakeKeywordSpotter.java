package com.solholo.app;

import android.content.Context;

import com.k2fsa.sherpa.onnx.FeatureConfig;
import com.k2fsa.sherpa.onnx.KeywordSpotter;
import com.k2fsa.sherpa.onnx.KeywordSpotterConfig;
import com.k2fsa.sherpa.onnx.KeywordSpotterResult;
import com.k2fsa.sherpa.onnx.OnlineModelConfig;
import com.k2fsa.sherpa.onnx.OnlineStream;
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig;

import java.io.IOException;

/**
 * Small, fully local open-vocabulary keyword spotter for the one configured
 * wake phrase. It consumes the same PCM samples later checked by both speaker
 * models; no Android SpeechRecognizer hand-off and no network are involved.
 */
final class SolWakeKeywordSpotter implements AutoCloseable {
    static final int SAMPLE_RATE = 16_000;

    private static final String ENCODER_ASSET = "sol-kws-encoder.int8.onnx";
    private static final String DECODER_ASSET = "sol-kws-decoder.onnx";
    private static final String JOINER_ASSET = "sol-kws-joiner.int8.onnx";
    private static final String TOKENS_ASSET = "sol-kws-tokens.txt";
    private static final String KEYWORDS_ASSET = "sol-kws-keywords.txt";

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
        OnlineTransducerModelConfig transducer =
            new OnlineTransducerModelConfig();
        transducer.setEncoder(ENCODER_ASSET);
        transducer.setDecoder(DECODER_ASSET);
        transducer.setJoiner(JOINER_ASSET);

        OnlineModelConfig model = new OnlineModelConfig();
        model.setTransducer(transducer);
        model.setTokens(TOKENS_ASSET);
        model.setNumThreads(2);
        model.setDebug(false);
        model.setProvider("cpu");
        model.setModelType("zipformer2");

        FeatureConfig features = new FeatureConfig();
        features.setSampleRate(SAMPLE_RATE);
        features.setFeatureDim(80);
        features.setDither(0.0f);

        KeywordSpotterConfig config = new KeywordSpotterConfig();
        config.setFeatConfig(features);
        config.setModelConfig(model);
        config.setMaxActivePaths(4);
        config.setKeywordsFile(KEYWORDS_ASSET);
        config.setKeywordsScore(1.5f);
        config.setKeywordsThreshold(0.25f);
        config.setNumTrailingBlanks(1);

        spotter = new KeywordSpotter(context.getAssets(), config);
        stream = spotter.createStream("");
        if (stream.getPtr() == 0L) {
            spotter.release();
            throw new IllegalStateException("Hey-Pam-Erkennungsstream konnte nicht starten");
        }
    }

    Detection accept(short[] pcm, int count) {
        if (closed) {
            throw new IllegalStateException("Hey-Pam-Erkennung ist bereits beendet");
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

}
