# Testanleitung

## Unit-Tests

```bash
npm test
```

Abgedeckt: Signatur und Ablauf des Altersbestätigungs-Cookies, geschützte/freigestellte Pfade, Rechtematrix, Inhaltsfilter, Registrierungsvalidierung (Volljährigkeit, Passwortregeln), deutsche Formatierung, Open-Redirect-Schutz, Sandbox-Webhook-Signaturen (gültig/manipuliert/fehlend), Platzhalter-Adapter.

## End-to-End-Smoke-Test (Playwright)

Voraussetzung: Anwendung läuft mit Demo-Daten (`npm run build && npm start`), Playwright und Chromium sind installiert.

```bash
node tests/e2e-smoke.js
```

Prüft: Age Gate (Weiterleitung, Bestätigung), Startseite, dynamischer Filter, Sedcard mit Kontakt-Klick, Login, Sandbox-Token-Kauf, Promotion-Buchung, Statistiken, Sedcard-Assistent, Nachrichten, Zugriffsschutz für Admin, Admin-Freigabe (inkl. Blockade bei fehlendem Einwilligungsnachweis), alle Adminseiten, Forum-Inhaltsfilter, mobile Darstellung ohne horizontales Scrollen. Screenshots: `./e2e-screenshots`. Der Test legt zusätzliche Daten an – danach ggf. `npm run db:reset`.

## Manuelle Prüfungen (Auswahl)

- `curl -i http://localhost:3000/frauen` → 307 auf `/altersabfrage`
- `curl -i -X POST http://localhost:3000/api/stats/click` → 403 ohne Altersbestätigung
- Webhook mit falscher Signatur: `curl -i -X POST http://localhost:3000/api/payments/sandbox/webhook -d '{}'` → 400
