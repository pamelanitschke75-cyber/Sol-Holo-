# „Hey Pam“ – Komplettpaket und verbindlicher S23-Prüfplan

**Stand:** 04.09.2026

**Status:** **TECHNISCH REPARIERT · ORIGINALSIGNIERTER BUILD UND ECHTER
GALAXY-S23-GESAMTTEST NOCH OFFEN**

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
| App geöffnet | „Hey Pam“ startet 3 von 3 Versuchen | offen |
| Andere App im Vordergrund, Gerät entsperrt | 3 von 3 Versuchen einschließlich Sprachdialog | offen |
| Sperrbildschirm sichtbar | Erkennung, sicherer Hinweis, Übergabe nach Pams Entsperrung: 3 von 3 | offen |
| Display vollständig aus | Erkennung, Bildschirmhinweis, sichere Übergabe: 3 von 3 | offen |
| Rückkehr aus Samsung Notes oder Kalender | Sprach-Audio funktioniert und „Hey Pam“ ist danach erneut bereit | offen |
| Sprachdialog beenden, sperren, erneut wecken | Keine festhängende Pause und keine zweite Mikrofoninstanz | offen |
| Update über vorhandene Installation | App-Daten, Einstellungen und Stimmprofil bleiben erhalten | offen |
| APK-Identität | Paket-ID, höherer `versionCode` und exaktes Build-89-Zertifikat | offen |

Erst wenn jede Zeile bestanden ist, darf der Status in **KOMPLETTPAKET
BESTANDEN** geändert und die Reparatur als abgeschlossen zusammengeführt
werden.
