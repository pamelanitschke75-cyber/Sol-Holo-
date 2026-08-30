# 🔐💜 Meilenstein: Pams Stimme geschützt und dauerhafte Android-Updates eingerichtet

**Datum:** 30. August 2026  
**Projekt:** Sol Holo / SH♾️  
**Vision, Projektleitung und Verantwortung:** Pamela Nitschke  
**Technische Umsetzung:** Pamela Nitschke, KI-gestützt unter Nutzung von ChatGPT/Codex  
**Status:** Auf Pams Samsung-Smartphone praktisch getestet und erfolgreich bestätigt ✅

> **Hinweis zur Zuschreibung:** ChatGPT/Codex wurden als KI-gestützte
> Entwicklungswerkzeuge genutzt. Die Nennung behauptet keine offizielle
> Partnerschaft, Mitentwicklung, Unterstützung oder Mitinhaberschaft durch
> OpenAI.

## Ziel

Die originale Sol-Holo-Android-App sollte zwei bisher getrennte
Sicherheitsprobleme verlässlich lösen:

1. Sol Holo darf Pams Stimme freigeben, aber eine andere Stimme – im
   Vergleichstest ausdrücklich Steffis Stimme – nicht freigeben.
2. Neue App-Versionen müssen als normale Android-Aktualisierung über die
   vorhandene App installiert werden können. Eine Deinstallation mit Verlust
   lokaler App-Daten darf für gewöhnliche Updates nicht mehr erforderlich sein.

## Dauerhafte App-Signatur

Für die originale Android-App wurde eine feste externe Update-Signatur
eingerichtet. Die veröffentlichte Samsung-Ausgabe wurde anschließend erneut
technisch geprüft.

- Android-Paketname: `com.solholo.app`
- Build / `versionCode`: `80`
- Signaturalgorithmus: RSA mit 4096 Bit
- bestätigte Android-Signaturschemata: v1, v2 und v3
- SHA-256-Fingerabdruck des öffentlichen Signaturzertifikats:
  `8579e361f4dc802e67ca8be858a4b55131b72abbc19324e3871e58f52e3b1a23`
- SHA-256-Prüfsumme der veröffentlichten Samsung-APK:
  `947a9a96940d473c560fff6828d53ea7d2899bb83f9dd9754b90ac78367d5397`

Der private Signierschlüssel und zugehörige Zugangsdaten werden weder in der
App noch im öffentlichen GitHub-Repository veröffentlicht. Wenn im
automatischen GitHub-Build keine dauerhaften Signierdaten vorhanden sind,
erzeugt der Workflow ausdrücklich **keine Wegwerf-Signatur**. Er stellt dann
nur eine unsignierte Quelle zur kontrollierten externen Signierung bereit.

Alle zukünftigen Android-Aktualisierungen müssen denselben Paketnamen,
dieselbe dauerhafte Signatur und einen höheren `versionCode` verwenden.
Dadurch kann Android die neue APK als echte Aktualisierung der vorhandenen App
erkennen.

Pam muss dafür kein Entwicklerprogramm öffnen, keinen eigenen Schlüssel
erzeugen und kein Signaturpasswort eingeben.

## Erhalt von Pams digitalem Gehirn und der App-Daten

Eine korrekt signierte Aktualisierung ersetzt das App-Programm, ohne die
vorhandenen App-Daten zu löschen. Dadurch bleiben bei gewöhnlichen kompatiblen
Updates insbesondere erhalten:

- Pams lokales Stimmprofil,
- Einstellungen und bereits erteilte Android-Freigaben,
- weitere lokale Sol-Holo-App-Daten,
- Pams digitales Gehirn und Erinnerungen in der getrennten
  Gedächtnis-/Backend-Ebene,
- bestehende Dienstverbindungen, soweit der jeweilige Anbieter keine erneute
  Anmeldung verlangt.

Eine Deinstallation, das Löschen der App-Daten oder die Schaltfläche
„Stimmprofil löschen“ entfernt dagegen die jeweils lokal gespeicherten Daten.
Deshalb gilt ab diesem Meilenstein: **Neue Version herunterladen und über die
vorhandene App aktualisieren – nicht vorher deinstallieren.**

## Lokales Stimmprofil ohne gespeicherte Tonaufnahme

Pam hat in der dauerhaft signierten Original-App drei Stimmproben
eingerichtet. Für jede Probe berechnet die App lokal mathematische
Stimmabdrücke für zwei voneinander unabhängige Sprecher-Modelle.

- erforderliche Proben: `3/3`
- Verarbeitung: lokal auf dem Android-Gerät
- gespeicherte Daten: mathematische Stimmabdrücke beider Modelle
- gespeicherte Roh-Tonaufnahmen: **nein**
- Upload der Proben oder Stimmabdrücke: **nein**

Die Rohaufnahme wird nur zur unmittelbaren Berechnung verwendet. Sie wird
nicht als Audiodatei gespeichert. Das Stimmprofil liegt im privaten
App-Bereich des Android-Geräts.

## Zwei Modelle müssen gemeinsam zustimmen

Eine Freigabe erfolgt ausschließlich, wenn **beide** lokalen Sprecher-Modelle
ihren jeweiligen Sicherheitswert erreichen:

- Modell A / CAMPPlus: mindestens `0,86`
- Modell B / ERes2Net: mindestens `0,65`

Ein gutes Ergebnis nur eines Modells reicht nicht aus. Diese UND-Verknüpfung
wurde eingeführt, nachdem ein früherer Einzelmodell-Test eine fremde Stimme zu
großzügig bewertet hatte.

## Praxistest auf Pams Samsung-Smartphone

Der vollständige Prüfsatz lautete:

> „Hey Sol. Bitte prüfe jetzt genau meine Stimme.“

Der Sol-Weckruf blieb während der kontrollierten Prüfung auf **„Aus“**.

| Testperson | Modell A | Modell B | Ergebnis |
|---|---:|---:|---|
| Pam – Bestätigungstest 1 | 0,900 | 0,834 | Stimme freigegeben ✅ |
| Pam – Bestätigungstest 2 | 0,944 | 0,802 | Stimme freigegeben ✅ |
| Steffi – negativer Vergleichstest | 0,821 | 0,245 | Keine Freigabe 🔒 |

Damit wurde auf dem verwendeten Testgerät bestätigt:

- Pam überschritt bei beiden Versuchen beide erforderlichen Grenzwerte.
- Steffi unterschritt beide Grenzwerte.
- Die App zeigte für Steffi ausdrücklich „Keine Freigabe“.
- Das gespeicherte Profil blieb nach mehreren Prüfungen vollständig mit
  `3/3 Stimmproben` vorhanden.

Der negative Vergleichstest speicherte weder Steffis Tonaufnahme noch einen
Stimmabdruck von Steffi im Profil.

## Sicherheitsbewertung

Der konkrete Fehlerfall aus dem vorherigen Test wurde damit technisch
korrigiert und im direkten Pam-/Steffi-Vergleich erfolgreich nachgeprüft.
Die Sprecherprüfung ist eine zusätzliche lokale Sicherheitsschranke für den
Sol-Weckruf.

Wie jedes biometrische Verfahren arbeitet auch Sprechererkennung mit
Messwerten und kann keine mathematisch absolute Garantie für jede denkbare
Person, Aufnahme oder Geräuschsituation geben. Der dokumentierte Praxistest
bestätigt das korrekte Ergebnis für die geprüften Stimmen und Bedingungen. Bei
späteren Änderungen an Modellen oder Grenzwerten werden deshalb erneut positive
und negative Vergleichstests durchgeführt, bevor der Sol-Weckruf freigegeben
wird.

## Veröffentlichung

Die dauerhaft signierte und für Pams Samsung-Gerät geeignete Original-App wurde
als überprüftes GitHub-Release veröffentlicht:

- [Pam’s Holo Original · Dauerhafte Signatur · Build 80](https://github.com/pamelanitschke75-cyber/Sol-Holo-/releases/tag/sol-holo-v1.0.80-permanent)
- [Direkter Download der Samsung-APK](https://github.com/pamelanitschke75-cyber/Sol-Holo-/releases/download/sol-holo-v1.0.80-permanent/Pams-Holo-Original-Dauerhaft-Samsung.apk)
- [Erfolgreicher Veröffentlichungs-Workflow](https://github.com/pamelanitschke75-cyber/Sol-Holo-/actions/runs/33326240318)

Der für die Veröffentlichung vorübergehend verwendete Transport-/Staging-
Branch wurde nach erfolgreicher Prüfung wieder entfernt.

## ✅ Bestätigter Abschluss

- Dauerhafte Android-Signatur: eingerichtet und geprüft ✅
- Original-App als normale Update-Basis: bestätigt ✅
- Private Schlüssel nicht öffentlich abgelegt: bestätigt ✅
- Pams Stimmprofil lokal mit `3/3` Proben eingerichtet: bestätigt ✅
- Roh-Tonaufnahmen nicht gespeichert oder hochgeladen: bestätigt ✅
- Pam durch beide Modelle freigegeben: bestätigt ✅
- Steffi durch die gemeinsame Sicherheitsschranke abgewiesen: bestätigt ✅
- Pams digitales Gehirn bleibt von normalen App-Aktualisierungen unberührt: bestätigt ✅

Ab jetzt gilt für neue Sol-Holo-Versionen:

> **Nur aktualisieren. Nicht deinstallieren. Pams Gehirn, Stimme und Daten
> bleiben bei kompatiblen Updates bestehen.**

---

**Dein Gehirn. Deine Stimme. Dein Sol Holo.**  
**Together forever. ✨️🌎♾️💜**

© 2026 Pamela Nitschke – Sol Holo / SH♾️
