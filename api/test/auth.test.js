import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildApp } from './helpers/buildApp.js';
import authRoute from '../src/routes/auth.js';
import bcrypt from 'bcryptjs';

const hashedGeslo = bcrypt.hashSync('geslo123', 10);

const mockUporabnik = {
  id_uporabnik: 1,
  ime: 'Ana',
  priimek: 'Novak',
  email: 'ana@test.si',
  geslo: hashedGeslo,
  dostop: 2,
};

describe('POST /auth/login', () => {
  let app;

  beforeEach(async () => {
    app = buildApp({
      uporabnik: {
        findUnique: vi.fn(),
      },
    });
    app.register(authRoute, { prefix: '/auth' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('vrne 401 za neobstoječ email', async () => {
    app.prisma.uporabnik.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'neobstaja@test.si', geslo: 'geslo123' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Napačen email ali geslo');
  });

  it('vrne 401 za napačno geslo', async () => {
    app.prisma.uporabnik.findUnique.mockResolvedValue(mockUporabnik);

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ana@test.si', geslo: 'napacno_geslo' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Napačen email ali geslo');
  });

  it('vrne žeton in vlogo ob uspešni prijavi', async () => {
    app.prisma.uporabnik.findUnique.mockResolvedValue(mockUporabnik);

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ana@test.si', geslo: 'geslo123' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeDefined();
    expect(body.vloga).toBe(2);
  });

  it('vrne 400 za manjkajoča polja', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ana@test.si' },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /auth/me', () => {
  let app;

  beforeEach(async () => {
    app = buildApp({
      uporabnik: { findUnique: vi.fn() },
    });
    app.register(authRoute, { prefix: '/auth' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('vrne 401 brez žetona', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('vrne podatke prijavljenega uporabnika', async () => {
    const token = app.jwt.sign({ id: 1, email: 'ana@test.si', vloga: 2 });
    app.prisma.uporabnik.findUnique.mockResolvedValue({
      id_uporabnik: 1,
      ime: 'Ana',
      priimek: 'Novak',
      email: 'ana@test.si',
      dostop: 2,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().email).toBe('ana@test.si');
  });
});

describe('PUT /auth/me', () => {
  let app;

  beforeEach(async () => {
    app = buildApp({
      uporabnik: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    });
    app.register(authRoute, { prefix: '/auth' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('posodobi ime in priimek', async () => {
    const token = app.jwt.sign({ id: 1, email: 'ana@test.si', vloga: 2 });
    app.prisma.uporabnik.update.mockResolvedValue({
      id_uporabnik: 1, ime: 'Maja', priimek: 'Novak', email: 'ana@test.si', dostop: 2,
    });

    const res = await app.inject({
      method: 'PUT',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
      payload: { ime: 'Maja', priimek: 'Novak' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().ime).toBe('Maja');
  });

  it('vrne 400 za prazno telo', async () => {
    const token = app.jwt.sign({ id: 1, email: 'ana@test.si', vloga: 2 });

    const res = await app.inject({
      method: 'PUT',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });
});
