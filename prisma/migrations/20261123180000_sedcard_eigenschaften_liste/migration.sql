-- Eigenschaften gemäß Vorgabe: Alter (aus der Sedcard), Konfektion, BH, Schuhgröße, Typ, Intimbereich, Piercings, Tattoos, Orientierung.
-- Idempotent und schonend: Umbenennungen nur, wenn die Bezeichnung noch der ursprünglichen entspricht.

-- Nicht mehr benötigte, zuvor ergänzte Eigenschaften deaktivieren (Daten bleiben erhalten)
UPDATE "FilterDefinition" SET "active" = false, "updatedAt" = NOW() WHERE "key" IN ('haarlaenge', 'gewicht');

-- Bezeichnungen anpassen
UPDATE "FilterDefinition" SET "label" = 'Konfektion', "updatedAt" = NOW() WHERE "key" = 'konfektionsgroesse' AND "label" = 'Konfektionsgröße';
UPDATE "FilterDefinition" SET "label" = 'BH', "updatedAt" = NOW() WHERE "key" = 'koerbchengroesse' AND "label" = 'Körbchengröße';

-- Neue Eigenschaften
INSERT INTO "FilterDefinition" ("id", "key", "label", "type", "sortOrder", "active", "showInSearch", "createdAt", "updatedAt") VALUES
  ('flt_typ',          'typ',          'Typ',          'SELECT', 23, true, true,  NOW(), NOW()),
  ('flt_intimbereich', 'intimbereich', 'Intimbereich', 'SELECT', 24, true, false, NOW(), NOW()),
  ('flt_orientierung', 'orientierung', 'Orientierung', 'SELECT', 27, true, true,  NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "FilterOption" ("id", "filterId", "value", "label", "sortOrder", "active")
SELECT 'opt_' || f."key" || '_' || v.value, f."id", v.value, v.label, v.sort, true
FROM "FilterDefinition" f
JOIN (VALUES
  ('typ', 'europaeisch', 'Europäisch', 0), ('typ', 'osteuropaeisch', 'Osteuropäisch', 1), ('typ', 'suedlaendisch', 'Südländisch', 2),
  ('typ', 'lateinamerikanisch', 'Lateinamerikanisch', 3), ('typ', 'asiatisch', 'Asiatisch', 4), ('typ', 'afrikanisch', 'Afrikanisch', 5),
  ('typ', 'orientalisch', 'Orientalisch', 6),
  ('intimbereich', 'rasiert', 'Rasiert', 0), ('intimbereich', 'teilrasiert', 'Teilrasiert', 1), ('intimbereich', 'natuerlich', 'Natürlich', 2),
  ('orientierung', 'hetero', 'Heterosexuell', 0), ('orientierung', 'bi', 'Bisexuell', 1), ('orientierung', 'lesbisch', 'Lesbisch', 2)
) AS v(fkey, value, label, sort) ON v.fkey = f."key"
ON CONFLICT ("filterId", "value") DO NOTHING;

INSERT INTO "FilterCategory" ("filterId", "categoryId")
SELECT f."id", c."id" FROM "FilterDefinition" f, "Category" c
WHERE f."key" IN ('typ', 'intimbereich', 'orientierung') AND c."slug" = 'frauen'
ON CONFLICT DO NOTHING;

-- Reihenfolge wie vorgegeben (nach Haarfarbe, Augenfarbe, Figur, Körpergröße, Rauchfrei)
UPDATE "FilterDefinition" SET "sortOrder" = 20 WHERE "key" = 'konfektionsgroesse';
UPDATE "FilterDefinition" SET "sortOrder" = 21 WHERE "key" = 'koerbchengroesse';
UPDATE "FilterDefinition" SET "sortOrder" = 22 WHERE "key" = 'schuhgroesse';
UPDATE "FilterDefinition" SET "sortOrder" = 25 WHERE "key" = 'piercings';
UPDATE "FilterDefinition" SET "sortOrder" = 26 WHERE "key" = 'tattoos';
