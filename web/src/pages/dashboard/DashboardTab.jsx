import { useState } from 'react';
import { StatCard } from './components/StatCard';
import { VozilaLineGraf } from './components/charts';
import { useVozilaGraf } from './hooks/useVozilaGraf';
import { LINE_COLORS, fmtEur } from './utils/dashboardUtils';

function PrevozRow({ u }) {
  const fmt = new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' });
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
        {new Date(u.datum).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </td>
      <td className="px-3 py-3 font-medium text-gray-900 max-w-[140px] truncate">{u.stranka?.naziv ?? '—'}</td>
      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
        {u.uporabnik ? `${u.uporabnik.ime} ${u.uporabnik.priimek}` : '—'}
      </td>
      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{u.vozilo?.registerska ?? '—'}</td>
      <td className="px-3 py-3 text-gray-500 max-w-[160px] truncate">{u.relacija ?? '—'}</td>
      <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">
        {u.cena != null ? fmt.format(u.cena) : '—'}
      </td>
      <td className="px-3 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
          u.placano ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
        }`}>
          <span className="material-symbols-outlined text-[12px]">
            {u.placano ? 'check_circle' : 'radio_button_unchecked'}
          </span>
          {u.placano ? 'Plačano' : 'Neplačano'}
        </span>
      </td>
    </tr>
  );
}

function TodayPrevoziCard({ todayPrevozi }) {
  const fmt = new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' });

  if (todayPrevozi.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
        <span className="material-symbols-outlined text-3xl">event_available</span>
        <p className="text-sm">Za danes ni načrtovanih prevozov.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {todayPrevozi.map((u) => (
        <div key={u.id_voznja} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
          <div className="flex-shrink-0 text-center w-12">
            <p className="text-xs text-gray-400">ura</p>
            <p className="text-sm font-bold text-gray-800">
              {new Date(u.zacetek || u.datum).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{u.stranka?.naziv ?? '—'}</p>
            <p className="text-xs text-gray-500 truncate">
              {u.relacija ?? ''}{u.vozilo ? ` · ${u.vozilo.registerska}` : ''}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-gray-600">
              {u.uporabnik ? `${u.uporabnik.ime} ${u.uporabnik.priimek}` : '—'}
            </p>
            {u.cena != null && <p className="text-xs font-semibold text-gray-800">{fmt.format(u.cena)}</p>}
          </div>
          <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            u.placano ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {u.placano ? 'Plačano' : 'Neplačano'}
          </span>
        </div>
      ))}
    </div>
  );
}

function OpozorilaPannel({ complianceAlerts, neplacaniAlerts }) {
  const fmt = new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' });

  if (complianceAlerts.length === 0 && neplacaniAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
        <span className="material-symbols-outlined text-3xl">check_circle</span>
        <p className="text-sm">Ni opozoril.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
      {complianceAlerts.map((a, i) => (
        <div key={i} className="flex gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
          <span className="material-symbols-outlined text-red-600 text-[18px] shrink-0 mt-0.5">warning</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-900">Prekoračitev dnevne meje vožnje</p>
            <p className="text-xs text-red-700 mt-0.5">{a.name} — {a.ure}h dne {a.date}</p>
          </div>
        </div>
      ))}
      {neplacaniAlerts.map((u) => (
        <div key={u.id_voznja} className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">payments</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">Neplačani prevoz</p>
            <p className="text-xs text-amber-800 mt-0.5">
              {u.stranka?.naziv ?? '—'} se mora plačati {fmt.format(u.cena)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardTab({ totalVozniki, skupneUre, ureLoading, recentPrevozi, neplacaniAlerts, complianceAlerts, todayPrevozi }) {
  const [selectedMonthVozila, setSelectedMonthVozila] = useState(() => new Date().toISOString().slice(0, 7));
  const { vozilaLines, vozilaGrafDays } = useVozilaGraf(selectedMonthVozila);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Skupne ure — ta mesec</p>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-blue-600 text-sm">schedule</span>
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            {ureLoading ? '…' : skupneUre !== null ? skupneUre.toLocaleString('sl-SI') : '—'}
          </p>
          <p className="text-sm text-gray-500 mt-1">h (delo + vožnja)</p>
        </div>
        <StatCard
          label="Vozniki v bazi"
          value={totalVozniki.toLocaleString()}
          unit="voznikov"
          iconName="group"
          bgColor="bg-green-100"
          iconColor="text-green-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Danes na sporedu</h2>
          <TodayPrevoziCard todayPrevozi={todayPrevozi} />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Opozorila</h2>
          <OpozorilaPannel complianceAlerts={complianceAlerts} neplacaniAlerts={neplacaniAlerts} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-8 shadow-sm">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Aktivnost vozil</h2>
            <p className="text-xs text-gray-500 mt-0.5">Dnevne ure dela in vožnje po vozilu (DELO + VOZNJA)</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="vozila-month" className="text-sm text-gray-600">Mesec:</label>
            <input
              id="vozila-month"
              type="month"
              value={selectedMonthVozila}
              onChange={(e) => setSelectedMonthVozila(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="w-full h-64 sm:h-72 bg-white rounded-lg border border-gray-100 p-2">
          <VozilaLineGraf lines={vozilaLines} days={vozilaGrafDays} />
        </div>
        {vozilaLines.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-4">
            {vozilaLines.map((l, i) => (
              <div key={l.registerska} className="flex items-center gap-2 text-xs text-gray-600">
                <div className="w-6 h-2 rounded-full" style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }} />
                <span>{l.registerska}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 shadow-sm">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Prevozi ta mesec</h2>
        {recentPrevozi.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Ni prevozov ta mesec.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Datum', 'Stranka', 'Voznik', 'Vozilo', 'Relacija', 'Cena', 'Status'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentPrevozi.map((u) => <PrevozRow key={u.id_voznja} u={u} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}