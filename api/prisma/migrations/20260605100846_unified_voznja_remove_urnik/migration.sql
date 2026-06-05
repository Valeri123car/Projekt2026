/*
  Warnings:

  - You are about to drop the column `fk_urnik` on the `Voznja` table. All the data in the column will be lost.
  - You are about to drop the column `stranka` on the `Voznja` table. All the data in the column will be lost.
  - You are about to drop the `Urnik` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Urnik" DROP CONSTRAINT "Urnik_fk_stranka_fkey";

-- DropForeignKey
ALTER TABLE "Urnik" DROP CONSTRAINT "Urnik_fk_uporabnik_fkey";

-- DropForeignKey
ALTER TABLE "Urnik" DROP CONSTRAINT "Urnik_fk_vozilo_fkey";

-- DropForeignKey
ALTER TABLE "Voznja" DROP CONSTRAINT "Voznja_fk_urnik_fkey";

-- DropIndex
DROP INDEX "Voznja_fk_urnik_idx";

-- AlterTable
ALTER TABLE "Voznja" DROP COLUMN "fk_urnik",
DROP COLUMN "stranka",
ADD COLUMN     "cena" DOUBLE PRECISION,
ADD COLUMN     "fk_stranka" INTEGER,
ADD COLUMN     "fk_vozilo" INTEGER,
ADD COLUMN     "stranka_ime" VARCHAR(100);

-- DropTable
DROP TABLE "Urnik";

-- CreateIndex
CREATE INDEX "Voznja_fk_vozilo_idx" ON "Voznja"("fk_vozilo");

-- CreateIndex
CREATE INDEX "Voznja_fk_stranka_idx" ON "Voznja"("fk_stranka");

-- AddForeignKey
ALTER TABLE "Voznja" ADD CONSTRAINT "Voznja_fk_vozilo_fkey" FOREIGN KEY ("fk_vozilo") REFERENCES "Vozilo"("id_vozilo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voznja" ADD CONSTRAINT "Voznja_fk_stranka_fkey" FOREIGN KEY ("fk_stranka") REFERENCES "Stranka"("id_stranka") ON DELETE SET NULL ON UPDATE CASCADE;
