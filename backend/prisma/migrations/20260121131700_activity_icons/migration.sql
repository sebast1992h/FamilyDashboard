-- CreateTable
CREATE TABLE "ActivityIcon" (
    "id" SERIAL NOT NULL,
    "activity" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityIcon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityIcon_activity_key" ON "ActivityIcon"("activity");
