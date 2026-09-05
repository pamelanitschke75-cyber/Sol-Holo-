# S23 Trusted Session Fix · 03.09.2026

## Feste Signatur bleibt unverändert

Die dauerhafte APK-/Update-Signatur aus Build #89 bleibt die feste Update-Identität von Pam’s Holo. Sie wird durch diese Reparatur nicht ersetzt, neu erzeugt oder verändert.

## Aktueller Fehler

Auf dem Samsung S23 erscheint bei der sicheren App-Sitzung die Meldung:

> Die Server-Challenge für die sichere App-Sitzung ist ungültig oder abgelaufen.

Dieser Fehler betrifft die kurzlebige Server-Challenge der Gerätesitzung, nicht die APK-Signatur.

## Verbindliche Reparaturregel

1. Abgelaufene oder serverseitig ungültige Challenges werden verworfen.
2. Die App fordert eine neue Challenge an.
3. Nur die neue Challenge wird mit der bestehenden Geräteidentität signiert.
4. Bei einem einmaligen TTL-/Race-Fehler darf genau ein kontrollierter Neuversuch erfolgen.
5. Die APK wird dabei nicht neu signiert.
6. Bestehende App-Daten und die Geräteidentität werden nicht gelöscht.
7. Es wird keine Wegwerf-Signatur verwendet.

Issue: #28
