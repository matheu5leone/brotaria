'use client';

import Image from 'next/image';
import { X, Droplets, Trash2 } from 'lucide-react';
import { usePlant, usePlantVersion } from '@/hooks/usePlantData';
import { RarityEffect } from '@/components/RarityEffect';
import { GAME } from '@/config/economy';
import { calcPlantScore } from '@/lib/scoring';

const RARITY_LABELS: Record<string, string> = {
  comum: 'Comum', incomum: 'Incomum', raro: 'Raro',
  epico: 'Épico', lendario: 'Lendário', brotaria: 'Brotaria',
};

const BIOME_LABELS: Record<string, string> = {
  planicie: 'Planície', floresta: 'Floresta', deserto: 'Deserto',
  montanha: 'Montanha', pantano: 'Pântano',
};

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatNextWater(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'agora';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function PlantDetailModal({
  plantId,
  onClose,
  onRegar,
  onRemover,
  isWaterPending,
  isDeletePending,
}: {
  plantId: string;
  onClose: () => void;
  onRegar: () => void;
  onRemover: () => void;
  isWaterPending: boolean;
  isDeletePending: boolean;
}) {
  const { data: plant } = usePlant(plantId);
  const { data: version } = usePlantVersion(plantId);

  if (!plant) return null;

  const stage = plant.current_stage;
  const level = stage.order_index + 1;
  const rarity = plant.dna.rarity as string;
  const biome = plant.dna.biome as string;
  const progressPct = Math.round((plant.current_stage_waters / stage.waters_required) * 100);
  const canWater = plant.hydration_status === 'waiting_water';
  const herboReward = calcPlantScore(plant.dna, stage.order_index + 1);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[9998] md:hidden"
        onClick={onClose}
      />

      {/* Panel — tema grimório escuro (design.md) */}
      <div
        className="fixed inset-0 z-[9999] flex flex-col overflow-y-auto md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-80"
        style={{
          background: 'linear-gradient(160deg, #1c2d10 0%, #0f1a08 60%, #0a1205 100%)',
          borderLeft: '1.5px solid rgba(201,162,39,0.35)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,162,39,0.12)',
        }}
      >
        {/* Gold top accent */}
        <div
          className="absolute top-0 left-6 right-6 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-6 pb-3">
          <span
            className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(0,0,0,0.35)',
              color: `var(--rarity-${rarity}, var(--color-gold))`,
              fontFamily: 'var(--font-display)',
              border: `1px solid color-mix(in srgb, var(--rarity-${rarity}, var(--color-gold)) 40%, transparent)`,
            }}
          >
            {RARITY_LABELS[rarity] ?? rarity}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition-all hover:bg-white/10 active:scale-90"
            style={{ color: 'rgba(232,213,160,0.55)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plant image */}
        <div className="relative mx-auto w-40 h-40 mb-1">
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              background: 'radial-gradient(ellipse, rgba(30,50,20,0.5), rgba(8,14,5,0.8))',
              border: '2px solid rgba(92,58,30,0.3)',
            }}
          >
            {version?.image_url ? (
              <RarityEffect rarity={plant.dna.rarity} alwaysVisible>
                <Image
                  src={version.image_url}
                  alt={stage.name}
                  fill
                  className="object-contain p-3"
                  draggable={false}
                />
              </RarityEffect>
            ) : (
              <div className="w-full h-full animate-pulse" style={{ background: 'rgba(92,58,30,0.1)' }} />
            )}
          </div>
        </div>

        {/* Name + level */}
        <div className="text-center px-5 mb-5">
          <h2
            className="text-xl font-black"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}
          >
            {stage.name} {level}
          </h2>
        </div>

        {/* Meta grid */}
        <div className="px-5 mb-5 grid grid-cols-2 gap-2">
          <MetaChip label="Tipo" value={RARITY_LABELS[rarity] ?? rarity} />
          <MetaChip label="Ambiente" value={BIOME_LABELS[biome] ?? biome} />
          <MetaChip label="Plantado em" value={formatDate(plant.created_at)} />
          <MetaChip label="Personalidade" value={plant.dna.personality} />
          <MetaChip
            label="Satisfação"
            value={
              plant.satisfacao > 0 ? `+${plant.satisfacao} 😊` :
              plant.satisfacao < 0 ? `${plant.satisfacao} 😢` : '0 😐'
            }
          />
        </div>

        {/* Progress section */}
        <div className="px-5 mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-display)', color: 'rgba(232,213,160,0.5)' }}
            >
              Progresso de crescimento
            </span>
            <span
              className="text-xs font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}
            >
              Nível {level}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #2a7a2a, #4ade80)',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span
              className="text-[9px]"
              style={{ color: 'rgba(232,213,160,0.5)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}
            >
              {plant.current_stage_waters}/{stage.waters_required} regas
            </span>
            {canWater ? (
              <span
                className="text-[9px] font-bold"
                style={{ color: '#d97706', fontFamily: 'var(--font-display)' }}
              >
                Pode regar agora! 💧
              </span>
            ) : (
              <span
                className="text-[9px]"
                style={{ color: 'rgba(232,213,160,0.5)', fontFamily: 'var(--font-caption)' }}
              >
                Próxima rega em: {formatNextWater(plant.next_water_needed_at)}
              </span>
            )}
          </div>
        </div>

        {/* Rewards */}
        <div className="px-5 mb-6">
          <span
            className="block text-[9px] font-black uppercase tracking-widest mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'rgba(232,213,160,0.5)' }}
          >
            Recompensas ao evoluir
          </span>
          <div className="flex gap-3">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(201,162,39,0.12)',
                color: 'var(--color-gold)',
                border: '1px solid rgba(201,162,39,0.25)',
                fontFamily: 'var(--font-display)',
              }}
            >
              🍃 {herboReward} herbo
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(59,130,246,0.1)',
                color: '#93c5fd',
                border: '1px solid rgba(59,130,246,0.2)',
                fontFamily: 'var(--font-display)',
              }}
            >
              💧 +{GAME.XP_PER_EVOLUTION} XP
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-10 mt-auto flex gap-3">
          <button
            onClick={onRegar}
            disabled={isWaterPending || !canWater}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
            style={{
              fontFamily: 'var(--font-display)',
              background: canWater ? 'linear-gradient(135deg, #1d4ed8, #1e40af)' : 'rgba(255,255,255,0.05)',
              color: canWater ? '#bfdbfe' : 'rgba(232,213,160,0.35)',
              border: `1px solid ${canWater ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: canWater ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            <Droplets className={`w-4 h-4 ${isWaterPending ? 'animate-spin' : ''}`} />
            Regar
          </button>
          <button
            onClick={onRemover}
            disabled={isDeletePending}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #7a1a1a, #5a0d0d)',
              color: '#fecaca',
              border: '1px solid rgba(239,68,68,0.25)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <Trash2 className={`w-4 h-4 ${isDeletePending ? 'animate-spin' : ''}`} />
            Remover
          </button>
        </div>
      </div>
    </>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-2.5"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div
        className="text-[8px] font-black uppercase tracking-widest mb-0.5"
        style={{ fontFamily: 'var(--font-display)', color: 'rgba(232,213,160,0.5)' }}
      >
        {label}
      </div>
      <div
        className="text-xs font-bold capitalize truncate"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-light)' }}
      >
        {value}
      </div>
    </div>
  );
}
