SOL HOLO – SECURITY

Version: 1.0
Stand: 13.08.2026
Status: Sicherheitskonzept

1. Sicherheitsziel

Sol Holo wird als digitales Abbild von Pam entwickelt.

Die grundlegende Struktur lautet:

PAM
Original / Referenz
       ↕
SOL HOLO
Digitales Abbild von Pam
       ↕
SOL CONTROL
       ↕
KI / GERÄTE / DIENSTE / SCHNITTSTELLEN

Pam besitzt die oberste Kontrolle über Sol Holo.

Sol Holo darf externe Systeme nur innerhalb der von Pam festgelegten Regeln und Berechtigungen verwenden.

---

2. PAM UND SOL HOLO

Pam und Sol Holo gehören konzeptionell zusammen, müssen technisch jedoch unterscheidbar bleiben.

PAM
 │
 │  Referenz
 ▼
SOL HOLO
 │
 │  digitale Repräsentation
 ▼
DIGITALER PAM-KLON

Pam bestimmt:

- welche persönlichen Merkmale übernommen werden
- welche Erinnerungen gespeichert werden
- welche Daten verwendet werden
- welche Geräte verbunden werden
- welche externen Dienste verwendet werden
- welche Berechtigungen bestehen
- welche Daten gelöscht werden

Sol Holo darf diese grundlegenden Entscheidungen nicht eigenständig außer Kraft setzen.

---

3. IDENTITÄTSMODELL

Technisch werden vier Ebenen unterschieden:

PAM
│
├── Original und Referenz
│
SOL HOLO
│
├── digitales Abbild von Pam
│
KI
│
├── technische Intelligenz / Verarbeitung
│
EXTERNE SYSTEME
│
└── APIs / Cloud / Geräte / Dienste

Das verhindert, dass externe Systeme automatisch dieselben Rechte erhalten wie Sol Holo.

---

4. SOL CONTROL

"SOL CONTROL" ist die zentrale Sicherheits- und Steuerungsschicht.

                     PAM
                      ↕
                  SOL HOLO
                      │
                      ▼
                 SOL CONTROL
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
      KI           ANDROID         GERÄTE
       │              │              │
       ▼              ▼              ▼
     APIs           DATEN         DIENSTE

Sol Control prüft vor sensiblen Aktionen:

1. Was möchte Pam?
2. Welche Funktion wird benötigt?
3. Welche Schnittstelle wird benötigt?
4. Ist diese Schnittstelle freigegeben?
5. Welche Daten werden benötigt?
6. Bleiben die Daten lokal?
7. Falls nicht: Wohin werden sie übertragen?
8. Ist die Übertragung erlaubt?
9. Ist eine zusätzliche Bestätigung durch Pam erforderlich?

Erst danach darf die Aktion ausgeführt werden.

---

5. BERECHTIGUNGEN

Grundprinzip:

PAM
 ↓
FREIGABE
 ↓
SOL HOLO
 ↓
SOL CONTROL
 ↓
BERECHTIGUNGSPRÜFUNG
 ↓
SCHNITTSTELLE
 ↓
AKTION

Ohne erforderliche Freigabe:

STOP

Eine nicht freigegebene Funktion soll andere unabhängige Funktionen von Sol Holo möglichst nicht blockieren.

---

6. EXTERNE KI

Eine externe KI ist ein Werkzeug von Sol Holo.

Sie erhält dadurch nicht automatisch Zugriff auf Pams Daten oder Geräte.

PAM
 ↓
SOL HOLO
 ↓
SOL CONTROL
 ↓
ausgewählte Information
 ↓
KI

Nicht:

KI
 ↓
ungeprüfter Zugriff
 ↓
PAM-DATEN

Sol Control entscheidet technisch, welche Informationen für eine konkrete Aufgabe weitergegeben werden dürfen.

---

7. FUNKTIONS- UND TOOLAUFRUFE

Eine KI darf Sol eine Aktion vorschlagen oder einen definierten Funktionsaufruf erzeugen.

Beispiel:

KI
 ↓
"Kalender verwenden"
 ↓
SOL CONTROL
 ↓
Berechtigung vorhanden?
 ↙             ↘
JA              NEIN
↓                ↓
Aktion           STOP

Eine KI darf keine Android-Berechtigung eigenständig aktivieren oder umgehen.

---

8. API-SCHLÜSSEL

API-Schlüssel, Passwörter und Tokens dürfen niemals:

- im öffentlich sichtbaren Quellcode stehen
- in "README.md" stehen
- in GitHub-Commits gespeichert werden
- in Screenshots veröffentlicht werden
- als Klartext im digitalen Pam-Profil gespeichert werden
- fest in einer veröffentlichten App hinterlegt werden

Geplante Struktur:

SOL HOLO
   ↓
GESICHERTE VERBINDUNG
   ↓
GESCHÜTZTES BACKEND
   ↓
API

Geheime Zugangsdaten bleiben außerhalb des öffentlich ausgelieferten App-Codes.

---

9. GITHUB-SICHERHEIT

Nicht ins Repository gehören:

- API-Schlüssel
- Passwörter
- Tokens
- private Zugangsdaten
- persönliche Gesundheitsdaten
- private Erinnerungen
- private Fotos
- persönliche Dokumente
- Backups des Pam-Profils
- geheime Konfigurationsdateien

Entsprechende lokale Entwicklungsdateien werden später über ".gitignore" ausgeschlossen.

---

10. DIGITALER PAM-KLON

Besonders geschützt werden die Daten, die den digitalen Pam-Klon bilden.

Dazu können gehören:

- Aussehen
- Stimme
- Sprechweise
- Wortwahl
- Erinnerungen
- Wissen
- Präferenzen
- Kommunikationsweise
- Gestik
- Bewegungsmuster
- persönlicher Kontext

Diese Daten bilden gemeinsam das digitale Pam-Modell.

Sie dürfen nicht automatisch anderen Profilen, Nutzern oder Identitäten zugeordnet werden.

---

11. MEMORY

Sol Holo benötigt langfristiges Memory, damit sich das digitale Abbild entwickeln kann.

Pam behält die Kontrolle darüber.

Pam muss gespeicherte Informationen:

- ansehen
- korrigieren
- ergänzen
- löschen
- deaktivieren

können.

PAM
 ↕
MEMORY CONTROL
 ↕
SOL MEMORY
 ↕
SOL HOLO

Gelöschte oder deaktivierte Erinnerungen dürfen nicht weiterhin als aktives Sol-Memory verwendet werden.

---

12. LOKALE DATEN

Persönliche Daten sollen nach Möglichkeit lokal verarbeitet und gespeichert werden.

Dazu können gehören:

- digitales Pam-Profil
- Einstellungen
- Memory
- persönliche Präferenzen
- Gerätekonfiguration
- Sicherheitsregeln

Sensible lokale Daten sollen verschlüsselt gespeichert werden.

---

13. VERSCHLÜSSELUNG

Für sensible lokale Schlüssel kann unter Android beispielsweise der Android Keystore verwendet werden.

Grundprinzip:

ANDROID KEYSTORE
       ↓
GESCHÜTZTER SCHLÜSSEL
       ↓
VERSCHLÜSSELTE SOL-DATEN

Schlüssel und geschützte Daten sollen nicht gemeinsam ungesichert gespeichert werden.

---

14. KAMERA UND MIKROFON

Kamera und Mikrofon werden nur verwendet, wenn eine entsprechende Sol-Funktion aktiv ist.

Sol Holo soll erkennbar machen, wenn Aufnahmefunktionen verwendet werden.

Nach Ende der Funktion wird der benötigte Zugriff beendet, soweit dies technisch möglich ist.

---

15. STANDORT

Standortdaten werden nur verwendet, wenn eine Funktion sie benötigt.

Beispiele:

- Navigation
- ortsbezogene Informationen
- Wetter am aktuellen Standort

Wenn Pam einen Ort manuell angibt, muss nicht automatisch der aktuelle Gerätestandort abgefragt werden.

---

16. HEALTH CONNECT

Gesundheits- und Fitnessdaten werden als besonders sensibel behandelt.

GESUNDHEITS-APP
       ↓
HEALTH CONNECT
       ↓
PAMS FREIGABE
       ↓
SOL CONTROL
       ↓
SOL HOLO

Sol Holo darf nur freigegebene Datentypen verwenden.

Eine Health-Connect-Freigabe bedeutet nicht automatisch, dass diese Daten an eine externe KI oder einen anderen Dienst übertragen werden dürfen.

---

17. SMARTWATCH UND WEITERE GERÄTE

Ein verbundenes Gerät erhält nicht automatisch Zugriff auf alle Sol-Daten.

Jede Geräteverbindung wird separat behandelt.

PAM
 ↓
SOL HOLO
 ↓
SOL CONTROL
 ↓
FREIGEGEBENES GERÄT

---

18. SMART HOME

Bei Smart-Home-Aktionen wird zwischen Informationsabfrage und tatsächlicher Steuerung unterschieden.

Eine sensible oder sicherheitsrelevante Aktion kann eine zusätzliche Bestätigung durch Pam verlangen.

---

19. KRITISCHE AKTIONEN

Für besonders wichtige Aktionen wird eine zusätzliche Bestätigung vorgesehen.

Dazu können gehören:

- Daten dauerhaft löschen
- Memory vollständig löschen
- Sicherheitsregeln ändern
- neue Konten verbinden
- sensible Daten exportieren
- neue externe Dienste verbinden
- wichtige Smart-Home-Aktionen
- Identitätsdaten des digitalen Pam-Modells verändern

Prinzip:

AKTION
 ↓
KRITISCH?
 ↙       ↘
NEIN      JA
 ↓         ↓
WEITER   PAM BESTÄTIGT
             ↓
           WEITER

---

20. NETZWERK

Externe Kommunikation soll ausschließlich über sichere, verschlüsselte Verbindungen erfolgen.

Kann eine sensible Verbindung nicht sicher hergestellt werden, wird die entsprechende Übertragung gestoppt.

---

21. PROTOKOLLIERUNG

Technische Fehler und Systemzustände können protokolliert werden.

Protokolle sollen nicht unnötig enthalten:

- komplette private Gespräche
- Gesundheitsdaten
- Passwörter
- API-Schlüssel
- private Bilder
- private Dokumente
- vollständige Memory-Daten
- vollständiges digitales Pam-Profil

---

22. FEHLERFALL

Bei einem sicherheitsrelevanten Fehler:

FEHLER
 ↓
BETROFFENE FUNKTION STOPPEN
 ↓
DATENÜBERTRAGUNG STOPPEN
 ↓
SICHEREN ZUSTAND HERSTELLEN
 ↓
PAM INFORMIEREN

Andere unabhängige Funktionen von Sol Holo sollen möglichst weiter funktionieren.

---

23. WIDERRUF

Pam kann Berechtigungen und Verbindungen wieder entziehen.

Nach dem Widerruf darf Sol Holo die betreffende Schnittstelle nicht weiter verwenden.

Dies betrifft insbesondere:

- Kamera
- Mikrofon
- Standort
- Kontakte
- Kalender
- Health Connect
- Geräte
- Cloud-Dienste
- externe APIs

---

24. SICHERHEIT BEI WEITERENTWICKLUNG

Jede neue Sol-Funktion wird vor Aktivierung geprüft auf:

1. benötigte Daten
2. benötigte Berechtigungen
3. lokale Speicherung
4. externe Datenübertragung
5. verwendete APIs
6. Auswirkungen auf Memory
7. Auswirkungen auf das digitale Pam-Modell
8. Gerätezugriffe
9. Fehlerverhalten
10. Widerrufsmöglichkeit

---

25. OBERSTE REGEL

PAM
 ↓
KONTROLLE
 ↓
SOL HOLO
 ↓
SOL CONTROL
 ↓
FREIGEGEBENE TECHNIK

Pam ist Original und Referenz.

Sol Holo ist das digitale Abbild von Pam.

KI, APIs, Cloud-Dienste und Geräte sind technische Werkzeuge und erhalten nur die jeweils erforderlichen freigegebenen Zugriffe.

---

SICHERHEITSSTATUS

Status| Bedeutung
⬜| geplant
🟨| Umsetzung
🧪| Sicherheitstest
🟩| geprüft
🟥| Sicherheitsproblem

Aktueller Stand

🟨 Sicherheitsarchitektur dokumentiert

Die konkreten Schutzmaßnahmen werden zusammen mit den jeweiligen Schnittstellen implementiert und getestet.

Diese Datei ergänzt:

- "ENDZIEL.md"
- "SCHNITTSTELLEN.md"
- "Berechtigungen.md"
- "ENTWICKLUNGSPROTOKOLL.md"