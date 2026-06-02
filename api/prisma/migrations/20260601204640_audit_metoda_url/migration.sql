-- DropForeignKey
ALTER TABLE "LOG_voznja" DROP CONSTRAINT "LOG_voznja_voznja_id_voznja_fkey";

-- DropIndex
DROP INDEX "LOG_voznja_voznja_id_voznja_idx";

-- AlterTable
ALTER TABLE "LOG_voznja" ADD COLUMN     "metoda" VARCHAR(10),
ADD COLUMN     "url" VARCHAR(255),
ALTER COLUMN "TYPE" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "voznja_id_voznja" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "LOG_voznja_voznja_fk_uporabnik_idx" ON "LOG_voznja"("voznja_fk_uporabnik");

-- CreateIndex
CREATE INDEX "LOG_voznja_timestamp_idx" ON "LOG_voznja"("timestamp");

-- AddForeignKey
ALTER TABLE "LOG_voznja" ADD CONSTRAINT "LOG_voznja_voznja_fk_uporabnik_fkey" FOREIGN KEY ("voznja_fk_uporabnik") REFERENCES "Uporabnik"("id_uporabnik") ON DELETE RESTRICT ON UPDATE CASCADE;
