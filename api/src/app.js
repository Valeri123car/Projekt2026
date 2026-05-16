import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import rateLimit from "@fastify/rate-limit";
import basicAuth from "@fastify/basic-auth";

const app = Fastify({ logger: true });

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  keyGenerator: (request) => request.ip,
});

await app.register(cors, {
  origin: [
    "https://projekt2026.fly.dev",
    "https://sirena-web.fly.dev",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:19006",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

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

await app.register(basicAuth, {
  validate: async (username, password) => {
    if (
      username !== process.env.DOCS_USER ||
      password !== process.env.DOCS_PASS
    ) {
      return new Error("Napačno geslo");
    }
  },
  authenticate: true,
});

await app.register(swaggerUi, {
  routePrefix: "/docs",
  uiHooks: {
    onRequest: app.basicAuth,
  },
});

app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

await app.register(import("./plugins/prisma.js"));
await app.register(import("./plugins/crypto.js"));
await app.register(import("./plugins/audit.js"));
await app.register(import("./routes/auth.js"), { prefix: "/api/v1/auth" });
await app.register(import("./routes/voznje.js"), { prefix: "/api/v1/voznje" });
await app.register(import("./routes/urnik.js"), { prefix: "/api/v1/urnik" });
await app.register(import("./routes/stranke.js"), {
  prefix: "/api/v1/stranke",
});
await app.register(import("./routes/vozila.js"), { prefix: "/api/v1/vozila" });
await app.register(import("./routes/admin.js"), { prefix: "/api/v1/admin" });
await app.register(import("./routes/racuni.js"), { prefix: "/api/v1/racuni" });
await app.register(import("./routes/tipi_vozil.js"), {
  prefix: "/api/v1/tipi-vozil",
});
await app.register(import("./routes/log_voznja.js"), { prefix: "/api/v1/log" });
await app.register(import("./routes/urna_postavka.js"), {
  prefix: "/api/v1/urna-postavka",
});
await app.register(import("./routes/dashboard.js"), {
  prefix: "/api/v1/dashboard",
});

app.get("/health", async () => ({ status: "ok" }));

await app.listen({ port: process.env.PORT || 3000, host: "0.0.0.0" });
