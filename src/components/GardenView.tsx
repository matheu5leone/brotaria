'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { usePots } from '@/hooks/useGardenData';
import { useAuth } from '@/hooks/useAuth';
import { useWaterNeighbor, useGardenSocial } from '@/hooks/useNeighbor';
import { HexPot } from '@/components/HexPot';
import { PotFx } from '@/components/PotFx';
import { POT_BOX_ASPECT } from '@/lib/potGeometry';
import type { Pot } from '@/types';

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

/** Posição/atraso das partículas do rastro (planta já regada por um vizinho). */
const SPARKLES = [
  { left: '32%', delay: '0s' },
  { left: '50%', delay: '0.9s' },
  { left: '66%', delay: '1.7s' },
] as const;

/** Mensagem curta por código de erro do servidor. */
const ERROR_TEXT: Record<string, string> = {
  ALREADY_WATERED: 'já regada por você hoje',
  DAILY_LIMIT:     'você já ajudou 2 jardins hoje',
  NO_WATER:        'sem água no regador',
  NOT_ASKING:      'esta planta não pediu água',
  OWN_PLANT:       'seu próprio jardim',
  PLANT_NOT_FOUND: 'planta não encontrada',
};

type Feedback = { text: string; good: boolean; lucky: boolean };

export function GardenView({ userId, ownerId }: { userId: string; ownerId?: string }) {
  const { data: pots = [], isPending } = usePots(userId);
  const { user } = useAuth();
  const waterNeighbor = useWaterNeighbor();

  // O servidor decide qual planta pede ajuda hoje e quais já foram regadas.
  const { data: social } = useGardenSocial(userId);
  const askingPlantId = social?.askingPlantId ?? null;
  const wateredBy = useMemo(
    () => new Map((social?.waterings ?? []).map((w) => [w.plantId, w.nickname])),
    [social],
  );

  // Só rega jardim dos OUTROS, e só logado.
  const canWater = !!user && !!ownerId && user.id !== ownerId;

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [wateredLocal, setWateredLocal] = useState(false);
  // "Já ajudei este jardim hoje": ou o servidor disse, ou acabei de regar.
  const wateredNow = wateredLocal || !!social?.alreadyWateredByMe;
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isOverTarget, setIsOverTarget] = useState(false);
  const [dropFx, setDropFx] = useState<{ x: number; y: number; nonce: number } | null>(null);
  const nonceRef = useRef(0);

  const askingPot = useMemo(
    () => pots.find((p) => p.plant_id && p.plant_id === askingPlantId) ?? null,
    [pots, askingPlantId],
  );

  const showFeedback = useCallback((f: Feedback) => {
    setFeedback(f);
    setTimeout(() => setFeedback((cur) => (cur === f ? null : cur)), 3000);
  }, []);

  /** Encontra o pot sob o ponto da tela (mesmo mecanismo da rega do próprio jardim). */
  const findPotAtPoint = useCallback((x: number, y: number): Pot | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const id = (el as HTMLElement).dataset?.potId;
      if (id) return pots.find((p) => p.id === id) ?? null;
    }
    return null;
  }, [pots]);

  const doWater = useCallback(() => {
    if (!askingPot?.plant_id || waterNeighbor.isPending) return;
    // Gotas caindo na terra, igual à rega de verdade.
    setDropFx({ x: askingPot.pos_x ?? 50, y: askingPot.pos_y ?? 50, nonce: ++nonceRef.current });
    waterNeighbor.mutate(askingPot.plant_id, {
      onSuccess: (data) => {
        setWateredLocal(true);
        showFeedback({ text: `+${data.herboGained} herbo · +1 rep`, good: true, lucky: data.lucky });
      },
      onError: (e) => {
        const code = (e as { code?: string }).code ?? '';
        if (code === 'ALREADY_WATERED') setWateredLocal(true);
        showFeedback({ text: ERROR_TEXT[code] ?? 'não deu pra regar', good: false, lucky: false });
      },
    });
  }, [askingPot, waterNeighbor, showFeedback]);

  /** Arrasto do regador até a planta que pediu água. */
  const handleCanPointerDown = useCallback((e: React.PointerEvent) => {
    if (waterNeighbor.isPending || wateredNow) return;
    e.preventDefault();
    e.stopPropagation();

    // Pointer capture: garante move/up mesmo com o dedo fora do botão (mobile).
    const captureEl = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try { captureEl.setPointerCapture(pointerId); } catch { /* ignora */ }

    setDragPos({ x: e.clientX, y: e.clientY });
    setIsOverTarget(false);
    let active = true;

    const onMove = (ev: PointerEvent) => {
      if (!active) return;
      setDragPos({ x: ev.clientX, y: ev.clientY });
      const pot = findPotAtPoint(ev.clientX, ev.clientY);
      setIsOverTarget(!!pot && !!askingPot && pot.id === askingPot.id);
    };

    const onUp = (ev: PointerEvent) => {
      active = false;
      setDragPos(null);
      setIsOverTarget(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      try { captureEl.releasePointerCapture(pointerId); } catch { /* ignora */ }

      const pot = findPotAtPoint(ev.clientX, ev.clientY);
      if (pot && askingPot && pot.id === askingPot.id) doWater();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [waterNeighbor.isPending, wateredNow, findPotAtPoint, askingPot, doWater]);

  if (isPending) {
    return (
      <div className="garden-bg w-full h-full flex items-center justify-center" style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)' }}>
        <p className="text-sm font-bold animate-pulse" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-caption)' }}>
          Carregando jardim...
        </p>
      </div>
    );
  }

  const showTool = canWater && !!askingPot && !wateredNow;

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

      {/* Pots */}
      {pots.map((pot) => {
        const x = pot.pos_x ?? 50;
        const y = pot.pos_y ?? 50;
        const plantId = pot.plant_id as string | null;
        const isAsking = !!plantId && plantId === askingPlantId;
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
            <HexPot
              pot={pot}
              isSelected={false}
              isWaterTarget={isAsking && isOverTarget}
              // Na visita, a sede do dono não vira balão: só a planta que pede
              // ajuda ao vizinho exibe 💧, pra não confundir o visitante.
              hideStatusBalloons
              onClick={() => {}}
            />

            {/* Balão: só a planta escolhida pede água ao vizinho */}
            {isAsking && canWater && !wateredNow && (
              <div
                className="water-speech-bubble absolute pointer-events-none z-20 flex flex-col items-center"
                style={{ bottom: '48%', left: '50%', transform: 'translateX(-50%)', animation: 'water-bubble 2.2s ease-in-out infinite', filter: 'drop-shadow(0 2px 5px rgba(59,130,246,0.5))' }}
              >
                <div style={{ background: 'rgba(239,246,255,0.97)', border: '1.5px solid rgba(96,165,250,0.75)', borderRadius: 8, padding: '3px 6px', fontSize: 14, lineHeight: 1, userSelect: 'none' }}>💧</div>
                <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid rgba(239,246,255,0.97)', marginTop: -1 }} />
              </div>
            )}

            {/* Rastro: brilho branco por 24h em quem foi regada por um vizinho */}
            {hasTrace && SPARKLES.map((s, i) => (
              <span key={i} className="neighbor-sparkle" style={{ left: s.left, animationDelay: s.delay }} />
            ))}
          </div>
        );
      })}

      {/* Gotas caindo na terra (mesmo efeito da rega de verdade) */}
      {dropFx && (
        <PotFx key={`nwater-${dropFx.nonce}`} type="water" x={dropFx.x} y={dropFx.y} />
      )}

      {/* Regador — arraste até a planta que está pedindo água */}
      {showTool && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1">
          <button
            onPointerDown={handleCanPointerDown}
            aria-label="Arraste o regador até a planta que pede água"
            title="Arraste o regador até a planta que pede água"
            className="rounded-full p-2.5 transition-transform active:scale-95"
            style={{
              background: 'rgba(8,14,5,0.75)',
              border: '1.5px solid rgba(96,165,250,0.55)',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              cursor: 'grab',
              touchAction: 'none',
              opacity: waterNeighbor.isPending ? 0.5 : 1,
            }}
          >
            <Image src="/imgs/watering-can.webp" alt="" width={34} height={34} className="object-contain pointer-events-none" draggable={false} />
          </button>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ fontFamily: 'var(--font-caption)', color: 'var(--color-text-light)', background: 'rgba(8,14,5,0.6)' }}
          >
            arraste até a 💧
          </span>
        </div>
      )}

      {/* Regador fantasma seguindo o dedo/cursor */}
      {dragPos && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{ left: dragPos.x, top: dragPos.y, transform: 'translate(-50%, -50%)', filter: isOverTarget ? 'drop-shadow(0 0 10px rgba(96,165,250,0.95))' : 'none' }}
        >
          <Image src="/imgs/watering-can.webp" alt="" width={isOverTarget ? 54 : 44} height={isOverTarget ? 54 : 44} className="object-contain" draggable={false} />
        </div>
      )}

      {/* Chip de resultado */}
      {feedback && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap pointer-events-none"
          style={{
            top: '12%',
            fontFamily: 'var(--font-display)',
            color: feedback.good ? (feedback.lucky ? '#3a2a08' : '#0f2a0c') : '#fff',
            background: feedback.good
              ? (feedback.lucky ? 'rgba(250,199,117,0.97)' : 'rgba(155,222,120,0.95)')
              : 'rgba(90,20,20,0.9)',
            border: `1.5px solid ${feedback.good ? (feedback.lucky ? 'rgba(133,79,11,0.6)' : 'rgba(28,90,20,0.5)') : 'rgba(160,60,60,0.7)'}`,
            boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
          }}
        >
          {feedback.lucky ? `✨ ${feedback.text}` : feedback.text}
        </div>
      )}

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
