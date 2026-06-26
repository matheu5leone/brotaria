'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';

interface HexButtonProps {
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  disabled?: boolean;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  title?: string;
}

// Partículas douradas (estilo das plantas) exibidas quando o botão está ativo.
// Distâncias em `em` para escalar junto com o tamanho do botão.
const ACTIVE_PARTICLES = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * 360;
  const r = 1.7 + (i % 2 ? 0.5 : 0); // raio em em
  return {
    '--tx': `${(Math.cos((angle * Math.PI) / 180) * r).toFixed(2)}em`,
    '--ty': `${(Math.sin((angle * Math.PI) / 180) * r).toFixed(2)}em`,
    animationDelay: `${(i * 0.22).toFixed(2)}s`,
    animationDuration: `${(1.2 + (i % 3) * 0.22).toFixed(2)}s`,
  } as React.CSSProperties;
});

export function HexButton({
  icon, label, badge, disabled = false, active = false, onClick, onPointerDown, title,
}: HexButtonProps) {
  const [hovered, setHovered] = useState(false);

  const scale = disabled
    ? 'scale(1)'
    : active && hovered ? 'scale(1.12)'
    : active             ? 'scale(1.07)'
    : hovered            ? 'scale(1.08)'
    : 'scale(1)';

  const imgFilter = [
    disabled                        ? 'grayscale(0.6) brightness(0.65)' : '',
    active                          ? 'brightness(1.2) saturate(1.3) drop-shadow(0 0 10px rgba(201,162,39,0.7))' : '',
    !disabled && !active && hovered ? 'brightness(1.1)' : '',
  ].filter(Boolean).join(' ') || undefined;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e as unknown as React.MouseEvent);
    }
  }, [disabled, onClick]);

  const tooltipText = title ?? label;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={tooltipText}
      aria-disabled={disabled}
      className="hex-button relative select-none"
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1,
        transform: scale,
        transition: 'transform 0.15s ease',
      }}
      onClick={disabled ? undefined : onClick}
      onPointerDown={disabled ? undefined : onPointerDown}
      onMouseEnter={() => { if (!disabled) setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={handleKeyDown}
    >
      {/* Imagem do botão */}
      <div
        className="absolute inset-0"
        style={{ filter: imgFilter, transition: 'filter 0.15s ease' }}
      >
        <Image
          src="/imgs/hex-button.png"
          alt=""
          fill
          className="object-contain"
          draggable={false}
          priority
        />
      </div>

      {/* Partículas douradas quando ativo (igual às plantas) */}
      {active && (
        <div className="pointer-events-none absolute inset-0 z-20">
          {ACTIVE_PARTICLES.map((style, i) => (
            <span
              key={i}
              className="absolute top-1/2 left-1/2 rounded-full"
              style={{
                ...style,
                width: '0.3em',
                height: '0.3em',
                marginLeft: '-0.15em',
                marginTop: '-0.15em',
                backgroundColor: 'var(--color-gold)',
                boxShadow: '0 0 6px var(--color-gold)',
                animation: `particle-float ${style.animationDuration} ${style.animationDelay} ease-out infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Ícone — font-size herdada de .hex-button (escala no desktop) */}
      <div
        className="absolute inset-0 flex items-center justify-center z-10"
        style={{
          paddingBottom: '10%',
          filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))',
        }}
      >
        {icon}
      </div>

      {/* Badge */}
      {badge !== undefined && (
        <div
          className="absolute top-1 right-1 z-20 min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{
            background: 'var(--color-badge-bg, #3a7a2a)',
            color: 'var(--color-badge-text, #d4f0b0)',
            border: '2px solid rgba(8,14,5,0.9)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {badge}
        </div>
      )}

      {/* Tooltip — aparece acima no hover */}
      {hovered && tooltipText && (
        <div
          className="absolute left-1/2 z-30 pointer-events-none whitespace-nowrap"
          style={{
            bottom: `calc(100% + 6px)`,
            transform: 'translateX(-50%)',
            background: 'rgba(8,14,5,0.9)',
            color: 'var(--color-text-light)',
            fontFamily: 'var(--font-display)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            padding: '4px 10px',
            borderRadius: 8,
            border: '1px solid rgba(201,162,39,0.3)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            textTransform: 'uppercase',
          }}
        >
          {tooltipText}
          {/* seta apontando pra baixo */}
          <span
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: -6,
              width: 0, height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '6px solid rgba(8,14,5,0.9)',
            }}
          />
        </div>
      )}
    </div>
  );
}
