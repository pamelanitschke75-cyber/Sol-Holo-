package com.solholo.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

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
        title.setText("Pam Holo · Health-Datenschutz");
        title.setTextColor(Color.rgb(189, 114, 255));
        title.setTextSize(24);
        title.setPadding(0, 0, 0, padding / 2);
        content.addView(title);

        TextView policy = new TextView(this);
        policy.setText(
            "Pam Holo verwendet Health Connect ausschließlich lesend und nur, " +
            "wenn Pam eine konkrete Health-Abfrage bestätigt.\n\n" +
            "Mögliche Kategorien sind Aktivität, Körperwerte, Vitalwerte, Schlaf, " +
            "Ernährung und reproduktive Gesundheit. Android zeigt jede Freigabe " +
            "sichtbar an; einzelne Kategorien können abgewählt oder später entzogen " +
            "werden.\n\n" +
            "Pam Holo schreibt, verändert oder löscht keine Health-Daten. Es gibt " +
            "keinen automatischen Hintergrundzugriff und keinen automatischen Import " +
            "in das Langzeitgedächtnis. Für eine Antwort freigegebene Werte werden nur " +
            "für diese konkrete Sol-Anfrage verarbeitet.\n\n" +
            "Gesundheitswerte dienen der persönlichen Übersicht. Pam Holo stellt " +
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
}
