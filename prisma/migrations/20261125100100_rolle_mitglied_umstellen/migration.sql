-- Neue Konten sind standardmäßig „Mitglied“
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- Alle bisherigen Kontoarten (außer Admin und Moderator) auf „Mitglied“ umstellen
UPDATE "User" SET "role" = 'MEMBER' WHERE "role" IN ('VISITOR', 'PROVIDER', 'AGENCY', 'APARTMENT', 'CLUB', 'MASSAGE_STUDIO');
