# BUILD #114 – KLEINES HOLO-BILD UND FREIER SCHREIBMODUS

**Datum:** 02.09.2026

**Projekt:** Sol Holo / Pam’s Holo

**Owner:** Pamela Christina Nitschke (`pam-sol`)

**Ausgangsbasis:** Build #113

**Build:** #114

## Umgesetzt

- Pams persönliches Holo-Bild ist in der normalen Chat-Ansicht deutlich kleiner und bleibt mittig angeordnet.
- Sobald die Android-Bildschirmtastatur tatsächlich geöffnet ist, wird der komplette Holo-Bildbereich einschließlich Holo-Basis ausgeblendet.
- Der frei gewordene Platz steht vollständig dem Antwort- und Schreibbereich zur Verfügung.
- Wird die Bildschirmtastatur geschlossen, erscheint das kleine Holo-Bild wieder – auch dann, wenn das Schreibfeld noch ausgewählt ist.
- Die Erkennung richtet sich nach der sichtbaren Android-Fensterhöhe und nicht nur nach dem Fokus des Schreibfeldes. Dadurch bleibt das Bild bei einer externen Tastatur sichtbar, wenn keine Bildschirmfläche durch eine Softwaretastatur verloren geht.
- Das automatisch wachsende Schreibfeld, der Sendepfeil sowie die kleinen Kamera- und Mikrofontasten unterhalb des Schreibfeldes bleiben erhalten.
- App-Identität, feste Owner-ID `pam-sol`, Sicherheitsfunktionen, persönliche Daten und Einstellungen wurden nicht verändert.

## Automatische Prüfung

- Der Quelltest prüft die kleinere Normalgröße des Holo-Bildes.
- Der Quelltest prüft, dass der gesamte Holo-Bildbereich im Schreibmodus vollständig ausgeblendet wird.
- Der Quelltest prüft die tastaturabhängige Umschaltung anhand der sichtbaren Fensterhöhe.
- **73/73 JavaScript-Tests bestanden lokal.**

## Noch offen

- Android-Workflow und Release-APK für Build #114
- Prüfung von Application-ID, Versionscode und Originalsignatur
- Praktischer Test auf Pams Samsung Galaxy S23:
  - Normalansicht: Holo-Bild klein und mittig
  - Tastatur öffnen: Holo-Bild vollständig weg
  - Tastatur schließen: Holo-Bild wieder sichtbar
  - Schreiben und Senden mit einer sowie mehreren Zeilen
  - Einstellungen und App-Daten nach dem Update weiterhin vorhanden

## Status

- **technisch umgesetzt:** ja
- **automatisch geprüft:** ja – 73/73 JavaScript-Tests lokal
- **Android-Build geprüft:** noch offen
- **original signierte Update-APK:** noch offen
- **auf Pams S23 bestätigt:** nein, noch offen
- **Bestätigung durch Pam:** nein
- **MEILENSTEIN:** nein
