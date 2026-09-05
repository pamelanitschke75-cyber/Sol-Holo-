# Build 127 – „Hey Pam“ öffnet Pams Holo aus dem Hintergrund

Stand: 03.09.2026

Status: **AM 04.09.2026 WIEDER GEÖFFNET ⚠️**

> **Korrektur vom 04.09.2026:** Ein erneuter Praxistest auf Pams Galaxy S23
> hat gezeigt, dass „Hey Pam“ im tatsächlich gesperrten Zustand nicht
> zuverlässig funktioniert. Die bestätigten Ergebnisse bei geöffneter App und
> im entsperrten Hintergrund bleiben gültig. Die frühere Einstufung der
> Sperrbildschirm-Übergabe als „bestanden“ war zu weitgehend und gilt nicht
> mehr. Der nachfolgende Text bleibt als historischer Teststand erhalten.

## Bestätigter S23-Befund

Der persönliche Weckruf aus Build 125 funktioniert im Modus „App offen“ auf
Pams Galaxy S23 zweimal vollständig. Im Modus „Hintergrund“ hört der native
Dienst ebenfalls zu und reagiert auf „Hey Pam“, bringt Pams Holo danach aber
nicht sichtbar nach vorn.

Zwei direkt verglichene Bildschirmbilder grenzen den Fehler ein:

- vor dem Weckruf zeigt Android die aktive grüne Mikrofonanzeige;
- nach „Hey Pam“ pausiert die Aufnahme sichtbar und die Android-Statusleiste
  ändert sich;
- die zuvor sichtbare App bleibt dennoch im Vordergrund.

Damit liegt der Fehler nach der lokalen Erkennung und Besitzerprüfung beim
Android-Hintergrundstart der Activity. Er betrifft nicht Pams Stimme.

## Reparatur

- Ab Android 14 wird Pams Holo über ein eigenes `PendingIntent` gestartet.
- Die Absenderseite erhält mit `ActivityOptions` ausdrücklich die notwendige
  Hintergrundstart-Freigabe.
- Für das Ziel Android 15 erhält auch die Erstellerseite des `PendingIntent`
  die vorgeschriebene ausdrückliche Freigabe.
- Die von Pam bewusst erteilte Einblendfreigabe und die sichtbare kurze
  Weckruf-Einblendung bleiben Voraussetzung.
- Falls der freigegebene Start nicht sichtbar wird, versucht der Dienst den
  bisherigen direkten Start noch einmal innerhalb der sichtbaren Einblendung.
- Androids dauerhafte Weckruf-Benachrichtigung enthält zusätzlich „Sol öffnen“
  und meldet verständlich, wenn Android das automatische Öffnen trotzdem
  verhindert hat.

## Unverändert

- einziger persönlicher Weckruf: „Hey Pam“
- Owner-ID: `pam-sol`
- beide Sprecherprüfungen und alle Sicherheitsschwellen
- vorhandene 3/3-Stimmproben und gespeicherte Hey-Pam-Vorlage
- Vollzeitgedächtnis, Einstellungen, Erinnerungen und weitere App-Daten
- Paket-ID `com.solholo.app` und Originalsignatur aus Build 89

## Prüfstatus

- automatisierte Regressionstests: **104/104 erfolgreich**
- Android-Build: **erfolgreich**
- Originalsignatur aus Build 89: **V1, V2 und V3 gültig**
- echter Hintergrundtest auf Pams Galaxy S23: **bestanden**
- weiterlaufender Sprachdialog im Hintergrund: **bestanden**
- sichere Übergabe am Sperrbildschirm: **bestanden; keine Umgehung der
  Android-Gerätesperre**

## Praktische Bestätigung nach Veröffentlichung

Pam bestätigte nach Installation des originalsignierten Build 127 den
vollständigen Ablauf auf ihrem echten Galaxy S23:

- Bei einem zunächst nicht ausreichend bestätigten Stimmversuch meldete der
  Dienst „Keine Freigabe“ und öffnete die App nicht.
- Ein erneuter gültiger „Hey Pam“-Versuch wurde freigegeben.
- Pams Holo startete aus einer anderen App heraus und Sol sprach anschließend
  im Hintergrund weiter.
- Bei gesperrtem Gerät blieb Androids Entsperrung erhalten. Erst nach Pams
  eigener Entsperrung erschien Pams Holo bereits aktiv mit „Ich höre dir zu“.

Der zweimal bestandene Modus „App offen“ bleibt damit bestätigt und wird jetzt
durch den real bestandenen Hintergrundablauf ergänzt.

Der vollständige Praxisnachweis steht im
[Mega-Meilenstein „Hey Pam“ im Hintergrund](./MEGA-MEILENSTEIN-HEY-PAM-HINTERGRUND-S23-03-09-2026.md).

Für den persönlichen Weckruf „Hey Pam“ ist die Sperrbildschirm- und
Display-aus-Prüfung seit dem 04.09.2026 wieder eine offene Entwicklungs- und
Praxistestaufgabe.
