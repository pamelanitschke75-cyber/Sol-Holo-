# SOL HOLO – RECHTLICHE, ORGANISATORISCHE UND TECHNISCHE PROJEKTDOKUMENTATION

**Dokumentstatus:** Arbeits- und Prüfstand  
**Stand:** 14.08.2026  
**Projektbezeichnung:** Sol Holo  
**Projektverantwortliche / Projektleitung:** Pam  
**Projektphase:** Entwicklung und technischer Prototyp

> Dieses Dokument dient der nachvollziehbaren technischen, organisatorischen und rechtlichen Projektdokumentation.
>
> Es stellt keine abschließende Rechts- oder Steuerberatung dar.
> Rechtlich oder steuerlich relevante Sachverhalte werden vor einer entsprechenden öffentlichen oder kommerziellen Nutzung erforderlichenfalls fachlich geprüft.

---

## 1. Projektgegenstand

„Sol Holo“ bezeichnet ein unabhängig entwickeltes und KI-unterstütztes Software-, KI- und Avatar-Projekt.

Ziel ist die technische Verbindung einer KI-basierten Kommunikationskomponente mit einer digitalen visuellen Repräsentation einschließlich Sprachausgabe, Lippenanimation und perspektivisch weiteren Formen digitaler Interaktion.

Innerhalb der Projektarchitektur werden folgende Bezeichnungen verwendet:

**Pam**  
Reale Person, Projektverantwortliche und Projektleitung. Soweit ausdrücklich freigegeben, dient Pam außerdem als persönliche Vorlage für bestimmte Bestandteile der digitalen Repräsentation, insbesondere Stimme und äußere Darstellung.

**Sol**  
KI- und Kommunikationsebene des Projekts. Sol verarbeitet innerhalb der vorgesehenen Architektur Kommunikation und erzeugt KI-basierte Antworten.

**Sol Holo**  
Digitale sichtbare bzw. audiovisuelle Repräsentations- und Interaktionsebene des Projekts.

Diese Rollen werden technisch und dokumentarisch voneinander unterschieden.

---

## 2. Projektverantwortung

Projektleitung und Projektverantwortung liegen bei Pam.

Die technische Entwicklung erfolgt teilweise unter Nutzung und mit Unterstützung KI-basierter Werkzeuge und externer Softwaretechnologien.

Die Verwendung externer KI-, Hosting-, Sprach-, Avatar- oder Entwicklungsdienste bedeutet nicht, dass deren Anbieter Mitentwickler, Geschäftspartner, Sponsor, Investor, Auftraggeber oder Mitinhaber von Sol Holo sind.

Eine solche Beziehung wird nur dann angenommen oder öffentlich dargestellt, wenn tatsächlich eine entsprechende Vereinbarung besteht.

---

## 3. Entwicklungsgrundsatz

Sol Holo soll technisch nachvollziehbar, rechtlich verantwortungsvoll und langfristig wartbar entwickelt werden.

Dabei gelten insbesondere folgende Grundsätze:

- keine unnötige Anzahl externer Anbieter
- keine falschen Angaben gegenüber Dienstleistern
- keine Umgehung technischer oder vertraglicher Zugangsbeschränkungen
- Beachtung von Lizenz- und Nutzungsbedingungen
- Schutz geheimer API-Zugangsdaten
- Dokumentation relevanter Einwilligungen
- Beachtung von Persönlichkeits-, Bild- und Stimmrechten
- Prüfung datenschutzrechtlicher Anforderungen
- klare Trennung eigener Projektarbeit von Technologien Dritter
- erneute Prüfung relevanter Bedingungen vor öffentlicher oder kommerzieller Nutzung

Eine technische Funktion wird nicht allein deshalb eingesetzt, weil sie technisch möglich ist.

Vor ihrer endgültigen Integration wird geprüft, ob sie unter den für Sol Holo geltenden Bedingungen zulässig und sinnvoll eingesetzt werden kann.

---

## 4. Derzeitige externe Anbieter und Technologien

### 4.1 OpenAI

**Anbieter:** OpenAI  
**Verwendeter Dienst:** OpenAI API / OpenAI-Modelle

**Funktion innerhalb des aktuellen Prototyps:**

- KI-Verarbeitung
- Verarbeitung von Benutzereingaben
- Erzeugung der inhaltlichen Antworten von Sol
- Bereitstellung der KI-Funktion über eine serverseitige API-Anbindung

OpenAI-Technologien sind externe Technologien.

OpenAI-Modelle, OpenAI API und zugehörige Dienste werden nicht als Eigenentwicklung von Sol Holo bezeichnet.

Für die Nutzung gelten die jeweils anwendbaren aktuellen Vertragsbedingungen, Nutzungsrichtlinien und technischen Vorgaben von OpenAI.

---

### 4.2 Render

**Anbieter:** Render Services, Inc.  
**Verwendeter Dienst:** Render Web Service / Cloud Hosting

**Funktion innerhalb des aktuellen Prototyps:**

- Hosting des Node.js-/Express-Backends
- Ausführung serverseitiger Programmlogik
- Bereitstellung des öffentlichen HTTPS-Endpunkts
- Verwaltung serverseitiger Environment Variables

Render ist externer Hosting-/Cloud-Dienstleister.

Die Verwendung von Render begründet keine Partnerschaft, Beteiligung, Finanzierung, Unterstützung oder Mitinhaberschaft an Sol Holo.

---

### 4.3 Avatar SDK / MetaPerson

**Technologie / Produkt:** Avatar SDK / MetaPerson / LiveSpeak  
**Anbieter:** Itseez3D

**Funktion innerhalb des derzeitigen Prototyps:**

- Darstellung des 3D-Avatars
- Avatar-Integration
- Sprachausgabe innerhalb des aktuellen Testaufbaus
- LipSync / Lippenanimation
- audiovisuelle Darstellung von Sol Holo

Avatar SDK, MetaPerson, LiveSpeak und die zugrunde liegenden Avatar-, Sprach- und Animationsfunktionen sind externe Technologien.

Diese Technologien werden nicht als Eigenentwicklung von Sol Holo beansprucht.

---

## 5. Grundsatz zur Anzahl externer Anbieter

Die technische Architektur von Sol Holo soll möglichst übersichtlich bleiben.

Der derzeitige Kern besteht aus:

- OpenAI – KI/API
- Render Services, Inc. – Backend-Hosting
- Itseez3D / Avatar SDK / MetaPerson – Avatar-/Darstellungstechnologie

Zusätzliche Anbieter werden nur eingebunden, wenn eine benötigte Funktion mit der bestehenden Struktur technisch, rechtlich oder wirtschaftlich nicht sinnvoll umgesetzt werden kann.

Grundsatz:

**So wenige externe Anbieter wie möglich und nur so viele wie technisch erforderlich.**

Eine unnötige Abhängigkeit von zahlreichen Drittanbietern soll vermieden werden.

---

## 6. Aktuelle technische Architektur

Der erfolgreich getestete Prototyp verwendet derzeit folgende Verarbeitungskette:

Pam / Benutzereingabe  
↓  
Sol-Holo-Frontend  
↓  
HTTPS POST `/sol`  
↓  
Sol-Holo-Backend  
↓  
OpenAI API  
↓  
generierte KI-Antwort von Sol  
↓  
Sol-Holo-Backend  
↓  
Sol-Holo-Frontend  
↓  
MetaPerson / LiveSpeak  
↓  
Text-to-Speech  
↓  
LipSync  
↓  
3D-Avatar / Sol Holo

Der vollständige End-to-End-Durchlauf wurde am 14.08.2026 praktisch erfolgreich getestet.

---

## 7. Aktuell nachgewiesene Funktionen

Folgende Bestandteile wurden im aktuellen Prototyp praktisch getestet:

- mobiles Sol-Holo-Frontend: ✅
- Node.js-/Express-Backend: ✅
- Render-Deployment: ✅
- öffentliche HTTPS-Erreichbarkeit: ✅
- Endpunkt `/sol`: ✅
- serverseitige OpenAI-API-Anbindung: ✅
- Verarbeitung der Benutzereingabe: ✅
- OpenAI API → Backend: ✅
- Backend → Frontend: ✅
- sichtbare Sol-Antwort: ✅
- Übergabe an MetaPerson LiveSpeak: ✅
- Text-to-Speech: ✅
- hörbare Sprachausgabe: ✅
- LipSync: ✅
- sichtbare Lippenbewegung des 3D-Avatars: ✅
- End-to-End-Verarbeitung: ✅

Der bestehende funktionsfähige Prototyp soll bei der Untersuchung neuer Funktionen nicht unnötig verändert oder destabilisiert werden.

Neue Komponenten sollen nach Möglichkeit zunächst getrennt geprüft und anschließend kontrolliert integriert werden.

---

## 8. Abgrenzung eigener Projektarbeit und externer Technologie

Als eigene Projektarbeit werden insbesondere dokumentiert:

- Projektkonzeption
- Definition der Sol-Holo-Systemarchitektur
- Auswahl und Kombination geeigneter Schnittstellen
- Aufbau und Anpassung des Frontends
- Aufbau und Konfiguration des Backends
- serverseitige API-Integration
- Verbindung der KI-Antwort mit der Avatar-Verarbeitung
- eigene Entwicklungsentscheidungen
- Durchführung praktischer Tests
- Fehleranalyse
- technische Dokumentation
- Definition weiterer Entwicklungsziele

Nicht als Eigenentwicklung beansprucht werden insbesondere:

- OpenAI-Modelle
- OpenAI API
- Render-Infrastruktur
- Avatar SDK
- MetaPerson
- LiveSpeak
- externe TTS-Technologien
- externe LipSync-Technologien
- sonstige Software, Modelle, Bibliotheken oder Dienste Dritter

Aus der Auswahl oder Kombination vorhandener Technologien wird derzeit keine Aussage über

- Patentfähigkeit
- Schutzfähigkeit
- Exklusivität
- Erfindungshöhe
- weltweite Neuheit

abgeleitet.

Eine entsprechende rechtliche oder technische Bewertung müsste gegebenenfalls gesondert erfolgen.

---

## 9. Schutz von API-Zugangsdaten

Geheime Zugangsdaten werden nicht absichtlich im öffentlich ausgelieferten Frontend gespeichert.

Insbesondere soll der OpenAI-API-Key nicht als Klartext gespeichert werden in:

- `index.html`
- clientseitigem JavaScript
- öffentlich zugänglichen GitHub-Dateien
- öffentlich abrufbarer Dokumentation

Der OpenAI-API-Key wird im derzeitigen Aufbau serverseitig als Environment Variable verarbeitet.

Die öffentliche Anwendung kommuniziert mit dem eigenen Sol-Holo-Backend.

Das Backend übernimmt die authentifizierte Kommunikation mit der OpenAI API.

Damit werden öffentliche Benutzeroberfläche und geheime API-Authentifizierung grundsätzlich voneinander getrennt.

---

## 10. Entwicklungsziel: eigene Stimme von Pam

Sol Holo soll perspektivisch Antworten mit einer autorisierten synthetischen Repräsentation von Pams eigener Stimme ausgeben können.

Angestrebte Verarbeitungskette:

Sol / KI-Antwort  
↓  
Textantwort  
↓  
autorisierte synthetische Stimme von Pam  
↓  
Audioausgabe  
↓  
LipSync  
↓  
Sol Holo

Eine beliebige Standard-TTS-Stimme soll langfristig nicht zwingend die endgültige Stimme von Sol Holo darstellen.

---

## 11. Einwilligung zur Verwendung von Pams Stimme

Pam hat ausdrücklich zugestimmt, ihre eigene Stimme als Quelle bzw. Vorlage für eine autorisierte digitale oder synthetische Stimme innerhalb des Projekts Sol Holo zu verwenden.

Diese projektbezogene Zustimmung ersetzt keine zusätzlichen gesetzlichen, technischen oder vertraglichen Anforderungen eines verwendeten Dienstleisters.

Soweit ein Anbieter beispielsweise

- eine gesonderte Einwilligung,
- eine Consent-Aufnahme,
- eine Sprecherverifikation,
- eine Identitätsprüfung,
- eine Sprachprobe,
- eine Voice-ID,
- eine besondere Freischaltung oder
- besondere Lizenzbedingungen

verlangt, werden diese Anforderungen separat geprüft und gegebenenfalls erfüllt.

Technische oder vertragliche Schutz- und Verifikationsmechanismen sollen nicht umgangen werden.

---

## 12. OpenAI Custom Voices – aktueller Prüfstand

Die Möglichkeit zur Verwendung einer eigenen synthetischen Stimme über OpenAI wurde untersucht.

Im derzeit verwendeten OpenAI-API-Projekt sind reguläre TTS-Stimmen verfügbar.

Eine eigene Custom Voice von Pam ist derzeit nicht als auswählbare Stimme eingerichtet.

Nach der zum Dokumentationszeitpunkt verfügbaren OpenAI-Dokumentation ist die Custom-Voice-Funktion nur für hierfür berechtigte Kunden bzw. Organisationen verfügbar.

Die konkreten Voraussetzungen für einen Custom-Voice-Zugang für das Projekt Sol Holo sind daher noch zu klären.

Aus der derzeitigen Zugangsbeschränkung wird ausdrücklich NICHT abgeleitet, dass

- eine Gewerbeanmeldung automatisch zur Freischaltung führt,
- eine geschäftliche E-Mail-Adresse automatisch zur Freischaltung führt,
- ein bestimmtes kostenpflichtiges Abonnement automatisch zur Freischaltung führt,
- ein bestimmter API-Umsatz automatisch zur Freischaltung führt oder
- eine Zahlung einen Anspruch auf Custom-Voice-Zugang begründet.

Vor organisatorischen oder finanziellen Maßnahmen sollen die tatsächlichen Voraussetzungen geprüft werden.

**Status:** Zugang / Berechtigung noch zu klären ⏳

---

## 13. Consent-Aufnahme und Sprachprobe

Für die mögliche spätere Erstellung einer autorisierten synthetischen Stimme wurde die erforderliche Vorgehensweise untersucht.

Eine Consent-Aufnahme von Pam wurde für den weiteren Prüf- und Entwicklungsprozess vorbereitet.

Consent-Aufnahme und eigentliche Sprachprobe sind als unterschiedliche Bestandteile zu behandeln, soweit der jeweilige Anbieter dies verlangt.

Eine für einen bestimmten Anbieter erstellte Einwilligungsaufnahme wird nicht automatisch an einen anderen Anbieter übertragen oder dort als ausreichende Einwilligung behandelt.

Jeder eingesetzte Anbieter muss hinsichtlich seiner eigenen Anforderungen gesondert geprüft werden.

---

## 14. Alternative Voice-Technologien

Falls OpenAI für den vorgesehenen Anwendungsfall keine geeignete Custom-Voice-Lösung bereitstellen kann oder der erforderliche Zugang nicht verfügbar ist, kann ein spezialisierter externer Voice-Dienst geprüft werden.

Ein zusätzlicher Anbieter wird jedoch nicht allein deshalb integriert, weil Voice Cloning technisch möglich ist.

Vor der Auswahl sind mindestens folgende Punkte zu prüfen:

1. vollständige Identität des Vertragspartners
2. aktuelle Nutzungsbedingungen
3. zulässige Nutzung der eigenen Stimme
4. erforderliche Einwilligungs- und Verifikationsverfahren
5. Rechte an hochgeladenen Sprachaufnahmen
6. Rechte an erzeugten synthetischen Stimmen
7. Rechte an erzeugten Audiodateien
8. kommerzielle Nutzungsrechte
9. Datenschutzbedingungen
10. Speicherfristen
11. Löschmöglichkeiten
12. Verwendung der Daten zu Trainingszwecken
13. Unterauftragsverarbeiter
14. mögliche Drittlandübermittlungen
15. gegebenenfalls Auftragsverarbeitung
16. Kündigungsbedingungen
17. Exportmöglichkeiten
18. technische Kompatibilität mit MetaPerson / Sol Holo
19. API-Verfügbarkeit
20. Kosten und langfristige Anbieterabhängigkeit

Erst nach dieser Prüfung soll eine Entscheidung getroffen werden.

---

## 15. Persönlichkeits-, Bild- und Stimmrechte

Eigene Bild-, Stimm- und Persönlichkeitsmerkmale von Pam werden ausschließlich im Rahmen der von Pam freigegebenen Nutzung verwendet.

Für entsprechende Merkmale anderer realer Personen müssen erforderliche Rechte und Einwilligungen gesondert vorliegen.

Die Zustimmung einer Person zur Nutzung ihres Bildes bedeutet nicht automatisch die Zustimmung zur Nutzung oder synthetischen Nachbildung ihrer Stimme.

Die Zustimmung zur Stimme bedeutet umgekehrt nicht automatisch eine Zustimmung zur Verwendung des Bildes oder anderer persönlicher Merkmale.

Anbieterbezogene Verifikations- und Einwilligungsanforderungen bleiben unabhängig davon bestehen.

---

## 16. Personenbezogene Daten und Datenschutz

Bei der weiteren Entwicklung von Sol Holo können personenbezogene Daten verarbeitet werden.

Hierzu können insbesondere gehören:

- Name
- Stimme
- Sprachaufnahmen
- Bildaufnahmen
- Videoaufnahmen
- Gesichts- oder Avatarinformationen
- Texteingaben
- Kommunikationsinhalte
- technische Verbindungsdaten
- Nutzungsdaten

Vor einer öffentlichen oder kommerziellen Bereitstellung soll geprüft werden, welche datenschutzrechtlichen Rollen und Pflichten insbesondere nach der DSGVO und anderen anwendbaren Vorschriften bestehen.

Zu prüfen sind gegebenenfalls insbesondere:

- Verantwortlichkeit
- Rechtsgrundlage der Verarbeitung
- Einwilligungen
- Informationspflichten
- Datenschutzerklärung
- Zweckbindung
- Datenminimierung
- Speicherfristen
- Löschkonzept
- technische und organisatorische Maßnahmen
- Auftragsverarbeitungsverträge
- Unterauftragsverarbeiter
- Drittlandübermittlungen
- Betroffenenrechte
- Sicherheitsmaßnahmen
- mögliche besondere Anforderungen bei biometrischen oder vergleichbar sensiblen Verarbeitungen

Eine abschließende datenschutzrechtliche Einordnung wird durch dieses Dokument nicht vorgenommen.

---

## 17. Synthetische Stimme und Transparenz

Vor einer öffentlichen oder kommerziellen Verwendung einer synthetischen Stimme wird geprüft, welche gesetzlichen, vertraglichen und anbieterbezogenen Transparenz- oder Kennzeichnungspflichten zum jeweiligen Zeitpunkt gelten.

Eine synthetische Stimme soll nicht dazu verwendet werden, Dritte über die Identität eines tatsächlich sprechenden Menschen irrezuführen.

Die Verwendung synthetischer Medien soll entsprechend den jeweils anwendbaren gesetzlichen und vertraglichen Anforderungen transparent erfolgen.

---

## 18. Gewerbliche und kommerzielle Nutzung

Sol Holo befindet sich derzeit in einer Entwicklungs- und Testphase.

Eine spätere öffentliche und wirtschaftliche Nutzung ist grundsätzlich vorgesehen bzw. denkbar.

Vor Beginn einer tatsächlichen gewerblichen oder sonstigen kommerziellen Tätigkeit sollen insbesondere geprüft werden:

- gewerberechtliche Einordnung
- steuerliche Einordnung
- Abgrenzung zu gegebenenfalls freiberuflicher Tätigkeit
- geeignete Rechtsform
- Gewerbeanmeldung, soweit erforderlich
- steuerliche Erfassung
- geschäftliche Kontaktstruktur
- eigene Domain
- geschäftliche E-Mail-Adresse
- Impressumspflichten
- Datenschutzerklärung
- Verbraucherrecht, soweit anwendbar
- Vertragsbedingungen gegenüber Nutzern oder Kunden
- Lizenzbedingungen aller eingesetzten Anbieter
- kommerzielle Nutzungsrechte
- Marken- und Kennzeichenrechte
- Haftungsfragen
- gegebenenfalls Versicherungsbedarf

Pam ist grundsätzlich bereit, eine Gewerbeanmeldung vorzunehmen, sofern dies aufgrund der tatsächlichen zukünftigen Tätigkeit erforderlich oder sinnvoll wird.

Eine Gewerbeanmeldung soll jedoch nicht lediglich vorgenommen werden, um technische oder vertragliche Zugangsvoraussetzungen eines Drittanbieters scheinbar zu erfüllen.

---

## 19. Geschäftliche E-Mail-Adresse und professionelle Struktur

Falls für die spätere professionelle Nutzung von Sol Holo eine geschäftliche E-Mail-Adresse erforderlich oder sinnvoll wird, soll eine nachvollziehbare geschäftliche Struktur eingerichtet werden.

Mögliches zukünftiges Schema:

`kontakt@<zukünftige-sol-holo-domain>`

Eine geschäftliche E-Mail-Adresse wird nicht als Ersatz für eine tatsächlich erforderliche gewerbliche, steuerliche oder gesellschaftsrechtliche Struktur betrachtet.

Umgekehrt begründet allein die Einrichtung einer Domain oder einer entsprechenden E-Mail-Adresse nicht automatisch eine bestimmte rechtliche Unternehmensform.

Die konkrete Struktur wird eingerichtet, wenn der tatsächliche Projektstatus dies rechtfertigt.

---

## 20. Angaben gegenüber Drittanbietern

Gegenüber externen Dienstleistern sollen ausschließlich zutreffende Angaben gemacht werden.

Insbesondere sollen keine unzutreffenden Angaben gemacht werden über:

- Unternehmensstatus
- Unternehmensbezeichnung
- Rechtsform
- Mitarbeiterzahl
- Umsatz
- geschäftliche Tätigkeit
- Identität
- Rechteinhaberschaft
- Einwilligungen
- Verwendungszweck

Falls später eine geschäftliche Struktur für Sol Holo eingerichtet wird, können Anbieteraccounts entsprechend den jeweiligen Anforderungen aktualisiert oder neu eingerichtet werden.

---

## 21. Geistiges Eigentum

Vor einer kommerziellen Veröffentlichung sollen insbesondere folgende Punkte geprüft werden:

- Rechte am eigenen Quellcode
- Rechte an KI-unterstützt erstelltem Quellcode
- Rechte an verwendeten Bibliotheken
- Open-Source-Lizenzen
- Rechte an Grafiken
- Rechte an Bildern
- Avatar-Lizenzen
- Rechte an Sprachaufnahmen
- Rechte an synthetischen Audioausgaben
- Rechte an verwendeten Namen
- Rechte an Logos
- Domainrechte
- sonstige Rechte Dritter

Die Herkunft wesentlicher externer Technologien soll nachvollziehbar dokumentiert bleiben.

---

## 22. Projektname „Sol Holo“ und Kennzeichenrechte

Vor einer geschäftlichen Nutzung des Namens „Sol Holo“ soll geprüft werden, ob ältere Marken-, Unternehmenskennzeichen-, Namens- oder sonstige relevante Rechte Dritter bestehen.

Eine entsprechende Recherche kann insbesondere nationale, europäische und – soweit für die geplante Nutzung relevant – internationale Register umfassen.

Erst anschließend soll entschieden werden, ob eine Markenanmeldung sinnvoll ist.

Die derzeitige Verwendung der Bezeichnung „Sol Holo“ innerhalb der Entwicklungsdokumentation stellt keine Behauptung dar, dass

- bereits eine Marke eingetragen wurde,
- ein ausschließliches Kennzeichenrecht besteht oder
- keine älteren Rechte Dritter existieren.

---

## 23. Unternehmens- und Rechtsform

Falls Sol Holo kommerzialisiert wird, soll vor der endgültigen Unternehmensstruktur geprüft werden, welche Rechtsform für die tatsächliche Tätigkeit geeignet ist.

Dabei können unter anderem relevant sein:

- Umfang der wirtschaftlichen Tätigkeit
- Haftungsrisiken
- erwartete Umsätze
- Investitionsbedarf
- Vertragspartner
- steuerliche Auswirkungen
- Verwaltungsaufwand
- mögliche Beschäftigte oder Partner
- Schutz des privaten Vermögens

Eine konkrete Rechtsform wird mit diesem Dokument noch nicht festgelegt.

---

## 24. Anbieterbedingungen

Vertrags-, Datenschutz-, Lizenz- und Nutzungsbedingungen externer Anbieter können sich ändern.

Daher gilt:

Eine einmal vorgenommene Prüfung wird nicht als dauerhaft gültig behandelt.

Eine erneute Prüfung soll insbesondere erfolgen:

- vor Integration eines neuen wesentlichen Anbieters
- vor Einführung einer eigenen synthetischen Stimme
- vor öffentlicher Bereitstellung
- vor kommerzieller Nutzung
- vor wesentlichen Änderungen der technischen Architektur
- bei erkennbaren Änderungen der Anbieterbedingungen

Das Datum wesentlicher Prüfungen soll dokumentiert werden.

---

## 25. Veröffentlichung und Transparenz

Bei einer späteren öffentlichen Nutzung soll transparent zwischen folgenden Rollen unterschieden werden:

**Pam**  
reale Person und Projektverantwortliche

**Sol**  
KI-/Kommunikationskomponente

**Sol Holo**  
digitale Repräsentations- und Interaktionsebene

**OpenAI**  
externer KI-/API-Anbieter

**Render Services, Inc.**  
externer Hosting-Anbieter

**Itseez3D / Avatar SDK / MetaPerson**  
externe Avatar-/Darstellungstechnologie

Gegebenenfalls zukünftig eingesetzte weitere Anbieter werden entsprechend dokumentiert.

Es soll kein irreführender Eindruck entstehen, dass ein externer Anbieter

- Mitentwickler,
- Geschäftspartner,
- Sponsor,
- Investor,
- Eigentümer,
- Auftraggeber oder
- offizieller Unterstützer

von Sol Holo ist, sofern tatsächlich keine entsprechende Vereinbarung besteht.

---

## 26. Schutz des bestehenden Systems

Der derzeit funktionierende Sol-Holo-Prototyp soll während weiterer Entwicklungsarbeiten erhalten bleiben.

Neue Komponenten werden nach Möglichkeit zunächst separat getestet.

Erst nach erfolgreichem Test erfolgt ihre Integration in die bestehende Verarbeitungskette.

Insbesondere die Integration einer eigenen synthetischen Stimme soll nicht dazu führen, dass der bereits funktionierende KI-, Backend-, TTS- und LipSync-Ablauf ohne vorherige Sicherung ersetzt wird.

---

## 27. Aktueller technischer und organisatorischer Prüfstatus

Sol-Holo-Frontend:                              ✅ FUNKTIONSFÄHIG

Node.js-/Express-Backend:                       ✅ FUNKTIONSFÄHIG

Render-Hosting:                                 ✅ FUNKTIONSFÄHIG

öffentliche HTTPS-Verbindung:                   ✅ FUNKTIONSFÄHIG

OpenAI-API-Verbindung:                          ✅ FUNKTIONSFÄHIG

serverseitige API-Key-Verarbeitung:             ✅ EINGERICHTET

Sol / KI-Textantwort:                           ✅ FUNKTIONSFÄHIG

MetaPerson / Avatar:                            ✅ FUNKTIONSFÄHIG

TTS:                                            ✅ FUNKTIONSFÄHIG

LipSync:                                        ✅ FUNKTIONSFÄHIG

sichtbare Lippenbewegung:                       ✅ FUNKTIONSFÄHIG

End-to-End-Prototyp:                            ✅ ERFOLGREICH GETESTET


Pams eigene autorisierte Stimme:                ⏳ IN PRÜFUNG

Consent-Aufnahme:                               ✅ VORBEREITET

OpenAI-Custom-Voice-Zugang:                     ⏳ ZUGANG ZU KLÄREN

alternativer Voice-Anbieter:                    ⏳ NICHT AUSGEWÄHLT

Voice-Modell:                                   ⏳ OFFEN

Voice-ID:                                       ⏳ OFFEN

Integration eigene Stimme:                      ⏳ OFFEN

End-to-End-Test mit eigener Stimme:             ⏳ OFFEN


Gewerbeanmeldung:                               ⏳ DERZEIT NICHT ENTSCHIEDEN

Rechtsform:                                     ⏳ OFFEN

geschäftliche Domain:                           ⏳ NOCH NICHT EINGERICHTET

geschäftliche E-Mail-Adresse:                   ⏳ NOCH NICHT EINGERICHTET

steuerliche Struktur:                           ⏳ VOR KOMMERZIALISIERUNG ZU PRÜFEN

Datenschutzprüfung öffentliche Nutzung:         ⏳ AUSSTEHEND

Lizenzprüfung kommerzielle Nutzung:             ⏳ AUSSTEHEND

Marken-/Kennzeichenprüfung „Sol Holo“:          ⏳ AUSSTEHEND

---

## 28. Professionalisierungsplan

Falls Sol Holo von der Entwicklungsphase in eine professionelle bzw. kommerzielle Phase übergeht, ist derzeit folgende grundsätzliche Vorgehensweise vorgesehen:

1. konkreten zukünftigen Verwendungszweck definieren
2. wirtschaftliches Nutzungsmodell definieren
3. rechtliche Einordnung der Tätigkeit prüfen
4. steuerliche Einordnung prüfen
5. erforderlichenfalls Gewerbe anmelden
6. geeignete Rechtsform festlegen
7. erforderlichenfalls steuerliche Registrierung durchführen
8. geschäftliche Domain einrichten
9. geschäftliche E-Mail-Struktur einrichten
10. Anbieteraccounts gegebenenfalls auf die professionelle Struktur abstimmen
11. Verträge und Anbieterbedingungen erneut prüfen
12. Datenschutzstruktur festlegen
13. erforderliche Auftragsverarbeitungsverhältnisse prüfen
14. Impressum und Datenschutzerklärung vorbereiten
15. kommerzielle Nutzungsrechte sämtlicher Komponenten prüfen
16. Marken-/Kennzeichenprüfung durchführen
17. Rechte an Stimme, Bild und Avatar vollständig dokumentieren
18. Sicherheitsprüfung durchführen
19. technische Produktionsumgebung testen
20. erst anschließend öffentliche bzw. kommerzielle Bereitstellung

Die Reihenfolge kann aufgrund tatsächlicher gesetzlicher, steuerlicher oder vertraglicher Anforderungen angepasst werden.

---

## 29. Prüfprinzip für zukünftige Technologien

Vor Integration einer neuen wesentlichen Technologie wird künftig folgende Reihenfolge angewendet:

### Schritt 1 – Bedarf

Welche konkrete Funktion wird benötigt?

### Schritt 2 – Technische Prüfung

Kann die vorhandene Architektur die Funktion bereits bereitstellen?

### Schritt 3 – Anbieterprüfung

Falls ein zusätzlicher Anbieter notwendig ist:

Wer ist der tatsächliche Vertragspartner?

### Schritt 4 – Vertragsprüfung

Welche aktuellen Nutzungs-, Lizenz- und Vertragsbedingungen gelten?

### Schritt 5 – Datenschutzprüfung

Welche Daten werden verarbeitet und wohin übertragen?

### Schritt 6 – Rechteprüfung

Bestehen die erforderlichen Rechte und Einwilligungen?

### Schritt 7 – Wirtschaftliche Prüfung

Ist die geplante Nutzung privat, experimentell, öffentlich oder kommerziell?

### Schritt 8 – Integration

Erst nach Abschluss der erforderlichen Prüfungen wird die Technologie integriert.

### Schritt 9 – Test

Die Integration wird praktisch getestet.

### Schritt 10 – Dokumentation

Ergebnis, Anbieter, Version, Datum und relevante Entscheidungen werden dokumentiert.

---

## 30. Verbindlicher Projektgrundsatz

Für die weitere Entwicklung von Sol Holo gilt:

**Erst Bedarf bestimmen.**

**Dann technische Möglichkeit prüfen.**

**Dann Anbieter und tatsächlichen Vertragspartner identifizieren.**

**Dann aktuelle Vertrags-, Lizenz- und Datenschutzbedingungen prüfen.**

**Dann erforderliche Rechte und Einwilligungen klären.**

**Dann gegebenenfalls wirtschaftliche und rechtliche Struktur herstellen.**

**Erst danach technisch integrieren.**

**Dann praktisch testen.**

**Dann das Ergebnis dokumentieren.**

**Vor öffentlicher oder kommerzieller Nutzung erneut prüfen.**

Es werden keine Anbieterbedingungen absichtlich umgangen.

Es werden keine geschäftlichen Tatsachen erfunden.

Es werden keine Rechte Dritter als eigene beansprucht.

Geheime Zugangsdaten werden nicht absichtlich öffentlich gespeichert.

Externe Technologien werden als externe Technologien dokumentiert.

Eigene Entwicklungsarbeit wird von Leistungen externer Anbieter getrennt dargestellt.

Eine spätere professionelle oder kommerzielle Struktur wird eingerichtet, wenn der tatsächliche Projektstatus und die geplante Nutzung dies erfordern.

---

## 31. Ziel der Dokumentation

Ziel dieser Dokumentation ist es, die Entwicklung von Sol Holo so nachvollziehbar festzuhalten, dass zu einem späteren Zeitpunkt insbesondere

- technische Fachleute,
- Rechtsanwälte,
- Datenschutzberater,
- Steuerberater,
- Behörden,
- mögliche Vertragspartner und
- andere fachlich Beteiligte

erkennen können:

- wie das System technisch aufgebaut wurde,
- welche externen Technologien eingesetzt werden,
- wer für das Projekt verantwortlich ist,
- welche Rechte und Einwilligungen dokumentiert wurden,
- welche Prüfungen bereits erfolgt sind,
- welche Punkte noch offen sind,
- und welche Entscheidungen zu welchem Entwicklungsstand getroffen wurden.

Dieses Dokument ist eine fortlaufende Projektdokumentation.

Es wird bei wesentlichen technischen, organisatorischen, rechtlichen oder wirtschaftlichen Änderungen aktualisiert.

---

## 32. Dokumentationsstand

**Stand:** 14.08.2026

**Projektphase:** Entwicklungs- und Testphase

**End-to-End-Prototyp:** erfolgreich funktionsfähig

**Aktueller nächster Schwerpunkt:** Prüfung und spätere Integration einer autorisierten synthetischen Repräsentation von Pams eigener Stimme.

**Kommerzialisierung:** noch nicht begonnen

**Gewerbliche Struktur:** noch nicht abschließend festgelegt

**Rechtliche Detailprüfung vor kommerzieller Veröffentlichung:** vorgesehen