export default async function tipiVozil(app) {
  app.get(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Vrni vse tipe vozil",
      },
    },
    async () => {
      return app.prisma.tipVozila.findMany({
        orderBy: { naziv: "asc" },
      });
    },
  );

  app.post(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Ustvari nov tip vozila (samo admin)",
        body: {
          type: "object",
          required: ["naziv"],
          properties: {
            naziv: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      if (request.user.vloga !== 2) {
        return reply.code(403).send({ error: "Dostop zavrnjen" });
      }

      const tip = await app.prisma.tipVozila.create({
        data: { naziv: request.body.naziv },
      });

      return reply.code(201).send(tip);
    },
  );

  app.put(
    "/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Posodobi tip vozila (samo admin)",
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

      return app.prisma.tipVozila.update({
        where: { id_tip_vozila: parseInt(request.params.id) },
        data: request.body,
      });
    },
  );

  app.delete(
    "/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Izbriši tip vozila (samo admin)",
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

      await app.prisma.tipVozila.delete({
        where: { id_tip_vozila: parseInt(request.params.id) },
      });

      return reply.code(204).send();
    },
  );
}
