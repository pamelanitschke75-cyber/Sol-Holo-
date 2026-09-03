# Pam’s Holo – feste Update-Signatur aus Build #89

**Status:** verbindliche Release-Regel

Für Pam’s Holo gilt ab sofort ausschließlich die Signatur der bestätigten Build-#89-APK als gültige Update-Identität.

## Bestätigte Referenz

- Zertifikatsinhaber: `CN=Pam's Holo Original, O=Pam's Holo, C=DE`
- SHA-256:
  `E1:22:20:10:77:B9:3C:B4:7E:DB:69:51:44:6F:B8:DF:F7:74:27:A2:F5:A2:BD:47:19:47:4A:63:8F:E8:03:E9`

Diese Werte wurden direkt aus der vorhandenen, signierten Pam’s-Holo-APK ausgelesen.

## Verbindliche Regel für alle zukünftigen Builds

Ein neuer Android-Build darf nur als fertiges Pam’s-Holo-Update veröffentlicht oder als Update bezeichnet werden, wenn:

1. genau eine fertige Datei `Pams-Holo-Update.apk` erzeugt wurde,
2. die APK kryptografisch signiert ist,
3. der SHA-256-Zertifikatsfingerabdruck exakt mit Build #89 übereinstimmt,
4. der Zertifikatsinhaber exakt `CN=Pam's Holo Original, O=Pam's Holo, C=DE` ist.

Fehlt die feste Signatur, stimmt der Fingerabdruck nicht oder wurde nur eine unsignierte Signierquelle erzeugt, ist der Build **nicht releasefähig**.

Es darf für Updates niemals stillschweigend ein neuer, temporärer oder zufälliger Signierschlüssel verwendet werden.

## Automatischer Wächter

`.github/workflows/build89-signature-guard.yml` prüft nach jedem erfolgreichen Android-Build das erzeugte Artefakt gegen diese feste Referenz. Ein unsigniertes Artefakt oder eine andere Signatur führt ausdrücklich zu einem Fehler.

Die sichere S23-Gerätesitzung/Server-Challenge ist davon getrennt. Änderungen an dieser Sitzungslogik dürfen die APK-/Update-Signatur nicht verändern.
