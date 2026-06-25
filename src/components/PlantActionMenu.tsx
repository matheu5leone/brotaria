'use client';

import { Droplets, BookOpen, Trash2 } from 'lucide-react';

export function PlantActionMenu({
  potX,
  potY,
  canWater,
  isWaterPending,
  isDeletePending,
  onRegar,
  onHistorico,
  onRemover,
}: {
  potX: number;
  potY: number;
  canWater: boolean;
  isWaterPending: boolean;
  isDeletePending: boolean;
  onRegar: () => void;
  onHistorico: () => void;
  onRemover: () => void;
}) {
  return (
    <div
      className="absolute z-30 pointer-events-auto"
      style={{
        left: `${potX}%`,
        top: `${potY}%`,
        transform: 'translate(-50%, -145%)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-stretch rounded-full shadow-2xl overflow-hidden"
        style={{
          background: 'rgba(8,14,5,0.92)',
          border: '1px solid rgba(201,162,39,0.25)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <ActionBtn
          icon={<Droplets className="w-4 h-4" />}
          label="Regar"
          onClick={onRegar}
          disabled={isWaterPending || !canWater}
          color={canWater ? '#60a5fa' : '#6b7280'}
        />
        <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <ActionBtn
          icon={<BookOpen className="w-4 h-4" />}
          label="Histórico"
          onClick={onHistorico}
          color="rgba(201,162,39,0.9)"
        />
        <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <ActionBtn
          icon={<Trash2 className="w-4 h-4" />}
          label="Remover"
          onClick={onRemover}
          disabled={isDeletePending}
          color="#f87171"
        />
      </div>

      {/* Arrow pointer */}
      <div
        className="mx-auto w-0 h-0"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '7px solid rgba(201,162,39,0.25)',
        }}
      />
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  disabled,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-0.5 px-3 py-2 transition-all active:scale-90 disabled:opacity-35 hover:brightness-110"
      style={{ color }}
    >
      {icon}
      <span
        className="text-[7px] font-black uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {label}
      </span>
    </button>
  );
}
