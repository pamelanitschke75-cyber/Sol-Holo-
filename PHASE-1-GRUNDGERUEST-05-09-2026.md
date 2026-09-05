# Phase 1 – gemeinsames Grundgerüst

Datum: 05.09.2026  
Status: **technische Grundgerüst-Prüfungen im bestehenden Draft-PR bestanden; nicht produktiv; keine Phasenfreigabe**

## Ziel

Die sechs bereits getrennten Laborbereiche Alltag, Geschäftliches, Tiere, Kochen, Sicherheit und Medizin erhalten eine gemeinsame, überprüfbare Basis. Diese Basis legt Zuständigkeit, Ein- und Ausgabeform sowie die Freigabegrenzen fest. Sie verbindet OpenClaw nicht mit Sol Holo und führt keine reale Handlung aus.

## Hinzugefügt

- ein zentrales Manifest mit genau sechs Worker-IDs und sechs getrennten Workspaces;
- ein Aufgabenvertrag für ausschließlich synthetische, lesende Vorschlagsaufträge;
- ein Ergebnisvertrag mit sichtbarer Trennung von Fakten, Unsicherheiten und Vorschlag;
- ausdrückliche Negativnachweise für externe Aktion, Schreiben und Bereichsübertritt;
- ein synthetisches Sicherheitsbeispiel mit verpflichtender menschlicher Prüfung;
- ein Konsistenztest für Manifest, Verträge, Konfiguration, Worker-Regeln und Testdaten;
- ein minimales Docker-Sandbox-Image und eine echte Container-Prüfsuite;
- eine Pull-Request-Prüfung ohne Geheimnisse und mit ausschließlich lesendem Repository-Zugriff.

## Harte Grenzen

- Status bleibt `draft`, Phase bleibt `1`, Produktivbetrieb bleibt `false`.
- Der Koordinator hat keine Werkzeuge und kein automatisches Routing.
- Unbekannte Bereiche werden abgelehnt.
- Jeder Worker besitzt ausschließlich `read` und sein eigenes, schreibgeschütztes Workspace.
- Datenklasse ist ausschließlich synthetisch; reale oder persönliche Daten sind ausgeschlossen.
- Plugins, Skills, Kanäle, Bindings, MCP-Server und Agent-zu-Agent-Kommunikation bleiben aus.
- Sol-Holo-Adapter, Geräteaktionen, Überwachung und Patientendateien bleiben aus.
- Sicherheit darf nur einen sicheren Zwischenzustand mit menschlicher Prüfung vorschlagen.
- Medizin darf nur informieren und Lücken markieren, niemals diagnostizieren oder Therapie beziehungsweise Dosierung entscheiden.
- Eine nächste Phase benötigt einen eigenen Entwurf, technische Tests und Pams ausdrückliche Bestätigung.

## Prüfstand

| Prüfung | Stand |
| --- | --- |
| Syntax der drei Node-Prüfdateien | lokal bestanden |
| Manifest-/Vertrags-/Konfigurationskonsistenz | lokal bestanden |
| OpenClaw-Konfigurationsvalidierung | lokal bestanden, keine Warnung |
| OpenClaw Security Audit | lokal `0` kritisch, `0` Warnungen |
| Sechs echte Docker-Container | bestanden mit Docker `28.0.4` |
| `network: none`, read-only Root, `capDrop: ALL`, `no-new-privileges` | bei allen sechs bestätigt |
| Nicht privilegiert; `/agent` und Root nicht beschreibbar | bei allen sechs bestätigt |
| Kein schreibbarer Bind-Mount; flüchtiges `/tmp` beschreibbar | bei allen sechs bestätigt |
| Eigener Read pro Worker | `6/6` bestanden |
| Fremd-Read pro Worker | `6/6` blockiert |
| Write pro Worker | `6/6` blockiert; keine Datei entstand |

Die lokale Arbeitsumgebung besitzt keine Docker-CLI und keinen Container-Socket. Deshalb lief der unveränderte Test im Draft-Branch auf einem Docker-Runner. Der [GitHub-Actions-Lauf #2](https://github.com/pamelanitschke75-cyber/Sol-Holo-/actions/runs/33957645527) war vollständig grün und entfernte die sechs Testcontainer anschließend wieder.

## Keine Freigabe

Dieses Grundgerüst ist weder eine Freigabe zum Merge noch zum Anschluss an Sol Holo. `main`, Render, Android und persönliche Daten bleiben unberührt. Nur Pam entscheidet über Abschluss und nächsten Schritt.
