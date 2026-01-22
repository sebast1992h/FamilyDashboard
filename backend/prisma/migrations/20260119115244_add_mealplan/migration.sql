-- CreateTable
CREATE TABLE "MealPlan" (
    "id" SERIAL NOT NULL,
    "day" INTEGER NOT NULL,
    "mealType" INTEGER NOT NULL,
    "meal" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);
