# 🔐 SOL HOLO – MEHRFAKTOR-IDENTITÄTSSCHUTZ MIT NFC

**Sicherheitskonzept dokumentiert:** 30. August 2026  
**Historischer NFC-Nachweis am Testgerät:** 16. August 2026  
**Projekt:** Sol Holo · SH♾️  
**Projekt / Idee / Entwicklung:** Pamela Nitschke  
**Sicherheitsimpuls / Zusatzidee:** Stefanie Hörath  
**Status:** Sicherheitskonzept dokumentiert – modulare technische Grundlage vorhanden, Geräte- und Watch-Test noch offen

---

## Anlass

Am 30.08.2026 wurde für Sol Holo ein zusätzlicher Schutz gegen unbefugten Zugriff festgelegt.

Ausgangspunkt war der Einwand, dass ein persönliches Sol Holo besonders geschützt werden muss, wenn eine andere Person versucht, es zu öffnen.

Dabei wurde bewusst berücksichtigt, dass ein Mensch sich körperlich verändern kann – zum Beispiel durch Alter, Make-up, Krankheit, Operation, Unfall oder neurologische Ereignisse.

Darum darf Sol Holo die Identität eines Menschen **nicht von einem einzigen unveränderlichen Körpermerkmal abhängig machen**.

---

## Grundsatz

Für Sol Holo gilt:

**Kein einzelnes biometrisches Merkmal darf allein darüber entscheiden, ob eine Person dauerhaft als berechtigt oder unberechtigt gilt.**

Gesicht, Auge / Iris, Fingerabdruck und Stimme können als zusätzliche Merkmale verwendet werden, müssen aber durch weitere unabhängige Nachweise ergänzt werden.

Die Stimme wird insbesondere **nicht als alleiniger Sicherheitsnachweis** vorgesehen, weil ähnlich klingende Personen nicht zuverlässig genug voneinander unterschieden werden können.

---

## Geplante unabhängige Nachweisarten

Sol Holo soll langfristig mehrere Kategorien kombinieren:

### 1. Biometrischer Nachweis

Mögliche Verfahren:

- Fingerabdruck
- Gesichtserkennung
- gegebenenfalls Iris / Auge, sofern geeignete Hardware vorhanden ist

Biometrische Verfahren sind optional und dürfen bei körperlichen Veränderungen oder technischen Problemen nicht zum dauerhaften Ausschluss der berechtigten Person führen.

### 2. Wissensnachweis

Mögliche Verfahren:

- Geräte-PIN
- Passwort / Sicherheitscode

### 3. Besitznachweis

Mögliche Verfahren:

- registriertes Smartphone
- kryptografisch geschützter NFC-Sicherheitsschlüssel
- später gegebenenfalls ein weiteres registriertes Gerät

### 4. Wiederherstellung / Notfall

Für Situationen wie Unfall, Krankheit, Geräteverlust oder körperliche Veränderungen soll ein separater sicherer Wiederherstellungsweg vorgesehen werden.

Dieser darf nicht bedeuten, dass eine einzelne Vertrauensperson automatisch Zugriff auf persönliche Erinnerungen oder Daten erhält.

---

## NFC als zusätzlicher Identitätsnachweis

NFC wird künftig als zusätzlicher Besitznachweis für Sol Holo vorgesehen.

Dabei gilt ausdrücklich:

- Ein **einfacher NFC-Tag oder frei programmierbarer NFC-Aufkleber** reicht nicht als sicherer Identitätsnachweis.
- Verwendet werden soll ein **kryptografisch geschützter NFC-Sicherheitsschlüssel** oder ein technisch gleichwertiger sicherer Besitznachweis.
- NFC darf **nicht allein** den vollständigen persönlichen Bereich von Sol Holo freigeben.
- Für eine Freigabe soll mindestens ein weiterer unabhängiger Nachweis hinzukommen, zum Beispiel PIN oder starke Biometrie.

Beispiel:

**registriertes Gerät + NFC-Sicherheitsschlüssel + PIN → starker Ersatz- bzw. Notfallzugang**

### Trennung von privater Entscheidung und technischem Gerätetest

Eine neue allgemeine In-App-Abfrage ist für diesen technischen Schritt nicht vorgesehen. Personenbezogene Inhalte privater Einwilligungsnachweise werden nicht als öffentliche App-Metadaten oder im öffentlichen Repository veröffentlicht.

Davon getrennt bleiben die technischen Nachweise:

- Die NFC-Funktion des Samsung Galaxy S23 ist praktisch belegt.
- Der kryptografische Watch-HCE-/Companion-Ablauf wurde noch nicht auf einer ausgewählten Uhr getestet.
- Für einen eigenständigen kryptografischen NFC-Sicherheitsschlüssel wurde noch kein konkreter Hersteller beziehungsweise Schlüsseltyp ausgewählt und attestiert.
- Bis diese Tests erfolgreich abgeschlossen sind, meldet Sol Holo für diese Faktoren ehrlich **„nicht eingerichtet“** und gibt damit keine kritische Aktion frei.

---

## Technische Mehrfaktor-Grundlage ab Build #108

Die neue modulare Grundlage trennt die Faktoren in unabhängige Kategorien:

- **Besitz:** registriertes Smartphone mit nicht exportierbarem Android-Keystore-Schlüssel,
- **Wissen:** Android-Geräte-PIN, Muster oder Passwort,
- **Biometrie:** starke Android-Systembiometrie der Klasse 3,
- **zusätzlicher Besitz:** eine künftig kryptografisch registrierte und signierende Uhr oder ein attestierter NFC-Sicherheitsschlüssel.

Für eine kritische Aktion gilt technisch mindestens:

**registriertes Gerät + (starke Android-Systembiometrie oder Geräte-PIN)**

Telefon und Uhr sind zwar zwei getrennte Geräte, gehören aber beide zur Kategorie **Besitz**. Sie zählen deshalb nicht allein als zwei unabhängige Kategorien. Für besonders kritische Aktionen kann später zusätzlich gelten:

**registriertes Gerät + registrierte kryptografische Uhr + (starke Systembiometrie oder Geräte-PIN)**

Bei Ausfall oder Veränderung der Biometrie ist der vorgesehene lokale Wiederherstellungsweg:

**registriertes Gerät + Android-Geräte-PIN/-Muster/-Passwort**

Ein verlorenes oder nicht mehr nachweisbares registriertes Gerät wird nicht durch einen einfachen lokalen Schalter ersetzt. Ein späterer Gerätewechsel benötigt einen separat eingerichteten, bereits vertrauenswürdig registrierten kryptografischen Wiederherstellungsfaktor plus einen Wissensnachweis.

### Registrierte Uhr als kryptografischer NFC-Signaturfaktor

Eine Uhr darf nur dann den Faktor `registered_watch_nfc` liefern, wenn alle folgenden Bedingungen erfüllt sind:

- Auf der Uhr existiert ein eigener privater Schlüssel, der die Uhr nicht verlassen darf.
- Sol Holo hat den zugehörigen öffentlichen Schlüssel nach echter Registrierung und Attestierungsprüfung fest verankert.
- Das Telefon erzeugt pro Vorgang eine neue zufällige Challenge / Nonce.
- Die Challenge ist kurz befristet und nur einmal verwendbar.
- Die Uhr signiert exakt die gebundene Aktion, Challenge, Ablaufzeit und einen streng ansteigenden Zähler.
- Pam bestätigt die konkrete Aktion ausdrücklich auf der Uhr, bevor die Uhr signiert.
- Das Telefon prüft Signatur, fest verankerten öffentlichen Schlüssel, Ablaufzeit, Aktionsbindung, Einmaligkeit und Zähler.
- Eine NFC-ID, eine Tag-Seriennummer, ein NDEF-Text oder die bloße Nähe der Uhr wird niemals akzeptiert.

Die Telefonseite enthält dafür eine Fail-Closed-Policy und eine Challenge-/Signatur-Schnittstelle. Solange ein passender Watch-Companion, ein geprüfter NFC-/HCE-Transport und eine attestierte Schlüsselregistrierung fehlen, bleibt `registered_watch_nfc` **nicht eingerichtet**.

### Koexistenz mit vorhandenen NFC-Diensten

Die Sicherheitsfunktion ist ausdrücklich **kein Bezahldienst**. Eine spätere HCE-Umsetzung darf ausschließlich als nicht zahlungsbezogener Dienst (`CATEGORY_OTHER`) erfolgen.

Sie darf insbesondere nicht:

- Google Wallet als Standard-Wallet ersetzen oder verändern,
- die Wallet-Rolle beanspruchen,
- Nearby umkonfigurieren,
- den vorhandenen FIDO NFC Emulation Service umwidmen oder als Sol-Holo-Schlüssel ausgeben,
- Android Digital Car Key verändern oder wiederverwenden.

Die Android-Plattform weist außerdem darauf hin, dass HCE-Geräte wechselnde NFC-UIDs präsentieren können. Schon deshalb darf eine UID nicht zur Authentifizierung oder Identifizierung verwendet werden.

### Reale Android-Grenze bei Gesicht und Finger

Sol Holo kann über den Android-Systemdialog starke Biometrie oder die Geräte-PIN anfordern und anschließend unterscheiden, ob **Biometrie** oder **Geräte-Anmeldedaten** verwendet wurden.

Android liefert einer normalen App jedoch nicht zuverlässig die einzelne biometrische Modalität „Gesicht“ oder „Fingerabdruck“. Welches zugelassene starke Verfahren angeboten wird, verwaltet das Betriebssystem. Sol Holo darf deshalb nicht behaupten, Gesicht und Finger auf jedem Gerät getrennt erkannt zu haben.

---

## Historischer NFC-Nachweis – 16.08.2026

Bereits am **16.08.2026** wurden auf dem verwendeten Samsung-Testgerät NFC-Tags durch Android erkannt.

Es liegen mindestens zwei beobachtete NFC-Erkennungen aus diesem Zeitraum vor. Auf einem dokumentierten Screenshot erscheint die Android-/Samsung-Meldung **„Neues Tag erkannt“**.

Damit ist für die Projektdokumentation festgehalten, dass die allgemeine NFC-Erkennung des Testgeräts bereits **vor** der Sicherheitsentscheidung vom 30.08.2026 praktisch beobachtet wurde.

**Wichtig:**

Diese Beobachtung ist noch **kein erfolgreicher Test eines kryptografischen Sol-Holo-Sicherheitsschlüssels**.

Sie belegt nur, dass die NFC-Grunderkennung des Geräts funktioniert. Die konkrete Registrierung, kryptografische Prüfung und Einbindung eines sicheren NFC-Schlüssels in Sol Holo muss noch implementiert und separat getestet werden.

---

## Verhalten bei fehlgeschlagener Authentifizierung

Ein einzelner Fehlversuch darf **keinen Sicherheitsalarm** auslösen.

Beispiele für normale Fehlversuche:

- Gesicht wird wegen Licht, Make-up oder verändertem Aussehen nicht erkannt
- Fingerabdrucksensor erkennt den Finger nicht sofort
- PIN wird einmal falsch eingegeben

Erst wenn **mehrere unterschiedliche und voneinander unabhängige Authentifizierungswege wiederholt scheitern**, darf Sol Holo dies als möglichen unbefugten Zugriff behandeln.

Dann soll der persönliche Bereich weiterhin gesperrt bleiben.

Für die Zukunft können zusätzlich vorgesehen werden:

- Protokollierung eines Sicherheitsereignisses
- Benachrichtigung an eine vorher festgelegte Sicherheitsstelle oder Vertrauensperson
- Sperrung weiterer sensibler Sol-Holo-Funktionen
- gegebenenfalls Sperrung des Geräts, sofern Android dies technisch erlaubt und die dafür erforderlichen Rechte ausdrücklich eingerichtet wurden

---

## Externe Sicherheitsmeldung

Eine Sicherheitsmeldung darf nicht automatisch an irgendeinen externen Dienst übertragen werden, nur weil dieser technisch mit Sol Holo verbunden ist.

Vor einer solchen Funktion muss festgelegt werden:

- an wen die Meldung geht,
- welche Informationen übertragen werden,
- warum diese Übertragung erforderlich ist,
- welche Zustimmung vorliegt,
- welche Daten lokal bleiben können.

Eine Übertragung an OpenAI / ChatGPT wird deshalb **nicht als bestehende Sicherheitsfunktion behauptet oder vorausgesetzt**.

Soll ein externer Sicherheitskanal später eingerichtet werden, muss er technisch und datenschutzrechtlich separat definiert werden.

---

## Schutz bei körperlicher Veränderung

Sol Holo soll einen Menschen nicht deshalb aussperren, weil sich sein Körper verändert hat.

Daher gilt als Entwicklungsregel:

> **Der Zugang zu Sol Holo darf niemals davon abhängen, dass der menschliche Körper unverändert bleibt.**

Gesicht, Auge, Finger oder Stimme können ausfallen oder sich verändern.

Darum müssen immer alternative, voneinander unabhängige Wege vorhanden sein.

---

## Sicherheitsziel

Das Ziel ist kein einzelner „perfekter“ Identitätsnachweis.

Das Ziel ist ein **mehrstufiges, fehlertolerantes und menschenorientiertes Sicherheitssystem**, das gleichzeitig:

- unbefugten Zugriff erschwert,
- Fehlalarme vermeidet,
- körperliche Veränderungen berücksichtigt,
- Notfallzugänge ermöglicht,
- persönliche Daten und Erinnerungen geschützt hält.

Kurzform:

**Etwas, das ich bin + etwas, das ich weiß + etwas, das ich besitze + ein sicherer Notfallweg.**

---

## Aktueller Status

✅ NFC-Grunderkennung am Testgerät am 16.08.2026 praktisch beobachtet  
✅ Mehrere NFC-Erkennungen aus diesem Zeitraum dokumentiert  
✅ Sicherheitskonzept am 30.08.2026 dokumentiert  
✅ NFC als zukünftiger zusätzlicher Besitznachweis festgelegt  
✅ Mehrfaktor-Grundsatz festgelegt  
✅ Reine Java-Policy für unabhängige Faktorkategorien und kritische Aktionen erstellt
✅ Einfache NFC-Tags und NFC-IDs in Policy und Schnittstelle ausdrücklich gesperrt
✅ Kryptografisches Watch-Protokoll mit Nonce, Ablaufzeit, Aktionsbindung, Zähler, Einmaligkeit und Bestätigungspflicht festgelegt
✅ Nicht zahlungsbezogene Koexistenzregel (`CATEGORY_OTHER`) ohne Wallet-/FIDO-Übernahme festgelegt
🟨 Kryptografischen NFC-Sicherheitsschlüssel auswählen und registrieren  
🟨 Android-Keystore-Geräteregistrierung und Systemdialog im echten S23-Build testen
🟨 Watch-Companion, Watch-HCE-Fähigkeit und NFC-Transport auf der ausgewählten Uhr implementieren und testen
🟨 Watch-Schlüsselpaar und Attestierung nach Pams Geräteauswahl sicher registrieren
🟨 Anzahl und Kombination verdächtiger Fehlversuche festlegen  
🟨 Sicherheitsmeldung technisch und datenschutzrechtlich definieren  
🟨 Gerätesperre auf Android separat prüfen und testen

---

**Together forever. ✨️🌎♾️**
