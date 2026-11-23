-- Sieben weitere Eigenschaften für die Kategorie „Frauen“ (insgesamt 14).
-- Idempotent: vorhandene Einträge werden nicht verändert. Alles ist im Adminbereich unter „Dynamische Filter“ anpassbar.
INSERT INTO "FilterDefinition" ("id", "key", "label", "type", "unit", "minValue", "maxValue", "sortOrder", "active", "showInSearch", "createdAt", "updatedAt") VALUES
  ('flt_haarlaenge',         'haarlaenge',         'Haarlänge',         'SELECT',  NULL, NULL, NULL, 5, true, true,  NOW(), NOW()),
  ('flt_konfektionsgroesse', 'konfektionsgroesse', 'Konfektionsgröße',  'SELECT',  NULL, NULL, NULL, 6, true, true,  NOW(), NOW()),
  ('flt_koerbchengroesse',   'koerbchengroesse',   'Körbchengröße',     'SELECT',  NULL, NULL, NULL, 7, true, true,  NOW(), NOW()),
  ('flt_gewicht',            'gewicht',            'Gewicht',           'NUMBER',  'kg', 40,   150,  8, true, false, NOW(), NOW()),
  ('flt_schuhgroesse',       'schuhgroesse',       'Schuhgröße',        'NUMBER',  NULL, 34,   46,   9, true, false, NOW(), NOW()),
  ('flt_tattoos',            'tattoos',            'Tattoos',           'BOOLEAN', NULL, NULL, NULL, 11, true, true, NOW(), NOW()),
  ('flt_piercings',          'piercings',          'Piercings',         'BOOLEAN', NULL, NULL, NULL, 12, true, true, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "FilterOption" ("id", "filterId", "value", "label", "sortOrder", "active")
SELECT 'opt_' || f."key" || '_' || v.value, f."id", v.value, v.label, v.sort, true
FROM "FilterDefinition" f
JOIN (VALUES
  ('haarlaenge', 'kurz', 'Kurz', 0), ('haarlaenge', 'schulterlang', 'Schulterlang', 1), ('haarlaenge', 'lang', 'Lang', 2), ('haarlaenge', 'sehr-lang', 'Sehr lang', 3),
  ('konfektionsgroesse', '32', '32', 0), ('konfektionsgroesse', '34', '34', 1), ('konfektionsgroesse', '36', '36', 2), ('konfektionsgroesse', '38', '38', 3),
  ('konfektionsgroesse', '40', '40', 4), ('konfektionsgroesse', '42', '42', 5), ('konfektionsgroesse', '44', '44+', 6),
  ('koerbchengroesse', 'a', 'A', 0), ('koerbchengroesse', 'b', 'B', 1), ('koerbchengroesse', 'c', 'C', 2), ('koerbchengroesse', 'd', 'D', 3),
  ('koerbchengroesse', 'e', 'E', 4), ('koerbchengroesse', 'f', 'F+', 5)
) AS v(fkey, value, label, sort) ON v.fkey = f."key"
ON CONFLICT ("filterId", "value") DO NOTHING;

INSERT INTO "FilterCategory" ("filterId", "categoryId")
SELECT f."id", c."id" FROM "FilterDefinition" f, "Category" c
WHERE f."key" IN ('haarlaenge', 'konfektionsgroesse', 'koerbchengroesse', 'gewicht', 'schuhgroesse', 'tattoos', 'piercings') AND c."slug" = 'frauen'
ON CONFLICT DO NOTHING;
