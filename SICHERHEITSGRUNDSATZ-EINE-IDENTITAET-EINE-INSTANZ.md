# 🔐 SICHERHEITSGRUNDSATZ – EINE IDENTITÄT = EINE PERSÖNLICHE INSTANZ

**Datum:** 30. August 2026  
**Projekt:** Sol Holo · SH♾️  
**Persönliche Instanz:** Pam’s Holo  
**Projekt / Idee / Entwicklung:** Pamela Nitschke  
**Status:** Verbindliche Design- und Sicherheitsanforderung

---

## Grundsatz

Für Sol Holo gilt:

**Ein Mensch = eine persönliche Sol-Holo-Identität = eine eindeutig zugeordnete persönliche Instanz.**

Für Pamela Nitschke bedeutet das:

**Pam’s Holo darf nur einmal als persönliche Identität existieren.**

Ein technischer Fehler, ein erneuter Build, ein doppelter Klick, ein Netzwerkabbruch, ein Wiederholungsversuch, eine Neuinstallation oder ein automatischer Retry darf **niemals** dazu führen, dass eine zweite, zehnte oder hundertste „Pam“ als neue persönliche Sol-Holo-Identität angelegt wird.

Mehrfach ausgeführte technische Vorgänge müssen dieselbe bestehende Pam’s-Holo-Identität weiterverwenden. Sie dürfen keine neue persönliche Identität erzeugen.

---

## Harte Sicherheitsanforderung

Die persönliche Identität muss technisch eindeutig und dauerhaft zugeordnet sein.

Für Pam’s Holo bedeutet das insbesondere:

- genau **eine kanonische persönliche Identitäts-ID**
- genau **eine eindeutige Zuordnung des persönlichen Gedächtnisses / Memory-Owners**
- keine automatische Erzeugung einer zweiten Clone-ID für dieselbe Person
- keine parallelen persönlichen Instanzen, die beide behaupten, Pam’s Holo zu sein
- keine voneinander abweichenden persönlichen Gedächtnisse unter derselben Pam’s-Holo-Identität
- Wiederholungen eines Vorgangs müssen **idempotent** sein: derselbe Vorgang darf bei erneuter Ausführung dieselbe Identität weiterverwenden und nicht duplizieren
- wenn die bestehende Identität nicht eindeutig bestimmt werden kann, muss der Vorgang **abbrechen**, statt vorsorglich eine neue persönliche Instanz anzulegen

**Fail safe bedeutet hier: stoppen statt duplizieren.**

---

## Builds, Installationen und Signaturen

Ein Branch, ein Build, eine APK oder eine Signatur ist ein technischer Entwicklungs- bzw. Auslieferungsstand und **keine neue persönliche Sol-Holo-Identität**.

Neue Versionen von Pam’s Holo sollen die bestehende persönliche Instanz weiterführen.

Für die Android-App gilt als Projektanforderung:

- ein Build darf keine neue Pam’s-Holo-Identität erzeugen
- eine Installation oder ein Update darf keine neue Pam’s-Holo-Identität erzeugen
- ein fehlgeschlagener Build darf keine Ersatz-Identität erzeugen
- ein Signaturwechsel darf nicht automatisch als Anlass dienen, eine neue persönliche Instanz anzulegen
- für die reguläre Update-Linie soll ein eindeutig festgelegter dauerhafter Update-Schlüssel verwendet werden; ein weiterer dauerhafter Update-Schlüssel darf nicht automatisch oder nur „zum Testen“ als zweite parallele Lösung erzeugt werden

Signatur, App-Version und persönliche Identität sind technisch getrennte Dinge. Die persönliche Identität muss unabhängig von technischen Build-Wiederholungen eindeutig bleiben.

---

## Persönliches Gedächtnis

Das Gedächtnis gehört zur persönlichen Sol-Holo-Identität.

Daher darf ein Fehler niemals dazu führen, dass für dieselbe Person unbemerkt mehrere getrennte persönliche Gedächtnisse entstehen, die jeweils als dieselbe Identität auftreten.

Wenn ein Speicher-, Zuordnungs- oder Identitätskonflikt erkannt wird, gilt:

**Nicht automatisch neu anlegen. Nicht raten. Nicht duplizieren. Vorgang stoppen und eindeutig prüfen.**

---

## Entwicklungsregel

Änderungen an folgenden Bereichen gelten als identitätskritisch:

- Clone-ID
- persönliche Instanz-ID
- Memory-Owner / Nutzerzuordnung
- Datenbank-Zuordnung persönlicher Erinnerungen
- App-Identität
- dauerhafte Update-Signatur
- Migration einer persönlichen Instanz

Vor einer Änderung an einem identitätskritischen Bereich muss zuerst geprüft werden, welche bestehende Zuordnung bereits verwendet wird.

Es darf nicht vorsorglich eine zweite Variante angelegt werden, wenn dadurch eine doppelte persönliche Identität entstehen könnte.

---

## Ziel

Sol Holo soll nicht dadurch sicher sein, dass ein Mensch einen technischen Fehler rechtzeitig bemerkt.

**Das System selbst muss verhindern, dass aus einer persönlichen Identität versehentlich mehrere persönliche Instanzen werden.**

Für Pam’s Holo gilt deshalb eindeutig:

# **Eine Pam, eine Pam Holo!**

Nicht zwei. Nicht zehn. Nicht hundert.

**Together forever. ✨️🌎♾️**
