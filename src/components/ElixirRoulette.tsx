'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FallingLeaves } from '@/components/FallingLeaves';
import { THIRST } from '@/config/economy';
import { playSfx } from '@/lib/sfx';

/**
 * Revelação do Elixir Floral: a tela escurece, folhas caem (as mesmas do login)
 * e um cronômetro gira com números aleatórios até parar no novo intervalo de
 * sede da planta. Confirma no OK.
 *
 * O valor final vem do SERVIDOR (`periodMs`) — a roleta é só encenação por cima
 * de um resultado que já aconteceu.
 */

const SPIN_MS = 2600;   // quanto tempo a roleta gira antes de parar
const TICK_MS = 70;     // troca de número durante o giro

function fmt(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h${m > 0 ? ` ${String(m).padStart(2, '0')}min` : ''}`;
}

export function ElixirRoulette({
  periodMs,
  previousMs,
  onClose,
}: {
  periodMs: number;
  previousMs?: number | null;
  onClose: () => void;
}) {
  const [display, setDisplay] = useState(periodMs);
  const [spinning, setSpinning] = useState(true);

  // Sem guarda de "já rodou": o StrictMode monta → limpa → monta, e uma guarda
  // por ref faria a segunda montagem sair antes de recriar os timers que a
  // primeira limpou — a roleta girava para sempre. O cleanup já dá conta.
  useEffect(() => {
    playSfx('drumroll');

    const min = THIRST.PERIOD_MIN_HOURS * 60;
    const max = THIRST.PERIOD_MAX_HOURS * 60;
    const tick = setInterval(() => {
      const mins = Math.floor(Math.random() * (max - min + 1)) + min;
      setDisplay(mins * 60_000);
    }, TICK_MS);

    const stop = setTimeout(() => {
      clearInterval(tick);
      setDisplay(periodMs);   // o valor real do servidor
      setSpinning(false);
      playSfx('reveal');
    }, SPIN_MS);

    return () => { clearInterval(tick); clearTimeout(stop); };
  }, [periodMs]);

  // Melhorou se o novo intervalo é MENOR (a planta pede água com menos espera).
  const delta = previousMs != null ? previousMs - periodMs : null;
  const melhorou = delta != null && delta > 0;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ background: 'rgba(3,6,2,0.88)' }}>
      <FallingLeaves />

      <div className="relative flex flex-col items-center gap-5" style={{ maxWidth: 380 }}>
        <span className="relative" style={{ width: 96, height: 96 }}>
          <Image
            src="/imgs/elixir.webp" alt="Elixir Floral" fill
            className="object-contain"
            style={{ filter: spinning ? 'drop-shadow(0 0 14px rgba(250,199,117,0.85))' : 'drop-shadow(0 0 22px rgba(250,199,117,1))' }}
            draggable={false}
          />
        </span>

        <p className="text-sm font-bold text-center" style={{ fontFamily: 'var(--font-caption)', color: 'rgba(232,213,160,0.85)' }}>
          {spinning ? 'O elixir agita a terra...' : 'A planta tem uma nova sede'}
        </p>

        {/* Mostrador */}
        <div
          className="px-8 py-5 rounded-2xl text-center"
          style={{
            minWidth: 240,
            background: 'linear-gradient(180deg, var(--color-parch-light), var(--color-parch-dark))',
            border: `2px solid ${spinning ? 'rgba(133,79,11,0.5)' : 'var(--color-gold)'}`,
            boxShadow: spinning ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 40px rgba(201,162,39,0.35)',
            transition: 'border-color 200ms, box-shadow 200ms',
          }}
        >
          <span
            className="block font-black leading-none tabular-nums"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 40,
              color: 'var(--color-text-dark)',
              transform: spinning ? 'scale(0.94)' : 'scale(1)',
              transition: 'transform 220ms cubic-bezier(.2,1.4,.4,1)',
            }}
          >
            {fmt(display)}
          </span>
          <span className="block text-[11px] font-bold mt-1.5" style={{ fontFamily: 'var(--font-caption)', color: 'var(--color-text-mid)' }}>
            entre cada pedido de água
          </span>
        </div>

        {/* Comparação com o valor antigo */}
        {!spinning && delta != null && delta !== 0 && (
          <span
            className="px-3 py-1 rounded-full text-xs font-black"
            style={{
              fontFamily: 'var(--font-display)',
              color: melhorou ? '#0f2a0c' : '#fff',
              background: melhorou ? 'rgba(155,222,120,0.95)' : 'rgba(120,40,40,0.9)',
              border: `1.5px solid ${melhorou ? 'rgba(28,90,20,0.5)' : 'rgba(160,60,60,0.7)'}`,
            }}
          >
            {melhorou ? `▼ ${fmt(Math.abs(delta))} mais rápida` : `▲ ${fmt(Math.abs(delta))} mais lenta`}
          </span>
        )}

        <button
          onClick={onClose}
          disabled={spinning}
          className="px-10 py-3 rounded-xl font-black text-base transition-transform active:scale-95 disabled:opacity-40"
          style={{
            fontFamily: 'var(--font-display)',
            color: '#3a2a08',
            background: 'rgba(250,199,117,0.97)',
            border: '1.5px solid rgba(133,79,11,0.6)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
