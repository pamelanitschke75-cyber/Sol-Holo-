# SOL HOLO – Quellen und verwendete Fremdtechnik

Stand: 30.08.2026

Diese Datei dokumentiert externe technische Grundlagen, Bibliotheken, Modelle und Vergleichsquellen, die bei Sol Holo verwendet oder zur technischen Einordnung herangezogen werden. Eine Nennung bedeutet **keine Partnerschaft, Mitentwicklung, Unterstützung oder Billigung** durch die genannten Unternehmen oder Projekte.

## Android

**Android / Android SDK**  
Zweck: Betriebssystem-Schnittstellen für Mikrofon, lokale Spracherkennung, App-Berechtigungen und Foreground Services.  
Quelle: Android Developers – https://developer.android.com/  
Hinweis: Google/Android ist technische Plattform; keine Partnerschaft mit Sol Holo wird behauptet.

## Lokale Sprechererkennung für „Hey Sol“

### sherpa-onnx

**Projekt:** k2-fsa/sherpa-onnx  
**Version für den Test-Build:** 1.13.4  
**Zweck:** Lokale Berechnung von Sprecher-Embeddings direkt auf dem Android-Gerät.  
**Quelle:** https://github.com/k2-fsa/sherpa-onnx  
**Release:** https://github.com/k2-fsa/sherpa-onnx/releases/tag/v1.13.4  
**Lizenz:** Apache License 2.0  
**AAR SHA-256:** `03f9c4df965f21c71269365a7951a7f23b5696fddd093fa318c80d65550ab780`

Sol Holo verwendet die Bibliothek als Fremdkomponente. Die Sol-Holo-Logik für Einrichtung, lokalen Speicher, Testablauf, Freigaberegeln und die Verbindung mit „Hey Sol“ ist davon getrennte Sol-Holo-Implementierung.

### 3D-Speaker / CAMPPlus Sprecher-Modell

**Modell:** `3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx`  
**Zweck:** Erzeugung eines numerischen Sprecherprofils aus 16-kHz-Sprachsignal.  
**Quelle des für sherpa-onnx bereitgestellten Modells:** https://github.com/k2-fsa/sherpa-onnx/releases/tag/speaker-recongition-models  
**Ursprungsprojekt:** https://github.com/modelscope/3D-Speaker  
**Lizenzbasis des Ursprungsprojekts:** Apache License 2.0

Der konkrete SHA-256-Wert des im jeweiligen Android-Build geladenen Modells wird zusätzlich automatisch in `SPEAKER_IDENTITY_SOURCES.txt` innerhalb des APK dokumentiert.

## Vergleich zum bekannten Voice-Match-Prinzip

Google Voice Match wurde ausschließlich als allgemein bekanntes **Funktionsbeispiel** herangezogen: Eine Stimme wird eingerichtet und spätere Spracheingaben werden mit einem Stimmprofil verglichen. Sol Holo verwendet dafür **keinen Google-Voice-Match-Code und keine Google-Voice-Match-Schnittstelle**.

Quelle zur Einordnung: Google-Hilfe zu Voice Match / Google Assistant.  
Google, Google Assistant und Voice Match sind Marken bzw. Dienste ihrer jeweiligen Rechteinhaber. Es besteht keine behauptete Partnerschaft oder Billigung.

## Datenschutzprinzip der Sol-Holo-Sprechererkennung

Die Testimplementierung verarbeitet die kurzzeitige Mikrofonaufnahme lokal auf dem Android-Gerät. Die Rohaufnahme wird nicht als Audiodatei gespeichert und nicht an GitHub oder einen Sol-Holo-Server übertragen. Gespeichert werden ausschließlich daraus abgeleitete numerische Sprecher-Embeddings im privaten App-Speicher. Android-Backup ist für Sol Holo deaktiviert.

Die Sprechererkennung ist zunächst nur **Testfunktion**. Sie wird erst nach erfolgreichem Test mit autorisierter und nicht autorisierter Stimme als Freigabeschranke vor dem Weckruf aktiviert.

## Lizenzhinweis

Die Apache License 2.0 der genannten Open-Source-Komponenten bleibt vollständig zu beachten. Bestehende Copyright-, Lizenz-, Patent- und Attributionshinweise werden nicht als Eigentum von Sol Holo dargestellt.
