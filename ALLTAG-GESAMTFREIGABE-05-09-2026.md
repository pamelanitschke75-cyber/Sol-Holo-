# Sol Holo – gemeinsame Alltagsfreigabe

**Festgelegt von Pam am 05.09.2026**

## Speichern auf Zuruf

Pam möchte keine einzelne Freischaltung für jede kleine Alltagsfunktion.
Ein ausdrücklicher Auftrag wie „speichere“, „merke dir“, „notiere“ oder
„setz … auf die Liste“ gilt selbst als Freigabe zum dauerhaften Speichern.
Auch ein kurzer Rückbezug wie „Speichere das“ verwendet den unmittelbar zuvor
genannten Inhalt, sofern er eindeutig, höchstens fünf Minuten alt und keine
Frage ist.

Die gemeinsame Speicherfunktion umfasst insbesondere:

- Einkaufs-, Aufgaben-, Pack-, Wunsch- und Besorgungslisten,
- Aufgaben, Termine und Erinnerungsangaben,
- Notizen, Wünsche, Vorlieben und normale persönliche Fakten.

Gespeicherte Inhalte bleiben der festen Holo-ID `pam-sol` zugeordnet und
werden in Pam’s Holo sichtbar. Passwörter, PIN, TAN, API-Schlüssel, Token,
Banking- und Authenticator-Daten bleiben unabhängig vom Wortlaut gesperrt.

## Geräte als gemeinsamer Funktionsblock

Geräte sollen nicht bei jedem einfachen Befehl erneut freigegeben werden.
Nach einer einmaligen Konto-, Zuhause- und Geräteauswahl gilt Pams
ausdrücklicher Sprach- oder Textauftrag für normale, reversible Aktionen wie
Ein/Aus. Neue Geräte sowie riskante oder sicherheitsrelevante Aktionen bleiben
gesondert geschützt.

Die gewünschte Zuordnung ist festgehalten:

- **Sony-TV:** ist in Google Home hinterlegt und soll über die Google Home APIs
  angebunden werden.
- **Airfryer:** soll später wieder über **HomeID** eingerichtet werden.
- **SmartThings:** nur für Geräte verwenden, die tatsächlich dort hinterlegt
  werden; nicht mit Google Home oder HomeID vermischen.

Es wird kein zusätzlicher Anbieter ergänzt, solange einer der bereits
gewählten Dienste die Funktion technisch bereitstellen kann.

## Technischer Stand

„Speichern auf Zuruf“ wird als lokale, identitätsgebundene Sol-Holo-Funktion
umgesetzt. Der OpenAI-Alltagsworker bleibt bis zur nächsten ausdrücklich
dokumentierten Stufe beim Zugriff auf persönliche Daten weiterhin lesend.

Die direkte Google-Home-Steuerung braucht zusätzlich zur bisherigen
Google-Anmeldung das offizielle Android Home APIs SDK, OAuth und die Home
Permissions API. Grundlage:

- https://developers.home.google.com/apis/android/get-started
- https://developers.home.google.com/apis/android/oauth
- https://developers.home.google.com/apis/android/permissions
