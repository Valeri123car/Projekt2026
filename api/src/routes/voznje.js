export default async function voznje(app) {
  const protectedOnly = async (request, reply) => {
    if (request.user.vloga !== 2) {
      return reply
        .code(403)
        .send({ error: "Dostop zavrnjen" });
    }
  };

  app.get(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Vrni vse vožnje prijavljenega voznika",
      },
    },
    async (request) => {
      return app.prisma.voznja.findMany({
        where: { fk_uporabnik: request.user.id },
        orderBy: { datum: "desc" },
        select: {
          id_voznja: true,
          datum: true,
          zacetek: true,
          konc: true,
          trajanje: true,
          stranka: true,
          relacija: true,
          opis: true,
          timestamp_zapis: true,
          fk_uporabnik: true,
        },
      });
    },
  );

  app.post(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        body: {
          type: "object",
          required: ["datum", "zacetek", "konc"],
          properties: {
            datum: { type: "string", format: "date" },
            zacetek: { type: "string" },
            konc: { type: "string" },
            stranka: { type: "string" },
            relacija: { type: "string" },
            opis: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { datum, zacetek, konc, fk_stranka, stranka, relacija, opis } =
        request.body;

      const voznja = await app.prisma.voznja.create({
        data: {
          datum: new Date(datum),
          zacetek: new Date(zacetek),
          konc: new Date(konc),
          fk_uporabnik: request.user.id,
          fk_stranka,
          stranka: stranka || null,
          relacija: relacija || null,
          opis: opis || null,
          timestamp_zapis: new Date(),
        },
      });

      return reply.code(201).send(voznja);
    },
  );

  app.delete(
    "/:id",
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const id = parseInt(request.params.id);

      const voznja = await app.prisma.voznja.findUnique({
        where: { id_voznja: id },
      });

      if (!voznja) {
        return reply.code(404).send({ error: "Vožnja ne obstaja" });
      }

      if (voznja.fk_uporabnik !== request.user.id && request.user.vloga !== 2) {
        return reply.code(403).send({ error: "Dostop zavrnjen" });
      }

      await app.prisma.voznja.delete({ where: { id_voznja: id } });

      return reply.code(204).send();
    },
  );
  app.get(
    "/voznjeMesec",
    {
      onRequest: [app.authenticate, protectedOnly],
      schema: {
        description: "Vrni mesečno poročilo za izbrane voznike",
        querystring: {
          type: "object",
          required: ["od", "do"],
          properties: {
            od: { type: "string" },
            do: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      let { fk_uporabnik, od, do: doDate } = request.query;

      // Handle single or multiple user IDs
      let voznikIds = [];
      if (typeof fk_uporabnik === "string") {
        voznikIds = [parseInt(fk_uporabnik)];
      } else if (Array.isArray(fk_uporabnik)) {
        voznikIds = fk_uporabnik.map((id) => parseInt(id));
      }

      if (voznikIds.length === 0) {
        return reply
          .code(400)
          .send({ error: "Vsaj en voznik mora biti izbran" });
      }

      const monthFromDate = new Date(od);
      const monthToDate = new Date(doDate);
      monthToDate.setHours(23, 59, 59, 999);

      console.log("Fetching voznjeMesec with params:", { voznikIds, od, doDate, monthFromDate, monthToDate });

      // Calculate date 4 weeks (28 days) ago
      const fourWeeksAgo = new Date(monthToDate);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      // Fetch data for selected month from TahografZapis
      const voznjeMesec = await app.prisma.tahografZapis.findMany({
        where: {
          fk_uporabnik: { in: voznikIds },
          zacetek: {
            gte: monthFromDate,
            lte: monthToDate,
          },
        },
        include: {
          uporabnik: {
            select: {
              ime: true,
              priimek: true,
            },
          },
        },
        orderBy: { zacetek: "asc" },
      });

      console.log("voznjeMesec found:", voznjeMesec.length, "entries");

      // Fetch data for last 4 weeks from TahografZapis
      const voznje4mesece = await app.prisma.tahografZapis.findMany({
        where: {
          fk_uporabnik: { in: voznikIds },
          zacetek: {
            gte: fourWeeksAgo,
            lte: monthToDate,
          },
        },
        include: {
          uporabnik: {
            select: {
              ime: true,
              priimek: true,
            },
          },
        },
      });

      // Helper function to convert minutes to hours
      const parseMinutesToHours = (minutes) => {
        if (!minutes) return 0;
        return minutes / 60;
      };

      // Calculate totals per voznik for current month and last 4 months
      const monthTotals = {};
      const fourMonthsTotals = {};

      // Sum current month
      voznjeMesec.forEach((zapis) => {
        if (zapis.stanje === "Vožnja" || zapis.stanje === "Delo") {
          if (!monthTotals[zapis.fk_uporabnik]) {
            monthTotals[zapis.fk_uporabnik] = 0;
          }
          monthTotals[zapis.fk_uporabnik] += parseMinutesToHours(zapis.trajanje_min);
        }
      });

      // Sum last 4 months
      voznje4mesece.forEach((zapis) => {
        if (zapis.stanje === "Vožnja" || zapis.stanje === "Delo") {
          if (!fourMonthsTotals[zapis.fk_uporabnik]) {
            fourMonthsTotals[zapis.fk_uporabnik] = 0;
          }
          fourMonthsTotals[zapis.fk_uporabnik] += parseMinutesToHours(zapis.trajanje_min);
        }
      });

      console.log("Month totals:", monthTotals);
      console.log("4-month totals:", fourMonthsTotals);

      // Group by voznik for the selected month
      const result = {};

      voznjeMesec.forEach((zapis) => {
        const voznikName = `${zapis.uporabnik.ime} ${zapis.uporabnik.priimek}`;

        if (!result[voznikName]) {
          result[voznikName] = {
            voznik: voznikName,
            fk_uporabnik: zapis.fk_uporabnik,
            taMesec: [],
          };
        }

        // Add each entry to taMesec array
        const hours = Math.floor(parseMinutesToHours(zapis.trajanje_min));
        const minutes = (zapis.trajanje_min || 0) % 60;

        result[voznikName].taMesec.push({
          zacetek: zapis.zacetek,
          konc: zapis.konec,
          trajanje: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
          aktivnost: zapis.stanje,
          posadka: zapis.posadka ? "Da" : "Ne",
        });
      });

      // Format and return results
      return Object.values(result).map((entry) => {
        // Use 4-month total, but at least use current month's total
        const total = fourMonthsTotals[entry.fk_uporabnik] || monthTotals[entry.fk_uporabnik] || 0;
        return {
          voznik: entry.voznik,
          zadnje4mesece: Math.round(total * 100) / 100,
          taMesec: entry.taMesec,
        };
      });
    }
  );
}
