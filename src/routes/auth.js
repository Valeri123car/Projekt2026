import bcrypt from "bcryptjs";

export default async function auth(app) {
  app.post(
    "/login",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
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
          required: ["ime", "priimek", "email", "geslo"],
          properties: {
            ime: { type: "string" },
            priimek: { type: "string" },
            email: { type: "string", format: "email" },
            geslo: { type: "string", minLength: 6 },
            dostop: { type: "integer", default: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { ime, priimek, email, geslo, dostop } = request.body;

      const obstaja = await app.prisma.uporabnik.findUnique({
        where: { email },
      });
      if (obstaja) {
        return reply.code(409).send({ error: "Email že obstaja" });
      }

      const hash = await bcrypt.hash(geslo, 12);

      const nov = await app.prisma.uporabnik.create({
        data: { ime, priimek, email, geslo: hash, dostop: dostop || 1 },
      });

      return reply.code(201).send({ id: nov.id_uporabnik, email: nov.email });
    },
  );
}
