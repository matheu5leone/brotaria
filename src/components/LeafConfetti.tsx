'use client';

/**
 * Explosão de folhas saindo do centro (ex.: do botão de resgate).
 * `burstId` muda a cada disparo → o elemento remonta e a animação reinicia.
 * Peças determinísticas (sem Math.random em render).
 */

const COLORS = ['#4ade80', '#22c55e', '#16a34a', '#86efac', '#65a30d'];

const PIECES = Array.from({ length: 16 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 16;
  const dist = 46 + (i % 3) * 20;
  return {
    lx: Math.round(Math.cos(angle) * dist),
    ly: Math.round(Math.sin(angle) * dist) + 34 + (i % 4) * 10, // + gravidade
    lr: (i % 2 ? 1 : -1) * (200 + (i % 5) * 55),
    color: COLORS[i % COLORS.length],
    delay: (i % 5) * 0.02,
    size: 9 + (i % 4) * 2,
  };
});

export function LeafConfetti({ burstId }: { burstId: number }) {
  if (!burstId) return null;
  return (
    <div
      key={burstId}
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ overflow: 'visible', zIndex: 5 }}
      aria-hidden
    >
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="leaf-burst-piece absolute"
          style={{
            ['--lx' as string]: `${p.lx}px`,
            ['--ly' as string]: `${p.ly}px`,
            ['--lr' as string]: `${p.lr}deg`,
            animationDelay: `${p.delay}s`,
            color: p.color,
            width: p.size,
            height: p.size,
          }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
            <path d="M10 1 C4 5 3 12 10 19 C17 12 16 5 10 1 Z" />
            <line x1="10" y1="4.5" x2="10" y2="16.5" stroke="rgba(0,0,0,0.22)" strokeWidth="0.9" />
          </svg>
        </span>
      ))}
    </div>
  );
}
