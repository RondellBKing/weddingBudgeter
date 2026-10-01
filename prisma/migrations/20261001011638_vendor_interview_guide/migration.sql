-- AlterEnum
ALTER TYPE "VendorCategory" ADD VALUE 'PLANNER' AFTER 'VENUE';

-- AlterTable
ALTER TABLE "VendorQuestion" ADD COLUMN     "topic" TEXT;
