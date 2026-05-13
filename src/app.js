import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

await app.register(jwt, {
  secret: process.env.JWT_SECRET || "dev_secret_zamenjaj",
});

await app.register(swagger, {
  openapi: {
    info: {
      title: "Sirena API",
      description: "REST API za evidenco voženj – Sirena d.o.o.",
      version: "1.0.0",
    },
  },
});

await app.register(swaggerUi, {
  routePrefix: "/docs",
});

app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

await app.register(import("./plugins/prisma.js"));
await app.register(import("./routes/auth.js"), { prefix: "/api/v1/auth" });
await app.register(import("./routes/voznje.js"), { prefix: "/api/v1/voznje" });
await app.register(import("./routes/urnik.js"), { prefix: "/api/v1/urnik" });
await app.register(import("./routes/stranke.js"), {
  prefix: "/api/v1/stranke",
});
await app.register(import("./routes/vozila.js"), { prefix: "/api/v1/vozila" });
await app.register(import("./routes/admin.js"), { prefix: "/api/v1/admin" });
await app.register(import("./routes/racuni.js"), { prefix: "/api/v1/racuni" });

app.get("/health", async () => ({ status: "ok" }));

await app.listen({ port: process.env.PORT || 3000, host: "0.0.0.0" });
