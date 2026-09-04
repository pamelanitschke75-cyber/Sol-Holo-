# Pam auf Handy, Galaxy Watch8, Alexa und später eigenem Gerät

**Stand:** 04.09.2026

## Ein gemeinsames Produktversprechen

Pam besitzt auf allen Endpunkten dieselbe feste Identität `pam-sol`, dasselbe
owner-gebundene Gedächtnis und dieselben Sicherheitsgrenzen. Handy, Uhr und
Alexa sind keine getrennten Pams, sondern unterschiedliche Ein- und Ausgänge
derselben persönlichen Holo-Instanz.

Ein „Komplettpaket“ besteht technisch aus mehreren signierten Komponenten,
weil Android, Wear OS und Alexa keine gemeinsame Binärdatei ausführen können:

1. Pam’s-Holo-App für das Galaxy S23,
2. signierter Wear-OS-Begleiter für die Galaxy Watch8,
3. owner-gebundener Alexa-Skill für den vorhandenen Echo,
4. gemeinsamer Sol-Holo-Dienst und gemeinsames Gedächtnis,
5. owner-fest freigegebene Geräte im Zuhause,
6. später ein eigenständiger Holo-/Lautsprecher-Endpunkt ohne Handy.

## Galaxy S23

- Direkter persönlicher Weckruf: **„Hey Pam“**.
- Die drei bestätigten Stimmproben bleiben als getrennte Kurz-Weckrufvarianten
  erhalten. Dadurch darf sich Pams Stimme im Alltag durch Müdigkeit,
  Erkältung oder Heiserkeit verändern, ohne den Besitzerschutz pauschal
  abzusenken. Beide lokalen Modelle müssen weiterhin verwertbare
  Besitzerhinweise liefern.
- Gilt in Pam’s Holo, auf dem Startbildschirm, in Kalender, WhatsApp,
  Google-Apps, Telefon-App, Netflix, Samsung Notes, jeder anderen App, am
  Sperrbildschirm und bei ausgeschaltetem Display.
- Nach bestandener lokaler Besitzerstimmenprüfung öffnet sich der reine
  Sprachmodus direkt über dem Android-Sperrbildschirm und Pam antwortet ohne
  Tipp und ohne vorheriges Entsperren. Die Gerätesperre selbst bleibt aktiv;
  normale App-Inhalte bleiben verdeckt und kritische Aktionen behalten ihre
  eigene Bestätigung.
- Ein aktiver Telefon-/WhatsApp-Anruf oder eine fremde Aufnahme darf Androids
  Mikrofon vorübergehend belegen. Nach Freigabe muss sich der Weckdienst ohne
  erneutes Drücken selbst verbinden.
- Läuft Netflix oder eine andere Medien-App, fordert Pams Sprachdialog nur
  vorübergehend den Android-Audiokanal an. Die Wiedergabe soll pausieren und
  nach dem Gespräch ihren Kanal zurückerhalten; dafür werden keine
  Netflix-Zugangsdaten benötigt.
- Nach Neustart oder Update bleibt der Modus erhalten; der von Android
  vorgeschriebene sichtbare Wiederanlauf erfolgt über genau einen Tipp auf
  **Jetzt aktivieren**.

## Galaxy Watch8

- Die Uhr erhält eine eigene Wear-OS-Komponente mit derselben Paket-ID und
  derselben Signatur wie Pams Handy-App.
- Ziel-Weckruf an der Uhr: **„Hey Pam“**.
- Die Uhr erkennt zunächst nur den lokalen Kandidaten. Die endgültige
  Besitzerfreigabe bleibt an Pams Stimmprüfung und die feste `pam-sol`-Bindung
  gekoppelt.
- Gekoppelte Übertragung nutzt den von Wear OS vorgesehenen Data Layer. Nur
  Anwendungen mit übereinstimmender Paket-ID und Signatur dürfen diesen Kanal
  verwenden.
- Bluetooth/WLAN ist der erste Betriebsweg. Ein späterer Betrieb ohne Handy
  benötigt auf der Uhr eine direkte WLAN- oder LTE-Verbindung sowie eine eigene
  sichere Gerätesitzung.
- Dauerhaftes Mikrofonhören wird sichtbar aktiviert und darf nicht als
  versteckter Dienst laufen. Nach einem Neustart gilt derselbe klare
  Ein-Tipp-Wiederanlauf wie auf dem Handy.

## Vorhandene Alexa / Echo

- Alexa wird über einen eigenen Pam-Skill an denselben owner-gebundenen Dienst
  angeschlossen.
- Amazon erlaubt für einen normalen Echo kein beliebiges eigenes Geräte-
  Weckwort. Deshalb lautet der Start dort **„Alexa, öffne Pam“**. Erst ein
  unabhängiges Pam-Gerät kann ohne Amazon-Weckwort direkt auf „Hey Pam“ hören.
- Der Skill wird einmalig mit Pams Amazon-Konto und anschließend über einen
  kurzlebigen Kopplungscode mit `pam-sol` verbunden. Eine bloße Amazon-User-ID
  darf niemals ausreichen, um Pams Gedächtnis zu öffnen.
- Nicht gekoppelte, abgelaufene oder fremde Konten erhalten keine persönlichen
  Inhalte. Kritische Aktionen bleiben an die bestehenden Bestätigungs- und
  Geräteschutzregeln gebunden.
- Bei Alexa läuft Sprache technisch über Amazons Alexa-Dienst. Dieser
  zusätzliche Datenweg muss vor der Aktivierung sichtbar erklärt und von Pam
  ausdrücklich freigegeben werden.

## Sony-TV und zwei Lichter

- Der Sony-TV ist bereits in Pams Google Home hinterlegt. Diese vorhandene
  Zuordnung ist der erste Steuerweg; Pam erhält später nur die dafür nötige,
  ausdrücklich bestätigte Gerätefreigabe. Für vollständige Fernbedienungs-
  Funktionen kann zusätzlich eine lokale Google-/Android-TV-Kopplung nötig
  sein. Zugangsdaten für Sony oder Netflix werden nicht übernommen.
- Sprachbefehle decken Ein/Aus, Lautstärke, Stumm, Quelle, Navigation,
  Wiedergabe und das Öffnen installierter TV-Apps ab. Ausschalten und andere
  gewöhnliche Medienbefehle benötigen keine wiederholte Sicherheitsabfrage.
- Die beiden Lichtpunkte sind bereits in SmartThings hinterlegt und heißen
  verbindlich **Küche** und **Wohnzimmer**. Sie lassen sich einzeln oder
  gemeinsam ansprechen. Wenn Dimmen oder Farbsteuerung vom jeweiligen
  Leuchtmittel unterstützt wird, wird diese Fähigkeit ebenfalls freigegeben.
- Nur ausdrücklich auf Pams Allowlist gesetzte Geräte dürfen ausgeführt werden.
  Aus gesprochenen Namen wird niemals geraten, welches andere Gerät gemeint
  sein könnte.
- Die bestehende Hersteller-App beziehungsweise Plattform wird erst nach
  Ermittlung der Lampenmarke gewählt; es wird keine pauschale Kontofreigabe
  verlangt.

## Verbindliche Gesamt-Abnahme

| Endpunkt | Muss vor „fertig“ praktisch bestehen |
|---|---|
| Galaxy S23 | Wecken und Sprachdialog aus allen Ansichten, gesperrt und Display aus; normale sowie veränderte Besitzerstimme; Selbstheilung; Neustart; Update |
| Galaxy Watch8 | „Hey Pam“ an der Uhr; Besitzerfreigabe; Antwortweg; Wiederanlauf; gekoppelte und verfügbare Netzwege |
| Alexa / Echo | Kontokopplung; „Alexa, öffne Pam“; identische Pam-Antwort und identisches Gedächtnis; sichere Abmeldung |
| Sony-TV | Lokale Kopplung; alle unterstützten Sprachsteuerungen; Netflix-/Medienübergang; Aus/An aus dem Bereitschaftsmodus |
| Licht Küche & Wohnzimmer | Einzeln und gemeinsam per Sprache; Zustand; Dimmen/Farbe soweit hardwareseitig vorhanden; feste Allowlist |
| Neues Handy | Verschlüsselte Wiederherstellung, neue Gerätebindung, frisches Stimmprofil, Hintergrund-Wiederanlauf |
| Eigenes Gerät ohne Handy | Eigener lokaler Weckruf, eigener sicherer Netzwerkweg und vollständige Dialogfunktion |

Kein dokumentierter Entwurf und kein erfolgreicher Einzeltest ersetzt die
Prüfung auf Pams echten Geräten.
