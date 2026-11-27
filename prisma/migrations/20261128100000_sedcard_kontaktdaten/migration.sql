-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "district" TEXT,
ADD COLUMN     "houseNumber" TEXT,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "showAddress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "telegramEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "allowMessages" SET DEFAULT false;

-- CreateTable
CREATE TABLE "PhoneVerification" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhoneVerification_profileId_idx" ON "PhoneVerification"("profileId");

-- AddForeignKey
ALTER TABLE "PhoneVerification" ADD CONSTRAINT "PhoneVerification_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Daten: Kontaktdaten umstellen ──
-- Frühere eigene WhatsApp-Nummer → Häkchen „WhatsApp“ (gleiche Telefonnummer)
UPDATE "Profile" SET "contactPhone" = "contactWhatsapp" WHERE "contactPhone" IS NULL AND "contactWhatsapp" IS NOT NULL;
UPDATE "Profile" SET "whatsappEnabled" = true WHERE "contactWhatsapp" IS NOT NULL;
-- Telefonnummern einheitlich im internationalen Format (+49…)
UPDATE "Profile" SET "contactPhone" = regexp_replace("contactPhone", '[^0-9+]', '', 'g') WHERE "contactPhone" IS NOT NULL;
UPDATE "Profile" SET "contactPhone" = '+' || substr("contactPhone", 3) WHERE "contactPhone" LIKE '00%';
UPDATE "Profile" SET "contactPhone" = '+49' || substr("contactPhone", 2) WHERE "contactPhone" LIKE '0%';
UPDATE "Profile" SET "contactPhone" = NULL WHERE "contactPhone" = '';
-- Bestandsnummern (fiktive Demo-Daten, vor Einführung der SMS-Prüfung) gelten als bestätigt,
-- damit sie öffentlich sichtbar bleiben. Neue oder geänderte Nummern müssen per SMS bestätigt werden.
UPDATE "Profile" SET "phoneVerifiedAt" = CURRENT_TIMESTAMP WHERE "contactPhone" IS NOT NULL;
-- Nachrichten über die Website sind deaktiviert; Telefon wird immer angezeigt
UPDATE "Profile" SET "allowMessages" = false, "showPhone" = true;
