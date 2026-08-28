import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const nativeSource = join(projectRoot, "android-native");
const javaTarget = join(
  projectRoot,
  "android",
  "app",
  "src",
  "main",
  "java",
  "com",
  "solholo",
  "app"
);
const manifestPath = join(
  projectRoot,
  "android",
  "app",
  "src",
  "main",
  "AndroidManifest.xml"
);
const mainActivityPath = join(javaTarget, "MainActivity.java");

mkdirSync(javaTarget, { recursive: true });

for (const fileName of [
  "HeyHoSolPlugin.java",
  "HeyHoSolService.java",
  "SolAudioRoutePlugin.java",
  "WhatsAppDrivingModePlugin.java",
  "WhatsAppNotificationListener.java"
]) {
  copyFileSync(join(nativeSource, fileName), join(javaTarget, fileName));
}

let mainActivity = readFileSync(mainActivityPath, "utf8");
if (!mainActivity.includes("registerPlugin(WhatsAppDrivingModePlugin.class)")) {
  if (!mainActivity.includes("import android.os.Bundle;")) {
    mainActivity = mainActivity.replace(
      /package com\.solholo\.app;\s*/,
      "package com.solholo.app;\n\n" +
      "import android.content.Intent;\n" +
      "import android.os.Build;\n" +
      "import android.os.Bundle;\n" +
      "import android.view.WindowManager;\n\n"
    );
  }

  const emptyActivity = /public class MainActivity extends BridgeActivity\s*\{\s*\}/;
  if (!emptyActivity.test(mainActivity)) {
    throw new Error("MainActivity konnte nicht sicher erweitert werden.");
  }

  mainActivity = mainActivity.replace(
    emptyActivity,
    `public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WhatsAppDrivingModePlugin.class);
        super.onCreate(savedInstanceState);
        applyWakeScreenBehavior(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        applyWakeScreenBehavior(intent);
    }

    private void applyWakeScreenBehavior(Intent intent) {
        if (
            intent == null
                || !intent.getBooleanExtra("hey_ho_sol_wake", false)
        ) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            return;
        }

        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        );
    }
}`
  );
}

if (!mainActivity.includes("registerPlugin(HeyHoSolPlugin.class)")) {
  const registrationMarker =
    "        registerPlugin(WhatsAppDrivingModePlugin.class);";
  if (!mainActivity.includes(registrationMarker)) {
    throw new Error("Plugin-Registrierung in MainActivity nicht gefunden.");
  }

  mainActivity = mainActivity.replace(
    registrationMarker,
    registrationMarker + "\n        registerPlugin(HeyHoSolPlugin.class);"
  );
}

if (!mainActivity.includes("registerPlugin(SolAudioRoutePlugin.class)")) {
  const registrationMarker = "        registerPlugin(HeyHoSolPlugin.class);";
  if (!mainActivity.includes(registrationMarker)) {
    throw new Error("Weckruf-Plugin-Registrierung in MainActivity nicht gefunden.");
  }

  mainActivity = mainActivity.replace(
    registrationMarker,
    registrationMarker + "\n        registerPlugin(SolAudioRoutePlugin.class);"
  );
}

writeFileSync(mainActivityPath, mainActivity, "utf8");

let manifest = readFileSync(manifestPath, "utf8");
const manifestMarker =
  '<manifest xmlns:android="http://schemas.android.com/apk/res/android">';

for (const permission of [
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
  '<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />',
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />'
]) {
  if (!manifest.includes(permission)) {
    if (!manifest.includes(manifestMarker)) {
      throw new Error("Manifest-Tag nicht gefunden.");
    }
    manifest = manifest.replace(
      manifestMarker,
      manifestMarker + "\n    " + permission
    );
  }
}

if (!manifest.includes("android.intent.action.TTS_SERVICE")) {
  const applicationMarker = "    <application";
  if (!manifest.includes(applicationMarker)) {
    throw new Error("Application-Tag im Android-Manifest nicht gefunden.");
  }

  manifest = manifest.replace(
    applicationMarker,
    `    <queries>
        <intent>
            <action android:name="android.intent.action.TTS_SERVICE" />
        </intent>
    </queries>

${applicationMarker}`
  );
}

if (!manifest.includes("android.speech.RecognitionService")) {
  const queriesEnd = "    </queries>";
  if (!manifest.includes(queriesEnd)) {
    throw new Error("Queries-Tag im Android-Manifest nicht gefunden.");
  }

  const recognitionQuery = [
    "        <intent>",
    '            <action android:name="android.speech.RecognitionService" />',
    "        </intent>"
  ].join("\n");

  manifest = manifest.replace(
    queriesEnd,
    recognitionQuery + "\n" + queriesEnd
  );
}

if (!manifest.includes(".WhatsAppNotificationListener")) {
  const applicationEnd = "    </application>";
  if (!manifest.includes(applicationEnd)) {
    throw new Error("Application-Ende im Android-Manifest nicht gefunden.");
  }

  manifest = manifest.replace(
    applicationEnd,
    `        <service
            android:name=".WhatsAppNotificationListener"
            android:label="Sol Holo WhatsApp-Fahrmodus"
            android:exported="false"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

${applicationEnd}`
  );
}

if (!manifest.includes(".HeyHoSolService")) {
  const applicationEnd = "    </application>";
  if (!manifest.includes(applicationEnd)) {
    throw new Error("Application-Ende im Android-Manifest nicht gefunden.");
  }

  const wakeService = [
    "        <service",
    '            android:name=".HeyHoSolService"',
    '            android:exported="false"',
    '            android:foregroundServiceType="microphone"',
    '            android:stopWithTask="false" />',
    ""
  ].join("\n");

  manifest = manifest.replace(
    applicationEnd,
    wakeService + "\n" + applicationEnd
  );
}

writeFileSync(manifestPath, manifest, "utf8");
console.log(
  "WhatsApp-Fahrmodus, Sol-Weckruf und Lautsprecherroute wurden in Android eingebunden."
);
