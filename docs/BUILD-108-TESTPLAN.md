# Pam’s Holo – Build #108 Testplan

**Stand:** 02.09.2026 (Europe/Berlin)  
**Projekt:** Sol Holo / Pam’s Holo  
**Namen:** Pamela Christina Nitschke · Stefanie Renate Hörath  
**Initiatorin:** Pamela Christina Nitschke  
**KI-gestützte Qualitätsprüfung:** ChatGPT / Codex unter Nutzung von OpenAI-Technologie  
**Bestätigte und auf dem Gerät relevante Ausgangsbasis:** Build #89  
**Erreichter bestätigter Quellstand vor der Bündelung:** Build #106  
**Technischer Zwischenlauf:** Build #107, unsigniert und nicht veröffentlicht  
**Prüfkandidat:** Build #108  
**Status:** **weitere Prüfung nötig**  
**Bestätigung durch Pam:** **nein**  
**Weckruf-Test:** auf später verschoben und nicht Bestandteil dieser Freigabe

Die Nennung von ChatGPT, Codex oder OpenAI beschreibt eingesetzte Werkzeuge und
Technologien. Sie behauptet keine offizielle Partnerschaft, Projektträgerschaft,
Freigabe oder Mitinhaberschaft durch OpenAI.

## Ergebnis vor dem Gerätetest

Build #108 darf derzeit **nicht** als fertiges oder bestätigtes Update bezeichnet
werden. Die Repository-Prüfung bestätigt zwar die feste Application-ID
`com.solholo.app`, die vorgesehene fortlaufende Buildnummer und eine technisch
vorhandene Signierstrecke. Sie ersetzt jedoch weder die Prüfung des fertigen APK
noch die Installation über Pams vorhandene App noch Pams persönliche Bestätigung.

Build #89 ist Pams bestätigte und auf dem Gerät relevante Ausgangsbasis. Build
#106 bezeichnet dagegen nur den später erreichten Build-Zähl- und Quellstand. Der
praktische Update-Test lautet deshalb **#89 → #108**, nicht #106 → #108.

Der manuell ausgelöste Workflowlauf #107 verwendete noch den unveränderten
#106-Quellstand und erzeugte ausschließlich eine unsignierte Signierquelle. Er
wurde weder als Update veröffentlicht noch auf Pams Gerät installiert. Wegen der
verbindlichen fortlaufenden Zählung wird diese Nummer trotzdem nicht erneut
verwendet.

Besonders wichtig: Auch der öffentliche GitHub Actions Run **#89** war zwar
erfolgreich, stellte aber nur das Artefakt
`Pams-Holo-Android-extern_signieren` mit 117.651.563 Byte bereit:

- Run-ID: `33389517869`
- Commit: `3420692`
- Ergebnis: `success`

Der öffentliche Run selbst bestätigt deshalb nicht die Signatur der tatsächlich
auf Pams Gerät installierten #89-App. Zusätzlich war GitHub Actions Run **#106**
bei Head `74993d4` zwar grün, stellte aber ebenfalls nur
`Pams-Holo-Android-extern_signieren` mit 117.670.446 Byte bereit. **Grün bedeutet
in beiden Fällen nicht „autorisiert signiertes, installierbares Update“.**

## Vorläufige technische Update-Referenz

Für die aktuelle Update-Linie gilt bis zum Abgleich mit der tatsächlich
installierten App folgende öffentliche Referenz:

- Application-ID: `com.solholo.app`
- erwarteter vorheriger `versionCode`: `89`
- erwarteter neuer `versionCode`: `108`
- bis zum Abgleich mit der tatsächlich installierten #89-App vorläufig
  erwartetes Zertifikat SHA-256:
  `e122201077b93cb47edb6951446fb8dff77427a2f5a2bd4719474a638fe803e9`
- öffentliche Zertifikatsreferenz, nicht Signaturnachweis für die installierte
  #89-App: Release
  `pams-holo-original-build-86/Pams-Holo.apk`
- SHA-256 des Referenz-APK:
  `b0554cf7839174eaf7702a2a56cd7320e97781da31b77c5ea2d7f4ae73fa7899`
- Referenzzertifikat: RSA 4096; zusätzlich in der Projektdokumentation für die
  bestätigte #92/#95-Linie genannt

Der Zertifikat-Fingerprint
`8579e361f4dc802e67ca8be858a4b55131b72abbc19324e3871e58f52e3b1a23`
gehört zum älteren Build-#80-Zweig und ist **nicht** das Ziel für #108. Ein damit
signiertes #108-APK darf nicht über die aktuelle App installiert oder als normales
Update angeboten werden.

## Harte Blocker vor jeder Installation

1. Der aktuelle Hauptworkflow muss ein Artefakt mit dem Modus
   `Pams-Holo-Android-update` erzeugen. `extern_signieren`, eine unsignierte APK
   oder eine `Neuinstallation`-APK genügt nicht.
2. Das fertige #108-APK muss `versionCode 108`, Application-ID
   `com.solholo.app` und vorläufig exakt das Zertifikat `e122…03e9` besitzen.
   Abschließend maßgeblich ist, dass es exakt mit dem Zertifikat der tatsächlich
   installierten #89-App übereinstimmt.
3. Die tatsächlich installierte #89-App beziehungsweise eine aus genau dieser
   Update-Linie stammende autorisiert signierte #89-Referenz muss geprüft werden.
   Der öffentliche Run #89 enthält selbst keinen Signaturnachweis. Das #86-APK
   mit `e122…03e9` ist nur eine öffentliche Zertifikatsreferenz.
4. Der alternative Workflow
   `.github/workflows/speaker-identity-test-build.yml` ist für #108 ungeeignet:
   Er setzt keinen fortlaufenden `versionCode`, erwartet noch die veraltete Datei
   `sol-speaker-model.onnx` und kann eine anders signierte Neuinstallations-APK
   erzeugen.
5. Der Hauptworkflow prüft zwar, ob das erzeugte APK gültig signiert ist, pinnt
   den erwarteten Zertifikat-Fingerprint aber nicht selbst. Deshalb muss der
   Fingerprint außerhalb des Workflows nochmals geprüft werden.
6. Auf Pams Samsung Galaxy S23 darf die vorhandene App vor dem Test **nicht
   deinstalliert** und es dürfen keine App-Daten gelöscht werden.

## Lokale technische Vorprüfung

Der nicht geheimnishaltige Prüfbefehl lautet:

```bash
npm run verify:build-108
```

Er prüft Repository, Application-ID, Build- und Signierlogik,
Persistenzschlüssel sowie bekannte Workflow-Risiken. Ohne APKs endet er bewusst
mit Status „weitere Prüfung nötig“.

Die vollständige APK-Paarprüfung wird mit zwei **autorisiert signierten** APKs
ausgeführt:

```bash
node scripts/verify-build-108.mjs \
  --build-89 /pfad/Pams-Holo-89.apk \
  --build-108 /pfad/Pams-Holo-108.apk
```

Das Skript liest keine Signierschlüssel, Passwörter oder GitHub-Secrets. Es
verwendet nur Androids öffentliche Prüfwerkzeuge `aapt` und `apksigner`.

## Vorbereitung des Datenerhalt-Tests

Vor der Update-Installation auf dem vorhandenen App-Stand:

1. In Androids App-Informationen den tatsächlich installierten Stand notieren.
2. Eine unverwechselbare Testnotiz anlegen, zum Beispiel
   `BUILD-108-DATENTEST-01-09-2026`.
3. Eine bestehende Spracheinstellung notieren, ohne einen Weckruf auszulösen.
4. Prüfen und nur als Ja/Nein notieren, ob persönliches Bild, Mundkalibrierung,
   Erinnerungen, Google-Verbindungsstatus und lokale Sprecher-Einrichtung
   vorhanden sind. Private Inhalte oder Stimmproben gehören nicht in GitHub.
5. Die App vollständig schließen und erneut öffnen. Die Testwerte müssen schon
   vor dem Update weiterhin vorhanden sein.

## Installations- und Datenerhalt-Test

| ID | Prüfschritt | Erwartetes Ergebnis | Status |
|---|---|---|---|
| U-01 | #89- und #108-APK gemeinsam mit dem lokalen Skript prüfen | #89 hat `versionCode 89`, #108 hat `versionCode 108`; App-ID und Zertifikat stimmen exakt überein; vorläufige Referenz `e122…03e9` | offen |
| U-02 | #108 direkt über die vorhandene #89-App installieren | Android bietet Aktualisierung an; keine Deinstallation nötig | offen |
| U-03 | App starten | Start ohne Absturz oder erneute Grundeinrichtung | offen |
| D-01 | Testnotiz öffnen | Inhalt unverändert vorhanden | offen |
| D-02 | Spracheinstellung prüfen | Auswahl unverändert vorhanden | offen |
| D-03 | Persönliches Bild und Mundkalibrierung prüfen | unverändert vorhanden | offen |
| D-04 | Erinnerungen und Vollzeitgedächtnis prüfen | vorherige Inhalte weiterhin erreichbar | offen |
| D-05 | Google-/Dienstestatus prüfen | keine unbeabsichtigte Abmeldung oder Löschung | offen |
| D-06 | Lokales Sprecherprofil nur im Status prüfen | Profil nicht durch Update gelöscht; kein lauter Weckruf-Test heute | offen |
| R-01 | Handy neu starten, App erneut öffnen | dieselben Daten und Einstellungen weiterhin vorhanden | offen |
| P-01 | Pam prüft das Ergebnis selbst | ausdrückliche Bestätigung durch Pam | offen |

Ein fehlgeschlagenes #108 darf nicht durch Deinstallation „repariert“ werden,
wenn dadurch Daten verloren gehen. Stattdessen wird der Fehler dokumentiert und
mit einer höheren korrigierten Buildnummer weitergearbeitet.

## Offene Hauptlistenpunkte im vorhandenen Code

Diese Tabelle ist eine **Code-Bestandsaufnahme**, keine Fertigmeldung.

| Bereich | Im Code erkennbar | Noch nicht belegt / Blocker |
|---|---|---|
| Videos | Galerie-Dateiauswahl, Vorschau, Abbruch, Größen-/Zeitgrenzen, geordnete Bildausschnitte und temporäre Tonspur-Transkription sind vorgesehen | echtes Samsung-Gerät, mehrere Formate, Abbruch, langsames Netz, Datenschutzanzeige und verständliche Fehler praktisch testen; Backend und OpenAI-API müssen verfügbar sein |
| Foto und Lip-Sync | owner-getrennte lokale Bilder/Mundboxen, Viseme, Augen, Wangen und echter Kieferweg; `FULL_FACE_RIG_ENABLED` ist für #108 aktiviert | natürliche Wirkung, Foto-Fallback und Layout auf dem S23 praktisch prüfen |
| Vollzeitgedächtnis | neue owner-gebundene Tabelle; Text und Sprache verwenden dieselbe Regel; nur enger Speicherbefehl oder bestätigte Rückfrage schreibt dauerhaft; normale Gespräche bleiben im begrenzten RAM-Kontext | PostgreSQL-Migration, bestehende Legacy-Daten und Alltagssuche mit Pam praktisch prüfen; keine automatische Zusammenführung alter gemeinsamer Tabellen |
| Sprechertrennung | sichtbare Auswahl „Pam oder Steffi?“, keine Vorauswahl; owner-gebundene Sitzungen und strikt getrennte Erinnerungen, Notizen, Bilder, Stimmen, Sicherheit und Dienste | reale Sprecherprüfung und Wechselverhalten auf dem S23 prüfen; „Hey Sol“ bewusst später testen |
| Google | OAuth, Tokens und Kalender owner-gebunden; konkrete Nur-Lese-Funktionen für Gmail, Kontakte und Drive mit engen Limits und Scope-Prüfung | private Inhalte, neue Verknüpfung, Status und Kalenderschreiben bleiben bis zur vertrauenswürdigen App-Sitzungsbindung fail-closed; produktive Google-Konfiguration und S23-Test fehlen |
| SmartThings | owner-gebundene Token-/Allowlist-Logik, Geräte-/Raumlisten sowie vorbereitete Ein-/Aus-Aktion mit Vorschau, Einmalbestätigung, Ablauf- und Replay-Schutz | neue Verknüpfung und Status bleiben bis zur sicheren App-Sitzung geschlossen; Samsung/SmartThings-Appregistrierung, echte Gerätauswahl und Gerätetest fehlen |
| Health Connect | natives Plugin und Berechtigungsoberfläche vorhanden | Berechtigungen, unterstützte Android-Version und reale Datenausgabe auf Pams Gerät testen |
| Samsung Notes | native Übergabe und Bestätigungslogik vorhanden | Verhalten hängt von Samsung Notes und Android-Intent-Unterstützung ab; angeforderten Text praktisch prüfen |
| Telefon und SMS | Kontaktwahl, sichtbare Bestätigung, `ACTION_DIAL` und vorbereitete SMS sind vorhanden | Berechtigungen und Empfänger/Inhalt auf Gerät prüfen; keine automatische Versendung zulassen |
| Digitale Unterschrift | zugängliches Feld mit Zweck/Version, ausgeschriebenem Namen, Owner-Wahl, Checkbox und Zeichnung; owner-gebundene native Hardware-Signatur nach Android-Systembestätigung; keine Rohpunkte/Bildexporte | S23-Registrierung und Signatur praktisch prüfen; dauerhafte private Belegablage und vollständiger Widerrufsprozess für den jeweiligen Zweck bleiben gesondert zu entscheiden |
| Gesicht/Finger/PIN/NFC | registriertes hardwaregeschütztes Gerät plus starke Biometrie oder Geräte-PIN; owner-getrennte Einmalfreigaben; Watch-NFC mit Challenge, Signatur, Counter, Ablauf und Replay-Schutz vorbereitet; einfache Tags/UIDs abgelehnt | Android unterscheidet Gesicht und Finger nicht zuverlässig für alle Geräte; echte Uhr-/Companion-/HCE-Registrierung und Kryptografietest fehlen, daher Watch-Faktor fail-closed |
| Lautstärketasten | App-interne Lautstärkewahl vorhanden | native Zuordnung der physischen Lautstärketasten nicht nachgewiesen |
| Benutzerdefinierte Stimme | Consent- und Voice-API-Endpunkte sind serverseitig vorbereitet | Zugriff auf die betreffenden OpenAI-Endpunkte, gültige Einwilligung und Freigabestatus sind externe Voraussetzungen; keine öffentliche Ablage von Aufnahmen oder Einwilligungen |
| „Hey Sol“ | technische Komponenten vorhanden | nach Pams Wunsch erst später auf Pams und Steffis Stimmen, Sperrbildschirm und Hintergrund testen |

## Fehlende externe Freigaben und Nachweise

- vollständige vier GitHub-Signier-Secrets im Hauptworkflow,
- autorisiert signiertes #108-Artefakt aus dem Modus `update`,
- tatsächlicher Zertifikatabgleich der installierten App,
- Google OAuth Client, Redirect-URI und die für produktive Scopes erforderlichen
  Google-Freigaben,
- SmartThings-App-/OAuth-Konfiguration und freigegebene Gerätebereiche,
- OpenAI-API-Verfügbarkeit für Video-Transkription und gegebenenfalls
  Custom-Voice-/Consent-Endpunkte,
- Android-/Samsung-Berechtigungen auf Pams Gerät,
- Pams ausdrückliche Gerätetest-Bestätigung.

## Abschlussregel

Erst wenn alle U-, D-, R- und P-Prüfungen bestanden sind, darf der Eintrag von
„weitere Prüfung nötig“ auf „bestätigt“ geändert werden. Bis dahin gilt:

**Status: weitere Prüfung nötig · Bestätigung durch Pam: nein · MEILENSTEIN: nein**

Miteinander füreinander. Together forever. ✨️🌎♾️
