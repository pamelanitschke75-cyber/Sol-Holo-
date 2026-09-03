# Build 124 – persönlicher Weckname „Hey Pam“

Stand: 03.09.2026

## Ziel

Pams persönliche Holo-Instanz hört nicht mehr auf den universellen Namen
„Hey Sol“, sondern ausschließlich auf ihren owner-gebundenen Weckruf
„Hey Pam“. Sol bleibt der Name der Assistentin und wird nicht umbenannt.

## Sicherheitskette

Ein Weckvorgang wird nur ausgeführt, wenn beide Bedingungen erfüllt sind:

1. Das lokale Keyword-Modell erkennt exakt eine enge Lautvariante von
   „Hey Pam“.
2. Die vorhandenen lokalen Sprecherprofile CAMPPlus und ERes2Net geben die
   Aufnahme als Besitzerstimme von `pam-sol` frei.

„Hey Sol“, andere Namen und Sätze mit zusätzlichen Wörtern werden vom
Weckruf-Matcher abgelehnt.

## Bestehendes Stimmprofil

Die drei gespeicherten Stimmproben und Profilversion 3 bleiben unverändert.
Eine Neueinrichtung ist nicht erforderlich. Beim ersten vom vorhandenen
3/3-Profil freigegebenen „Hey Pam“ wird nur die kurze Weckrufvorlage lokal
auf die neue Phrase umgestellt. Rohaufnahmen werden weiterhin nicht
gespeichert.

## Technische Absicherung

- Owner-ID: `pam-sol`
- persönlicher Weckname: `Pam`
- kanonischer Weckruf: `Hey Pam`
- alter Weckruf nicht im ausgelieferten Keyword-Graphen
- neuer WebView- und Service-Worker-Versionsstand gegen Alt-Cache
- Paket-ID und Updatepfad bleiben unverändert

## Prüfstatus

- 96/96 Node-App-Tests: bestanden
- lokaler Modellhash und benötigte P-A-M-Phoneme: bestätigt
- Java- und Android-Release-Build: durch GitHub Actions zu bestätigen
- originalsignierte APK: nach grünem Build zu erzeugen und zu prüfen
- Galaxy-S23-Praxistest: offen; nur Pams echter Test kann ihn abschließen
