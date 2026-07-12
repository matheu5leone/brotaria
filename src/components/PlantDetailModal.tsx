'use client';

import { X, Droplets, Trash2 } from 'lucide-react';
import { PlantImage } from '@/components/PlantImage';
import { usePlant, usePlantVersion } from '@/hooks/usePlantData';
import { RarityEffect } from '@/components/RarityEffect';
import { calcPlantScore } from '@/lib/scoring';
import { getLifecycle } from '@/config/lifecycle';
import { WaterCountdown } from '@/components/WaterCountdown';

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
  const lc = getLifecycle(stage.order_index, plant.current_stage_waters, plant.current_target);
  const rarity = plant.dna.rarity as string;
  const biome = plant.dna.biome as string;
  const progressPct = lc.progressPct;
  const canWater = plant.hydration_status === 'waiting_water';
  const herboReward = calcPlantScore(plant.dna, stage.order_index + 1);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[9998] md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-0 z-[9999] flex flex-col overflow-y-auto md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-80"
        style={{
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          borderLeft: '2px solid var(--color-wood-light)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
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
              background: 'rgba(92,58,30,0.12)',
              color: 'var(--color-wood-mid)',
              fontFamily: 'var(--font-display)',
              border: '1px solid rgba(92,58,30,0.2)',
            }}
          >
            {RARITY_LABELS[rarity] ?? rarity}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition-all hover:bg-black/10 active:scale-90"
            style={{ color: 'var(--color-text-muted)' }}
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
            <RarityEffect rarity={plant.dna.rarity} alwaysVisible>
              <PlantImage
                src={version?.image_url}
                alt={stage.name}
                className="object-contain p-3"
              />
            </RarityEffect>
          </div>
        </div>

        {/* Name + level */}
        <div className="text-center px-5 mb-5">
          <h2
            className="text-xl font-black"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
          >
            {lc.name}
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
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
            >
              Progresso de crescimento
            </span>
            <span
              className="text-xs font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-mid)' }}
            >
              {lc.name}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(92,58,30,0.15)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #2a7a2a, #4ade80)',
              }}
            />
          </div>
          <div className="mt-1.5 text-[9px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>
            {lc.isFinal ? 'Crescimento máximo' : `${lc.progressWaters}/${lc.totalWaters} regas neste passo`}
          </div>
          <div className="mt-2 flex justify-center">
            <WaterCountdown
              nextWaterAt={plant.next_water_needed_at}
              periodMs={plant.water_period_ms}
              canWater={canWater}
              isFinal={lc.isFinal}
            />
          </div>
        </div>

        {/* Rewards */}
        <div className="px-5 mb-6">
          <span
            className="block text-[9px] font-black uppercase tracking-widest mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
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
              background: canWater ? 'linear-gradient(135deg, #1a6ba0, #0d4a7a)' : 'rgba(92,58,30,0.1)',
              color: canWater ? '#bfdbfe' : 'var(--color-text-muted)',
              border: `1px solid ${canWater ? 'rgba(59,130,246,0.3)' : 'rgba(92,58,30,0.2)'}`,
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
      style={{ background: 'rgba(92,58,30,0.07)', border: '1px solid rgba(92,58,30,0.12)' }}
    >
      <div
        className="text-[8px] font-black uppercase tracking-widest mb-0.5"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
      >
        {label}
      </div>
      <div
        className="text-xs font-bold capitalize truncate"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-dark)' }}
      >
        {value}
      </div>
    </div>
  );
}
