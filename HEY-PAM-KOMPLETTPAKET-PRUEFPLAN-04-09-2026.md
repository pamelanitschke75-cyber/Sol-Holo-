# „Hey Pam“ – Komplettpaket und verbindlicher S23-Prüfplan

**Stand:** 04.09.2026

**Status:** **BUILD 145 AUF DEM GALAXY S23 NICHT BESTANDEN · KORREKTUR DES
SPERRWECHSELS UND DER STUMMEN MIKROFONSITZUNG IN ARBEIT**

Dieser Stand wird nicht als abgeschlossen bezeichnet, bevor die gesamte
Nutzungskette auf Pams echtem Samsung Galaxy S23 bestanden ist. Einzelne grüne
Teiltests reichen dafür ausdrücklich nicht aus.

## Reparierte Gesamtkette

1. Der bereits laufende Mikrofon-Vordergrunddienst wird beim Sperren direkt im
   selben Prozess fortgesetzt. Er wird nicht durch einen auf Android 14 und
   neuer unzulässigen Hintergrund-Neustart ersetzt.
2. Eine partielle Android-Wake-Lock hält die lokale Keyword- und
   Sprechererkennung auch bei ausgeschaltetem Display rechenbereit.
3. Nach lokal erkanntem „Hey Pam“ und bestandener Besitzerstimmenprüfung wacht
   der Bildschirm mit einem inhaltsarmen Hinweis auf.
4. PIN, Fingerabdruck, Gesichtserkennung und die Android-Gerätesperre werden
   nicht umgangen.
5. Nach Pams echter Geräteentsperrung wird derselbe Weckvorgang automatisch an
   Pams Holo übergeben. Der Weckvorgang bleibt dafür bis zu 120 Sekunden gültig.
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
| Andere App im Vordergrund, Gerät entsperrt | 3 von 3 Versuchen einschließlich Sprachdialog | mit Build 145 bestanden |
| Sperrbildschirm sichtbar | Erkennung, sicherer Hinweis, Übergabe nach Pams Entsperrung: 3 von 3 | mit Build 145 nicht bestanden; Korrektur-Build ausstehend |
| Display vollständig aus | Erkennung, Bildschirmhinweis, sichere Übergabe: 3 von 3 | mit Build 145 nicht bestanden; Korrektur-Build ausstehend |
| Rückkehr aus Samsung Notes oder Kalender | Sprach-Audio funktioniert und „Hey Pam“ ist danach erneut bereit | offen |
| Sprachdialog beenden, sperren, erneut wecken | Keine festhängende Pause und keine zweite Mikrofoninstanz | offen |
| Update über vorhandene Installation | App-Daten, Einstellungen und Stimmprofil bleiben erhalten | mit Build 145 bestanden; beim Korrektur-Build erneut prüfen |
| APK-Identität | Paket-ID, höherer `versionCode` und exaktes Build-89-Zertifikat | für Build 145 bestanden; beim Korrektur-Build erneut prüfen |

Erst wenn jede Zeile bestanden ist, darf der Status in **KOMPLETTPAKET
BESTANDEN** geändert und die Reparatur als abgeschlossen zusammengeführt
werden.
