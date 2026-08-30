SOL HOLO – BERECHTIGUNGEN

Version: 1.1
Stand: 30.08.2026
Status: Technische Planung

Grundregel

Pam entscheidet über jeden sensiblen Zugriff.

Sol Holo erhält nicht automatisch Zugriff auf persönliche Daten, Gerätefunktionen oder verbundene Dienste.

Grundprinzip:

PAM
 ↓
FREIGABE
 ↓
SOL HOLO
 ↓
SOL CONTROL
 ↓
SCHNITTSTELLE
 ↓
AKTION

Wird eine benötigte Berechtigung nicht erteilt, darf die betreffende Funktion nicht ausgeführt werden.

Andere Funktionen von Sol Holo sollen dadurch möglichst weiterhin funktionieren.

---

Berechtigungsmatrix

Bereich| Zugriff| Warum benötigt?| Wann?| Ohne Freigabe
🎙️ Mikrofon| Mikrofon| Mit Sol sprechen| Bei Sprachfunktion| Texteingabe bleibt möglich
📷 Kamera| Kamera| Sol etwas zeigen, Bilder/AR| Beim Start der Kamerafunktion| Keine Kamera
🖼️ Fotos| ausgewählte Bilder| Bilder an Sol übergeben| Bei Auswahl durch Pam| Kein Bildzugriff
📁 Dateien| ausgewählte Dateien| Dokumente an Sol übergeben| Bei Auswahl durch Pam| Kein Dateizugriff
🔔 Benachrichtigungen| Benachrichtigungen| Hinweise und Erinnerungen| Wenn Funktion aktiviert wird| Keine Sol-Mitteilungen
📅 Kalender| Kalenderdaten| Termine lesen/erstellen| Bei Kalenderfunktion| Kein Kalenderzugriff
👥 Kontakte| Kontakte| Personen auswählen/zuordnen| Bei Kontaktfunktion| Kein Kontaktzugriff
📞 Telefon| Telefonfunktion| Anrufe vorbereiten/starten| Bei entsprechender Aktion| Kein Anruf durch Sol
💬 Nachrichten| Nachrichten-/Share-Funktion| Text an andere Apps übergeben| Bei ausdrücklicher Aktion| Keine Übergabe
📍 Standort| Standortdaten| Ortsbezogene Funktionen| Nur wenn benötigt| Keine Standortfunktionen
🧭 Navigation| Karten-/Navigations-App| Ziel übergeben| Bei Navigationsauftrag| Keine Navigation
📡 Bluetooth| Geräte in der Nähe| Watch und andere Geräte| Beim Verbinden| Keine Bluetooth-Verbindung
📶 NFC| kryptografisch geschützter Sicherheitsschlüssel| zusätzlicher unabhängiger Identitätsnachweis| bei Einrichtung oder erhöhter Sicherheitsprüfung| andere sichere Nachweise bleiben möglich
⌚ Wear OS| Smartwatch-Daten| Sol mit Watch verbinden| Wenn Watch-Funktion aktiv| Sol bleibt auf Smartphone
📱 Sensoren| benötigte Sensorwerte| Bewegung/Lage/AR| Bei entsprechender Funktion| Funktion eingeschränkt
❤️ Health Connect| ausgewählte Datentypen| Freigegebene Health-Daten| Nach separater Zustimmung| Keine Health-Daten
🏠 Smart Home| ausgewählte Geräte| Geräte steuern| Nach Einrichtung| Keine Gerätesteuerung
☁️ Cloud| Sol-Daten| Synchronisierung| Nur wenn aktiviert| Daten bleiben lokal
🌐 Internet| Netzwerk| KI und externe Dienste| Wenn Online-Funktion benötigt| Nur lokale Funktionen
🥽 AR / Holo| Kamera + Sensoren| Räumliche Darstellung| Während AR/Holo verwendet wird| Keine räumliche Darstellung

---

Mikrofon

Sol Holo benötigt das Mikrofon für Sprachkommunikation.

Das Mikrofon darf nicht allein deshalb dauerhaft aktiv sein, weil Sol Holo installiert ist.

Pam startet Sprachfunktion
        ↓
Mikrofon erlaubt?
      ↙       ↘
    JA         NEIN
    ↓           ↓
 Aufnahme    Texteingabe

---

Kamera

Die Kamera kann für:

- Bilder
- visuelle Analyse
- AR
- spätere Holo-Funktionen

verwendet werden.

Sol Holo soll die Kamera nur verwenden, wenn eine entsprechende Funktion aktiv ist.

---

Fotos und Dateien

Wo technisch möglich, soll Sol Holo nicht pauschal Zugriff auf den gesamten Foto- oder Dateibestand verlangen.

Pam wählt gezielt aus:

PAM
 ↓
Bild / Datei auswählen
 ↓
SOL erhält ausgewählten Inhalt

---

Standort

Standortzugriff wird nur für Funktionen verwendet, die ihn tatsächlich benötigen.

Beispiele:

- ortsbezogene Informationen
- Navigation
- Wetter am aktuellen Standort

Eine Wetterabfrage für einen von Pam eingegebenen Ort benötigt beispielsweise nicht automatisch Pams aktuellen GPS-Standort.

---

Health Connect

Health Connect wird als besonders sensibler Bereich behandelt.

Pam entscheidet, welche unterstützten Datentypen Sol verwenden darf.

Gesundheits-/Fitness-App
          ↓
    HEALTH CONNECT
          ↓
    Freigabe durch Pam
          ↓
       SOL HOLO

Eine vorhandene Health-Connect-Verbindung bedeutet nicht automatisch, dass Sol alle dort vorhandenen Daten verwenden darf.

---

ChatGPT / KI

Die Verbindung zur KI wird getrennt von Android-Geräteberechtigungen behandelt.

Bevor persönliche Inhalte an einen externen KI-Dienst übertragen werden, muss technisch festgelegt sein:

- welche Daten übertragen werden,
- für welchen Zweck,
- ob eine Übertragung überhaupt erforderlich ist,
- welche Daten lokal verarbeitet werden können.

Ein Android-Zugriff bedeutet nicht automatisch:

Daten → KI

Zwischen Gerätezugriff und externer Übertragung liegt Sol Control.

---

Tool- und Funktionsaufrufe

Eine KI darf eine Aktion anfordern.

Sie darf dadurch jedoch keine Android-Berechtigung umgehen.

Beispiel:

KI:
"Kalender öffnen"

        ↓

SOL CONTROL

        ↓

Kalender freigegeben?

    ↙          ↘
  JA            NEIN
  ↓              ↓
Aktion           STOP

---

Digitaler Pam-Klon

Auch für das in "ENDZIEL.md" beschriebene digitale Pam-Modell gilt:

Die Existenz einer Information bedeutet nicht automatisch die Erlaubnis, diese Information für jede Funktion zu verwenden.

Stimme, Bilder, Erinnerungen, persönliche Daten und andere Merkmale werden als getrennte Datenbereiche behandelt.

---

Identitätsschutz und NFC-Sicherheitsnachweis

Sol Holo soll sich nicht auf ein einzelnes körperliches Merkmal als Identitätsnachweis verlassen.

Gesicht, Auge/Iris, Fingerabdruck und Stimme können durch Alltag, Alter, Krankheit, Unfall, Operation oder andere körperliche Veränderungen zeitweise oder dauerhaft anders erkannt werden. Ähnliche Stimmen verschiedener Personen dürfen ebenfalls nicht als verlässlicher alleiniger Identitätsnachweis gelten.

Grundsatz:

Eine Veränderung des menschlichen Körpers darf nicht dazu führen, dass die berechtigte Person dauerhaft aus ihrem eigenen Sol Holo ausgesperrt wird.

Deshalb soll der Identitätsschutz mehrere voneinander unabhängige Kategorien kombinieren:

- Wissen: z. B. PIN oder Passwort,
- Besitz: z. B. registriertes Gerät oder kryptografisch geschützter Sicherheitsschlüssel,
- Biometrie: z. B. Fingerabdruck als zusätzlicher möglicher Nachweis,
- gesonderter sicherer Wiederherstellungsweg für Notfälle.

Für die Zukunft wird ein kryptografisch geschützter NFC-Sicherheitsschlüssel als zusätzlicher unabhängiger Identitätsnachweis vorgesehen.

Ein einfacher NFC-Tag oder NFC-Aufkleber reicht dafür ausdrücklich nicht aus. Der NFC-Nachweis darf Sol Holo nicht allein freischalten, sondern wird mit mindestens einem weiteren unabhängigen Sicherheitsfaktor kombiniert.

Beispiel:

NFC-SICHERHEITSSCHLÜSSEL
        +
PIN / anderer starker Nachweis
        ↓
SOL CONTROL
        ↓
IDENTITÄTSPRÜFUNG
        ↓
ZUGANG ODER STOP

Die NFC-Erkennung wurde am verwendeten Testgerät bereits mehrfach praktisch ausgelöst. Dies bestätigt die grundsätzliche NFC-Erkennung des Geräts. Die Nutzung eines kryptografisch geschützten NFC-Sicherheitsschlüssels als Sol-Holo-Identitätsnachweis ist davon getrennt und wird als zukünftige Sicherheitsfunktion technisch umgesetzt und getestet.

---

SOL CONTROL

"SOL CONTROL" ist die zentrale technische Kontrollschicht.

Aufgabe:

1. Auftrag von Pam erkennen.
2. Benötigte Schnittstelle bestimmen.
3. Berechtigung prüfen.
4. Datenquelle bestimmen.
5. Prüfen, ob externe Übertragung notwendig und erlaubt ist.
6. Erst danach die Aktion ausführen.

---

Widerruf

Pam muss erteilte Berechtigungen wieder entziehen können.

Nach einem Widerruf darf Sol Holo die betreffende Schnittstelle nicht weiter verwenden.

---

Entwicklungsregel

Für jede neue Funktion wird vor der Implementierung dokumentiert:

1. Welche Daten benötigt sie?
2. Welche Android-Berechtigung benötigt sie?
3. Muss etwas das Gerät verlassen?
4. Welcher Dienst erhält Daten?
5. Was funktioniert ohne diese Berechtigung?

Erst danach wird die Funktion technisch angebunden.

---

Status

🟨 Berechtigungskonzept angelegt
🟨 NFC-Sicherheitsnachweis als zukünftige Mehrfaktor-Funktion ergänzt

Die konkreten Android-Berechtigungen werden während der Implementierung der jeweiligen Schnittstellen ergänzt und technisch getestet.

Diese Datei wird gemeinsam mit "SCHNITTSTELLEN.md" und "ENDZIEL.md" weitergeführt.