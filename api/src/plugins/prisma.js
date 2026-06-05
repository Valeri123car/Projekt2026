import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

async function prismaPlugin(app) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
}

export default fp(prismaPlugin);
