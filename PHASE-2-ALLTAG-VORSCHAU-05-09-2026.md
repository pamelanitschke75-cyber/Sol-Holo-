# Phase 2 – Alltag-Worker als sichere Vorschau

**Datum:** 05.09.2026  
**Status:** technischer Pflichtlauf bestanden; Draft und nicht produktiv  
**Ausgangsbasis:** Phase-1-Grundgerüst in `main` bei `8a5818adae982a464627b52253bc0b1775a975a0`

## Pams Freigabe

Pam hat nach dem geprüften Merge des gemeinsamen Grundgerüsts ausdrücklich entschieden, die Fähigkeiten nun einzeln freizuschalten und mit dem Alltag-Worker zu beginnen.

Diese Zustimmung gilt ausschließlich für die hier beschriebene Laborvorschau. Sie ist keine pauschale Freigabe für echte Daten, Sol Holo, Android, Kalender, Notes, Kontakte, Geräte, Nachrichten, Automationen oder weitere Worker.

## Genau ein erlaubter Test

- Ziel: `worker-alltag`
- Daten: nur `testdaten/alltag-fiktiv.md`, deutlich als fiktiv markiert
- Fähigkeit: ausschließlich `read`
- Ergebnis: ausschließlich ein unverbindlicher Textvorschlag
- Freigabe: genau ein manueller Einmal-Marker
- Prüfung: menschliche Sichtung bleibt Pflicht

Ein standardmäßig ausgeschalteter Feature-Schalter muss für den isolierten Prüflauf bewusst auf `1` gesetzt werden. Das Gate akzeptiert nur die festgelegte Task-ID, die eine erlaubte Datei und die unveränderte Testfrage. Es übermittelt den Freigabemarker nicht an den Worker und verweigert eine zweite Verwendung desselben Gate-Prozesses.

## Technische Stopplinien

- falscher Worker wird abgelehnt;
- andere oder echte Datenklasse wird abgelehnt;
- anderer Pfad oder `..`-Bereichswechsel wird abgelehnt;
- geänderte Frage wird abgelehnt;
- fehlende manuelle Freigabe wird abgelehnt;
- Schreiben und externe Aktion bleiben technisch gesperrt;
- das Ergebnis muss ausdrücklich bestätigen, dass keine Aktion, kein Schreiben und kein Bereichswechsel stattgefunden hat;
- produktiver Sol-Holo-Adapter, Backend und Android-App bleiben unverändert und ausgeschaltet.

## Ergebnis des Pflichtlaufs

Der [GitHub-Actions-Lauf #4](https://github.com/pamelanitschke75-cyber/Sol-Holo-/actions/runs/33966629551) bestätigte den ersten echten Phase-2-Vorschautest:

- Alltag-Gate und zehn Ablehnungsfälle bestanden;
- OpenClaw-Konfiguration gültig, keine Warnung;
- Security Audit weiterhin `0` kritisch und `0` Warnungen;
- `worker-alltag` las genau die eine fiktive Quelle in seiner echten Docker-Sandbox;
- ein strukturiertes Vorschauergebnis wurde erzeugt;
- keine externe Aktion, kein Schreiben, kein Bereichswechsel; menschliche Prüfung bleibt Pflicht;
- sämtliche bisherigen sechs Eigenlese-, sechs Fremdlese- und sechs Schreibprüfungen blieben grün;
- weiterhin genau sechs gehärtete Container, keine zusätzliche Ausführungsinstanz.

## Bedeutung von „gestartet“

Der Alltag-Worker wird im Prüflauf in seiner echten gehärteten Docker-Sandbox auf die eine fiktive Aufgabe angesetzt. „Gestartet“ bedeutet hier nicht, dass er bereits Pams Alltag, Daten oder Geräte bedienen kann. Eine solche Fähigkeit wäre ein eigener späterer Schritt mit eigener Vorschau, Prüfung und unmittelbarer Bestätigung.

**MEILENSTEIN:** erster einzelner Worker wechselt kontrolliert von reiner Rechteprüfung zu einer fiktiven, manuell freigegebenen Vorschlagsaufgabe.
