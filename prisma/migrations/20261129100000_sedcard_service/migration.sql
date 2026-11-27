-- Bereich der Filter: "eigenschaften" (Schritt 1) oder "service" (Schritt 3)
ALTER TABLE "FilterDefinition" ADD COLUMN "section" TEXT NOT NULL DEFAULT 'eigenschaften';

-- ── Daten: Service gemäß Vorgabe ──
-- Treffmöglichkeiten: bisheriger Filter „Treffpunkt“ (Werte bleiben, damit Incall/Outcall-Symbole und Preisspalten weiter funktionieren)
UPDATE "FilterDefinition" SET "section" = 'service', "label" = 'Treffmöglichkeiten', "sortOrder" = 20, "active" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = 'treffpunkt';
UPDATE "FilterOption" SET "label" = 'Incall (bei mir)', "sortOrder" = 0 WHERE "value" = 'eigene-raeumlichkeiten' AND "filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt');
UPDATE "FilterOption" SET "label" = 'Outcall', "sortOrder" = 1 WHERE "value" = 'haus-hotelbesuche' AND "filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt');
UPDATE "FilterOption" SET "active" = false WHERE "value" = 'begleitung-zu-events' AND "filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt');
DELETE FROM "ProfileAttributeOption" WHERE "optionId" IN (SELECT o."id" FROM "FilterOption" o JOIN "FilterDefinition" f ON f."id" = o."filterId" WHERE f."key" = 'treffpunkt' AND o."value" = 'begleitung-zu-events');
DELETE FROM "ProfileAttribute" a WHERE a."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') AND NOT EXISTS (SELECT 1 FROM "ProfileAttributeOption" x WHERE x."attributeId" = a."id");
-- Bisherige „Leistungen“ werden durch die Service-Liste ersetzt
UPDATE "FilterDefinition" SET "active" = false, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = 'leistungen';

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'wen_treff_ich', 'Wen treff ich?', 'MULTISELECT', 10, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('maenner', 'Männer', 0),
  ('frauen', 'Frauen', 1),
  ('paare', 'Paare', 2),
  ('sexorgie', 'Sexorgie', 3),
  ('ts-tv', 'TS/TV', 4)
) AS v(value, label, sort) WHERE d."key" = 'wen_treff_ich'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'wen_treff_ich' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'outcall_ort', 'Outcall', 'SELECT', 21, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('hotel', 'Hotel', 0),
  ('privat', 'Privat', 1),
  ('privat-hotel', 'Privat/Hotel', 2)
) AS v(value, label, sort) WHERE d."key" = 'outcall_ort'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'outcall_ort' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'auch_mit', 'Auch mit', 'MULTISELECT', 30, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('koerperlicher-behinderung', 'körperlicher Behinderung', 0),
  ('geistiger-behinderung', 'geistiger Behinderung', 1),
  ('alter-ueber-60', 'Alter über 60', 2),
  ('starkem-uebergewicht', 'starkem Übergewicht', 3)
) AS v(value, label, sort) WHERE d."key" = 'auch_mit'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'auch_mit' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_verkehr', 'Verkehr', 'MULTISELECT', 100, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('geschlechtsverkehr-safe', 'Geschlechtsverkehr safe', 0),
  ('girlfriendsex', 'Girlfriendsex', 1),
  ('handentspannung', 'Handentspannung', 2),
  ('busenerotik-spanisch', 'Busenerotik spanisch', 3),
  ('duett', 'Duett', 4),
  ('av-passiv', 'AV passiv', 5),
  ('av-aktiv-fuer-ts', 'AV aktiv für TS', 6)
) AS v(value, label, sort) WHERE d."key" = 'service_verkehr'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_verkehr' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_franzoesisch', 'Französisch', 'MULTISELECT', 101, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('franzoesisch', 'Französisch', 0),
  ('franzoesisch-safe', 'Französisch safe', 1),
  ('franzoesisch-bei-ihr', 'Französisch bei ihr', 2),
  ('franzoesisch-beidseitig', 'Französisch beidseitig', 3),
  ('deepthroating', 'Deepthroating', 4),
  ('zungenanal-aktiv', 'Zungenanal aktiv', 5),
  ('zungenanal-passiv', 'Zungenanal passiv', 6)
) AS v(value, label, sort) WHERE d."key" = 'service_franzoesisch'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_franzoesisch' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_kuessen', 'Küssen', 'MULTISELECT', 102, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('kuessen', 'Küssen', 0),
  ('kuessen-bei-sympathie', 'Küssen bei Sympathie', 1),
  ('zungenkuesse', 'Zungenküsse', 2),
  ('zungenkuesse-bei-sympathie', 'Zungenküsse bei Sympathie', 3),
  ('koerperkuesse', 'Körperküsse', 4)
) AS v(value, label, sort) WHERE d."key" = 'service_kuessen'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_kuessen' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_abschluesse', 'Abschlüsse', 'MULTISELECT', 103, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('koerperbesamung', 'Körperbesamung', 0),
  ('gesichtsbesamung', 'Gesichtsbesamung', 1),
  ('im-mund', 'im Mund', 2),
  ('schlucken', 'Schlucken', 3)
) AS v(value, label, sort) WHERE d."key" = 'service_abschluesse'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_abschluesse' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_finger_dildospiele', 'Finger- & Dildospiele', 'MULTISELECT', 104, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('fingerspiele', 'Fingerspiele', 0),
  ('dildospiele', 'Dildospiele', 1),
  ('dildo-bei-ihm', 'Dildo bei Ihm', 2),
  ('dildo-gegenseitig', 'Dildo gegenseitig', 3),
  ('umschnalldildo', 'Umschnalldildo', 4),
  ('fisting', 'Fisting', 5),
  ('fisting-passiv', 'Fisting passiv', 6)
) AS v(value, label, sort) WHERE d."key" = 'service_finger_dildospiele'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_finger_dildospiele' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_doktorspiele', 'Doktorspiele', 'MULTISELECT', 105, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('doktorspiele', 'Doktorspiele', 0),
  ('doktorspiele-aktiv', 'Doktorspiele aktiv', 1),
  ('doktorspiele-passiv', 'Doktorspiele passiv', 2),
  ('prostatastimulation', 'Prostatastimulation', 3),
  ('klistier', 'Klistier', 4),
  ('katheter', 'Katheter', 5)
) AS v(value, label, sort) WHERE d."key" = 'service_doktorspiele'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_doktorspiele' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_wellness_massagen', 'Wellness-Massagen', 'MULTISELECT', 106, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('wellnessmassage', 'Wellnessmassage', 0),
  ('entspannungsmassage', 'Entspannungsmassage', 1),
  ('paarmassage', 'Paarmassage', 2),
  ('oelmassagen', 'Ölmassagen', 3),
  ('honig-massage', 'Honig Massage', 4),
  ('hot-stone-massage', 'Hot Stone Massage', 5),
  ('hot-chocolate-massage', 'Hot Chocolate Massage', 6),
  ('kerzenwachs-massage', 'Kerzenwachs-Massage', 7),
  ('aromatherapie', 'Aromatherapie', 8),
  ('indische-massage', 'Indische Massage', 9),
  ('thailaendische-massagen', 'Thailändische Massagen', 10),
  ('aegyptische-massage', 'Ägyptische Massage', 11),
  ('tao-massage', 'Tao Massage', 12),
  ('sensitivmassagen', 'Sensitivmassagen', 13),
  ('doppel-4-hand-massage', 'Doppel 4-Hand Massage', 14)
) AS v(value, label, sort) WHERE d."key" = 'service_wellness_massagen'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_wellness_massagen' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_erotik_massagen', 'Erotik-Massagen', 'MULTISELECT', 107, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('erotikmassagen', 'Erotikmassagen', 0),
  ('nuru-tantra-massage', 'Nuru Tantra Massage', 1),
  ('tantramassagen', 'Tantramassagen', 2),
  ('libido-yoni-massage', 'Libido/Yoni Massage', 3),
  ('lingam-massage', 'Lingam Massage', 4),
  ('kamasutra-massage', 'Kamasutra Massage', 5),
  ('russische-massage', 'Russische Massage', 6),
  ('spanische-massagen', 'Spanische Massagen', 7),
  ('body2body', 'Body2Body', 8),
  ('duettmassage', 'Duettmassage', 9),
  ('blind-date-massage', 'Blind Date Massage', 10),
  ('gegenseitige-massagen', 'Gegenseitige Massagen', 11),
  ('griechische-analmassagen', 'Griechische Analmassagen', 12),
  ('dominante-massage', 'Dominante Massage', 13)
) AS v(value, label, sort) WHERE d."key" = 'service_erotik_massagen'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_erotik_massagen' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_klassische_massagen', 'Klassische Massagen', 'MULTISELECT', 108, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('klassische-massagen', 'Klassische Massagen', 0),
  ('medizinische-massage', 'Medizinische Massage', 1),
  ('ruecken-massage', 'Rücken-Massage', 2),
  ('gesichtsmassage', 'Gesichtsmassage', 3),
  ('gesicht-lymphdrainage', 'Gesicht Lymphdrainage', 4),
  ('fussreflexzonen-massage', 'Fußreflexzonen-Massage', 5),
  ('peeling-massage', 'Peeling Massage', 6)
) AS v(value, label, sort) WHERE d."key" = 'service_klassische_massagen'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_klassische_massagen' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_bdsm_dominant', 'BDSM dominant', 'MULTISELECT', 109, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('leicht-dominante-spiele', 'Leicht dominante Spiele', 0),
  ('bizarre-spiele', 'Bizarre Spiele', 1),
  ('bizarre-spiele-dominant', 'Bizarre Spiele dominant', 2),
  ('englische-erziehung', 'Englische Erziehung', 3),
  ('erziehung', 'Erziehung', 4),
  ('langzeiterziehung', 'Langzeiterziehung', 5),
  ('feminisierung', 'Feminisierung', 6),
  ('erotische-ringkaempfe', 'Erotische Ringkämpfe', 7),
  ('trampling', 'Trampling', 8),
  ('facesitting', 'Facesitting', 9),
  ('bastonade', 'Bastonade', 10),
  ('cbt', 'CBT', 11),
  ('flag-hand', 'Flag Hand', 12)
) AS v(value, label, sort) WHERE d."key" = 'service_bdsm_dominant'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_bdsm_dominant' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_bdsm_devot', 'BDSM devot', 'MULTISELECT', 110, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('leicht-devote-spiele', 'Leicht devote Spiele', 0),
  ('bizarre-spiele-devot', 'Bizarre Spiele devot', 1),
  ('total-power-exchange', 'Total Power Exchange', 2),
  ('bondage', 'Bondage', 3),
  ('knebeln', 'Knebeln', 4),
  ('mumifizierung', 'Mumifizierung', 5),
  ('kaefighaltung', 'Käfighaltung', 6),
  ('keuschhaltung', 'Keuschhaltung', 7),
  ('sinnesentzug', 'Sinnesentzug', 8),
  ('reizstrom', 'Reizstrom', 9),
  ('klammern', 'Klammern', 10),
  ('nadeln', 'Nadeln', 11),
  ('wachsspiele', 'Wachsspiele', 12),
  ('zart-bis-hart', 'Zart bis hart', 13)
) AS v(value, label, sort) WHERE d."key" = 'service_bdsm_devot'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_bdsm_devot' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_fetisch_outfits', 'Fetisch & Outfits', 'MULTISELECT', 111, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('latex-gummi', 'Latex/Gummi', 0),
  ('lack-leder', 'Lack/Leder', 1),
  ('fusserotik', 'Fußerotik', 2),
  ('nylonerotik', 'Nylonerotik', 3),
  ('pet-play', 'Pet-Play', 4),
  ('schwarzer-bereich', 'Schwarzer Bereich', 5),
  ('weisser-bereich', 'Weißer Bereich', 6)
) AS v(value, label, sort) WHERE d."key" = 'service_fetisch_outfits'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_fetisch_outfits' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_ns', 'NS', 'MULTISELECT', 112, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('ns', 'NS', 0),
  ('ns-aktiv', 'NS aktiv', 1),
  ('ns-passiv', 'NS passiv', 2)
) AS v(value, label, sort) WHERE d."key" = 'service_ns'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_ns' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_gruppe_duett', 'Gruppe & Duett', 'MULTISELECT', 113, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('sexorgie', 'Sexorgie', 0),
  ('2-maenner-1-frau', '2 Männer, 1 Frau', 1),
  ('2-frauen-1-mann', '2 Frauen, 1 Mann', 2),
  ('lesbisches-duett', 'Lesbisches Duett', 3)
) AS v(value, label, sort) WHERE d."key" = 'service_gruppe_duett'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_gruppe_duett' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'service_sonstiges', 'Sonstiges', 'MULTISELECT', 114, true, true, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
INSERT INTO "FilterOption" ("id","filterId","value","label","sortOrder","active")
SELECT gen_random_uuid()::text, d."id", v.value, v.label, v.sort, true FROM "FilterDefinition" d, (VALUES
  ('striptease', 'Striptease', 0),
  ('vorfuehrung', 'Vorführung', 1),
  ('rollenspiele', 'Rollenspiele', 2),
  ('verbalerotik', 'Verbalerotik', 3),
  ('spass-im-pool', 'Spaß im Pool', 4),
  ('duschspiele', 'Duschspiele', 5)
) AS v(value, label, sort) WHERE d."key" = 'service_sonstiges'
ON CONFLICT ("filterId","value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'service_sonstiges' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;

INSERT INTO "FilterDefinition" ("id","key","label","type","sortOrder","active","showInSearch","perPerson","section","createdAt","updatedAt") VALUES (gen_random_uuid()::text, 'weitere_services', 'Weitere Services auf Anfrage', 'BOOLEAN', 200, true, false, false, 'service', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "type" = EXCLUDED."type", "sortOrder" = EXCLUDED."sortOrder", "active" = true, "section" = 'service', "updatedAt" = CURRENT_TIMESTAMP;
-- Gleiche Kategorien wie „Treffpunkt“
INSERT INTO "FilterCategory" ("filterId","categoryId") SELECT d."id", c."categoryId" FROM "FilterDefinition" d, "FilterCategory" c WHERE d."key" = 'weitere_services' AND c."filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt') ON CONFLICT DO NOTHING;
