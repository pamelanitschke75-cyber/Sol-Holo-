# Phase 2c – fiktive Alltag-Vorschau über vorhandene Dienste

**Datum:** 05.09.2026  
**Status:** als ausgeschalteter Entwurf implementiert; nicht live; nicht produktiv  
**Ausgangsbasis:** gemergte Phase 2b aus PR #38, Commit `7a80d7eea6ed5ee6a367ca27fa63f3c97a1d587e`

## Pams Entscheidung

Pam hat festgelegt, dass Sol Holo weiterhin ohne Laptop betrieben und entwickelt wird. Neue Anbieter, Konten, Abonnements oder zusätzliche Serverkosten werden nicht eingeführt, solange die vorhandenen Dienste technisch ausreichen.

Für diesen eng begrenzten nächsten Schritt hat Pam den Entwurf eines OpenAI-gestützten Testwegs über den bereits vorhandenen Render-Dienst bestätigt. Diese Bestätigung umfasst ausdrücklich noch keinen Merge und keine Live-Aktivierung.

## Zweck

Der bestehende sichtbare S23-Ablauf bleibt unverändert: Nach der Trusted-App-Prüfung und Pams bewusster Bestätigung darf ausschließlich der feste fiktive Alltagstest gestartet werden. Statt einer dauerhaft laufenden Docker-Bridge kann der vorhandene Sol-Holo-Server für diesen Test eine strukturierte Antwort über den bereits eingerichteten OpenAI-Zugang anfordern.

Dieser Weg behauptet nicht, OpenClaw dauerhaft in Docker auf Render auszuführen. Der echte OpenClaw-Docker-Sicherheitsnachweis bleibt getrennt in GitHub Actions bestehen.

## Unveränderliche Grenzen

- nur `worker-alltag`;
- nur die eingecheckte Datei `testdaten/alltag-fiktiv.md`;
- nur `read` und `proposal-only`;
- kein Freitext aus der App;
- keine echten oder persönlichen Daten;
- keine Owner-, Geräte- oder Sitzungskennung an das Modell;
- keine Modellwerkzeuge, kein Webzugriff und keine externe Aktion;
- `store: false` für die OpenAI-Anfrage;
- striktes JSON-Schema plus die bestehende zweite Ergebnisvalidierung;
- keine Speicherung des Auftrags oder Ergebnisses in Sol Holo;
- Sicherheit und Medizin bleiben gesperrt.

## Dreifache Aktivierungssperre

Der OpenAI-Testweg bleibt ohne alle drei Werte geschlossen:

```text
OPENCLAW_ALLTAG_PREVIEW_EXECUTOR=openai
OPENCLAW_SOL_HOLO_ALLTAG_PREVIEW_ENABLED=1
OPENCLAW_OPENAI_ALLTAG_PREVIEW_ENABLED=1
```

Keiner dieser Werte wird durch den Code gesetzt. Dieser Entwurf ändert weder Render-Einstellungen noch Kosten, Konten oder Anbieter.

## Prüfpflicht vor einer späteren Aktivierung

1. Alle lokalen Grenztests müssen bestehen.
2. Der Draft-PR muss den vollständigen GitHub-Docker-Sicherheitslauf bestehen.
3. Der OpenAI-Testweg muss ohne echten API-Aufruf mit einem Test-Doppel geprüft werden.
4. Erst danach entscheidet Pam separat über Merge und Live-Aktivierung.

**MEILENSTEIN:** Sol Holo besitzt einen technisch vorbereiteten, aber ausgeschalteten Weg für eine sichtbare fiktive Alltag-Vorschau über die bereits vorhandenen Dienste – ohne neuen Anbieter und ohne Laptop.
