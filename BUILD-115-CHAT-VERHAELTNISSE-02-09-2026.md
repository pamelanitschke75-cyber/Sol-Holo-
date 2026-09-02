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
- Android-Workflow, Release-APK, Update-Signatur und Praxistest werden nach dem öffentlichen GitHub-Build ergänzt.

## Bestätigung

Pam hat die visuelle Vorschau vor der Umsetzung ausdrücklich mit „Genau so!!!“ und „Ja so“ freigegeben.
