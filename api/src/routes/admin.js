export default async function admin(app) {
  const adminOnly = async (request, reply) => {
    if (request.user.vloga !== 2) {
      return reply
        .code(403)
        .send({ error: "Dostop zavrnjen – samo administratorji" });
    }
  };

  const managementOk = async (request, reply) => {
    if (request.user.vloga !== 2 && request.user.vloga !== 3) {
      return reply.code(403).send({ error: "Dostop zavrnjen" });
    }
  };

  app.get(
    "/vozniki",
    {
      onRequest: [app.authenticate, managementOk],
      schema: { description: "Vrni vse voznike" },
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
      onRequest: [app.authenticate, managementOk],
      schema: {
        description: "Vrni vse vožnje vseh voznikov",
        querystring: {
          type: "object",
          properties: {
            fk_uporabnik: { type: "integer" },
            od: { type: "string", format: "date" },
            do: { type: "string", format: "date" },
            pretekle: { type: "boolean" },
            prihodnje: { type: "boolean" },
          },
        },
      },
    },
    async (request) => {
      const { fk_uporabnik, od, do: do_, pretekle, prihodnje } = request.query;

      const where = {};
      if (fk_uporabnik) where.fk_uporabnik = fk_uporabnik;
      if (od || do_) {
        where.datum = {};
        if (od) where.datum.gte = new Date(od);
        if (do_) where.datum.lte = new Date(do_);
      }
      if (pretekle) {
        where.datum = { ...where.datum, lt: new Date() };
      }
      if (prihodnje) {
        where.datum = { ...where.datum, gte: new Date() };
      }

      return app.prisma.voznja.findMany({
        where,
        include: {
          uporabnik: { select: { ime: true, priimek: true } },
          vozilo: { include: { tip_vozila: true } },
          stranka: true,
        },
        orderBy: { datum: "desc" },
      });
    },
  );

  app.get(
    "/voznje/:driverId",
    {
      onRequest: [app.authenticate, adminOnly],
      schema: {
        description: "Vrni vse vožnje specifičnega voznika",
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
        include: {
          uporabnik: { select: { ime: true, priimek: true } },
          vozilo: { include: { tip_vozila: true } },
          stranka: true,
        },
        orderBy: { datum: "desc" },
      });
    },
  );
  app.post(
    "/voznje/nova",
    {
      onRequest: [app.authenticate, managementOk],
      schema: {
        description: "Admin ustvari novo vožnjo",
        body: {
          type: "object",
          required: ["datum", "zacetek", "konc", "fk_uporabnik"],
          properties: {
            datum: { type: "string", format: "date" },
            zacetek: { type: "string" },
            konc: { type: "string" },
            stranka_ime: { type: "string" },
            relacija: { type: "string" },
            opis: { type: "string" },
            cena: { type: "number" },
            placano: { type: "boolean" },
            fk_vozilo: { type: "integer" },
            fk_stranka: { type: "integer" },
            fk_uporabnik: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      const {
        datum,
        zacetek,
        konc,
        stranka_ime,
        relacija,
        opis,
        cena,
        placano,
        fk_vozilo,
        fk_stranka,
        fk_uporabnik,
      } = request.body;

      const voznja = await app.prisma.voznja.create({
        data: {
          datum: new Date(datum),
          zacetek: new Date(zacetek),
          konc: new Date(konc),
          fk_uporabnik,
          stranka_ime: stranka_ime || null,
          relacija: relacija || null,
          opis: opis || null,
          cena: cena ?? null,
          placano: placano ?? false,
          fk_vozilo: fk_vozilo || null,
          fk_stranka: fk_stranka || null,
          timestamp_zapis: new Date(),
        },
        include: {
          uporabnik: { select: { ime: true, priimek: true } },
          vozilo: { include: { tip_vozila: true } },
          stranka: true,
        },
      });

      return reply.code(201).send(voznja);
    },
  );
  app.put(
    "/voznje/:id",
    {
      onRequest: [app.authenticate, managementOk],
      schema: {
        description: "Posodobi vožnjo (admin)",
        params: {
          type: "object",
          properties: { id: { type: "integer" } },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            datum: { type: "string" },
            zacetek: { type: "string" },
            konc: { type: "string" },
            stranka_ime: { type: "string" },
            relacija: { type: "string" },
            opis: { type: "string" },
            cena: { type: "number" },
            placano: { type: "boolean" },
            fk_vozilo: { type: "integer" },
            fk_stranka: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const obstaja = await app.prisma.voznja.findUnique({
        where: { id_voznja: parseInt(id) },
      });
      if (!obstaja) return reply.code(404).send({ error: "Vožnja ne obstaja" });

      const {
        datum,
        zacetek,
        konc,
        stranka_ime,
        relacija,
        opis,
        cena,
        placano,
        fk_vozilo,
        fk_stranka,
      } = request.body;
      const data = {};
      if (datum !== undefined) data.datum = new Date(datum);
      if (zacetek !== undefined) data.zacetek = new Date(zacetek);
      if (konc !== undefined) data.konc = new Date(konc);
      if (stranka_ime !== undefined) data.stranka_ime = stranka_ime || null;
      if (relacija !== undefined) data.relacija = relacija || null;
      if (opis !== undefined) data.opis = opis || null;
      if (cena !== undefined) data.cena = cena;
      if (placano !== undefined) data.placano = placano;
      if (fk_vozilo !== undefined) data.fk_vozilo = fk_vozilo;
      if (fk_stranka !== undefined) data.fk_stranka = fk_stranka;

      return app.prisma.voznja.update({
        where: { id_voznja: parseInt(id) },
        data,
        include: {
          uporabnik: { select: { ime: true, priimek: true } },
          vozilo: { include: { tip_vozila: true } },
          stranka: true,
        },
      });
    },
  );

  app.patch(
    "/voznje/:id/placano",
    {
      onRequest: [app.authenticate, managementOk],
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "integer" } },
          required: ["id"],
        },
        body: {
          type: "object",
          required: ["placano"],
          properties: { placano: { type: "boolean" } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { placano } = request.body;
      const obstaja = await app.prisma.voznja.findUnique({
        where: { id_voznja: parseInt(id) },
      });
      if (!obstaja) return reply.code(404).send({ error: "Vožnja ne obstaja" });
      return app.prisma.voznja.update({
        where: { id_voznja: parseInt(id) },
        data: { placano },
        select: { id_voznja: true, placano: true },
      });
    },
  );

  app.get(
    "/tahograf",
    {
      onRequest: [app.authenticate, managementOk],
      schema: {
        description: "Vrni vse tahografske zapise vseh voznikov",
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
        description: "Ustvari novega uporabnika",
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
      if (obstaja) return reply.code(409).send({ error: "Email že obstaja" });

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

      return reply
        .code(201)
        .send({ id: nov.id_uporabnik, email: nov.email, dostop: nov.dostop });
    },
  );

  app.get(
    "/uporabniki",
    {
      onRequest: [app.authenticate, adminOnly],
      schema: { description: "Vrni vse uporabnike" },
    },
    async () => {
      return app.prisma.uporabnik.findMany({
        select: {
          id_uporabnik: true,
          ime: true,
          priimek: true,
          email: true,
          dostop: true,
          gdpr_soglasje: true,
          gdpr_datum: true,
        },
        orderBy: { priimek: "asc" },
      });
    },
  );

  app.put(
    "/uporabniki/:id",
    {
      onRequest: [app.authenticate, adminOnly],
      schema: {
        description: "Posodobi podatke uporabnika",
        params: {
          type: "object",
          properties: { id: { type: "integer" } },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            ime: { type: "string" },
            priimek: { type: "string" },
            email: { type: "string", format: "email" },
            geslo: { type: "string", minLength: 6 },
            dostop: { type: "integer", enum: [1, 2, 3] },
            emso: { type: "string" },
            gdpr_soglasje: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { ime, priimek, email, geslo, dostop, emso, gdpr_soglasje } =
        request.body;

      const obstaja = await app.prisma.uporabnik.findUnique({
        where: { id_uporabnik: parseInt(id) },
      });
      if (!obstaja)
        return reply.code(404).send({ error: "Uporabnik ne obstaja" });

      if (email && email !== obstaja.email) {
        const emailObstaja = await app.prisma.uporabnik.findUnique({
          where: { email },
        });
        if (emailObstaja)
          return reply.code(409).send({ error: "Email že obstaja" });
      }

      const data = {};
      if (ime !== undefined) data.ime = ime;
      if (priimek !== undefined) data.priimek = priimek;
      if (email !== undefined) data.email = email;
      if (dostop !== undefined) data.dostop = dostop;
      if (gdpr_soglasje !== undefined) {
        data.gdpr_soglasje = gdpr_soglasje;
        if (gdpr_soglasje && !obstaja.gdpr_datum) data.gdpr_datum = new Date();
      }
      if (emso) data.emso_crypted = app.encrypt(emso);
      if (geslo) {
        const bcrypt = await import("bcryptjs");
        data.geslo = await bcrypt.default.hash(geslo, 12);
      }

      return app.prisma.uporabnik.update({
        where: { id_uporabnik: parseInt(id) },
        data,
        select: {
          id_uporabnik: true,
          ime: true,
          priimek: true,
          email: true,
          dostop: true,
          gdpr_soglasje: true,
          gdpr_datum: true,
        },
      });
    },
  );

  app.delete(
    "/uporabniki/:id",
    {
      onRequest: [app.authenticate, adminOnly],
      schema: {
        description: "Izbriši uporabnika",
        params: {
          type: "object",
          properties: { id: { type: "integer" } },
          required: ["id"],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      if (request.user.id_uporabnik === parseInt(id)) {
        return reply
          .code(400)
          .send({ error: "Ne morete izbrisati lastnega računa" });
      }

      const obstaja = await app.prisma.uporabnik.findUnique({
        where: { id_uporabnik: parseInt(id) },
      });
      if (!obstaja)
        return reply.code(404).send({ error: "Uporabnik ne obstaja" });

      await app.prisma.uporabnik.delete({
        where: { id_uporabnik: parseInt(id) },
      });
      return reply.code(204).send();
    },
  );

  app.get(
    "/audit",
    {
      onRequest: [app.authenticate, adminOnly],
      schema: {
        description: "Vrni audit log",
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
        where.timestamp = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
      }

      const pred24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [logs, total, totalVsi, steviloDanes, uniqueUsers] =
        await Promise.all([
          app.prisma.lOG_voznja.findMany({
            where,
            include: { uporabnik: { select: { ime: true, priimek: true } } },
            orderBy: { timestamp: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          app.prisma.lOG_voznja.count({ where }),
          app.prisma.lOG_voznja.count(),
          app.prisma.lOG_voznja.count({
            where: { timestamp: { gte: pred24h } },
          }),
          app.prisma.lOG_voznja.groupBy({ by: ["voznja_fk_uporabnik"] }),
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

  app.get(
    "/stranke",
    { onRequest: [app.authenticate, managementOk] },
    async () => {
      return app.prisma.stranka.findMany({ orderBy: { naziv: "asc" } });
    },
  );

  app.post(
    "/stranke",
    {
      onRequest: [app.authenticate, managementOk],
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
      const { naziv, email, telefonska, davcna_st } = request.body;
      const nova = await app.prisma.stranka.create({
        data: {
          naziv,
          email: email || null,
          telefonska: telefonska || null,
          davcna_st: davcna_st || null,
        },
      });
      return reply.code(201).send(nova);
    },
  );

  app.get(
    "/vozila",
    { onRequest: [app.authenticate, managementOk] },
    async () => {
      return app.prisma.vozilo.findMany({
        include: { tip_vozila: true },
        orderBy: { registerska: "asc" },
      });
    },
  );
}
