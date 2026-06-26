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

export function HexButton({
  icon, label, badge, disabled = false, active = false, onClick, onPointerDown, title,
}: HexButtonProps) {
  const [hovered, setHovered] = useState(false);

  const scale = disabled
    ? 'scale(1)'
    : active && hovered
    ? 'scale(1.12)'
    : active
    ? 'scale(1.07)'
    : hovered
    ? 'scale(1.08)'
    : 'scale(1)';

  const imgFilter = [
    disabled  ? 'grayscale(0.6) brightness(0.65)' : '',
    active    ? 'brightness(1.2) saturate(1.3) drop-shadow(0 0 10px rgba(201,162,39,0.7))' : '',
    !disabled && !active && hovered ? 'brightness(1.1)' : '',
  ].filter(Boolean).join(' ') || undefined;

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
        width: 74,
        height: 74,
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
      title={title}
    >
      {/* Imagem do botão hexagonal de madeira */}
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

      {/* Ícone — leve offset pra cima para alinhar com o interior do hex
          (as folhas da decoração ficam na base e deslocam o centro visual) */}
      <div
        className="absolute inset-0 flex items-center justify-center z-10 text-[24px]"
        style={{
          paddingBottom: '10%',
          filter: 'drop-shadow(0 1px 5px rgba(0,0,0,0.9))',
        }}
      >
        {icon}
      </div>

      {/* Badge (contagem / cooldown) */}
      {badge !== undefined && (
        <div
          className="absolute top-0 right-0 z-20 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[9px] font-bold"
          style={{
            background: 'var(--color-badge-bg, #3a7a2a)',
            color: 'var(--color-badge-text, #d4f0b0)',
            border: '1.5px solid rgba(8,14,5,0.9)',
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
          bottom: '-18px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-display)',
          color: 'var(--color-wood-light)',
          letterSpacing: '0.5px',
          textShadow: '0 1px 4px rgba(0,0,0,0.9)',
        }}
      >
        {label}
      </div>
    </div>
  );
}
