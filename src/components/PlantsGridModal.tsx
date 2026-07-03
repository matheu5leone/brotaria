'use client';

import { X, Leaf, Droplets, Star, Zap, Flame, Sprout } from 'lucide-react';
import { usePlant, usePlantVersion } from '@/hooks/usePlantData';
import { PlantImage } from '@/components/PlantImage';
import { calcPlantScore } from '@/lib/scoring';
import { Rarity } from '@/types';

const RARITY_CONFIG: Record<Rarity, { Icon: React.ElementType; color: string; label: string }> = {
  comum:    { Icon: Leaf,     color: '#8a8f98', label: 'Comum'    },
  incomum:  { Icon: Droplets, color: '#0e7490', label: 'Incomum'  },
  raro:     { Icon: Star,     color: '#2563eb', label: 'Raro'     },
  epico:    { Icon: Zap,      color: '#7e22ce', label: 'Épico'    },
  lendario: { Icon: Flame,    color: '#c2410c', label: 'Lendário' },
  brotaria: { Icon: Sprout,   color: '#15803d', label: 'Brotaria' },
};

/** Célula do grid — busca a própria planta (React Query deduplica/cacheia). */
function PlantCell({ plantId, onClick }: { plantId: string; onClick: () => void }) {
  const { data: plant } = usePlant(plantId);
  const { data: version } = usePlantVersion(plantId);

  if (!plant) {
    return (
      <div
        className="rounded-2xl animate-pulse"
        style={{ aspectRatio: '3/4', background: 'rgba(92,58,30,0.1)' }}
      />
    );
  }

  const rarity = (plant.dna.rarity ?? 'comum') as Rarity;
  const cfg = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.comum;
  const value = calcPlantScore(plant.dna, plant.current_stage.order_index);

  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-2xl p-2 transition-all hover:scale-[1.03] active:scale-95 text-left"
      style={{
        background: 'rgba(92,58,30,0.07)',
        border: '1px solid rgba(92,58,30,0.15)',
      }}
      title={`${plant.current_stage.name} — ${cfg.label}`}
    >
      {/* Imagem */}
      <div
        className="relative w-full rounded-xl overflow-hidden mb-2"
        style={{
          aspectRatio: '1',
          background: 'radial-gradient(ellipse at 40% 30%, rgba(30,50,15,0.5), rgba(8,14,5,0.8))',
          border: '1px solid rgba(92,58,30,0.25)',
        }}
      >
        <PlantImage
          src={version?.image_url}
          alt={plant.current_stage.name}
          className="object-contain p-1.5"
        />
      </div>

      {/* Raridade */}
      <div className="flex items-center gap-1 mb-0.5">
        <cfg.Icon className="w-3 h-3 flex-shrink-0" style={{ color: cfg.color }} />
        <span
          className="text-[9px] font-black uppercase tracking-wider truncate"
          style={{ color: cfg.color, fontFamily: 'var(--font-display)' }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Valor */}
      <span
        className="text-[11px] font-bold"
        style={{ color: 'var(--color-wood-mid)', fontFamily: 'var(--font-display)' }}
      >
        🍃 {value}
      </span>
    </button>
  );
}

/**
 * Modal com o grid de todas as plantas do usuário (imagem, raridade e valor).
 * Clicar numa planta abre o mesmo card story do clique direto no jardim
 * (via onSelectPlant); este modal permanece aberto por baixo.
 */
export function PlantsGridModal({
  open,
  plantIds,
  onSelectPlant,
  onClose,
}: {
  open: boolean;
  plantIds: string[];
  onSelectPlant: (plantId: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center"
      style={{ background: 'rgba(5,8,3,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col mx-4 p-5 rounded-3xl overflow-hidden"
        style={{
          width: 'min(94vw, 560px)',
          maxHeight: '86vh',
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold top accent */}
        <div
          className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2
            className="text-lg font-black"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
          >
            Minhas Plantas
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition-all hover:bg-black/10 active:scale-90"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid */}
        {plantIds.length === 0 ? (
          <p
            className="text-sm text-center py-10"
            style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}
          >
            Você ainda não plantou nada. Use a pá para começar! 🌱
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 overflow-y-auto pr-1">
            {plantIds.map((pid) => (
              <PlantCell key={pid} plantId={pid} onClick={() => onSelectPlant(pid)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
