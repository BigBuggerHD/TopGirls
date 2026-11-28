-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "blockedCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "blurForGuests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyPromotion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "onFirstPage" BOOLEAN,
ADD COLUMN     "showOnlineStatus" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

