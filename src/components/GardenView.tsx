'use client';

import { usePots } from '@/hooks/useGardenData';
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

export function GardenView({ userId }: { userId: string }) {
  const { data: pots = [], isPending } = usePots(userId);

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
      style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)' }}
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

      {/* Pots — sem interação */}
      {pots.map((pot) => {
        const x = pot.pos_x ?? 50;
        const y = pot.pos_y ?? 50;
        return (
          <div
            key={pot.id}
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
