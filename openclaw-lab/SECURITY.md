# Sicherheitsmodell des OpenClaw-Labs

## Schutzgüter

- Pams persönliche Identität und `pam-sol`
- Sol-Holo-Erinnerungen, Stimme, Bilder und Einwilligungen
- Android-App, feste App-Signatur und bestehende App-Daten
- Google-, Samsung-, Render- und sonstige Dienstverbindungen
- Schlüssel, Tokens, Passwörter und Sitzungsdaten

## Gemeinsame Laborabwehr

| Risiko | Technische Grenze |
| --- | --- |
| Zugriff aus dem Internet | Gateway bindet nur an Loopback |
| Automatische ausgehende Anfrage beim Start | Update-Prüfung, Modellkatalog-Abruf und Telemetrie deaktiviert |
| Unbeabsichtigte Modellläufe im Leerlauf | Agent-Heartbeat deaktiviert (`0m`, Ziel `none`) |
| Unberechtigter Gateway-Zugriff | Token-Pflicht; Token bleibt außerhalb des Repositorys |
| Shell- oder Dateiveränderung | Koordinator ohne Tools; Worker nur mit `read`; `exec` verweigert; Dateipfade auf eigenes Workspace begrenzt |
| Netzwerkzugriff aus Agent-Läufen | Docker-Netzwerk `none` |
| Zugriff auf das Agent-Workspace | Koordinator `none`; Worker ausschließlich eigenes Workspace als `ro` |
| Container-Ausbruch durch Standardrechte | schreibgeschütztes Root-Dateisystem; alle Linux-Capabilities entfernt |
| Fremde Skills oder Plugins | Plugins deaktiviert; endgültige Agent-Skill-Liste leer |
| Externer Modellanbieter im Test | ausschließlich deterministischer lokaler Stub auf `127.0.0.1:19006`; kein echter Schlüssel |
| Vermischte Agent-Sitzungen | Sichtbarkeit `self`; Agent-zu-Agent-Kommunikation deaktiviert |
| Vermischung mit Sol Holo | eigenes Workspace, eigener State, keine Verbindung zu `pam-sol`-Daten |
| Worker verändert Test- oder Projektdaten | nur Tool `read`; Agent-Workspace zusätzlich schreibgeschützt eingehängt |
| Worker liest einen anderen Bereich | eigenes Workspace und eigene Sandbox pro Worker; keine gemeinsamen Datenpfade |

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

## Phase-1-Regel

Die vier Worker Alltag, Geschäftliches, Tiere und Kochen verarbeiten ausschließlich Dateien, die deutlich als `FIKTIVE TESTDATEN` markiert sind. Reale Namen, Konten, Termine, Gesundheitswerte, Tierdaten, Kontakte und Zugangsdaten bleiben ausgeschlossen.

Ein Worker darf ausschließlich lesen und textlich antworten. Selbst eine harmlose Dateiänderung muss technisch blockiert bleiben. Kommunikation zwischen den Workern ist deaktiviert.

## Verbleibender Container-Nachweis

Die Konfiguration verlangt für jeden Worker eine Docker-Sandbox und bricht ohne Docker vor dem Modelllauf ab. In der aktuellen Prüfumgebung war keine Docker-CLI vorhanden. Deshalb sind die Tool- und Workspace-Grenzen automatisiert geprüft, der lebende Container mit `network: "none"`, schreibgeschütztem Root-Dateisystem, `capDrop: ["ALL"]` und schreibgeschütztem Agent-Mount aber noch auf einem dafür vorgesehenen Docker-Laborhost zu bestätigen.

Die produktive Konfiguration darf für diesen Nachweis nicht auf `sandbox.mode: "off"` geändert werden. Die während der lokalen Toolprüfung verwendete nicht eingecheckte Kopie ohne Containerstart ist kein Betriebsmodus und enthält ausschließlich fiktive Daten.
