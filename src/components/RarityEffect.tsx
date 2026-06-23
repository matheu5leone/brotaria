'use client';

import { useMemo, useState } from 'react';
import { Rarity } from '@/types';

const PARTICLE_COUNTS: Record<Rarity, number> = {
  comum: 4,
  incomum: 5,
  raro: 5,
  epico: 6,
  lendario: 7,
  brotaria: 6,
};

function buildParticles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360;
    const dist = 30 + (i % 2 === 0 ? 0 : 12);
    const tx = `${Math.round(Math.cos((angle * Math.PI) / 180) * dist)}px`;
    const ty = `${Math.round(Math.sin((angle * Math.PI) / 180) * dist)}px`;
    return {
      '--tx': tx,
      '--ty': ty,
      animationDelay: `${(i * 0.24).toFixed(2)}s`,
      animationDuration: `${(1.1 + (i % 3) * 0.22).toFixed(2)}s`,
    } as React.CSSProperties;
  });
}

export function RarityEffect({
  rarity,
  alwaysVisible = false,
  children,
}: {
  rarity: Rarity;
  alwaysVisible?: boolean;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const active = alwaysVisible || hovered;
  const particles = useMemo(() => buildParticles(PARTICLE_COUNTS[rarity]), [rarity]);

  const glowClass =
    rarity === 'brotaria'
      ? active ? 'rarity-border-brotaria' : ''
      : active ? `rarity-glow-${rarity}` : '';

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Lendario: conic-gradient giratório — sempre atrás (z-index negativo) */}
      {rarity === 'lendario' && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            zIndex: 0,
            opacity: active ? 0.6 : 0,
            transition: 'opacity 0.3s ease',
            background: `conic-gradient(var(--rarity-lendario), transparent 60%, var(--rarity-lendario))`,
            animation: active ? 'lendario-spin 3s linear infinite' : 'none',
          }}
        />
      )}

      {/* Partículas — atrás do PNG (zIndex: 0, antes do children no DOM) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ opacity: active ? 1 : 0, transition: 'opacity 0.3s ease', zIndex: 0 }}
      >
        {particles.map((style, i) => (
          <span
            key={i}
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
            style={{
              ...style,
              backgroundColor: `var(--rarity-${rarity})`,
              animation: active
                ? `particle-float ${style.animationDuration} ${style.animationDelay} ease-out infinite`
                : 'none',
            }}
          />
        ))}
      </div>

      {/* Imagem da planta — na frente das partículas (zIndex: 1) */}
      <div
        className={`w-full h-full transition-all duration-300 ${glowClass}`}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {children}
      </div>
    </div>
  );
}
