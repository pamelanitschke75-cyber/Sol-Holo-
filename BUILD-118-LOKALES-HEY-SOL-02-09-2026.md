# Build #118 – „Hey Sol“ direkt im lokalen Audiostrom

**Datum:** 02.09.2026  
**Owner:** Pamela Christina Nitschke  
**Gerät:** Samsung Galaxy S23  
**Paket:** `com.solholo.app`

## Bestätigtes Verhalten von Build #117

- App geöffnet und Display entsperrt.
- Stimmprofil weiterhin 3/3 und Weckruf-Schutz aktiv.
- Anzeige „App hört zu“.
- „Hey Sol“ löst trotzdem keine sichtbare Reaktion aus.

## Ursache

Build #117 nahm den Weckruf zuerst selbst als PCM auf und reichte die fertige
Aufnahme anschließend über `RecognizerIntent.EXTRA_AUDIO_SOURCE` an Androids
Spracherkenner. Diese Audioquelle ist optional. Unterstützt der auf einem Gerät
aktive Erkenner die Übergabe nicht, öffnet er stattdessen sein eigenes Mikrofon.
Auf dem S23 geschah das erst nach dem gesprochenen Weckruf; die Anzeige konnte
daher „App hört zu“ melden, obwohl der Satz den Erkenner nicht erreichte.

## Reparatur

- Eine kleine sherpa-onnx-Keyword-Erkennung verarbeitet „Hey Sol“ fortlaufend
  und vollständig lokal direkt im `AudioRecord`-Strom.
- Genau dieselben PCM-Samples liegen in einem begrenzten Arbeitsspeicher-Ring
  für die anschließende Besitzerprüfung.
- Nur die definierten Lautfolgen für „Hey Sol“ bzw. „Hey Sohl“ können den
  nächsten Schritt auslösen. „Hallo Sol“ und „Hello Sol“ sind nicht hinterlegt.
- Nach der Phrasenerkennung bleiben CAMPPlus **und** ERes2Net zwingend. Erst
  wenn beide Pams gespeicherte Kurzsatz-Signatur bestätigen, öffnet sich Sol.
- Es gibt keine Cloud-Spracherkennung und keine zweite Mikrofonübergabe mehr.

## Unverändert

- Bestehendes Profilformat Version 3, 3/3 Stimmproben und Kurzsatz-Signatur.
- Schwellenwerte beider Sprecher-Modelle.
- Paketname, App-Daten, Pam-/Steffi-Trennung und Update-Signatur.
- Keine Rohaufnahme wird gespeichert oder gesichert.

## Automatische Absicherung

- Regressionstest: derselbe PCM-Puffer erreicht lokale Keyword-Erkennung und
  beide Sprecherprüfungen.
- Regressionstest: kein `SpeechRecognizer`, kein `RecognizerIntent` und keine
  `ParcelFileDescriptor`-Audioübergabe im Weckdienst.
- Ringspeicher-Tests für Überlauf, absolute Keyword-Position und Begrenzung.
- Modellarchiv wird vor dem Einbau gegen SHA-256
  `68447f4fbc67e70eee3a93961f36e81e98f47aef73ce7e7ca00885c6cd3616a6`
  geprüft.

## Praxisstatus

Der S23-Praxistest wird erst nach erfolgreichem CI-Build und Installation des
originalsignierten Updates als bestanden markiert.
