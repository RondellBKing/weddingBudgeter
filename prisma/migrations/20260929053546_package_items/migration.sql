-- CreateEnum
CREATE TYPE "PackageSection" AS ENUM ('SPACE', 'CEREMONY', 'COCKTAIL_HOUR', 'DINNER', 'DESSERT', 'BAR', 'TABLES', 'SUITES', 'STAFF', 'GUESTS', 'OTHER');

-- CreateEnum
CREATE TYPE "InclusionStatus" AS ENUM ('INCLUDED', 'EXTRA_COST', 'NOT_INCLUDED', 'TO_CONFIRM');

-- CreateTable
CREATE TABLE "PackageItem" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "section" "PackageSection" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "InclusionStatus" NOT NULL DEFAULT 'TO_CONFIRM',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "seedKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackageItem_seedKey_key" ON "PackageItem"("seedKey");

-- CreateIndex
CREATE INDEX "PackageItem_vendorId_section_sortOrder_idx" ON "PackageItem"("vendorId", "section", "sortOrder");

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

