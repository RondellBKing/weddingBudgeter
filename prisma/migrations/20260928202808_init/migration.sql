-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('DEPOSIT', 'INSTALLMENT', 'FINAL', 'OVERAGE', 'SERVICE_CHARGE', 'GRATUITY', 'OTHER');

-- CreateEnum
CREATE TYPE "AmountRule" AS ENUM ('HEADCOUNT_OVERAGE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CHECK', 'CARD', 'ACH', 'WIRE', 'ZELLE', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "VendorCategory" AS ENUM ('VENUE', 'CATERING', 'PHOTOGRAPHY', 'VIDEOGRAPHY', 'FLORAL', 'MUSIC_DJ', 'MUSIC_CEREMONY', 'CAKE', 'ATTIRE', 'BEAUTY', 'STATIONERY', 'RENTALS', 'TRANSPORT', 'OFFICIANT', 'LODGING', 'OTHER');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('RESEARCHING', 'CONTACTED', 'QUOTED', 'BOOKED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Owner" AS ENUM ('RONDELL', 'CAPRI', 'BOTH', 'VENDOR', 'WEDDING_PARTY');

-- CreateEnum
CREATE TYPE "Partner" AS ENUM ('RONDELL', 'CAPRI', 'BOTH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskArea" AS ENUM ('PLANNING', 'BUDGET', 'VENUE', 'VENDORS', 'ATTIRE', 'WEDDING_PARTY', 'GUESTS', 'STATIONERY', 'CEREMONY', 'RECEPTION', 'BEAUTY', 'TRAVEL', 'LEGAL', 'DAY_OF', 'OTHER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('TASTING', 'FITTING', 'MEETING', 'SITE_VISIT', 'APPOINTMENT', 'DEADLINE', 'OTHER');

-- CreateEnum
CREATE TYPE "PartySide" AS ENUM ('BRIDE_SIDE', 'GROOM_SIDE');

-- CreateEnum
CREATE TYPE "PartyRole" AS ENUM ('BEST_MAN', 'MAID_OF_HONOR', 'MATRON_OF_HONOR', 'GROOMSMAN', 'BRIDESMAID', 'BRIDESMAN', 'OTHER');

-- CreateEnum
CREATE TYPE "OutfitType" AS ENUM ('DRESS', 'SUIT');

-- CreateEnum
CREATE TYPE "ShoeStatus" AS ENUM ('NOT_SELECTED', 'SELECTED', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AttireMenu" AS ENUM ('A', 'B', 'SHOES');

-- CreateEnum
CREATE TYPE "GuestSide" AS ENUM ('BRIDE_SIDE', 'GROOM_SIDE', 'BOTH');

-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('COUPLE', 'FAMILY', 'FRIEND', 'WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('PENDING', 'ATTENDING', 'DECLINED');

-- CreateEnum
CREATE TYPE "TableShape" AS ENUM ('ROUND', 'RECTANGLE', 'SWEETHEART', 'HEAD_TABLE');

-- CreateTable
CREATE TABLE "WeddingSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "partnerOneName" TEXT NOT NULL,
    "partnerTwoName" TEXT NOT NULL,
    "weddingDate" DATE NOT NULL,
    "ceremonyTime" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "venueName" TEXT NOT NULL,
    "venueAddress" TEXT NOT NULL,
    "venueAccessTime" TEXT NOT NULL DEFAULT '06:00',
    "headcountTarget" INTEGER NOT NULL DEFAULT 125,
    "totalBudgetCents" INTEGER NOT NULL,
    "includedHeadcount" INTEGER NOT NULL DEFAULT 125,
    "perPersonOverageCents" INTEGER NOT NULL DEFAULT 20000,
    "overageTaxPpm" INTEGER NOT NULL DEFAULT 0,
    "vendorMealsCountTowardHeadcount" BOOLEAN NOT NULL DEFAULT true,
    "dressSizingDeadline" DATE NOT NULL,
    "heroImageUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WeddingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "sessionEpoch" INTEGER NOT NULL DEFAULT 1,
    "icsToken" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" SERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "estimateCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isContingency" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "seedKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "vendorId" TEXT,
    "description" TEXT NOT NULL,
    "estimateCents" INTEGER,
    "contractedCents" INTEGER,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "seedKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "budgetItemId" TEXT NOT NULL,
    "sequence" INTEGER,
    "kind" "PaymentKind" NOT NULL,
    "amountCents" INTEGER,
    "amountRule" "AmountRule",
    "isEstimate" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" DATE NOT NULL,
    "paidDate" DATE,
    "method" "PaymentMethod",
    "reference" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "seedKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "VendorCategory" NOT NULL,
    "alsoCovers" "VendorCategory"[] DEFAULT ARRAY[]::"VendorCategory"[],
    "status" "VendorStatus" NOT NULL DEFAULT 'RESEARCHING',
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "quotedCents" INTEGER,
    "contractSignedOn" DATE,
    "contractUrl" TEXT,
    "arrivalTime" TEXT,
    "mealsRequired" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "seedKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorQuestion" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "answer" TEXT,
    "answeredOn" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seedKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VendorQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorNote" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "author" "Partner" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueDate" DATE,
    "owner" "Owner" NOT NULL DEFAULT 'BOTH',
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "area" "TaskArea" NOT NULL DEFAULT 'PLANNING',
    "vendorId" TEXT,
    "partyMemberId" TEXT,
    "isMilestone" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMPTZ(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "seedKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "startAt" TIMESTAMPTZ(3),
    "endAt" TIMESTAMPTZ(3),
    "allDayDate" DATE,
    "location" TEXT,
    "vendorId" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingPartyMember" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "side" "PartySide" NOT NULL,
    "role" "PartyRole" NOT NULL,
    "outfitType" "OutfitType" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "guestId" TEXT,
    "askedOn" DATE,
    "acceptedOn" DATE,
    "chosenStyleId" TEXT,
    "sizingSubmittedOn" DATE,
    "orderedOn" DATE,
    "arrivedOn" DATE,
    "alteredOn" DATE,
    "readyOn" DATE,
    "sizes" JSONB,
    "attirePaid" BOOLEAN NOT NULL DEFAULT false,
    "shoeOptionId" TEXT,
    "shoeOwnedDescription" TEXT,
    "shoeStatus" "ShoeStatus" NOT NULL DEFAULT 'NOT_SELECTED',
    "hairPlan" TEXT,
    "accessoriesConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "giftIdea" TEXT,
    "giftPurchased" BOOLEAN NOT NULL DEFAULT false,
    "lodgingBooked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "seedKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WeddingPartyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttireOption" (
    "id" TEXT NOT NULL,
    "menu" "AttireMenu" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seedKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AttireOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "householdName" TEXT NOT NULL,
    "side" "GuestSide" NOT NULL,
    "relationship" "Relationship" NOT NULL DEFAULT 'OTHER',
    "isChild" BOOLEAN NOT NULL DEFAULT false,
    "plusOneOfId" TEXT,
    "rsvpStatus" "RsvpStatus",
    "mealChoice" TEXT,
    "dietaryNotes" TEXT,
    "notes" TEXT,
    "externalId" TEXT,
    "matchKey" TEXT NOT NULL,
    "lastImportedAt" TIMESTAMPTZ(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestImport" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT,
    "mapping" JSONB NOT NULL,
    "summary" JSONB NOT NULL,

    CONSTRAINT "GuestImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatingTable" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "shape" "TableShape" NOT NULL DEFAULT 'ROUND',
    "capacity" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SeatingTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatAssignment" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "seatNumber" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SeatAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "decidedOn" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT,
    "decidedBy" "Partner" NOT NULL,
    "vendorId" TEXT,
    "budgetItemId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "seedKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_at_idx" ON "LoginAttempt"("at");

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_at_idx" ON "LoginAttempt"("ip", "at");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetCategory_name_key" ON "BudgetCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetCategory_seedKey_key" ON "BudgetCategory"("seedKey");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetItem_seedKey_key" ON "BudgetItem"("seedKey");

-- CreateIndex
CREATE INDEX "BudgetItem_categoryId_idx" ON "BudgetItem"("categoryId");

-- CreateIndex
CREATE INDEX "BudgetItem_vendorId_idx" ON "BudgetItem"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_seedKey_key" ON "Payment"("seedKey");

-- CreateIndex
CREATE INDEX "Payment_budgetItemId_idx" ON "Payment"("budgetItemId");

-- CreateIndex
CREATE INDEX "Payment_dueDate_idx" ON "Payment"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_seedKey_key" ON "Vendor"("seedKey");

-- CreateIndex
CREATE INDEX "Vendor_category_idx" ON "Vendor"("category");

-- CreateIndex
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorQuestion_seedKey_key" ON "VendorQuestion"("seedKey");

-- CreateIndex
CREATE INDEX "VendorQuestion_vendorId_idx" ON "VendorQuestion"("vendorId");

-- CreateIndex
CREATE INDEX "VendorNote_vendorId_at_idx" ON "VendorNote"("vendorId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "Task_seedKey_key" ON "Task"("seedKey");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "CalendarEvent_startAt_idx" ON "CalendarEvent"("startAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_allDayDate_idx" ON "CalendarEvent"("allDayDate");

-- CreateIndex
CREATE UNIQUE INDEX "WeddingPartyMember_guestId_key" ON "WeddingPartyMember"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "WeddingPartyMember_seedKey_key" ON "WeddingPartyMember"("seedKey");

-- CreateIndex
CREATE UNIQUE INDEX "AttireOption_seedKey_key" ON "AttireOption"("seedKey");

-- CreateIndex
CREATE UNIQUE INDEX "AttireOption_menu_name_key" ON "AttireOption"("menu", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_externalId_key" ON "Guest"("externalId");

-- CreateIndex
CREATE INDEX "Guest_matchKey_idx" ON "Guest"("matchKey");

-- CreateIndex
CREATE INDEX "Guest_householdName_idx" ON "Guest"("householdName");

-- CreateIndex
CREATE UNIQUE INDEX "SeatAssignment_guestId_key" ON "SeatAssignment"("guestId");

-- CreateIndex
CREATE INDEX "SeatAssignment_tableId_idx" ON "SeatAssignment"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatAssignment_tableId_seatNumber_key" ON "SeatAssignment"("tableId", "seatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_seedKey_key" ON "Decision"("seedKey");

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BudgetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuestion" ADD CONSTRAINT "VendorQuestion_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorNote" ADD CONSTRAINT "VendorNote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_partyMemberId_fkey" FOREIGN KEY ("partyMemberId") REFERENCES "WeddingPartyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingPartyMember" ADD CONSTRAINT "WeddingPartyMember_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingPartyMember" ADD CONSTRAINT "WeddingPartyMember_chosenStyleId_fkey" FOREIGN KEY ("chosenStyleId") REFERENCES "AttireOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingPartyMember" ADD CONSTRAINT "WeddingPartyMember_shoeOptionId_fkey" FOREIGN KEY ("shoeOptionId") REFERENCES "AttireOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_plusOneOfId_fkey" FOREIGN KEY ("plusOneOfId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "SeatingTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Constraints Prisma can't express ─────────────────────────────────────────

-- Single-row tables.
ALTER TABLE "WeddingSettings" ADD CONSTRAINT "WeddingSettings_single_row" CHECK ("id" = 1);
ALTER TABLE "AuthState" ADD CONSTRAINT "AuthState_single_row" CHECK ("id" = 1);

-- Settings sanity.
ALTER TABLE "WeddingSettings"
  ADD CONSTRAINT "WeddingSettings_money_nonneg" CHECK ("totalBudgetCents" >= 0 AND "perPersonOverageCents" >= 0 AND "overageTaxPpm" >= 0),
  ADD CONSTRAINT "WeddingSettings_counts_nonneg" CHECK ("headcountTarget" >= 0 AND "includedHeadcount" >= 0),
  ADD CONSTRAINT "WeddingSettings_times" CHECK (
    "venueAccessTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND ("ceremonyTime" IS NULL OR "ceremonyTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
  );

-- Exactly one contingency category at most.
CREATE UNIQUE INDEX "BudgetCategory_one_contingency" ON "BudgetCategory" ("isContingency") WHERE "isContingency";
ALTER TABLE "BudgetCategory" ADD CONSTRAINT "BudgetCategory_estimate_nonneg" CHECK ("estimateCents" >= 0);

ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_money_nonneg"
  CHECK (("estimateCents" IS NULL OR "estimateCents" >= 0) AND ("contractedCents" IS NULL OR "contractedCents" >= 0));

-- A paid payment always has a real, frozen amount.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paid_has_amount" CHECK ("paidDate" IS NULL OR "amountCents" IS NOT NULL);
-- A computed payment stores no amount until it is paid.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_rule_or_amount" CHECK ("amountRule" IS NULL OR "paidDate" IS NOT NULL OR "amountCents" IS NULL);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_nonneg" CHECK ("amountCents" IS NULL OR "amountCents" >= 0);

ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_arrival_time" CHECK ("arrivalTime" IS NULL OR "arrivalTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_nonneg" CHECK ("mealsRequired" >= 0 AND ("quotedCents" IS NULL OR "quotedCents" >= 0));

-- completedAt is set exactly when a task is done.
ALTER TABLE "Task" ADD CONSTRAINT "Task_completed_iff_done" CHECK (("status" = 'DONE') = ("completedAt" IS NOT NULL));

-- An event is either timed or all-day, never both or neither.
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_timed_xor_allday" CHECK (("startAt" IS NOT NULL) <> ("allDayDate" IS NOT NULL));
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_end_after_start" CHECK ("endAt" IS NULL OR ("startAt" IS NOT NULL AND "endAt" >= "startAt"));

ALTER TABLE "SeatingTable" ADD CONSTRAINT "SeatingTable_capacity_positive" CHECK ("capacity" > 0);
ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_seat_positive" CHECK ("seatNumber" IS NULL OR "seatNumber" > 0);
