-- CreateEnum: DataOrderStatus (separate status for data purchases)
CREATE TYPE "DataOrderStatus" AS ENUM ('PLACED', 'PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');

-- AlterTable: Add dataStatus column to Order for data purchase tracking
ALTER TABLE "Order" ADD COLUMN "dataStatus" "DataOrderStatus";

-- AlterTable: Make phone required on User (set existing nulls to empty string first)
UPDATE "User" SET "phone" = '' WHERE "phone" IS NULL;
ALTER TABLE "User" ALTER COLUMN "phone" SET NOT NULL;
