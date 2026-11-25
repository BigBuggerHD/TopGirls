# Sicherheit & Datenschutz

| Maßnahme | Umsetzung |
|---|---|
| Passwörter | Argon2id (m=19 MiB, t=2, p=1); Mindestanforderungen; konstante Antwortzeit bei unbekannten Konten |
| Sessions | 32-Byte-Zufallstoken, nur SHA-256-Hash in der DB; httpOnly, Secure (Prod), SameSite=Lax; 30 Tage gleitend; Beenden bei Passwort-Reset, Sperrung, Rollenwechsel |
| Brute Force | Rate Limits pro IP und E-Mail; Kontosperre nach 10 Fehlversuchen für 30 Minuten |
| CSRF | Server Actions (Next.js-Origin-Prüfung); Route Handler mit Origin-Check; SameSite-Cookies |
| XSS | React-Escaping, kein `dangerouslySetInnerHTML`; E-Mail-Vorlagen escapen; strenge Security-Header (CSP, X-Frame-Options, nosniff, Referrer-Policy, HSTS) |
| SQL-Injection | Prisma (parametrisiert); Raw-Queries ausschließlich als Tagged Templates |
| Eingaben | Zod-Validierung aller Formulare und APIs |
| Open Redirect | `safeRedirectPath()`; Werbe-Klicks nur zu internen Pfaden oder https-Zielen aus geprüften Buchungen |
| Uploads | Größenlimit, Magic Bytes, Pixel-Limit, Neu-Encodierung (Entfernung von EXIF/GPS), private Ablage, Auslieferung mit Zugriffsprüfung und `nosniff` |
| Zugriffskontrolle | RBAC (`src/lib/rbac.ts`) in allen Layouts, Actions und APIs; Eigentumsprüfung bei allen Objekten |
| Protokollierung | Audit-Log für Anmeldungen, Moderations- und Admin-Aktionen, Token-Buchungen, Datenexporte (IP nur als gekürzter, gesalzener Hash) |
| DSGVO | Datenexport (Art. 15/20), Kontolöschung mit Anonymisierung (Art. 17), Löschung von Ausweisdokumenten nach Prüfung, nur technisch notwendige Cookies, aggregierte Statistiken |
| Missbrauchsschutz | ID-/Altersprüfung, Einwilligungsnachweise, Meldeverfahren mit Priorität und Sofortdeaktivierung, Bild-Hash-Sperrliste, Inhaltsfilter, Blockieren in Nachrichten |

## Für den Produktivbetrieb

- Alle Secrets neu erzeugen; `PAYMENT_SANDBOX=false`.
- Rate Limiting auf Redis umstellen, `/api/cron` regelmäßig aufrufen (`CRON_SECRET`).
- S3-Bucket privat, serverseitige Verschlüsselung, Lifecycle für `private/`.
- Backups, Monitoring, Penetrationstest, nonce-basierte CSP.
- Verarbeitungsverzeichnis, DSFA (Art. 35 DSGVO – Art.-9-Daten!), AV-Verträge.
