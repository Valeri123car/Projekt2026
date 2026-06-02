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
      schema: { description: "Vrni vse voznike (samo admin)" },
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
    "/voznje/:driverId",
    {
      onRequest: [app.authenticate, adminOnly],
      schema: {
        description: "Vrni vse vožnje specifičnega voznika (samo admin)",
        params: {
          type: "object",
          properties: { driverId: { type: "integer" } },
          required: ["driverId"],
        },
        querystring: {
          type: "object",
          properties: {
            od: { type: "string", format: "date" },
            do: { type: "string", format: "date" },
          },
        },
      },
    },
    async (request) => {
      const { driverId } = request.params;
      const { od, do: do_ } = request.query;

      const where = { fk_uporabnik: parseInt(driverId) };
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
      schema: { description: "Vrni celoten urnik vseh voznikov (samo admin)" },
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

  app.get(
    "/tahograf",
    {
      onRequest: [app.authenticate, adminOnly],
      schema: {
        description: "Vrni vse tahografske zapise vseh voznikov (samo admin)",
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
      if (fk_uporabnik) where.fk_uporabnik = parseInt(fk_uporabnik);
      if (od || do_) {
        where.zacetek = {};
        if (od) where.zacetek.gte = new Date(od);
        if (do_) where.zacetek.lte = new Date(do_);
      }

      return app.prisma.tahografZapis.findMany({
        where,
        include: { uporabnik: { select: { ime: true, priimek: true } } },
        orderBy: { zacetek: "desc" },
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
            emso: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { ime, priimek, email, geslo, dostop, emso } = request.body;
      const bcrypt = await import("bcryptjs");

      const obstaja = await app.prisma.uporabnik.findUnique({
        where: { email },
      });
      if (obstaja) {
        return reply.code(409).send({ error: "Email že obstaja" });
      }

      const hash = await bcrypt.default.hash(geslo, 12);

      const nov = await app.prisma.uporabnik.create({
        data: {
          ime,
          priimek,
          email,
          geslo: hash,
          dostop,
          emso_crypted: emso ? app.encrypt(emso) : null,
        },
      });

      return reply.code(201).send({
        id: nov.id_uporabnik,
        email: nov.email,
        dostop: nov.dostop,
      });
    },
  );

  app.get(
    "/audit",
    {
      onRequest: [app.authenticate, adminOnly],
      schema: {
        description: "Vrni audit log (samo admin)",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", default: 1 },
            limit: { type: "integer", default: 20 },
            filter: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { page = 1, limit = 20, filter } = request.query;

      const where = {};
      if (filter === "last24h") {
        where.timestamp = {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        };
      }

      const pred24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [logs, total, totalVsi, steviloDanes, uniqueUsers] =
        await Promise.all([
          app.prisma.lOG_voznja.findMany({
            where,
            include: {
              uporabnik: { select: { ime: true, priimek: true } },
            },
            orderBy: { timestamp: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          app.prisma.lOG_voznja.count({ where }),
          app.prisma.lOG_voznja.count(),
          app.prisma.lOG_voznja.count({
            where: { timestamp: { gte: pred24h } },
          }),
          app.prisma.lOG_voznja.groupBy({
            by: ["voznja_fk_uporabnik"],
          }),
        ]);

      return {
        logs: logs.map((l) => ({
          id: l.idLOG,
          timestamp: l.timestamp,
          user: l.uporabnik
            ? `${l.uporabnik.ime} ${l.uporabnik.priimek}`
            : "Neznano",
          metoda: l.metoda || l.TYPE?.split(" ")[0] || "-",
          url: l.url || l.TYPE?.split(" ").slice(1).join(" ") || "-",
          type: l.TYPE,
        })),
        total,
        totalVsi,
        steviloDanes,
        steviloUporabnikov: uniqueUsers.length,
        page,
        totalPages: Math.ceil(total / limit),
      };
    },
  );
}
