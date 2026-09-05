# Phase 2b – sichtbare Verbindung zum Alltagsworker

**Datum:** 05.09.2026  
**Status:** lokal geprüft; standardmäßig ausgeschaltet; Docker-Pflichtlauf im Draft-PR erforderlich  
**Ausgangsbasis:** gemergte Phase-2-Vorschau in `main` bei `efdefb4d60ab1558d20d091fb4fd2928faa40120`

## Pams Freigabe

Pam hat ausdrücklich entschieden, nach dem isolierten Alltag-Pflichtlauf die nächste kleine Stufe zu beginnen: Der fiktive Test soll in Pam’s Holo sichtbar gestartet werden können und der unverbindliche Vorschlag soll sichtbar zurückkommen.

Diese Zustimmung umfasst weder echte Alltagsdaten noch Kalender, Notes, Kontakte, Nachrichten, Geräteaktionen, Medizin, andere Worker, automatische Weiterleitung oder eine produktive Aktivierung.

## Sichtbarer Ablauf

1. Pam öffnet in der Android-App **Verbindungen** und tippt auf **Alltagsworker · fiktiver Test**.
2. Die App erklärt sichtbar, dass ausschließlich eingebaute Testdaten gelesen werden, und verlangt eine bewusste Bestätigung.
3. Die gerätegebundene Trusted-App-Sitzung des registrierten S23 muss gültig sein.
4. Die App sendet nur drei feste Felder. Freitext, Chatinhalt, Termine und persönliche Daten sind im Request-Schema verboten.
5. Das Backend erzeugt selbst den unveränderlichen synthetischen Auftrag und akzeptiert nur `worker-alltag`, `read` und `proposal-only`.
6. Ein langes Bridge-Token schützt den festen HTTP-Pfad; als Ziel sind ausschließlich `127.0.0.1` und `::1` erlaubt.
7. Die Loopback-Bridge prüft das Einmal-Gate erneut und startet den Worker in seiner gehärteten Docker-Sandbox.
8. Das Backend verwirft jede Antwort, die Schreiben, externe Aktion, Grenzübertritt oder fehlende menschliche Prüfung behauptet.
9. Die App zeigt Fakten, offene Punkte und den unverbindlichen Vorschlag ausschließlich mit sicherem Text-Rendering. Sie speichert das Ergebnis nicht.

## Doppelte Stopplinie

Die sichtbare Verbindung ist nur aktiv, wenn gleichzeitig

- `OPENCLAW_SOL_HOLO_ALLTAG_PREVIEW_ENABLED=1` und
- `OPENCLAW_LAB_ALLTAG_PREVIEW_ENABLED=1`

gesetzt sind. Zusätzlich müssen eine gültige lokale Bridge-URL und ein langes Bridge-Token vorhanden sein. Fehlt eine Bedingung, wird geschlossen abgelehnt. Die eingecheckte Konfiguration aktiviert keinen dieser Werte.

## Lokal bestanden

- 15 Backend-, Transport- und UI-Grenztests;
- 10 bestehende Ablehnungsfälle des Alltag-Einmal-Gates;
- Grundgerüst-Konsistenz für sechs Worker und zwei Verträge;
- Syntaxprüfung von Backend, Android-UI, Verbindungsschicht, Bridge und Docker-Suite;
- keine Abhängigkeit von persönlichen Daten und keine neue OpenClaw-Paketabhängigkeit der Sol-Holo-Laufzeit.

## Vor einem Merge

Der Draft-PR muss den echten GitHub-Docker-Lauf bestehen. Dieser startet dieselbe sichtbare Request-Schicht, die authentifizierte Loopback-Bridge und `worker-alltag` gemeinsam. Zusätzlich müssen sämtliche bisherigen Eigenlese-, Fremdlese-, Schreib- und Container-Härtungsprüfungen grün bleiben.

**MEILENSTEIN:** Pam’s Holo besitzt eine sichtbare, aber standardmäßig ausgeschaltete und ausschließlich synthetische Testverbindung zu genau einem Worker.
