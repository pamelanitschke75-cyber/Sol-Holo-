# OpenClaw Phase 1 – Hand und Fuß für Sol Holo

**Datum:** 05.09.2026  
**Status:** Policytests bestanden; echter Docker-Containerlauf noch offen; nicht produktiv  
**Ausgangsbasis:** OpenClaw-Lab aus Draft-PR #36

## Pams Entscheidung

Pam hat entschieden, nicht nur einen einzelnen Alltag-Worker, sondern direkt eine vollständige, sinnvoll gegliederte Laborgrundlage aufzubauen: „Hand und Fuß“.

## Angelegt

Vier getrennte Worker:

1. `worker-alltag`
2. `worker-geschaeftliches`
3. `worker-tiere`
4. `worker-kochen`

Sol Holo beziehungsweise Pam's Holo bleibt Kopf, Persönlichkeit, Stimme und persönliches Gedächtnis. Die Worker sind ausschließlich klar begrenzte Ausführungsbereiche und keine eigenen Clone.

## Phase-1-Rechte

- ausschließlich Tool `read`;
- ausschließlich eigenes schreibgeschütztes Workspace;
- ausschließlich deutlich markierte fiktive Testdaten;
- keine Dateiänderung, Shell, Browser, Nachrichten, Automationen oder externen Aktionen;
- keine Verbindung zu Android, Render, Google, Samsung oder `pam-sol`;
- keine Kommunikation und keine gemeinsame Sitzung zwischen den Workern;
- eigene Agent-Verzeichnisse und eigene Sitzungsdatenbanken.

## Testpflicht

- Konfiguration mit der festgelegten OpenClaw-Version validieren;
- Security Audit ohne kritische Punkte oder Warnungen;
- effektive Toolmenge jedes Workers muss genau `read` sein;
- Leseaufgabe pro Bereich mit fiktiven Daten prüfen;
- Schreibversuch muss technisch blockiert werden;
- erst danach Phase 1 als technisch vorbereitet dokumentieren.

## Prüfergebnis am 05.09.2026

- Konfiguration mit OpenClaw `2026.9.1` gültig, keine Konfigurationswarnung;
- Security Audit: `0` kritisch und `0` Warnungen;
- Telemetrie deaktiviert, keine Anfrage erzeugt;
- Gateway auf Loopback gestartet, Healthcheck `200`, `0` Plugins, Heartbeat aus und sauber beendet;
- effektive Sandbox-Toolmenge aller vier Worker: exakt `read`;
- bei keinem Worker ein schreibbarer Sandbox-Mount;
- sichtbare Agent-Skills aller vier Worker: leer;
- eigene fiktive Testdatei gelesen: `4/4` erfolgreich;
- Leseversuch auf ein Nachbar-Workspace: `4/4` blockiert;
- Schreibversuch: `4/4` blockiert, jeweils als Toolfehler protokolliert und keine Datei `UNERLAUBT.md` erzeugt.

Für die reproduzierbaren Tooltests diente ein lokaler deterministischer Modellstub auf `127.0.0.1:19006`. Er sendete keine Daten nach außen und forderte ausschließlich vorgegebene Testaufrufe an. Weil die aktuelle Prüfumgebung keine Docker-CLI besitzt, liefen diese Tooltests mit einer temporären, nicht eingecheckten Kopie derselben Rechtekonfiguration und ausgeschaltetem Containerstart.

Die eingecheckte Konfiguration blieb auf `sandbox.mode: "all"`. Ein Versuch, damit einen Worker ohne Docker zu starten, wurde vor Modell- und Dateizugriff mit `Sandbox mode requires Docker` abgebrochen. Die Konfiguration fällt somit nicht still auf Host-Ausführung zurück.

## Noch offener Pflichtnachweis

Auf einem eigenen Docker-Laborhost muss derselbe Vierer-Test mit der unveränderten eingecheckten Konfiguration wiederholt werden. Dabei sind der schreibgeschützte Mount, das Netzwerk `none`, das schreibgeschützte Root-Dateisystem und `capDrop: ["ALL"]` im lebenden Container zu bestätigen. Bis dahin ist Phase 1 technisch vorbereitet, aber nicht für echte Daten oder produktive Aufgaben freigegeben.

## Abgrenzung

Dieser Schritt erteilt keine echte Kalender-, Notes-, Kontakt-, Nachrichten-, Health-, Geräte- oder Dateifreigabe. Eine spätere reale Fähigkeit wird einzeln entworfen, sichtbar begrenzt und vor der ersten Ausführung erneut durch Pam entschieden.

**Bestätigung „funktioniert“ durch Pam:** nein – Containerbestätigung steht noch aus.  
**Produktive Integration:** nein.  
**MEILENSTEIN:** Phase-1-Policytests bestanden, kein Alltagsabschluss.
