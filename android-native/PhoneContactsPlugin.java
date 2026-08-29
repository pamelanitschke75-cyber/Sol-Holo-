package com.solholo.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.ContactsContract;
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
    private static final String NOTE_PREFERENCES = "sol_holo_shared_notes";
    private static final String NOTE_TEXT_KEY = "pending_note_text";
    private static final String NOTE_TITLE_KEY = "pending_note_title";
    private static final String NOTE_TRUNCATED_KEY = "pending_note_truncated";
    private static final int MAX_SHARED_NOTE_LENGTH = 3200;
    private static final int MAX_SHARED_NOTE_TITLE_LENGTH = 160;
    private static volatile PhoneContactsPlugin activePlugin;

    private TelephonyManager telephonyManager;
    private TelephonyCallback telephonyCallback;
    private PhoneStateListener legacyPhoneStateListener;
    private int currentCallState = TelephonyManager.CALL_STATE_IDLE;

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
        if (number.isEmpty()) {
            call.reject("Keine Telefonnummer erhalten.");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Die Telefon-App konnte nicht geöffnet werden.");
            return;
        }

        Intent intent = new Intent(
            Intent.ACTION_DIAL,
            Uri.fromParts("tel", number, null)
        );

        try {
            activity.startActivity(intent);
            JSObject result = new JSObject();
            result.put("opened", true);
            result.put("number", number);
            call.resolve(result);
        } catch (ActivityNotFoundException error) {
            call.reject(
                "Auf diesem Gerät wurde keine Telefon-App gefunden.",
                null,
                error
            );
        }
    }

    @PluginMethod
    public void prepareSms(PluginCall call) {
        String number = cleanDestination(call.getString("number", ""));
        String message = call.getString("message", "").trim();

        if (number.isEmpty()) {
            call.reject("Keine Telefonnummer für die SMS erhalten.");
            return;
        }

        if (message.isEmpty()) {
            call.reject("Kein SMS-Text erhalten.");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Die Nachrichten-App konnte nicht geöffnet werden.");
            return;
        }

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
            call.resolve(result);
        } catch (ActivityNotFoundException error) {
            call.reject(
                "Auf diesem Gerät wurde keine SMS-App gefunden.",
                null,
                error
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
