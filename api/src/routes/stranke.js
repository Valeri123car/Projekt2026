export default async function stranke(app) {
  app.get(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Vrni vse stranke",
      },
    },
    async () => {
      return app.prisma.stranka.findMany({
        orderBy: { naziv: "asc" },
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
          required: ["naziv"],
          properties: {
            naziv: { type: "string" },
            email: { type: "string" },
            telefonska: { type: "string" },
            davcna_st: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      const stranka = await app.prisma.stranka.create({
        data: request.body,
      });
      return reply.code(201).send(stranka);
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
      return app.prisma.stranka.update({
        where: { id_stranka: parseInt(request.params.id) },
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
      await app.prisma.stranka.delete({
        where: { id_stranka: parseInt(request.params.id) },
      });
      return reply.code(204).send();
    },
  );
}
