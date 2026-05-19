export default async function voznje(app) {
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
}
