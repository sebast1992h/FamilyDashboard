/*
  Warnings:

  - You are about to drop the column `day` on the `MealPlan` table. All the data in the column will be lost.
  - Added the required column `date` to the `MealPlan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MealPlan" DROP COLUMN "day",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Config" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Config_key_key" ON "Config"("key");
