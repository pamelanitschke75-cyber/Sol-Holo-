# Build #117 – „Hey Sol“ auf dem Samsung S23

**Datum:** 02.09.2026  
**Owner:** Pamela Christina Nitschke  
**Gerät für die abschließende Praxisprüfung:** Samsung Galaxy S23  
**Paket:** `com.solholo.app`

## Beobachtung in Build #116

- Die Installation als Update war erfolgreich.
- Das vorhandene Stimmprofil blieb mit **3/3 Stimmproben** erhalten.
- Die App zeigte **„Profil bereit“** und **„App hört zu“**.
- Trotzdem löste der gesprochene Weckruf „Hey Sol“ nicht aus.

## Ursache und Reparatur

Build #116 verwendete vor Androids eigentlicher Spracherkennung eine eigene
Lautstärke-Vorprüfung. Wenn diese Pams kurze oder leise Aussprache nicht als
vollständige Sprache einstufte, wurde die Aufnahme still verworfen. Die Anzeige
kehrte danach wieder zu „App hört zu“ zurück, ohne dass Android „Hey Sol“
auswerten konnte.

Build #117 nutzt diese Vorprüfung nur noch, um eine fertige Aufnahme schneller
zu beenden. Jede ausreichend lange Aufnahme wird an Androids lokale
Spracherkennung weitergereicht. Die Vorprüfung darf die Aufnahme weder
freigeben noch verwerfen.

## Unveränderte Sicherheitsgrenzen

- Als Weckruf gilt weiterhin ausschließlich **„Hey Sol“**.
- Erst das vollständige Erkennungsergebnis darf den Weckruf bestätigen.
- Beide unabhängigen Stimmprüfungen bleiben vor dem Öffnen von Sol zwingend.
- Pams vorhandene 3/3 Stimmproben werden weiterverwendet.
- Keine Neuaufnahme, Neuregistrierung, Deinstallation oder Datenlöschung.
- Paketname und Originalzertifikat müssen mit Build #89 identisch bleiben.

## Automatische Absicherung

- Ein Regressionstest stellt sicher, dass die Lautstärke-Vorprüfung Androids
  Spracherkennung nicht erneut blockieren kann.
- Die Tests für exakte Weckphrase, beide Stimmprüfungen, vorhandene
  Stimmvorlage, sichere Gerätesitzung und App-Daten bleiben aktiv.

## GitHub- und APK-Nachweis

- Pull Request: [#9 – Build #117: Hey-Sol-Weckruf auf dem S23 reparieren](https://github.com/pamelanitschke75-cyber/Sol-Holo-/pull/9)
- In `main` zusammengeführt: **ja**
- Merge-Commit: `0498ba9816bea000ed1e6fbdbd6bcab76481b61b`
- GitHub Actions: [Build #117 – erfolgreich](https://github.com/pamelanitschke75-cyber/Sol-Holo-/actions/runs/33672026035)
- Laufzeit: ungefähr 2 Minuten 25 Sekunden
- 84/84 lokal ausführbare JavaScript-Tests bestanden
- Java-21-Sprach-, Mehrfaktor-, Android-, Notes-, Lizenz- und APK-Prüfungen bestanden
- GitHub-Artefakt: `Pams-Holo-Android-extern_signieren`
- Artefakt-ID: `9862953966`
- SHA-256 des Artefakt-ZIPs: `299e04ca0a384b81f5a412bae963e6465e383df21c824f844733702041afc49c`

### Originalsigniertes Update

- Datei: `Pams-Holo-Build-117-original-signiert.apk`
- Paketname: `com.solholo.app`
- `versionCode`: `117`
- `versionName`: `1.0`
- Signatur: APK Signature Scheme V1, V2 und V3 erfolgreich verifiziert
- Originalzertifikat: `CN=Pam's Holo Original, O=Pam's Holo, C=DE`
- Zertifikat SHA-256: `e122201077b93cb47edb6951446fb8dff77427a2f5a2bd4719474a638fe803e9`
- APK SHA-256: `41e451d2421d955752c831a31851dbec1398b7d6312d661254df471c99551586`
- Dateigröße: `193603192` Byte

### Updatevergleich mit Build #89

- Build #89: Paket `com.solholo.app`, `versionCode` 89, Zertifikat SHA-256
  `e122201077b93cb47edb6951446fb8dff77427a2f5a2bd4719474a638fe803e9`
- Build #117: Paket `com.solholo.app`, `versionCode` 117, dasselbe Zertifikat
- Ergebnis: **als Original-Update geeignet; eine Deinstallation oder
  Datenlöschung ist nicht erforderlich.**

## Praxisstatus

- Technische Reparatur: **umgesetzt**
- Automatische Prüfungen: **bestanden**
- Originalsigniertes Update: **erstellt und bereitgestellt**
- S23-Praxistest durch Pam: **noch offen**

Ein praktischer Erfolg wird erst nach Pams Bestätigung in GitHub eingetragen.
