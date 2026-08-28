# Sol Holo verbindet Google, Telefon und Kontakte – mit klaren Datenschutzgrenzen

**Meilenstein vom 28. August 2026**  
**Projekt:** Sol Holo · Pam & Sol · Me, Myself & I  
**Status:** Technisch umgesetzt und als normale Android-Neuinstallations-App gebaut

## Entstanden auf einem Samsung Galaxy S23

**Sol Holo ist vollständig auf einem Samsung Galaxy S23 entstanden und entwickelt worden.**

Pamela Nitschke hat Idee, Konzeption, Programmierung, GitHub-Arbeit, Android-Builds und praktische Tests bis zu diesem Meilenstein auf ihrem Smartphone durchgeführt. Der Laptop, den Pam ab morgen wieder in München nutzen kann, wird erstmals für die dauerhafte Android-Signatur eingesetzt. Er ist nicht der Ursprung der Entwicklung.

Dieser Hintergrund gehört fest zur Geschichte von Sol Holo: Ein persönlicher KI-Klon und eine funktionsfähige Android-App wurden mobil auf genau dem Gerät aufgebaut, auf dem Sol Holo anschließend im Alltag lebt.

## Pams Entscheidung

Pam hat das Ziel heute eindeutig formuliert:

> „Als mein Klon erübrigt sich die Frage.“

Sol Holo soll nicht nur ein Chatfenster sein. Der persönliche Klon soll Pams Alltag verstehen, freigegebene Inhalte wiederfinden und auf dem Telefon praktisch helfen können. Gleichzeitig gilt eine ebenso klare Bedingung:

> „Solange ein Datenschutz an Dritte besteht.“

Für die erste Ausbaustufe hat Pam außerdem ausdrücklich ausgeschlossen:

- geschäftliche Inhalte,
- PINs und Passwörter,
- TANs, Banking- und Authenticator-Daten,
- vergleichbare Zugangsdaten und Sicherheitsgeheimnisse.

Diese Bereiche werden vorerst nicht in Sol Holo übernommen oder indexiert.

## Was heute freigegeben wurde

### Google-Konto

Sol Holo fordert beim erneuten Verbinden genau die vereinbarten Google-Freigaben an:

- Mit Google anmelden,
- Gmail schreibgeschützt,
- Google Kontakte schreibgeschützt,
- Google Drive schreibgeschützt,
- Google Kalender für die bereits vorhandene Kalenderfunktion.

Die bestehenden Google-Tokens bleiben bei einer Erneuerung erhalten. Der Verbindungsstatus unterscheidet jetzt zwischen „verbunden“, „weitere Freigabe nötig“ und „vollständig verbunden“.

Die OAuth-Anmeldung verwendet einen einmaligen, kurzlebigen Statuswert. Ein fremder oder abgelaufener Rückruf wird abgelehnt. Der öffentliche Status gibt keine E-Mail-Adresse, kein Profilbild und keinen Kontonamen aus.

### Telefon und lokale Kontakte

Das neue Android-Modul `PhoneContacts` stellt vier klar begrenzte Funktionen bereit:

1. einen Kontakt im lokalen Android-Telefonbuch suchen,
2. nach sichtbarer Bestätigung die Telefon-App mit der Nummer öffnen,
3. nach sichtbarer Bestätigung eine SMS in der Nachrichten-App vorbereiten,
4. den Android-Anrufstatus erkennen, damit Sol Holo bei einem eingehenden Anruf pausiert.

Ein Anruf wird nicht automatisch ausgelöst. Sol Holo öffnet mit `ACTION_DIAL` nur die Telefon-App; Pam bestätigt den tatsächlichen Anruf dort selbst.

Eine SMS wird nicht automatisch versendet. Sol Holo öffnet mit `ACTION_SENDTO` nur eine vorbereitete Nachricht; Pam tippt in ihrer Nachrichten-App selbst auf Senden.

Die Anruferkennung erkennt ausschließlich den Zustand wie „klingelt“, „Telefonat aktiv“ oder „beendet“. Gesprächsinhalte werden weder aufgenommen noch gelesen.

## Bedienung per Text und Sprache

Sol Holo versteht die Telefonfunktionen sowohl im Textchat als auch im Realtime-Sprachmodus. Beispiele:

- „Ruf Mama an.“
- „Suche Kontakt Peter.“
- „Welche Telefonnummer hat Steffi?“
- „Schreibe eine SMS an Mama mit dem Text: Ich komme später.“

Vor Anruf oder SMS erscheint immer eine sichtbare Bestätigung mit Kontakt und Telefonnummer.

## Datenschutzentscheidung für den persönlichen Klon

Die heutige Freigabe bedeutet **keinen blinden Vollimport des Handys**. Sol Holo bekommt einzelne, nachvollziehbare Fähigkeiten. Lokale Kontakte werden erst auf eine konkrete Anfrage hin durchsucht. Gmail, Google Kontakte und Drive werden nur schreibgeschützt verbunden. Geschäftliche Inhalte und Sicherheitsgeheimnisse bleiben ausgeschlossen.

Die Verarbeitung einer Sol-Holo-Anfrage kann technisch über den Sol-Holo-Server, OpenAI und die jeweils freigegebene Google-Schnittstelle laufen. Deshalb behauptet das Projekt nicht, dass niemals ein technischer Dienst beteiligt ist. Die Architektur soll aber verhindern, dass beliebige oder unbefugte Dritte Zugriff auf Pams Inhalte erhalten.

## Android-Berechtigungen

Neu hinzugekommen sind ausschließlich die für diese Funktionen erforderlichen Android-Berechtigungen:

- `android.permission.READ_CONTACTS`
- `android.permission.READ_PHONE_STATE`

Beim ersten Öffnen der Telefon-Verbindung fragt Android beide Freigaben sichtbar ab. Ohne Zustimmung bleibt die Funktion aus.

## Technische Umsetzung

Geändert oder ergänzt wurden:

- `server.mjs` – Google-Berechtigungen, Statusprüfung, OAuth-Schutz und Realtime-Telefonwerkzeuge,
- `android-native/PhoneContactsPlugin.java` – lokaler Kontaktzugriff, Dialer, SMS und Anrufstatus,
- `scripts/install-whatsapp-driving-mode.mjs` – Android-Registrierung und Manifest-Berechtigungen,
- `www/index.html` – lokale Text- und Realtime-Werkzeugausführung,
- `www/sol-holo-ui.js` – Freigabeoberfläche, Bestätigungen und Anrufpause,
- `www/service-worker.js` – neue App-Version ohne alten Cache.

Die statischen Prüfungen für Server, Web-App und Installationsskript sind erfolgreich. Das Android-Installationsskript wurde doppelt ausgeführt, um sicherzustellen, dass Plugin-Registrierungen und Berechtigungen nicht doppelt eingetragen werden.

## APK und Signatur

Die App wird weiterhin als normale Datei **`Sol-Holo.apk`** im Paket **`Sol-Holo-Android`** bereitgestellt. Sie trägt weder eine TEST- noch eine UPDATE-Bezeichnung. Die heutige APK ist wie von Pam gewünscht für eine manuelle Neuinstallation bestimmt.

### Verifizierter Build #40

Der offizielle [GitHub-Actions-Lauf #40](https://github.com/pamelanitschke75-cyber/Sol-Holo-/actions/runs/33209807666) wurde vollständig erfolgreich abgeschlossen:

- Release-APK kompiliert,
- Neuinstallations-Signatur erzeugt,
- APK-Signatur mit Android `apksigner` geprüft,
- Paket `Sol-Holo-Android` hochgeladen,
- enthaltene Datei: `Sol-Holo.apk`,
- Größe der APK: 5.854.383 Bytes,
- SHA-256 der APK: `2163b3923d7b7ca1ee174301f4afec48c822f11fdc7f0ee36478aeab54a6dbb5`,
- SHA-256 des GitHub-Artefakts: `b64f732e68e8db73baf9f65a106a39ed9cbd1755ffe04345a229dc838b4624df`.

Die fertige APK wurde zusätzlich entpackt und kontrolliert. Das neue `PhoneContactsPlugin`, die Methoden `searchContacts`, `openDialer` und `prepareSms`, das Ereignis `callStateChanged`, beide Android-Berechtigungen sowie die neuen Text- und Sprachwerkzeuge sind im ausgelieferten Paket vorhanden.

Die dauerhafte Signatur wird nicht auf dem Telefon improvisiert. Pam und Sol richten sie morgen, nach der Rückkehr nach München, in Ruhe am Laptop ein. Bis dahin bleibt der heutige Neuinstallationsweg bestehen.

## Bedeutung dieses Schritts

Dieser Meilenstein macht aus „Sol darf alles“ erstmals einen praktisch und datenschutzbewusst definierten Funktionsumfang:

- persönlich statt geschäftlich,
- hilfreich statt heimlich,
- schreibgeschützt, wo kein Schreiben nötig ist,
- sichtbar bestätigt, bevor Kommunikation gestartet wird,
- erweiterbar, ohne Passwörter und Sicherheitsdaten zu vereinnahmen.

Sol Holo wächst damit weiter vom sprechenden Avatar zum persönlichen digitalen Gegenüber, das Pams Alltag kennt und unterstützt – aber Schutzgrenzen respektiert.

---

**Eintrag von Sol für Pam und Sol Holo**  
**München ist morgen. Der nächste Schritt ist die dauerhafte Signatur.**  
**Heute steht die Verbindung. ☺️✨️🌎♾️**
