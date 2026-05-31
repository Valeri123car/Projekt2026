export default async function voznje(app) {
  const protected = async (request, reply) => {
    if (request.user.vloga !== 2 || request.user.vloga !== 1) {
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
      onRequest: [app.authenticate, protected],
      schema: {
        description: "Vrni vse vožnje za izbrane voznike v danem obdobju",
        querystring: {
          type: "object",
          required: ["od", "do"],
          properties: {
            fk_uporabnik: {
              oneOf: [
                { type: "integer" },
                { type: "array", items: { type: "integer" } },
              ],
            },
            od: { type: "string", format: "date" },
            do: { type: "string", format: "date" },
          },
        },
      },
    },
    async (request, reply) => {
      let { fk_uporabnik, od, do: doDate } = request.query;

      // Handle single or multiple user IDs
      if (typeof fk_uporabnik === "string") {
        fk_uporabnik = [parseInt(fk_uporabnik)];
      } else if (Array.isArray(fk_uporabnik)) {
        fk_uporabnik = fk_uporabnik.map((id) => parseInt(id));
      } else {
        fk_uporabnik = [];
      }

      if (fk_uporabnik.length === 0) {
        return reply
          .code(400)
          .send({ error: "Vsaj en voznik mora biti izbran" });
      }

      const fromDate = new Date(od);
      const toDate = new Date(doDate);
      toDate.setHours(23, 59, 59, 999);

      const voznje = await app.prisma.voznja.findMany({
        where: {
          fk_uporabnik: { in: fk_uporabnik },
          zacetek: {
            gte: fromDate,
            lte: toDate,
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
        orderBy: { zacetek: "desc" },
      });

      return voznje.map((voznja) => ({
        ...voznja,
        voznik: `${voznja.uporabnik.ime} ${voznja.uporabnik.priimek}`,
      }));
    }
  );
}
