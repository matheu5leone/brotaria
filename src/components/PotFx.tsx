'use client';

/**
 * Efeito visual rápido ancorado na TERRA de um canteiro:
 *  - 'plant': partículas de terra saindo do solo (ao plantar a semente).
 *  - 'water': gotas de água caindo na terra (ao regar). Começam ~40px acima da
 *    base e terminam no solo.
 * Posicionado igual aos pots (mesma caixa hex-pot) para acompanhar pan/zoom.
 */
const DIRT_COLORS = ['#6b4423', '#8a5a2b', '#4a2e18', '#5c3a1e'];
const DIRT = Array.from({ length: 9 }, (_, i) => {
  const deg = -165 + (i / 8) * 150; // leque para cima e para os lados
  const rad = (deg * Math.PI) / 180;
  const dist = 12 + (i % 3) * 9;
  return {
    dx: Math.round(Math.cos(rad) * dist),
    dy: Math.round(Math.sin(rad) * dist) - 4,
    size: 3 + (i % 3),
    color: DIRT_COLORS[i % DIRT_COLORS.length],
    delay: (i % 4) * 0.02,
  };
});
const DROPS = Array.from({ length: 4 }, (_, i) => ({
  left: (i - 1.5) * 7,
  delay: i * 0.06,
  start: -40 + (i % 2) * 6, // altura inicial da gota (~40px acima da terra)
}));

export function PotFx({ type, x, y }: { type: 'plant' | 'water'; x: number; y: number }) {
  return (
    <div
      className="absolute hex-pot pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, aspectRatio: '1 / 1.65', transform: 'translate(-50%, -50%)', zIndex: 999998 }}
    >
      {/* Âncora na terra do canteiro (~20% acima da base) */}
      <div className="absolute" style={{ left: '50%', bottom: '20%', width: 0, height: 0 }}>
        {type === 'plant' && DIRT.map((d, i) => (
          <span
            key={i}
            className="dirt-fly-piece absolute rounded-full"
            style={{
              left: 0, top: 0, width: d.size, height: d.size, background: d.color,
              ['--dx' as string]: `${d.dx}px`, ['--dy' as string]: `${d.dy}px`,
              animationDelay: `${d.delay}s`,
            }}
          />
        ))}
        {type === 'water' && DROPS.map((d, i) => (
          <span
            key={i}
            className="water-drop absolute"
            style={{
              left: `${d.left}px`, top: 0, width: 6, height: 9,
              background: 'linear-gradient(180deg, #60a5fa, #2563eb)',
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              boxShadow: '0 0 3px rgba(59,130,246,0.6)',
              ['--drop-start' as string]: `${d.start}px`,
              animationDelay: `${d.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
