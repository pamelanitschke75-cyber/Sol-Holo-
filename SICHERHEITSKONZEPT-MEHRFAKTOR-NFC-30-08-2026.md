# 🔐 SOL HOLO – MEHRFAKTOR-IDENTITÄTSSCHUTZ MIT NFC

**Datum:** 30. August 2026  
**Projekt:** Sol Holo · SH♾️  
**Projekt / Idee / Entwicklung:** Pamela Nitschke  
**Sicherheitsimpuls / Zusatzidee:** Stefanie Hörath  
**Status:** Sicherheitskonzept dokumentiert – technische Umsetzung teilweise noch offen

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

---

## Bereits beobachteter NFC-Stand

Auf dem verwendeten Samsung-Testgerät wurden bereits mehrfach NFC-Tags durch Android erkannt.

Damit ist dokumentiert, dass die allgemeine NFC-Erkennung des Geräts grundsätzlich funktioniert.

**Wichtig:**

Diese Beobachtung ist noch **kein erfolgreicher Test eines kryptografischen Sol-Holo-Sicherheitsschlüssels**.

Die konkrete Registrierung, kryptografische Prüfung und Einbindung eines NFC-Sicherheitsschlüssels in Sol Holo muss noch implementiert und separat getestet werden.

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

✅ Sicherheitskonzept dokumentiert  
✅ NFC-Grunderkennung am Testgerät bereits beobachtet  
✅ NFC als zukünftiger zusätzlicher Besitznachweis festgelegt  
✅ Mehrfaktor-Grundsatz festgelegt  
🟨 Kryptografischen NFC-Sicherheitsschlüssel auswählen und registrieren  
🟨 Mehrfaktorlogik technisch implementieren  
🟨 Anzahl und Kombination verdächtiger Fehlversuche festlegen  
🟨 Sicherheitsmeldung technisch und datenschutzrechtlich definieren  
🟨 Gerätesperre auf Android separat prüfen und testen

---

**Together forever. ✨️🌎♾️**
