'use client';

/**
 * Efeito ao curtir, ancorado na FOTO de perfil: um coração grande sobe da foto
 * e partículas apaixonadas irradiam 360° ao redor da moldura.
 * `burstId` muda a cada curtida → remonta e reinicia a animação.
 */
const COLORS = ['#f87171', '#fb7185', '#f43f5e', '#fca5a5', '#ec4899'];
const HEART_PATH =
  'M12 21s-7-4.35-9.5-8.5C1 9.2 3 5.5 6.5 5.5c2 0 3.4 1.4 5.5 3.6 2.1-2.2 3.5-3.6 5.5-3.6C21 5.5 23 9.2 21.5 12.5 19 16.65 12 21 12 21z';

// Partículas em círculo (360°) ao redor da moldura.
const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const deg = (i / 12) * 360 - 90;
  const rad = (deg * Math.PI) / 180;
  const dist = 30 + (i % 3) * 10;
  return {
    hx: Math.round(Math.cos(rad) * dist),
    hy: Math.round(Math.sin(rad) * dist),
    hr: (i % 2 ? 1 : -1) * (20 + i * 5),
    size: 8 + (i % 3) * 3,
    delay: (i % 4) * 0.02,
    color: COLORS[i % COLORS.length],
  };
});

export function HeartAura({ burstId }: { burstId: number }) {
  if (!burstId) return null;
  return (
    <div
      key={burstId}
      className="pointer-events-none absolute inset-0"
      style={{ overflow: 'visible', zIndex: 6 }}
      aria-hidden
    >
      {/* Coração grande subindo da foto */}
      <span
        className="heart-rise absolute left-1/2 top-1/2"
        style={{ color: '#f43f5e', width: 30, height: 30, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d={HEART_PATH} /></svg>
      </span>

      {/* Partículas apaixonadas ao redor da moldura */}
      {PARTICLES.map((p, i) => (
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
          <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d={HEART_PATH} /></svg>
        </span>
      ))}
    </div>
  );
}
