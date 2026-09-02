# BUILD #115 – CHAT-VERHÄLTNISSE WIE FREIGEGEBEN

**Projekt:** Pam’s Holo / Sol Holo

**Ownerin:** Pamela Christina Nitschke

**Projektname:** `pam-sol`

**Build:** #115

**Datum:** 02.09.2026

## Freigegebene Gestaltung

- Das große Holo-Porträt mit Plattform belegt in der Chat-Ansicht keinen Platz mehr.
- Sols Antwortsfeld nutzt den gesamten freien Bereich zwischen Header und Eingabe.
- Das leere Schreibfeld bleibt kompakt und wächst nur mit dem eingegebenen Text.
- Kamera und Mikrofon stehen klein und frei unter dem Schreibfeld.
- Bei geöffneter Samsung-Tastatur sitzt die Eingabe direkt über der Tastatur; eine unsichtbare Holo-Zeile darf keinen Leerraum erzeugen.
- Pams kleines rundes Porträt ersetzt das Einhorn neben „Me, Myself & I. 💜“.
- Genau ein Einhorn bleibt als dezente Signatur unten rechts im Antwortsfeld.
- Der Sprachmodus und alle anderen App-Ansichten bleiben unverändert.

## Prüfung

- Quelltests prüfen die drei Chat-Reihen: Header, flexibles Antwortsfeld und Eingabe.
- Quelltests prüfen, dass der Holo-Bereich im normalen Chat immer vollständig ausgeblendet ist.
- Quelltests prüfen den spezifischen Tastatur-Selektor gegen eine unsichtbar weiterwirkende vierte Grid-Reihe.
- Quelltests prüfen Pams Header-Porträt und genau eine Einhorn-Signatur im Chat.
- **74/74 JavaScript-Tests bestanden lokal.**
- **Der öffentliche GitHub-Workflow #115 ist erfolgreich durchgelaufen.**

## Öffentlicher GitHub-Build

- Pull Request: [#7 – Build #115: Chat-Verhältnisse wie freigegeben](https://github.com/pamelanitschke75-cyber/Sol-Holo-/pull/7)
- In `main` zusammengeführt: **ja**
- Merge-Commit: `4aed7692a718df7b5f25799c2efe431641fc86a6`
- GitHub Actions: [Build #115 – erfolgreich](https://github.com/pamelanitschke75-cyber/Sol-Holo-/actions/runs/33618891711)
- Workflow-Dauer: 2 Minuten 14 Sekunden
- GitHub-Artefakt: `Pams-Holo-Android-extern_signieren`
- SHA-256 des Artefakt-ZIPs: `86f762d73b7c18e29eb0e67f7c531e73d3afa2bf76e3b92bd9d6f3ee653b9e6a`

## Originalsignierte Android-APK

- Datei: `Pams-Holo-Build-115-original-signiert.apk`
- Paketname: `com.solholo.app`
- `versionCode`: `115`
- `versionName`: `1.0`
- Signatur: APK Signature Scheme V1, V2 und V3 erfolgreich verifiziert
- Originalzertifikat: `CN=Pam's Holo Original, O=Pam's Holo, C=DE`
- Zertifikat SHA-256: `e122201077b93cb47edb6951446fb8dff77427a2f5a2bd4719474a638fe803e9`
- APK SHA-256: `fedfe550cd5d148306b92fbe19b75bffd62b603d1450fff583142e434b03df3b`
- Update-Kompatibilität: derselbe Paketname und dasselbe Originalzertifikat wie beim vorherigen Build

## Status

- Visuell freigegeben: **ja**
- Automatisch geprüft: **ja – 74/74 Tests und GitHub-Workflow erfolgreich**
- Android-APK gebaut: **ja**
- Originalsigniertes Update erstellt: **ja**
- Praxistest auf Pams Samsung S23: **noch offen**

## Bestätigung

Pam hat die visuelle Vorschau vor der Umsetzung ausdrücklich mit „Genau so!!!“ und „Ja so“ freigegeben.
