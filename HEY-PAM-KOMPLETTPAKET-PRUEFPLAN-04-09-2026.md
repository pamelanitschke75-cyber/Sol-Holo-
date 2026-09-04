# „Hey Pam“ – Komplettpaket und verbindlicher S23-Prüfplan

**Stand:** 04.09.2026

**Status:** **BUILD 143 AUF DEM GALAXY S23 NICHT BESTANDEN · KORREKTUR DES
WIEDERANLAUFS UND DER LIVE-AUDIOAUSWAHL IN ARBEIT**

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

## Reeller Zwischenbefund mit Build 143

- Das Update über die vorhandene Installation war erfolgreich. Einstellungen,
  Hintergrundmodus sowie Pams vorhandene `3/3`-Stimmproben blieben erhalten.
- Beim ersten Weckruf in der geöffneten App wurde „Hey Pam“ gehört, Pams Stimme
  jedoch abgelehnt.
- Der unmittelbar folgende Versuch löste keine sichtbare Reaktion aus, obwohl
  die Oberfläche weiterhin „Hintergrund aktiv“ anzeigte.
- Erst nach erneutem Tippen auf **Hintergrund** wurde Pams Stimme freigegeben
  und Sols Sprachansicht gestartet.

Damit ist Build 143 ausdrücklich **nicht bestanden**. Der manuelle erneute Tipp
ist nur der bestätigte Fehlerhinweis, nicht der akzeptierte Endzustand.

## Daraus abgeleitete Korrektur

1. Der Java-Wrapper von sherpa-onnx liefert Token-Zeitstempel relativ zu einem
   intern nach Sprechpausen zurückgesetzten Decoderabschnitt. Diese relativen
   Werte dürfen nicht als absolute Position in einem dauerhaft laufenden
   PCM-Ringpuffer verwendet werden. Die Sprecherprüfung erhält deshalb nur noch
   das begrenzte jüngste Audiofenster des tatsächlich erkannten Weckrufs.
2. Aus diesem Fenster wird der jüngste vollständige Sprachabschnitt ausgewählt,
   damit ältere Geräusche oder Gespräche nicht anstelle von „Hey Pam“ geprüft
   werden.
3. Nach jeder Ablehnung wird eine vollständig frische Mikrofon- und
   Keyword-Sitzung automatisch erzeugt. Ein PCM-Gesundheitscheck ersetzt auch
   einen stehen gebliebenen Audiostrom selbstständig.
4. Ein erneuter bewusster Tipp auf **Hintergrund** erzwingt zusätzlich einen
   echten Neustart und wartet sichtbar bis zur Hörbereitschaft. Dieser Tipp darf
   für den späteren Normalbetrieb aber nicht erforderlich sein.
5. Die akustische Keyword-Schwelle wird moderat auf `0,20` gestellt. Sie allein
   erteilt keine Freigabe; die owner-gebundene Phrase und beide unabhängigen
   Sprecherprüfungen bleiben vor jedem Start zwingend.

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
| App geöffnet | „Hey Pam“ startet 3 von 3 Versuchen | Build 143 nicht bestanden; Korrektur-Build ausstehend |
| Andere App im Vordergrund, Gerät entsperrt | 3 von 3 Versuchen einschließlich Sprachdialog | offen |
| Sperrbildschirm sichtbar | Erkennung, sicherer Hinweis, Übergabe nach Pams Entsperrung: 3 von 3 | offen |
| Display vollständig aus | Erkennung, Bildschirmhinweis, sichere Übergabe: 3 von 3 | offen |
| Rückkehr aus Samsung Notes oder Kalender | Sprach-Audio funktioniert und „Hey Pam“ ist danach erneut bereit | offen |
| Sprachdialog beenden, sperren, erneut wecken | Keine festhängende Pause und keine zweite Mikrofoninstanz | offen |
| Update über vorhandene Installation | App-Daten, Einstellungen und Stimmprofil bleiben erhalten | mit Build 143 bestanden; beim Korrektur-Build erneut prüfen |
| APK-Identität | Paket-ID, höherer `versionCode` und exaktes Build-89-Zertifikat | für Build 143 bestanden; beim Korrektur-Build erneut prüfen |

Erst wenn jede Zeile bestanden ist, darf der Status in **KOMPLETTPAKET
BESTANDEN** geändert und die Reparatur als abgeschlossen zusammengeführt
werden.
