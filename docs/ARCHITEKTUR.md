# Architektur – Top Girls

## Überblick

```
Browser ──► Middleware (18+-Prüfung, signiertes Cookie) ──► Next.js App Router
                                                            ├─ Server Components (Seiten, Datenabfragen)
                                                            ├─ Server Actions (alle Schreiboperationen, mit RBAC + Zod)
                                                            └─ Route Handler (/api: Age-Gate, Medien, Webhooks, Export, Klicks, Cron)
                                                                   │
                                     PostgreSQL (Prisma) ◄─────────┤
                                     Objektspeicher (lokal / S3) ◄─┘
```

## Verzeichnisstruktur

```
prisma/              Schema, Migrationen, Seed (fiktive Demo-Daten)
src/middleware.ts    Serverseitige Altersabfrage für alle Seiten und APIs
src/app/(gate)/      Altersabfrage, Sperrseite (ohne Header/Footer)
src/app/(site)/      Öffentliche Seiten, (auth), dashboard/, admin/, forum/, marktplatz/
src/app/api/         age-gate, media, payments/[provider]/webhook, payments/paypal/return,
                     stats/click, ads/[id]/click, account/export, cron
src/actions/         Server Actions je Domäne (auth, profiles, billing, messages, forum, marketplace, account, admin, report)
src/lib/             db, auth/, rbac, age-gate, tokens, payments/, storage/, stats, content-filter,
                     validation, settings, mail, audit, rate-limit, housekeeping, format, labels
src/components/      ui/ (shadcn-Stil), layout/, profiles/, dashboard/, admin/, billing/, forum/, …
tests/               Vitest-Unit-Tests, Playwright-Smoke-Test
```

## Wichtige Entscheidungen

| Thema | Entscheidung | Begründung |
|---|---|---|
| Authentifizierung | Eigene, datenbankgestützte Sessions (Token nur als SHA-256-Hash gespeichert), Argon2id | Volle Kontrolle, sofortiger Widerruf (Sperrung beendet alle Sitzungen), keine Fremdabhängigkeit |
| Age Gate | HMAC-signiertes, httpOnly-Cookie, geprüft in der Edge-Middleware und zusätzlich in `/api/media` | Kein Umgehen per JavaScript oder Direkt-URL; ohne JS nutzbar (Formular-POST) |
| Schreiboperationen | Server Actions mit Zod-Validierung und Rechteprüfung | Next.js prüft Origin (CSRF-Schutz), keine öffentlichen Schreib-APIs |
| Token-Guthaben | `UPDATE … WHERE tokenBalance >= n` + Journal in einer Transaktion; eindeutige `reference` | Kein negatives Guthaben bei Parallelität, idempotent |
| Promotion-Sortierung | Denormalisierte Felder `premiumUntil`, `highlightUntil`, `sponsoredUntil` am Profil; Historie in `Promotion` | Schnelle Sortierung per Index statt Join |
| Ablauf von Laufzeiten | `runHousekeeping()` gedrosselt bei Seitenaufrufen + `/api/cron` | Kein separater Worker nötig; für Produktion Cron empfohlen |
| Statistiken | Tageszähler je Profil (`ProfileStatDaily`), Batch-Upsert | DSGVO-freundlich (keine Einzelereignisse/IP), performant |
| Bilder | Magic-Byte-Prüfung, Neu-Encodierung (EXIF/GPS entfernt), WebP + Thumbnail, privat gespeichert, Auslieferung nur über `/api/media` mit Status-Prüfung | Schutz vor Schadinhalten, Datenlecks und Veröffentlichung ungeprüfter Bilder |
| UI-Komponenten | shadcn/ui-Konventionen (Radix, CVA, `components.json`), lokal gepflegt | Registry im Build-Umfeld nicht erreichbar; Komponenten sind identisch strukturiert und per CLI erweiterbar |
| Rate Limiting | In-Memory-Sliding-Window | Für Mehrinstanzbetrieb gegen Redis austauschen (gleiche Schnittstelle) |
| Rollen | Statische Rechtematrix im Code (`src/lib/rbac.ts`) | Versioniert, testbar, nicht per UI versehentlich aushebelbar |

## Datenmodell (Kurzfassung)

- **User**, **Session**, **AuthToken**, **IdentityVerification**
- **Category**, **FilterDefinition**, **FilterOption**, **FilterCategory**
- **Profile** (Sedcard), **ProfileImage**, **ProfileAttribute**, **ProfileAttributeOption**, **ProfileStatDaily**
- **PremiumProduct**, **Promotion**, **AdPlacement**, **AdBooking**
- **TokenPackage**, **TokenTransaction**, **Payment**, **WebhookEvent**
- **MarketplaceCategory**, **MarketplaceListing**
- **Conversation**, **ConversationParticipant**, **Message**, **Notification**
- **ForumCategory**, **ForumThread**, **ForumPost**
- **Report**, **AuditLog**, **Setting**

Vollständig: `prisma/schema.prisma`, Migration: `prisma/migrations/`.

## Veröffentlichungsablauf einer Sedcard

1. Entwurf im Assistenten → 2. Checkliste (Bild, Beschreibung, Kontakt, E-Mail bestätigt, Konto verifiziert, ggf. Einwilligungsnachweis) → 3. Erklärungen (Volljährigkeit, Freiwilligkeit, Bildrechte, Rechtskonformität) → 4. Status *In Prüfung* → 5. Moderation prüft Text, Bilder, Nachweise → *Veröffentlicht* (Laufzeit gem. Einstellungen) oder *Abgelehnt/Gesperrt* mit Begründung.
Inhaltliche Änderungen an veröffentlichten Sedcards führen erneut in die Prüfung; neue Bilder werden einzeln freigegeben.

## Bekannte Grenzen / nächste Schritte

- Zertifizierte Altersverifikation (AVS) und automatisierte Bild-/Dokumentenprüfung sind nicht integriert (manuelle Prüfung).
- Kreditkarten- und Nextcoup-Adapter sind Platzhalter (keine erfundenen APIs) – siehe `docs/ZAHLUNGEN.md`.
- Rechnungsstellung (PDF-Rechnungen) ist nicht integriert und in der Oberfläche entsprechend gekennzeichnet.
- CSP verwendet `'unsafe-inline'` für Skripte (Next.js-Inline-Skripte); für höhere Härtung nonce-basierte CSP einführen.
- Echtzeit-Benachrichtigungen (WebSocket) nicht umgesetzt; Nachrichten aktualisieren sich beim Neuladen.
