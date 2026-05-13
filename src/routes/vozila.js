export default async function vozila(app) {
  app.get(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Vrni vsa vozila",
      },
    },
    async () => {
      return app.prisma.vozilo.findMany({
        include: { tip_vozila: true },
        orderBy: { registerska: "asc" },
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
          required: ["registerska", "st_sedezev", "fk_tip_vozila"],
          properties: {
            registerska: { type: "string" },
            st_sedezev: { type: "integer" },
            dolzina: { type: "integer" },
            fk_tip_vozila: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      const vozilo = await app.prisma.vozilo.create({
        data: request.body,
      });
      return reply.code(201).send(vozilo);
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
    async (request) => {
      return app.prisma.vozilo.update({
        where: { id_vozilo: parseInt(request.params.id) },
        data: request.body,
      });
    },
  );

  app.delete(
    "/:id",
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      await app.prisma.vozilo.delete({
        where: { id_vozilo: parseInt(request.params.id) },
      });
      return reply.code(204).send();
    },
  );
}
