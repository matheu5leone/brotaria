'use client';

import { ReactNode } from 'react';

interface HexButtonProps {
  icon: ReactNode;
  label: string;
  badge?: string | number;
  disabled?: boolean;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

export function HexButton({
  icon, label, badge, disabled = false, active = false, onClick, title,
}: HexButtonProps) {
  return (
    <div
      className="relative select-none transition-all duration-150"
      style={{
        width: 62, height: 62,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        filter: disabled ? 'grayscale(0.3)' : undefined,
        transform: active ? 'scale(1.05)' : undefined,
      }}
      onClick={disabled ? undefined : onClick}
      title={title}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLDivElement).style.transform = active ? 'scale(1.05)' : 'scale(1.07)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = active ? 'scale(1.05)' : 'scale(1)';
      }}
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
        {/* Folhas nos 6 vértices */}
        <text x="32" y="5"    textAnchor="middle" fontSize="8" fill="#4a8a3a" opacity="0.9">🍃</text>
        <text x="56.5" y="20" textAnchor="middle" fontSize="7" fill="#3a7a2a" opacity="0.85" transform="rotate(60,56.5,19)">🍃</text>
        <text x="56.5" y="48" textAnchor="middle" fontSize="7" fill="#4a8a3a" opacity="0.85" transform="rotate(120,56.5,48)">🍃</text>
        <text x="32" y="63"   textAnchor="middle" fontSize="8" fill="#3a7a2a" opacity="0.9"  transform="rotate(180,32,62)">🍃</text>
        <text x="7.5" y="48"  textAnchor="middle" fontSize="7" fill="#4a8a3a" opacity="0.85" transform="rotate(-120,7.5,48)">🍃</text>
        <text x="7.5" y="20"  textAnchor="middle" fontSize="7" fill="#3a7a2a" opacity="0.85" transform="rotate(-60,7.5,19)">🍃</text>
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
            background: '#3a7a2a',
            color: '#d4f0b0',
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
