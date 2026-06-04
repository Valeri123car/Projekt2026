import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildApp, adminToken, voznikToken } from './helpers/buildApp.js';
import vozilaRoute from '../src/routes/vozila.js';

const mockVozilo = {
  id_vozilo: 1,
  registerska: 'LJ 12-34E',
  st_sedezev: 50,
  dolzina: 12,
  fk_tip_vozila: 1,
  tip_vozila: { id_tip_vozila: 1, naziv: 'Avtobus' },
};

describe('GET /vozila', () => {
  let app;

  beforeEach(async () => {
    app = buildApp({ vozilo: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() } });
    app.register(vozilaRoute, { prefix: '/vozila' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('vrne 401 brez žetona', async () => {
    const res = await app.inject({ method: 'GET', url: '/vozila' });
    expect(res.statusCode).toBe(401);
  });

  it('vrne seznam vozil', async () => {
    app.prisma.vozilo.findMany.mockResolvedValue([mockVozilo]);
    const token = adminToken(app);

    const res = await app.inject({
      method: 'GET',
      url: '/vozila',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].registerska).toBe('LJ 12-34E');
  });

  it('voznik lahko prav tako vidi vozila', async () => {
    app.prisma.vozilo.findMany.mockResolvedValue([mockVozilo]);
    const token = voznikToken(app);

    const res = await app.inject({
      method: 'GET',
      url: '/vozila',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
  });
});

describe('POST /vozila', () => {
  let app;

  beforeEach(async () => {
    app = buildApp({ vozilo: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() } });
    app.register(vozilaRoute, { prefix: '/vozila' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('ustvari novo vozilo', async () => {
    app.prisma.vozilo.create.mockResolvedValue(mockVozilo);
    const token = adminToken(app);

    const res = await app.inject({
      method: 'POST',
      url: '/vozila',
      headers: { authorization: `Bearer ${token}` },
      payload: { registerska: 'LJ 12-34E', st_sedezev: 50, fk_tip_vozila: 1 },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().registerska).toBe('LJ 12-34E');
  });

  it('vrne 400 za manjkajoča obvezna polja', async () => {
    const token = adminToken(app);

    const res = await app.inject({
      method: 'POST',
      url: '/vozila',
      headers: { authorization: `Bearer ${token}` },
      payload: { registerska: 'LJ 12-34E' },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('PUT /vozila/:id', () => {
  let app;

  beforeEach(async () => {
    app = buildApp({ vozilo: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() } });
    app.register(vozilaRoute, { prefix: '/vozila' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('posodobi vozilo', async () => {
    const updated = { ...mockVozilo, st_sedezev: 60 };
    app.prisma.vozilo.update.mockResolvedValue(updated);
    const token = adminToken(app);

    const res = await app.inject({
      method: 'PUT',
      url: '/vozila/1',
      headers: { authorization: `Bearer ${token}` },
      payload: { st_sedezev: 60 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().st_sedezev).toBe(60);
  });
});

describe('DELETE /vozila/:id', () => {
  let app;

  beforeEach(async () => {
    app = buildApp({ vozilo: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() } });
    app.register(vozilaRoute, { prefix: '/vozila' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('izbriše vozilo in vrne 204', async () => {
    app.prisma.vozilo.delete.mockResolvedValue(mockVozilo);
    const token = adminToken(app);

    const res = await app.inject({
      method: 'DELETE',
      url: '/vozila/1',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(204);
  });
});
