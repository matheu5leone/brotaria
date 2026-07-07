'use client';

import { useState, useCallback } from 'react';

interface HexButtonProps {
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  disabled?: boolean;
  active?: boolean;
  anchor?: boolean;
  className?: string;
  /** Cooldown radial (estilo MOBA): varredura escura + número no centro. */
  cooldown?: { remainingMs: number; totalMs: number; label: string };
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
  icon, label, badge, disabled = false, active = false, anchor = false, className, cooldown, onClick, onPointerDown, title,
}: HexButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Em cooldown: bloqueia interação (sem deixar o ícone cinza — varredura por cima)
  const cooling = !!cooldown && cooldown.remainingMs > 0;
  const blocked = disabled || cooling;

  // Press scale tem prioridade — feedback tátil rápido ao clicar/tocar
  const scale = blocked
    ? 'scale(1)'
    : pressed            ? 'scale(0.88)'
    : active && hovered ? 'scale(1.12)'
    : active             ? 'scale(1.07)'
    : hovered            ? 'scale(1.08)'
    : 'scale(1)';

  const imgFilter = [
    disabled                        ? 'grayscale(0.6) brightness(0.65)' : '',
    active                          ? 'brightness(1.2) saturate(1.3) drop-shadow(0 0 10px rgba(201,162,39,0.7))' : '',
    !blocked && !active && hovered ? 'brightness(1.1)' : '',
  ].filter(Boolean).join(' ') || undefined;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e as unknown as React.MouseEvent);
    }
  }, [disabled, onClick]);

  const cdDeg = cooling ? `${Math.min(360, (cooldown!.remainingMs / cooldown!.totalMs) * 360)}deg` : '0deg';
  const tooltipText = title ?? label;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={tooltipText}
      aria-disabled={disabled}
      className={`hex-button relative select-none${anchor ? ' hex-button--anchor' : ''}${className ? ` ${className}` : ''}`}
      style={{
        cursor: blocked ? (cooling ? 'default' : 'not-allowed') : 'pointer',
        opacity: disabled ? 0.65 : 1,
        transform: scale,
        transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        touchAction: 'none', // permite drag por toque sem o navegador cancelar (scroll)
      }}
      onClick={blocked ? undefined : onClick}
      onPointerDown={blocked ? undefined : (e) => { setPressed(true); onPointerDown?.(e); }}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onMouseEnter={() => { if (!blocked) setHovered(true); }}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onKeyDown={handleKeyDown}
    >
      {/* Imagem do botão — EM FLUXO: define o tamanho da caixa.
          Altura vem do CSS (.painel-btn); largura = auto (proporção da imagem).
          Assim a caixa == hexágono exatamente; badge/tooltip ancoram certo. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/imgs/hex-button.webp"
        alt=""
        draggable={false}
        className="block h-full w-auto select-none"
        style={{ filter: imgFilter, transition: 'filter 0.15s ease' }}
      />

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
          // ícone ampliado só no visual; pointer-events none → o ícone escalado
          // NÃO captura clique (senão a área transbordaria sobre o botão vizinho)
          transform: 'scale(2.275)',
          pointerEvents: 'none',
        }}
      >
        {icon}
      </div>

      {/* Cooldown radial (estilo MOBA) — varredura escura + número central */}
      {cooling && (
        <>
          <div className="painel-cooldown" style={{ ['--cd-deg' as string]: cdDeg }} />
          <span className="painel-cooldown-num">{cooldown!.label}</span>
        </>
      )}

      {/* Badge — ancorada no topo-direita do hexágono flat-top (o canto da caixa
          é a área cortada do hexágono, por isso o recuo lateral) */}
      {badge !== undefined && (
        <div
          className="absolute z-20 min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{
            top: '-6px',
            right: '18%',
            background: 'var(--color-badge-bg, #3a7a2a)',
            color: 'var(--color-badge-text, #d4f0b0)',
            border: '2px solid rgba(8,14,5,0.9)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {badge}
        </div>
      )}

      {/* Tooltip — centralizada sobre o botão, encostada no topo do hexágono */}
      {hovered && tooltipText && (
        <div
          className="absolute left-1/2 z-30 pointer-events-none whitespace-nowrap"
          style={{
            bottom: `calc(100% - 0.6em)`, // encosta no topo do hexágono
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
          {/* seta apontando pra baixo, no centro */}
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
