import Fastify from 'fastify';
import jwt from '@fastify/jwt';

export function buildApp(mockPrisma = {}) {
  const app = Fastify({ logger: false });

  app.register(jwt, { secret: 'test_secret_key_123' });

  app.decorate('prisma', mockPrisma);
  app.decorate('encrypt', (v) => `encrypted_${v}`);
  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  return app;
}

export function makeToken(app, payload) {
  return app.jwt.sign(payload);
}

export const adminToken   = (app) => makeToken(app, { id: 1, email: 'admin@test.si',   vloga: 2 });
export const vodstvoToken = (app) => makeToken(app, { id: 2, email: 'vodstvo@test.si', vloga: 3 });
export const voznikToken  = (app) => makeToken(app, { id: 3, email: 'voznik@test.si',  vloga: 1 });
