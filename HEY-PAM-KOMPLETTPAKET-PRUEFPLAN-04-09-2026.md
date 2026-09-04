# „Hey Pam“ – Komplettpaket und verbindlicher S23-Prüfplan

**Stand:** 04.09.2026

**Status:** **BUILD 145 AUF DEM GALAXY S23 NICHT BESTANDEN · DIREKTER
SPERRBILDSCHIRM-SPRACHDIALOG INTERN BESTANDEN · NEUER ORIGINALSIGNIERTER BUILD
UND S23-PRAXISTEST AUSSTEHEND**

Dieser Stand wird nicht als abgeschlossen bezeichnet, bevor die gesamte
Nutzungskette auf Pams echtem Samsung Galaxy S23 bestanden ist. Einzelne grüne
Teiltests reichen dafür ausdrücklich nicht aus.

**Eine verbindliche Abnahmebedingung:** Unabhängig davon, ob Pam’s Holo, der
Startbildschirm, Kalender, WhatsApp, eine Google-App, die Telefon-App, Netflix,
Samsung Notes, irgendeine andere App, der Sperrbildschirm oder ein
ausgeschaltetes Display zu sehen ist, muss „Hey Pam“ Pams Holo wecken und den
Sprachdialog mit Pam starten. Neustart, Aktualisierung und der geführte Umzug
auf ein neues Handy gehören zu derselben Gesamtkette.

## Reparierte Gesamtkette

1. Der bereits laufende Mikrofon-Vordergrunddienst wird beim Sperren direkt im
   selben Prozess fortgesetzt. Er wird nicht durch einen auf Android 14 und
   neuer unzulässigen Hintergrund-Neustart ersetzt.
2. Eine partielle Android-Wake-Lock hält die lokale Keyword- und
   Sprechererkennung auch bei ausgeschaltetem Display rechenbereit.
3. Nach lokal erkanntem „Hey Pam“ und bestandener Besitzerstimmenprüfung wacht
   der Bildschirm auf und öffnet direkt Pams reinen Sprachmodus.
4. Pam antwortet sofort per Stimme. Dafür ist weder ein Tipp noch das vorherige
   Entsperren des Smartphones nötig.
5. PIN, Fingerabdruck, Gesichtserkennung und die Android-Gerätesperre werden
   dabei nicht aufgehoben. Der normale App-Inhalt bleibt verdeckt und kritische
   Aktionen behalten ihre eigene Sicherheitsbestätigung. Nach Gesprächsende
   verschwindet der Sprachmodus wieder hinter die Gerätesperre.
6. Nach Ende einer Sprachsitzung oder Rückkehr aus Samsung Notes, Kalender oder
   einer anderen App nimmt derselbe Weckdienst das Lauschen wieder auf.

## Reeller Zwischenbefund mit Build 145

- Das Update über die vorhandene Installation war erfolgreich. Einstellungen,
  Hintergrundmodus sowie Pams vorhandene `3/3`-Stimmproben blieben erhalten.
- „Hey Pam“ funktioniert in der geöffneten App und im entsperrten Hintergrund
  beziehungsweise aus einer anderen App.
- Am Sperrbildschirm beziehungsweise bei ausgeschaltetem Display reagiert der
  Weckruf nicht.
- Nach diesem gescheiterten Sperrversuch reagiert dieselbe Hörsitzung auch nach
  Rückkehr in die geöffnete App nicht mehr von selbst.

Damit ist Build 145 ausdrücklich **nicht bestanden**. Die bestandenen offenen
Teilfälle ändern daran nichts.

## Daraus abgeleitete Korrektur

1. Android kann eine laufende `AudioRecord`-Sitzung bei einer Änderung der
   Aufnahmepriorität weiterlaufen lassen, ihr aber nur Stille liefern. Die alte
   Prüfung zählte lediglich gelieferte Samples und hielt diesen Zustand deshalb
   fälschlich für gesund.
2. Der Dienst überwacht zusätzlich Androids `isClientSilenced()`-Status und
   echte Nicht-Null-PCM-Samples. Eine stumme oder stehende Sitzung wird ersetzt.
3. Beim Sperren wird die bereits erlaubte Mikrofon-Vordergrundsitzung im selben
   Dienst kontrolliert neu verbunden. Beim normalen Entsperren wird sie nochmals
   frisch aktiviert, damit ein Sperrfehler nicht in der offenen App fortbesteht.
4. Die partielle Wake-Lock bleibt auch während der kurzen Neustartverzögerung
   gehalten; der Prozessor kann den geplanten Wiederanlauf bei ausgeschaltetem
   Display daher tatsächlich ausführen.
5. Die Aufnahme wird auf unterstützten Android-Versionen ausdrücklich als
   privacy-sensitive markiert. Owner-Phrase, vorhandenes Stimmprofil und beide
   unabhängigen Sprecherprüfungen bleiben unverändert zwingend.
6. Nach einem Handy-Neustart oder einer App-Aktualisierung bleibt der gewählte
   Hintergrundmodus gespeichert. Android 14 und neuer verbietet einer normalen
   App den stillen Start eines Mikrofon-Vordergrunddienstes aus einem
   System-Broadcast. Deshalb erscheint ein eindeutiger Systemhinweis. Ein Tipp
   auf **Jetzt aktivieren** startet den gespeicherten Hintergrundmodus direkt;
   der Profilbildschirm und der Hintergrund-Schalter sind dafür nicht nötig.
7. Der Hinweis bleibt stehen, bis der lokale Hördienst seine echte
   Hörbereitschaft bestätigt. Pams 3/3-Stimmproben werden dabei weder gelöscht
   noch neu angefordert.
8. Für einen Handywechsel enthält die verschlüsselte Sicherung einen festen
   Vier-Schritt-Ablauf. Erinnerungen und erlaubte Einstellungen werden
   wiederhergestellt; das neue Gerät und Pams Stimme werden bewusst frisch
   bestätigt. Danach ist der Hintergrundmodus wieder Teil derselben
   Neustart-/Update-Kette.
9. Welche fremde App gerade im Vordergrund steht, ist kein Eingang der
   Weckentscheidung. Der Hintergrunddienst bleibt beim Verlassen von Pam’s Holo
   aktiv. Belegt ein echter Telefon-/WhatsApp-Anruf oder eine andere Aufnahme
   Androids Mikrofon vorübergehend, erkennt der PCM-Gesundheitscheck die
   Stummschaltung und verbindet den Weckruf nach der Freigabe selbst wieder.

## Unverändert zu erhalten

- Paket-ID `com.solholo.app`
- Owner-ID `pam-sol`
- vorhandene 3/3-Stimmproben und lokale Sprecherprüfungen
- persönlicher Weckruf „Hey Pam“
- Vollzeitgedächtnis, Erinnerungen, Einstellungen und sonstige App-Daten
- Zertifikat SHA-256 aus Build 89:
  `e122201077b93cb47edb6951446fb8dff77427a2f5a2bd4719474a638fe803e9`

## Ein einziger verbindlicher Abnahmelauf

| Prüfung auf Pams Galaxy S23 | Mindestanforderung | Status |
|---|---:|---|
| App geöffnet | „Hey Pam“ startet 3 von 3 Versuchen | mit Build 145 bestanden; nach Sperrfehler jedoch ohne Selbstheilung |
| Beliebige App im Vordergrund: Kalender, WhatsApp, Google, Telefon-App, Netflix und Samsung Notes | Je App Weckruf einschließlich Sprachdialog; die Paketwahl darf den Weckdienst nicht verändern | mit Build 145 grundsätzlich für eine andere App bestanden; breite Korrektur-Abnahme offen |
| Rückkehr nach aktivem Telefon-/WhatsApp-Anruf oder anderer Mikrofonbelegung | Ohne erneutes Drücken automatisch wieder hörbereit | neu in Korrektur-Abnahme; offen |
| Sperrbildschirm sichtbar | „Hey Pam“, Besitzerstimme und sofortige gesprochene Antwort ohne Tipp/Entsperren: 3 von 3 | mit Build 145 nicht bestanden; direkter Sprachmodus intern geprüft; neuer S23-Test ausstehend |
| Display vollständig aus | Wecken, Besitzerprüfung und sofortige gesprochene Antwort ohne Tipp/Entsperren: 3 von 3 | mit Build 145 nicht bestanden; direkter Sprachmodus intern geprüft; neuer S23-Test ausstehend |
| Rückkehr aus Samsung Notes oder Kalender | Sprach-Audio funktioniert und „Hey Pam“ ist danach erneut bereit | offen |
| Sprachdialog beenden, sperren, erneut wecken | Keine festhängende Pause und keine zweite Mikrofoninstanz | offen |
| Handy vollständig neu starten | Gespeicherter Hintergrundmodus bleibt; **Jetzt aktivieren** führt nach einem Tipp direkt zur Hörbereitschaft | neu in Korrektur-Build; Praxistest ausstehend |
| Update über vorhandene Installation | App-Daten, Einstellungen und Stimmprofil bleiben erhalten; Hinweis führt nach einem Tipp direkt zur Hörbereitschaft | Datenerhalt mit Build 145 bestanden; Wiederanlauf neu in Korrektur-Build |
| Wechsel auf ein neues Handy | Originalsignierte App, verschlüsselte Datenwiederherstellung, neue Gerätebestätigung, 3/3-Stimmaufnahme und Hintergrundaktivierung sind vollständig geführt | neu im Komplettpaket; Praxistest auf einem Ersatzgerät ausstehend |
| APK-Identität | Paket-ID, höherer `versionCode` und exaktes Build-89-Zertifikat | für Build 145 bestanden; beim Korrektur-Build erneut prüfen |

Erst wenn jede Zeile bestanden ist, darf der Status in **KOMPLETTPAKET
BESTANDEN** geändert und die Reparatur als abgeschlossen zusammengeführt
werden.
