'use client';

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

export function HexButton({
  icon, label, badge, disabled = false, active = false, onClick, onPointerDown, title,
}: HexButtonProps) {
  const [hovered, setHovered] = useState(false);

  const scale = disabled ? 'scale(1)' : active && hovered ? 'scale(1.1)' : active ? 'scale(1.05)' : hovered ? 'scale(1.07)' : 'scale(1)';

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e as unknown as React.MouseEvent);
    }
  }, [disabled, onClick]);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={title ?? label}
      aria-disabled={disabled}
      className="relative select-none"
      style={{
        width: 62, height: 62,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        filter: disabled ? 'grayscale(0.3)' : undefined,
        transform: scale,
        transition: 'transform 0.15s ease',
      }}
      onClick={disabled ? undefined : onClick}
      onPointerDown={disabled ? undefined : onPointerDown}
      onMouseEnter={() => { if (!disabled) setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={handleKeyDown}
      title={title}
    >
      {/* SVG hexágono de madeira — gradientes definidos globalmente em layout.tsx */}
      <svg
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        {/* Sombra de profundidade */}
        <polygon
          points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5"
          fill="rgba(0,0,0,0.5)"
          transform="translate(1.5,2.5)"
        />
        {/* Corpo de madeira */}
        <polygon
          points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5"
          fill="url(#hex-wood)"
        />
        {/* Veio de madeira */}
        <polygon
          points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5"
          fill="url(#hex-grain)"
          opacity="0.8"
        />
        {/* Interior escuro */}
        <polygon
          points="32,7 53,19.5 53,44.5 32,57 11,44.5 11,19.5"
          fill="url(#hex-inner)"
        />
        {/* Borda chanfrada */}
        <polygon
          points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5"
          fill="none"
          stroke="rgba(180,120,60,0.5)"
          strokeWidth="1.5"
        />
        {/* Ornamentos nos vértices — losangos verdes (aceita fill, cross-browser) */}
        <polygon points="32,1 34,4 32,7 30,4"   fill="#4a8a3a" opacity="0.85" />
        <polygon points="55,15 58,17 55,20 52,17" fill="#3a7a2a" opacity="0.8" />
        <polygon points="55,44 58,46 55,49 52,46" fill="#4a8a3a" opacity="0.8" />
        <polygon points="32,57 34,60 32,63 30,60" fill="#3a7a2a" opacity="0.85" />
        <polygon points="9,44 12,46 9,49 6,46"   fill="#4a8a3a" opacity="0.8" />
        <polygon points="9,15 12,17 9,20 6,17"   fill="#3a7a2a" opacity="0.8" />
        {/* Anel tracejado interno */}
        <polygon
          points="32,11 50,21.5 50,42.5 32,53 14,42.5 14,21.5"
          fill="none"
          stroke="rgba(92,58,30,0.4)"
          strokeWidth="0.8"
          strokeDasharray="3,3"
        />
        {/* Anel de "ativo" */}
        {active && (
          <polygon
            points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5"
            fill="none"
            stroke="rgba(201,162,39,0.6)"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Ícone */}
      <div
        className="absolute inset-0 flex items-center justify-center z-[2] text-[22px]"
        style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))' }}
      >
        {icon}
      </div>

      {/* Badge (contagem / cooldown) */}
      {badge !== undefined && (
        <div
          className="absolute top-[-4px] right-[-6px] z-[3] w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
          style={{
            background: 'var(--color-badge-bg, #3a7a2a)',
            color: 'var(--color-badge-text, #d4f0b0)',
            border: '1.5px solid var(--color-garden-deep)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {badge}
        </div>
      )}

      {/* Label */}
      <div
        className="absolute whitespace-nowrap text-[9px]"
        style={{
          bottom: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-display)',
          color: 'var(--color-wood-light)',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </div>
    </div>
  );
}
