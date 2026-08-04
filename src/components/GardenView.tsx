'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { usePots } from '@/hooks/useGardenData';
import { useAuth } from '@/hooks/useAuth';
import { useWaterNeighbor, useGardenWaterings } from '@/hooks/useNeighbor';
import { HexPot } from '@/components/HexPot';
import { POT_BOX_ASPECT } from '@/lib/potGeometry';

const PARTICLES = [
  { x: 4,  y: 8,  s: 18, d: 0,   o: 0.22, dur: 5.2 },
  { x: 14, y: 82, s: 13, d: 1.3, o: 0.17, dur: 6.1 },
  { x: 87, y: 6,  s: 16, d: 0.8, o: 0.20, dur: 4.8 },
  { x: 94, y: 72, s: 11, d: 2.1, o: 0.15, dur: 5.7 },
  { x: 48, y: 91, s: 10, d: 0.5, o: 0.14, dur: 6.4 },
  { x: 2,  y: 48, s: 12, d: 1.9, o: 0.16, dur: 5.0 },
  { x: 76, y: 88, s: 14, d: 0.3, o: 0.18, dur: 4.6 },
  { x: 28, y: 4,  s: 9,  d: 1.6, o: 0.13, dur: 5.9 },
];

/** Mensagem curta por código de erro do servidor. */
const ERROR_TEXT: Record<string, string> = {
  ALREADY_WATERED: 'já regada por você',
  DAILY_LIMIT:     '3 regas hoje — volte amanhã',
  NO_WATER:        'sem água',
  OWN_PLANT:       'seu próprio jardim',
  PLANT_NOT_FOUND: 'planta não encontrada',
};

type Feedback = { plantId: string; text: string; good: boolean; lucky: boolean };

/** Posição/atraso das partículas do rastro (uma planta regada por vizinho). */
const SPARKLES = [
  { left: '32%', delay: '0s' },
  { left: '50%', delay: '0.9s' },
  { left: '66%', delay: '1.7s' },
] as const;

export function GardenView({ userId, ownerId }: { userId: string; ownerId?: string }) {
  const { data: pots = [], isPending } = usePots(userId);
  const { user } = useAuth();
  const waterNeighbor = useWaterNeighbor();

  // Rastro: quem regou o quê nas últimas 24h (brilho na planta, só visual).
  const { data: waterings = [] } = useGardenWaterings(userId);
  const wateredBy = useMemo(
    () => new Map(waterings.map((w) => [w.plantId, w.nickname])),
    [waterings],
  );

  // Só rega jardim dos OUTROS, e só logado.
  const canWater = !!user && !!ownerId && user.id !== ownerId;

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [wateredNow, setWateredNow] = useState<Set<string>>(new Set());

  const showFeedback = useCallback((f: Feedback) => {
    setFeedback(f);
    setTimeout(() => setFeedback((cur) => (cur === f ? null : cur)), 2600);
  }, []);

  const handleWater = useCallback((plantId: string) => {
    if (waterNeighbor.isPending) return;
    waterNeighbor.mutate(plantId, {
      onSuccess: (data) => {
        setWateredNow((s) => new Set(s).add(plantId));
        showFeedback({
          plantId,
          text: `+${data.herboGained} herbo · +1 rep`,
          good: true,
          lucky: data.lucky,
        });
      },
      onError: (e) => {
        const code = (e as { code?: string }).code ?? '';
        if (code === 'ALREADY_WATERED') setWateredNow((s) => new Set(s).add(plantId));
        showFeedback({ plantId, text: ERROR_TEXT[code] ?? 'não deu pra regar', good: false, lucky: false });
      },
    });
  }, [waterNeighbor, showFeedback]);

  if (isPending) {
    return (
      <div className="garden-bg w-full h-full flex items-center justify-center" style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)' }}>
        <p className="text-sm font-bold animate-pulse" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-caption)' }}>
          Carregando jardim...
        </p>
      </div>
    );
  }

  return (
    <div
      className="garden-bg relative w-full h-full overflow-hidden select-none"
      style={{
        boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)',
        // Confina a profundidade dos vasos (zIndex = pos_y) a ESTE canvas: sem um
        // stacking context próprio, os z-index (até ~1000) subiriam para a página
        // e passariam por cima da navbar / menu hamburguer.
        isolation: 'isolate',
      }}
    >
      {/* Partículas decorativas */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.s, height: p.s,
            color: 'rgba(201,162,39,0.9)',
            ['--p-opacity' as string]: p.o,
            animation: `garden-float ${p.dur}s ease-in-out ${p.d}s infinite`,
            opacity: p.o,
          }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <ellipse cx="10" cy="4"  rx="2.5" ry="4.5" transform="rotate(0   10 10)" />
            <ellipse cx="10" cy="4"  rx="2.5" ry="4.5" transform="rotate(90  10 10)" />
            <ellipse cx="10" cy="4"  rx="2.5" ry="4.5" transform="rotate(180 10 10)" />
            <ellipse cx="10" cy="4"  rx="2.5" ry="4.5" transform="rotate(270 10 10)" />
            <circle  cx="10" cy="10" r="2" />
          </svg>
        </div>
      ))}

      {/* Pots — o vaso em si não é clicável; só o regador (quando é visita). */}
      {pots.map((pot) => {
        const x = pot.pos_x ?? 50;
        const y = pot.pos_y ?? 50;
        const plantId = pot.plant_id as string | null;
        const showCan = canWater && !!plantId;
        const already = !!plantId && wateredNow.has(plantId);
        const fb = feedback && feedback.plantId === plantId ? feedback : null;
        const helper = plantId ? wateredBy.get(plantId) : undefined;
        const hasTrace = helper !== undefined;

        return (
          <div
            key={pot.id}
            title={hasTrace ? `Regada por @${helper ?? 'alguém'}` : undefined}
            className="absolute pointer-events-none"
            style={{
              width: '12%',
              aspectRatio: `1 / ${POT_BOX_ASPECT}`,
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              // Profundidade: quem está mais pra baixo (maior pos_y = frente)
              // fica por cima da planta/canteiro de trás (menor pos_y).
              zIndex: Math.round(y * 10),
            }}
          >
            <HexPot pot={pot} isSelected={false} onClick={() => {}} />

            {/* Rastro: brilho dourado por 24h em quem foi regada por um vizinho */}
            {hasTrace && SPARKLES.map((s, i) => (
              <span key={i} className="neighbor-sparkle" style={{ left: s.left, animationDelay: s.delay }} />
            ))}

            {/* Chip de feedback (ganho ou motivo da recusa) */}
            {fb && (
              <span
                className="absolute left-1/2 -translate-x-1/2 px-2 py-1 rounded-full text-[11px] font-black whitespace-nowrap pointer-events-none"
                style={{
                  bottom: '104%',
                  fontFamily: 'var(--font-display)',
                  color: fb.good ? (fb.lucky ? '#3a2a08' : '#0f2a0c') : '#fff',
                  background: fb.good
                    ? (fb.lucky ? 'rgba(250,199,117,0.97)' : 'rgba(155,222,120,0.95)')
                    : 'rgba(90,20,20,0.9)',
                  border: `1.5px solid ${fb.good ? (fb.lucky ? 'rgba(133,79,11,0.6)' : 'rgba(28,90,20,0.5)') : 'rgba(160,60,60,0.7)'}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                {fb.lucky ? `✨ ${fb.text}` : fb.text}
              </span>
            )}

            {/* Regador — único elemento clicável na visita */}
            {showCan && (
              <button
                onClick={() => handleWater(plantId!)}
                disabled={already || waterNeighbor.isPending}
                aria-label="Regar esta planta"
                title={already ? 'Você já regou esta planta hoje' : 'Regar esta planta (+herbo)'}
                className="pointer-events-auto absolute left-1/2 -translate-x-1/2 rounded-full p-1.5 transition-transform active:scale-90 hover:scale-110 disabled:cursor-not-allowed"
                style={{
                  top: '-14%',
                  background: 'rgba(8,14,5,0.72)',
                  border: '1.5px solid rgba(96,165,250,0.5)',
                  backdropFilter: 'blur(4px)',
                  opacity: already ? 0.4 : 1,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                <Image src="/imgs/watering-can.webp" alt="" width={22} height={22} className="object-contain" draggable={false} />
              </button>
            )}
          </div>
        );
      })}

      {pots.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p
            className="text-sm px-4 py-2 rounded-xl"
            style={{
              fontFamily: 'var(--font-caption)',
              fontStyle: 'italic',
              color: 'var(--color-text-light)',
              background: 'rgba(15,32,12,0.7)',
              border: '1px solid rgba(92,58,30,0.3)',
            }}
          >
            Este jardim está vazio por enquanto.
          </p>
        </div>
      )}
    </div>
  );
}
