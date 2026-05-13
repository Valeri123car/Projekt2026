export default async function admin(app) {
  const adminOnly = async (request, reply) => {
    if (request.user.vloga !== 2) {
      return reply
        .code(403)
        .send({ error: "Dostop zavrnjen – samo administratorji" });
    }
  };

  app.get(
    "/vozniki",
    {
      onRequest: [app.authenticate, adminOnly],
      schema: {
        description: "Vrni vse voznike (samo admin)",
      },
    },
    async () => {
      return app.prisma.uporabnik.findMany({
        where: { dostop: 1 },
        select: {
          id_uporabnik: true,
          ime: true,
          priimek: true,
          email: true,
          dostop: true,
        },
        orderBy: { priimek: "asc" },
      });
    },
  );

  app.get(
    "/voznje",
    {
      onRequest: [app.authenticate, adminOnly],
      schema: {
        description: "Vrni vse vožnje vseh voznikov (samo admin)",
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
    async (request) => {
      const { fk_uporabnik, od, do: do_ } = request.query;

      const where = {};
      if (fk_uporabnik) where.fk_uporabnik = fk_uporabnik;
      if (od || do_) {
        where.datum = {};
        if (od) where.datum.gte = new Date(od);
        if (do_) where.datum.lte = new Date(do_);
      }

      return app.prisma.voznja.findMany({
        where,
        include: { uporabnik: { select: { ime: true, priimek: true } } },
        orderBy: { datum: "desc" },
      });
    },
  );

  app.get(
    "/urnik",
    {
      onRequest: [app.authenticate, adminOnly],
      schema: {
        description: "Vrni celoten urnik vseh voznikov (samo admin)",
      },
    },
    async () => {
      return app.prisma.urnik.findMany({
        include: {
          uporabnik: { select: { ime: true, priimek: true } },
          stranka: true,
          vozilo: true,
        },
        orderBy: { datum: "asc" },
      });
    },
  );

  app.post(
    "/uporabniki",
    {
      onRequest: [app.authenticate, adminOnly],
      schema: {
        description: "Ustvari novega uporabnika z določeno vlogo (samo admin)",
        body: {
          type: "object",
          required: ["ime", "priimek", "email", "geslo", "dostop"],
          properties: {
            ime: { type: "string" },
            priimek: { type: "string" },
            email: { type: "string", format: "email" },
            geslo: { type: "string", minLength: 6 },
            dostop: { type: "integer", enum: [1, 2, 3] },
          },
        },
      },
    },
    async (request, reply) => {
      const { ime, priimek, email, geslo, dostop } = request.body;
      const bcrypt = await import("bcryptjs");

      const obstaja = await app.prisma.uporabnik.findUnique({
        where: { email },
      });
      if (obstaja) {
        return reply.code(409).send({ error: "Email že obstaja" });
      }

      const hash = await bcrypt.default.hash(geslo, 12);

      const nov = await app.prisma.uporabnik.create({
        data: { ime, priimek, email, geslo: hash, dostop },
      });

      return reply.code(201).send({
        id: nov.id_uporabnik,
        email: nov.email,
        dostop: nov.dostop,
      });
    },
  );
}
