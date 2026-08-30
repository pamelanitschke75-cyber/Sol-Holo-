import {
  readFileSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();

function replaceExactlyOnce(text, before, after, label) {
  if (text.includes(after)) {
    return text;
  }

  const firstIndex = text.indexOf(before);
  if (firstIndex < 0) {
    throw new Error(`${label}: erwartete Stelle nicht gefunden.`);
  }

  if (text.indexOf(before, firstIndex + before.length) >= 0) {
    throw new Error(`${label}: erwartete Stelle ist nicht eindeutig.`);
  }

  return text.slice(0, firstIndex) + after + text.slice(firstIndex + before.length);
}

/*
  ==========================================================
  1. DIENSTE-SEITE: SAMSUNG NOTES WIRKLICH ÖFFNEN
  ==========================================================

  Bisher zeigte die Zeile nur einen Hinweis an. Jetzt öffnet
  sie Samsung Notes direkt. Die eigentliche Übergabe bleibt
  weiterhin bewusst bei Samsung Notes selbst:

  Notiz auswählen -> Teilen -> Pam’s Holo.

  Nach der Rückkehr verarbeitet die bereits vorhandene
  consumeSharedNoteImport()-Logik ausschließlich die vom
  Menschen ausdrücklich geteilte einzelne Notiz.
*/

const uiPath = join(projectRoot, "www", "sol-holo-ui.js");
let ui = readFileSync(uiPath, "utf8");

const oldNotesClick = `  document.getElementById("samsungNotesRow").addEventListener("click", () => {
    if (!getPhoneContactsPlugin()) {
      showToast("Samsung Notes kann nur mit der Pam’s-Holo-App für Android geteilt werden.");
      return;
    }
    showToast(
      "Samsung Notes öffnen → persönliche Notiz auswählen → Teilen → Pam’s Holo. " +
      "Vor dem Speichern fragt Sol noch einmal nach."
    );
    void consumeSharedNoteImport();
  });`;

const newNotesClick = `  document.getElementById("samsungNotesRow").addEventListener("click", async () => {
    const plugin = getPhoneContactsPlugin();
    if (!plugin) {
      showToast("Samsung Notes kann nur mit der Pam’s-Holo-App für Android geteilt werden.");
      return;
    }

    try {
      const result = await plugin.openSamsungNotes();
      if (result?.opened) {
        showToast(
          "Samsung Notes ist geöffnet. Persönliche Notiz auswählen → Teilen → Pam’s Holo. " +
          "Vor dem Speichern fragt Sol noch einmal nach."
        );
        return;
      }

      showToast(
        "Samsung Notes konnte nicht automatisch geöffnet werden. " +
        "Bitte öffne es manuell und teile die gewünschte Notiz mit Pam’s Holo."
      );
    } catch (error) {
      console.error("Samsung Notes öffnen:", error);
      showToast(
        "Samsung Notes konnte gerade nicht geöffnet werden. " +
        "Bitte öffne es manuell und teile die gewünschte Notiz mit Pam’s Holo."
      );
    }
  });`;

ui = replaceExactlyOnce(
  ui,
  oldNotesClick,
  newNotesClick,
  "Samsung-Notes-Schaltfläche"
);

writeFileSync(uiPath, ui, "utf8");

/*
  ==========================================================
  2. ANDROID-PLUGIN: SAMSUNG NOTES STARTEN
  ==========================================================
*/

const phonePluginPath = join(
  projectRoot,
  "android-native",
  "PhoneContactsPlugin.java"
);
let phonePlugin = readFileSync(phonePluginPath, "utf8");

const oldNoteConstants = `    private static final String NOTE_PREFERENCES = "sol_holo_shared_notes";
    private static final String NOTE_TEXT_KEY = "pending_note_text";
    private static final String NOTE_TITLE_KEY = "pending_note_title";
    private static final String NOTE_TRUNCATED_KEY = "pending_note_truncated";`;

const newNoteConstants = `    private static final String NOTE_PREFERENCES = "sol_holo_shared_notes";
    private static final String NOTE_TEXT_KEY = "pending_note_text";
    private static final String NOTE_TITLE_KEY = "pending_note_title";
    private static final String NOTE_TRUNCATED_KEY = "pending_note_truncated";
    private static final String SAMSUNG_NOTES_PACKAGE =
        "com.samsung.android.app.notes";`;

phonePlugin = replaceExactlyOnce(
  phonePlugin,
  oldNoteConstants,
  newNoteConstants,
  "Samsung-Notes-Paketname"
);

const consumeMarker = `    @PluginMethod
    public void consumeSharedNote(PluginCall call) {`;

const openNotesMethod = `    @PluginMethod
    public void openSamsungNotes(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Samsung Notes konnte nicht geöffnet werden.");
            return;
        }

        Intent launchIntent = activity
            .getPackageManager()
            .getLaunchIntentForPackage(SAMSUNG_NOTES_PACKAGE);

        if (launchIntent == null) {
            call.reject(
                "Samsung Notes wurde auf diesem Gerät nicht gefunden.",
                "SAMSUNG_NOTES_NOT_FOUND"
            );
            return;
        }

        launchIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);

        try {
            activity.startActivity(launchIntent);
            JSObject result = new JSObject();
            result.put("opened", true);
            result.put("packageName", SAMSUNG_NOTES_PACKAGE);
            call.resolve(result);
        } catch (ActivityNotFoundException error) {
            call.reject(
                "Samsung Notes konnte nicht geöffnet werden.",
                "SAMSUNG_NOTES_NOT_FOUND",
                error
            );
        }
    }

${consumeMarker}`;

phonePlugin = replaceExactlyOnce(
  phonePlugin,
  consumeMarker,
  openNotesMethod,
  "openSamsungNotes"
);

writeFileSync(phonePluginPath, phonePlugin, "utf8");

/*
  ==========================================================
  3. ANDROID-MANIFEST-BUILD: NOTES SICHTBAR + TEXT/* TEILEN
  ==========================================================
*/

const androidInstallerPath = join(
  projectRoot,
  "scripts",
  "install-whatsapp-driving-mode.mjs"
);
let androidInstaller = readFileSync(androidInstallerPath, "utf8");

androidInstaller = replaceExactlyOnce(
  androidInstaller,
  `    '                <data android:mimeType="text/plain" />',`,
  `    '                <data android:mimeType="text/*" />',`,
  "Samsung-Notes-MIME-Typ"
);

const healthQueryBlock = `if (!manifest.includes('android:name="com.google.android.apps.healthdata"')) {
  const queriesEnd = "    </queries>";
  if (!manifest.includes(queriesEnd)) {
    throw new Error("Queries-Tag für Health Connect nicht gefunden.");
  }

  manifest = manifest.replace(
    queriesEnd,
    '        <package android:name="com.google.android.apps.healthdata" />\\n' +
      queriesEnd
  );
}`;

const healthAndNotesQueryBlock = `${healthQueryBlock}

if (!manifest.includes('android:name="com.samsung.android.app.notes"')) {
  const queriesEnd = "    </queries>";
  if (!manifest.includes(queriesEnd)) {
    throw new Error("Queries-Tag für Samsung Notes nicht gefunden.");
  }

  manifest = manifest.replace(
    queriesEnd,
    '        <package android:name="com.samsung.android.app.notes" />\\n' +
      queriesEnd
  );
}`;

androidInstaller = replaceExactlyOnce(
  androidInstaller,
  healthQueryBlock,
  healthAndNotesQueryBlock,
  "Samsung-Notes-Paketsichtbarkeit"
);

writeFileSync(androidInstallerPath, androidInstaller, "utf8");

console.log(
  "Samsung Notes ist repariert: direkte Öffnung, sichere Einzelübergabe und text/*-Freigabe sind vorbereitet."
);
