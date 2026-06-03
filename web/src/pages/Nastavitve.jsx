import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/client';

export default function Nastavitve() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [ime, setIme] = useState('');
  const [priimek, setPriimek] = useState('');
  const [geslo, setGeslo] = useState('');
  const [gesloPotrdi, setGesloPotrdi] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then((res) => {
        setUser(res.data);
        setIme(res.data.ime);
        setPriimek(res.data.priimek);
      })
      .catch(() => setError('Napaka pri nalaganju profila.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!ime.trim() || !priimek.trim()) {
      setError('Ime in priimek sta obvezna.');
      return;
    }
    if (geslo && geslo.length < 6) {
      setError('Geslo mora imeti vsaj 6 znakov.');
      return;
    }
    if (geslo && geslo !== gesloPotrdi) {
      setError('Gesli se ne ujemata.');
      return;
    }

    const body = { ime: ime.trim(), priimek: priimek.trim() };
    if (geslo) body.geslo = geslo;

    try {
      setSaving(true);
      const res = await api.put('/auth/me', body);
      setUser(res.data);
      setGeslo('');
      setGesloPotrdi('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Prišlo je do napake.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-72 flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Nastavitve</h1>
          <p className="text-slate-500 mt-1">Upravljanje z vašim profilom</p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
            Nalaganje…
          </div>
        ) : (
          <div className="max-w-lg">
            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
                <span className="material-symbols-outlined rounded-lg bg-blue-50 p-2 text-blue-600">manage_accounts</span>
                <div>
                  <p className="text-base font-semibold text-slate-900">Osebni podatki</p>
                  {user && <p className="text-xs text-slate-500">{user.email}</p>}
                </div>
              </div>

              {/* Body */}
              <div className="space-y-5 px-6 py-5">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Profil uspešno posodobljen.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Ime *</label>
                    <input
                      value={ime}
                      onChange={(e) => setIme(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Priimek *</label>
                    <input
                      value={priimek}
                      onChange={(e) => setPriimek(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Sprememba gesla</p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Novo geslo</label>
                      <input
                        type="password"
                        value={geslo}
                        onChange={(e) => setGeslo(e.target.value)}
                        placeholder="Pustite prazno, če ne menjate"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Potrdi geslo</label>
                      <input
                        type="password"
                        value={gesloPotrdi}
                        onChange={(e) => setGesloPotrdi(e.target.value)}
                        placeholder="Ponovite novo geslo"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end border-t border-slate-200 px-6 py-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  {saving ? 'Shranjujem...' : 'Shrani spremembe'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
