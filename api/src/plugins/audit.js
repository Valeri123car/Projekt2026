import fp from "fastify-plugin";

async function auditPlugin(app) {
  app.addHook("onResponse", async (request, reply) => {
    if (!request.user) return;

    const obcutljiviEndpointi = [
      "/api/v1/voznje",
      "/api/v1/admin",
      "/api/v1/racuni",
      "/api/v1/log",
      "/api/v1/dashboard",
      "/api/v1/stranke",
      "/api/v1/vozila",
      "/api/v1/urnik",
    ];

    const jeObcutljiv = obcutljiviEndpointi.some((e) =>
      request.url.startsWith(e),
    );
    if (!jeObcutljiv) return;
    if (reply.statusCode >= 400) return;

    try {
      const urlBrezQuery = request.url.split("?")[0];
      await app.prisma.lOG_voznja.create({
        data: {
          timestamp: new Date(),
          TYPE: `${request.method} ${urlBrezQuery}`,
          metoda: request.method,
          url: urlBrezQuery,
          voznja_id_voznja: 0,
          voznja_fk_uporabnik: request.user.id,
        },
      });
    } catch (_) {}
  });
}

export default fp(auditPlugin);
