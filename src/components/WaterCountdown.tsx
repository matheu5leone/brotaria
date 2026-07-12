'use client';

import { useEffect, useState } from 'react';

/**
 * Cronômetro de rega — grande e vivo, no lugar do "Próxima rega em: XX" minúsculo.
 * Anel de progresso (fração do período já decorrida) + tempo restante contando a
 * cada segundo. Estados: pode regar agora / adulta (não rega) / contando.
 */
function fmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function WaterCountdown({
  nextWaterAt,
  periodMs,
  canWater,
  isFinal = false,
  size = 104,
}: {
  nextWaterAt: string;
  periodMs?: number | null;
  canWater: boolean;
  isFinal?: boolean;
  size?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (canWater || isFinal) return; // parado quando não há contagem
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [canWater, isFinal]);

  if (isFinal) {
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        <div className="text-3xl">🌳</div>
        <span className="text-xs font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-mid)' }}>
          Planta adulta
        </span>
        <span className="text-[10px]" style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
          Não precisa mais de água
        </span>
      </div>
    );
  }

  const remaining = new Date(nextWaterAt).getTime() - now;
  const ready = canWater || remaining <= 0;

  if (ready) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-1">
        <div
          className="water-ready-pulse flex items-center gap-2 px-4 py-2.5 rounded-2xl"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 15,
            color: '#bfe3ff',
            background: 'linear-gradient(135deg, #1a6ba0, #0d4a7a)',
            border: '1.5px solid rgba(96,165,250,0.5)',
            boxShadow: '0 6px 18px rgba(26,107,160,0.45)',
          }}
        >
          <span style={{ fontSize: 20 }}>💧</span> Pode regar agora!
        </div>
      </div>
    );
  }

  // Fração do período já decorrida → varredura do anel.
  const period = periodMs && periodMs > 0 ? periodMs : remaining;
  const elapsed = Math.min(1, Math.max(0, 1 - remaining / period));
  const deg = Math.round(elapsed * 360);
  const inner = size - 14;

  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(#4aa3e0 ${deg}deg, rgba(92,58,30,0.18) 0)`,
        }}
      >
        <div
          className="absolute rounded-full flex flex-col items-center justify-center"
          style={{
            width: inner,
            height: inner,
            background: 'radial-gradient(circle at 50% 35%, var(--color-parch-light), var(--color-parch-dark))',
            border: '1px solid rgba(92,58,30,0.25)',
            boxShadow: 'inset 0 1px 2px rgba(242,232,213,0.8)',
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>💧</span>
          <span
            className="tabular-nums"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 19, color: 'var(--color-text-dark)', letterSpacing: '0.01em' }}
          >
            {fmt(remaining)}
          </span>
        </div>
      </div>
      <span
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
      >
        até a próxima rega
      </span>
    </div>
  );
}
