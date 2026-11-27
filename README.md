# Top Girls – Premium-Anzeigenportal

Top Girls ist ein Anzeigen-, Werbe- und Plattformportal für volljährige Anbieterinnen, Agenturen, Clubs, Massagestudios und Apartmentanbieter – im Dark-Luxury-Design, vollständig auf Deutsch (de-DE, EUR, TT.MM.JJJJ, Europe/Berlin).

> **Wichtig:** Top Girls stellt ausschließlich technische Infrastruktur für Anzeigen, Werbung und Kontoverwaltung bereit. Die Plattform bietet selbst keine persönlichen Dienstleistungen an und vermittelt keine. Rechtstexte sind **Entwürfe** und müssen vor dem Produktivbetrieb juristisch geprüft werden – siehe [`docs/RECHTLICHES.md`](docs/RECHTLICHES.md).

## Funktionsumfang

| Bereich | Umsetzung |
|---|---|
| 18+-Altersabfrage | Bildschirmfüllend, **serverseitig** per Middleware mit HMAC-signiertem Cookie; schützt alle Seiten, direkte URLs, API und Bildauslieferung |
| Öffentliche Website | Startseite, Frauen, Online-Inserate, Clubs, Massagen, Suche, Marktplatz, Sedcards, Werbung & Preise, Rechtsseiten |
| Sedcards | 7-stufiger Assistent (Profildaten → Beschreibung → Bilder → Eigenschaften → Standort → Kontakt & Zeiten → Vorschau & Einreichen), Prüfung durch Moderation |
| Dynamische Filter | Admin legt Filter (Auswahl, Mehrfachauswahl, Ja/Nein, Zahlenbereich) an, ordnet sie Kategorien zu, sortiert/deaktiviert sie; Suche aktualisiert sich live über die URL |
| Werbesystem | Werbeflächen (Position, Kapazität, Token/Tag, Priorität), Bannerbuchungen mit Prüfung, Premium-Sedcards, Hervorhebungen, gesponserte Suchergebnisse, Laufzeitverlängerung |
| Token-System | Serverseitiges Guthaben mit atomaren Buchungen und unveränderlichem Transaktionsjournal |
| Zahlungen | Modulare Adapter: PayPal (offizielle REST API), Kreditkarte & Nextcoup (vorbereitete Platzhalter), Sandbox für lokale Tests; Webhook-Signaturprüfung, Idempotenz |
| Dashboards | Übersicht, Sedcards, Anzeigenverwaltung, Werbeplatzierungen, Token, Statistiken, Marktplatz, Nachrichten, Forum, Benachrichtigungen, Verifizierung, Zahlungen, Kontoeinstellungen |
| Marktplatz | Apartmentvermietung, Stellen Clubs/Massagestudios, Agenturangebote u. a. – mit Moderation |
| Forum & Nachrichten | Geschlossenes Forum mit Regeln und Inhaltsfilter gegen private Daten/Anschuldigungen, private Nachrichten mit Blockieren/Archivieren/Melden |
| Statistiken | Impressionen, Profilaufrufe, Kontaktklicks je Tag; Filter Tag/Woche/Monat/frei; Diagramme + Tabellenansicht |
| Adminbereich | Benutzer, Rollen, Sedcards, Bildprüfung, Alters-/ID-Prüfung, Meldungen, Sperrungen, Kategorien, Filter, Werbung, Produkte & Preise, Transaktionen, Zahlungen, Forum, Marktplatz, Statistiken, Audit-Protokoll, Systemeinstellungen |
| Schutzmaßnahmen | Identitätsprüfung vor Veröffentlichung, Einwilligungsnachweis bei Agenturprofilen, Meldeverfahren mit Priorisierung und Sofortdeaktivierung, Bild-Hash-Sperrliste, Inhaltsfilter (Minderjährigkeit, § 32 ProstSchG) |
| DSGVO | Datenexport (JSON), Kontolöschung mit Anonymisierung, Löschung von Ausweisdokumenten nach Prüfung, keine Tracking-Cookies, IP nur gehasht |

## Technologie

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui-Konventionen (Radix UI, CVA) · PostgreSQL · Prisma 6 · Argon2id · sharp · S3-kompatibler Speicher · Zod · Vitest · Playwright (E2E-Smoke-Test)

Architektur und Entscheidungen: [`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md)

## Installation

Voraussetzungen: Node.js ≥ 20.9, PostgreSQL ≥ 14.

```bash
npm install
cp .env.example .env    # Werte anpassen, Secrets mit `openssl rand -hex 32` erzeugen
```

Datenbank anlegen (Beispiel):

```bash
createuser -P topgirls && createdb -O topgirls topgirls
```

Migrationen ausführen und Demo-Daten einspielen:

```bash
npx prisma migrate deploy
npm run db:seed
```

## Start

```bash
npm run dev          # Entwicklung: http://localhost:3000
npm run build && npm start   # Produktion
```

Beim ersten Aufruf erscheint die Altersabfrage. E-Mails (Bestätigung, Passwort-Reset) werden ohne SMTP-Konfiguration in der Server-Konsole ausgegeben.

## Testkonten (nur lokale Entwicklung)

Passwort für alle Konten: **`TopGirls!2026`**

| E-Mail | Rolle |
|---|---|
| admin@topgirls.local | Administrator |
| moderator@topgirls.local | Moderator |
| agentur@topgirls.local | Mitglied (Beispiel Agentur: mehrere Sedcards, Guthaben, Werbebuchung) |
| anbieterin@topgirls.local | Mitglied (Beispiel Einzelanbieterin) |
| club@topgirls.local | Mitglied (Beispiel Club) |
| massage@topgirls.local | Mitglied (Beispiel Massagestudio) |
| apartment@topgirls.local | Mitglied (Beispiel Apartmentvermietung) |
| besucher@topgirls.local | Mitglied (ohne Sedcard) |
| neu@topgirls.local | Mitglied mit offener Identitätsprüfung |

Es gibt nur eine Kontoart („Mitglied“) für alle Nutzer; Admin und Moderator sind interne Team-Rollen.

Alle Demo-Daten sind frei erfunden; Profilbilder sind generierte abstrakte Grafiken (keine Fotos realer Personen).

## Tests

```bash
npm test             # Unit-Tests (Age-Gate-Signatur, RBAC, Inhaltsfilter, Validierung, Zahlungs-Webhooks)
npm run typecheck    # TypeScript
```

End-to-End-Smoke-Test (Playwright): siehe [`docs/TESTS.md`](docs/TESTS.md).

## SMS-Bestätigung testen

Ein SMS-Anbieter ist noch nicht angebunden. Lokal (`npm run dev`) erscheint der Bestätigungscode im Terminal und zusätzlich als Hinweis im Sedcard-Assistenten (Schritt 2 „Kontaktdaten“).

## Sandbox-Zahlung testen

1. Als `agentur@topgirls.local` anmelden → **Token-Guthaben**
2. Paket wählen, Zahlungsart „Testzahlung (Sandbox)“ → *Zahlungspflichtig bestellen*
3. Auf der simulierten Bezahlseite „Zahlung erfolgreich simulieren“ – die Gutschrift erfolgt über einen signierten Webhook.

## Weitere Dokumentation

- [`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md) – Aufbau, Datenmodell, Entscheidungen
- [`docs/ROLLEN.md`](docs/ROLLEN.md) – Rollen und Berechtigungen
- [`docs/ZAHLUNGEN.md`](docs/ZAHLUNGEN.md) – Zahlungsadapter, Webhooks, Integration neuer Anbieter
- [`docs/SICHERHEIT.md`](docs/SICHERHEIT.md) – Sicherheit & Datenschutz
- [`docs/RECHTLICHES.md`](docs/RECHTLICHES.md) – Rechtliche Einordnung, Risiken, offene Punkte
- [`docs/TESTS.md`](docs/TESTS.md) – Testanleitung
