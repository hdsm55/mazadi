-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "creditLimitMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kycLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kycStatus" "KycStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "riskSuspended" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BidderDeposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BidderDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "level" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BidderDeposit_userId_idx" ON "BidderDeposit"("userId");

-- CreateIndex
CREATE INDEX "BidderDeposit_status_idx" ON "BidderDeposit"("status");

-- CreateIndex
CREATE INDEX "RiskFlag_userId_idx" ON "RiskFlag"("userId");

-- CreateIndex
CREATE INDEX "RiskFlag_kind_idx" ON "RiskFlag"("kind");

-- AddForeignKey
ALTER TABLE "BidderDeposit" ADD CONSTRAINT "BidderDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
