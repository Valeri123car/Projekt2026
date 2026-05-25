-- AlterTable
ALTER TABLE "tahograf_zapis" ADD COLUMN     "posadka" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registrska" VARCHAR(20),
ADD COLUMN     "uvoz" BOOLEAN NOT NULL DEFAULT false;
