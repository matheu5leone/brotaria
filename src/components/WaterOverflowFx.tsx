'use client';

/**
 * Feedback visual ao encher a barra do minigame de água (100%): gotas
 * "transbordando" pelo topo. Em coleta com bônus (+1 água extra do upgrade
 * "Coleta Farta"), o burst vem com o dobro de gotas + um "+1 EXTRA" subindo.
 * Overlay absoluto, sem interação, ancorado no topo da barra (fora do
 * container com overflow:hidden da própria barra).
 */
export type OverflowBurst = { id: number; bonus: boolean };

const NORMAL_COUNT = 6;
const BONUS_COUNT = 12;

function makeDrops(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const spread = (i / (n - 1)) * 2 - 1; // -1 → 1, distribuído pela largura
    return {
      dx: Math.round(spread * 46 + (i % 2 ? 6 : -6)),
      dy: 74 + (i % 3) * 22,
      delay: (i % 6) * 0.05,
      size: 6 + (i % 3),
    };
  });
}

const NORMAL_DROPS = makeDrops(NORMAL_COUNT);
const BONUS_DROPS = makeDrops(BONUS_COUNT);

export function WaterOverflowFx({ bursts, onDone }: { bursts: OverflowBurst[]; onDone: (id: number) => void }) {
  if (bursts.length === 0) return null;
  return (
    <div className="absolute left-0 right-0 top-0 pointer-events-none" style={{ overflow: 'visible', zIndex: 20 }} aria-hidden>
      {bursts.map((b) => {
        const drops = b.bonus ? BONUS_DROPS : NORMAL_DROPS;
        return (
          <div key={b.id} className="absolute left-1/2 top-0" style={{ width: 0, height: 0 }}>
            {drops.map((d, i) => (
              <span
                key={i}
                className="water-overflow-drop absolute"
                style={{
                  left: 0,
                  top: 0,
                  width: d.size,
                  height: d.size + 3,
                  background: 'linear-gradient(180deg, #93c5fd, #2563eb)',
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                  boxShadow: '0 0 4px rgba(59,130,246,0.65)',
                  ['--dx' as string]: `${d.dx}px`,
                  ['--dy' as string]: `${d.dy}px`,
                  animationDelay: `${d.delay}s`,
                }}
                onAnimationEnd={i === drops.length - 1 ? () => onDone(b.id) : undefined}
              />
            ))}
            {b.bonus && (
              <span
                className="water-extra-rise absolute whitespace-nowrap font-black"
                style={{
                  left: 0,
                  top: -4,
                  fontFamily: 'var(--font-display)',
                  fontSize: 15,
                  color: '#fde68a',
                  textShadow: '0 2px 6px rgba(0,0,0,0.6)',
                }}
              >
                +1 EXTRA
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
