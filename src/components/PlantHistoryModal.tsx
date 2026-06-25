'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Droplets, Trash2, Leaf, Star, Flame, Zap, Sprout } from 'lucide-react';
import { GAME } from '@/config/economy';
import { calcPlantScore } from '@/lib/scoring';
import { PlantRow, PlantVersionHistoryRow, usePlantHistory } from '@/hooks/usePlantData';
import { RarityEffect } from '@/components/RarityEffect';
import { Rarity } from '@/types';

// ── Raridade — ícones mockados (sem assets externos) ─────────────────────────

const RARITY_CONFIG: Record<Rarity, { Icon: React.ElementType; color: string; label: string }> = {
  comum:    { Icon: Leaf,    color: '#d1d5db', label: 'Comum'   },
  incomum:  { Icon: Droplets, color: '#22d3ee', label: 'Incomum' },
  raro:     { Icon: Star,    color: '#60a5fa', label: 'Raro'    },
  epico:    { Icon: Zap,     color: '#c084fc', label: 'Épico'   },
  lendario: { Icon: Flame,   color: '#fb923c', label: 'Lendário' },
  brotaria: { Icon: Sprout,  color: '#4ade80', label: 'Brotaria' },
};

function RarityBadge({ rarity }: { rarity: Rarity }) {
  const cfg = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.comum;
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{
        background: 'rgba(0,0,0,0.35)',
        border: `1px solid ${cfg.color}44`,
      }}
    >
      <cfg.Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
      <span
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: cfg.color, fontFamily: 'var(--font-display)' }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

// ── Descrição gerada do DNA (mock textual, sem campo no DB) ──────────────────

const BIOME_TEXT: Record<string, string> = {
  planicie:  'climas abertos e secos',
  floresta:  'ambientes úmidos e sombrios',
  deserto:   'climas áridos e quentes',
  montanha:  'altitudes frias e ventos fortes',
  pantano:   'terras alagadas e misteriosas',
};

function generateDescription(version: PlantVersionHistoryRow): string {
  const dna = version.dna_snapshot;
  const stageName = version.stage?.name ?? 'planta';
  const biome = BIOME_TEXT[dna.biome as string] ?? 'ambientes variados';
  return `Um ${stageName.toLowerCase()} de espírito ${dna.personality}. Cresce bem em ${biome}.`;
}

// ── Helper: formatar data ─────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatNextWater(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'agora';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const BIOME_LABEL: Record<string, string> = {
  planicie: 'Planície', floresta: 'Floresta', deserto: 'Deserto',
  montanha: 'Montanha', pantano: 'Pântano',
};

// ── Card interno — uma versão/estágio ────────────────────────────────────────

function VersionCard({
  version,
  plant,
  isLast,
  onRegar,
  onRemover,
  isWaterPending,
  isDeletePending,
}: {
  version: PlantVersionHistoryRow;
  plant: PlantRow;
  isLast: boolean;
  onRegar?: () => void;
  onRemover?: () => void;
  isWaterPending?: boolean;
  isDeletePending?: boolean;
}) {
  const rarity = (version.dna_snapshot?.rarity ?? 'comum') as Rarity;
  const level = (version.stage?.order_index ?? 0) + 1;
  const biome = version.dna_snapshot?.biome as string;
  const description = generateDescription(version);

  // Progress: historical stages = 100%; current stage = live data
  const progressPct = isLast
    ? Math.round((plant.current_stage_waters / plant.current_stage.waters_required) * 100)
    : 100;
  const canWater = isLast && plant.hydration_status === 'waiting_water';

  return (
    <div className="flex flex-col h-full">
      {/* Plant image */}
      <div
        className="relative flex-shrink-0 mx-auto rounded-2xl overflow-hidden"
        style={{
          width: '75%',
          aspectRatio: '1',
          background: 'radial-gradient(ellipse at 40% 30%, rgba(30,50,15,0.8), rgba(5,10,3,0.95))',
          border: '1px solid rgba(92,58,30,0.3)',
        }}
      >
        {version.image_url ? (
          <RarityEffect rarity={rarity} alwaysVisible>
            <Image
              src={version.image_url}
              alt={version.stage?.name ?? 'Planta'}
              fill
              className="object-contain p-3"
              draggable={false}
            />
          </RarityEffect>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 rounded-full animate-pulse" style={{ background: 'rgba(92,58,30,0.3)' }} />
          </div>
        )}
      </div>

      {/* Name + description */}
      <div className="mt-3 px-1 text-center">
        <h2
          className="text-lg font-black mb-1"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}
        >
          {version.stage?.name ?? 'Planta'} {level}
        </h2>
        <p
          className="text-xs leading-relaxed"
          style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'rgba(232,213,160,0.6)' }}
        >
          {description}
        </p>
      </div>

      {/* Meta chips */}
      <div className="mt-3 flex gap-1.5 justify-center px-1">
        {[
          { label: 'Tipo',       value: RARITY_CONFIG[rarity]?.label ?? rarity },
          { label: 'Plantado em', value: formatDate(version.created_at) },
          { label: 'Ambiente',   value: BIOME_LABEL[biome] ?? biome },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex-1 rounded-xl px-1.5 py-1.5 text-center min-w-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div
              className="text-[7px] font-black uppercase tracking-widest mb-0.5 truncate"
              style={{ fontFamily: 'var(--font-display)', color: 'rgba(232,213,160,0.45)' }}
            >
              {label}
            </div>
            <div
              className="text-[9px] font-bold truncate"
              style={{ fontFamily: 'var(--font-body)', color: 'rgba(232,213,160,0.85)' }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="mt-3 px-1">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[8px] font-black uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-display)', color: 'rgba(232,213,160,0.45)' }}
          >
            Progresso de crescimento
          </span>
          <span
            className="text-[9px] font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'rgba(232,213,160,0.7)' }}
          >
            Nível {level}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #2d7a2d, #4ade80)' }}
          />
        </div>
        <div className="mt-1 text-right">
          {isLast ? (
            canWater ? (
              <span className="text-[8px] font-bold" style={{ color: '#fbbf24', fontFamily: 'var(--font-display)' }}>
                Pode regar agora! 💧
              </span>
            ) : (
              <span className="text-[8px]" style={{ color: 'rgba(232,213,160,0.4)', fontFamily: 'var(--font-caption)' }}>
                Próximo nível em: {formatNextWater(plant.next_water_needed_at)}
              </span>
            )
          ) : (
            <span className="text-[8px]" style={{ color: 'rgba(232,213,160,0.4)', fontFamily: 'var(--font-caption)' }}>
              Fase concluída ✓
            </span>
          )}
        </div>
      </div>

      {/* Rewards */}
      <div className="mt-3 px-1">
        <span
          className="block text-[8px] font-black uppercase tracking-widest mb-1.5"
          style={{ fontFamily: 'var(--font-display)', color: 'rgba(232,213,160,0.45)' }}
        >
          Recompensas
        </span>
        <div className="flex gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold"
            style={{ background: 'rgba(201,162,39,0.12)', color: 'var(--color-gold)', border: '1px solid rgba(201,162,39,0.2)', fontFamily: 'var(--font-display)' }}
          >
            🍃 {calcPlantScore(version.dna_snapshot, version.stage?.order_index ?? 0)} herbo
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold"
            style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.15)', fontFamily: 'var(--font-display)' }}
          >
            💧 +{GAME.XP_PER_EVOLUTION} XP
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-auto pt-4 flex gap-2">
        <button
          onClick={onRemover}
          disabled={isDeletePending}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'rgba(127,29,29,0.3)',
            color: '#fca5a5',
            border: '1px solid rgba(239,68,68,0.25)',
          }}
        >
          <Trash2 className={`w-4 h-4 ${isDeletePending ? 'animate-spin' : ''}`} />
          Remover
        </button>
        <button
          onClick={onRegar}
          disabled={isWaterPending || !canWater}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
          style={{
            fontFamily: 'var(--font-display)',
            background: canWater ? 'linear-gradient(135deg, #166534, #15803d)' : 'rgba(255,255,255,0.05)',
            color: canWater ? '#bbf7d0' : 'rgba(232,213,160,0.35)',
            border: `1px solid ${canWater ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <Droplets className={`w-4 h-4 ${isWaterPending ? 'animate-spin' : ''}`} />
          Regar
        </button>
      </div>
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────

export function PlantHistoryModal({
  plant,
  open,
  onClose,
  onRegar,
  onRemover,
  isWaterPending = false,
  isDeletePending = false,
}: {
  plant: PlantRow;
  open: boolean;
  onClose: () => void;
  onRegar?: () => void;
  onRemover?: () => void;
  isWaterPending?: boolean;
  isDeletePending?: boolean;
}) {
  const { data: versions = [], isPending } = usePlantHistory(open ? plant.id : null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!open) return null;

  const count = versions.length;
  const active = versions[activeIndex];
  const activeRarity = (active?.dna_snapshot?.rarity ?? plant.dna.rarity ?? 'comum') as Rarity;
  const isLast = activeIndex === count - 1;

  const goLeft  = () => setActiveIndex(i => Math.max(0, i - 1));
  const goRight = () => setActiveIndex(i => Math.min(count - 1, i + 1));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      {/* Left arrow */}
      {count > 1 && activeIndex > 0 && (
        <button
          className="absolute left-3 z-10 p-2 rounded-full transition-all active:scale-90"
          style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(232,213,160,0.7)', border: '1px solid rgba(201,162,39,0.2)' }}
          onClick={(e) => { e.stopPropagation(); goLeft(); }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Right arrow */}
      {count > 1 && activeIndex < count - 1 && (
        <button
          className="absolute right-3 z-10 p-2 rounded-full transition-all active:scale-90"
          style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(232,213,160,0.7)', border: '1px solid rgba(201,162,39,0.2)' }}
          onClick={(e) => { e.stopPropagation(); goRight(); }}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Card */}
      <div
        className="relative flex flex-col mx-8 p-5 rounded-3xl overflow-hidden"
        style={{
          width: 'min(88vw, 360px)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'linear-gradient(160deg, #1c2d10 0%, #0f1a08 60%, #0a1205 100%)',
          border: '1.5px solid rgba(201,162,39,0.35)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(201,162,39,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold top accent */}
        <div
          className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        {/* Header: rarity badge + close */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <RarityBadge rarity={activeRarity} />
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition-all active:scale-90 hover:bg-white/10"
            style={{ color: 'rgba(232,213,160,0.5)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isPending ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(92,58,30,0.4)' }} />
          </div>
        ) : count === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p
              className="text-sm text-center"
              style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'rgba(232,213,160,0.4)' }}
            >
              Esta planta ainda não possui registros de evolução.
            </p>
          </div>
        ) : active ? (
          <VersionCard
            version={active}
            plant={plant}
            isLast={isLast}
            onRegar={onRegar}
            onRemover={onRemover}
            isWaterPending={isWaterPending}
            isDeletePending={isDeletePending}
          />
        ) : null}

        {/* Pagination dots */}
        {count > 1 && (
          <div className="flex gap-1.5 justify-center mt-4 flex-shrink-0">
            {versions.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === activeIndex ? 16 : 6,
                  height: 6,
                  background: i === activeIndex ? RARITY_CONFIG[activeRarity]?.color : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
