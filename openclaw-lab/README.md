# Sol Holo × OpenClaw Lab

Stand: 05.09.2026  
Status: **Phase 0 begonnen – vollständig getrennt, nicht produktiv**

Prüfergebnis mit OpenClaw `2026.9.1`: Konfiguration gültig, Sicherheitsprüfung ohne kritische Punkte oder Warnungen, kein automatischer Außenrequest, lokaler Gateway-Boot und Healthcheck erfolgreich, `0` Kanäle, `0` Plugins und Heartbeat deaktiviert. Der Testprozess wurde danach sauber beendet.

## Zweck

OpenClaw soll Sol Holo später als kontrollierte Ausführungsebene unterstützen: als „Hände“ für klar begrenzte Aufgaben. OpenClaw ist dabei **nicht** Sol Holos Persönlichkeit, Erinnerung oder Stimme und wird nicht zu einer zweiten persönlichen Identität.

Die persönliche Instanz `pam-sol` bleibt außerhalb dieses Labs. Die laufende Sol-Holo-App, ihre Android-Signatur, ihre Daten und ihr Gedächtnis werden in Phase 0 nicht verändert.

## Was Phase 0 enthält

- ein lokales Gateway auf dem eigenen Labor-Port `19005`, nur über `127.0.0.1` erreichbar;
- genau einen neutralen Labor-Agenten ohne Aktionswerkzeuge;
- abgeschottete Sitzung, abgeschotteten Zustand und ein eigenes Labor-Arbeitsverzeichnis;
- keine Chat-Kanäle, keine Google-Verbindung und keine Verbindung zur Android-App;
- keine Kalender-, Notes-, Health-, Kontakt-, Nachrichten-, Kamera- oder Mikrofonrechte;
- keine Shell-, Browser-, Datei-, Netzwerk- oder Automationswerkzeuge;
- keine Plugins und keine Skills;
- keine automatische Update-, Modellkatalog- oder Telemetrieanfrage beim Start;
- kein regelmäßiger Agent-Heartbeat;
- keine Sol-Holo-Erinnerungen, Bilder, Stimmen, Tokens, Schlüssel oder sonstigen persönlichen Daten.

## Harte Grenze

```text
Pam / Pam's Holo / pam-sol
        │
        │  in Phase 0: keine Verbindung
        ▼
OpenClaw-Lab (neutral, leer, ohne Werkzeuge)
```

Das Labor darf nichts an `main`, der laufenden Render-Instanz oder der installierten Android-App auslösen. Eine spätere Verbindung benötigt einen gesonderten, sichtbaren Entwurf, technische Tests und Pams ausdrückliche Bestätigung.

## Geplante Worker-Bereiche

Die späteren Ausführungsbereiche bleiben getrennte Module:

1. Alltag
2. Geschäftliches
3. Tiere
4. Kochen

Jeder Worker erhält nur die kleinste für seine Aufgabe nötige Berechtigung. Schreibende oder externe Aktionen werden nicht pauschal freigegeben. Die Bereiche teilen weder automatisch Sitzungen noch persönliche Erinnerungen.

## Sicherheitsstufen

1. **Phase 0 – Nullzugriff:** Konfiguration prüfen; keine echten Aktionen. *(jetzt)*
2. **Phase 1 – Lesen im Testbestand:** ein einzelner Worker, nur künstliche Testdaten.
3. **Phase 2 – Vorschau:** der Worker erzeugt einen Vorschlag, führt aber nichts extern aus.
4. **Phase 3 – Einzelaktion mit Freigabe:** genau eine klar begrenzte Aktion nach bewusster Bestätigung.
5. **Phase 4 – Sol-Holo-Adapter:** erst nach gesonderter Prüfung hinter einem standardmäßig ausgeschalteten Feature-Flag.

Nur Pam entscheidet, wann eine Stufe als abgeschlossen gilt und ob die nächste Stufe beginnt.

## Technische Referenz

- Geprüfte OpenClaw-Version: `2026.9.1`
- Release-Commit: `ad6fe23aecb9b833d68139b0ddc9f239b894d2f1`
- npm-Integrität: `sha512-0Ve0631CdgkJDwd4NNG1BawIdF5yCL2sO+Tts8amStw+H6vKURTj0K4rOa4+hFpJk1Dnw5LyKl5twzwX1VtA2w==`
- OpenClaw-Lizenz: MIT; Rechte und Hinweise von OpenClaw bleiben bei den jeweiligen Rechteinhabern.
- In Phase 0 wird kein OpenClaw-Quellcode in Sol Holo übernommen.

## Dateien

- `openclaw.lab.example.json5` – abgeschottete Beispielkonfiguration ohne Geheimnisse
- `workspace/AGENTS.md` – verbindliche Laborregeln
- `workspace/SOUL.md` – neutrale Rolle ohne Identitätskopie
- `workspace/USER.md` – minimale Owner-Zuordnung ohne private Profildaten
- `SECURITY.md` – Bedrohungsmodell und Freigaberegeln

Vor einem späteren echten Start wird die Beispieldatei außerhalb des Repositorys als private Konfiguration abgelegt, mit einem echten zufälligen Token versehen und auf Dateirechte `600` begrenzt. Die Beispieldatei selbst enthält absichtlich kein Geheimnis.
