export default async function racuni(app) {
  app.get(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Vrni vse račune prijavljenega voznika",
      },
    },
    async (request) => {
      return app.prisma.racun.findMany({
        where: { fk_uporabnik: request.user.id },
        orderBy: { datum_izdaje: "desc" },
      });
    },
  );

  app.get(
    "/vse",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Vrni vse račune (samo admin)",
        querystring: {
          type: "object",
          properties: {
            fk_uporabnik: { type: "integer" },
            od: { type: "string", format: "date" },
            do: { type: "string", format: "date" },
          },
        },
      },
    },
    async (request, reply) => {
      if (request.user.vloga !== 2 && request.user.vloga !== 3) {
        return reply.code(403).send({ error: "Dostop zavrnjen" });
      }

      const { fk_uporabnik, od, do: do_ } = request.query;
      const where = {};
      if (fk_uporabnik) where.fk_uporabnik = fk_uporabnik;
      if (od || do_) {
        where.datum_izdaje = {};
        if (od) where.datum_izdaje.gte = new Date(od);
        if (do_) where.datum_izdaje.lte = new Date(do_);
      }

      return app.prisma.racun.findMany({
        where,
        include: {
          uporabnik: { select: { ime: true, priimek: true, email: true } },
        },
        orderBy: { datum_izdaje: "desc" },
      });
    },
  );

  app.get(
    "/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Vrni posamezen račun",
        params: {
          type: "object",
          properties: {
            id: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      const racun = await app.prisma.racun.findUnique({
        where: { idRacun: parseInt(request.params.id) },
        include: {
          uporabnik: { select: { ime: true, priimek: true, email: true } },
        },
      });

      if (!racun) {
        return reply.code(404).send({ error: "Račun ne obstaja" });
      }

      if (request.user.vloga === 1 && racun.fk_uporabnik !== request.user.id) {
        return reply.code(403).send({ error: "Dostop zavrnjen" });
      }

      return racun;
    },
  );

  app.post(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Ustvari nov račun",
        body: {
          type: "object",
          required: ["datum_izdaje", "st_ur", "placa", "fk_uporabnik"],
          properties: {
            datum_izdaje: { type: "string", format: "date" },
            st_ur: { type: "number" },
            placa: { type: "number" },
            fk_uporabnik: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      if (request.user.vloga !== 2) {
        return reply
          .code(403)
          .send({ error: "Samo administrator lahko ustvari račun" });
      }

      const racun = await app.prisma.racun.create({
        data: {
          datum_izdaje: new Date(request.body.datum_izdaje),
          st_ur: request.body.st_ur,
          placa: request.body.placa,
          fk_uporabnik: request.body.fk_uporabnik,
        },
      });

      return reply.code(201).send(racun);
    },
  );

  app.put(
    "/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Posodobi račun (samo admin)",
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

      return app.prisma.racun.update({
        where: { idRacun: parseInt(request.params.id) },
        data: request.body,
      });
    },
  );

  app.delete(
    "/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Izbriši račun (samo admin)",
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

      await app.prisma.racun.delete({
        where: { idRacun: parseInt(request.params.id) },
      });

      return reply.code(204).send();
    },
  );
}
