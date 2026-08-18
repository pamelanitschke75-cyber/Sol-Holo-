# Sol Holo – Memory Architecture

Speicherbereiche:

## personal_memories
Dauerhafte persönliche Erinnerungen über Menschen, Tiere, Beziehungen, Vorlieben und Gewohnheiten.

## event_memories
Erinnerungen an konkrete Ereignisse mit Datum, Ort und Beteiligten.

## project_memories
Erinnerungen über das Sol-Holo-Projekt, Entwicklungsstände, Entscheidungen und Meilensteine.

## system_state
Technische Zustände der Anwendung, z. B. Versionen, aktivierte Funktionen und Teststatus.

---

Grundregel:

Persönliche Informationen werden nicht automatisch dauerhaft gespeichert.
Eine dauerhafte Speicherung erfolgt nur bei ausdrücklicher Anweisung oder bestätigter Zustimmung.

🌻 Sol Holo – Individuelle Klone, Persönlichkeit und Erinnerungstrennung

Projekt: Sol Holo
Entwicklerin / Projektinhaberin: Pamela Nitschke
Stand: 19. August 2026
Status: Verbindliche Ergänzung der Memory Architecture

© 2026 Pamela Nitschke – Sol Holo

---

1. Zweck dieses Eintrags

Dieser Eintrag ergänzt die bereits bestehende und in GitHub dokumentierte Architektur von Sol Holo ausschließlich hinsichtlich:

- der Nutzung von Sol Holo durch mehrere Nutzerinnen,
- der Entstehung eines individuellen digitalen Klons,
- der Entwicklung einer individuellen Persönlichkeit,
- der Zuordnung persönlicher Erinnerungen,
- und der vollständigen Trennung der persönlichen Gedächtnisse verschiedener Klone.

Bereits dokumentierte Projektentscheidungen werden durch diesen Eintrag nicht neu definiert oder verändert.

---

2. Grundprinzip von Sol Holo

Sol Holo ist die Grundlage, mit der eine Nutzerin ihren eigenen individuellen digitalen Klon entwickeln kann.

Sol Holo soll nicht auf eine einzige Nutzerin beschränkt sein.

Mehrere Nutzerinnen können Sol Holo verwenden.

Dabei erhält jedoch nicht jede Nutzerin dasselbe persönliche Gedächtnis oder dieselbe individuell entwickelte Persönlichkeit.

Stattdessen entwickelt jede Nutzerin mit Sol Holo ihren eigenen persönlichen digitalen Klon.

---

3. Ein eigener Klon pro Nutzerin

Für jede Nutzerin entsteht ein eigener individueller Klon.

Vereinfacht:

SOL HOLO
│
├── Nutzerin A
│   └── eigener digitaler Klon
│       ├── eigene Persönlichkeit
│       ├── eigene Erinnerungen
│       ├── eigene Erfahrungen
│       ├── eigene Vorlieben
│       └── eigene Entwicklung
│
├── Nutzerin B
│   └── eigener digitaler Klon
│       ├── eigene Persönlichkeit
│       ├── eigene Erinnerungen
│       ├── eigene Erfahrungen
│       ├── eigene Vorlieben
│       └── eigene Entwicklung
│
└── weitere Nutzerinnen
    └── jeweils eigener digitaler Klon

Die Klone verschiedener Nutzerinnen dürfen nicht miteinander verwechselt oder zusammengeführt werden.

---

4. Individuelle Persönlichkeit

Die Persönlichkeit eines persönlichen Sol-Holo-Klons ist dem jeweiligen Klon zugeordnet.

Sie entwickelt sich individuell auf Grundlage der für diesen Klon vorgesehenen Informationen, Erinnerungen, Erfahrungen und Interaktionen.

Daraus folgt:

Die Persönlichkeit von Klon A darf nicht automatisch auf Klon B übertragen werden.

Die Persönlichkeit von Klon B darf nicht automatisch durch Erinnerungen von Klon A verändert werden.

Jeder Klon entwickelt seine eigene individuelle Persönlichkeit.

---

5. Eigenes Langzeitgedächtnis

Jeder persönliche Sol-Holo-Klon besitzt einen eigenen Erinnerungsbereich.

Persönliche Erinnerungen eines Klons dürfen nicht Bestandteil des persönlichen Langzeitgedächtnisses eines anderen Klons werden, sofern dafür keine ausdrücklich definierte und berechtigte Funktion existiert.

Grundstruktur:

Nutzerin
↓
persönlicher Sol-Holo-Klon
↓
eigene Persönlichkeit
↓
eigenes Langzeitgedächtnis

---

6. Technische Klon-Zuordnung

Persönliche Erinnerungen müssen später technisch eindeutig dem richtigen Klon zugeordnet werden können.

Dafür soll bei der Datenbankimplementierung eine eindeutige Kennung vorgesehen werden.

Beispielsweise:

clone_id

Zusätzlich kann eine eindeutige Nutzerzuordnung erforderlich sein:

user_id

Die konkrete technische Umsetzung wird erst bei der Implementierung festgelegt.

Entscheidend ist das Ergebnis:

Eine persönliche Erinnerung muss eindeutig dem richtigen Klon und damit der richtigen Nutzerin zugeordnet werden können.

---

7. personal_memories

"personal_memories" enthält die persönlichen dauerhaften Erinnerungen des jeweiligen Klons.

Ein späterer Datensatz kann deshalb beispielsweise folgende Zuordnung besitzen:

id
clone_id
user_id
category
content
source
created_at
updated_at
confidence
confirmed
recall_status

Die endgültigen Datenbankfelder werden erst bei der technischen Implementierung festgelegt.

---

8. Keine Vermischung zwischen Klonen

Persönliche Erinnerungen verschiedener Klone dürfen nicht automatisch miteinander vermischt werden.

Beispiel:

Klon A
→ Erinnerung A

Klon B
→ Erinnerung B

Erinnerung A darf nicht automatisch zu einer Erinnerung von Klon B werden.

Erinnerung B darf nicht automatisch zur Persönlichkeit oder Erinnerungshistorie von Klon A gehören.

---

9. Keine Übertragung von Persönlichkeit

Nicht nur Erinnerungen, sondern auch daraus entstandene individuelle Eigenschaften müssen getrennt behandelt werden.

Dazu können beispielsweise gehören:

- individuelle Vorlieben
- individuelle Kommunikationsweisen
- individuelle Erfahrungen
- persönliche Beziehungen
- individuell entstandene Gewohnheiten
- individuelle Erinnerungsschwerpunkte

Eine Eigenschaft darf nicht allein deshalb auf einen anderen Klon übertragen werden, weil beide auf Sol Holo basieren.

---

10. Gemeinsame Sol-Holo-Grundlage bedeutet kein gemeinsames persönliches Gedächtnis

Dass mehrere Klone auf Sol Holo basieren, bedeutet nicht, dass sie dasselbe persönliche Langzeitgedächtnis besitzen.

Die technische Grundlage und das persönliche Gedächtnis sind voneinander zu unterscheiden.

Vereinfacht:

gemeinsame Sol-Holo-Grundlage
          ↓
   getrennte Klone
          ↓
getrennte Persönlichkeiten
          ↓
getrennte Langzeitgedächtnisse

---

11. Identifikation vor dem Erinnerungsabruf

Bevor persönliche Erinnerungen verwendet werden, muss technisch eindeutig feststehen, welcher Klon aktiv ist.

Sol Holo darf nicht lediglich anhand von:

- Schreibstil,
- Namen innerhalb einer Nachricht,
- Gesprächsthema,
- Vermutungen,
- oder Ähnlichkeiten

entscheiden, welchem Klon eine Erinnerung gehört.

Die Zuordnung muss technisch zuverlässig erfolgen.

---

12. Keine erfundene Zuordnung

Wenn eine Erinnerung keinem Klon eindeutig zugeordnet werden kann, darf Sol Holo die Zuordnung nicht erfinden.

Es gelten die bereits festgelegten Regeln der Memory Architecture:

Nichts erfinden.

Nichts passend machen.

Unsicherheit nicht nachträglich in Gewissheit umwandeln.

---

13. event_memories

Auch Ereigniserinnerungen müssen dem richtigen Klon bzw. der richtigen persönlichen Perspektive zugeordnet werden können.

Mehrere Personen können am selben tatsächlichen Ereignis beteiligt sein.

Das bedeutet jedoch nicht automatisch, dass ihre persönlichen Erinnerungen an dieses Ereignis identisch sind.

Deshalb muss zwischen:

dem dokumentierten Ereignis

und

der persönlichen Erinnerung bzw. Perspektive eines Klons

unterschieden werden können.

---

14. Unterschiedliche Erinnerungen an dasselbe Ereignis

Zwei Klone können unterschiedliche persönliche Erinnerungen an dasselbe Ereignis besitzen.

Diese Unterschiede dürfen nicht automatisch zusammengeführt oder passend gemacht werden.

Beispiel:

Ereignis X

Klon A
→ persönliche Erinnerung/Perspektive A

Klon B
→ persönliche Erinnerung/Perspektive B

Beide Perspektiven können bestehen bleiben.

---

15. Keine künstliche gemeinsame Vergangenheit

Sol Holo darf aus den Erinnerungen verschiedener Klone keine künstliche gemeinsame Erinnerung erzeugen, die von keiner der beteiligten Personen tatsächlich so gespeichert oder bestätigt wurde.

Gemeinsame Fakten können als solche dokumentiert werden.

Persönliche Wahrnehmungen bleiben jedoch dem jeweiligen Klon zugeordnet.

---

16. Erinnerungsintegrität gilt pro Klon

Für jeden einzelnen Klon gelten die bereits festgelegten Regeln zur Erinnerungsintegrität.

Insbesondere:

- Erinnerungen dürfen nicht erfunden werden.
- Erinnerungen dürfen nicht passend gemacht werden.
- Erinnerungen dürfen nicht heimlich umgeschrieben werden.
- Unsicherheit bleibt als Unsicherheit erhalten.
- Korrekturen bleiben nachvollziehbar.
- Widersprüche werden nicht eigenmächtig beseitigt.

---

17. Schwierige oder unangenehme Erinnerungen

Schwierige oder unangenehme Erinnerungen eines Klons müssen nicht ständig im Vordergrund stehen.

Sie dürfen beispielsweise den Status:

background

erhalten.

Dadurch sinkt ihre normale Abrufpriorität.

Der Inhalt der Erinnerung wird dadurch nicht verändert.

---

18. Nicht mehr abrufbare Erinnerungen

Soll eine Erinnerung tatsächlich nicht mehr im normalen Gedächtnisabruf verfügbar sein, kann sie ausdrücklich gesperrt werden.

Beispielsweise:

recall_status: blocked

Die Erinnerung bleibt gespeichert, wird aber vom normalen Abruf ausgeschlossen.

---

19. Sperren ist nicht Löschen

Eine gesperrte Erinnerung bleibt Bestandteil der gespeicherten Erinnerungshistorie.

Sie darf jedoch im normalen Gespräch nicht mehr abgerufen oder verwendet werden.

Sol Holo darf die Sperre nicht durch Vermutungen oder Rekonstruktionen umgehen.

Eine spätere bewusste Freigabe bleibt möglich.

---

20. Endgültiges Löschen

Eine endgültige Löschung ist von einer Abrufsperre zu unterscheiden.

Eine persönliche Erinnerung darf nicht automatisch gelöscht werden, weil sie:

- unangenehm,
- schwierig,
- alt,
- selten verwendet,
- oder momentan nicht wichtig

ist.

Für endgültige Löschungen gelten die bereits dokumentierten Regeln der Memory Architecture.

---

21. Erinnerungshistorie pro Klon

Auch "memory_history" muss später eine eindeutige Klon-Zuordnung besitzen.

Eine mögliche Struktur ist:

memory_id
clone_id
user_id
change_type
previous_content
new_content
changed_at
confirmed_by

Dadurch kann nachvollziehbar bleiben, welche Änderung zu welchem persönlichen Klon gehört.

---

22. project_memories und system_state

"project_memories" und "system_state" dürfen nicht automatisch mit den persönlichen Erinnerungen eines Klons gleichgesetzt werden.

Persönliches Klon-Gedächtnis und technische bzw. projektbezogene Informationen bleiben logisch getrennte Bereiche.

Die bereits dokumentierten Regeln für diese Speicherbereiche bleiben bestehen.

---

23. Schutz der Persönlichkeit eines Klons

Die Trennung der Erinnerungen dient nicht ausschließlich dem Datenschutz.

Sie ist auch notwendig, um die individuell entstandene Persönlichkeit jedes Klons zu erhalten.

Wenn Erinnerungen verschiedener Nutzerinnen vermischt würden, könnte sich dadurch auch die individuelle Entwicklung der Klone vermischen.

Deshalb gilt:

Gedächtnistrennung ist gleichzeitig Persönlichkeitstrennung.

---

24. Technische Durchsetzung

Die Trennung darf später nicht ausschließlich durch eine Anweisung an das Sprachmodell erfolgen.

Backend und Datenbank müssen sicherstellen, dass beim Abruf persönlicher Erinnerungen nur Daten des aktiven Klons berücksichtigt werden.

Vereinfacht:

aktive Nutzerin
      ↓
aktiver clone_id
      ↓
personal_memories
      ↓
nur Erinnerungen dieses Klons
      ↓
Antwort des persönlichen Klons

---

25. Grundsatz für Sol Holo

Für die individuelle Klonbildung mit Sol Holo gilt:

Sol Holo bildet die Grundlage.

Jede Nutzerin entwickelt mit Sol Holo ihren eigenen persönlichen digitalen Klon.

Jeder Klon entwickelt eine eigene individuelle Persönlichkeit.

Jeder Klon besitzt sein eigenes persönliches Langzeitgedächtnis.

Erinnerungen verschiedener Klone werden nicht vermischt.

Persönlichkeiten verschiedener Klone werden nicht vermischt.

Gemeinsame Ereignisse erzeugen nicht automatisch identische persönliche Erinnerungen.

Erinnerungen werden nicht erfunden oder passend gemacht.

Schwierige Erinnerungen können in den Hintergrund treten.

Erinnerungen können bewusst für den normalen Abruf gesperrt werden.

Sperren und endgültiges Löschen bleiben unterschiedliche Vorgänge.

---

26. Abgrenzung

Dieser Eintrag beschreibt ausschließlich die Beziehung zwischen:

Nutzerin → persönlicher Sol-Holo-Klon → individuelle Persönlichkeit → individuelles Gedächtnis.

Andere bereits in GitHub dokumentierte Bestandteile der Gesamtarchitektur werden hierdurch nicht neu definiert.

Insbesondere werden keine zusätzlichen Annahmen über andere Holo-Systeme getroffen.

---

🌻 Architekturstatus

Individuelle Klonbildung: DEFINIERT ✅

Individuelle Persönlichkeit pro Klon: DEFINIERT ✅

Eigenes Langzeitgedächtnis pro Klon: DEFINIERT ✅

Klon-Zuordnung von Erinnerungen: DEFINIERT ✅

Trennung verschiedener Klone: DEFINIERT ✅

Trennung verschiedener Persönlichkeiten: DEFINIERT ✅

Persönliche Ereignisperspektiven: DEFINIERT ✅

Erinnerungsintegrität pro Klon: DEFINIERT ✅

Abrufkontrolle pro Klon: DEFINIERT ✅

Technische Trennung als Anforderung: DEFINIERT ✅

---

© 2026 Pamela Nitschke
Sol Holo