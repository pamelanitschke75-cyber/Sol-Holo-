package com.solholo.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.OpenableColumns;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Android Storage Access Framework bridge for encrypted Sol-Holo backups.
 *
 * <p>The plugin never receives plaintext memories or passwords. JavaScript
 * encrypts the allow-listed payload first and only passes the authenticated
 * ciphertext envelope to this bridge. Android's system picker decides the
 * destination/source; no broad storage permission is requested.</p>
 */
@CapacitorPlugin(name = "SolBackup")
public final class SolBackupPlugin extends Plugin {
    private static final String MIME_TYPE = "application/octet-stream";
    private static final String FILE_SUFFIX = ".solholo-backup";
    private static final int MAX_BACKUP_BYTES = 12 * 1024 * 1024;

    @PluginMethod
    public void saveEncryptedBackup(PluginCall call) {
        String fileName = safeFileName(call.getString("fileName", ""));
        String contents = call.getString("contents", "");
        if (fileName.isEmpty() || contents.isEmpty()) {
            call.reject("Dateiname oder verschlüsselte Sicherung fehlt.", "BACKUP_DATA_REQUIRED");
            return;
        }
        byte[] bytes = contents.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_BACKUP_BYTES) {
            call.reject("Die Sicherungsdatei ist größer als 12 MB.", "BACKUP_TOO_LARGE");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(MIME_TYPE)
            .putExtra(Intent.EXTRA_TITLE, fileName);
        startActivityForResult(call, intent, "saveEncryptedBackupResult");
    }

    @ActivityCallback
    private void saveEncryptedBackupResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        Uri uri = data == null ? null : data.getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            call.reject("Speichern abgebrochen.", "BACKUP_SAVE_CANCELLED");
            return;
        }

        String contents = call.getString("contents", "");
        byte[] bytes = contents.getBytes(StandardCharsets.UTF_8);
        if (bytes.length == 0 || bytes.length > MAX_BACKUP_BYTES) {
            call.reject("Die verschlüsselte Sicherung ist ungültig.", "BACKUP_DATA_INVALID");
            return;
        }

        try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (output == null) {
                call.reject("Android konnte die Zieldatei nicht öffnen.", "BACKUP_TARGET_UNAVAILABLE");
                return;
            }
            output.write(bytes);
            output.flush();
            JSObject response = new JSObject();
            response.put("saved", true);
            response.put("fileName", safeFileName(call.getString("fileName", "")));
            response.put("bytesWritten", bytes.length);
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Die verschlüsselte Sicherung konnte nicht gespeichert werden.", "BACKUP_SAVE_FAILED", error);
        }
    }

    @PluginMethod
    public void openEncryptedBackup(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType("*/*")
            .putExtra(Intent.EXTRA_MIME_TYPES, new String[] {
                MIME_TYPE,
                "application/json",
                "text/plain"
            });
        startActivityForResult(call, intent, "openEncryptedBackupResult");
    }

    @ActivityCallback
    private void openEncryptedBackupResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        Uri uri = data == null ? null : data.getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            call.reject("Dateiauswahl abgebrochen.", "BACKUP_OPEN_CANCELLED");
            return;
        }

        try (InputStream input = getContext().getContentResolver().openInputStream(uri)) {
            if (input == null) {
                call.reject("Android konnte die Sicherungsdatei nicht öffnen.", "BACKUP_SOURCE_UNAVAILABLE");
                return;
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[16 * 1024];
            int total = 0;
            int count;
            while ((count = input.read(buffer)) != -1) {
                total += count;
                if (total > MAX_BACKUP_BYTES) {
                    call.reject("Die Sicherungsdatei ist größer als 12 MB.", "BACKUP_TOO_LARGE");
                    return;
                }
                output.write(buffer, 0, count);
            }
            JSObject response = new JSObject();
            response.put("contents", output.toString(StandardCharsets.UTF_8.name()));
            response.put("fileName", displayName(uri));
            response.put("bytesRead", total);
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Die Sicherungsdatei konnte nicht gelesen werden.", "BACKUP_OPEN_FAILED", error);
        }
    }

    private String displayName(Uri uri) {
        try (android.database.Cursor cursor = getContext()
            .getContentResolver()
            .query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) return safeFileName(cursor.getString(index));
            }
        } catch (Exception ignored) {
            // A provider may not expose a display name. The fallback is safe.
        }
        return "Pams-Holo-Sicherung" + FILE_SUFFIX;
    }

    private String safeFileName(String value) {
        String candidate = String.valueOf(value == null ? "" : value)
            .replaceAll("[\\\\/\\r\\n\\t]", "-")
            .replaceAll("[^a-zA-Z0-9ÄÖÜäöüß._-]", "-")
            .replaceAll("-+", "-");
        if (candidate.length() > 120) candidate = candidate.substring(0, 120);
        if (candidate.isEmpty()) return "";
        if (!candidate.endsWith(FILE_SUFFIX)) candidate += FILE_SUFFIX;
        return candidate;
    }
}
