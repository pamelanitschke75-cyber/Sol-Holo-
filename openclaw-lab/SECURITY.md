# Sicherheitsmodell des OpenClaw-Labs

## Schutzgüter

- Pams persönliche Identität und `pam-sol`
- Sol-Holo-Erinnerungen, Stimme, Bilder und Einwilligungen
- Android-App, feste App-Signatur und bestehende App-Daten
- Google-, Samsung-, Render- und sonstige Dienstverbindungen
- Schlüssel, Tokens, Passwörter und Sitzungsdaten

## Phase-0-Abwehr

| Risiko | Technische Grenze |
| --- | --- |
| Zugriff aus dem Internet | Gateway bindet nur an Loopback |
| Automatische ausgehende Anfrage beim Start | Update-Prüfung, Modellkatalog-Abruf und Telemetrie deaktiviert |
| Unbeabsichtigte Modellläufe im Leerlauf | Agent-Heartbeat deaktiviert (`0m`, Ziel `none`) |
| Unberechtigter Gateway-Zugriff | Token-Pflicht; Token bleibt außerhalb des Repositorys |
| Shell- oder Dateiveränderung | alle Tools gesperrt; `exec` verweigert; Dateipfade auf Workspace begrenzt |
| Netzwerkzugriff aus Agent-Läufen | Docker-Netzwerk `none` |
| Zugriff auf das Agent-Workspace | Sandbox-Zugriff `none` |
| Container-Ausbruch durch Standardrechte | schreibgeschütztes Root-Dateisystem; alle Linux-Capabilities entfernt |
| Fremde Skills oder Plugins | Plugins deaktiviert; keine gebündelten Skills zugelassen |
| Vermischte Agent-Sitzungen | Sichtbarkeit `self`; Agent-zu-Agent-Kommunikation deaktiviert |
| Vermischung mit Sol Holo | eigenes Workspace, eigener State, keine Verbindung zu `pam-sol`-Daten |

## Verbotene Inhalte im Repository

- API-Schlüssel, Zugangstokens und Passwörter
- Android-Keystore oder Signaturpasswörter
- persönliche Erinnerungsdatenbanken oder Exporte
- Sprachprofile, biometrische Daten, Fotos oder Gesundheitsdaten
- Google-, Samsung- oder Render-Anmeldedaten

Eine spätere echte `openclaw.json` wird außerhalb des Repositorys gespeichert und erhält Dateirechte `600`. Die eingecheckte `.example.json5` bleibt lediglich eine geheimnisfreie Vorlage.

## Freigaberegel für spätere Aktionen

Eine spätere Aktion braucht vier getrennte Nachweise:

1. klar benannter Zweck;
2. minimal erforderliche Daten und Berechtigung;
3. sichtbare Vorschau der konkreten Aktion;
4. bewusste Bestätigung unmittelbar vor einer externen oder schreibenden Ausführung.

Eine allgemeine Zustimmung zu Sol Holo wird nicht als pauschale OpenClaw-Freigabe behandelt.
