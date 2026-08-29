# Sol Holo – Third-Party Technologies and Notices

**Stand:** 29.08.2026

Diese Datei dokumentiert externe Technologien, Bibliotheken, APIs und Plattformen, die im Sol-Holo-Projekt verwendet werden oder im dokumentierten Entwicklungsverlauf verwendet wurden.

Sie dient der transparenten technischen Zuordnung. Sie macht die genannten Anbieter **nicht** zu Mitentwicklern, Partnern, Sponsoren oder Mitinhabern von Sol Holo / SH♾️ oder HSG – Human Second Generation.

Maßgeblich sind immer die Original-Lizenztexte, Nutzungsbedingungen, Markenrichtlinien und Datenschutzbedingungen der jeweiligen Rechteinhaber und Anbieter.

---

## Direkte JavaScript-/Node.js-Abhängigkeiten

Laut aktuellem `package.json` werden direkt eingebunden:

- `@capacitor/android`
- `@capacitor/core`
- `@mediapipe/tasks-vision`
- `cors`
- `express`
- `googleapis`
- `openai`
- `pg`

Entwicklungsabhängigkeiten:

- `@capacitor/assets`
- `@capacitor/cli`

Die konkret installierten Versionen und – soweit vom Paket bereitgestellt – Lizenzkennzeichnungen sind in `package-lock.json` dokumentiert.

Auch deren transitive Abhängigkeiten unterliegen ihren jeweiligen eigenen Lizenzen.

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

Diese Übersicht ist **kein Ersatz für die vollständigen Original-Lizenztexte**.

Bei Distribution, Veröffentlichung oder kommerzieller Nutzung muss geprüft werden, welche Lizenz-, Copyright-, NOTICE- oder Attributionshinweise zusammen mit der jeweiligen ausgelieferten Softwarefassung bereitgestellt werden müssen.

Insbesondere dürfen Hinweise, die von einer Drittanbieter-Lizenz zwingend vorgeschrieben werden, nicht durch die Sol-Holo-eigenen Lizenzbedingungen entfernt oder eingeschränkt werden.

---

## Markenhinweis

Alle genannten Marken, Produktnamen, Dienste und Logos gehören ihren jeweiligen Rechteinhabern.

Ihre Nennung im Sol-Holo-Repository dient ausschließlich der Beschreibung tatsächlich verwendeter, getesteter oder dokumentierter Technik.

Weitere allgemeine Abgrenzungen enthält `RECHTLICHER_HINWEIS.md`.
