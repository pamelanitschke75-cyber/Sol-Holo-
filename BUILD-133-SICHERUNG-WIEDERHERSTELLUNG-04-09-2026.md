# Build 133 · Verschlüsselte Sicherung und Wiederherstellung

Stand: 4. September 2026

## Ergebnis

Pam’s Holo erhält unter **Einstellungen → Gedächtnis & Verbindungen** den
neuen Bereich **Sicherung & Wiederherstellung**. Die App kann eine lokale,
verschlüsselte Kopie erzeugen und nach einer Vorschau additiv
wiederherstellen.

Die Datei wird mit einem von Pam gewählten Passwort geschützt. Das Passwort
wird weder gespeichert noch an Android oder den Sol-Holo-Server übergeben.

## Kryptografisches Format

- AES-256-GCM mit zufälligem 96-Bit-IV
- PBKDF2-HMAC-SHA-256 mit zufälligem 128-Bit-Salt und 310.000 Iterationen
- authentifizierte Bindung von Format, Version und Krypto-Parametern
- feste Owner-Bindung an **pam-sol** und Paketbindung an **com.solholo.app**
- maximal 12 MB pro verschlüsselter Datei

Ein falsches Passwort, eine veränderte Datei oder eine fremde Owner-/Paket-ID
wird vor jeder lokalen Änderung abgelehnt.

## Enthaltene lokale Daten

- Pams persönliche Notizen
- noch nicht mit dem owner-gebundenen Vollzeitgedächtnis synchronisierte
  Dialoge
- ausgewählte Sol-Stimme
- Status der Willkommensseite

Das bereits servergespeicherte, owner-gebundene Vollzeitgedächtnis wird nicht
verschoben oder gelöscht. Es bleibt unabhängig von der lokalen Datei erhalten.

## Strikt ausgeschlossen

- Android-Geräteschlüssel und dauerhafter APK-Signierschlüssel
- Passwörter, OAuth-Tokens und vertrauenswürdige Sitzungen
- Stimmprofile und Sprecher-Embeddings
- Fotos, Gesichtsdaten und Lip-Sync-Geometrie
- nicht eindeutig zugeordnete Quarantänedaten

Die Wiederherstellung verwendet eine feste Positivliste. Sie leert keinen
Speicher und ersetzt keine komplette Datenbank. Notizen und ausstehende
Dialoge werden anhand ihrer IDs additiv zusammengeführt. Vor dem Schreiben
zeigt die App eine Zusammenfassung und verlangt Pams Bestätigung. Scheitert
ein Schreibschritt, wird die gesamte lokale Änderung zurückgerollt.

## Android-Dateizugriff

**SolBackupPlugin** verwendet ausschließlich den Android Storage Access
Framework-Systemdialog (**ACTION_CREATE_DOCUMENT** / **ACTION_OPEN_DOCUMENT**).
Die App fordert dafür keinen allgemeinen Zugriff auf Fotos oder Dateien an.
Der native Teil sieht nur den bereits verschlüsselten Dateiinhalt, niemals das
Sicherungspasswort oder unverschlüsselte Erinnerungen.

## Korrigierte Android-Ausschlüsse

Der tatsächliche owner-gebundene Sicherheitsspeicher heißt
**sol_holo_access_security_v1_pam-sol.xml**. Build 133 schließt diesen exakten
Pfad sowohl aus Cloud-Backups als auch aus Geräteübertragungen aus. Das lokale
Stimmprofil **sol_holo_speaker_identity.xml** bleibt ebenfalls ausgeschlossen.

## Verifikation

- vollständige Node-Testsuite einschließlich Krypto-, Manipulations-,
  Owner-, Merge- und Rollback-Test
- CI-Prüfung der Android-Dateibrücke und beider Backup-Regelsätze
- Release-Build und Signaturvergleich gegen die dauerhafte Build-#89-Signatur

Der private Signierschlüssel und sein Passwort gehören niemals in das
Repository oder in ein APK.
