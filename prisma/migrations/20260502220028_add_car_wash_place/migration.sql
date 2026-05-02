-- CreateEnum
CREATE TYPE "WashServiceType" AS ENUM ('self', 'full_service');

-- CreateTable
CREATE TABLE "CarWashPlace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mapsUrl" TEXT,
    "serviceType" "WashServiceType" NOT NULL DEFAULT 'full_service',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarWashPlace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarWashPlace_userId_idx" ON "CarWashPlace"("userId");

-- AddForeignKey
ALTER TABLE "CarWashPlace" ADD CONSTRAINT "CarWashPlace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
