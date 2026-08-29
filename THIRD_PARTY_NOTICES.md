# Sol Holo – Third-Party Technologies and Notices

**Stand:** 29.08.2026

Diese Datei dokumentiert externe Technologien, Bibliotheken, Modelle, APIs und Plattformen, die im Sol-Holo-Projekt verwendet werden oder im dokumentierten Entwicklungsverlauf verwendet wurden.

Sie dient der transparenten technischen Zuordnung. Sie macht die genannten Anbieter **nicht** zu Mitentwicklern, Partnern, Sponsoren oder Mitinhabern von Sol Holo / SH♾️ oder HSG – Human Second Generation.

Maßgeblich sind immer die Original-Lizenztexte, Nutzungsbedingungen, Markenrichtlinien und Datenschutzbedingungen der jeweiligen Rechteinhaber und Anbieter.

---

## Direkte JavaScript-/Node.js-Abhängigkeiten

Der aktuelle `package-lock.json` weist für die direkten Abhängigkeiten folgenden installierten Stand aus:

| Paket | Installierte Version | Lizenz laut Paketmetadaten |
| --- | ---: | --- |
| `@capacitor/android` | 7.6.8 | MIT |
| `@capacitor/core` | 7.6.8 | MIT |
| `@mediapipe/tasks-vision` | 1.0.1 | Apache-2.0 |
| `cors` | 2.8.6 | MIT |
| `express` | 5.2.1 | MIT |
| `googleapis` | 175.0.0 | Apache-2.0 |
| `openai` | 5.23.2 | Apache-2.0 |
| `pg` | 8.23.0 | MIT |

Direkte Entwicklungsabhängigkeiten:

| Paket | Installierte Version | Lizenz laut Paketmetadaten |
| --- | ---: | --- |
| `@capacitor/assets` | 3.0.5 | MIT |
| `@capacitor/cli` | 7.6.8 | MIT |

Die Versionsangaben beziehen sich auf den am 29.08.2026 dokumentierten Lockfile-Stand. Bei einer späteren Aktualisierung sind die dann tatsächlich installierten Versionen und Lizenzen maßgeblich.

---

## Vollständige NPM-Lizenzinventur

Der Build prüft nicht mehr nur die direkten Pakete. `scripts/generate-third-party-licenses.mjs` wertet zusätzlich **jeden installierten Eintrag im aktuellen `package-lock.json`** aus.

Dabei gilt:

- ein Paket ohne deklarierte Lizenz stoppt den Build,
- ein noch nicht geprüfter Lizenzausdruck stoppt den Build,
- bekannte Sonderfälle werden paketbezogen und nicht pauschal freigegeben,
- die vollständige Liste wird als `NPM_LICENSE_INVENTORY.txt` erzeugt und mit dem App-Bundle ausgeliefert.

Im aktuellen Lockfile kommen unter anderem MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, BlueOak-1.0.0 und Unlicense vor. Es wurden keine GPL-, LGPL- oder MPL-Lizenzausdrücke im aktuellen Lockfile gefunden.

Vier nicht eindeutig bezeichnete Lockfile-Einträge wurden zusätzlich anhand ihrer Upstream-Lizenzen geprüft:

- `@trapezedev/gradle-parse` – Lockfile `SEE LICENSE`, Upstream `ionic-team/trapeze`: MIT, Copyright 2015-present Drifty Co.
- `@trapezedev/project` – Lockfile `SEE LICENSE`, Upstream `ionic-team/trapeze`: MIT, Copyright 2015-present Drifty Co.
- `expand-template` – Lockfile `(MIT OR WTFPL)`; für Sol Holo wird die MIT-Option zugrunde gelegt, Copyright (c) 2018 Lars-Magnus Skog.
- `url-template` – Lockfile `BSD`; die veröffentlichte Lizenz ist BSD-3-Clause, Copyright (c) 2012-2014 Bram Stein.

Neue oder geänderte Lockfile-Lizenzen müssen den automatischen Prüfmechanismus erneut bestehen.

---

## Lizenztexte im Build und in der Android-App

Der Build erzeugt automatisch:

- `THIRD_PARTY_LICENSES.txt` – zusammengefasste Drittanbieter-Hinweise und direkte Lizenztexte,
- `NPM_LICENSE_INVENTORY.txt` – vollständige NPM-Lizenzinventur,
- `ANDROID_RUNTIME_LICENSES.txt` – geprüfte native Android-Laufzeitlizenzen,
- `ANDROID_RUNTIME_DEPENDENCIES.txt` – aufgelöste Android-Release-Laufzeitabhängigkeiten.

Die Dateien werden zusätzlich unter `www/` beziehungsweise im Android-Asset-Verzeichnis abgelegt. Der GitHub-Actions-Build prüft nach dem APK-Bau nochmals, dass die vorgesehenen Lizenz- und Inventardateien tatsächlich im fertigen APK vorhanden sind.

Diese Sol-Holo-eigenen Sammeldateien ändern keine Drittanbieter-Lizenz. Sie dienen ausschließlich dazu, die jeweiligen Hinweise zusammen mit der ausgelieferten Software bereitzustellen.

---

## HeadAudio

Die im Browser-Lip-Sync verwendeten Dateien

- `www/headaudio.min.mjs`,
- `www/headworklet.min.mjs` und
- das als Base64 gespeicherte Modell `www/model-en-mixed.b64`

stammen aus dem Projekt **HeadAudio** von Mika Suominen und stehen unter der **MIT-Lizenz**.

Der aktuelle Build vergleicht diese drei ausgelieferten Dateien mit einem fest dokumentierten Upstream-Stand des Repositories `met4citizen/HeadAudio`. Das Base64-Modell muss nach dem Dekodieren exakt dem geprüften Upstream-Binärmodell entsprechen. Eine unbekannte Abweichung stoppt den Build und erfordert eine neue Prüfung.

Der vollständige MIT-Lizenztext wird als `www/third-party/HeadAudio-LICENSE.txt` mit der App ausgeliefert.

Ältere oder experimentell bearbeitete Kopien unter `dist/` oder `modules/` bleiben, soweit sie von HeadAudio abgeleitet sind, ebenfalls den dort anwendbaren HeadAudio-Rechten und der MIT-Lizenz unterworfen. Die Sol-Holo-eigene Lizenz überschreibt diese Rechte nicht.

---

## MediaPipe Tasks Vision und Face Landmarker

Sol Holo verwendet `@mediapipe/tasks-vision` 1.0.1. Die Paketmetadaten weisen hierfür **Apache License 2.0** aus.

Der Build kopiert für die lokale Gesichtsanimation bestimmte MediaPipe-Browserdateien nach `www/mediapipe/`. Die kopierte Datei `vision_bundle.mjs` wird anschließend gezielt verändert: Die im Original enthaltene Telemetrie-/Logging-Adresse

`https://odml.pa.googleapis.com/v1/log`

wird im lokalen Sol-Holo-Build durch eine lokale `data:`-Adresse ersetzt, damit diese kopierte Browserdatei die entsprechende Telemetrieanfrage nicht sendet.

Diese Änderung wird zweifach kenntlich gemacht:

1. durch einen ausdrücklichen Änderungsvermerk direkt am Anfang der erzeugten `www/mediapipe/vision_bundle.mjs`, und
2. durch `www/mediapipe/MODIFICATION_NOTICE.txt`.

Der Apache-2.0-Lizenztext wird mit dem App-Bundle bereitgestellt.

### Face-Landmarker-Modell

Der Build lädt das von Google bereitgestellte Face-Landmarker-Modellbundle von:

`https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task`

Für den verwendeten Stand ist im Build die SHA-256-Prüfsumme

`64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`

fest hinterlegt. Eine Datei mit einer anderen Prüfsumme wird nicht übernommen.

Das heruntergeladene Modellbundle wird durch das Sol-Holo-Installationsskript **nicht binär verändert**. Die veröffentlichten Model Cards für BlazeFace, FaceMesh-V2 und das Blendshape-Modell weisen diese Modellkomponenten als unter der **Apache License, Version 2.0** lizenziert aus.

---

## Native Android-/Capacitor-Laufzeit

Das Android-Projekt wird für jeden Build neu durch Capacitor erzeugt. Deshalb werden native Laufzeitabhängigkeiten nicht nur statisch angenommen, sondern der tatsächlich aufgelöste Gradle-`releaseRuntimeClasspath` wird beim Build inventarisiert.

`scripts/audit-android-runtime-licenses.mjs` ordnet die derzeit erwarteten AndroidX-/Android-Laufzeitbibliotheken ihren geprüften Lizenzen zu. Capacitor Android wird unter seiner MIT-Lizenz dokumentiert; die derzeit verwendeten AndroidX- und vergleichbaren Android-Laufzeitkomponenten werden, soweit vom jeweiligen Projekt so veröffentlicht, unter Apache-2.0 dokumentiert.

Taucht im tatsächlichen Release-Laufzeitgraph eine noch nicht zugeordnete Bibliothek auf, stoppt der Build. Dadurch kann eine neue native Abhängigkeit nicht unbemerkt als bereits lizenzrechtlich geprüft behandelt werden.

---

## Verwendete bzw. dokumentierte Dienste und Plattformen

### OpenAI

Verwendung unter anderem für OpenAI API, Realtime-/Sprachfunktionen und KI-gestützte Entwicklungsunterstützung über ChatGPT/Codex. OpenAI, ChatGPT, GPT, Codex und weitere zugehörige Bezeichnungen sind Marken bzw. Produktnamen ihrer jeweiligen Rechteinhaber. Die Nutzung begründet keine offizielle Partnerschaft, Unterstützung oder Mitentwicklung durch OpenAI.

### Google

Verwendung unter anderem für Google Calendar API, OAuth-/Autorisierungsfunktionen sowie MediaPipe / Face Landmarker. Google und Google Calendar sind Marken bzw. Produktnamen ihrer jeweiligen Rechteinhaber. Die Nutzung begründet keine Partnerschaft, Unterstützung oder Zertifizierung durch Google.

### Android / Health Connect

Verwendung für Android-App-Funktionen und – soweit im jeweiligen Entwicklungsstand integriert – Health-Connect-Schnittstellen. Android und Health Connect unterliegen den jeweils geltenden Bedingungen und Vorgaben ihrer Rechteinhaber bzw. Anbieter.

### Samsung

Samsung-Geräte wurden für Entwicklung und praktische Tests verwendet. Die Nennung dient ausschließlich der sachlichen Beschreibung eines Testgeräts oder einer technischen Schnittstelle. Es besteht dadurch keine Partnerschaft, Unterstützung oder Zertifizierung durch Samsung.

### GitHub / Render / Node.js / Express / PostgreSQL / Capacitor / MediaPipe

Diese Dienste, Frameworks, Laufzeitumgebungen, Bibliotheken und Entwicklungswerkzeuge sind externe Technologien. Ihre Rechte verbleiben bei den jeweiligen Rechteinhabern; ihre Nutzung richtet sich nach den jeweils einschlägigen Lizenzen und Bedingungen.

---

## Lizenzhinweis

Die Sol-Holo-eigene Lizenz in `LICENSE` gilt ausschließlich für Bestandteile, an denen Pamela Nitschke entsprechende Rechte besitzt oder rechtlich darüber verfügen darf.

Sie ersetzt, beschränkt oder überschreibt **keine** anwendbare Drittanbieter- oder Open-Source-Lizenz.

Erforderliche Copyright-, Lizenz-, NOTICE- und Attributionshinweise Dritter müssen erhalten bleiben. Neue Bibliotheken, Modelle, fremde Assets oder native Komponenten müssen vor einer Distribution erneut in die Prüfung aufgenommen werden.

---

## Markenhinweis

Alle genannten Marken, Produktnamen, Dienste und Logos gehören ihren jeweiligen Rechteinhabern.

Ihre Nennung im Sol-Holo-Repository dient ausschließlich der Beschreibung tatsächlich verwendeter, getesteter oder dokumentierter Technik.

Weitere allgemeine Abgrenzungen enthält `RECHTLICHER_HINWEIS.md`.
