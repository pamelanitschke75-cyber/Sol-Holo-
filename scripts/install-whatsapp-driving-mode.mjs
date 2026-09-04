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
  "HealthConnectPlugin.java",
  "HealthPrivacyActivity.java",
  "HeyHoSolPlugin.java",
  "HeyPamRestartReceiver.java",
  "HeyHoSolService.java",
  "WakeCaptureEndpointer.java",
  "WakeRecognitionLifecyclePolicy.java",
  "WakePhraseMatcher.java",
  "PhoneContactsPlugin.java",
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
        applyWakeScreenBehavior(getIntent());
        super.onCreate(savedInstanceState);
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
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
            return;
        }

        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
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

if (!mainActivity.includes("registerPlugin(PhoneContactsPlugin.class)")) {
  const registrationMarker = "        registerPlugin(SolAudioRoutePlugin.class);";
  if (!mainActivity.includes(registrationMarker)) {
    throw new Error("Audio-Plugin-Registrierung in MainActivity nicht gefunden.");
  }

  mainActivity = mainActivity.replace(
    registrationMarker,
    registrationMarker + "\n        registerPlugin(PhoneContactsPlugin.class);"
  );
}

if (!mainActivity.includes("registerPlugin(HealthConnectPlugin.class)")) {
  const registrationMarker = "        registerPlugin(PhoneContactsPlugin.class);";
  if (!mainActivity.includes(registrationMarker)) {
    throw new Error("Telefon-Plugin-Registrierung in MainActivity nicht gefunden.");
  }

  mainActivity = mainActivity.replace(
    registrationMarker,
    registrationMarker + "\n        registerPlugin(HealthConnectPlugin.class);"
  );
}

if (!mainActivity.includes("handleSharedNoteIntent(this, getIntent())")) {
  const createMarker = "        super.onCreate(savedInstanceState);\n    }";
  if (!mainActivity.includes(createMarker)) {
    throw new Error("onCreate-Markierung für Samsung Notes nicht gefunden.");
  }
  mainActivity = mainActivity.replace(
    createMarker,
    "        super.onCreate(savedInstanceState);\n" +
      "        PhoneContactsPlugin.handleSharedNoteIntent(this, getIntent());\n    }"
  );
}

if (!mainActivity.includes("handleSharedNoteIntent(this, intent)")) {
  const intentMarker = "        applyWakeScreenBehavior(intent);\n    }";
  if (!mainActivity.includes(intentMarker)) {
    throw new Error("onNewIntent-Markierung für Samsung Notes nicht gefunden.");
  }
  mainActivity = mainActivity.replace(
    intentMarker,
    "        applyWakeScreenBehavior(intent);\n" +
      "        PhoneContactsPlugin.handleSharedNoteIntent(this, intent);\n    }"
  );
}

if (!mainActivity.includes("HeyHoSolPlugin.publishPendingWakeEvent();")) {
  const createMarker =
    "        PhoneContactsPlugin.handleSharedNoteIntent(this, getIntent());\n    }";
  if (!mainActivity.includes(createMarker)) {
    throw new Error("onCreate-Markierung für den Sol-Weckruf nicht gefunden.");
  }
  mainActivity = mainActivity.replace(
    createMarker,
    "        PhoneContactsPlugin.handleSharedNoteIntent(this, getIntent());\n" +
      "        HeyHoSolPlugin.publishPendingWakeEvent();\n    }"
  );

  const intentMarker =
    "        PhoneContactsPlugin.handleSharedNoteIntent(this, intent);\n    }";
  if (!mainActivity.includes(intentMarker)) {
    throw new Error("onNewIntent-Markierung für den Sol-Weckruf nicht gefunden.");
  }
  mainActivity = mainActivity.replace(
    intentMarker,
    "        PhoneContactsPlugin.handleSharedNoteIntent(this, intent);\n" +
      "        HeyHoSolPlugin.publishPendingWakeEvent();\n    }"
  );
}

writeFileSync(mainActivityPath, mainActivity, "utf8");

let manifest = readFileSync(manifestPath, "utf8");
const manifestMarker =
  '<manifest xmlns:android="http://schemas.android.com/apk/res/android">';

manifest = manifest.replace(
  'android:allowBackup="true"',
  'android:allowBackup="false"'
);

for (const permission of [
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
  '<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />',
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />',
  '<uses-permission android:name="android.permission.READ_CONTACTS" />',
  '<uses-permission android:name="android.permission.READ_PHONE_STATE" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />',
  '<uses-permission android:name="android.permission.WAKE_LOCK" />',
  '<uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />',
  '<uses-permission android:name="android.permission.health.READ_BASAL_BODY_TEMPERATURE" />',
  '<uses-permission android:name="android.permission.health.READ_BASAL_METABOLIC_RATE" />',
  '<uses-permission android:name="android.permission.health.READ_BLOOD_GLUCOSE" />',
  '<uses-permission android:name="android.permission.health.READ_BLOOD_PRESSURE" />',
  '<uses-permission android:name="android.permission.health.READ_BODY_FAT" />',
  '<uses-permission android:name="android.permission.health.READ_BODY_TEMPERATURE" />',
  '<uses-permission android:name="android.permission.health.READ_BODY_WATER_MASS" />',
  '<uses-permission android:name="android.permission.health.READ_BONE_MASS" />',
  '<uses-permission android:name="android.permission.health.READ_CERVICAL_MUCUS" />',
  '<uses-permission android:name="android.permission.health.READ_CYCLING_PEDALING_CADENCE" />',
  '<uses-permission android:name="android.permission.health.READ_DISTANCE" />',
  '<uses-permission android:name="android.permission.health.READ_ELEVATION_GAINED" />',
  '<uses-permission android:name="android.permission.health.READ_EXERCISE" />',
  '<uses-permission android:name="android.permission.health.READ_FLOORS_CLIMBED" />',
  '<uses-permission android:name="android.permission.health.READ_HEART_RATE" />',
  '<uses-permission android:name="android.permission.health.READ_HEART_RATE_VARIABILITY" />',
  '<uses-permission android:name="android.permission.health.READ_HEIGHT" />',
  '<uses-permission android:name="android.permission.health.READ_HYDRATION" />',
  '<uses-permission android:name="android.permission.health.READ_INTERMENSTRUAL_BLEEDING" />',
  '<uses-permission android:name="android.permission.health.READ_LEAN_BODY_MASS" />',
  '<uses-permission android:name="android.permission.health.READ_MENSTRUATION" />',
  '<uses-permission android:name="android.permission.health.READ_NUTRITION" />',
  '<uses-permission android:name="android.permission.health.READ_OVULATION_TEST" />',
  '<uses-permission android:name="android.permission.health.READ_OXYGEN_SATURATION" />',
  '<uses-permission android:name="android.permission.health.READ_PLANNED_EXERCISE" />',
  '<uses-permission android:name="android.permission.health.READ_POWER" />',
  '<uses-permission android:name="android.permission.health.READ_RESPIRATORY_RATE" />',
  '<uses-permission android:name="android.permission.health.READ_RESTING_HEART_RATE" />',
  '<uses-permission android:name="android.permission.health.READ_SEXUAL_ACTIVITY" />',
  '<uses-permission android:name="android.permission.health.READ_SKIN_TEMPERATURE" />',
  '<uses-permission android:name="android.permission.health.READ_SLEEP" />',
  '<uses-permission android:name="android.permission.health.READ_SPEED" />',
  '<uses-permission android:name="android.permission.health.READ_STEPS" />',
  '<uses-permission android:name="android.permission.health.READ_TOTAL_CALORIES_BURNED" />',
  '<uses-permission android:name="android.permission.health.READ_VO2_MAX" />',
  '<uses-permission android:name="android.permission.health.READ_WEIGHT" />',
  '<uses-permission android:name="android.permission.health.READ_WHEELCHAIR_PUSHES" />'
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

if (!manifest.includes('android:name="com.google.android.apps.healthdata"')) {
  const queriesEnd = "    </queries>";
  if (!manifest.includes(queriesEnd)) {
    throw new Error("Queries-Tag für Health Connect nicht gefunden.");
  }

  manifest = manifest.replace(
    queriesEnd,
    '        <package android:name="com.google.android.apps.healthdata" />\n' +
      queriesEnd
  );
}

if (!manifest.includes('android:name="com.samsung.android.app.notes"')) {
  const queriesEnd = "    </queries>";
  if (!manifest.includes(queriesEnd)) {
    throw new Error("Queries-Tag für Samsung Notes nicht gefunden.");
  }

  manifest = manifest.replace(
    queriesEnd,
    '        <package android:name="com.samsung.android.app.notes" />\n' +
      queriesEnd
  );
}

if (!manifest.includes('android:name="android.intent.action.SEND"')) {
  const launcherEnd = [
    '                <category android:name="android.intent.category.LAUNCHER" />',
    "            </intent-filter>"
  ].join("\n");
  if (!manifest.includes(launcherEnd)) {
    throw new Error("Launcher-Filter für Samsung Notes nicht gefunden.");
  }

  const shareFilter = [
    "            <intent-filter>",
    '                <action android:name="android.intent.action.SEND" />',
    '                <category android:name="android.intent.category.DEFAULT" />',
    '                <data android:mimeType="text/plain" />',
    "            </intent-filter>"
  ].join("\n");

  manifest = manifest.replace(
    launcherEnd,
    launcherEnd + "\n" + shareFilter
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
            android:label="Pam’s Holo WhatsApp-Fahrmodus"
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

if (!manifest.includes(".HeyPamRestartReceiver")) {
  const applicationEnd = "    </application>";
  if (!manifest.includes(applicationEnd)) {
    throw new Error("Application-Ende für Hey-Pam-Wiederanlauf nicht gefunden.");
  }

  const restartReceiver = [
    "        <receiver",
    '            android:name=".HeyPamRestartReceiver"',
    '            android:enabled="true"',
    '            android:exported="true">',
    "            <intent-filter>",
    '                <action android:name="android.intent.action.BOOT_COMPLETED" />',
    '                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />',
    "            </intent-filter>",
    "        </receiver>",
    ""
  ].join("\n");

  manifest = manifest.replace(
    applicationEnd,
    restartReceiver + "\n" + applicationEnd
  );
}

if (!manifest.includes(".HealthPrivacyActivity")) {
  const applicationEnd = "    </application>";
  if (!manifest.includes(applicationEnd)) {
    throw new Error("Application-Ende für Health-Datenschutz nicht gefunden.");
  }

  const healthPrivacy = [
    "        <activity",
    '            android:name=".HealthPrivacyActivity"',
    '            android:exported="true">',
    "            <intent-filter>",
    '                <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />',
    "            </intent-filter>",
    "        </activity>",
    "",
    "        <activity-alias",
    '            android:name=".ViewHealthPermissionUsageActivity"',
    '            android:exported="true"',
    '            android:targetActivity=".HealthPrivacyActivity"',
    '            android:permission="android.permission.START_VIEW_PERMISSION_USAGE">',
    "            <intent-filter>",
    '                <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />',
    '                <category android:name="android.intent.category.HEALTH_PERMISSIONS" />',
    "            </intent-filter>",
    "        </activity-alias>",
    ""
  ].join("\n");

  manifest = manifest.replace(
    applicationEnd,
    healthPrivacy + "\n" + applicationEnd
  );
}

writeFileSync(manifestPath, manifest, "utf8");
console.log(
  "WhatsApp-Fahrmodus, Sol-Weckruf, Telefon, Kontakte, direkte Samsung-Notes-Übergabe, Health Connect und Lautsprecherroute wurden in Android eingebunden."
);
