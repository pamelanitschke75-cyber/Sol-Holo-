name: Sol Holo Android APK

on:
  workflow_dispatch:
  push:
    branches:
      - main
    paths:
      - ".github/workflows/android-build.yml"
      - "www/**"
      - "capacitor.config.json"
      - "package.json"

jobs:
  build-android:
    runs-on: ubuntu-latest

    steps:
      - name: Repository laden
        uses: actions/checkout@v4

      - name: Node.js einrichten
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Java 21 einrichten
        uses: actions/setup-java@v4
        with:
          distribution: "temurin"
          java-version: "21"

      - name: Node-Abhängigkeiten installieren
        run: npm install

      - name: Android-Projekt erzeugen
        run: npx cap add android

      - name: Android Audio-Berechtigungen setzen
        run: |
          python - <<'PY'
          from pathlib import Path

          manifest = Path("android/app/src/main/AndroidManifest.xml")
          text = manifest.read_text(encoding="utf-8")

          permissions = [
              '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
              '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />'
          ]

          marker = '<manifest xmlns:android="http://schemas.android.com/apk/res/android">'

          if marker not in text:
              raise SystemExit("Manifest-Tag nicht gefunden.")

          additions = []

          for permission in permissions:
              if permission not in text:
                  additions.append("    " + permission)

          if additions:
              text = text.replace(
                  marker,
                  marker + "\n" + "\n".join(additions),
                  1
              )

          manifest.write_text(
              text,
              encoding="utf-8"
          )

          print("Audio-Berechtigungen gesetzt.")
          PY

      - name: Capacitor MainActivity mit WebView Mikrofonfreigabe setzen
        run: |
          mkdir -p android/app/src/main/java/com/solholo/app

          cat > android/app/src/main/java/com/solholo/app/MainActivity.java <<'JAVA'
          package com.solholo.app;

          import android.Manifest;
          import android.content.pm.PackageManager;
          import android.os.Bundle;
          import android.webkit.PermissionRequest;
          import android.webkit.WebChromeClient;
          import android.webkit.WebView;

          import androidx.core.app.ActivityCompat;
          import androidx.core.content.ContextCompat;

          import com.getcapacitor.BridgeActivity;

          public class MainActivity extends BridgeActivity {

              private static final int MICROPHONE_PERMISSION_REQUEST = 1001;
              private PermissionRequest pendingPermissionRequest;

              @Override
              public void onCreate(Bundle savedInstanceState) {
                  super.onCreate(savedInstanceState);

                  WebView webView = getBridge().getWebView();

                  webView.setWebChromeClient(new WebChromeClient() {

                      @Override
                      public void onPermissionRequest(PermissionRequest request) {

                          if (request == null) {
                              return;
                          }

                          boolean wantsAudio = false;

                          for (String resource : request.getResources()) {
                              if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                                  wantsAudio = true;
                                  break;
                              }
                          }

                          if (!wantsAudio) {
                              request.deny();
                              return;
                          }

                          if (
                              ContextCompat.checkSelfPermission(
                                  MainActivity.this,
                                  Manifest.permission.RECORD_AUDIO
                              ) == PackageManager.PERMISSION_GRANTED
                          ) {

                              request.grant(
                                  new String[]{
                                      PermissionRequest.RESOURCE_AUDIO_CAPTURE
                                  }
                              );

                              return;
                          }

                          pendingPermissionRequest = request;

                          ActivityCompat.requestPermissions(
                              MainActivity.this,
                              new String[]{
                                  Manifest.permission.RECORD_AUDIO
                              },
                              MICROPHONE_PERMISSION_REQUEST
                          );
                      }
                  });
              }

              @Override
              public void onRequestPermissionsResult(
                  int requestCode,
                  String[] permissions,
                  int[] grantResults
              ) {

                  super.onRequestPermissionsResult(
                      requestCode,
                      permissions,
                      grantResults
                  );

                  if (
                      requestCode == MICROPHONE_PERMISSION_REQUEST &&
                      pendingPermissionRequest != null
                  ) {

                      if (
                          grantResults.length > 0 &&
                          grantResults[0] == PackageManager.PERMISSION_GRANTED
                      ) {

                          pendingPermissionRequest.grant(
                              new String[]{
                                  PermissionRequest.RESOURCE_AUDIO_CAPTURE
                              }
                          );

                      } else {

                          pendingPermissionRequest.deny();
                      }

                      pendingPermissionRequest = null;
                  }
              }
          }
          JAVA

      - name: Sol Holo Web-App nach Android synchronisieren
        run: npx cap sync android

      - name: Gradle ausführbar machen
        run: chmod +x android/gradlew

      - name: Debug-APK bauen
        working-directory: android
        run: ./gradlew assembleDebug

      - name: Sol Holo APK bereitstellen
        uses: actions/upload-artifact@v4
        with:
          name: Sol-Holo-Android
          path: android/app/build/outputs/apk/debug/app-debug.apk