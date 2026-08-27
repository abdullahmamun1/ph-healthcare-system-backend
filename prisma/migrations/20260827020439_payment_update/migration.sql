/*
  Warnings:

  - You are about to drop the column `r` on the `payments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "payments_r_key";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "r";
