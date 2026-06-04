import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildApp, adminToken, voznikToken } from './helpers/buildApp.js';
import voznje from '../src/routes/voznje.js';

const mockVoznje = [
  {
    id_voznja: 1,
    datum: '2026-04-10',
    zacetek: '2026-04-10T06:00:00.000Z',
    konc: '2026-04-10T14:00:00.000Z',
    trajanje: 480,
    stranka: 'Podjetje d.o.o.',
    relacija: 'Ljubljana → Maribor',
    opis: null,
    fk_uporabnik: 3,
  },
];

describe('GET /voznje – lastne vožnje voznika', () => {
  let app;

  beforeEach(async () => {
    app = buildApp({
      voznja: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
      tahografZapis: { findMany: vi.fn() },
      uporabnik: { findUnique: vi.fn() },
    });
    app.register(voznje, { prefix: '/voznje' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('vrne 401 brez žetona', async () => {
    const res = await app.inject({ method: 'GET', url: '/voznje' });
    expect(res.statusCode).toBe(401);
  });

  it('voznik vidi samo lastne vožnje', async () => {
    app.prisma.voznja.findMany.mockResolvedValue(mockVoznje);
    const token = voznikToken(app);

    const res = await app.inject({
      method: 'GET',
      url: '/voznje',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const calls = app.prisma.voznja.findMany.mock.calls[0][0];
    expect(calls.where.fk_uporabnik).toBe(3);
  });

  it('admin prav tako pridobi lastne vožnje na /voznje', async () => {
    app.prisma.voznja.findMany.mockResolvedValue([]);
    const token = adminToken(app);

    const res = await app.inject({
      method: 'GET',
      url: '/voznje',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const calls = app.prisma.voznja.findMany.mock.calls[0][0];
    expect(calls.where.fk_uporabnik).toBe(1);
  });
});

describe('GET /voznje/voznjeMesec', () => {
  let app;

  beforeEach(async () => {
    app = buildApp({
      voznja: { findMany: vi.fn() },
      tahografZapis: { findMany: vi.fn() },
      uporabnik: { findUnique: vi.fn() },
    });
    app.register(voznje, { prefix: '/voznje' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('vrne 403 za voznika (vloga 1)', async () => {
    const token = voznikToken(app);
    const res = await app.inject({
      method: 'GET',
      url: '/voznje/voznjeMesec?fk_uporabnik=3&od=2026-04-01&do=2026-04-30',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('vrne 400 za manjkajoč fk_uporabnik', async () => {
    const token = adminToken(app);
    const res = await app.inject({
      method: 'GET',
      url: '/voznje/voznjeMesec?od=2026-04-01&do=2026-04-30',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('vrne poročilo z uporabnikom in vožnjami', async () => {
    const token = adminToken(app);

    app.prisma.tahografZapis.findMany
      .mockResolvedValueOnce([
        {
          konec: '2026-04-01T08:00:00.000Z',
          posadka: false,
          stanje: 'VOZNJA',
          trajanje_min: 120,
          zacetek: '2026-04-01T06:00:00.000Z',
          vir: 'UVOZ',
          uporabnik: { ime: 'Jan', priimek: 'Jakob' },
        },
      ])
      .mockResolvedValueOnce([
        { trajanje_min: 240 },
        { trajanje_min: 180 },
      ]);

    const res = await app.inject({
      method: 'GET',
      url: '/voznje/voznjeMesec?fk_uporabnik=8&od=2026-04-01&do=2026-04-30',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].uporabnik).toEqual({ ime: 'Jan', priimek: 'Jakob' });
    expect(body[0].voznjeMesec).toHaveLength(1);
    expect(body[0].voznjeMesec[0]).not.toHaveProperty('uporabnik');
    expect(body[0].voznje4mesece).toBe(420);
  });
});
