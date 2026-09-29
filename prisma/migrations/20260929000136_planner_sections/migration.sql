-- CreateEnum
CREATE TYPE "MusicMoment" AS ENUM ('PRELUDE', 'PROCESSIONAL', 'COUPLE_ENTRANCE', 'RECESSIONAL', 'COCKTAIL_HOUR', 'GRAND_ENTRANCE', 'FIRST_DANCE', 'PARENT_DANCE', 'CAKE_CUTTING', 'LAST_DANCE', 'SEND_OFF', 'MUST_PLAY', 'DO_NOT_PLAY');

-- CreateEnum
CREATE TYPE "ShotMoment" AS ENUM ('DETAILS', 'GETTING_READY', 'FIRST_LOOK', 'CEREMONY', 'FAMILY', 'WEDDING_PARTY', 'COUPLE', 'COCKTAIL_HOUR', 'RECEPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "DesignArea" AS ENUM ('OVERALL', 'CEREMONY', 'COCKTAIL_HOUR', 'RECEPTION', 'FLOWERS', 'TABLESCAPE', 'LIGHTING', 'CAKE', 'STATIONERY', 'ATTIRE', 'WELCOME', 'OTHER');

-- CreateEnum
CREATE TYPE "DecorSource" AS ENUM ('VENUE', 'VENDOR', 'RENTAL', 'PURCHASE', 'DIY', 'BORROWED');

-- AlterTable
ALTER TABLE "WeddingSettings" ADD COLUMN     "rainPlan" TEXT;

-- CreateTable
CREATE TABLE "TimelineItem" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "lead" TEXT,
    "involves" TEXT,
    "vendorId" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "seedKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TimelineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongRequest" (
    "id" TEXT NOT NULL,
    "moment" "MusicMoment" NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SongRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessionalEntry" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "walkers" TEXT NOT NULL,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProcessionalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShotListItem" (
    "id" TEXT NOT NULL,
    "moment" "ShotMoment" NOT NULL,
    "description" TEXT NOT NULL,
    "people" TEXT,
    "isMustHave" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ShotListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspirationItem" (
    "id" TEXT NOT NULL,
    "area" "DesignArea" NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT,
    "sourceUrl" TEXT,
    "notes" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "InspirationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaletteColor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "usage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "seedKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PaletteColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecorItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" "DesignArea" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "source" "DecorSource" NOT NULL,
    "vendorId" TEXT,
    "budgetItemId" TEXT,
    "orderedOn" DATE,
    "receivedOn" DATE,
    "returnBy" DATE,
    "returnedOn" DATE,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DecorItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelBlock" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "bookingUrl" TEXT,
    "groupCode" TEXT,
    "roomsHeld" INTEGER,
    "nightlyRateCents" INTEGER,
    "cutoffDate" DATE,
    "checkIn" DATE,
    "checkOut" DATE,
    "vendorId" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "HotelBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShuttleRun" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "departTime" TEXT NOT NULL,
    "fromPlace" TEXT NOT NULL,
    "toPlace" TEXT NOT NULL,
    "seats" INTEGER,
    "vendorId" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ShuttleRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WelcomeBagItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "perBag" INTEGER NOT NULL DEFAULT 1,
    "orderedOn" DATE,
    "receivedOn" DATE,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WelcomeBagItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gift" (
    "id" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "guestId" TEXT,
    "description" TEXT NOT NULL,
    "receivedOn" DATE NOT NULL,
    "thankYouSentOn" DATE,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimelineItem_seedKey_key" ON "TimelineItem"("seedKey");

-- CreateIndex
CREATE INDEX "TimelineItem_date_startTime_idx" ON "TimelineItem"("date", "startTime");

-- CreateIndex
CREATE INDEX "SongRequest_moment_sortOrder_idx" ON "SongRequest"("moment", "sortOrder");

-- CreateIndex
CREATE INDEX "ShotListItem_moment_sortOrder_idx" ON "ShotListItem"("moment", "sortOrder");

-- CreateIndex
CREATE INDEX "InspirationItem_area_sortOrder_idx" ON "InspirationItem"("area", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PaletteColor_seedKey_key" ON "PaletteColor"("seedKey");

-- CreateIndex
CREATE INDEX "DecorItem_area_sortOrder_idx" ON "DecorItem"("area", "sortOrder");

-- CreateIndex
CREATE INDEX "ShuttleRun_date_departTime_idx" ON "ShuttleRun"("date", "departTime");

-- CreateIndex
CREATE INDEX "Gift_receivedOn_idx" ON "Gift"("receivedOn");

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecorItem" ADD CONSTRAINT "DecorItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecorItem" ADD CONSTRAINT "DecorItem_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelBlock" ADD CONSTRAINT "HotelBlock_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShuttleRun" ADD CONSTRAINT "ShuttleRun_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Integrity rules Prisma can't express.
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_times_hhmm"
  CHECK ("startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND ("endTime" IS NULL OR "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'));
ALTER TABLE "ShuttleRun" ADD CONSTRAINT "ShuttleRun_time_hhmm"
  CHECK ("departTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE "ShuttleRun" ADD CONSTRAINT "ShuttleRun_seats_positive" CHECK ("seats" IS NULL OR "seats" > 0);
ALTER TABLE "PaletteColor" ADD CONSTRAINT "PaletteColor_hex" CHECK ("hex" ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE "DecorItem" ADD CONSTRAINT "DecorItem_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "DecorItem" ADD CONSTRAINT "DecorItem_returned_after_received" CHECK ("returnedOn" IS NULL OR "receivedOn" IS NOT NULL);
ALTER TABLE "WelcomeBagItem" ADD CONSTRAINT "WelcomeBagItem_perBag_positive" CHECK ("perBag" > 0);
ALTER TABLE "HotelBlock" ADD CONSTRAINT "HotelBlock_numbers_nonnegative"
  CHECK (("roomsHeld" IS NULL OR "roomsHeld" >= 0) AND ("nightlyRateCents" IS NULL OR "nightlyRateCents" >= 0));
ALTER TABLE "HotelBlock" ADD CONSTRAINT "HotelBlock_checkout_after_checkin"
  CHECK ("checkIn" IS NULL OR "checkOut" IS NULL OR "checkOut" > "checkIn");
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_thanked_after_received" CHECK ("thankYouSentOn" IS NULL OR "thankYouSentOn" >= "receivedOn");
