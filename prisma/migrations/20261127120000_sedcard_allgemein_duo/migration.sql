-- DropIndex
DROP INDEX "ProfileAttribute_profileId_filterId_key";

-- AlterTable
ALTER TABLE "FilterDefinition" ADD COLUMN     "perPerson" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "age2" INTEGER,
ADD COLUMN     "partnerName" TEXT,
ADD COLUMN     "profileType" TEXT NOT NULL DEFAULT 'SINGLE';

-- AlterTable
ALTER TABLE "ProfileAttribute" ADD COLUMN     "person" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "ProfileAttribute_profileId_filterId_person_key" ON "ProfileAttribute"("profileId", "filterId", "person");


-- ═══════════════════════════════════════════════════════════════════════
-- Daten: Eigenschaften gemäß Blatt „Allgemein“ (idempotent, schonend)
-- ═══════════════════════════════════════════════════════════════════════

-- Hilfsfunktion: Option anlegen oder aktualisieren (Bezeichnung, Sortierung, aktiv)
CREATE OR REPLACE FUNCTION pg_temp.tg_option(fkey TEXT, val TEXT, lbl TEXT, srt INT) RETURNS void AS $$
  INSERT INTO "FilterOption" ("id", "filterId", "value", "label", "sortOrder", "active")
  SELECT 'opt_' || fkey || '_' || val, f."id", val, lbl, srt, true FROM "FilterDefinition" f WHERE f."key" = fkey
  ON CONFLICT ("filterId", "value") DO UPDATE SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "active" = true;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION pg_temp.tg_deactivate(fkey TEXT, val TEXT) RETURNS void AS $$
  UPDATE "FilterOption" o SET "active" = false FROM "FilterDefinition" f WHERE o."filterId" = f."id" AND f."key" = fkey AND o."value" = val;
$$ LANGUAGE sql;

-- Neue Eigenschaften
INSERT INTO "FilterDefinition" ("id", "key", "label", "type", "sortOrder", "active", "showInSearch", "perPerson", "createdAt", "updatedAt") VALUES
  ('flt_geschlecht', 'geschlecht', 'Geschlecht', 'SELECT', 1, true, true,  true, NOW(), NOW()),
  ('flt_bh_umfang',  'bh_umfang',  'BH-Umfang',  'SELECT', 4, true, false, true, NOW(), NOW()),
  ('flt_brust',      'brust',      'Brust',      'SELECT', 6, true, true,  true, NOW(), NOW()),
  ('flt_raucher',    'raucher',    'Raucher',    'SELECT', 16, true, true, true, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

SELECT pg_temp.tg_option('geschlecht', 'mann', 'Mann', 0);
SELECT pg_temp.tg_option('geschlecht', 'frau', 'Frau', 1);
SELECT pg_temp.tg_option('geschlecht', 'trans', 'Trans', 2);

SELECT pg_temp.tg_option('bh_umfang', v::text, v::text, (v - 60) / 5) FROM generate_series(60, 110, 5) AS v;

SELECT pg_temp.tg_option('brust', 'natur', 'Natur', 0);
SELECT pg_temp.tg_option('brust', 'operiert', 'Operiert', 1);

SELECT pg_temp.tg_option('raucher', 'nein', 'Nein', 0);
SELECT pg_temp.tg_option('raucher', 'gelegentlich', 'Gelegentlich', 1);
SELECT pg_temp.tg_option('raucher', 'ja', 'Ja', 2);

-- Orientierung
SELECT pg_temp.tg_option('orientierung', 'hetero', 'Heterosexuell', 0);
SELECT pg_temp.tg_option('orientierung', 'homosexuell', 'Homosexuell', 1);
SELECT pg_temp.tg_option('orientierung', 'bi', 'Bisexuell', 2);
SELECT pg_temp.tg_option('orientierung', 'pansexuell', 'Pansexuell', 3);
SELECT pg_temp.tg_option('orientierung', 'asexuell', 'Asexuell', 4);
SELECT pg_temp.tg_option('orientierung', 'keine-angabe', 'keine Angaben', 5);
SELECT pg_temp.tg_deactivate('orientierung', 'lesbisch');

-- Größe
UPDATE "FilterDefinition" SET "label" = 'Größe' WHERE "key" = 'koerpergroesse' AND "label" = 'Körpergröße';

-- Cup-Größe (bisher „BH“)
UPDATE "FilterDefinition" SET "label" = 'Cup-Größe' WHERE "key" = 'koerbchengroesse' AND "label" IN ('BH', 'Körbchengröße');
SELECT pg_temp.tg_option('koerbchengroesse', 'a', 'A', 0);
SELECT pg_temp.tg_option('koerbchengroesse', 'b', 'B', 1);
SELECT pg_temp.tg_option('koerbchengroesse', 'c', 'C', 2);
SELECT pg_temp.tg_option('koerbchengroesse', 'd', 'D', 3);
SELECT pg_temp.tg_option('koerbchengroesse', 'dd', 'DD', 4);
SELECT pg_temp.tg_option('koerbchengroesse', 'e', 'E', 5);
SELECT pg_temp.tg_option('koerbchengroesse', 'f', 'F', 6);
SELECT pg_temp.tg_option('koerbchengroesse', 'g', 'G', 7);
SELECT pg_temp.tg_option('koerbchengroesse', 'h', 'H', 8);

-- Figur
SELECT pg_temp.tg_option('figur', 'schlank', 'Schlank', 0);
SELECT pg_temp.tg_option('figur', 'sportlich', 'Sportlich', 1);
SELECT pg_temp.tg_option('figur', 'normal', 'Normal', 2);
SELECT pg_temp.tg_option('figur', 'kurvig', 'Kurvig', 3);
SELECT pg_temp.tg_option('figur', 'mollig', 'Mollig', 4);
SELECT pg_temp.tg_option('figur', 'bbw', 'BBW', 5);
SELECT pg_temp.tg_option('figur', 'feminin', 'Feminin', 6);

-- Typ
SELECT pg_temp.tg_option('typ', 'europaeisch', 'Europäisch', 0);
SELECT pg_temp.tg_option('typ', 'mediterran', 'Mediterran', 1);
SELECT pg_temp.tg_option('typ', 'asiatisch', 'Asiatisch', 2);
SELECT pg_temp.tg_option('typ', 'lateinamerikanisch', 'Lateinamerikanisch', 3);
SELECT pg_temp.tg_option('typ', 'afrikanisch', 'Afrikanisch', 4);
SELECT pg_temp.tg_option('typ', 'arabisch', 'Arabisch', 5);
SELECT pg_temp.tg_option('typ', 'gemischt', 'Gemischt', 6);
SELECT pg_temp.tg_deactivate('typ', 'osteuropaeisch');
SELECT pg_temp.tg_deactivate('typ', 'suedlaendisch');
SELECT pg_temp.tg_deactivate('typ', 'orientalisch');

-- Haarfarbe
SELECT pg_temp.tg_option('haarfarbe', 'blond', 'Blond', 0);
SELECT pg_temp.tg_option('haarfarbe', 'bruenett', 'Brünett', 1);
SELECT pg_temp.tg_option('haarfarbe', 'braun', 'Braun', 2);
SELECT pg_temp.tg_option('haarfarbe', 'schwarz', 'Schwarz', 3);
SELECT pg_temp.tg_option('haarfarbe', 'rot', 'Rot', 4);
SELECT pg_temp.tg_option('haarfarbe', 'grau-silber', 'Grau', 5);
SELECT pg_temp.tg_option('haarfarbe', 'andere', 'Andere', 6);

-- Haarlänge (wieder aktiv)
UPDATE "FilterDefinition" SET "active" = true WHERE "key" = 'haarlaenge';
SELECT pg_temp.tg_option('haarlaenge', 'lang', 'Lang', 0);
SELECT pg_temp.tg_option('haarlaenge', 'kurz', 'Kurz', 1);
SELECT pg_temp.tg_option('haarlaenge', 'glatze', 'Glatze', 2);
SELECT pg_temp.tg_deactivate('haarlaenge', 'schulterlang');
SELECT pg_temp.tg_deactivate('haarlaenge', 'sehr-lang');

-- Augenfarbe
SELECT pg_temp.tg_option('augenfarbe', 'blau', 'Blau', 0);
SELECT pg_temp.tg_option('augenfarbe', 'gruen', 'Grün', 1);
SELECT pg_temp.tg_option('augenfarbe', 'braun', 'Braun', 2);
SELECT pg_temp.tg_option('augenfarbe', 'grau', 'Grau', 3);
SELECT pg_temp.tg_option('augenfarbe', 'schwarz', 'Schwarz', 4);

-- Piercings & Tattoos: Ja/Nein → Keine/Wenige/Mehrere/Viele (Bestandsdaten: Nein → Keine, Ja → Wenige)
UPDATE "FilterDefinition" SET "type" = 'SELECT' WHERE "key" IN ('piercings', 'tattoos') AND "type" = 'BOOLEAN';
SELECT pg_temp.tg_option(k, 'keine', 'Keine', 0) FROM unnest(ARRAY['piercings', 'tattoos']) AS k;
SELECT pg_temp.tg_option(k, 'wenige', 'Wenige', 1) FROM unnest(ARRAY['piercings', 'tattoos']) AS k;
SELECT pg_temp.tg_option(k, 'mehrere', 'Mehrere', 2) FROM unnest(ARRAY['piercings', 'tattoos']) AS k;
SELECT pg_temp.tg_option(k, 'viele', 'Viele', 3) FROM unnest(ARRAY['piercings', 'tattoos']) AS k;
INSERT INTO "ProfileAttributeOption" ("attributeId", "optionId")
SELECT a."id", o."id" FROM "ProfileAttribute" a
JOIN "FilterDefinition" f ON f."id" = a."filterId" AND f."key" IN ('piercings', 'tattoos')
JOIN "FilterOption" o ON o."filterId" = f."id" AND o."value" = CASE WHEN a."boolValue" THEN 'wenige' ELSE 'keine' END
WHERE a."boolValue" IS NOT NULL
ON CONFLICT DO NOTHING;
UPDATE "ProfileAttribute" a SET "boolValue" = NULL FROM "FilterDefinition" f WHERE f."id" = a."filterId" AND f."key" IN ('piercings', 'tattoos');

-- Rasiert (bisher „Intimbereich“): Natürlich → Unrasiert, Teilrasiert entfällt
UPDATE "FilterDefinition" SET "label" = 'Rasiert', "showInSearch" = true WHERE "key" = 'intimbereich' AND "label" = 'Intimbereich';
SELECT pg_temp.tg_option('intimbereich', 'rasiert', 'Rasiert', 0);
SELECT pg_temp.tg_option('intimbereich', 'natuerlich', 'Unrasiert', 1);
SELECT pg_temp.tg_deactivate('intimbereich', 'teilrasiert');

-- Raucher ersetzt „Rauchfrei“ bei Frauen (Rauchfrei = Ja → Raucher = Nein)
INSERT INTO "ProfileAttribute" ("id", "profileId", "filterId", "person")
SELECT 'pa_raucher_' || a."id", a."profileId", r."id", a."person"
FROM "ProfileAttribute" a
JOIN "FilterDefinition" f ON f."id" = a."filterId" AND f."key" = 'rauchfrei'
JOIN "Profile" p ON p."id" = a."profileId"
JOIN "Category" c ON c."id" = p."categoryId" AND c."slug" = 'frauen'
CROSS JOIN "FilterDefinition" r
WHERE r."key" = 'raucher' AND a."boolValue" IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO "ProfileAttributeOption" ("attributeId", "optionId")
SELECT 'pa_raucher_' || a."id", o."id"
FROM "ProfileAttribute" a
JOIN "FilterDefinition" f ON f."id" = a."filterId" AND f."key" = 'rauchfrei'
JOIN "FilterDefinition" r ON r."key" = 'raucher'
JOIN "FilterOption" o ON o."filterId" = r."id" AND o."value" = CASE WHEN a."boolValue" THEN 'nein' ELSE 'ja' END
WHERE EXISTS (SELECT 1 FROM "ProfileAttribute" x WHERE x."id" = 'pa_raucher_' || a."id")
ON CONFLICT DO NOTHING;
DELETE FROM "FilterCategory" fc USING "FilterDefinition" f, "Category" c
WHERE fc."filterId" = f."id" AND fc."categoryId" = c."id" AND f."key" = 'rauchfrei' AND c."slug" = 'frauen';

-- Konfektion entfällt
UPDATE "FilterDefinition" SET "active" = false WHERE "key" = 'konfektionsgroesse';

-- Neue Eigenschaften der Kategorie „Frauen“ zuordnen
INSERT INTO "FilterCategory" ("filterId", "categoryId")
SELECT f."id", c."id" FROM "FilterDefinition" f, "Category" c
WHERE f."key" IN ('geschlecht', 'bh_umfang', 'brust', 'raucher', 'haarlaenge') AND c."slug" = 'frauen'
ON CONFLICT DO NOTHING;

-- Eigenschaften je Person (Duo) und Reihenfolge laut Liste
UPDATE "FilterDefinition" f SET "perPerson" = true, "sortOrder" = v.srt
FROM (VALUES ('geschlecht', 1), ('orientierung', 2), ('koerpergroesse', 3), ('bh_umfang', 4), ('koerbchengroesse', 5), ('brust', 6),
             ('schuhgroesse', 7), ('figur', 8), ('typ', 9), ('haarfarbe', 10), ('haarlaenge', 11), ('augenfarbe', 12),
             ('piercings', 13), ('tattoos', 14), ('intimbereich', 15), ('raucher', 16)) AS v(k, srt)
WHERE f."key" = v.k;
UPDATE "FilterDefinition" SET "sortOrder" = 50 WHERE "key" = 'treffpunkt';
