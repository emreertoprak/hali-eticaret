'use client';

import { useEffect, useRef, useState } from 'react';

import { formatPrice } from '@/lib/format';

/** Günlük ciro sütun grafiği — tek seri, tek eksen. Renk: dataviz doğrulayıcısından geçen koyu altın. */
const BAR_COLOR = '#b07d12';
const GRID = '#ece9e1';
const HEIGHT = 240;
const PAD = { top: 16, right: 8, bottom: 28, left: 64 };

function niceMax(max: number): number {
  if (max <= 0) return 1000;
  const exp = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * exp).find((s) => max / s <= 4) ?? 10 * exp;
  return Math.ceil(max / step) * step;
}

const compact = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 });
const dayLabel = (iso: string) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00`));

export function RevenueChart({ series }: { series: { day: string; revenue: number; orders: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const max = niceMax(Math.max(...series.map((s) => s.revenue)));
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / series.length;
  const barW = Math.max(2, Math.min(24, band - 2)); // ≤24px, komşular arasında ≥2px boşluk
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.ceil(series.length / Math.max(2, Math.floor(plotW / 64)));
  const peak = series.reduce((best, s, i) => (s.revenue > series[best].revenue ? i : best), 0);

  const barPath = (x: number, top: number, h: number) => {
    const r = Math.min(4, barW / 2, h);
    const b = top + h;
    return `M${x},${b}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${x + barW},${top + r}V${b}Z`;
  };

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button className="text-[12px] font-semibold underline" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
          {showTable ? 'Grafiği göster' : 'Tablo olarak göster'}
        </button>
      </div>
      {showTable ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1.5">Gün</th>
                <th className="py-1.5 text-right">Sipariş</th>
                <th className="py-1.5 text-right">Ciro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {series.map((s) => (
                <tr key={s.day}>
                  <td className="py-1.5">{dayLabel(s.day)}</td>
                  <td className="py-1.5 text-right tabular-nums">{s.orders}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatPrice(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative">
          <svg width={width} height={HEIGHT} role="img" aria-label={`Son ${series.length} günün günlük cirosu`} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#666">
                  {t === 0 ? '0' : `${compact.format(t)} TL`}
                </text>
              </g>
            ))}
            {series.map((s, i) => {
              const x = PAD.left + i * band + (band - barW) / 2;
              const h = (s.revenue / max) * plotH;
              return (
                <g key={s.day} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${dayLabel(s.day)}: ${formatPrice(s.revenue)}, ${s.orders} sipariş`}>
                  {/* Görünmez geniş isabet alanı: tüm bant */}
                  <rect x={PAD.left + i * band} y={PAD.top} width={band} height={plotH} fill="transparent" />
                  {h > 0 && <path d={barPath(x, y(s.revenue), h)} fill={BAR_COLOR} opacity={hover === null || hover === i ? 1 : 0.45} />}
                  {i % labelEvery === 0 && (
                    <text x={x + barW / 2} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="#666">
                      {dayLabel(s.day)}
                    </text>
                  )}
                </g>
              );
            })}
            {series[peak]?.revenue > 0 && hover === null && (
              <text x={PAD.left + peak * band + band / 2} y={y(series[peak].revenue) - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#222">
                {compact.format(series[peak].revenue)}
              </text>
            )}
            <line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="#d9d5cb" strokeWidth={1} />
          </svg>
          {hover !== null && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg border border-line bg-white px-3 py-2 text-[12px] shadow-float"
              style={{ left: Math.min(width - 150, Math.max(0, PAD.left + hover * band + band / 2 - 70)), top: 0 }}
            >
              <p className="font-bold">{dayLabel(series[hover].day)}</p>
              <p className="tabular-nums">{formatPrice(series[hover].revenue)}</p>
              <p className="text-muted">{series[hover].orders} sipariş</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
