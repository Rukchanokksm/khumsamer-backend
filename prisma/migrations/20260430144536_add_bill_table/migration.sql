-- CreateEnum
CREATE TYPE "BillCategory" AS ENUM ('water', 'electricity', 'rent', 'food', 'car_installment', 'item_installment', 'internet', 'mobile', 'insurance', 'other');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('pending', 'paid');

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "BillCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidDate" DATE,
    "status" "BillStatus" NOT NULL DEFAULT 'pending',
    "isInstallment" BOOLEAN NOT NULL DEFAULT false,
    "installmentNo" INTEGER,
    "totalInstallments" INTEGER,
    "notes" TEXT,
    "receiptUrl" TEXT,
    "receiptPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bill_userId_idx" ON "Bill"("userId");

-- CreateIndex
CREATE INDEX "Bill_userId_dueDate_idx" ON "Bill"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "Bill_userId_status_idx" ON "Bill"("userId", "status");

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
