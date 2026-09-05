# Build 150 – Google Maps sowie Sprachbrücke für Kalender und Notes

Datum: 05.09.2026  
Status: technisch umgesetzt und automatisch geprüft; Praxistest auf Pams Samsung Galaxy S23 noch offen

## Anlass

Pam hat festgelegt, dass Sol Holo mit Google Maps verbunden werden soll.
Außerdem meldete die Sprachfunktion bei Google Kalender und Samsung Notes
wiederholt sinngemäß, die Funktion müsse erst vom Backend freigegeben werden.

## Google Maps

- Google Maps ist die feste Standardnavigation; HERE WeGo ist nicht Teil
  dieses Builds.
- Ausdrückliche Befehle wie „Sol, navigiere mich zu …“ oder „Öffne Google
  Maps“ werden lokal in der Android-App erkannt.
- Das Ziel wird über den offiziellen Android-Intent `google.navigation` an
  das Paket `com.google.android.apps.maps` übergeben.
- Falls die Google-Maps-App fehlt, kann ausschließlich die Google-Maps-
  Webroute geöffnet werden.
- Sol Holo fordert dafür keine eigene GPS-Berechtigung an. Den aktuellen
  Standort verwendet Google Maps nur nach den dort geltenden Android-/Google-
  Einstellungen.

## Samsung Notes

- Samsung Notes bleibt eine lokale Android-Funktion und benötigt keine
  Backend-Freischaltung.
- Die lokale Erkennung wird vor der allgemeinen Sprachverarbeitung gestartet.
- Das bestätigte lokale Ergebnis wird an die laufende Sprachsitzung
  zurückgegeben, damit Sol keine erfundene Backend-Sperre nennt.
- „Geöffnet“ bedeutet weiterhin nicht „gespeichert“; Pam speichert den
  sichtbaren Entwurf selbst in Samsung Notes.

## Google Kalender

- Die vorhandene echte Google-Calendar-API bleibt unverändert zuständig.
- Die Android-Sprachfunktion wertet nun die vom Backend bereits gelieferte
  Kalenderantwort aus, statt sie zu verwerfen.
- Vorschau, Bestätigungsbedarf, erfolgreiche Speicherung und Fehler werden
  als echtes Ergebnis zurück in die Realtime-Sprachsitzung gegeben.
- Falls die sichere S23-Sitzung erneuert werden muss, wird nur die
  Kalenderaktion wiederholt. Sprachtranskript und Gesprächsverlauf werden
  dabei nicht doppelt gespeichert.
- Ohne erfolgreiche Google-API-Bestätigung darf Sol weiterhin niemals
  behaupten, ein Termin sei gespeichert worden.

## Bewusst unverändert

- Paketname `com.solholo.app`
- feste Owner-ID `pam-sol`
- Original-/Updatesignatur und Signaturprüfung
- App-Daten, Einstellungen, Erinnerungen und Sicherung
- „Hey Pam“/„Hey Sol“, Sprecherprüfung, Mikrofon- und Audio-Routing
- WhatsApp-, Telefon-, Health-, SmartThings- und Watch-Funktionen

## Automatische Prüfungen

- eindeutige Navigationserkennung und Schutz vor Fehlstarts bei Fragen,
  Notiz- oder Kalendertexten
- Google-Maps-Paket, Intent und Google-Web-Fallback
- keine neue Standortberechtigung
- native Capacitor-Registrierung und Android-Paketsichtbarkeit
- Realtime-Rückgabe der echten Kalenderantwort
- klare Regel: Samsung Notes und Google Maps brauchen keine Backend-
  Freischaltung

## Offener Praxistest

Der Stand wird erst nach drei erfolgreichen S23-Tests als praktisch
abgeschlossen markiert:

1. „Sol, schreibe Milch in Samsung Notes.“
2. Einen Testtermin mit Datum/Uhrzeit vorbereiten, bestätigen und anschließend
   im Google Kalender kontrollieren.
3. „Sol, navigiere mich zu Paukner in Offenbach.“ – Google Maps muss das Ziel
   sichtbar übernehmen.

