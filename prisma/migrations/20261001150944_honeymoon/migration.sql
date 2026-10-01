-- AlterEnum
ALTER TYPE "TaskArea" ADD VALUE 'HONEYMOON' AFTER 'TRAVEL';

-- AlterTable
ALTER TABLE "WeddingSettings" ADD COLUMN     "honeymoonDepartOn" DATE,
ADD COLUMN     "honeymoonReturnOn" DATE;

-- CreateTable
CREATE TABLE "HoneymoonIdea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "place" TEXT,
    "flightHours" INTEGER,
    "flight" TEXT,
    "weather" TEXT,
    "why" TEXT,
    "watchOut" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isChosen" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seedKey" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "HoneymoonIdea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HoneymoonIdea_seedKey_key" ON "HoneymoonIdea"("seedKey");

-- Home comes after leaving.
ALTER TABLE "WeddingSettings" ADD CONSTRAINT "WeddingSettings_honeymoon_order"
  CHECK ("honeymoonDepartOn" IS NULL OR "honeymoonReturnOn" IS NULL OR "honeymoonReturnOn" > "honeymoonDepartOn");

-- One honeymoon.
CREATE UNIQUE INDEX "HoneymoonIdea_one_chosen" ON "HoneymoonIdea" ("isChosen") WHERE "isChosen";

ALTER TABLE "HoneymoonIdea" ADD CONSTRAINT "HoneymoonIdea_flight_hours" CHECK ("flightHours" IS NULL OR "flightHours" BETWEEN 0 AND 48);
