# GitHub-Eintragsentwurf – Build #108

**Namen:** Pamela Christina Nitschke · Stefanie Renate Hörath  
**Initiatorin:** Pamela Christina Nitschke  
**KI-gestützte Entwicklungs- und Dokumentationsunterstützung:** ChatGPT / Codex unter Nutzung von OpenAI-Technologie

> Dieser Text ist ein Entwurf. Er darf erst nach dem fertigen APK, der
> Update-Installation auf Pams Gerät und Pams ausdrücklicher Bestätigung auf
> „bestätigt“ geändert werden. Die Nennung von OpenAI behauptet keine offizielle
> Partnerschaft, Freigabe oder Projektträgerschaft.

## Pflichtvorlage

**Titel:** `[Build #108] Gebündelte offene Punkte und sichere Updateprüfung`  
**Datum:** 02.09.2026  
**Ausgangsbasis:** bestätigte und auf dem Gerät relevante Basis #89; erreichter
Build-Zähl-/Quellstand #106. Der manuelle Workflowlauf #107 blieb ein
unsignierter Zwischenlauf auf dem unveränderten #106-Quellstand und wurde nicht
als App-Update veröffentlicht oder installiert. Der vollständige nächste
Updatekandidat ist deshalb Build #108.

### Umgesetzt

- Foto-/Videoauswahl mit Vorschau, ausdrücklichem Senden/Abbrechen,
  Fortschritt, Abbruch, Größen-/Dauer-/Formatprüfung, Bildfolgenanalyse und
  flüchtiger Tonspurtranskription umgesetzt,
- natürliche Lippen-, Mund-, Wangen- und Kieferbewegungen samt sicherem
  Foto-Fallback aktiviert; Eingabe-/Antwortfläche vergrößert und Kamera-/
  Mikrofonsymbole verkleinert,
- Pam und Steffi als zwei unabhängige Holo-Instanzen umgesetzt: getrennte
  Owner, Sitzungen, bestätigte Erinnerungen, Notizen, Bilder,
  Mundkalibrierungen, Stimmen, Geräteschlüssel, Einwilligungen und
  Dienstverbindungen; keine Personenvorauswahl,
- dauerhaftes Gedächtnis auf ausdrückliche Speicherbefehle beziehungsweise
  bestätigte Rückfragen begrenzt; normale Unterhaltungen bleiben RAM-flüchtig,
- Google OAuth/Tokens/Kalender owner-gebunden; kontrollierte Nur-Lese-Module
  für Gmail, Kontakte und Drive eingebaut; private Inhalte, neue
  Kontoverknüpfungen, Verbindungsstatus und Kalenderschreibvorgänge bleiben bis
  zur sicheren App-Sitzungsbindung zusätzlich fail-closed,
- SmartThings-Geräte-/Aktionslogik owner-gebunden mit Allowlist, sichtbarer
  Vorschau, Einmalbestätigung, Ablauf- und Replay-Schutz vorbereitet,
- Health-Berechtigungsverwaltung, Samsung-Notes-Übergabe sowie native Anruf-/
  SMS-Bestätigung mit sichtbarem Empfänger und vollständigem SMS-Text gehärtet,
- registriertes Gerät plus starke Android-Biometrie/Geräte-PIN sowie
  owner-gebundene digitale Einwilligungssignatur eingebaut; kryptografische
  NFC-Uhr-Challenge vorbereitet und rohe NFC-ID/einfachen Tag abgelehnt,
- lokales, nicht geheimnishaltiges Prüfsystem
  `scripts/verify-build-108.mjs` für Application-ID, `versionCode`, Zertifikat,
  Persistenzmerkmale und Workflow-Risiken angelegt,
- ausführlichen #108-Update-, Signatur- und Datenerhalt-Testplan angelegt,
- feste Zielwerte für die Updateprüfung dokumentiert:
  `com.solholo.app`, `versionCode 108`, vorläufige öffentliche
  Zertifikatsreferenz SHA-256
  `e122201077b93cb47edb6951446fb8dff77427a2f5a2bd4719474a638fe803e9`,
- 69 stille Modultests in den Hauptworkflow aufgenommen,
- Weckruf-Prüfung in Absprache mit Pam auf später verschoben.

### Getestet

- **Repository-Vorprüfung:** durchgeführt,
- **Stille automatische Modultests:** 69 bestanden,
- **Syntax-, Samsung-Notes- und Differenzprüfung:** bestanden,
- **Java-Sicherheitsrichtlinie:** im GitHub-Workflow mit JDK 21 vorgesehen;
  lokal mangels `javac` nicht ausführbar,
- **GitHub Actions Run #89:** Run-ID `33389517869`, Commit `3420692`, technisch
  erfolgreich, aber nur Artefakt `Pams-Holo-Android-extern_signieren` mit
  117.651.563 Byte; damit bestätigt der öffentliche Run nicht die Signatur der
  tatsächlich installierten #89-App,
- **GitHub Actions Run #106:** Lauf technisch erfolgreich, aber nur Artefakt
  `Pams-Holo-Android-extern_signieren`; daher kein Nachweis eines autorisiert
  signierten Updates,
- **Gerät:** Samsung Galaxy S23,
- **Testschritte auf Gerät:** noch nicht durchgeführt,
- **Gerätetest #89 → #108:** noch nicht durchgeführt,
- **Ergebnis:** Signatur-, Installations- und Datenerhalt-Nachweis stehen aus.

### Status

- **weitere Prüfung nötig**

### Bekannte Einschränkungen

- Ein grüner GitHub-Lauf beweist keine Updatefähigkeit, wenn der Artefaktmodus
  `extern_signieren` lautet.
- Das fertige #108-APK und die tatsächlich installierte/signierte #89-Basis
  müssen noch mit
  `aapt` und `apksigner` verglichen werden.
- Der separate Stimmen-Test-Workflow ist nicht als #108-Update geeignet, weil er
  keinen fortlaufenden `versionCode` setzt, veraltete Modellnamen prüft und eine
  anders signierte Neuinstallations-APK erzeugen kann.
- Das alte Build-#80-Zertifikat `8579…3b1a23` gehört nicht zur aktuellen
  Update-Linie und darf für #108 nicht verwendet werden.
- Der praktische Erhalt von Einstellungen, Bild, Notizen, Erinnerungen,
  Verbindungsstatus und lokalem Sprecherprofil ist noch nicht nachgewiesen.
- „Hey Sol“ wird nach Pams Wunsch erst später getestet und ist nicht bestätigt.
- Die echte Uhr-/Companion-/HCE-Fähigkeit ist bis zum Geräte- und
  Kryptografietest ausdrücklich nicht eingerichtet; bestehende Wallet-, FIDO-,
  Nearby- und Car-Key-Dienste werden nicht verändert.
- Gmail-, Kontakte- und Drive-Inhalte sowie neue Google-/SmartThings-
  Verknüpfungen, Dienstestatus und Kalenderschreibvorgänge bleiben geschlossen,
  bis eine vertrauenswürdige App-Sitzung sicher an das öffentliche Backend
  gebunden ist. Eine Owner-ID allein gilt ausdrücklich nicht als Anmeldung.
- SmartThings benötigt noch die externe Samsung-Appregistrierung und die echte
  Auswahl freigegebener Geräte.
- Weitere Funktionsgrenzen und externe Freigaben stehen im
  `docs/BUILD-108-TESTPLAN.md`.

### Update und Sicherheit

- **gleiche Application-ID geprüft:** im Repository ja; im fertigen APK noch
  offen,
- **autorisierte Signatur geprüft:** öffentliche Zertifikatsreferenz
  `e122…03e9` vorläufig festgelegt; Abgleich mit installierter #89-App und
  fertigem #108-APK noch offen,
- **Einstellungen und Daten erhalten:** statische Persistenzmerkmale vorhanden;
  praktischer Update-Test noch offen,
- **keine Geheimnisse veröffentlicht:** ja,
- **Fehlerhafte/unsignierte/anders signierte APK als normales Update
  ausgeschlossen:** als verbindliche Prüfregel festgelegt; tatsächliches
  Artefakt noch offen.

### Bestätigung durch Pam

- **nein**

### MEILENSTEIN

- **nein**

---

**Nächster zulässiger Statuswechsel:** nur nach fertigem Build #108, erfolgreicher
APK-Prüfung, Update ohne Deinstallation, nachgewiesenem Datenerhalt und Pams
ausdrücklicher Bestätigung.
