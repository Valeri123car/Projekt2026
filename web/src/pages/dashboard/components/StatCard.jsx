export function StatCard({ label, value, unit, iconName, bgColor, iconColor, trend }) {
  return (
    <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <p className="text-gray-600 text-xs font-semibold mb-2 uppercase tracking-wide">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
          {unit && <p className="text-sm text-gray-500 mt-1">{unit}</p>}
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <span className={`material-symbols-outlined ${iconColor} text-sm sm:text-base`}>{iconName}</span>
        </div>
      </div>
      {trend && <p className="text-sm text-green-600 font-semibold">{trend}</p>}
    </div>
  );
}

export function DriverHBar({ name, voznja, delo, maxTotal }) {
  const max  = maxTotal || 1;
  const vPct = (voznja / max) * 100;
  const dPct = (delo / max) * 100;
  const hasData = voznja > 0 || delo > 0;

  return (
    <div className="flex items-center gap-3 py-0.5">
      <span className="text-xs text-gray-600 w-32 truncate shrink-0 text-right">{name}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden flex">
        {vPct > 0 && <div style={{ width: `${vPct}%` }} className="h-full bg-blue-500 shrink-0 transition-all" />}
        {dPct > 0 && <div style={{ width: `${dPct}%` }} className="h-full bg-orange-400 shrink-0 transition-all" />}
      </div>
      {hasData
        ? (
          <div className="text-right shrink-0 w-28">
            <span className="text-[11px] text-blue-600 font-semibold">{voznja}h</span>
            <span className="text-gray-300 mx-1">|</span>
            <span className="text-[11px] text-orange-500 font-semibold">{delo}h</span>
          </div>
        )
        : <span className="text-[11px] text-gray-300 w-28 text-right shrink-0">—</span>}
    </div>
  );
}

export function HBar({ label, value, max, color = '#0284c7', unit = 'h' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-0.5">
      <span className="text-xs text-gray-600 w-32 truncate shrink-0 text-right">{label}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
        <div className="h-full rounded transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-14 text-right shrink-0">{value}{unit}</span>
    </div>
  );
}