Sol Holo – Android App

Projekt: Sol Holo
Anwendung: Sol Holo App für Android
Projektinhaberin / Entwicklung: Pamela Nitschke
Plattform: Android
Stand: 20.08.2026

Beschreibung der Sol Holo App

Die Sol Holo App ist die mobile Android-Benutzeroberfläche des Projekts Sol Holo.

Sie soll den direkten Zugang zu Sol Holo auf einem Android-Gerät ermöglichen und die verschiedenen Interaktionsformen von Sol innerhalb einer gemeinsamen mobilen Oberfläche zusammenführen.

Die Anwendung besteht dabei nicht lediglich aus einem statischen Chatfenster. Die aktuelle Entwicklung verbindet eine mobile Holo-Oberfläche mit dem Sol-Holo-Backend und enthält bereits technische Komponenten für Textkommunikation, Live-Sprachkommunikation, Audioausgabe, Langzeitgedächtnis und die visuelle Darstellung von Sol.

Aufbau der App

Die aktuelle Sol Holo App umfasst folgende Bereiche:

Textkommunikation

Die App stellt ein eigenes Texteingabefeld bereit.

Nachrichten werden von der App über den Endpunkt "/sol" an das Sol-Holo-Backend übertragen. Die Antwort von Sol wird anschließend innerhalb der App im Chatbereich dargestellt.

Aktueller Status: funktionsfähig.

Live-Sprachkommunikation

Die App enthält einen eigenen Mikrofon-/Live-Button.

Für die Live-Kommunikation ist eine WebRTC-basierte Sprachverbindung vorgesehen. Der App-Code fordert dafür über das Sol-Holo-Backend einen temporären Realtime-Schlüssel an und baut anschließend die Live-Audioverbindung auf.

Zusätzlich sind Mikrofonfunktionen mit Echo-Unterdrückung, Geräuschunterdrückung und automatischer Lautstärkeregelung vorgesehen.

Aktueller Status: implementiert, funktioniert im derzeitigen Android-App-Test jedoch noch nicht zuverlässig und muss korrigiert werden.

Visuelles Sol Holo

Die Android-App enthält einen eigenen Darstellungsbereich für das visuelle Holo von Sol.

Das Holo soll zentral innerhalb der Benutzeroberfläche über einer leuchtenden Holo-Basis dargestellt werden.

Zusätzlich enthält der aktuelle Entwicklungsstand bereits eine experimentelle Lip-Sync-Funktion. Dabei wird die Audioausgabe analysiert, um Mundbewegungen während Sols Sprachausgabe visuell zu erzeugen.

Aktueller Status: Die Holo-Darstellung ist integriert, das eigentliche Bild wird im aktuellen App-Stand jedoch nicht geladen und muss korrigiert werden.

Langzeitgedächtnis

Die App besitzt eine Anbindung an das Langzeitgedächtnis von Sol Holo.

Über das App-Menü kann eine Abfrage des dauerhaften Wissens von Sol ausgelöst werden.

Für Live-Unterhaltungen ist außerdem eine Verbindung zum Backend-Endpunkt "/live/memory" vorgesehen. Transkribierte Sprache kann dadurch auf Informationen geprüft werden, die für das Langzeitgedächtnis relevant sind.

Audio und Lautstärke

Die App enthält eine eigene Audioausgabe für Sols Live-Stimme.

Innerhalb der Benutzeroberfläche stehen drei Lautstärkestufen zur Verfügung:

- Stumm
- Leise
- Normal

Damit kann Sols Sprachausgabe direkt innerhalb der App geregelt werden.

Mobile Benutzeroberfläche

Die Oberfläche wurde speziell für die Nutzung auf einem Smartphone aufgebaut und enthält:

- Sol-Holo-Kopfbereich
- Online-Anzeige
- persönliche Begrüßung
- Holo-Darstellungsbereich
- Chatverlauf
- Texteingabe
- Senden-Button
- Mikrofon-/Live-Button
- Lautstärkesteuerung
- Seitenmenü
- Memory-Status
- Mikrofon-Status
- Chat-Status
- Lip-Sync-Status

Die Größe des Texteingabefeldes und des sichtbaren Chatbereichs ist im aktuellen Android-Test noch nicht ausreichend und wird angepasst.

Technische Struktur

Die aktuelle Android-App-Oberfläche verwendet HTML, CSS und JavaScript und kommuniziert mit dem separat betriebenen Sol-Holo-Backend.

Die Backend-Adresse wird innerhalb der App zentral verwendet, unter anderem für:

"/sol" – Textkommunikation mit Sol

"/realtime/token" – Vorbereitung der Live-Sprachverbindung

"/live/memory" – Verarbeitung von Informationen aus Live-Unterhaltungen für das Langzeitgedächtnis

Die App enthält außerdem eine Manifest-Datei und Service-Worker-Anbindung für die mobile App-/PWA-Struktur.

Aktueller Teststand

Funktioniert

- Android-Oberfläche startet.
- Sol Holo App wird auf dem Smartphone dargestellt.
- Verbindung zum Backend besteht.
- Schreiben mit Sol funktioniert.
- Sol antwortet im Chat.
- Grundlegende Bedienoberfläche funktioniert.

Noch zu korrigieren

- Das visuelle Holo-Bild von Sol wird aktuell nicht geladen.
- Mikrofon-/Live-Sprachfunktion funktioniert im aktuellen Teststand nicht.
- Texteingabefeld ist auf dem Smartphone zu klein.
- Chat-/Antwortbereich soll größer und besser lesbar werden.
- Live-Sprachfunktion und Lip-Sync müssen nach der Reparatur gemeinsam getestet werden.

Entwicklungsprinzip für die nächsten Versionen

Der bereits funktionierende Textchat bleibt als stabile Basis erhalten.

Neue Funktionen und Korrekturen sollen anschließend möglichst getrennt implementiert und getestet werden. Dadurch soll verhindert werden, dass Änderungen an Holo-Darstellung, Sprache oder Benutzeroberfläche bereits funktionierende Bestandteile der App beeinträchtigen.

Die nächste Entwicklungsphase konzentriert sich deshalb auf:

1. Holo-Darstellung,
2. Mikrofon und Live-Audio,
3. mobile Text- und Chatdarstellung,
4. anschließenden Gesamttest von Text, Sprache, Holo und Langzeitgedächtnis.

---

Projekt: Sol Holo
Produkt: Sol Holo App für Android
Projektinhaberin / Entwicklung: Pamela Nitschke
Technischer UI-Teststand: HOLO UI 004
Datum: 20.08.2026