-- Treffmöglichkeiten: „Incall (bei mir)“ → „Incall“; Outcall-Ort „Privat/Hotel“ → „Beides“
UPDATE "FilterOption" SET "label" = 'Incall' WHERE "value" = 'eigene-raeumlichkeiten' AND "filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'treffpunkt');
UPDATE "FilterOption" SET "label" = 'Beides' WHERE "value" = 'privat-hotel' AND "filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'outcall_ort');
