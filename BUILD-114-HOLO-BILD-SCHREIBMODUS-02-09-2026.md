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
- GitHub Actions Build #114 hat zusätzlich die Java-Sicherheitslogik, Mehrfaktorlogik, Android-Laufzeitabhängigkeiten, Lizenzdateien und die Release-APK erfolgreich geprüft.

## GitHub und Android-Build

- Pull Request: **#6 – Build #114: Holo kleiner und beim Schreiben ausblenden**
- In `main` integriert: **ja**
- Merge-Commit: `1f8371c67abc2933d3ee1c20c30c7f67fe264dd4`
- GitHub-Actions-Lauf: **Pam’s Holo Android APK · Sol Holo #114**
- Workflow-Ergebnis: **erfolgreich**
- Application-ID: `com.solholo.app`
- Versionscode: `114`
- Versionsname: `1.0`
- Update-Signatur: **Originalsignatur von Pam’s Holo**
- Zertifikat SHA-256: `e122201077b93cb47edb6951446fb8dff77427a2f5a2bd4719474a638fe803e9`
- APK-Signaturschemata: **V1, V2 und V3 gültig**
- Signierte APK SHA-256: `8152367614f21311d80d204b8bbb8d4fa7c5fc50b96944f829561eb6dfda8f27`

## Noch offen

- Praktischer Test auf Pams Samsung Galaxy S23:
  - Normalansicht: Holo-Bild klein und mittig
  - Tastatur öffnen: Holo-Bild vollständig weg
  - Tastatur schließen: Holo-Bild wieder sichtbar
  - Schreiben und Senden mit einer sowie mehreren Zeilen
  - Einstellungen und App-Daten nach dem Update weiterhin vorhanden

## Status

- **technisch umgesetzt:** ja
- **automatisch geprüft:** ja – 73/73 JavaScript-Tests lokal und vollständiger GitHub-Workflow erfolgreich
- **Android-Build geprüft:** ja – Build #114 erfolgreich
- **original signierte Update-APK:** ja – Paket, Versionscode und Zertifikat geprüft
- **auf Pams S23 bestätigt:** nein, noch offen
- **Bestätigung des gewünschten Verhaltens durch Pam:** ja
- **Bestätigung nach Installation auf Pams S23:** nein, noch offen
- **MEILENSTEIN:** nein
