'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Droplets, Leaf, Star, Flame, Zap, Sprout } from 'lucide-react';
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
}: {
  version: PlantVersionHistoryRow;
  plant: PlantRow;
  isLast: boolean;
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
    <div className="flex gap-4 h-full items-stretch">
      {/* ══ ESQUERDA — maioria das informações ══ */}
      <div className="flex-1 flex flex-col min-w-0">
        <h2
          className="text-lg font-black mb-1 leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
        >
          {version.stage?.name ?? 'Planta'} {level}
        </h2>
        <p
          className="text-xs leading-relaxed mb-3"
          style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}
        >
          {description}
        </p>

        {/* Meta chips — empilhados */}
        <div className="flex flex-col gap-1.5 mb-3">
          {[
            { label: 'Tipo',        value: RARITY_CONFIG[rarity]?.label ?? rarity },
            { label: 'Plantado em', value: formatDate(version.created_at) },
            { label: 'Ambiente',    value: BIOME_LABEL[biome] ?? biome },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
              style={{ background: 'rgba(92,58,30,0.07)', border: '1px solid rgba(92,58,30,0.12)' }}
            >
              <span
                className="text-[8px] font-black uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
              >
                {label}
              </span>
              <span
                className="text-[10px] font-bold truncate ml-2"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-dark)' }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-[8px] font-black uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
            >
              Crescimento
            </span>
            <span
              className="text-[9px] font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-mid)' }}
            >
              Nível {level}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(92,58,30,0.15)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #2a7a2a, #4ade80)' }}
            />
          </div>
          <div className="mt-1 text-right">
            {isLast ? (
              canWater ? (
                <span className="text-[8px] font-bold" style={{ color: '#d97706', fontFamily: 'var(--font-display)' }}>
                  Pode regar agora! 💧
                </span>
              ) : (
                <span className="text-[8px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-caption)' }}>
                  Próximo nível em: {formatNextWater(plant.next_water_needed_at)}
                </span>
              )
            ) : (
              <span className="text-[8px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-caption)' }}>
                Fase concluída ✓
              </span>
            )}
          </div>
        </div>

        {/* Rewards */}
        <div className="flex gap-2 mt-auto">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background: 'rgba(201,162,39,0.14)', color: 'var(--color-wood-dark)', border: '1px solid rgba(201,162,39,0.3)', fontFamily: 'var(--font-display)' }}
          >
            🍃 {calcPlantScore(version.dna_snapshot, version.stage?.order_index ?? 0)}
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background: 'rgba(42,90,30,0.12)', color: '#2a5a1e', border: '1px solid rgba(42,90,30,0.25)', fontFamily: 'var(--font-display)' }}
          >
            💧 +{GAME.XP_PER_EVOLUTION} XP
          </div>
        </div>
      </div>

      {/* Divisória dourada central */}
      <div
        className="w-px flex-shrink-0 self-stretch"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(201,162,39,0.5), transparent)' }}
      />

      {/* ══ DIREITA — foto + algumas infos ══ */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: '42%' }}>
        <div className="mb-2"><RarityBadge rarity={rarity} /></div>
        <div
          className="relative w-full rounded-2xl overflow-hidden"
          style={{
            aspectRatio: '1',
            background: 'radial-gradient(ellipse at 40% 30%, rgba(30,50,15,0.5), rgba(8,14,5,0.8))',
            border: '2px solid rgba(92,58,30,0.3)',
          }}
        >
          {version.image_url ? (
            <RarityEffect rarity={rarity} alwaysVisible>
              <Image
                src={version.image_url}
                alt={version.stage?.name ?? 'Planta'}
                fill
                className="object-contain p-2"
                draggable={false}
              />
            </RarityEffect>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-12 h-12 rounded-full animate-pulse" style={{ background: 'rgba(92,58,30,0.2)' }} />
            </div>
          )}
        </div>
        <div
          className="mt-2 text-center text-[10px] font-bold leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
        >
          {version.stage?.name ?? 'Planta'} {level}
        </div>
      </div>
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────

export function PlantHistoryModal({
  plant,
  open,
  onClose,
}: {
  plant: PlantRow;
  open: boolean;
  onClose: () => void;
  // (onRegar/onRemover removidos — o card é só de visualização/histórico)
  onRegar?: () => void;
  onRemover?: () => void;
  isWaterPending?: boolean;
  isDeletePending?: boolean;
}) {
  const { data: versions = [], isPending } = usePlantHistory(open ? plant.id : null);
  const [activeIndex, setActiveIndex] = useState(0);
  const wheelLock = useRef(0);
  const touchStartX = useRef<number | null>(null);

  if (!open) return null;

  const count = versions.length;
  const active = versions[activeIndex];
  const activeRarity = (active?.dna_snapshot?.rarity ?? plant.dna.rarity ?? 'comum') as Rarity;
  const isLast = activeIndex === count - 1;

  const goLeft  = () => setActiveIndex(i => Math.max(0, i - 1));
  const goRight = () => setActiveIndex(i => Math.min(count - 1, i + 1));

  // Scroll do mouse (desktop) navega entre estágios — throttle p/ não pular vários.
  // Fica no card (overlay acima do jardim), então não colide com o zoom do jardim.
  const handleWheel = (e: React.WheelEvent) => {
    if (count <= 1) return;
    const now = Date.now();
    if (now - wheelLock.current < 250) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 8) return;
    wheelLock.current = now;
    if (d > 0) goRight(); else goLeft();
  };

  // Swipe (toque) navega entre estágios.
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) goRight(); else goLeft(); // arrasta p/ esquerda → próximo
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: 'rgba(5,8,3,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Left arrow */}
      {count > 1 && activeIndex > 0 && (
        <button
          className="absolute left-3 z-10 p-2 rounded-full transition-all active:scale-90"
          style={{ background: 'var(--color-parch-light)', color: 'var(--color-wood-mid)', border: '1.5px solid var(--color-wood-light)' }}
          onClick={(e) => { e.stopPropagation(); goLeft(); }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Right arrow */}
      {count > 1 && activeIndex < count - 1 && (
        <button
          className="absolute right-3 z-10 p-2 rounded-full transition-all active:scale-90"
          style={{ background: 'var(--color-parch-light)', color: 'var(--color-wood-mid)', border: '1.5px solid var(--color-wood-light)' }}
          onClick={(e) => { e.stopPropagation(); goRight(); }}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Card — modal central dividido ao meio (pergaminho) */}
      <div
        className="relative flex flex-col mx-8 p-5 pt-10 rounded-3xl overflow-hidden"
        style={{
          width: 'min(94vw, 600px)',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Gold top accent */}
        <div
          className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        {/* Close button — canto superior direito */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full transition-all active:scale-90 hover:bg-black/10"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        {isPending ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(92,58,30,0.25)' }} />
          </div>
        ) : count === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p
              className="text-sm text-center"
              style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}
            >
              Esta planta ainda não possui registros de evolução.
            </p>
          </div>
        ) : active ? (
          <VersionCard version={active} plant={plant} isLast={isLast} />
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
                  background: i === activeIndex ? RARITY_CONFIG[activeRarity]?.color : 'rgba(92,58,30,0.25)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
