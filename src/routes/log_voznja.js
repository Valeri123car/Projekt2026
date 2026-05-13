export default async function logVoznja(app) {
  app.get(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Vrni audit log voženj (samo admin/vodstvo)",
        querystring: {
          type: "object",
          properties: {
            voznja_id: { type: "integer" },
            fk_uporabnik: { type: "integer" },
            od: { type: "string", format: "date" },
            do: { type: "string", format: "date" },
          },
        },
      },
    },
    async (request, reply) => {
      if (request.user.vloga === 1) {
        return reply.code(403).send({ error: "Dostop zavrnjen" });
      }

      const { voznja_id, fk_uporabnik, od, do: do_ } = request.query;
      const where = {};

      if (voznja_id) where.voznja_id_voznja = voznja_id;
      if (fk_uporabnik) where.voznja_fk_uporabnik = fk_uporabnik;
      if (od || do_) {
        where.timestamp = {};
        if (od) where.timestamp.gte = new Date(od);
        if (do_) where.timestamp.lte = new Date(do_);
      }

      return app.prisma.lOG_voznja.findMany({
        where,
        orderBy: { timestamp: "desc" },
      });
    },
  );

  app.post(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Ustvari log vnos",
        body: {
          type: "object",
          required: ["type", "voznja_id_voznja", "voznja_fk_uporabnik"],
          properties: {
            type: { type: "string" },
            voznja_id_voznja: { type: "integer" },
            voznja_fk_uporabnik: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      const log = await app.prisma.lOG_voznja.create({
        data: {
          timestamp: new Date(),
          TYPE: request.body.type,
          voznja_id_voznja: request.body.voznja_id_voznja,
          voznja_fk_uporabnik: request.body.voznja_fk_uporabnik,
        },
      });

      return reply.code(201).send(log);
    },
  );
}
