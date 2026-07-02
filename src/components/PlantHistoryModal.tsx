'use client';

import { useState, useRef } from 'react';
import { PlantImage } from '@/components/PlantImage';
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
          <RarityEffect rarity={rarity} alwaysVisible>
            <PlantImage
              src={version.image_url}
              alt={version.stage?.name ?? 'Planta'}
              className="object-contain p-2"
            />
          </RarityEffect>
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
  plantIds = [],
  onSelectPlant,
}: {
  plant: PlantRow;
  open: boolean;
  onClose: () => void;
  /** Lista de plant_ids plantados (para swipe trocar de planta). */
  plantIds?: string[];
  /** Troca a planta selecionada (swipe). */
  onSelectPlant?: (plantId: string) => void;
}) {
  const { data: versions = [], isPending } = usePlantHistory(open ? plant.id : null);
  // null = "estágio mais recente"; muda só quando o usuário toca.
  const [stageIndex, setStageIndex] = useState<number | null>(null);
  const wheelLock = useRef(0);
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);

  // Trocou de planta → volta pro estágio mais recente. Ajuste durante o render
  // (padrão React) em vez de useEffect: evita renderizar o estágio antigo da
  // planta nova por um frame + o re-render em cascata.
  const [prevPlantId, setPrevPlantId] = useState(plant.id);
  if (prevPlantId !== plant.id) {
    setPrevPlantId(plant.id);
    setStageIndex(null);
  }

  if (!open) return null;

  const count = versions.length;
  const idx = stageIndex ?? Math.max(0, count - 1);
  const active = versions[idx];
  const activeRarity = (active?.dna_snapshot?.rarity ?? plant.dna.rarity ?? 'comum') as Rarity;
  const isLast = idx === count - 1;

  // Estágios em loop (toque na lateral / setas / scroll)
  const prevStage = () => { if (count > 1) setStageIndex((idx - 1 + count) % count); };
  const nextStage = () => { if (count > 1) setStageIndex((idx + 1) % count); };

  // Plantas em loop (swipe)
  const changePlant = (dir: 1 | -1) => {
    if (!onSelectPlant || plantIds.length < 2) return;
    const i = plantIds.indexOf(plant.id);
    if (i < 0) return;
    onSelectPlant(plantIds[(i + dir + plantIds.length) % plantIds.length]);
  };

  // Scroll do mouse (desktop) → estágio (throttle). Overlay acima do jardim, sem colidir com o zoom.
  const handleWheel = (e: React.WheelEvent) => {
    if (count <= 1) return;
    const now = Date.now();
    if (now - wheelLock.current < 250) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 8) return;
    wheelLock.current = now;
    if (d > 0) nextStage(); else prevStage();
  };

  // Estilo "story do Instagram": TOQUE na lateral = troca estágio; SWIPE = troca planta.
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const s = touchStart.current;
    touchStart.current = null;
    if (!s) return;
    if ((e.target as HTMLElement).closest('button')) return; // deixa botões (setas/X/dots) agirem
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    const dt = Date.now() - s.t;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      changePlant(dx < 0 ? 1 : -1);          // swipe → troca planta
    } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 350) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (t.clientX - rect.left < rect.width / 2) prevStage(); else nextStage(); // toque → estágio
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: 'rgba(5,8,3,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Setas de estágio (loop) — desktop principalmente */}
      {count > 1 && (
        <button
          className="absolute left-3 z-10 p-2 rounded-full transition-all active:scale-90"
          style={{ background: 'var(--color-parch-light)', color: 'var(--color-wood-mid)', border: '1.5px solid var(--color-wood-light)' }}
          onClick={(e) => { e.stopPropagation(); prevStage(); }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {count > 1 && (
        <button
          className="absolute right-3 z-10 p-2 rounded-full transition-all active:scale-90"
          style={{ background: 'var(--color-parch-light)', color: 'var(--color-wood-mid)', border: '1.5px solid var(--color-wood-light)' }}
          onClick={(e) => { e.stopPropagation(); nextStage(); }}
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

        {/* Barra de progresso dos estágios (estilo story) */}
        {count > 1 && (
          <div className="flex gap-1 mb-3 flex-shrink-0">
            {versions.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(92,58,30,0.18)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: i <= idx ? '100%' : '0%', background: RARITY_CONFIG[activeRarity]?.color }} />
              </div>
            ))}
          </div>
        )}

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

        {/* Dica de navegação */}
        {plantIds.length > 1 && (
          <p className="text-center text-[9px] mt-3 flex-shrink-0" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>
            Toque nas laterais para mudar o estágio · deslize para trocar de planta
          </p>
        )}
      </div>
    </div>
  );
}
