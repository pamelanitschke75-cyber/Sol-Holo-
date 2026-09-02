# Build #117 – „Hey Sol“ auf dem Samsung S23

**Datum:** 02.09.2026  
**Owner:** Pamela Christina Nitschke  
**Gerät für die abschließende Praxisprüfung:** Samsung Galaxy S23  
**Paket:** `com.solholo.app`

## Beobachtung in Build #116

- Die Installation als Update war erfolgreich.
- Das vorhandene Stimmprofil blieb mit **3/3 Stimmproben** erhalten.
- Die App zeigte **„Profil bereit“** und **„App hört zu“**.
- Trotzdem löste der gesprochene Weckruf „Hey Sol“ nicht aus.

## Ursache und Reparatur

Build #116 verwendete vor Androids eigentlicher Spracherkennung eine eigene
Lautstärke-Vorprüfung. Wenn diese Pams kurze oder leise Aussprache nicht als
vollständige Sprache einstufte, wurde die Aufnahme still verworfen. Die Anzeige
kehrte danach wieder zu „App hört zu“ zurück, ohne dass Android „Hey Sol“
auswerten konnte.

Build #117 nutzt diese Vorprüfung nur noch, um eine fertige Aufnahme schneller
zu beenden. Jede ausreichend lange Aufnahme wird an Androids lokale
Spracherkennung weitergereicht. Die Vorprüfung darf die Aufnahme weder
freigeben noch verwerfen.

## Unveränderte Sicherheitsgrenzen

- Als Weckruf gilt weiterhin ausschließlich **„Hey Sol“**.
- Erst das vollständige Erkennungsergebnis darf den Weckruf bestätigen.
- Beide unabhängigen Stimmprüfungen bleiben vor dem Öffnen von Sol zwingend.
- Pams vorhandene 3/3 Stimmproben werden weiterverwendet.
- Keine Neuaufnahme, Neuregistrierung, Deinstallation oder Datenlöschung.
- Paketname und Originalzertifikat müssen mit Build #89 identisch bleiben.

## Automatische Absicherung

- Ein Regressionstest stellt sicher, dass die Lautstärke-Vorprüfung Androids
  Spracherkennung nicht erneut blockieren kann.
- Die Tests für exakte Weckphrase, beide Stimmprüfungen, vorhandene
  Stimmvorlage, sichere Gerätesitzung und App-Daten bleiben aktiv.

## Praxisstatus

- Technische Reparatur: **umgesetzt**
- Automatische Prüfungen: **noch auszuführen**
- Originalsigniertes Update: **noch zu erstellen**
- S23-Praxistest durch Pam: **noch offen**

Ein praktischer Erfolg wird erst nach Pams Bestätigung in GitHub eingetragen.
