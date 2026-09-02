package com.solholo.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public class HealthPrivacyActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        int padding = Math.round(24 * getResources().getDisplayMetrics().density);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(padding, padding, padding, padding);
        content.setBackgroundColor(Color.rgb(5, 3, 11));

        TextView title = new TextView(this);
        title.setText("Pam’s Holo · Health-Datenschutz");
        title.setTextColor(Color.rgb(189, 114, 255));
        title.setTextSize(24);
        title.setPadding(0, 0, 0, padding / 2);
        content.addView(title);

        TextView policy = new TextView(this);
        policy.setText(
            "Pam’s Holo verwendet Health Connect ausschließlich lesend und nur, " +
            "wenn Pam eine konkrete Health-Abfrage bestätigt.\n\n" +
            "Mögliche Kategorien sind Aktivität, Körperwerte, Vitalwerte, Schlaf, " +
            "Ernährung und reproduktive Gesundheit. Android zeigt jede Freigabe " +
            "sichtbar an; einzelne Kategorien können abgewählt oder später entzogen " +
            "werden. Mit der Schaltfläche unten öffnet sich direkt die Android-Seite " +
            "für Pam’s Holo. Dort kann jede Kategorie einzeln verwaltet oder vollständig " +
            "widerrufen werden.\n\n" +
            "Pam’s Holo schreibt, verändert oder löscht keine Health-Daten. Es gibt " +
            "keinen automatischen Hintergrundzugriff und keinen automatischen Import " +
            "in das Langzeitgedächtnis. Für eine Antwort freigegebene Werte werden nur " +
            "für diese konkrete Sol-Anfrage verarbeitet.\n\n" +
            "Gesundheitswerte dienen der persönlichen Übersicht. Pam’s Holo stellt " +
            "keine medizinische Diagnose und ersetzt keine Ärztin oder keinen Arzt.\n\n" +
            "Geschäftliche Inhalte, PINs, Passwörter, TANs, Banking- und " +
            "Authenticator-Daten bleiben ausgeschlossen."
        );
        policy.setTextColor(Color.WHITE);
        policy.setTextSize(17);
        policy.setLineSpacing(0, 1.18f);
        content.addView(
            policy,
            new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        );

        Button managePermissions = new Button(this);
        managePermissions.setText("Health-Freigaben verwalten oder widerrufen");
        managePermissions.setOnClickListener(view -> openHealthPermissions());
        LinearLayout.LayoutParams manageParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        manageParams.topMargin = padding;
        content.addView(managePermissions, manageParams);

        Button close = new Button(this);
        close.setText("Schließen");
        close.setOnClickListener(view -> finish());
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        buttonParams.topMargin = padding;
        content.addView(close, buttonParams);

        ScrollView scrollView = new ScrollView(this);
        scrollView.addView(content);
        setContentView(scrollView);
    }

    private void openHealthPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            Toast.makeText(
                this,
                "Die direkte Health-Connect-Verwaltung ist ab Android 14 verfügbar.",
                Toast.LENGTH_LONG
            ).show();
            return;
        }

        Intent intent = new Intent(
            "android.health.connect.action.MANAGE_HEALTH_PERMISSIONS"
        );
        intent.putExtra(Intent.EXTRA_PACKAGE_NAME, getPackageName());

        try {
            startActivity(intent);
        } catch (
            ActivityNotFoundException
                | SecurityException error
        ) {
            Toast.makeText(
                this,
                "Die Android-Seite für Health-Freigaben ist gerade nicht verfügbar.",
                Toast.LENGTH_LONG
            ).show();
        }
    }
}
