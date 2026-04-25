-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "CarExpenseCategory" AS ENUM ('fuel', 'parking', 'toll', 'insurance', 'tax', 'wash', 'accessories', 'other');

-- CreateEnum
CREATE TYPE "TravelExpenseCategory" AS ENUM ('fuel', 'toll', 'parking', 'accommodation', 'food', 'ferry', 'other');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accessKey" TEXT NOT NULL,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "CarExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carName" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "category" "CarExpenseCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "liters" DOUBLE PRECISION,
    "pricePerLiter" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tripName" TEXT NOT NULL,
    "carName" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "category" "TravelExpenseCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "liters" DOUBLE PRECISION,
    "pricePerLiter" DOUBLE PRECISION,
    "distance" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarExpense_userId_idx" ON "CarExpense"("userId");

-- CreateIndex
CREATE INDEX "CarExpense_userId_date_idx" ON "CarExpense"("userId", "date");

-- CreateIndex
CREATE INDEX "TravelExpense_userId_idx" ON "TravelExpense"("userId");

-- CreateIndex
CREATE INDEX "TravelExpense_userId_date_idx" ON "TravelExpense"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "User_accessKey_key" ON "User"("accessKey");

-- AddForeignKey
ALTER TABLE "CarExpense" ADD CONSTRAINT "CarExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelExpense" ADD CONSTRAINT "TravelExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
