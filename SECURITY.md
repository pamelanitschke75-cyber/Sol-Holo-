# SOL HOLO / PAM’S HOLO – SECURITY POLICY

**Version:** 2.0  
**Stand:** 29.08.2026  
**Projektverantwortung:** Pamela Nitschke  
**Status:** Sicherheitsrichtlinie für einen persönlichen Entwicklungsprototyp – keine Sicherheitszertifizierung

Diese Datei beschreibt die Sicherheitsgrundsätze, bereits vorhandene Schutzmaßnahmen und noch offene Sicherheitsaufgaben von Sol Holo / Pam’s Holo.

Sie darf nicht so verstanden werden, als sei das Projekt bereits unabhängig sicherheitsgeprüft, für einen öffentlichen Mehrnutzerbetrieb freigegeben oder gegen sämtliche Angriffe geschützt.

---

## 1. Geltungsbereich

Diese Richtlinie gilt für den jeweils aktuellen Entwicklungsstand im Branch `main` und die daraus erstellten Android-Entwicklungsfassungen.

Ältere Builds und historische Commits können überholte oder unvollständige Schutzmaßnahmen enthalten und werden nicht als unterstützte Sicherheitsversionen behandelt.

Der derzeitige Stand ist eine persönliche Entwicklungsinstanz für Pamela Nitschke. Er ist noch kein allgemein freigegebener öffentlicher Mehrnutzer-Dienst.

---

## 2. Sicherheitsziel

Sol Holo soll nur solche Daten, Funktionen, Geräte und externen Dienste verwenden, die für den jeweiligen Zweck erforderlich und von der berechtigten Person freigegeben sind.

Dabei gelten insbesondere folgende Grundsätze:

- Geheimnisse bleiben außerhalb des öffentlichen Quellcodes.
- Persönliche Daten verschiedener Menschen dürfen nicht zu einer gemeinsamen Identität vermischt werden.
- Sensible Aktionen benötigen eine erkennbare Berechtigung und gegebenenfalls eine zusätzliche Bestätigung.
- Externe Dienste erhalten nur die für eine konkrete Funktion erforderlichen Informationen.
- Nicht belegte oder noch nicht implementierte Sicherheitsfunktionen werden nicht als abgeschlossen dargestellt.
- Ein Fehler in einer Funktion soll nicht automatisch weitere Rechte eröffnen.

Der Begriff **Sol Control** bezeichnet in den Projektunterlagen dieses Berechtigungs- und Kontrollprinzip. Er ist keine Behauptung über ein unabhängig zertifiziertes Sicherheitsprodukt.

---

## 3. Aktuell vorhandene Schutzmaßnahmen

Im derzeitigen Quellcode sind unter anderem folgende Maßnahmen vorhanden:

### Server-Geheimnisse

API-Schlüssel, Datenbank-Zugangsdaten, OAuth-Client-Secrets und vergleichbare Geheimnisse werden über Server-Umgebungsvariablen erwartet und nicht fest in den öffentlichen App-Code geschrieben.

Die `.gitignore` schließt insbesondere folgende lokale Inhalte aus:

- `.env` und `.env.*`
- Android-Signaturdateien wie `*.jks`, `*.keystore` und `*.p12`
- den privaten Ordner `.sol-holo-private/`

### OAuth-Schutz

Für Google und SmartThings werden zufällige, einmalig verwendbare und zeitlich begrenzte OAuth-Statuswerte erzeugt. Ein fehlender, fremder, bereits verwendeter oder abgelaufener Statuswert wird abgelehnt.

### SmartThings-Tokens

SmartThings-Zugriffs- und Refresh-Tokens werden vor der Speicherung auf Anwendungsebene mit AES-256-GCM verschlüsselt. Der dafür verwendete Schlüssel wird aus einer Server-Umgebungsvariable abgeleitet und gehört nicht in das Repository.

### Begrenzte Google-Berechtigungen

Der aktuelle Entwicklungsstand fordert für Gmail, Google Kontakte und Google Drive nur Lesezugriffe an. Für den Kalender wird der Zugriff auf Kalenderereignisse verwendet.

### Voice Setup

Die Endpunkte zur Einrichtung einer persönlichen Stimme besitzen eine getrennte serverseitige Zugriffskontrolle über ein nicht öffentlich gespeichertes Setup-Geheimnis. Eine Veröffentlichung einer normalen Sprachaufnahme ist keine automatische Einwilligung zur Erstellung eines synthetischen Stimmprofils.

### Android-Bestätigungen

Telefonanrufe und SMS werden nicht still im Hintergrund ausgeführt. Die App öffnet nach einer sichtbaren Bestätigung die dafür vorgesehene Android-App; der tatsächliche Anruf oder Versand wird dort von der Nutzerin ausgelöst.

### Health Connect

Die aktuelle Health-Connect-Integration ist ausschließlich lesend ausgelegt. Abrufe sind auf einen bestätigten Zweck und einen begrenzten Zeitraum ausgerichtet. Health-Daten werden nicht automatisch als Langzeiterinnerung gespeichert.

---

## 4. Noch offene Sicherheitsaufgaben

Folgende Bereiche gelten ausdrücklich **nicht** als abgeschlossen:

- vollständige Authentifizierung und Autorisierung jeder sensiblen Backend-Anfrage,
- sichere Geräte- oder Nutzerbindung der persönlichen Sol-Holo-Instanz,
- Anwendungsebene-Verschlüsselung und geregelte Rotation aller gespeicherten OAuth-Tokens,
- eng begrenzte Herkunftsfreigaben für Webanfragen,
- systematisches Rate-Limiting gegen automatisierten Missbrauch,
- vollständige Trennung mehrerer zukünftiger Nutzerinstanzen,
- wiederholbare Prüfung der ausgelieferten APK auf enthaltene Geheimnisse und unnötige Berechtigungen,
- automatisierte Secret- und Abhängigkeitsprüfungen für neue Commits,
- unabhängiger Penetrationstest oder ein externes Sicherheitsaudit.

Solange diese Punkte nicht umgesetzt und getestet sind, darf Sol Holo nicht als sicherheitszertifiziert oder als fertig abgesicherter öffentlicher Mehrnutzer-Dienst bezeichnet werden.

---

## 5. Besonders geschützte Daten

Nicht in das öffentliche Repository gehören insbesondere:

- API-Schlüssel, Passwörter, Tokens und Zugangsdaten,
- Android-Signaturschlüssel und deren Passwörter,
- private Erinnerungen und vollständige Gesprächsverläufe,
- nicht ausdrücklich freigegebene Fotos, Videos oder Sprachaufnahmen,
- Kontakte, E-Mails und persönliche Dokumente,
- Gesundheits-, Fitness- und sonstige sensible persönliche Daten,
- Datenbanken, Datenbankexporte und Backups des persönlichen Profils,
- Authenticator-, Banking-, PIN-, TAN- oder Wiederherstellungsdaten.

Persönliche Bilder, Videos, Namen oder Sprachaufnahmen dürfen nur dann öffentlich dokumentiert werden, wenn die betroffene Person dies selbst erlaubt hat und die Veröffentlichung dem vereinbarten Umfang entspricht.

---

## 6. Persönliches Gedächtnis und Identität

Das persönliche Gedächtnis gehört ausschließlich zur jeweils berechtigten persönlichen Instanz.

Für zukünftige Mehrnutzerfassungen müssen mindestens folgende Bedingungen technisch erfüllt sein:

- eindeutige Nutzer- und Instanzzuordnung,
- authentifizierter Zugriff,
- getrennte Speicherung und Abfrage,
- keine Übernahme fremder Erinnerungen,
- nachvollziehbare Berichtigung und Löschung,
- Schutz vor unbefugtem Export,
- keine Freigabe persönlicher Daten allein aufgrund einer technischen Code-Nutzungserlaubnis.

Eine technische Sol-Holo-Lizenz oder ein Fork des Repositorys ist niemals automatisch eine Freigabe von Pamela Nitschkes persönlicher Identität, Stimme, ihrem Abbild oder ihren Erinnerungen.

---

## 7. Kamera, Mikrofon, Stimme, Fotos und Videos

Kamera und Mikrofon dürfen nur für eine erkennbare Funktion und im Rahmen der jeweiligen Geräteberechtigung verwendet werden.

Für andere erkennbare Personen gilt:

- Veröffentlichung nur im vereinbarten Umfang,
- keine Stimmnachbildung ohne gesonderte ausdrückliche Einwilligung,
- keine automatische Verwendung für einen digitalen Klon,
- keine Übertragung einer Freigabe auf fremde Projekte,
- ein Widerruf wird für zukünftige Verwendungen berücksichtigt.

Ein bereits öffentlich verbreiteter Inhalt kann technisch von Dritten kopiert worden sein. Ein späterer Widerruf kann daher vor allem die weitere eigene Nutzung und Veröffentlichung beenden, aber nicht jede bereits entstandene Kopie bei Dritten technisch zurückholen.

---

## 8. Externe Dienste und Datenübertragung

Sol Holo kann externe Anbieter, APIs, Cloud-Dienste und Geräteplattformen verwenden.

Vor einer Übertragung sensibler Inhalte soll geklärt sein:

1. welcher Dienst verwendet wird,
2. welche Daten tatsächlich erforderlich sind,
3. welche Berechtigung besteht,
4. ob die Aktion nur lesend oder auch schreibend ist,
5. ob eine sichtbare Bestätigung erforderlich ist,
6. wie die Verbindung widerrufen werden kann,
7. ob Daten gespeichert oder protokolliert werden.

Die Verwendung eines Anbieters bedeutet keine Partnerschaft, Unterstützung, Zertifizierung oder Mitentwicklung durch diesen Anbieter.

---

## 9. Protokollierung

Technische Protokolle sollen nur die für Fehlersuche und Betrieb erforderlichen Informationen enthalten.

Nicht unnötig protokolliert werden sollen insbesondere:

- vollständige private Gespräche,
- vollständige Erinnerungsbestände,
- Gesundheitsdaten,
- API-Schlüssel oder Tokens,
- Passwörter und Setup-Geheimnisse,
- vollständige private Bilder oder Dokumente.

Fehlermeldungen an die App sollen keine internen Geheimnisse oder vollständigen Antworten externer Dienste offenlegen.

---

## 10. Sicherheitsvorfall

Bei einem möglichen Sicherheitsvorfall gilt grundsätzlich:

1. betroffene Funktion oder Verbindung stoppen,
2. kompromittierte Schlüssel und Tokens widerrufen oder rotieren,
3. unbefugte Datenübertragung begrenzen,
4. die Ursache dokumentieren,
5. betroffene Daten und Personen bestimmen,
6. aktuelle Dateien korrigieren,
7. bei veröffentlichten Geheimnissen zusätzlich die Git-Historie prüfen,
8. erst nach einer Prüfung wieder freigeben.

Das bloße Löschen eines Geheimnisses aus der aktuellen Datei genügt nicht, wenn es bereits in einem Commit veröffentlicht wurde. Ein veröffentlichtes Geheimnis muss grundsätzlich als kompromittiert behandelt und ersetzt werden.

---

## 11. Sicherheitslücken melden

Sicherheitslücken, vermutete Datenlecks und gefundene Zugangsdaten sollen **nicht mit vollständigen technischen Details in einem öffentlichen Issue** veröffentlicht werden.

Bevorzugt wird – soweit im Repository verfügbar – GitHubs private Funktion **„Report a vulnerability“** verwendet.

Ist keine private Meldemöglichkeit sichtbar, kann ein öffentliches Issue mit dem Titel

`[SECURITY] Bitte privaten Kontakt herstellen`

erstellt werden. Dieses Issue darf keine Passwörter, Tokens, persönlichen Daten, Exploit-Schritte oder vertraulichen Anhänge enthalten. Die weiteren Einzelheiten werden anschließend über einen privaten Kontaktweg geklärt.

---

## 12. Sicherheitsstatus

| Bereich | Stand am 29.08.2026 |
|---|---|
| Geheimnisse über Server-Umgebungsvariablen | 🟩 vorhanden |
| `.gitignore` für Umgebungs- und Signaturdateien | 🟩 vorhanden |
| Zeitlich begrenzte OAuth-Statuswerte | 🟩 vorhanden |
| SmartThings-Tokenverschlüsselung | 🟩 vorhanden |
| Sichtbare Bestätigung bei Telefon/SMS | 🟩 vorhanden |
| Health Connect ausschließlich lesend | 🟩 technisch integriert; praktischer Gerätetest fortlaufend |
| Vollständige Backend-Zugriffskontrolle | 🟨 noch nicht abgeschlossen |
| Verschlüsselung aller gespeicherten OAuth-Tokens | 🟨 noch nicht abgeschlossen |
| Mehrnutzer- und Clone-Trennung | 🟨 Architekturziel; noch kein freigegebener Mehrnutzerbetrieb |
| Unabhängiger Sicherheitstest | ⬜ noch nicht durchgeführt |
| Sicherheitszertifizierung | ⬜ nicht vorhanden |

---

## 13. Zugehörige Dokumente

Diese Sicherheitsrichtlinie wird ergänzt durch:

- `Datenschutz.md`
- `Berechtigungen.md`
- `ANONYMISIERUNGSREGEL.md`
- `RECHTLICHER_HINWEIS.md`
- `THIRD_PARTY_NOTICES.md`
- `LICENSE`

Bei Widersprüchen zwischen einer geplanten Beschreibung und dem tatsächlich implementierten Code darf die Planung nicht als bereits vorhandene Schutzmaßnahme ausgegeben werden.

---

**Pamela Nitschke**  
Sol Holo · Pam’s Holo · SH♾️