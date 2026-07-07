'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Droplets } from 'lucide-react';
import Image from 'next/image';
import { AppShell } from '@/components/AppShell';
import { GAME } from '@/config/economy';
import { useWaterStatus, useCollectWater } from '@/hooks/useWater';

const FILL_PER_CLICK = GAME.WATER_BAR_FILL_PER_CLICK;
const DECAY_PER_TICK = GAME.WATER_BAR_DECAY_PER_TICK;
const TICK_MS = GAME.WATER_BAR_TICK_MS;

function formatCd(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function AguaPage() {
  const statusQuery = useWaterStatus();
  const status = statusQuery.data;
  const collect = useCollectWater();

  const [fill, setFill] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const collectingRef = useRef(false);

  const balance = status?.balance ?? 0;
  const max = status?.max ?? GAME.WATER_MAX_BALANCE;
  const isFull = balance >= max;
  // Fim do cooldown derivado do momento em que a query trouxe o dado (sem ref/effect).
  const cdEnd = status?.cooldownRemainingMs ? statusQuery.dataUpdatedAt + status.cooldownRemainingMs : 0;
  const remaining = Math.max(0, cdEnd - now);
  const onCooldown = remaining > 0;
  const canFill = !!status?.collectableNow && !onCooldown && !isFull && !collect.isPending;

  // Relógio local: só faz tick (setState no callback, permitido pelo lint).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // Decaimento contínuo da barra (exige cliques rápidos). Reset feito no callback.
  useEffect(() => {
    const id = setInterval(() => {
      setFill((f) => (canFill && f > 0 ? Math.max(0, f - DECAY_PER_TICK) : 0));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [canFill]);

  // Clique bombeia; ao cruzar 100% dispara a coleta e reseta a barra.
  const pump = useCallback(() => {
    if (!canFill || collectingRef.current) return;
    setFill((f) => {
      const next = f + FILL_PER_CLICK;
      if (next >= 100) {
        collectingRef.current = true;
        queueMicrotask(() => {
          collect.mutateAsync()
            .catch(() => { /* erro tratado pelo status/refetch */ })
            .finally(() => { collectingRef.current = false; });
        });
        return 0;
      }
      return next;
    });
  }, [canFill, collect]);

  const statusLabel = isFull
    ? 'Regador cheio!'
    : onCooldown
      ? `Recarrega em ${formatCd(remaining)}`
      : 'Clique rápido no balde para encher!';

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-6 py-8 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-2 self-start">
          <Droplets className="w-8 h-8" style={{ color: '#3b82f6' }} />
          <div>
            <h1 className="text-3xl font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>
              Coleta de Água
            </h1>
            <p className="text-sm" style={{ color: 'rgba(232,213,160,0.45)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>
              Encha o regador para regar suas plantas
            </p>
          </div>
        </div>

        {/* Saldo */}
        <div
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 my-4"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)' }}
        >
          <Droplets className="w-5 h-5" style={{ color: '#3b82f6' }} />
          <span className="font-black text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>
            {balance}<span className="text-sm" style={{ color: 'rgba(232,213,160,0.55)' }}> / {max} água</span>
          </span>
        </div>

        {/* Cena: barra vertical + balde */}
        <div
          className="w-full rounded-2xl p-6 flex flex-col items-center gap-5"
          style={{
            background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
            border: '1.5px solid var(--color-wood-light)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.3), inset 0 1px 1px rgba(242,232,213,0.7)',
          }}
        >
          {/* Barra vertical */}
          <div
            className="relative rounded-xl overflow-hidden"
            style={{ width: 88, height: 240, background: 'rgba(92,58,30,0.15)', border: '2px solid var(--color-wood-light)' }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 transition-[height] duration-75 ease-linear"
              style={{
                height: `${fill}%`,
                background: 'linear-gradient(180deg, #60a5fa, #2563eb)',
                boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4)',
              }}
            />
            <div
              className="absolute inset-0 flex items-center justify-center font-black text-lg pointer-events-none"
              style={{ fontFamily: 'var(--font-display)', color: fill > 55 ? '#fff' : 'var(--color-text-dark)' }}
            >
              {Math.round(fill)}%
            </div>
          </div>

          {/* Balde / poço — clique para bombear água */}
          <button
            onClick={pump}
            disabled={!canFill}
            aria-label="Bombear água"
            className="select-none rounded-full p-4 transition-transform active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'radial-gradient(circle at 50% 35%, rgba(59,130,246,0.18), rgba(59,130,246,0.06))',
              border: '2px solid rgba(59,130,246,0.4)',
              touchAction: 'manipulation',
            }}
          >
            <Image src="/imgs/watering-can.png" alt="balde" width={64} height={64} className="object-contain" draggable={false} />
          </button>

          <p
            className="text-sm font-bold text-center"
            style={{
              fontFamily: 'var(--font-display)',
              color: isFull ? '#2a5a1e' : onCooldown ? 'var(--color-wood-mid)' : 'var(--color-text-mid)',
            }}
          >
            {statusLabel}
          </p>
        </div>

        <p className="mt-4 text-xs text-center" style={{ color: 'rgba(232,213,160,0.4)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>
          Cada regador cheio rende 1 água · limite de {max} · nova coleta a cada {GAME.WATER_COLLECT_COOLDOWN_HOURS}h
        </p>
      </div>
    </AppShell>
  );
}
