'use client';

/**
 * Feedback de herbo voando: a cada sub-passo/evolução, um "+N 🍃" sai da planta
 * e voa até o contador de herbo no menu (data-herbo-target), pulsando ao chegar.
 * Overlay fixo, sem interação. As posições/delta são calculadas no Garden.
 */
export type HerboFlight = { id: number; amount: number; x: number; y: number; dx: number; dy: number };

export function HerboFly({ flights, onDone }: { flights: HerboFlight[]; onDone: (id: number) => void }) {
  if (flights.length === 0) return null;
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 10002 }}>
      {flights.map((f) => (
        <span
          key={f.id}
          className="herbo-fly absolute"
          style={{
            left: f.x,
            top: f.y,
            ['--dx' as string]: `${f.dx}px`,
            ['--dy' as string]: `${f.dy}px`,
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 18,
            color: '#4ade80',
            textShadow: '0 2px 6px rgba(0,0,0,0.55)',
            whiteSpace: 'nowrap',
          }}
          onAnimationEnd={() => onDone(f.id)}
        >
          +{f.amount} 🍃
        </span>
      ))}
    </div>
  );
}
