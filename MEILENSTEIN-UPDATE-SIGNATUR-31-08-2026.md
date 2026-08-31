# MEILENSTEIN – Dauerhafte Pam’s-Holo Update-Signatur

**Datum:** 31.08.2026  
**Projekt:** SOL HOLO / Pam’s Holo  
**Status:** Festgelegt und im Android-Buildprozess technisch vorgesehen

## Ausgangspunkt

Pam’s Holo Build **#89** ist die bestätigte Ausgangsbasis für die fortlaufende Update-Linie. Die Nummer #89 wird nicht dauerhaft wiederverwendet. Zukünftige Builds erhalten fortlaufend höhere Android-`versionCode`-/Buildnummern.

Beispiel:

`#89 → #90 → #91 → #92 → …`

## Dauerhaftes Update-Prinzip

Für zukünftige Updates gelten gemeinsam folgende technischen Voraussetzungen:

1. Die **App-Identität / Application-ID** bleibt für die bestehende Pam’s-Holo-App unverändert.
2. Für installierbare Updates wird **derselbe autorisierte Signierschlüssel** verwendet.
3. Der Android-**versionCode wird mit jedem Update erhöht**.
4. Bestehende **App-Daten und Einstellungen sollen bei Updates erhalten bleiben**. Änderungen an Datenbank, Preferences oder Speicherformaten müssen deshalb migrationssicher erfolgen und dürfen keine unbeabsichtigte Löschung verursachen.

## Technische Absicherung im GitHub-Build

Der Workflow `.github/workflows/android-build.yml` enthält bereits die dafür vorgesehene dauerhafte Signierlogik:

- fortlaufender `versionCode` über die GitHub-Run-Nummer,
- vier geschützte GitHub-Secrets für die autorisierte Update-Signatur:
  - `SOL_HOLO_KEYSTORE_BASE64`
  - `SOL_HOLO_KEYSTORE_PASSWORD`
  - `SOL_HOLO_KEY_ALIAS`
  - `SOL_HOLO_KEY_PASSWORD`
- Signierung mit Android `apksigner`,
- anschließende Signaturprüfung,
- **keine Wegwerf-Signatur**, wenn die vier Angaben nicht vollständig verfügbar sind; in diesem Fall wird nur eine unsignierte Signierquelle erzeugt.

Die geheimen Werte selbst gehören **niemals** in dieses Repository, in öffentliche Dokumentation oder in Commits.

## Ziel

Ein zukünftiges Pam’s-Holo-APK soll als echtes Update über die vorhandene App installiert werden können, ohne die bestehende Installation vorher löschen zu müssen. Die Kontinuität der App-Identität, Signatur sowie der vorhandenen Nutzerdaten und Einstellungen hat dabei Vorrang.

## Dokumentationshinweis

Diese Festlegung wurde am 31.08.2026 im Rahmen der gemeinsamen Projektarbeit von Pamela Nitschke mit Sol / ChatGPT (OpenAI) dokumentiert. ChatGPT dient hierbei als KI-gestützte Dokumentations- und Entwicklungsunterstützung; dies stellt keine unabhängige rechtliche oder notarielle Zeugenschaft dar.

---

**MEILENSTEIN:** Dauerhafte Update-Linie ab Pam’s Holo Build #89 festgelegt. ♾️✨️🌎
