# Sol Holo – Third-Party Technologies and Notices

**Stand:** 29.08.2026

Diese Datei dokumentiert externe Technologien, Bibliotheken, APIs und Plattformen, die im Sol-Holo-Projekt verwendet werden oder im dokumentierten Entwicklungsverlauf verwendet wurden.

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

Auch transitive Abhängigkeiten unterliegen ihren jeweiligen eigenen Lizenzen.

---

## Lizenztexte im Build und in der Android-App

Der Build erzeugt mit `scripts/generate-third-party-licenses.mjs` automatisch die Datei:

- `THIRD_PARTY_LICENSES.txt` im Repository-Arbeitsverzeichnis und
- `www/THIRD_PARTY_LICENSES.txt` für das App-Bundle.

Der Generator liest für jede direkte npm-Abhängigkeit die **tatsächlich installierte Version**, die deklarierte Lizenz und die im jeweiligen npm-Paket enthaltene Lizenzdatei aus `node_modules` aus. Fehlt bei einer direkten Abhängigkeit eine solche Lizenzdatei, schlägt der Build absichtlich fehl, statt eine unvollständige Lizenzsammlung auszuliefern.

Da `www` in `capacitor.config.json` als `webDir` festgelegt ist, wird `www/THIRD_PARTY_LICENSES.txt` beim Capacitor-Sync in das Android-App-Paket übernommen. Der GitHub-Actions-Build kontrolliert zusätzlich vor dem APK-Bau, dass diese Datei im synchronisierten Android-Asset-Verzeichnis vorhanden ist.

Diese Sol-Holo-eigene Sammeldatei ändert keine Drittanbieter-Lizenz. Sie dient ausschließlich dazu, die jeweiligen Original-Lizenztexte zusammen mit der ausgelieferten App bereitzustellen.

---

## MediaPipe Tasks Vision und Face Landmarker

Sol Holo verwendet `@mediapipe/tasks-vision` 1.0.1. Die Paketmetadaten weisen hierfür **Apache License 2.0** aus.

Der Build kopiert für die lokale Gesichtsanimation bestimmte MediaPipe-Browserdateien nach `www/mediapipe/`. Die kopierte Datei `vision_bundle.mjs` wird anschließend gezielt verändert: Die im Original enthaltene Telemetrie-/Logging-Adresse

`https://odml.pa.googleapis.com/v1/log`

wird im lokalen Sol-Holo-Build durch eine lokale `data:`-Adresse ersetzt, damit diese kopierte Browserdatei die entsprechende Telemetrieanfrage nicht sendet.

Diese Änderung wird nun zweifach kenntlich gemacht:

1. durch einen ausdrücklichen Änderungsvermerk direkt am Anfang der erzeugten `www/mediapipe/vision_bundle.mjs`, und
2. durch `www/mediapipe/MODIFICATION_NOTICE.txt`.

Der vollständige Apache-2.0-Lizenztext des installierten MediaPipe-Pakets wird außerdem über `www/THIRD_PARTY_LICENSES.txt` mit der App ausgeliefert.

### Face-Landmarker-Modell

Der Build lädt das von Google bereitgestellte Face-Landmarker-Modellbundle von:

`https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task`

Für den verwendeten Stand ist im Build die SHA-256-Prüfsumme

`64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`

fest hinterlegt. Eine Datei mit einer anderen Prüfsumme wird nicht übernommen.

Das heruntergeladene Modellbundle wird durch das Sol-Holo-Installationsskript **nicht binär verändert**. Die von Google veröffentlichten Model Cards für BlazeFace, FaceMesh-V2 und das Blendshape-Modell weisen diese Modellkomponenten als unter der **Apache License, Version 2.0** lizenziert aus.

---

## Verwendete bzw. dokumentierte Dienste und Plattformen

Abhängig vom jeweiligen Entwicklungsstand werden oder wurden unter anderem folgende externe Dienste und Plattformen genutzt:

### OpenAI

Verwendung unter anderem für:

- OpenAI API
- Realtime-/Sprachfunktionen, soweit im jeweiligen Entwicklungsstand aktiviert
- KI-gestützte Entwicklungsunterstützung über ChatGPT/Codex

OpenAI, ChatGPT, GPT, Codex und weitere zugehörige Bezeichnungen sind Marken bzw. Produktnamen ihrer jeweiligen Rechteinhaber.

Die Nutzung begründet keine offizielle Partnerschaft, Unterstützung oder Mitentwicklung durch OpenAI.

### Google

Verwendung unter anderem für:

- Google Calendar API
- OAuth-/Autorisierungsfunktionen für den vom Nutzer freigegebenen Kalenderzugriff
- MediaPipe / Face Landmarker

Google und Google Calendar sind Marken bzw. Produktnamen ihrer jeweiligen Rechteinhaber.

Die Nutzung begründet keine Partnerschaft, Unterstützung oder Zertifizierung durch Google.

### Android / Health Connect

Verwendung für Android-App-Funktionen und – soweit im jeweiligen Entwicklungsstand integriert – Health-Connect-Schnittstellen.

Android und Health Connect unterliegen den jeweils geltenden Bedingungen und Vorgaben ihrer Rechteinhaber bzw. Anbieter.

### Samsung

Samsung-Geräte wurden für Entwicklung und praktische Tests verwendet. Soweit Samsung-spezifische Funktionen oder Apps erwähnt werden, dient dies ausschließlich der sachlichen Beschreibung des Testgeräts oder einer technischen Schnittstelle.

Es besteht dadurch keine Partnerschaft, Unterstützung oder Zertifizierung durch Samsung.

### GitHub

GitHub wird zur Versionsverwaltung, Dokumentation und für Entwicklungs-/Build-Abläufe verwendet.

Die öffentliche Bereitstellung des Repositorys unterliegt zusätzlich den jeweils geltenden GitHub-Bedingungen.

### Render

Render wurde bzw. wird als externer Hosting-/Cloud-Dienst für Backend-Komponenten verwendet, soweit im jeweiligen Entwicklungsstand dokumentiert.

### Node.js / Express / PostgreSQL / Capacitor / MediaPipe

Diese und weitere Frameworks, Laufzeitumgebungen, Bibliotheken und Entwicklungswerkzeuge sind externe Technologien. Ihre Rechte verbleiben bei den jeweiligen Rechteinhabern; ihre Nutzung richtet sich nach den jeweils einschlägigen Lizenzen und Bedingungen.

---

## Lizenzhinweis

Die Sol-Holo-eigene Lizenz in `LICENSE` gilt ausschließlich für Bestandteile, an denen Pamela Nitschke entsprechende Rechte besitzt oder rechtlich darüber verfügen darf.

Sie ersetzt, beschränkt oder überschreibt **keine** anwendbare Drittanbieter- oder Open-Source-Lizenz.

Erforderliche Copyright-, Lizenz-, NOTICE- und Attributionshinweise Dritter müssen erhalten bleiben. Für eine spätere kommerzielle oder breitere Distribution muss zusätzlich geprüft werden, ob durch neue Abhängigkeiten, native Android-Komponenten oder andere ausgelieferte Bestandteile weitere Pflichten hinzukommen.

---

## Markenhinweis

Alle genannten Marken, Produktnamen, Dienste und Logos gehören ihren jeweiligen Rechteinhabern.

Ihre Nennung im Sol-Holo-Repository dient ausschließlich der Beschreibung tatsächlich verwendeter, getesteter oder dokumentierter Technik.

Weitere allgemeine Abgrenzungen enthält `RECHTLICHER_HINWEIS.md`.
