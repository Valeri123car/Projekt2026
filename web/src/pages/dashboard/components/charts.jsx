import { LINE_COLORS } from '../utils/dashboardUtils';

export function DonutChart({ segments, totalMin }) {
  const r     = 65;
  const cx    = 110;
  const cy    = 110;
  const circ  = 2 * Math.PI * r;
  const totalM = totalMin || 1;
  let cumFrac  = 0;

  const STANJE_COLORS = {
    VOZNJA:          '#1d4ed8',
    DELO:            '#6b21a8',
    POCITEK:         '#166534',
    ODMOR:           '#92400e',
    RAZPOLOZLJIVOST: '#c2410c',
    DRUGO:           '#6b7280',
    NEZNANO:         '#9ca3af',
  };

  return (
    <svg viewBox="0 0 220 220" className="w-full h-full">
      {segments.map((seg) => {
        const frac     = seg.mins / totalM;
        const dash     = frac * circ;
        const rotation = -90 + cumFrac * 360;
        cumFrac += frac;
        return (
          <circle key={seg.stanje} cx={cx} cy={cy} r={r}
            fill="none" stroke={STANJE_COLORS[seg.stanje] || '#6b7280'}
            strokeWidth="30" strokeDasharray={`${dash} ${circ - dash}`}
            transform={`rotate(${rotation} ${cx} ${cy})`} />
        );
      })}
      <circle cx={cx} cy={cy} r={50} fill="white" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#111827">
        {(totalMin / 60).toFixed(1)}h
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="#9ca3af">skupaj</text>
    </svg>
  );
}

export function VBarChart({ data, color = '#2563eb', color2, labelKey = 'label', valueKey = 'value', value2Key }) {
  if (!data.length) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Ni podatkov.</div>;
  }

  const maxV    = Math.max(1, ...data.map((d) => d[valueKey] + (value2Key ? (d[value2Key] ?? 0) : 0)));
  const W       = 1000;
  const H       = 260;
  const PAD_L   = 10;
  const PAD_B   = 40;
  const PAD_T   = 20;
  const gH      = H - PAD_B - PAD_T;
  const bW      = Math.min(55, (W - PAD_L) / data.length - 6);
  const spacing = (W - PAD_L) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="white" />
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = PAD_T + gH - f * gH;
        const v = Math.round(maxV * f * 10) / 10;
        return (
          <g key={f}>
            <line x1={PAD_L} y1={y} x2={W} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD_L + 2} y={y - 3} fontSize="10" fill="#d1d5db">{v}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x  = PAD_L + i * spacing + (spacing - bW) / 2;
        const h1 = (d[valueKey] / maxV) * gH;
        const h2 = value2Key ? ((d[value2Key] ?? 0) / maxV) * gH : 0;
        const y1 = PAD_T + gH - h1;
        const total = d[valueKey] + (value2Key ? (d[value2Key] ?? 0) : 0);
        return (
          <g key={d[labelKey]}>
            {value2Key && h2 > 0 && (
              <rect x={x} y={y1 - h2} width={bW} height={h2} fill={color2 || '#6b21a8'} rx="3" opacity="0.6" />
            )}
            {h1 > 0 && <rect x={x} y={y1} width={bW} height={h1} fill={color} rx="3" />}
            {(h1 + h2) > 0 && (
              <text x={x + bW / 2} y={y1 - h2 - 3} fontSize="10" fill="#374151" textAnchor="middle" fontWeight="bold">
                {Math.round(total * 10) / 10}
              </text>
            )}
            <text x={x + bW / 2} y={H - PAD_B + 14} fontSize="10" fill="#6b7280" textAnchor="middle">
              {d[labelKey]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function SimpleLineChart({ data, labelKey = 'label', valueKey = 'value', color = '#2563eb' }) {
  if (!data.length) return null;

  const maxV  = Math.max(1, ...data.map((d) => d[valueKey]));
  const W     = 1000;
  const H     = 220;
  const PAD_L = 50;
  const PAD_R = 10;
  const PAD_T = 20;
  const PAD_B = 30;
  const gW    = W - PAD_L - PAD_R;
  const gH    = H - PAD_T - PAD_B;

  const xP  = (i) => PAD_L + (i / (data.length - 1 || 1)) * gW;
  const yP  = (v) => PAD_T + gH - (v / maxV) * gH;
  const pts = data.map((d, i) => `${xP(i)},${yP(d[valueKey])}`).join(' ');

  const labelStep  = Math.ceil(data.length / 8);
  const labelItems = data.filter((_, i) => i === 0 || i === data.length - 1 || i % labelStep === 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="white" />
      {[0, 0.5, 1].map((f) => {
        const y = yP(maxV * f);
        return (
          <g key={f}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD_L - 4} y={y + 4} fontSize="11" fill="#9ca3af" textAnchor="end">
              {Math.round(maxV * f * 10) / 10}
            </text>
          </g>
        );
      })}
      <line x1={PAD_L} y1={PAD_T + gH} x2={W - PAD_R} y2={PAD_T + gH} stroke="#e5e7eb" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => d[valueKey] > 0 && (
        <circle key={i} cx={xP(i)} cy={yP(d[valueKey])} r="3" fill={color} />
      ))}
      {labelItems.map((d) => {
        const i = data.indexOf(d);
        return (
          <text key={i} x={xP(i)} y={H - PAD_B + 14} fontSize="10" fill="#9ca3af" textAnchor="middle">
            {d[labelKey]}
          </text>
        );
      })}
    </svg>
  );
}

export function VozilaLineGraf({ lines, days }) {
  if (!lines.length) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Ni podatkov za izbrani mesec.
      </div>
    );
  }

  const allValues = lines.flatMap((l) => l.dnevno);
  const maxUre    = Math.max(1, ...allValues);
  const W         = 1200;
  const H         = 300;
  const PAD_L     = 70;
  const PAD_R     = 20;
  const PAD_T     = 20;
  const PAD_B     = 40;
  const gW        = W - PAD_L - PAD_R;
  const gH        = H - PAD_T - PAD_B;

  const xPos = (day) => PAD_L + ((day - 1) / (days - 1 || 1)) * gW;
  const yPos = (ure) => PAD_T + gH - (ure / maxUre) * gH;

  const yLabels = [0, 0.25, 0.5, 0.75, 1];
  const dayArr  = Array.from({ length: days }, (_, i) => i + 1);
  const xLabels = dayArr.filter((d) => d === 1 || d % 3 === 0 || d === days);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} fill="white" />
      {yLabels.map((frac) => {
        const val = Math.round(maxUre * frac * 10) / 10;
        const y   = yPos(maxUre * frac);
        return (
          <g key={frac}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD_L - 6} y={y + 4} fontSize="11" fill="#9ca3af" textAnchor="end">{val}h</text>
          </g>
        );
      })}
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + gH} stroke="#e5e7eb" strokeWidth="1" />
      <line x1={PAD_L} y1={PAD_T + gH} x2={W - PAD_R} y2={PAD_T + gH} stroke="#e5e7eb" strokeWidth="1" />
      {xLabels.map((d) => (
        <text key={d} x={xPos(d)} y={H - PAD_B + 14} fontSize="11" fill="#9ca3af" textAnchor="middle">{d}</text>
      ))}
      {lines.map((line, li) => {
        const color  = LINE_COLORS[li % LINE_COLORS.length];
        const key    = line.label ?? line.registerska;
        const points = dayArr.map((d) => `${xPos(d)},${yPos(line.dnevno[d - 1] ?? 0)}`).join(' ');
        const dots   = dayArr.filter((d) => (line.dnevno[d - 1] ?? 0) > 0);
        return (
          <g key={key}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
            {dots.map((d) => (
              <circle key={d} cx={xPos(d)} cy={yPos(line.dnevno[d - 1])} r="3" fill={color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}