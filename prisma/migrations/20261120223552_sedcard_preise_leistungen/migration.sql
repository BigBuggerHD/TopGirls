-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "priceNote" TEXT,
ADD COLUMN     "prices" JSONB;

-- Neue dynamische Eigenschaft „Leistungen“ (Mehrfachauswahl) für die Kategorie Frauen.
-- Idempotent: bereits vorhandene Einträge werden nicht verändert.
INSERT INTO "FilterDefinition" ("id", "key", "label", "type", "helpText", "sortOrder", "active", "showInSearch", "createdAt", "updatedAt")
VALUES ('flt_leistungen', 'leistungen', 'Leistungen', 'MULTISELECT', 'Wird auf der Sedcard in der Kachel „Leistungen“ angezeigt.', 100, true, true, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "FilterOption" ("id", "filterId", "value", "label", "sortOrder", "active")
SELECT 'opt_leistungen_' || v.value, f."id", v.value, v.label, v.sort, true
FROM "FilterDefinition" f,
  (VALUES ('dinner-date', 'Dinner-Date', 0), ('begleitung-events', 'Begleitung zu Events', 1), ('reisebegleitung', 'Reisebegleitung', 2),
          ('uebernachtung', 'Übernachtung', 3), ('massage', 'Massage', 4), ('wellness', 'Gemeinsames Wellness', 5),
          ('videochat', 'Videochat', 6), ('girlfriend-experience', 'Girlfriend-Experience', 7)) AS v(value, label, sort)
WHERE f."key" = 'leistungen'
ON CONFLICT ("filterId", "value") DO NOTHING;

INSERT INTO "FilterCategory" ("filterId", "categoryId")
SELECT f."id", c."id" FROM "FilterDefinition" f, "Category" c
WHERE f."key" = 'leistungen' AND c."slug" = 'frauen'
ON CONFLICT DO NOTHING;
