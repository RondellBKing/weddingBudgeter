-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "seedKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_seedKey_key" ON "CalendarEvent"("seedKey");

