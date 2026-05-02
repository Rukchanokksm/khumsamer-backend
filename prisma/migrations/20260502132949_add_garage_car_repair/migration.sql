-- CreateEnum
CREATE TYPE "RepairType" AS ENUM ('oil_change', 'tire', 'brake', 'battery', 'filter', 'inspection', 'body_repair', 'electrical', 'ac', 'wash', 'other');

-- CreateTable
CREATE TABLE "Garage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mapsUrl" TEXT,
    "phones" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Garage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarRepair" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carName" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "repairType" "RepairType" NOT NULL,
    "date" DATE NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "garageId" TEXT,
    "receiptUrl" TEXT,
    "receiptPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarRepair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Garage_userId_idx" ON "Garage"("userId");

-- CreateIndex
CREATE INDEX "CarRepair_userId_idx" ON "CarRepair"("userId");

-- CreateIndex
CREATE INDEX "CarRepair_userId_date_idx" ON "CarRepair"("userId", "date");

-- AddForeignKey
ALTER TABLE "Garage" ADD CONSTRAINT "Garage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarRepair" ADD CONSTRAINT "CarRepair_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarRepair" ADD CONSTRAINT "CarRepair_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
