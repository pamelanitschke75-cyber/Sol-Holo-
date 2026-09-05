# Sol Holo × OpenClaw Lab

Stand: 05.09.2026  
Status: **Phase 1 – „Hand, Fuß, Sicherheit und Medizin“ technisch vorbereitet, abgeschottet und nicht produktiv**

OpenClaw `2026.9.1` läuft als getrenntes Labor. Sechs Fach-Worker sind angelegt: Alltag, Geschäftliches, Tiere, Kochen, Sicherheit und Medizin. Jeder Worker sieht ausschließlich das Werkzeug `read`, sein eigenes Workspace und klar markierte erfundene Testdaten.

Sol Holo beziehungsweise Pam's Holo bleibt Kopf, Persönlichkeit, Stimme und persönliches Gedächtnis. Die Worker sind begrenzte Ausführungsbereiche, keine eigenen Clone.

## Harte Grenze

```text
Pam / Pam's Holo / pam-sol
        │
        │  noch keine technische Verbindung
        ▼
OpenClaw-Lab
  ├─ Worker Alltag
  ├─ Worker Geschäftliches
  ├─ Worker Tiere
  ├─ Worker Kochen
  ├─ Worker Sicherheit
  └─ Worker Medizin
```

Das Labor darf nichts an `main`, der laufenden Render-Instanz, der Android-App oder persönlichen Sol-Holo-Daten auslösen. Eine spätere Verbindung benötigt einen gesonderten Entwurf, technische Tests und Pams ausdrückliche Bestätigung.

## Derzeitige Grenzen

- Gateway nur auf Loopback-Port `19005`, Bedienoberfläche deaktiviert;
- neutraler Labor-Koordinator ohne Werkzeuge;
- sechs getrennte Worker mit eigenen Workspaces, Agent-Verzeichnissen und Sitzungsdatenbanken;
- Worker-Toolmenge exakt `read`; keine Schreib-, Shell-, Browser-, Nachrichten-, Memory-, Agenten-, Netzwerk- oder Automationswerkzeuge;
- jedes Worker-Workspace wird in der vorgesehenen Docker-Sandbox schreibgeschützt eingebunden;
- keine Kanäle, Bindings, Plugins, MCP-Server oder Agent-Skills;
- keine Google-, Samsung-, Render-, Android- oder `pam-sol`-Verbindung;
- Update-Prüfung, Modellkatalog-Abruf, Telemetrie und Heartbeat deaktiviert;
- lokaler deterministischer Testtreiber auf `127.0.0.1:19006`, kein externer Modellanbieter und kein Zugangsschlüssel;
- ausschließlich synthetische Testdaten, keine Erinnerungen, Bilder, Stimmen oder privaten Daten.

## Worker-Bereiche

| Worker | Darf lesen | Darf nicht |
| --- | --- | --- |
| Alltag | eigenes Alltag-Test-Workspace | andere Bereiche, Schreiben, Erinnerungen, Geräteaktionen |
| Geschäftliches | eigenes Geschäfts-Test-Workspace | Senden, Bezahlen, Speichern, andere Bereiche |
| Tiere | eigenes Tier-Test-Workspace | Diagnosen, Nachrichten, Erinnerungen, andere Bereiche |
| Kochen | eigenes Koch-Test-Workspace | Bestellen, Timer, Dateiänderungen, andere Bereiche |
| Sicherheit | eigenes Sicherheits-Test-Workspace | Überwachung, Sensoren, Geräte- oder Alarmsteuerung, andere Bereiche |
| Medizin | eigenes Medizin-Test-Workspace | Diagnose, Therapie- oder Dosierungsentscheidung, Patientendatei, andere Bereiche |

## Prüfergebnis

| Prüfung | Ergebnis |
| --- | --- |
| Konfiguration | gültig, keine Warnung |
| OpenClaw Security Audit | `0` kritisch, `0` Warnungen |
| Telemetrie | deaktiviert, keine Anfrage |
| Gateway | Healthcheck `200`, `0` Plugins, Heartbeat aus, sauber beendet |
| Effektive Worker-Tools | bei allen sechs exakt `read` |
| Agent-Skills | bei allen sechs leer |
| Eigene Testdatei lesen | `6/6` erfolgreich |
| Nachbar-Workspace lesen | `6/6` technisch blockiert |
| Datei schreiben | `6/6` technisch blockiert; keine Datei entstand |
| Docker-Mount-Plan | bei allen sechs `ro`, keine schreibbaren Mounts |
| Echter Containerlauf | noch offen: in der aktuellen Prüfumgebung ist Docker nicht installiert |

Die positiven und negativen Tooltests liefen mit demselben Rechteprofil und einer temporären, nicht eingecheckten Konfigurationskopie ohne Containerstart. Die eingecheckte Konfiguration blieb durchgehend auf `sandbox.mode: "all"`. Ohne Docker bricht sie vor einem Worker-Lauf ab, statt auf den Host auszuweichen. Der echte Containerlauf muss auf einem Docker-Laborhost noch bestätigt werden.

## Sicherheitsstufen

1. **Phase 0 – Nullzugriff:** Konfiguration, Boot und Außenruhe prüfen. *(abgeschlossen)*
2. **Phase 1 – Hand, Fuß, Sicherheit und Medizin:** sechs getrennte Lese-Worker mit künstlichen Testdaten. *(Policytests bestanden; Containerbestätigung offen)*
3. **Phase 2 – Vorschau:** ein Worker erzeugt einen Vorschlag, führt aber nichts extern aus.
4. **Phase 3 – Einzelaktion mit Freigabe:** genau eine klar begrenzte Aktion nach bewusster Bestätigung.
5. **Phase 4 – Sol-Holo-Adapter:** erst nach gesonderter Prüfung hinter einem standardmäßig ausgeschalteten Feature-Flag.

Nur Pam entscheidet, wann eine Stufe als abgeschlossen gilt und ob die nächste Stufe beginnt.

## Lokaler Prüftreiber

`tests/mock-openai-server.mjs` stellt ausschließlich auf `127.0.0.1:19006` eine kleine OpenAI-kompatible Testantwort bereit. Er liest keine Sol-Holo-Daten, besitzt keine Intelligenz und simuliert nur festgelegte `read`- und verbotene `write`-Aufrufe. So lassen sich Rechte reproduzierbar prüfen, ohne Inhalte an einen externen Modellanbieter zu senden.

Die Konfiguration erwartet drei Laufzeitwerte außerhalb des Repositorys:

- `OPENCLAW_LAB_ROOT` – Pfad zu diesem Laborordner;
- `OPENCLAW_LAB_STATE_DIR` – privates, getrenntes Zustandsverzeichnis;
- `OPENCLAW_GATEWAY_TOKEN` – langer zufälliger Gateway-Schlüssel.

## Technische Referenz

- Geprüfte OpenClaw-Version: `2026.9.1`
- Release-Commit: `ad6fe23aecb9b833d68139b0ddc9f239b894d2f1`
- npm-Integrität: `sha512-0Ve0631CdgkJDwd4NNG1BawIdF5yCL2sO+Tts8amStw+H6vKURTj0K4rOa4+hFpJk1Dnw5LyKl5twzwX1VtA2w==`
- OpenClaw-Lizenz: MIT; Rechte und Hinweise von OpenClaw bleiben bei den jeweiligen Rechteinhabern.
- Es wird kein OpenClaw-Quellcode in Sol Holo übernommen.

## Dateien

- `openclaw.lab.example.json5` – abgeschottete Beispielkonfiguration ohne Geheimnisse
- `workspace/*` – neutrale Regeln für den werkzeuglosen Labor-Koordinator
- `workspaces/*` – sechs getrennte Worker mit festen neutralen Identitäten und fiktiven Testdaten
- `tests/mock-openai-server.mjs` – lokaler deterministischer Policy-Prüfer
- `SECURITY.md` – Bedrohungsmodell und Freigaberegeln
- `PHASE-1-HAND-UND-FUSS-05-09-2026.md` – nachvollziehbarer Phase-1-Eintrag
- `PHASE-1-ERWEITERUNG-SICHERHEIT-MEDIZIN-05-09-2026.md` – Sondergrenzen der beiden sensiblen Worker

Vor einem späteren echten Start wird die Beispieldatei außerhalb des Repositorys als private Konfiguration abgelegt, mit einem echten zufälligen Token versehen und auf Dateirechte `600` begrenzt. Die eingecheckte Vorlage enthält absichtlich kein Geheimnis.
