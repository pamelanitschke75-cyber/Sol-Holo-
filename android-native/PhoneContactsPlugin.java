package com.solholo.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.ContactsContract;
import android.provider.Settings;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(
    name = "PhoneContacts",
    permissions = {
        @Permission(
            alias = "contacts",
            strings = { Manifest.permission.READ_CONTACTS }
        ),
        @Permission(
            alias = "phoneState",
            strings = { Manifest.permission.READ_PHONE_STATE }
        )
    }
)
public class PhoneContactsPlugin extends Plugin {
    private static final String SAMSUNG_NOTES_PACKAGE =
        "com.samsung.android.app.notes";
    private static final String GOOGLE_CREATE_NOTE_ACTION =
        "com.google.android.gms.actions.CREATE_NOTE";
    private static final String GOOGLE_NOTE_NAME_EXTRA =
        "com.google.android.gms.actions.extra.NAME";
    private static final String GOOGLE_NOTE_TEXT_EXTRA =
        "com.google.android.gms.actions.extra.TEXT";
    private static final String NOTE_PREFERENCES = "sol_holo_shared_notes";
    private static final String NOTE_TEXT_KEY = "pending_note_text";
    private static final String NOTE_TITLE_KEY = "pending_note_title";
    private static final String NOTE_TRUNCATED_KEY = "pending_note_truncated";
    private static final int MAX_SHARED_NOTE_LENGTH = 3200;
    private static final int MAX_SHARED_NOTE_TITLE_LENGTH = 160;
    private static final int MAX_SMS_LENGTH = 5000;
    private static final int MAX_RECIPIENT_NAME_LENGTH = 160;
    private static volatile PhoneContactsPlugin activePlugin;

    private TelephonyManager telephonyManager;
    private TelephonyCallback telephonyCallback;
    private PhoneStateListener legacyPhoneStateListener;
    private int currentCallState = TelephonyManager.CALL_STATE_IDLE;
    private PluginCall pendingExternalActionCall;
    private AlertDialog pendingExternalActionDialog;

    private static final class SamsungNoteLaunch {
        final Intent intent;
        final String mode;

        SamsungNoteLaunch(Intent intent, String mode) {
            this.intent = intent;
            this.mode = mode;
        }
    }

    @Override
    public void load() {
        activePlugin = this;
        registerCallStateListener();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        registerCallStateListener();
        notifyListeners("phoneStatusChanged", status(), true);
    }

    @Override
    protected void handleOnDestroy() {
        unregisterCallStateListener();
        cancelPendingExternalAction();
        if (activePlugin == this) {
            activePlugin = null;
        }
        super.handleOnDestroy();
    }

    public static boolean handleSharedNoteIntent(Context context, Intent intent) {
        if (
            context == null
                || intent == null
                || !Intent.ACTION_SEND.equals(intent.getAction())
        ) {
            return false;
        }

        String mimeType = intent.getType();
        if (mimeType != null && !mimeType.startsWith("text/")) {
            return false;
        }

        CharSequence sharedText = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        String text = sharedText == null ? "" : sharedText.toString().trim();
        if (text.isEmpty()) {
            return false;
        }

        String title = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        title = title == null ? "" : title.trim();
        if (title.length() > MAX_SHARED_NOTE_TITLE_LENGTH) {
            title = title.substring(0, MAX_SHARED_NOTE_TITLE_LENGTH).trim();
        }

        boolean truncated = text.length() > MAX_SHARED_NOTE_LENGTH;
        if (truncated) {
            text = text.substring(0, MAX_SHARED_NOTE_LENGTH).trim();
        }

        context
            .getSharedPreferences(NOTE_PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .putString(NOTE_TEXT_KEY, text)
            .putString(NOTE_TITLE_KEY, title)
            .putBoolean(NOTE_TRUNCATED_KEY, truncated)
            .apply();

        intent.removeExtra(Intent.EXTRA_TEXT);
        intent.removeExtra(Intent.EXTRA_SUBJECT);

        PhoneContactsPlugin plugin = activePlugin;
        if (plugin != null) {
            JSObject event = new JSObject();
            event.put("available", true);
            event.put("characterCount", text.length());
            event.put("truncated", truncated);
            plugin.notifyListeners("sharedNoteReceived", event, true);
        }

        return true;
    }

    private boolean contactsGranted() {
        return ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean phoneStateGranted() {
        return ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean telephonySupported() {
        return getContext()
            .getPackageManager()
            .hasSystemFeature(PackageManager.FEATURE_TELEPHONY);
    }

    private JSObject status() {
        JSObject result = new JSObject();
        result.put("supported", telephonySupported());
        result.put("contactsPermissionGranted", contactsGranted());
        result.put("phoneStatePermissionGranted", phoneStateGranted());
        result.put(
            "connected",
            contactsGranted() && phoneStateGranted()
        );
        result.put("permissionsCanBeRevoked", true);
        result.put(
            "contactsPermissionPurpose",
            "Kontakte werden nur zum Finden eines ausdrücklich genannten Empfängers gelesen."
        );
        result.put(
            "phoneStatePermissionPurpose",
            "Der Telefonstatus wird nur erkannt, damit Pam’s Holo während eines Anrufs pausiert."
        );
        result.put("outgoingCallsDirectlyStarted", false);
        result.put("smsDirectlySent", false);
        result.put("visibleActionConfirmationRequired", true);
        result.put("callState", callStateName(currentCallState));
        result.put(
            "incomingCall",
            currentCallState == TelephonyManager.CALL_STATE_RINGING
        );
        return result;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void consumeSharedNote(PluginCall call) {
        String text = getContext()
            .getSharedPreferences(NOTE_PREFERENCES, Context.MODE_PRIVATE)
            .getString(NOTE_TEXT_KEY, "");
        String title = getContext()
            .getSharedPreferences(NOTE_PREFERENCES, Context.MODE_PRIVATE)
            .getString(NOTE_TITLE_KEY, "");
        boolean truncated = getContext()
            .getSharedPreferences(NOTE_PREFERENCES, Context.MODE_PRIVATE)
            .getBoolean(NOTE_TRUNCATED_KEY, false);

        JSObject result = new JSObject();
        result.put("available", text != null && !text.trim().isEmpty());
        result.put("text", text == null ? "" : text);
        result.put("title", title == null ? "" : title);
        result.put("truncated", truncated);

        getContext()
            .getSharedPreferences(NOTE_PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .remove(NOTE_TEXT_KEY)
            .remove(NOTE_TITLE_KEY)
            .remove(NOTE_TRUNCATED_KEY)
            .apply();

        call.resolve(result);
    }

    private boolean samsungNotesAvailable() {
        Intent launchIntent = getContext()
            .getPackageManager()
            .getLaunchIntentForPackage(SAMSUNG_NOTES_PACKAGE);
        return launchIntent != null;
    }

    private Intent withSamsungNoteText(Intent intent, String title, String text) {
        intent.setPackage(SAMSUNG_NOTES_PACKAGE);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TEXT, text);
        intent.putExtra(GOOGLE_NOTE_TEXT_EXTRA, text);
        intent.setClipData(
            ClipData.newPlainText(
                title.isEmpty() ? "Pam’s Holo" : title,
                text
            )
        );

        if (!title.isEmpty()) {
            intent.putExtra(Intent.EXTRA_SUBJECT, title);
            intent.putExtra(Intent.EXTRA_TITLE, title);
            intent.putExtra(GOOGLE_NOTE_NAME_EXTRA, title);
        }

        return intent;
    }

    private Intent resolveSamsungNotesActivity(Intent intent) {
        ResolveInfo resolved = getContext()
            .getPackageManager()
            .resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY);
        if (
            resolved == null
                || resolved.activityInfo == null
                || !SAMSUNG_NOTES_PACKAGE.equals(resolved.activityInfo.packageName)
        ) {
            return null;
        }

        intent.setComponent(
            new ComponentName(
                resolved.activityInfo.packageName,
                resolved.activityInfo.name
            )
        );
        return intent;
    }

    private SamsungNoteLaunch samsungNoteLaunch(String title, String text) {
        // ACTION_SEND + EXTRA_TEXT ist Androids standardisierte Textübergabe.
        // Samsung Notes erhält sie zuerst, damit der gewünschte Inhalt nicht nur
        // eine leere Notizansicht öffnet.
        Intent sharedText = resolveSamsungNotesActivity(
            withSamsungNoteText(
                new Intent(Intent.ACTION_SEND),
                title,
                text
            )
        );
        if (sharedText != null) {
            return new SamsungNoteLaunch(sharedText, "share_text");
        }

        Intent googleNote = resolveSamsungNotesActivity(
            withSamsungNoteText(
                new Intent(GOOGLE_CREATE_NOTE_ACTION),
                title,
                text
            )
        );
        if (googleNote != null) {
            return new SamsungNoteLaunch(googleNote, "create_note");
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            Intent androidNote = resolveSamsungNotesActivity(
                withSamsungNoteText(
                    new Intent(Intent.ACTION_CREATE_NOTE),
                    title,
                    text
                )
            );
            if (androidNote != null) {
                return new SamsungNoteLaunch(androidNote, "android_create_note");
            }
        }

        return null;
    }

    @PluginMethod
    public void getSamsungNotesStatus(PluginCall call) {
        SamsungNoteLaunch launch = samsungNoteLaunch(
            "Pam’s Holo",
            "Notiz"
        );
        JSObject result = new JSObject();
        result.put("available", samsungNotesAvailable());
        result.put("packageName", SAMSUNG_NOTES_PACKAGE);
        result.put("directWriteSupported", false);
        result.put("draftHandoffSupported", launch != null);
        result.put("handoffMode", launch == null ? "" : launch.mode);
        result.put("pamHoloConfirmationRequired", false);
        result.put("reviewAndSaveInSamsungNotesRequired", true);
        result.put("textTransport", "android.intent.extra.TEXT");
        call.resolve(result);
    }

    @PluginMethod
    public void openSamsungNotes(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject(
                "Samsung Notes konnte gerade nicht geöffnet werden.",
                "SAMSUNG_NOTES_ACTIVITY_UNAVAILABLE"
            );
            return;
        }

        Intent intent = activity
            .getPackageManager()
            .getLaunchIntentForPackage(SAMSUNG_NOTES_PACKAGE);
        if (intent == null) {
            call.reject(
                "Samsung Notes wurde auf diesem Handy nicht gefunden.",
                "SAMSUNG_NOTES_NOT_INSTALLED"
            );
            return;
        }

        try {
            activity.startActivity(intent);
            JSObject result = new JSObject();
            result.put("opened", true);
            result.put("packageName", SAMSUNG_NOTES_PACKAGE);
            call.resolve(result);
        } catch (ActivityNotFoundException error) {
            call.reject(
                "Samsung Notes konnte gerade nicht geöffnet werden.",
                "SAMSUNG_NOTES_OPEN_FAILED",
                error
            );
        }
    }

    @PluginMethod
    public void prepareSamsungNote(PluginCall call) {
        String text = call.getString("text", "").trim();
        String title = call.getString("title", "").trim();

        if (text.isEmpty()) {
            call.reject(
                "Der Notiztext ist leer.",
                "SAMSUNG_NOTE_TEXT_REQUIRED"
            );
            return;
        }

        if (text.length() > 10000) {
            call.reject(
                "Der Notiztext ist für die sichere Übergabe zu lang.",
                "SAMSUNG_NOTE_TEXT_TOO_LONG"
            );
            return;
        }

        if (title.length() > MAX_SHARED_NOTE_TITLE_LENGTH) {
            title = title.substring(0, MAX_SHARED_NOTE_TITLE_LENGTH).trim();
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject(
                "Samsung Notes konnte gerade nicht geöffnet werden.",
                "SAMSUNG_NOTES_ACTIVITY_UNAVAILABLE"
            );
            return;
        }

        SamsungNoteLaunch launch = samsungNoteLaunch(title, text);
        if (launch == null) {
            call.reject(
                "Diese Samsung-Notes-Version nimmt gerade keinen Notizentwurf an.",
                "SAMSUNG_NOTES_DRAFT_UNAVAILABLE"
            );
            return;
        }

        try {
            activity.startActivity(launch.intent);
            JSObject result = new JSObject();
            result.put("opened", true);
            result.put("saved", false);
            result.put("textPrepared", true);
            result.put("packageName", SAMSUNG_NOTES_PACKAGE);
            result.put("handoffMode", launch.mode);
            result.put("pamHoloConfirmationRequired", false);
            result.put("reviewAndSaveInSamsungNotesRequired", true);
            result.put("contentTransferred", true);
            call.resolve(result);
        } catch (ActivityNotFoundException | SecurityException error) {
            call.reject(
                "Samsung Notes konnte die Notiz gerade nicht übernehmen.",
                "SAMSUNG_NOTES_SHARE_FAILED",
                error
            );
        }
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (
            getPermissionState("contacts") == PermissionState.GRANTED
                && getPermissionState("phoneState") == PermissionState.GRANTED
        ) {
            registerCallStateListener();
            call.resolve(status());
            return;
        }

        requestPermissionForAliases(
            new String[] { "contacts", "phoneState" },
            call,
            "phonePermissionsCallback"
        );
    }

    @PermissionCallback
    private void phonePermissionsCallback(PluginCall call) {
        registerCallStateListener();
        JSObject result = status();
        notifyListeners("phoneStatusChanged", result, true);
        call.resolve(result);
    }

    @PluginMethod
    public void openPermissionSettings(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject(
                "Die Android-Berechtigungen konnten gerade nicht geöffnet werden.",
                "APP_PERMISSION_SETTINGS_UNAVAILABLE"
            );
            return;
        }

        Intent intent = new Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.fromParts("package", getContext().getPackageName(), null)
        );

        try {
            activity.startActivity(intent);
            JSObject result = status();
            result.put("settingsOpened", true);
            result.put(
                "instructions",
                "Unter Berechtigungen können Kontakte und Telefon jederzeit einzeln widerrufen werden."
            );
            call.resolve(result);
        } catch (ActivityNotFoundException | SecurityException error) {
            call.reject(
                "Die Android-Berechtigungen konnten gerade nicht geöffnet werden.",
                "APP_PERMISSION_SETTINGS_UNAVAILABLE",
                error
            );
        }
    }

    @PluginMethod
    public void searchContacts(PluginCall call) {
        if (!contactsGranted()) {
            call.reject(
                "Ohne Kontaktfreigabe kann Pam’s Holo keine Telefonnummer suchen.",
                "CONTACTS_PERMISSION_REQUIRED"
            );
            return;
        }

        String query = call.getString("query", "").trim();
        if (query.isEmpty()) {
            call.reject("Bitte nenne den gesuchten Kontakt.");
            return;
        }

        Integer requestedLimit = call.getInt("limit", 8);
        int limit = Math.max(1, Math.min(requestedLimit == null ? 8 : requestedLimit, 20));

        String[] projection = {
            ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER,
            ContactsContract.CommonDataKinds.Phone.TYPE,
            ContactsContract.CommonDataKinds.Phone.LABEL
        };

        String selection =
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ?";
        String[] selectionArgs = { "%" + query + "%" };
        String sortOrder =
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " COLLATE NOCASE ASC";

        JSArray results = new JSArray();
        Set<String> seenNumbers = new HashSet<>();

        try (
            Cursor cursor = getContext().getContentResolver().query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                sortOrder
            )
        ) {
            if (cursor != null) {
                int idIndex = cursor.getColumnIndexOrThrow(
                    ContactsContract.CommonDataKinds.Phone.CONTACT_ID
                );
                int nameIndex = cursor.getColumnIndexOrThrow(
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME
                );
                int numberIndex = cursor.getColumnIndexOrThrow(
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                );
                int typeIndex = cursor.getColumnIndexOrThrow(
                    ContactsContract.CommonDataKinds.Phone.TYPE
                );
                int labelIndex = cursor.getColumnIndexOrThrow(
                    ContactsContract.CommonDataKinds.Phone.LABEL
                );

                while (cursor.moveToNext() && results.length() < limit) {
                    String number = cursor.getString(numberIndex);
                    String dedupeKey = (number == null ? "" : number)
                        .replaceAll("[^0-9+]", "");

                    if (dedupeKey.isEmpty() || !seenNumbers.add(dedupeKey)) {
                        continue;
                    }

                    int type = cursor.getInt(typeIndex);
                    String customLabel = cursor.getString(labelIndex);
                    CharSequence label = ContactsContract.CommonDataKinds.Phone.getTypeLabel(
                        getContext().getResources(),
                        type,
                        customLabel
                    );

                    JSObject contact = new JSObject();
                    contact.put("id", cursor.getLong(idIndex));
                    contact.put("name", cursor.getString(nameIndex));
                    contact.put("number", number);
                    contact.put("label", String.valueOf(label));
                    results.put(contact);
                }
            }
        } catch (SecurityException error) {
            call.reject(
                "Android hat den Kontaktzugriff nicht freigegeben.",
                "CONTACTS_PERMISSION_REQUIRED",
                error
            );
            return;
        } catch (Exception error) {
            call.reject(
                "Die Kontakte konnten gerade nicht durchsucht werden.",
                null,
                error
            );
            return;
        }

        JSObject result = new JSObject();
        result.put("query", query);
        result.put("count", results.length());
        result.put("results", results);
        call.resolve(result);
    }

    @PluginMethod
    public void openDialer(PluginCall call) {
        String number = cleanDestination(call.getString("number", ""));
        String recipientName = cleanRecipientName(
            call.getString("recipientName", "")
        );
        if (number.isEmpty()) {
            call.reject("Keine Telefonnummer erhalten.");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Die Telefon-App konnte nicht geöffnet werden.");
            return;
        }

        String recipient = recipientName.isEmpty()
            ? number
            : recipientName + " (" + number + ")";
        String confirmationText =
            "Empfänger: " + recipient + "\n\n" +
            "Aktion: Telefon-App mit dieser Nummer öffnen.\n\n" +
            "Der Anruf wird nicht automatisch gestartet. " +
            "Du startest ihn anschließend selbst in der Telefon-App.";

        confirmExternalAction(
            call,
            activity,
            "Anruf bestätigen",
            confirmationText,
            "Telefon-App öffnen",
            () -> {
                Intent intent = new Intent(
                    Intent.ACTION_DIAL,
                    Uri.fromParts("tel", number, null)
                );

                try {
                    activity.startActivity(intent);
                    JSObject result = new JSObject();
                    result.put("opened", true);
                    result.put("number", number);
                    result.put("recipientName", recipientName);
                    result.put("confirmationShown", true);
                    result.put("userConfirmed", true);
                    result.put("callStarted", false);
                    result.put("finalDialerConfirmationRequired", true);
                    call.resolve(result);
                } catch (ActivityNotFoundException | SecurityException error) {
                    call.reject(
                        "Auf diesem Gerät wurde keine Telefon-App gefunden.",
                        "PHONE_APP_UNAVAILABLE",
                        error
                    );
                }
            }
        );
    }

    @PluginMethod
    public void prepareSms(PluginCall call) {
        String number = cleanDestination(call.getString("number", ""));
        String message = call.getString("message", "").trim();
        String recipientName = cleanRecipientName(
            call.getString("recipientName", "")
        );

        if (number.isEmpty()) {
            call.reject("Keine Telefonnummer für die SMS erhalten.");
            return;
        }

        if (message.isEmpty()) {
            call.reject("Kein SMS-Text erhalten.");
            return;
        }

        if (message.length() > MAX_SMS_LENGTH) {
            call.reject(
                "Der SMS-Text ist für eine vollständige sichtbare Bestätigung zu lang.",
                "SMS_TEXT_TOO_LONG"
            );
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Die Nachrichten-App konnte nicht geöffnet werden.");
            return;
        }

        String recipient = recipientName.isEmpty()
            ? number
            : recipientName + " (" + number + ")";
        String confirmationText =
            "Empfänger: " + recipient + "\n\n" +
            "SMS-Inhalt:\n" + message + "\n\n" +
            "Die Nachricht wird nicht automatisch gesendet. " +
            "Du sendest sie anschließend selbst in der Nachrichten-App.";

        confirmExternalAction(
            call,
            activity,
            "SMS bestätigen",
            confirmationText,
            "SMS-App öffnen",
            () -> {
                Intent intent = new Intent(
                    Intent.ACTION_SENDTO,
                    Uri.fromParts("smsto", number, null)
                );
                intent.putExtra("sms_body", message);

                try {
                    activity.startActivity(intent);
                    JSObject result = new JSObject();
                    result.put("opened", true);
                    result.put("number", number);
                    result.put("recipientName", recipientName);
                    result.put("confirmationShown", true);
                    result.put("userConfirmed", true);
                    result.put("messagePrepared", true);
                    result.put("messageLength", message.length());
                    result.put("sent", false);
                    result.put("finalSmsAppConfirmationRequired", true);
                    call.resolve(result);
                } catch (ActivityNotFoundException | SecurityException error) {
                    call.reject(
                        "Auf diesem Gerät wurde keine SMS-App gefunden.",
                        "SMS_APP_UNAVAILABLE",
                        error
                    );
                }
            }
        );
    }

    private void confirmExternalAction(
        PluginCall call,
        Activity activity,
        String title,
        String message,
        String positiveLabel,
        Runnable confirmedAction
    ) {
        synchronized (this) {
            if (pendingExternalActionCall != null) {
                call.reject(
                    "Bitte schließe zuerst die bereits geöffnete Bestätigung.",
                    "EXTERNAL_ACTION_CONFIRMATION_ACTIVE"
                );
                return;
            }
            pendingExternalActionCall = call;
        }

        activity.runOnUiThread(() -> {
            try {
                AlertDialog dialog = new AlertDialog.Builder(activity)
                    .setTitle(title)
                    .setMessage(message)
                    .setPositiveButton(positiveLabel, (ignored, which) -> {
                        if (completeExternalConfirmation(call)) {
                            confirmedAction.run();
                        }
                    })
                    .setNegativeButton("Abbrechen", (ignored, which) -> {
                        if (completeExternalConfirmation(call)) {
                            call.reject(
                                "Die Aktion wurde abgebrochen.",
                                "USER_CANCELLED"
                            );
                        }
                    })
                    .setOnCancelListener(ignored -> {
                        if (completeExternalConfirmation(call)) {
                            call.reject(
                                "Die Aktion wurde abgebrochen.",
                                "USER_CANCELLED"
                            );
                        }
                    })
                    .create();

                synchronized (PhoneContactsPlugin.this) {
                    if (pendingExternalActionCall != call) {
                        return;
                    }
                    pendingExternalActionDialog = dialog;
                }
                dialog.show();
            } catch (RuntimeException error) {
                if (completeExternalConfirmation(call)) {
                    call.reject(
                        "Die sichtbare Bestätigung konnte gerade nicht geöffnet werden.",
                        "EXTERNAL_ACTION_CONFIRMATION_UNAVAILABLE",
                        error
                    );
                }
            }
        });
    }

    private synchronized boolean completeExternalConfirmation(PluginCall call) {
        if (pendingExternalActionCall != call) {
            return false;
        }
        pendingExternalActionCall = null;
        pendingExternalActionDialog = null;
        return true;
    }

    private void cancelPendingExternalAction() {
        PluginCall call;
        AlertDialog dialog;
        synchronized (this) {
            call = pendingExternalActionCall;
            dialog = pendingExternalActionDialog;
            pendingExternalActionCall = null;
            pendingExternalActionDialog = null;
        }

        if (dialog != null && dialog.isShowing()) {
            dialog.setOnCancelListener(null);
            dialog.dismiss();
        }
        if (call != null) {
            call.reject(
                "Die sichtbare Bestätigung wurde geschlossen.",
                "EXTERNAL_ACTION_CONFIRMATION_CLOSED"
            );
        }
    }

    private String cleanDestination(String value) {
        String clean = (value == null ? "" : value).trim();
        if (clean.length() > 80 || clean.contains("\n") || clean.contains("\r")) {
            return "";
        }
        return clean;
    }

    private String cleanRecipientName(String value) {
        String clean = (value == null ? "" : value)
            .replace('\n', ' ')
            .replace('\r', ' ')
            .trim();
        if (clean.length() > MAX_RECIPIENT_NAME_LENGTH) {
            clean = clean.substring(0, MAX_RECIPIENT_NAME_LENGTH).trim();
        }
        return clean;
    }

    private String callStateName(int state) {
        if (state == TelephonyManager.CALL_STATE_RINGING) {
            return "ringing";
        }
        if (state == TelephonyManager.CALL_STATE_OFFHOOK) {
            return "offhook";
        }
        return "idle";
    }

    private void publishCallState(int state) {
        currentCallState = state;
        JSObject event = status();
        notifyListeners("callStateChanged", event, true);
        notifyListeners("phoneStatusChanged", event, true);
    }

    @SuppressWarnings("deprecation")
    private void registerCallStateListener() {
        if (!phoneStateGranted() || !telephonySupported()) {
            unregisterCallStateListener();
            currentCallState = TelephonyManager.CALL_STATE_IDLE;
            return;
        }

        if (telephonyCallback != null || legacyPhoneStateListener != null) {
            return;
        }

        telephonyManager =
            (TelephonyManager) getContext().getSystemService(Context.TELEPHONY_SERVICE);
        if (telephonyManager == null) {
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                telephonyCallback = new SolHoloCallStateCallback();
                telephonyManager.registerTelephonyCallback(
                    getContext().getMainExecutor(),
                    telephonyCallback
                );
            } else {
                legacyPhoneStateListener = new PhoneStateListener() {
                    @Override
                    public void onCallStateChanged(int state, String ignoredNumber) {
                        publishCallState(state);
                    }
                };
                telephonyManager.listen(
                    legacyPhoneStateListener,
                    PhoneStateListener.LISTEN_CALL_STATE
                );
            }
        } catch (SecurityException error) {
            telephonyCallback = null;
            legacyPhoneStateListener = null;
        }
    }

    @SuppressWarnings("deprecation")
    private void unregisterCallStateListener() {
        if (telephonyManager == null) {
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (telephonyCallback != null) {
                    telephonyManager.unregisterTelephonyCallback(telephonyCallback);
                }
            } else if (legacyPhoneStateListener != null) {
                telephonyManager.listen(
                    legacyPhoneStateListener,
                    PhoneStateListener.LISTEN_NONE
                );
            }
        } catch (SecurityException ignored) {
            // Android kann die Freigabe während der Laufzeit entziehen.
        }

        telephonyCallback = null;
        legacyPhoneStateListener = null;
        telephonyManager = null;
    }

    private final class SolHoloCallStateCallback
        extends TelephonyCallback
        implements TelephonyCallback.CallStateListener {

        @Override
        public void onCallStateChanged(int state) {
            publishCallState(state);
        }
    }
}
