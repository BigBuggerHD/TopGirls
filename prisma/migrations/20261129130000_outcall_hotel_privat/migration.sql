-- Outcall-Ort „Beides“ → „Hotel/Privat“
UPDATE "FilterOption" SET "label" = 'Hotel/Privat' WHERE "value" = 'privat-hotel' AND "filterId" = (SELECT "id" FROM "FilterDefinition" WHERE "key" = 'outcall_ort');
