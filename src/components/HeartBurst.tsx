'use client';

/**
 * Explosão de coraçõezinhos apaixonados subindo (ex.: ao curtir).
 * `burstId` muda a cada disparo → remonta e reinicia a animação.
 * Peças determinísticas, viés para CIMA.
 */
const COLORS = ['#f87171', '#fb7185', '#f43f5e', '#fca5a5', '#ec4899'];

const PIECES = Array.from({ length: 10 }, (_, i) => {
  // ângulo enviesado para cima: -140° a -40° (0° = direita, -90° = cima)
  const deg = -140 + (i / 9) * 100;
  const rad = (deg * Math.PI) / 180;
  const dist = 24 + (i % 3) * 14;
  return {
    hx: Math.round(Math.cos(rad) * dist),
    hy: Math.round(Math.sin(rad) * dist) - 6, // extra para cima
    hr: (i % 2 ? 1 : -1) * (15 + i * 7),
    size: 9 + (i % 3) * 3,
    delay: (i % 4) * 0.03,
    color: COLORS[i % COLORS.length],
  };
});

export function HeartBurst({ burstId }: { burstId: number }) {
  if (!burstId) return null;
  return (
    <div
      key={burstId}
      className="pointer-events-none absolute inset-0"
      style={{ overflow: 'visible', zIndex: 5 }}
      aria-hidden
    >
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="heart-fly-piece absolute left-1/2 top-1/2"
          style={{
            ['--hx' as string]: `${p.hx}px`,
            ['--hy' as string]: `${p.hy}px`,
            ['--hr' as string]: `${p.hr}deg`,
            animationDelay: `${p.delay}s`,
            color: p.color,
            width: p.size,
            height: p.size,
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
            <path d="M12 21s-7-4.35-9.5-8.5C1 9.2 3 5.5 6.5 5.5c2 0 3.4 1.4 5.5 3.6 2.1-2.2 3.5-3.6 5.5-3.6C21 5.5 23 9.2 21.5 12.5 19 16.65 12 21 12 21z" />
          </svg>
        </span>
      ))}
    </div>
  );
}
