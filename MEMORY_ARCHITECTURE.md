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

## Technischer Stand – bestätigtes Vollzeitgedächtnis und Identitätstrennung

Stand: 2. September 2026

Das Wort **Vollzeitgedächtnis** bedeutet, dass ausdrücklich bestätigte
Erinnerungen später dauerhaft zur Verfügung stehen können. Es bedeutet nicht,
dass jede Text- oder Sprachnachricht ungeprüft als persönliche Erinnerung
protokolliert wird.

Die verbindliche technische Reihenfolge lautet:

1. Eine Nachricht kommt als Text oder als transkribierte Sprache an. Die
   Audio-Rohaufnahme wird nicht Bestandteil des persönlichen Memory-Stores.
2. Beide Quellen durchlaufen dieselbe Speicherregel.
3. Die Sprecheridentität muss durch die fest signierte Holo-Instanz und ein
   dazu passendes technisches Signal feststehen. Namen im Text, Schreibstil und
   Gesprächsthema reichen nicht aus.
4. Jede ausgelieferte Holo-Installation ist dauerhaft an genau eine kanonische
   Owner-ID gebunden. Fehlt diese Bindung oder passt ein Signal nicht dazu,
   werden persönliche Daten gesperrt. Eine andere Person darf in dieser
   Installation weder auswählbar noch vorladbar sein.
5. Eine normale Nachricht bleibt ohne ausdrücklichen Speicherwunsch außerhalb
   des dauerhaften persönlichen Gedächtnisses.
6. Ein direkter Speicherbefehl oder eine bestätigte Speicherrückfrage gilt nur
   für die eindeutig zugeordnete Person.
7. Der Datenbankzugriff wird zusätzlich auf die kanonische Owner-ID dieser
   Person begrenzt.
8. Zwischen verschiedenen Owner-IDs gilt **0,0 gemeinsamer persönlicher
   Speicher**. Es gibt keine gemeinsame Owner-ID und keinen gemeinsamen
   persönlichen Datensatz.
9. Eine von mehreren Personen gemeinsam erlebte Erinnerung darf nur als
   getrennte Kopie pro Owner entstehen: jede Person bestätigt ihren eigenen
   Eintrag, jeder Eintrag besitzt seine eigene Owner-ID, und Ändern, Sperren
   oder Löschen einer Kopie beeinflusst keine andere Kopie.

Die derzeitige technische Zuordnung ist:

| Person | Kanonische Owner-ID | Sicher behandelter Legacy-Alias |
|---|---|---|
| Pam | `pam-sol` | `pam-sol-001` |
| Steffi | `steffi-sol` | – |

Neue Einträge werden ausschließlich mit der kanonischen Owner-ID geschrieben.
Der Legacy-Alias `pam-sol-001` wird beim gezielten Zugriff als `pam-sol`
aufgelöst. Vorhandene Datensätze werden dafür weder gelöscht noch automatisch
umgeschrieben.

### Verbindliche Trennung alter Bilder und biometrischer Hinweise

Alte Bild- oder Munddaten ohne nachweisbare Owner-Bindung werden beim ersten
Start in einen **unzugeordneten Quarantänebereich** verschoben. Sie werden
nicht angezeigt, nicht für den Klon verwendet und niemals anhand einer
Vermutung automatisch einer Person zugewiesen. Auch bereits owner-benannte
Bilddaten werden ausgesondert, wenn die ausdrückliche Bestätigung der Person
fehlt oder nicht exakt zur fest signierten Owner-ID passt.

Für die Zuordnung gelten vier voneinander getrennte Regeln:

1. **Owner-ID:** Die signierte Installation akzeptiert ausschließlich ihre
   fest einkompilierte Owner-ID. Sie ist die technische Speichergrenze.
2. **Gesichtsverarbeitung:** Der vorhandene lokale MediaPipe Face Landmarker
   erkennt Konturen und Landmarken für die Animation, aber keine Person. Eine
   spätere echte Gesichtsübereinstimmung darf nur mit einem separat und
   freiwillig angelegten, lokal geschützten Referenzprofil prüfen. Sie darf
   niemals selbst eine Owner-ID vergeben.
3. **Gerät:** Ein sichtbarer Gerätename ist änderbar und daher nur ein
   Herkunftshinweis. Maßgeblich ist der owner-gebundene kryptografische
   Geräteschlüssel der signierten App-Instanz.
4. **Standort:** Standortdaten dürfen nur nach eigener Zustimmung als
   zusätzlicher Herkunftshinweis verwendet werden. Sie sind niemals ein
   Identitätsbeweis und können keine Owner-Zuordnung überschreiben.

Für alte Bilder werden Gesichtsperson, Ursprungsgerät und Ursprungsstandort als
`not-verified` beziehungsweise `unknown` markiert, weil diese Daten
nachträglich nicht verlässlich rekonstruiert werden können. Eine erneute
Speicherung ist nur nach bewusster Auswahl und ausdrücklicher Bestätigung der
Person unter ihrer eigenen Owner-ID zulässig.

Die Implementierung besteht aus zwei eigenständigen Modulen:

- `modules/identity-memory.mjs` – reine Identitäts- und
  Speicherentscheidung für Text und Sprache,
- `modules/identity-memory-store.mjs` – additive PostgreSQL-Tabelle,
  bestätigte Schreibvorgänge und strikt Owner-begrenzter Abruf.

Nur eine Policy-Entscheidung mit `kind: "persist"`, `persist: true` und
`confirmed: true` darf an den dauerhaften Store übergeben werden. Die
Datenbanktabelle erzwingt zusätzlich `confirmed IS TRUE`.

Die bisher vorhandenen Tabellen bleiben aus Gründen der Datenintegrität
unverändert erhalten. Automatisch protokollierte Legacy-Inhalte werden durch
das neue Modul jedoch nicht als bestätigte persönliche Erinnerung abgerufen.
Ein späterer Import muss pro Inhalt ausdrücklich bestätigt und weiterhin der
richtigen Person zugeordnet werden.

Öffentliche technische Protokolle dürfen keine Erinnerungsinhalte,
Gesundheitsangaben, Einwilligungstexte oder Suchbegriffe enthalten. Das Modul
stellt deshalb nur ein inhaltsfreies Audit-Ereignis bereit. Private Inhalte
dürfen nicht durch das Protokollieren kompletter Requests, Policy-Entscheidungen
oder SQL-Parameter umgangen werden.

### Verbleibende Einbindung in den aktiven Server

Der aktive Server muss die beiden Module noch an seinen Text- und Sprachpfad
anschließen. Dabei sind folgende Punkte gemeinsam umzusetzen:

- Identitätssignale (`selectedSpeakerId` und gegebenenfalls
  `verifiedSpeakerId`) aus der jeweils vertrauenswürdigen Quelle übergeben,
- bei `clarify_identity` oder `identity_conflict` die Pam-/Steffi-Rückfrage
  ausgeben und nicht speichern,
- nur `persist` an `saveConfirmed()` weiterreichen,
- persönliche Abrufe ausschließlich mit zusammenpassender Sprecher- und
  kanonischer Owner-ID durchführen,
- ungeprüfte automatische Writes in `sol_fulltime_memory`,
  `sol_long_term_memory` oder ungetrennte Gesprächstabellen für diesen neuen
  Pfad nicht mehr verwenden,
- die Zugriffsberechtigung auf den angeforderten Owner serverseitig prüfen;
  Identitätszuordnung und Zugriffsberechtigung sind zwei getrennte Schranken.

Automatisierte Tests befinden sich in `tests/identity-memory.test.mjs` und
werden mit folgendem Befehl ausgeführt:

```bash
node --test tests/identity-memory.test.mjs
```

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

Gemeinsame Fakten können nur als getrennte, jeweils selbst bestätigte Kopie
unter jeder beteiligten Owner-ID dokumentiert werden. Es entsteht dabei kein
gemeinsamer Datensatz.

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
