/*
  Warnings:

  - You are about to drop the column `uvoz` on the `tahograf_zapis` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tahograf_zapis" DROP COLUMN "uvoz",
ADD COLUMN     "vir" VARCHAR(20) NOT NULL DEFAULT 'POSNETO';

-- CreateIndex
CREATE INDEX "tahograf_zapis_vir_idx" ON "tahograf_zapis"("vir");
