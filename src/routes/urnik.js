export default async function urnik(app) {
  app.get(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Vrni urnik prijavljenega voznika",
      },
    },
    async (request) => {
      return app.prisma.urnik.findMany({
        where: { fk_uporabnik: request.user.id },
        include: {
          stranka: true,
          vozilo: true,
        },
        orderBy: { datum: "asc" },
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
          required: ["datum", "naziv", "fk_vozilo", "fk_stranka"],
          properties: {
            datum: { type: "string", format: "date" },
            cena: { type: "number" },
            naziv: { type: "string" },
            placano: { type: "boolean", default: false },
            fk_vozilo: { type: "integer" },
            fk_stranka: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      const { datum, cena, naziv, placano, fk_vozilo, fk_stranka } =
        request.body;

      const vnos = await app.prisma.urnik.create({
        data: {
          datum: new Date(datum),
          cena,
          naziv,
          placano: placano || false,
          fk_vozilo,
          fk_uporabnik: request.user.id,
          fk_stranka,
        },
      });

      return reply.code(201).send(vnos);
    },
  );

  app.put(
    "/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const data = request.body;

      const vnos = await app.prisma.urnik.update({
        where: { id_urnik: id },
        data,
      });

      return vnos;
    },
  );

  app.delete(
    "/:id",
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      await app.prisma.urnik.delete({
        where: { id_urnik: id },
      });

      return reply.code(204).send();
    },
  );
}
