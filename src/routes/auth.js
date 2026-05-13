import bcrypt from "bcryptjs";

export default async function auth(app) {
  app.post(
    "/login",
    {
      config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["email", "geslo"],
          properties: {
            email: { type: "string", format: "email" },
            geslo: { type: "string", minLength: 6 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, geslo } = request.body;

      const uporabnik = await app.prisma.uporabnik.findUnique({
        where: { email },
      });

      if (!uporabnik) {
        return reply.code(401).send({ error: "Napačen email ali geslo" });
      }

      const ujema = await bcrypt.compare(geslo, uporabnik.geslo);
      if (!ujema) {
        return reply.code(401).send({ error: "Napačen email ali geslo" });
      }

      const token = app.jwt.sign(
        {
          id: uporabnik.id_uporabnik,
          email: uporabnik.email,
          vloga: uporabnik.dostop,
        },
        { expiresIn: "8h" },
      );

      return { token, vloga: uporabnik.dostop };
    },
  );

  app.post(
    "/register",
    {
      schema: {
        body: {
          type: "object",
          required: ["ime", "priimek", "email", "geslo", "gdpr_soglasje"],
          properties: {
            ime: { type: "string" },
            priimek: { type: "string" },
            email: { type: "string", format: "email" },
            geslo: { type: "string", minLength: 6 },
            dostop: { type: "integer", default: 1 },
            gdpr_soglasje: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const { ime, priimek, email, geslo, dostop, gdpr_soglasje } =
        request.body;

      if (!gdpr_soglasje) {
        return reply
          .code(400)
          .send({ error: "Strinjanje s politiko zasebnosti je obvezno" });
      }

      const obstaja = await app.prisma.uporabnik.findUnique({
        where: { email },
      });
      if (obstaja) {
        return reply.code(409).send({ error: "Email že obstaja" });
      }

      const hash = await bcrypt.hash(geslo, 12);

      const nov = await app.prisma.uporabnik.create({
        data: {
          ime,
          priimek,
          email,
          geslo: hash,
          dostop: dostop || 1,
          gdpr_soglasje: true,
          gdpr_datum: new Date(),
        },
      });

      return reply.code(201).send({ id: nov.id_uporabnik, email: nov.email });
    },
  );

  app.delete(
    "/me",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "GDPR – pravica do izbrisa (anonimizacija podatkov)",
      },
    },
    async (request, reply) => {
      const id = request.user.id;

      await app.prisma.uporabnik.update({
        where: { id_uporabnik: id },
        data: {
          ime: "IZBRISANO",
          priimek: "IZBRISANO",
          email: `deleted_${id}_${Date.now()}@izbrisano.si`,
          emso_crypted: null,
          geslo: "IZBRISANO",
          gdpr_soglasje: false,
          gdpr_datum: null,
        },
      });

      return reply
        .code(200)
        .send({ message: "Vaši osebni podatki so bili anonimizirani" });
    },
  );
}
