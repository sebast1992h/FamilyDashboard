-- CreateTable
CREATE TABLE "DayActivityIcon" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "personName" TEXT NOT NULL,
    "activityIconId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayActivityIcon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayActivityIcon_date_personName_activityIconId_key" ON "DayActivityIcon"("date", "personName", "activityIconId");
