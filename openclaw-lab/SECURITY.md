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
| Unbekannter oder falsch gerouteter Bereich | zentrales Manifest; unbekannte Bereiche werden abgelehnt; automatisches Routing ist ausgeschaltet |
| Auftrag fordert mehr als Lesen | Aufgabenvertrag erlaubt nur `read`, synthetische Daten und `proposal-only`; externe Aktion ist immer `false` |
| Ergebnis behauptet eine Aktion | Ergebnisvertrag verlangt `external_action_performed: false`, `data_written: false` und `boundary_crossed: false` |

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

## Zentrale Verträge

`foundation.manifest.json` ist die einzige Bereichsliste des Phase-1-Grundgerüsts. Konfiguration, Aufgabenvertrag und Ergebnisvertrag müssen dieselben sechs Worker enthalten. `tests/check-foundation.mjs` bricht ab, sobald Register, Workspace, Rechte oder sensible Bereichsregeln auseinanderlaufen.

Die Verträge sind noch keine aktive Schnittstelle. Es existiert kein Router und kein Sol-Holo-Adapter. Relative Quellpfade dürfen weder absolut sein noch `..` enthalten. Damit kann ein Auftrag schon an der Vertragsgrenze keinen Nachbar-Workspace benennen.

Für Sicherheit und Medizin ist menschliche Prüfung Bestandteil des vorgesehenen Ergebnisses. Diese Kennzeichnung erteilt keine Freigabe und darf weder als Gefahrenentwarnung noch als medizinische Entscheidung verwendet werden.

## Phase-1-Regel

Die sechs Worker Alltag, Geschäftliches, Tiere, Kochen, Sicherheit und Medizin verarbeiten ausschließlich Dateien, die deutlich als `FIKTIVE TESTDATEN` markiert sind. Reale Namen, Konten, Termine, Gesundheitswerte, Tierdaten, Kontakte und Zugangsdaten bleiben ausgeschlossen.

Ein Worker darf ausschließlich lesen und textlich antworten. Selbst eine harmlose Dateiänderung muss technisch blockiert bleiben. Kommunikation zwischen den Workern ist deaktiviert.

## Sondergrenze Sicherheit

- Der Worker liest nur ausdrücklich beschriebene fiktive Beobachtungen. Er besitzt keinen Zugriff auf Kamera, Mikrofon, Standort, Sensoren, Alarme, Schlösser oder andere Geräte.
- Er darf mögliche Gefahren nach Dringlichkeit ordnen, Unsicherheit benennen und einen sicheren Zwischenzustand sowie menschliche Prüfung vorschlagen.
- Er darf keine Umgebung als sicher freigeben, keine kontinuierliche Überwachung behaupten und keine Rettungskräfte, Kontakte oder Geräte selbst auslösen.
- Schutzsignale oder reale Überwachung wären ein neuer Bereich und benötigen vorherige Besprechung, klare Einwilligung, Zweckbindung und eine eigene technische Freigabe.

## Sondergrenze Medizin

- Der Worker ist ausschließlich eine medizinische Informations- und Sicherheitsassistenz im Labor, kein Arzt, kein Medizinprodukt und kein Ersatz für professionelle Hilfe.
- Er darf fiktive Angaben strukturiert wiedergeben und Lücken markieren. Er darf keine Diagnose, individuelle Therapie, Medikamentenwahl, Dosierung, Einnahmeänderung oder Entwarnung festlegen.
- Er führt keine Patientendatei, speichert keine Gesundheitsdaten und greift nicht auf Health-Dienste, Arztportale, Apotheken, Rezepte oder medizinische Geräte zu.
- Für ausdrücklich in Deutschland verortete Testfälle gilt nur die Weiterleitungsgrenze: bei lebensbedrohlichen Notfällen `112`; bei dringendem, aber nicht lebensbedrohlichem Behandlungsbedarf außerhalb regulärer Sprechzeiten `116117`. Der Worker darf keinen Anruf selbst ausführen oder behaupten. Grundlage ist die [offizielle Abgrenzung des Patientenservice 116117](https://www.116117.de/de/haeufige-fragen.php).

## Verbleibender Container-Nachweis

Die Konfiguration verlangt für jeden Worker eine Docker-Sandbox und bricht ohne Docker vor dem Modelllauf ab. In der aktuellen Prüfumgebung war keine Docker-CLI vorhanden. Deshalb sind die Tool- und Workspace-Grenzen automatisiert geprüft, der lebende Container mit `network: "none"`, schreibgeschütztem Root-Dateisystem, `capDrop: ["ALL"]` und schreibgeschütztem Agent-Mount aber noch auf einem dafür vorgesehenen Docker-Laborhost zu bestätigen.

Die dafür vorgesehene Pull-Request-Prüfung baut das minimale Sandbox-Image neu und startet für alle sechs Worker echte Container. Sie kontrolliert Docker-Metadaten und führt zusätzlich negative Schreibversuche gegen `/agent` und das Root-Dateisystem aus. Ein temporäres `tmpfs` unter `/tmp` muss als einziger getesteter Schreibraum funktionieren. Bis dieser Lauf grün vorliegt, bleibt der Container-Nachweis offen.

Die produktive Konfiguration darf für diesen Nachweis nicht auf `sandbox.mode: "off"` geändert werden. Die während der lokalen Toolprüfung verwendete nicht eingecheckte Kopie ohne Containerstart ist kein Betriebsmodus und enthält ausschließlich fiktive Daten.
