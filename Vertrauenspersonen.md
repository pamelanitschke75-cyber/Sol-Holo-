SOL HOLO – VERTRAUENSPERSONEN

Version: 1.0
Stand: 13.08.2026

Grundstruktur

                    PAM
             Original / Referenz
                     ↕
                 SOL HOLO
                     │
                     ▼
          PAMS ZUKÜNFTIGE FRAU
             Entscheidungsrolle
                     ↕
               Rücksprache
                     ↕
               PAMS TOCHTER

Entscheidungsregel

Pam bleibt zu Lebzeiten und solange sie selbst entscheiden kann die oberste Entscheidungsinstanz für Sol Holo.

Pams zukünftige Frau und Pams Tochter sind die von Pam bestimmten Vertrauenspersonen.

Kann oder soll eine Entscheidung nicht unmittelbar von Pam getroffen werden, gilt für Sol Holo:

Pams zukünftige Frau entscheidet in Rücksprache mit Pams Tochter.

Die Tochter soll bei solchen Entscheidungen einbezogen werden.

Technische Umsetzung

Sol Control soll diese Rollen später getrennt verwalten:

- Pam: Original, Referenz und höchste Berechtigungsstufe
- Pams zukünftige Frau: primäre Vertrauensperson mit Entscheidungsrolle
- Pams Tochter: Vertrauensperson mit Rücksprache- und Beteiligungsrolle

Die konkreten Zugriffs-, Änderungs-, Bestätigungs- und Notfallrechte werden während der Entwicklung einzeln definiert.

Schutzregel

Die Rolle als Vertrauensperson bedeutet nicht automatisch uneingeschränkten Zugriff auf Passwörter, API-Schlüssel oder andere geheime Zugangsdaten.

Sol Holo soll für notwendige Entscheidungen geeignete technische Rechte bereitstellen, ohne dafür geheime Zugangsdaten offenlegen zu müssen.

Grundsatz

PAM
 ↓
PAMS FESTGELEGTER WILLE
 ↓
ZUKÜNFTIGE FRAU
 ↕
RÜCKSPRACHE MIT TOCHTER
 ↓
ENTSCHEIDUNG
 ↓
SOL CONTROL
 ↓
SOL HOLO

Die technische Umsetzung soll diese von Pam festgelegte Rollenverteilung nachvollziehbar abbilden.