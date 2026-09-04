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
    private static final String WAKE_CAMPPLUS_TEMPLATE_KEY =
        "owner_wake_campplus_embedding";
    private static final String WAKE_ERES2NET_TEMPLATE_KEY =
        "owner_wake_eres2net_embedding";
    private static final String WAKE_CAMPPLUS_VARIATION_PREFIX =
        "owner_wake_campplus_variation_";
    private static final String WAKE_ERES2NET_VARIATION_PREFIX =
        "owner_wake_eres2net_variation_";
    private static final String WAKE_TEMPLATE_PHRASE_KEY =
        "owner_wake_phrase";
    private static final String PROFILE_VERSION_KEY = "profile_version";
    private static final String CAMPPLUS_MODEL_ASSET = "sol-speaker-campplus.onnx";
    private static final String ERES2NET_MODEL_ASSET = "sol-speaker-eres2net.onnx";
    private static final int PROFILE_VERSION = 3;
    private static final int SAMPLE_RATE = 16000;
    private static final int RECORD_MS = 5200;
    private static final int FRAME_SAMPLES = 320;
    private static final int MIN_ACTIVE_FRAMES = 45;
    private static final int MAX_SPEECH_GAP_FRAMES = 12;
    private static final int SPEECH_PADDING_FRAMES = 6;
    private static final float MIN_SPEECH_RMS = 0.008f;
    private static final int REQUIRED_SAMPLES = 3;
    private static final int MAX_WAKE_VARIATIONS = 3;
    private static final float WAKE_VARIATION_DUPLICATE_SCORE = 0.985f;

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

    private static final class CapturedVoice {
        final DualEmbedding fullSentence;
        final DualEmbedding wakePhrase;

        CapturedVoice(
            DualEmbedding fullSentence,
            DualEmbedding wakePhrase
        ) {
            this.fullSentence = fullSentence;
            this.wakePhrase = wakePhrase;
        }
    }

    private static final class ProfileScore {
        final float score;
        final float minimum;

        ProfileScore(float score, float minimum) {
            this.score = score;
            this.minimum = minimum;
        }
    }

    private static final class PairedScore {
        final boolean scored;
        final boolean accepted;
        final float campplus;
        final float eres2net;

        PairedScore(
            boolean scored,
            boolean accepted,
            float campplus,
            float eres2net
        ) {
            this.scored = scored;
            this.accepted = accepted;
            this.campplus = campplus;
            this.eres2net = eres2net;
        }
    }

    static final class WakeVerification {
        final boolean accepted;
        final float campplusScore;
        final float eres2netScore;
        final boolean templateUsed;

        WakeVerification(
            boolean accepted,
            float campplusScore,
            float eres2netScore,
            boolean templateUsed
        ) {
            this.accepted = accepted;
            this.campplusScore = campplusScore;
            this.eres2netScore = eres2netScore;
            this.templateUsed = templateUsed;
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
        out.put("wakeVoiceReady", isWakeVoiceReady(getContext()));
        out.put("wakeVoiceVariationCount", wakeVariationCount(getContext()));
        out.put("wakeVoiceVariationCapacity", MAX_WAKE_VARIATIONS);
        out.put("ownerId", WakePhraseMatcher.OWNER_ID);
        out.put("wakeName", WakePhraseMatcher.OWNER_NAME);
        out.put("wakePhrase", WakePhraseMatcher.CANONICAL_PHRASE);
        out.put("profileVersion", PROFILE_VERSION);
        out.put(
            "campplusWakeThreshold",
            SpeakerVerificationPolicy.WAKE_TEMPLATE_CAMPPLUS_THRESHOLD
        );
        out.put(
            "eres2netWakeThreshold",
            SpeakerVerificationPolicy.WAKE_TEMPLATE_ERES2NET_THRESHOLD
        );
        out.put(
            "campplusWakeFallbackThreshold",
            SpeakerVerificationPolicy.WAKE_DUAL_CAMPPLUS_THRESHOLD
        );
        out.put(
            "eres2netWakeFallbackThreshold",
            SpeakerVerificationPolicy.WAKE_DUAL_ERES2NET_THRESHOLD
        );
        out.put("eres2netFullTestThreshold", SpeakerVerificationPolicy.ERES2NET_OWNER_THRESHOLD);
        out.put("wakePolicy", "owner-bound-personal-phrase-multi-template-voice");
        out.put("profileComparison", "normalized-centroid-and-paired-samples");
        out.put("primarySpeakerModel", "eres2net");
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

    static boolean isWakeVoiceReady(Context context) {
        SharedPreferences preferences = profilePrefs(context);
        String wakePhrase = preferences.getString(
            WAKE_TEMPLATE_PHRASE_KEY,
            ""
        );
        if (
            preferences.getInt(PROFILE_VERSION_KEY, 0) != PROFILE_VERSION
                || !WakePhraseMatcher.CANONICAL_PHRASE.equals(wakePhrase)
        ) {
            return false;
        }
        if (
            hasStoredEmbeddingPair(
                preferences,
                WAKE_CAMPPLUS_TEMPLATE_KEY,
                WAKE_ERES2NET_TEMPLATE_KEY
            )
        ) {
            return true;
        }
        return wakeVariationCount(preferences) > 0;
    }

    private static int wakeVariationCount(Context context) {
        return wakeVariationCount(profilePrefs(context));
    }

    private static int wakeVariationCount(SharedPreferences preferences) {
        int count = 0;
        for (int slot = 1; slot <= MAX_WAKE_VARIATIONS; slot++) {
            if (
                hasStoredEmbeddingPair(
                    preferences,
                    WAKE_CAMPPLUS_VARIATION_PREFIX + slot,
                    WAKE_ERES2NET_VARIATION_PREFIX + slot
                )
            ) {
                count++;
            }
        }
        return count;
    }

    private static boolean hasStoredEmbeddingPair(
        SharedPreferences preferences,
        String campplusKey,
        String eres2netKey
    ) {
        String campplus = preferences.getString(campplusKey, "");
        String eres2net = preferences.getString(eres2netKey, "");
        return campplus != null
            && !campplus.isEmpty()
            && eres2net != null
            && !eres2net.isEmpty();
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
                CapturedVoice capturedVoice = captureVoice();
                DualEmbedding embedding = capturedVoice.fullSentence;
                int next = Math.min(sampleCount() + 1, REQUIRED_SAMPLES);
                SharedPreferences.Editor editor = prefs().edit()
                    .putInt(PROFILE_VERSION_KEY, PROFILE_VERSION)
                    .putString(CAMPPLUS_SAMPLE_PREFIX + next, encode(embedding.campplus))
                    .putString(ERES2NET_SAMPLE_PREFIX + next, encode(embedding.eres2net));
                if (capturedVoice.wakePhrase != null) {
                    putPrimaryWakeTemplate(editor, capturedVoice.wakePhrase);
                    putWakeVariation(editor, next, capturedVoice.wakePhrase);
                }
                editor.apply();
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
                CapturedVoice capturedVoice = captureVoice();
                DualEmbedding current = capturedVoice.fullSentence;
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
                boolean accepted = SpeakerVerificationPolicy.isOwner(
                    campplus.score,
                    eres2net.score
                );
                if (accepted && capturedVoice.wakePhrase != null) {
                    rememberVerifiedWakeVariation(
                        getContext(),
                        capturedVoice.wakePhrase,
                        true
                    );
                }
                JSObject out = status();
                out.put("campplusScore", campplus.score);
                out.put("campplusMinimum", campplus.minimum);
                out.put("eres2netScore", eres2net.score);
                out.put("eres2netMinimum", eres2net.minimum);
                out.put("score", eres2net.score);
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

    private CapturedVoice captureVoice() throws Exception {
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
            // Enrollment, the explicit security test and the background
            // wake service must use the same unmodified source. Samsung's
            // VOICE_RECOGNITION processing can otherwise create a template
            // that does not match the later MIC wake capture.
            MediaRecorder.AudioSource.MIC,
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
            DualEmbedding fullSentence = new DualEmbedding(
                computeEmbedding(localCampplusExtractor, voicedSamples),
                computeEmbedding(localEres2netExtractor, voicedSamples)
            );
            DualEmbedding wakePhrase = null;
            try {
                float[] wakeSamples = WakeVoiceTemplateSelector.extract(
                    captured,
                    capturedCount
                );
                wakePhrase = new DualEmbedding(
                    computeEmbedding(localCampplusExtractor, wakeSamples),
                    computeEmbedding(localEres2netExtractor, wakeSamples)
                );
            } catch (RuntimeException ignored) {
                // The strict full-sentence result remains valid. Without a
                // clean leading personal wake segment no wake template is saved.
            }
            return new CapturedVoice(fullSentence, wakePhrase);
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

        // The live ring window can still contain an older spoken fragment
        // before the detected phrase. Enrollment deliberately stores the
        // leading "Hey Pam" clause; the live path deliberately selects the
        // latest complete clause from its bounded tail window.
        float[] voicedSamples = WakeVoiceTemplateSelector.extractLatest(
            captured,
            capturedCount
        );
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

            float[] campplusEmbedding = computeEmbedding(
                localCampplusExtractor,
                voicedSamples
            );
            float[] eres2netEmbedding = computeEmbedding(
                localEres2netExtractor,
                voicedSamples
            );
            boolean templateAvailable = isWakeVoiceReady(context);
            PairedScore templateScore = new PairedScore(
                false,
                false,
                Float.NaN,
                Float.NaN
            );

            if (templateAvailable) {
                try {
                    templateScore = scoreAgainstWakeTemplates(
                        context,
                        campplusEmbedding,
                        eres2netEmbedding
                    );
                } catch (RuntimeException ignored) {
                    // A missing or damaged legacy wake template must not make
                    // an otherwise intact 3/3 owner profile unusable.
                }
            }

            PairedScore profileScore = scoreWakeAgainstProfile(
                context,
                campplusEmbedding,
                eres2netEmbedding
            );
            boolean templateAccepted = templateScore.accepted;
            boolean profileAccepted = profileScore.accepted;
            boolean accepted = templateAccepted || profileAccepted;

            // Profiles created before wake templates existed keep their three
            // verified samples. Every accepted personal wake phrase can fill
            // one empty variation slot, but existing trusted variants are
            // never overwritten automatically. This widens Pam's normal voice
            // range without allowing unbounded template drift.
            if (accepted) {
                rememberVerifiedWakeVariation(
                    context,
                    new DualEmbedding(campplusEmbedding, eres2netEmbedding),
                    profileAccepted && !templateAccepted
                );
            }

            // "templateUsed" tells the UI whether a usable personal template
            // was actually compared. It must not be confused with acceptance;
            // otherwise every ordinary rejection falsely asks Pam to repeat
            // the already completed security test.
            boolean templateUsed = templateScore.scored;
            float campplusScore = templateScore.scored
                ? templateScore.campplus
                : profileScore.campplus;
            float eres2netScore = templateScore.scored
                ? templateScore.eres2net
                : profileScore.eres2net;

            return new WakeVerification(
                accepted,
                campplusScore,
                eres2netScore,
                templateUsed
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
        return extractVoicedSamples(
            captured,
            count,
            MIN_ACTIVE_FRAMES,
            MAX_SPEECH_GAP_FRAMES,
            SPEECH_PADDING_FRAMES,
            "Die Stimmprobe war zu kurz – bitte den angezeigten Prüfsatz vollständig sagen"
        );
    }

    private static float[] extractVoicedSamples(
        short[] captured,
        int count,
        int minimumActiveFrames,
        int maximumSpeechGapFrames,
        int paddingFrames,
        String tooShortMessage
    ) {
        if (count < FRAME_SAMPLES * minimumActiveFrames) {
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
                    || frame - regionLastActive - 1 > maximumSpeechGapFrames
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

        if (bestActiveFrames < minimumActiveFrames || bestStart < 0) {
            throw new IllegalStateException(tooShortMessage);
        }

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

    private static PairedScore scoreWakeAgainstProfile(
        Context context,
        float[] campplusCurrent,
        float[] eres2netCurrent
    ) {
        SharedPreferences preferences = profilePrefs(context);
        if (preferences.getInt(PROFILE_VERSION_KEY, 0) != PROFILE_VERSION) {
            throw new IllegalStateException("Stimmprofil ist nicht aktuell");
        }

        float[][] campplusSaved = new float[REQUIRED_SAMPLES][];
        float[][] eres2netSaved = new float[REQUIRED_SAMPLES][];
        PairedScore best = new PairedScore(
            false,
            false,
            Float.NaN,
            Float.NaN
        );

        for (int index = 0; index < REQUIRED_SAMPLES; index++) {
            String campplusEncoded = preferences.getString(
                CAMPPLUS_SAMPLE_PREFIX + (index + 1),
                ""
            );
            String eres2netEncoded = preferences.getString(
                ERES2NET_SAMPLE_PREFIX + (index + 1),
                ""
            );
            if (
                campplusEncoded == null
                    || campplusEncoded.isEmpty()
                    || eres2netEncoded == null
                    || eres2netEncoded.isEmpty()
            ) {
                throw new IllegalStateException("Stimmprofil ist unvollständig");
            }
            campplusSaved[index] = decode(campplusEncoded);
            eres2netSaved[index] = decode(eres2netEncoded);
            if (
                campplusSaved[index].length != campplusCurrent.length
                    || eres2netSaved[index].length != eres2netCurrent.length
            ) {
                throw new IllegalStateException("Stimmprofil ist beschädigt");
            }
            best = selectBetterPairedScore(
                best,
                SpeakerVerificationPolicy.cosine(
                    campplusSaved[index],
                    campplusCurrent
                ),
                SpeakerVerificationPolicy.cosine(
                    eres2netSaved[index],
                    eres2netCurrent
                ),
                false
            );
        }

        best = selectBetterPairedScore(
            best,
            SpeakerVerificationPolicy.cosine(
                SpeakerVerificationPolicy.normalizedCentroid(campplusSaved),
                campplusCurrent
            ),
            SpeakerVerificationPolicy.cosine(
                SpeakerVerificationPolicy.normalizedCentroid(eres2netSaved),
                eres2netCurrent
            ),
            false
        );
        return best;
    }

    private static PairedScore scoreAgainstWakeTemplates(
        Context context,
        float[] campplusCurrent,
        float[] eres2netCurrent
    ) {
        SharedPreferences preferences = profilePrefs(context);
        if (preferences.getInt(PROFILE_VERSION_KEY, 0) != PROFILE_VERSION) {
            throw new IllegalStateException("Stimmprofil ist nicht aktuell");
        }
        PairedScore best = new PairedScore(
            false,
            false,
            Float.NaN,
            Float.NaN
        );
        best = scoreStoredWakePair(
            preferences,
            WAKE_CAMPPLUS_TEMPLATE_KEY,
            WAKE_ERES2NET_TEMPLATE_KEY,
            campplusCurrent,
            eres2netCurrent,
            best
        );
        for (int slot = 1; slot <= MAX_WAKE_VARIATIONS; slot++) {
            best = scoreStoredWakePair(
                preferences,
                WAKE_CAMPPLUS_VARIATION_PREFIX + slot,
                WAKE_ERES2NET_VARIATION_PREFIX + slot,
                campplusCurrent,
                eres2netCurrent,
                best
            );
        }
        if (!best.scored) {
            throw new IllegalStateException("Kurz-Weckruf ist noch nicht kalibriert");
        }
        return best;
    }

    private static PairedScore scoreStoredWakePair(
        SharedPreferences preferences,
        String campplusKey,
        String eres2netKey,
        float[] campplusCurrent,
        float[] eres2netCurrent,
        PairedScore best
    ) {
        if (!hasStoredEmbeddingPair(preferences, campplusKey, eres2netKey)) {
            return best;
        }
        try {
            float[] campplusSaved = decode(
                preferences.getString(campplusKey, "")
            );
            float[] eres2netSaved = decode(
                preferences.getString(eres2netKey, "")
            );
            if (
                campplusSaved.length != campplusCurrent.length
                    || eres2netSaved.length != eres2netCurrent.length
            ) {
                return best;
            }
            return selectBetterPairedScore(
                best,
                SpeakerVerificationPolicy.cosine(
                    campplusSaved,
                    campplusCurrent
                ),
                SpeakerVerificationPolicy.cosine(
                    eres2netSaved,
                    eres2netCurrent
                ),
                true
            );
        } catch (RuntimeException ignored) {
            return best;
        }
    }

    private static PairedScore selectBetterPairedScore(
        PairedScore current,
        float campplusScore,
        float eres2netScore,
        boolean shortTemplate
    ) {
        boolean accepted = shortTemplate
            ? SpeakerVerificationPolicy.isWakeTemplateOwner(
                campplusScore,
                eres2netScore
            )
            : SpeakerVerificationPolicy.isWakeOwner(
                campplusScore,
                eres2netScore
            );
        PairedScore candidate = new PairedScore(
            true,
            accepted,
            campplusScore,
            eres2netScore
        );
        if (!current.scored || (candidate.accepted && !current.accepted)) {
            return candidate;
        }
        if (current.accepted && !candidate.accepted) {
            return current;
        }
        return pairedScoreQuality(candidate) > pairedScoreQuality(current)
            ? candidate
            : current;
    }

    private static float pairedScoreQuality(PairedScore score) {
        return Math.min(score.campplus, score.eres2net)
            + 0.25f * (score.campplus + score.eres2net);
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
        float[][] savedEmbeddings = new float[REQUIRED_SAMPLES][];
        float minimum = Float.POSITIVE_INFINITY;
        for (int i = 0; i < REQUIRED_SAMPLES; i++) {
            String encoded = preferences.getString(prefix + (i + 1), "");
            if (encoded == null || encoded.isEmpty()) {
                throw new IllegalStateException("Stimmprofil ist unvollständig");
            }
            float[] saved = decode(encoded);
            if (saved.length != current.length) {
                throw new IllegalStateException("Stimmprofil ist beschädigt");
            }
            savedEmbeddings[i] = saved;
            minimum = Math.min(
                minimum,
                SpeakerVerificationPolicy.cosine(saved, current)
            );
        }
        float[] centroid = SpeakerVerificationPolicy.normalizedCentroid(savedEmbeddings);
        return new ProfileScore(
            SpeakerVerificationPolicy.cosine(centroid, current),
            minimum
        );
    }

    private static void rememberVerifiedWakeVariation(
        Context context,
        DualEmbedding embedding,
        boolean updatePrimary
    ) {
        SharedPreferences preferences = profilePrefs(context);
        if (preferences.getInt(PROFILE_VERSION_KEY, 0) != PROFILE_VERSION) {
            return;
        }

        boolean phraseChanged = !WakePhraseMatcher.CANONICAL_PHRASE.equals(
            preferences.getString(WAKE_TEMPLATE_PHRASE_KEY, "")
        );
        SharedPreferences.Editor editor = preferences.edit();
        if (phraseChanged) {
            for (int slot = 1; slot <= MAX_WAKE_VARIATIONS; slot++) {
                editor
                    .remove(WAKE_CAMPPLUS_VARIATION_PREFIX + slot)
                    .remove(WAKE_ERES2NET_VARIATION_PREFIX + slot);
            }
        }
        if (
            phraseChanged
                || updatePrimary
                || !hasStoredEmbeddingPair(
                    preferences,
                    WAKE_CAMPPLUS_TEMPLATE_KEY,
                    WAKE_ERES2NET_TEMPLATE_KEY
                )
        ) {
            putPrimaryWakeTemplate(editor, embedding);
        } else {
            editor.putString(
                WAKE_TEMPLATE_PHRASE_KEY,
                WakePhraseMatcher.CANONICAL_PHRASE
            );
        }

        int emptySlot = phraseChanged ? 1 : 0;
        boolean duplicate = false;
        if (!phraseChanged) {
            for (int slot = 1; slot <= MAX_WAKE_VARIATIONS; slot++) {
                String campplusKey = WAKE_CAMPPLUS_VARIATION_PREFIX + slot;
                String eres2netKey = WAKE_ERES2NET_VARIATION_PREFIX + slot;
                if (
                    !hasStoredEmbeddingPair(
                        preferences,
                        campplusKey,
                        eres2netKey
                    )
                ) {
                    if (emptySlot == 0) emptySlot = slot;
                    continue;
                }
                try {
                    float campplusSimilarity = SpeakerVerificationPolicy.cosine(
                        decode(preferences.getString(campplusKey, "")),
                        embedding.campplus
                    );
                    float eres2netSimilarity = SpeakerVerificationPolicy.cosine(
                        decode(preferences.getString(eres2netKey, "")),
                        embedding.eres2net
                    );
                    if (
                        campplusSimilarity >= WAKE_VARIATION_DUPLICATE_SCORE
                            && eres2netSimilarity >= WAKE_VARIATION_DUPLICATE_SCORE
                    ) {
                        duplicate = true;
                        break;
                    }
                } catch (RuntimeException ignored) {
                    // A damaged optional variation is ignored; the primary and
                    // other owner samples remain usable.
                }
            }
        }
        if (!duplicate && emptySlot > 0) {
            putWakeVariation(editor, emptySlot, embedding);
        }
        editor.apply();
    }

    private static void putPrimaryWakeTemplate(
        SharedPreferences.Editor editor,
        DualEmbedding embedding
    ) {
        editor
            .putString(
                WAKE_CAMPPLUS_TEMPLATE_KEY,
                encode(embedding.campplus)
            )
            .putString(
                WAKE_ERES2NET_TEMPLATE_KEY,
                encode(embedding.eres2net)
            )
            .putString(
                WAKE_TEMPLATE_PHRASE_KEY,
                WakePhraseMatcher.CANONICAL_PHRASE
            );
    }

    private static void putWakeVariation(
        SharedPreferences.Editor editor,
        int slot,
        DualEmbedding embedding
    ) {
        if (slot < 1 || slot > MAX_WAKE_VARIATIONS) {
            throw new IllegalArgumentException("Ungültiger Stimmvarianten-Platz");
        }
        editor
            .putString(
                WAKE_CAMPPLUS_VARIATION_PREFIX + slot,
                encode(embedding.campplus)
            )
            .putString(
                WAKE_ERES2NET_VARIATION_PREFIX + slot,
                encode(embedding.eres2net)
            )
            .putString(
                WAKE_TEMPLATE_PHRASE_KEY,
                WakePhraseMatcher.CANONICAL_PHRASE
            );
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
