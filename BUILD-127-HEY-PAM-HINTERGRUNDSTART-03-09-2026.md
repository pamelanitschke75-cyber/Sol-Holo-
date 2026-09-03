# Build 127 – „Hey Pam“ öffnet Pams Holo aus dem Hintergrund

Stand: 03.09.2026

## Bestätigter S23-Befund

Der persönliche Weckruf aus Build 125 funktioniert im Modus „App offen“ auf
Pams Galaxy S23 zweimal vollständig. Im Modus „Hintergrund“ hört der native
Dienst ebenfalls zu und reagiert auf „Hey Pam“, bringt Pams Holo danach aber
nicht sichtbar nach vorn.

Zwei direkt verglichene Bildschirmbilder grenzen den Fehler ein:

- vor dem Weckruf zeigt Android die aktive grüne Mikrofonanzeige;
- nach „Hey Pam“ pausiert die Aufnahme sichtbar und die Android-Statusleiste
  ändert sich;
- die zuvor sichtbare App bleibt dennoch im Vordergrund.

Damit liegt der Fehler nach der lokalen Erkennung und Besitzerprüfung beim
Android-Hintergrundstart der Activity. Er betrifft nicht Pams Stimme.

## Reparatur

- Ab Android 14 wird Pams Holo über ein eigenes `PendingIntent` gestartet.
- Die Absenderseite erhält mit `ActivityOptions` ausdrücklich die notwendige
  Hintergrundstart-Freigabe.
- Für das Ziel Android 15 erhält auch die Erstellerseite des `PendingIntent`
  die vorgeschriebene ausdrückliche Freigabe.
- Die von Pam bewusst erteilte Einblendfreigabe und die sichtbare kurze
  Weckruf-Einblendung bleiben Voraussetzung.
- Falls der freigegebene Start nicht sichtbar wird, versucht der Dienst den
  bisherigen direkten Start noch einmal innerhalb der sichtbaren Einblendung.
- Androids dauerhafte Weckruf-Benachrichtigung enthält zusätzlich „Sol öffnen“
  und meldet verständlich, wenn Android das automatische Öffnen trotzdem
  verhindert hat.

## Unverändert

- einziger persönlicher Weckruf: „Hey Pam“
- Owner-ID: `pam-sol`
- beide Sprecherprüfungen und alle Sicherheitsschwellen
- vorhandene 3/3-Stimmproben und gespeicherte Hey-Pam-Vorlage
- Vollzeitgedächtnis, Einstellungen, Erinnerungen und weitere App-Daten
- Paket-ID `com.solholo.app` und Originalsignatur aus Build 89

## Prüfstatus

- automatisierte Regressionstests: lokal und in GitHub Actions auszuführen
- Android-Build und Originalsignatur: vor Veröffentlichung zu bestätigen
- echter Hintergrundtest auf Pams Galaxy S23: **offen**
- Sperrbildschirmtest: erst nach bestandenem Hintergrundtest

Der zweimal bestandene Modus „App offen“ wird durch diesen noch offenen
Hintergrundtest nicht zurückgenommen.
