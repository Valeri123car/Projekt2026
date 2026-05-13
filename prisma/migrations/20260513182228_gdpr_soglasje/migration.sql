-- AlterTable
ALTER TABLE "Uporabnik" ADD COLUMN     "gdpr_datum" TIMESTAMP(3),
ADD COLUMN     "gdpr_soglasje" BOOLEAN NOT NULL DEFAULT false;
