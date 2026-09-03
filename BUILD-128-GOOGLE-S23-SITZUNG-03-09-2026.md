# Build 128 – Google-Verbindung mit frischer S23-Sitzung

**Datum:** 03.09.2026

**Owner:** Pamela Christina Nitschke

**Projekt/Identität:** `pam-sol`

**Öffentliches Repository:** [pamelanitschke75-cyber/Sol-Holo-](https://github.com/pamelanitschke75-cyber/Sol-Holo-)

## Bestätigter S23-Befund

Beim Antippen von **„S23 bestätigen“** bleibt Google unverbunden. Auch nach
vollständigem Schließen, erneutem Öffnen und unmittelbarer Bestätigung zeigt
Pam’s Holo weiterhin:

> Die Server-Challenge für die sichere App-Sitzung ist ungültig oder
> abgelaufen.

Damit ist der Fehler reproduzierbar. Er betrifft den neuen Bindungsablauf der
sicheren App-Sitzung und nicht Pams Bedienung oder ihr Google-Konto.

## Reparatur

- Die Android-Freigabe wird zuerst frisch bestätigt.
- Erst danach fordert Pam’s Holo eine neue Server-Challenge an.
- Eine Challenge bleibt ausschließlich im einzelnen laufenden Versuch und
  wird weder gespeichert noch bei einem späteren Klick wiederverwendet.
- Epoch-Millis werden exakt als Dezimaltext über die Capacitor-Brücke an
  Android übergeben. Android akzeptiert die kontrollierten Zahlentypen der
  WebView ebenfalls ohne Genauigkeitsverlust.
- Meldet Android oder das Backend eine ungültige beziehungsweise abgelaufene
  Challenge, verwirft die App Challenge und Freigabe vollständig. Sie holt
  genau einmal eine neue Android-Freigabe und danach eine neue Challenge.
- Ein weiterhin fehlerhafter zweiter Versuch wird geschlossen abgebrochen; es
  entsteht keine Endlosschleife.
- Die neue Modulversion wird ausdrücklich geladen, damit die WebView keinen
  vorherigen Ablauf weiterverwendet.

## Unveränderte Sicherheit und Daten

- Das Backend erzwingt weiterhin Ablaufzeit, Einmalverwendung und Signatur der
  selbst ausgegebenen Challenge.
- Android verlangt weiterhin die feste Owner-ID `pam-sol`, die Paket-ID
  `com.solholo.app`, das registrierte Gerät und eine frische
  Systemauthentifizierung.
- Der private Geräteschlüssel verlässt den Android Keystore nicht.
- Pams Google-Zugangsdaten, Tokens, Erinnerungen, Vollzeitgedächtnis,
  Einstellungen, Stimmvorlagen und vorhandene App-Daten werden nicht gelöscht
  oder ersetzt.
- Die Originalsignatur aus Build 89 bleibt Voraussetzung für das Update.

## Prüfstatus vor dem echten Gerätetest

- gezielte neue Client-Regressionstests: **3/3 erfolgreich**
- vollständige lokale JavaScript-Regression: **107/107 erfolgreich**
- Java-Sicherheitsprüfung: durch GitHub Actions zu bestätigen
- Android-Release-Build: durch GitHub Actions zu bestätigen
- Originalsignatur aus Build 89: vor Veröffentlichung zu bestätigen
- Google-/S23-Praxistest auf Pams Galaxy S23: **offen**

Der Build darf erst nach Pams erfolgreicher echter Bestätigung als praktisch
abgeschlossen dokumentiert werden.
