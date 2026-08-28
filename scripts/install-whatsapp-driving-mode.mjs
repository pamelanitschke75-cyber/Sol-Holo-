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
      "package com.solholo.app;\n\nimport android.os.Bundle;\n\n"
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
    }
}`
  );
  writeFileSync(mainActivityPath, mainActivity, "utf8");
}

let manifest = readFileSync(manifestPath, "utf8");

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

writeFileSync(manifestPath, manifest, "utf8");
console.log("WhatsApp-Fahrmodus wurde in das Android-Projekt eingebunden.");
