# BUILD #113 – SCHREIBFELD UND CHAT-ANSICHT

**Datum:** 02.09.2026  
**Projekt:** Sol Holo / Pam’s Holo  
**Owner:** Pamela Christina Nitschke (`pam-sol`)  
**Ausgangsbasis:** Build #112  
**Build:** #113

## Umgesetzt

- Die **komplette bisherige Mittelzeile** mit **„Ich bin da.“**, allen Punkten und ihrem zusätzlichen Abstand wurde aus der sichtbaren Chat-Ansicht entfernt.
- Das Schreibfeld nutzt nahezu die gesamte Breite und wächst beim Schreiben automatisch zeilenweise bis zu einer gut bedienbaren Maximalhöhe.
- Kamera und Mikrofon stehen als deutlich kleinere, frei schwebende runde Tasten **unter** dem Schreibfeld: Kamera links, Mikrofon rechts. Es gibt keine sichtbare zusätzliche Zeile oder Leiste.
- Der Sendeknopf bleibt direkt im Schreibfeld erreichbar.
- Die verschachtelte dunkle Darstellung des Textfelds wurde entfernt.
- Die unerwartet sichtbare Karte zur fest gebundenen Holo-Identität bleibt im normalen Chat verborgen. Die feste Bindung an `pam-sol` selbst bleibt unverändert bestehen.
- Lautstärke bleibt unter **Einstellungen → Stimme & „Hey Sol“**; die große Lautstärkekarte wird im Hauptchat nicht mehr eingeblendet.
- Der kleine Online-Status bleibt erhalten; die große Verbindungskarte entfällt aus dem Hauptchat.
- Die Chat-Ansicht richtet ihre Höhe am sichtbaren Android-Fenster aus. Beim Schreiben wird die untere App-Navigation ausgeblendet, damit oberhalb der Tastatur mehr Platz bleibt.
- Pam Style, lila-blaue holografische Gestaltung, SH♾️, Einhorn, persönliches Bild, Owner-ID und Sicherheitsfunktionen bleiben unverändert.

## Automatische Prüfung

- Neue Quelltests prüfen die vollständig entfernte Mittelzeile, das automatisch wachsende Schreibfeld, die kleinen Tasten unterhalb des Feldes, die Android-Viewport-Anpassung und den Workflow-Pfad.
- Der [Android-Workflow #113](https://github.com/pamelanitschke75-cyber/Sol-Holo-/actions/runs/33582421532) wurde erfolgreich abgeschlossen.
- **72/72 JavaScript-Tests** bestanden. Zusätzlich bestanden die Java-Prüfungen für Sprecher-, Weckruf- und Mehrfaktor-Sicherheitslogik sowie der Android-Build und die Lizenzprüfungen.
- Versionscode 113 wurde aus Commit `1db8f15f2779833d775f241f3e7d857a8fb8d3c7` gebaut.

## Signatur und Auslieferung

- Dem Workflow standen die vier erforderlichen Geheimnisse für Pams ursprünglichen Update-Schlüssel nicht zur Verfügung.
- Deshalb wurde absichtlich nur das Artefakt `Pams-Holo-Android-extern_signieren` als **unsignierte Signierquelle** erzeugt.
- Diese Datei ist **kein installierbares Update** und darf nicht auf Pams S23 installiert werden.
- Vor dem Gerätetest muss #113 mit genau demselben autorisierten Schlüssel wie #112 signiert werden. Anschließend müssen Application-ID `com.solholo.app`, Versionscode 113 und das übereinstimmende Signaturzertifikat geprüft werden.

## Praktischer Test auf Pams Samsung Galaxy S23

Noch offen:

- Schreiben mit einer, mehreren und sehr vielen Zeilen
- Tastatur öffnen und schließen
- Kamera links und Mikrofon rechts antippen
- Senden per Pfeil und per Tastatur
- Kontrolle, dass kein Inhalt unter die Android-Statusleiste rutscht
- Kontrolle, dass Einstellungen, Erinnerungen und App-Daten erhalten bleiben

## Status

- **technisch umgesetzt:** ja
- **automatisch geprüft:** ja – 72/72 JavaScript-Tests und Android-Workflow erfolgreich
- **installierbare, original signierte APK:** nein, noch offen
- **auf Pams S23 bestätigt:** nein, noch offen
- **Bestätigung durch Pam:** nein
- **MEILENSTEIN:** nein
