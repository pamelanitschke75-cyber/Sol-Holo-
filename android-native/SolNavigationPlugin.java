package com.solholo.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import java.util.Locale;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SolNavigation")
public class SolNavigationPlugin extends Plugin {
    private static final String GOOGLE_MAPS_PACKAGE =
        "com.google.android.apps.maps";
    private static final int MAX_DESTINATION_LENGTH = 500;

    private boolean googleMapsInstalled() {
        Intent launchIntent = getContext()
            .getPackageManager()
            .getLaunchIntentForPackage(GOOGLE_MAPS_PACKAGE);
        return launchIntent != null;
    }

    private String normalizedMode(String requestedMode) {
        String mode = requestedMode == null
            ? "driving"
            : requestedMode.trim().toLowerCase(Locale.ROOT);

        if (
            "walking".equals(mode) ||
            "bicycling".equals(mode) ||
            "transit".equals(mode)
        ) {
            return mode;
        }

        return "driving";
    }

    private String googleNavigationMode(String mode) {
        if ("walking".equals(mode)) return "w";
        if ("bicycling".equals(mode)) return "b";
        return "d";
    }

    private Intent directGoogleNavigationIntent(
        String destination,
        String mode
    ) {
        Uri uri = new Uri.Builder()
            .scheme("google.navigation")
            .appendQueryParameter("q", destination)
            .appendQueryParameter("mode", googleNavigationMode(mode))
            .build();

        return new Intent(Intent.ACTION_VIEW, uri)
            .setPackage(GOOGLE_MAPS_PACKAGE)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
    }

    private Intent googleMapsWebIntent(
        String destination,
        String mode,
        boolean installed
    ) {
        Uri uri = Uri.parse("https://www.google.com/maps/dir/")
            .buildUpon()
            .appendQueryParameter("api", "1")
            .appendQueryParameter("destination", destination)
            .appendQueryParameter("travelmode", mode)
            .build();

        Intent intent = new Intent(Intent.ACTION_VIEW, uri)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

        if (installed) {
            intent.setPackage(GOOGLE_MAPS_PACKAGE);
        }

        return intent;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", true);
        result.put("provider", "Google Maps");
        result.put("packageName", GOOGLE_MAPS_PACKAGE);
        result.put("installed", googleMapsInstalled());
        result.put("locationPermissionRequired", false);
        result.put("usesCurrentLocationInGoogleMaps", true);
        call.resolve(result);
    }

    @PluginMethod
    public void openGoogleMaps(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject(
                "Google Maps konnte gerade nicht geöffnet werden.",
                "GOOGLE_MAPS_ACTIVITY_UNAVAILABLE"
            );
            return;
        }

        Intent intent = getContext()
            .getPackageManager()
            .getLaunchIntentForPackage(GOOGLE_MAPS_PACKAGE);

        if (intent == null) {
            intent = new Intent(
                Intent.ACTION_VIEW,
                Uri.parse("https://www.google.com/maps")
            );
        }

        try {
            activity.startActivity(intent);
            JSObject result = new JSObject();
            result.put("opened", true);
            result.put("provider", "Google Maps");
            result.put("packageName", GOOGLE_MAPS_PACKAGE);
            result.put("installed", googleMapsInstalled());
            call.resolve(result);
        } catch (ActivityNotFoundException error) {
            call.reject(
                "Google Maps wurde auf diesem Handy nicht gefunden.",
                "GOOGLE_MAPS_NOT_AVAILABLE",
                error
            );
        }
    }

    @PluginMethod
    public void startNavigation(PluginCall call) {
        String destination = call.getString("destination", "").trim();

        if (destination.isEmpty()) {
            call.reject(
                "Bitte nenne ein Ziel für Google Maps.",
                "NAVIGATION_DESTINATION_REQUIRED"
            );
            return;
        }

        if (destination.length() > MAX_DESTINATION_LENGTH) {
            call.reject(
                "Das Navigationsziel ist zu lang.",
                "NAVIGATION_DESTINATION_TOO_LONG"
            );
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject(
                "Google Maps konnte gerade nicht geöffnet werden.",
                "GOOGLE_MAPS_ACTIVITY_UNAVAILABLE"
            );
            return;
        }

        String mode = normalizedMode(call.getString("mode", "driving"));
        boolean installed = googleMapsInstalled();
        boolean directNavigation = installed && !"transit".equals(mode);
        Intent intent = directNavigation
            ? directGoogleNavigationIntent(destination, mode)
            : googleMapsWebIntent(destination, mode, installed);

        try {
            activity.startActivity(intent);
            JSObject result = new JSObject();
            result.put("opened", true);
            result.put("provider", "Google Maps");
            result.put("packageName", GOOGLE_MAPS_PACKAGE);
            result.put("installed", installed);
            result.put("destination", destination);
            result.put("mode", mode);
            result.put("directNavigation", directNavigation);
            result.put("locationPermissionRequired", false);
            call.resolve(result);
        } catch (ActivityNotFoundException error) {
            call.reject(
                "Google Maps konnte für dieses Ziel nicht geöffnet werden.",
                "GOOGLE_MAPS_NAVIGATION_FAILED",
                error
            );
        }
    }
}
