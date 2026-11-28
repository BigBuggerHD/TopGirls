-- CreateEnum
CREATE TYPE "AuthenticityStatus" AS ENUM ('OPEN', 'SUBMITTED', 'REJECTED', 'APPROVED');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "authenticityPhotoKey" TEXT,
ADD COLUMN     "authenticityVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuthenticityCheck" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "AuthenticityStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT,
    "videoKey" TEXT,
    "videoMime" TEXT,
    "recordedAt" TIMESTAMP(3),
    "locationShared" BOOLEAN NOT NULL DEFAULT false,
    "locationCity" TEXT,
    "locationKm" INTEGER,
    "reviewNote" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthenticityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthenticityCheck_tokenHash_key" ON "AuthenticityCheck"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthenticityCheck_profileId_idx" ON "AuthenticityCheck"("profileId");

-- AddForeignKey
ALTER TABLE "AuthenticityCheck" ADD CONSTRAINT "AuthenticityCheck_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Daten ──
-- Bisher als „verifiziert“ markierte Sedcards (fiktive Demo-Daten) gelten als echtheitsgeprüft,
-- damit das Abzeichen erhalten bleibt. „verified“ bedeutet ab jetzt: Echtheit bestätigt.
UPDATE "Profile" SET "authenticityVerifiedAt" = COALESCE("reviewedAt", "publishedAt", CURRENT_TIMESTAMP) WHERE "verified" = true;
