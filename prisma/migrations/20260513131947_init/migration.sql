-- CreateTable
CREATE TABLE "urna_postavka" (
    "id_postavka" SERIAL NOT NULL,
    "postavka" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "urna_postavka_pkey" PRIMARY KEY ("id_postavka")
);

-- CreateTable
CREATE TABLE "Uporabnik" (
    "id_uporabnik" SERIAL NOT NULL,
    "ime" VARCHAR(45) NOT NULL,
    "priimek" VARCHAR(45) NOT NULL,
    "emso_crypted" VARCHAR(255),
    "dostop" INTEGER NOT NULL DEFAULT 1,
    "email" VARCHAR(100) NOT NULL,
    "geslo" VARCHAR(255) NOT NULL,
    "fk_postavka" INTEGER,

    CONSTRAINT "Uporabnik_pkey" PRIMARY KEY ("id_uporabnik")
);

-- CreateTable
CREATE TABLE "Voznja" (
    "id_voznja" SERIAL NOT NULL,
    "datum" DATE NOT NULL,
    "zacetek" TIMESTAMP(3) NOT NULL,
    "konc" TIMESTAMP(3) NOT NULL,
    "trajanje" TEXT,
    "fk_uporabnik" INTEGER NOT NULL,
    "timestamp_zapis" TIMESTAMP(3),

    CONSTRAINT "Voznja_pkey" PRIMARY KEY ("id_voznja")
);

-- CreateTable
CREATE TABLE "tip_vozila" (
    "id_tip_vozila" SERIAL NOT NULL,
    "naziv" VARCHAR(45),

    CONSTRAINT "tip_vozila_pkey" PRIMARY KEY ("id_tip_vozila")
);

-- CreateTable
CREATE TABLE "Vozilo" (
    "id_vozilo" SERIAL NOT NULL,
    "registerska" VARCHAR(45) NOT NULL,
    "st_sedezev" INTEGER NOT NULL,
    "dolzina" INTEGER,
    "fk_tip_vozila" INTEGER NOT NULL,

    CONSTRAINT "Vozilo_pkey" PRIMARY KEY ("id_vozilo")
);

-- CreateTable
CREATE TABLE "Stranka" (
    "id_stranka" SERIAL NOT NULL,
    "naziv" VARCHAR(45) NOT NULL,
    "email" VARCHAR(45),
    "telefonska" VARCHAR(45),
    "davcna_st" INTEGER,

    CONSTRAINT "Stranka_pkey" PRIMARY KEY ("id_stranka")
);

-- CreateTable
CREATE TABLE "Urnik" (
    "id_urnik" SERIAL NOT NULL,
    "datum" DATE NOT NULL,
    "cena" DOUBLE PRECISION,
    "naziv" VARCHAR(45),
    "placano" BOOLEAN NOT NULL DEFAULT false,
    "fk_vozilo" INTEGER NOT NULL,
    "fk_uporabnik" INTEGER NOT NULL,
    "fk_stranka" INTEGER NOT NULL,

    CONSTRAINT "Urnik_pkey" PRIMARY KEY ("id_urnik")
);

-- CreateTable
CREATE TABLE "LOG_voznja" (
    "idLOG" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "TYPE" VARCHAR(45) NOT NULL,
    "voznja_id_voznja" INTEGER NOT NULL,
    "voznja_fk_uporabnik" INTEGER NOT NULL,

    CONSTRAINT "LOG_voznja_pkey" PRIMARY KEY ("idLOG")
);

-- CreateTable
CREATE TABLE "Racun" (
    "idRacun" SERIAL NOT NULL,
    "datum_izdaje" DATE NOT NULL,
    "st_ur" DOUBLE PRECISION NOT NULL,
    "placa" DOUBLE PRECISION NOT NULL,
    "fk_uporabnik" INTEGER NOT NULL,

    CONSTRAINT "Racun_pkey" PRIMARY KEY ("idRacun")
);

-- CreateIndex
CREATE UNIQUE INDEX "Uporabnik_email_key" ON "Uporabnik"("email");

-- CreateIndex
CREATE INDEX "Uporabnik_fk_postavka_idx" ON "Uporabnik"("fk_postavka");

-- CreateIndex
CREATE INDEX "Voznja_fk_uporabnik_idx" ON "Voznja"("fk_uporabnik");

-- CreateIndex
CREATE INDEX "Vozilo_fk_tip_vozila_idx" ON "Vozilo"("fk_tip_vozila");

-- CreateIndex
CREATE INDEX "Urnik_fk_vozilo_idx" ON "Urnik"("fk_vozilo");

-- CreateIndex
CREATE INDEX "Urnik_fk_uporabnik_idx" ON "Urnik"("fk_uporabnik");

-- CreateIndex
CREATE INDEX "Urnik_fk_stranka_idx" ON "Urnik"("fk_stranka");

-- CreateIndex
CREATE INDEX "LOG_voznja_voznja_id_voznja_idx" ON "LOG_voznja"("voznja_id_voznja");

-- CreateIndex
CREATE INDEX "Racun_fk_uporabnik_idx" ON "Racun"("fk_uporabnik");

-- AddForeignKey
ALTER TABLE "Uporabnik" ADD CONSTRAINT "Uporabnik_fk_postavka_fkey" FOREIGN KEY ("fk_postavka") REFERENCES "urna_postavka"("id_postavka") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voznja" ADD CONSTRAINT "Voznja_fk_uporabnik_fkey" FOREIGN KEY ("fk_uporabnik") REFERENCES "Uporabnik"("id_uporabnik") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vozilo" ADD CONSTRAINT "Vozilo_fk_tip_vozila_fkey" FOREIGN KEY ("fk_tip_vozila") REFERENCES "tip_vozila"("id_tip_vozila") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Urnik" ADD CONSTRAINT "Urnik_fk_vozilo_fkey" FOREIGN KEY ("fk_vozilo") REFERENCES "Vozilo"("id_vozilo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Urnik" ADD CONSTRAINT "Urnik_fk_uporabnik_fkey" FOREIGN KEY ("fk_uporabnik") REFERENCES "Uporabnik"("id_uporabnik") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Urnik" ADD CONSTRAINT "Urnik_fk_stranka_fkey" FOREIGN KEY ("fk_stranka") REFERENCES "Stranka"("id_stranka") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LOG_voznja" ADD CONSTRAINT "LOG_voznja_voznja_id_voznja_fkey" FOREIGN KEY ("voznja_id_voznja") REFERENCES "Voznja"("id_voznja") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Racun" ADD CONSTRAINT "Racun_fk_uporabnik_fkey" FOREIGN KEY ("fk_uporabnik") REFERENCES "Uporabnik"("id_uporabnik") ON DELETE RESTRICT ON UPDATE CASCADE;
