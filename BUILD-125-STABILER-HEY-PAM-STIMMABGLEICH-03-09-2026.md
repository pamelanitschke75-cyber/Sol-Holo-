# Build 125 – stabiler „Hey Pam“-Stimmabgleich

Stand: 03.09.2026

## Bestätigter S23-Befund

Build 124 erkennt den persönlichen Weckruf „Hey Pam“, lehnt Pams Stimme
danach aber ab. Obwohl die kurze Hey-Pam-Vorlage bereits erfolgreich
gespeichert und als geschützt angezeigt wird, fordert die Diagnose fälschlich
einen weiteren Sicherheitstest an.

## Reparatur

- Nach dem lokalen Keyword-Treffer zeichnet der Dienst weitere 350 ms auf,
  damit das Ende von „Pam“ vollständig in der Sprecherprüfung ankommt.
- Der echte Weckruf wird mit demselben Kurzsatz-Selektor ausgeschnitten, der
  auch die beim Sicherheitstest gespeicherte Hey-Pam-Vorlage erzeugt.
- `templateUsed` beschreibt wieder korrekt, ob die persönliche Vorlage beim
  Vergleich verwendet wurde, nicht ob der Vergleich bereits angenommen wurde.
- Die irreführende Aufforderung zu einem weiteren Sicherheitstest wurde aus
  einer normalen Weckruf-Ablehnung entfernt.

## Unveränderte Sicherheit und Daten

- Beide unabhängigen Sprecherprüfungen CAMPPlus und ERes2Net bleiben aktiv.
- Sämtliche Annahmeschwellen bleiben unverändert.
- Owner-ID `pam-sol`, Paket-ID und Profilversion 3 bleiben unverändert.
- Die vorhandenen 3/3-Stimmproben und die Hey-Pam-Vorlage werden nicht
  gelöscht oder neu eingerichtet.

## Prüfstatus

- gezielte Segmentierungs-, Nachlauf- und Diagnose-Regressionstests: lokal
  auszuführen
- vollständiger Node-, Java- und Android-Build: durch GitHub Actions zu
  bestätigen
- Originalsignatur aus Build 89: vor Veröffentlichung zu bestätigen
- Galaxy-S23-Praxistest: **bestanden und von Pam bestätigt**

## Bestätigter Praxisabschluss

Pam hat Build 125 am 03.09.2026 auf ihrem Galaxy S23 als Update installiert
und den Weckruf ohne Mikrofontaste und ohne erneuten Sicherheitstest mit
„Hey Pam“ ausgelöst. Die App erkannte den Weckruf, gab Pams Stimme frei und
startete Sol. Pam wiederholte den echten Weckruf anschließend ein zweites Mal
erfolgreich. Damit ist die komplette technische Kette auf dem echten Gerät
wiederholt bestätigt.

Sols anschließende mündliche Aussage, der offizielle Weckruf sei „Hey Sol“
und Pam solle beide Varianten versuchen, war inhaltlich falsch und änderte
nichts am bestandenen technischen Test. Die serverseitige Gesprächsregel wird
deshalb ausdrücklich an den einzigen persönlichen Weckruf „Hey Pam“ gebunden.
