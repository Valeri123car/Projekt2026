export default async function urnaPostavka(app) {
  app.get(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Vrni vse urne postavke",
      },
    },
    async () => {
      return app.prisma.urnaPostavka.findMany({
        orderBy: { id_postavka: "asc" },
      });
    },
  );

  app.post(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Ustvari novo urno postavko (samo admin)",
        body: {
          type: "object",
          required: ["postavka"],
          properties: {
            postavka: { type: "number" },
          },
        },
      },
    },
    async (request, reply) => {
      if (request.user.vloga !== 2) {
        return reply.code(403).send({ error: "Dostop zavrnjen" });
      }

      const nova = await app.prisma.urnaPostavka.create({
        data: { postavka: request.body.postavka },
      });

      return reply.code(201).send(nova);
    },
  );

  app.put(
    "/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Posodobi urno postavko (samo admin)",
        params: {
          type: "object",
          properties: {
            id: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      if (request.user.vloga !== 2) {
        return reply.code(403).send({ error: "Dostop zavrnjen" });
      }

      return app.prisma.urnaPostavka.update({
        where: { id_postavka: parseInt(request.params.id) },
        data: request.body,
      });
    },
  );

  app.delete(
    "/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Izbriši urno postavko (samo admin)",
        params: {
          type: "object",
          properties: {
            id: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      if (request.user.vloga !== 2) {
        return reply.code(403).send({ error: "Dostop zavrnjen" });
      }

      await app.prisma.urnaPostavka.delete({
        where: { id_postavka: parseInt(request.params.id) },
      });

      return reply.code(204).send();
    },
  );
}
