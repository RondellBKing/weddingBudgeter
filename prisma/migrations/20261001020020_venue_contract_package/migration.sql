-- AlterEnum
ALTER TYPE "PackageSection" ADD VALUE 'PRICING' BEFORE 'OTHER';

-- AlterTable
ALTER TABLE "PackageItem" ADD COLUMN     "choice" TEXT,
ADD COLUMN     "chosen" TEXT;

-- AlterTable
ALTER TABLE "VendorQuestion" DROP COLUMN "topic";

