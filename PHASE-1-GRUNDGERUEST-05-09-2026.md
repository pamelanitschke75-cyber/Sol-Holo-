# Phase 1 – gemeinsames Grundgerüst

Datum: 05.09.2026  
Status: **im bestehenden Draft-PR vorbereitet; nicht produktiv; echter Docker-Nachweis noch offen**

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
| Sechs echte Docker-Container | vorbereitet, noch nicht ausgeführt |
| `network: none`, read-only Root, `capDrop: ALL`, `no-new-privileges` | im echten Containerlauf nachzuweisen |
| Eigener Read / Fremd-Read / Write pro Worker | im echten Containerlauf `6/6` nachzuweisen |

Die lokale Arbeitsumgebung besitzt keine Docker-CLI und keinen Container-Socket. Deshalb wird kein bestandener Containerlauf behauptet. Der unveränderte Test soll im Draft-Branch auf einem Docker-Runner laufen; erst ein grünes Ergebnis darf diesen offenen Punkt schließen.

## Keine Freigabe

Dieses Grundgerüst ist weder eine Freigabe zum Merge noch zum Anschluss an Sol Holo. `main`, Render, Android und persönliche Daten bleiben unberührt. Nur Pam entscheidet über Abschluss und nächsten Schritt.
