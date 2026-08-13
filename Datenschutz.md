SOL HOLO – DATENSCHUTZ

Version: 1.0
Stand: 13.08.2026
Status: Technisches Datenschutzkonzept

1. Grundidee

Sol Holo wird als möglichst vollständiges digitales Abbild von Pam entwickelt.

Damit dieses Ziel erreicht werden kann, muss Sol Holo unterschiedliche von Pam freigegebene Informationen miteinander verbinden, speichern, auswerten und für das digitale Pam-Modell verwenden können.

Die Grundstruktur lautet:

PAM
Original / Referenz
       ↕
SOL HOLO
Digitales Abbild von Pam
       ↕
SOL CONTROL
       ↕
EXTERNE KI / DIENSTE / GERÄTE

Der Datenschutz soll die Entwicklung des digitalen Pam-Abbilds nicht verhindern.

Er soll sicherstellen, dass Pam kontrolliert:

- welche Daten Teil von Sol Holo werden,
- welche Daten Sol miteinander verbinden darf,
- welche Informationen lokal gespeichert werden,
- welche Informationen externe Systeme benötigen,
- welche Informationen nach außen übertragen werden,
- welche Verbindungen wieder beendet werden.

---

2. PAM ↔ SOL HOLO

Pam ist Original und Referenz.

Sol Holo ist das digitale Abbild von Pam.

Deshalb dürfen Informationen, die Pam ausdrücklich für Sol Holo bereitstellt, innerhalb des Sol-Holo-Systems miteinander verbunden werden.

PAM
 ↓
FREIGEGEBENE DATEN
 ↓
SOL MEMORY
 +
DIGITALES PAM-PROFIL
 +
KI / LERNFUNKTIONEN
 ↓
SOL HOLO

Ziel ist nicht, einzelne Informationen dauerhaft voneinander abzuschotten.

Ziel ist, aus den von Pam freigegebenen Informationen ein zusammenhängendes digitales Pam-Modell aufzubauen.

---

3. WAS SOL HOLO ÜBER PAM LERNEN KANN

Zum digitalen Pam-Modell können – nach Freigabe durch Pam – beispielsweise gehören:

- Aussehen
- Gesicht und visuelle Merkmale
- Stimme
- Sprechweise
- Wortwahl
- Ausdruck
- Wissen
- Erinnerungen
- Erfahrungen
- persönliche Präferenzen
- Kommunikationsweise
- typische Reaktionen
- Gestik
- Bewegungen
- Gewohnheiten
- zeitlicher und situativer Kontext
- freigegebene Geräteinformationen
- freigegebene Gesundheits- und Fitnessinformationen
- von Pam ausdrücklich bereitgestellte persönliche Informationen

Diese Informationen können miteinander verknüpft werden, wenn dies dazu dient, das digitale Pam-Abbild zu verbessern.

---

4. SOL DARF ZUSAMMENHÄNGE LERNEN

Sol Holo soll nicht ausschließlich einzelne Datensätze speichern.

Es soll Zusammenhänge erkennen können.

Beispiel:

STIMME
   +
WORTWAHL
   +
ERINNERUNGEN
   +
PRÄFERENZEN
   +
REAKTIONEN
   +
KONTEXT
        ↓
DIGITALES PAM-MODELL

Dadurch kann Sol Holo lernen, wie Pam kommuniziert und auf unterschiedliche Situationen reagiert.

Die Referenz bleibt Pam.

---

5. DATENSCHUTZGRENZE

Die zentrale Datenschutzgrenze liegt zwischen Sol Holo und externen Systemen.

             PAM
              ↕
          SOL HOLO
              │
        SOL CONTROL
              │
     ─────────┼─────────
       SCHUTZGRENZE
     ─────────┼─────────
              │
      EXTERNE SYSTEME

Externe Systeme können beispielsweise sein:

- KI-Anbieter
- Cloud-Dienste
- externe APIs
- Webdienste
- andere Apps
- Smart-Home-Dienste
- externe Server

Nur weil Sol Holo eine Information besitzt, bedeutet dies nicht automatisch, dass ein externer Dienst diese Information erhalten darf.

---

6. SOL CONTROL

"SOL CONTROL" kontrolliert den Datenfluss nach außen.

Vor einer externen Übertragung wird geprüft:

1. Welche Aufgabe soll ausgeführt werden?
2. Welche Daten werden dafür benötigt?
3. Welcher externe Dienst wird verwendet?
4. Welche Daten müssen tatsächlich übertragen werden?
5. Ist die entsprechende Verbindung freigegeben?
6. Kann das Ergebnis anschließend wieder Sol Holo zugeordnet werden?

Grundprinzip:

PAM
 ↕
SOL HOLO
 ↓
SOL CONTROL
 ↓
NOTWENDIGE DATEN
 ↓
EXTERNER DIENST
 ↓
ERGEBNIS
 ↓
SOL HOLO

---

7. EXTERNE KI

Externe KI kann Sol Holo beim Verstehen, Lernen, Analysieren und Antworten unterstützen.

Eine externe KI ist jedoch nicht automatisch Eigentümer oder dauerhafter Speicher des digitalen Pam-Modells.

SOL HOLO
 ↓
SOL CONTROL
 ↓
AUFGABENBEZOGENER KONTEXT
 ↓
EXTERNE KI
 ↓
ERGEBNIS
 ↓
SOL HOLO

Das vollständige digitale Pam-Profil soll nicht allein deshalb an einen externen KI-Dienst übertragen werden, weil dieser für eine einzelne Aufgabe benötigt wird.

---

8. SOL MEMORY

Sol Memory bildet einen wichtigen Bestandteil des digitalen Pam-Abbilds.

Es kann von Pam freigegebene Informationen langfristig miteinander verbinden.

Dazu können gehören:

- Erinnerungen
- Erfahrungen
- Personen und Zusammenhänge
- Präferenzen
- Kommunikationsmuster
- Wissen
- Korrekturen
- Entscheidungen
- Kontext

PAM
 ↕
SOL MEMORY
 ↕
DIGITALES PAM-PROFIL
 ↕
SOL HOLO

Memory ist nicht nur Gesprächsverlauf.

Es ist Bestandteil des langfristigen digitalen Pam-Modells.

---

9. PAM KANN SOL KORRIGIEREN

Da Pam die Referenz ist, muss Pam das digitale Modell korrigieren können.

Wenn Sol beispielsweise eine falsche Verbindung gelernt hat:

SOL:
Annahme

 ↓

PAM:
Korrektur

 ↓

SOL MEMORY:
Korrektur übernehmen

 ↓

DIGITALES PAM-MODELL:
aktualisieren

Eine bestätigte Korrektur von Pam hat Vorrang vor einer vorherigen falschen Annahme des Systems.

---

10. LÖSCHEN UND VERGESSEN

Pam soll bestimmen können, dass bestimmte Informationen nicht mehr Bestandteil des aktiven digitalen Modells sind.

Dies kann betreffen:

- einzelne Erinnerungen
- Bilder
- Stimmaufnahmen
- Verbindungen zwischen Informationen
- persönliche Daten
- externe Verbindungen
- komplette Datenbereiche

Dabei muss technisch zwischen:

aus dem aktiven Sol-Modell entfernen

und

physisch aus vorhandenen Speichern löschen

unterschieden werden.

Beide Vorgänge sollen später nachvollziehbar umgesetzt werden.

---

11. STIMME

Pams Stimme kann Bestandteil von Sol Holo werden.

Dabei können unterschiedliche Daten entstehen:

SPRACHEINGABE
     ↓
Inhalt verstehen

STIMMPROFIL
     ↓
Pams Stimme abbilden

Ein dauerhaftes Stimmprofil gehört zum digitalen Pam-Modell, wenn Pam es dafür freigibt.

---

12. AUSSEHEN

Fotos, Videos oder andere visuelle Daten können verwendet werden, um das digitale Erscheinungsbild von Pam aufzubauen.

Daraus können später entstehen:

- Avatar
- Gesichtsdarstellung
- Mimik
- Gestik
- Körperbewegungen
- 3D-Modell
- AR-/Holo-Darstellung

Diese Daten gehören zum geschützten digitalen Pam-Profil.

---

13. KOMMUNIKATIONSWEISE

Sol Holo kann lernen:

- welche Wörter Pam verwendet,
- wie Pam Sätze formuliert,
- welche Ausdrucksweisen typisch sind,
- wie Pam Humor verwendet,
- wie Pam auf bestimmte Situationen reagiert.

Diese Merkmale können gemeinsam mit Memory und Kontext verwendet werden, um das digitale Abbild zu verbessern.

---

14. HEALTH CONNECT

Von Pam freigegebene Health-Connect-Daten können innerhalb von Sol Holo Teil des persönlichen Kontextes sein.

HEALTH CONNECT
      ↓
PAMS FREIGABE
      ↓
SOL CONTROL
      ↓
SOL HOLO

Die Freigabe für Sol Holo bedeutet jedoch nicht automatisch eine Freigabe für externe KI- oder Cloud-Dienste.

Eine externe Übertragung wird separat kontrolliert.

---

15. KAMERA, FOTOS UND DATEIEN

Pam kann Sol Holo Bilder, Kamerainhalte und Dateien zur Verfügung stellen.

Dabei wird unterschieden zwischen:

temporär verwenden

und

dauerhaft Teil des digitalen Pam-Modells werden

Sol soll nicht selbstständig davon ausgehen, dass jeder geöffnete Inhalt dauerhaft gespeichert werden soll.

---

16. KALENDER, KONTAKTE UND STANDORT

Freigegebene Informationen aus:

- Kalender
- Kontakten
- Standort
- Navigation
- verbundenen Geräten

können Sol helfen, Pams Kontext besser zu verstehen.

Ob eine Information dauerhaft in Memory übernommen wird, wird von der jeweiligen Funktion und den festgelegten Regeln bestimmt.

---

17. SMARTWATCH UND WEARABLES

Wearables können Sol Holo zusätzliche freigegebene Informationen liefern.

Sie können außerdem als weitere Schnittstelle zwischen Pam und Sol dienen.

PAM
 ↕
WATCH
 ↕
SOL HOLO

Die Watch erhält dadurch nicht automatisch Zugriff auf das vollständige Sol Memory.

---

18. GERÄTEÜBERGREIFENDES SOL HOLO

Sol Holo kann später auf mehreren von Pam kontrollierten Geräten verfügbar sein.

Beispiel:

SMARTPHONE
     ↕
SOL HOLO
     ↕
SMARTWATCH
     ↕
WEITERE EIGENE GERÄTE

Dabei muss sichergestellt werden, dass synchronisierte Daten weiterhin dem richtigen Pam-Profil zugeordnet bleiben.

---

19. CLOUD

Cloud-Speicherung kann verwendet werden, wenn sie für Synchronisation, Backup oder technische Funktionen benötigt wird.

Cloud ist jedoch nicht automatisch der Hauptspeicher des digitalen Pam-Modells.

Wo technisch sinnvoll, soll Sol Holo lokale Speicherung und geschützte Synchronisation kombinieren können.

---

20. DATENEXPORT

Pam soll langfristig die Möglichkeit erhalten, ihr digitales Sol-Holo-Profil zu exportieren.

Ein solcher Export kann enthalten:

- Memory
- Einstellungen
- digitales Pam-Profil
- Avatar-Daten
- Stimmprofil
- freigegebene persönliche Informationen

Ein vollständiger Export muss besonders geschützt werden.

---

21. KEINE FREMDNUTZUNG

Pams digitales Modell darf nicht automatisch verwendet werden, um:

- andere Personen darzustellen,
- fremde Profile zu erzeugen,
- eine andere Identität zu trainieren,
- Pams Identität ohne ihre Kontrolle zu vervielfältigen.

Das digitale Pam-Modell gehört funktional zu:

PAM ↔ SOL HOLO

---

22. TRANSPARENZ

Pam soll später innerhalb von Sol Holo sehen können:

- welche Daten Sol kennt,
- welche Daten im Memory liegen,
- welche Schnittstellen verbunden sind,
- welche externen Dienste aktiv sind,
- welche Datenbereiche synchronisiert werden,
- welche Berechtigungen aktiv sind.

---

23. EXTERNE DATENÜBERTRAGUNG

Bei externen Diensten soll dokumentiert werden:

Punkt| Bedeutung
Dienst| Wer erhält Daten?
Zweck| Warum werden Daten übertragen?
Daten| Welche Informationen werden übertragen?
Rückgabe| Was erhält Sol zurück?
Speicherung| Speichert der externe Dienst Daten?
Kontrolle| Wie kann die Verbindung beendet werden?

Diese Angaben werden ergänzt, sobald konkrete externe Dienste implementiert werden.

---

24. DATENSCHUTZ BEI NEUEN FUNKTIONEN

Bei jeder neuen Schnittstelle wird geprüft:

NEUE FUNKTION
 ↓
Welche Pam-Daten benötigt sie?
 ↓
Darf Sol sie verwenden?
 ↓
Bleiben sie innerhalb Sol Holo?
 ↓
Falls nein:
Welcher externe Dienst erhält sie?
 ↓
SOL CONTROL
 ↓
FUNKTION

---

25. VERHÄLTNIS ZU SECURITY

"DATENSCHUTZ.md" beschreibt:

Welche Daten Sol Holo verwenden und verbinden kann und wie der Datenfluss kontrolliert wird.

"SECURITY.md" beschreibt:

Wie diese Daten und technischen Zugänge geschützt werden.

"BERECHTIGUNGEN.md" beschreibt:

Welche Zugriffe Pam Sol Holo erlaubt.

"SCHNITTSTELLEN.md" beschreibt:

Über welche technischen Wege die Systeme miteinander verbunden sind.

"ENDZIEL.md" beschreibt:

Was Sol Holo langfristig werden soll.

---

26. OBERSTE DATENSCHUTZREGEL

PAM
Original / Referenz
       ↕
SOL HOLO
Digitales Abbild
       ↕
SOL MEMORY
       ↕
DIGITALES PAM-MODELL

Innerhalb dieses Systems dürfen von Pam freigegebene Informationen zusammengeführt werden, damit Sol Holo das digitale Pam-Abbild entwickeln kann.

Die Grenze nach außen lautet:

SOL HOLO
 ↓
SOL CONTROL
 ↓
PRÜFUNG
 ↓
EXTERNER DIENST

Pam bestimmt, was Teil von Sol Holo wird.

Sol Holo darf daraus lernen und Zusammenhänge bilden.

Externe Systeme erhalten dadurch nicht automatisch Zugriff auf das vollständige digitale Pam-Modell.

---

STATUS

🟨 Datenschutzarchitektur dokumentiert

Die konkreten Regeln für einzelne Anbieter, APIs, Cloud-Dienste und Speicherorte werden ergänzt, sobald diese tatsächlich implementiert werden.

Vor einer Veröffentlichung für andere Personen wird zusätzlich geprüft, welche gesetzlichen Datenschutzinformationen und Einwilligungen für die tatsächlich umgesetzte Version erforderlich sind.