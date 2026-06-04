import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildApp, adminToken, vodstvoToken, voznikToken } from './helpers/buildApp.js';
import adminRoute from '../src/routes/admin.js';

const mockUrnik = [
  {
    id_urnik: 1,
    datum: new Date('2026-04-10'),
    naziv: 'Ljubljana → Maribor',
    cena: 250,
    placano: false,
    fk_vozilo: 1,
    fk_uporabnik: 3,
    fk_stranka: 1,
    uporabnik: { ime: 'Jan', priimek: 'Jakob' },
    stranka: { id_stranka: 1, naziv: 'Podjetje d.o.o.' },
    vozilo: { registerska: 'LJ 12-34E', tip_vozila: { naziv: 'Avtobus' } },
  },
];

function buildAdminApp() {
  const app = buildApp({
    uporabnik: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    urnik: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    stranka: { findMany: vi.fn(), create: vi.fn() },
    vozilo: { findMany: vi.fn() },
    voznja: { findMany: vi.fn() },
    tahografZapis: { findMany: vi.fn() },
    lOG_voznja: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
  });
  app.register(adminRoute, { prefix: '/admin' });
  return app;
}

describe('GET /admin/urnik – managementOk middleware', () => {
  let app;

  beforeEach(async () => {
    app = buildAdminApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('admin (vloga 2) ima dostop', async () => {
    app.prisma.urnik.findMany.mockResolvedValue(mockUrnik);
    const res = await app.inject({
      method: 'GET',
      url: '/admin/urnik',
      headers: { authorization: `Bearer ${adminToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('vodstvo (vloga 3) ima dostop', async () => {
    app.prisma.urnik.findMany.mockResolvedValue(mockUrnik);
    const res = await app.inject({
      method: 'GET',
      url: '/admin/urnik',
      headers: { authorization: `Bearer ${vodstvoToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('voznik (vloga 1) nima dostopa', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/urnik',
      headers: { authorization: `Bearer ${voznikToken(app)}` },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /admin/uporabniki – adminOnly middleware', () => {
  let app;

  beforeEach(async () => {
    app = buildAdminApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('admin (vloga 2) ima dostop', async () => {
    app.prisma.uporabnik.findMany.mockResolvedValue([]);
    const res = await app.inject({
      method: 'GET',
      url: '/admin/uporabniki',
      headers: { authorization: `Bearer ${adminToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('vodstvo (vloga 3) nima dostopa', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/uporabniki',
      headers: { authorization: `Bearer ${vodstvoToken(app)}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('voznik (vloga 1) nima dostopa', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/uporabniki',
      headers: { authorization: `Bearer ${voznikToken(app)}` },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('PATCH /admin/urnik/:id/placano', () => {
  let app;

  beforeEach(async () => {
    app = buildAdminApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('preklopi placano status', async () => {
    app.prisma.urnik.findUnique.mockResolvedValue(mockUrnik[0]);
    app.prisma.urnik.update.mockResolvedValue({ id_urnik: 1, placano: true });

    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/urnik/1/placano',
      headers: { authorization: `Bearer ${adminToken(app)}` },
      payload: { placano: true },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().placano).toBe(true);
  });

  it('vrne 404 za neobstoječ prevoz', async () => {
    app.prisma.urnik.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/urnik/999/placano',
      headers: { authorization: `Bearer ${adminToken(app)}` },
      payload: { placano: true },
    });

    expect(res.statusCode).toBe(404);
  });
});
