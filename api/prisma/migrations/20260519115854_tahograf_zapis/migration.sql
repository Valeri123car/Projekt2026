-- CreateTable
CREATE TABLE "tahograf_zapis" (
    "id_zapis" SERIAL NOT NULL,
    "fk_uporabnik" INTEGER NOT NULL,
    "stanje" VARCHAR(20) NOT NULL,
    "zacetek" TIMESTAMP(3) NOT NULL,
    "konec" TIMESTAMP(3),
    "trajanje_min" INTEGER,
    "lokacija_zac" VARCHAR(100),
    "lokacija_kon" VARCHAR(100),
    "timestamp_zapis" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tahograf_zapis_pkey" PRIMARY KEY ("id_zapis")
);

-- CreateIndex
CREATE INDEX "tahograf_zapis_fk_uporabnik_idx" ON "tahograf_zapis"("fk_uporabnik");

-- CreateIndex
CREATE INDEX "tahograf_zapis_stanje_idx" ON "tahograf_zapis"("stanje");

-- AddForeignKey
ALTER TABLE "tahograf_zapis" ADD CONSTRAINT "tahograf_zapis_fk_uporabnik_fkey" FOREIGN KEY ("fk_uporabnik") REFERENCES "Uporabnik"("id_uporabnik") ON DELETE RESTRICT ON UPDATE CASCADE;
