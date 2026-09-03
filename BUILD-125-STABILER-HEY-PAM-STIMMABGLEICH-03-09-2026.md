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
- Galaxy-S23-Praxistest: offen; nur Pams echter Test kann ihn abschließen
