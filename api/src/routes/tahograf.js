export default async function tahograf(app) {
  app.get(
    "/aktivno",
    {
      onRequest: [app.authenticate],
      schema: { description: "Vrni aktivni tahografski zapis (brez konca)" },
    },
    async (request) => {
      return app.prisma.tahografZapis.findFirst({
        where: { fk_uporabnik: request.user.id, konec: null },
        orderBy: { zacetek: "desc" },
      });
    },
  );

  app.get(
    "/zgodovina",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Vrni zgodovino tahografskih zapisov",
        querystring: {
          type: "object",
          properties: {
            od: { type: "string", format: "date" },
            do: { type: "string", format: "date" },
            limit: { type: "integer", default: 50 },
          },
        },
      },
    },
    async (request) => {
      const { od, do: do_, limit } = request.query;
      const where = { fk_uporabnik: request.user.id };

      if (od || do_) {
        where.zacetek = {};
        if (od) where.zacetek.gte = new Date(od);
        if (do_) where.zacetek.lte = new Date(do_);
      }

      return app.prisma.tahografZapis.findMany({
        where,
        orderBy: { zacetek: "desc" },
        take: limit || 50,
      });
    },
  );

  app.get(
    "/povzetek",
    {
      onRequest: [app.authenticate],
      schema: { description: "Dnevni povzetek časov po stanjih" },
    },
    async (request) => {
      const danes = new Date();
      danes.setHours(0, 0, 0, 0);
      const jutri = new Date(danes);
      jutri.setDate(jutri.getDate() + 1);

      const zapisi = await app.prisma.tahografZapis.findMany({
        where: {
          fk_uporabnik: request.user.id,
          zacetek: { gte: danes, lt: jutri },
          konec: { not: null },
        },
      });

      const povzetek = { VOZNJA: 0, ODMOR: 0, POCITEK: 0, DRUGO: 0 };

      for (const z of zapisi) {
        if (z.trajanje_min && povzetek[z.stanje] !== undefined) {
          povzetek[z.stanje] += z.trajanje_min;
        }
      }

      return {
        datum: danes.toISOString().split("T")[0],
        minute: povzetek,
        ure: Object.fromEntries(
          Object.entries(povzetek).map(([k, v]) => [
            k,
            Math.round((v / 60) * 100) / 100,
          ]),
        ),
      };
    },
  );

  app.post(
    "/zacni",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Začni novo stanje",
        body: {
          type: "object",
          required: ["stanje"],
          properties: {
            stanje: {
              type: "string",
              enum: ["VOZNJA", "ODMOR", "POCITEK", "DRUGO"],
            },
            lokacija_zac: { type: "string" },
            cas_akcije: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { stanje, lokacija_zac, cas_akcije } = request.body;
      const zdaj = cas_akcije ? new Date(cas_akcije) : new Date();

      const aktivni = await app.prisma.tahografZapis.findFirst({
        where: { fk_uporabnik: request.user.id, konec: null },
      });

      if (aktivni) {
        const trajanje = Math.round((zdaj - new Date(aktivni.zacetek)) / 60000);
        await app.prisma.tahografZapis.update({
          where: { id_zapis: aktivni.id_zapis },
          data: { konec: zdaj, trajanje_min: trajanje },
        });
      }

      const novi = await app.prisma.tahografZapis.create({
        data: {
          fk_uporabnik: request.user.id,
          stanje,
          zacetek: zdaj,
          lokacija_zac: lokacija_zac || null,
        },
      });

      return reply.code(201).send(novi);
    },
  );

  app.post(
    "/zakljuci",
    {
      onRequest: [app.authenticate],
      schema: { description: "Zaključi aktivno stanje" },
    },
    async (request, reply) => {
      const cas_akcije = request.body?.cas_akcije;
      const zdaj = cas_akcije ? new Date(cas_akcije) : new Date();

      const aktivni = await app.prisma.tahografZapis.findFirst({
        where: { fk_uporabnik: request.user.id, konec: null },
      });

      if (!aktivni) {
        return reply.code(404).send({ error: "Ni aktivnega stanja" });
      }

      const trajanje = Math.round((zdaj - new Date(aktivni.zacetek)) / 60000);

      const posodobljen = await app.prisma.tahografZapis.update({
        where: { id_zapis: aktivni.id_zapis },
        data: {
          konec: zdaj,
          trajanje_min: trajanje,
          lokacija_kon: request.body?.lokacija_kon || null,
        },
      });

      return posodobljen;
    },
  );
}
