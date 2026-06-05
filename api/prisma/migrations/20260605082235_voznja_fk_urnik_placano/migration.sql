/*
  Warnings:

  - You are about to drop the column `fk_postavka` on the `Uporabnik` table. All the data in the column will be lost.
  - You are about to drop the column `aktivnost` on the `Voznja` table. All the data in the column will be lost.
  - You are about to drop the column `posadka` on the `Voznja` table. All the data in the column will be lost.
  - You are about to drop the column `registerska` on the `Voznja` table. All the data in the column will be lost.
  - You are about to drop the column `trajanje` on the `Voznja` table. All the data in the column will be lost.
  - You are about to drop the `Racun` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `urna_postavka` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Racun" DROP CONSTRAINT "Racun_fk_uporabnik_fkey";

-- DropForeignKey
ALTER TABLE "Uporabnik" DROP CONSTRAINT "Uporabnik_fk_postavka_fkey";

-- DropIndex
DROP INDEX "Uporabnik_fk_postavka_idx";

-- AlterTable
ALTER TABLE "Uporabnik" DROP COLUMN "fk_postavka";

-- AlterTable
ALTER TABLE "Voznja" DROP COLUMN "aktivnost",
DROP COLUMN "posadka",
DROP COLUMN "registerska",
DROP COLUMN "trajanje",
ADD COLUMN     "fk_urnik" INTEGER,
ADD COLUMN     "placano" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Racun";

-- DropTable
DROP TABLE "urna_postavka";

-- CreateIndex
CREATE INDEX "Voznja_fk_urnik_idx" ON "Voznja"("fk_urnik");

-- AddForeignKey
ALTER TABLE "Voznja" ADD CONSTRAINT "Voznja_fk_urnik_fkey" FOREIGN KEY ("fk_urnik") REFERENCES "Urnik"("id_urnik") ON DELETE SET NULL ON UPDATE CASCADE;
