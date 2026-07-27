'use client';

import { useState } from 'react';
import { X, Search, Leaf, Droplets, Star, Zap, Flame, Sprout, Check, Recycle } from 'lucide-react';
import { usePlant, usePlantVersion } from '@/hooks/usePlantData';
import { PlantImage } from '@/components/PlantImage';
import { RarityEffect } from '@/components/RarityEffect';
import { calcPlantScore } from '@/lib/scoring';
import { lifecycleFromOrder } from '@/config/lifecycle';
import { Rarity } from '@/types';
import { HerboIcon } from '@/components/HerboIcon';
import { useAuth } from '@/hooks/useAuth';
import { useRecyclePlants } from '@/hooks/useGardenMutations';
import { RecycleLoader } from '@/components/RecycleLoader';

/** Estado de reciclagem passado a cada célula (a célula conhece a própria raridade). */
type RecycleCellState = {
  active: boolean;
  selected: boolean;
  lockedRarity: Rarity | null;
  onToggle: (plantId: string, rarity: Rarity, isBuried: boolean) => void;
};

const RARITY_CONFIG: Record<Rarity, { Icon: React.ElementType; color: string; label: string }> = {
  comum:    { Icon: Leaf,     color: '#8a8f98', label: 'Comum'    },
  incomum:  { Icon: Droplets, color: '#0e7490', label: 'Incomum'  },
  raro:     { Icon: Star,     color: '#2563eb', label: 'Raro'     },
  epico:    { Icon: Zap,      color: '#7e22ce', label: 'Épico'    },
  lendario: { Icon: Flame,    color: '#c2410c', label: 'Lendário' },
  brotaria: { Icon: Sprout,   color: '#15803d', label: 'Brotaria' },
};

/** Célula do grid — busca a própria planta (React Query deduplica/cacheia). */
function PlantCell({
  plantId,
  onClick,
  onZoom,
  recycle,
}: {
  plantId: string;
  onClick?: () => void;
  onZoom: (url: string, alt: string) => void;
  recycle?: RecycleCellState;
}) {
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
  const stageName = lifecycleFromOrder(plant.current_stage.order_index).name;
  // Enterrada: raridade é surpresa (só revela ao virar broto) — nada de raridade/valor/glow.
  const isBuried = plant.current_stage.order_index <= 1;

  const recycling = recycle?.active ?? false;
  const selected = recycle?.selected ?? false;
  // Bloqueia enterradas (raridade secreta) e as de raridade diferente da travada.
  const blocked = recycling && !selected && (isBuried || (recycle!.lockedRarity != null && rarity !== recycle!.lockedRarity));

  const handleClick = () => {
    if (recycling) {
      if (!blocked) recycle?.onToggle(plantId, rarity, isBuried);
      return;
    }
    onClick?.();
  };

  const clickable = recycling ? !blocked : !!onClick;

  return (
    <div
      onClick={handleClick}
      className={`relative flex flex-col rounded-2xl p-2 text-left transition-all duration-200 ${clickable ? 'cursor-pointer hover:scale-[1.03] active:scale-95' : 'cursor-default'}`}
      style={{
        background: selected ? 'rgba(74,222,128,0.14)' : 'rgba(92,58,30,0.07)',
        border: selected ? '2px solid #4ade80' : '1px solid rgba(92,58,30,0.15)',
        opacity: blocked ? 0.38 : 1,
        filter: blocked ? 'grayscale(0.6)' : undefined,
      }}
      title={isBuried ? stageName : `${stageName} — ${cfg.label}`}
    >
      {/* Selo de selecionado (modo reciclar) */}
      {recycling && selected && (
        <div
          className="absolute -top-2 -right-2 z-20 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: '#2a7a2a', border: '2px solid var(--color-parch-light)' }}
        >
          <Check className="w-3.5 h-3.5" style={{ color: '#fff' }} strokeWidth={3} />
        </div>
      )}

      {/* Imagem + glow de raridade (glow só quando NÃO está enterrada) */}
      <div
        className="relative w-full rounded-xl overflow-hidden mb-2"
        style={{
          aspectRatio: '1',
          background: 'radial-gradient(ellipse at 40% 30%, rgba(30,50,15,0.5), rgba(8,14,5,0.8))',
          border: '1px solid rgba(92,58,30,0.25)',
        }}
      >
        {isBuried ? (
          <PlantImage src={version?.image_url} alt={stageName} className="object-contain p-1.5" />
        ) : (
          <RarityEffect rarity={rarity} alwaysVisible>
            <PlantImage src={version?.image_url} alt={stageName} className="object-contain p-1.5" />
          </RarityEffect>
        )}

        {/* Lupa — abre a imagem grande (só quando há imagem e fora do modo reciclar) */}
        {version?.image_url && !recycling && (
          <button
            onClick={(e) => { e.stopPropagation(); onZoom(version.image_url as string, stageName); }}
            className="absolute top-1 right-1 z-10 p-1.5 rounded-full transition-all hover:scale-110 active:scale-90"
            style={{ background: 'rgba(8,14,5,0.6)', color: '#e8d5a0', backdropFilter: 'blur(2px)' }}
            title="Ver imagem em tamanho grande"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isBuried ? (
        /* Enterrada — sem raridade nem valor */
        <div className="flex items-center gap-1">
          <Sprout className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
          <span
            className="text-[9px] font-black uppercase tracking-wider truncate"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)' }}
          >
            Enterrada
          </span>
        </div>
      ) : (
        <>
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
            <HerboIcon size={11} /> {value}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Modal com o grid de todas as plantas do usuário (imagem, raridade e valor).
 * Clicar numa planta abre o mesmo card story do clique direto no jardim
 * (via onSelectPlant); a lupa abre só a imagem em tamanho grande.
 */
export function PlantsGridModal({
  open,
  plantIds,
  onSelectPlant,
  onClose,
  title = 'Minhas Plantas',
  enableRecycle = false,
}: {
  open: boolean;
  plantIds: string[];
  /** Ao clicar numa planta (abre o card story). Omitido = células só exibem (lupa continua). */
  onSelectPlant?: (plantId: string) => void;
  onClose: () => void;
  title?: string;
  /** Só o dono do jardim: habilita o modo Reciclar. */
  enableRecycle?: boolean;
}) {
  const [zoomed, setZoomed] = useState<{ url: string; alt: string } | null>(null);
  const { user } = useAuth();
  const recycle = useRecyclePlants(user?.id ?? '');

  // Modo reciclar
  const [recycleMode, setRecycleMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [lockedRarity, setLockedRarity] = useState<Rarity | null>(null);
  // Animação/resultado
  const [recycling, setRecycling] = useState<string[] | null>(null);
  const [resultRarity, setResultRarity] = useState<Rarity | null>(null);

  if (!open) return null;

  const exitRecycle = () => { setRecycleMode(false); setSelected([]); setLockedRarity(null); };

  const onToggle = (plantId: string, rarity: Rarity, isBuried: boolean) => {
    if (isBuried) return; // enterrada: raridade secreta, não recicla
    setSelected((prev) => {
      if (prev.includes(plantId)) {
        const next = prev.filter((x) => x !== plantId);
        if (next.length === 0) setLockedRarity(null);
        return next;
      }
      if (prev.length >= 3) return prev;
      if (lockedRarity && rarity !== lockedRarity) return prev;
      if (!lockedRarity) setLockedRarity(rarity);
      return [...prev, plantId];
    });
  };

  const doConfirm = () => {
    if (selected.length !== 3) return;
    const ids = [...selected];
    setRecycling(ids);
    setResultRarity(null);
    recycle.mutate(ids, {
      onSuccess: (data) => setResultRarity(data.seedRarity as Rarity),
      onError: () => { setRecycling(null); },
    });
  };

  const onRecycleDone = () => {
    setRecycling(null);
    setResultRarity(null);
    exitRecycle();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[9990] flex items-center justify-center"
        style={{ background: 'rgba(5,8,3,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          className="relative flex flex-col mx-4 p-5 rounded-3xl overflow-hidden"
          style={{
            width: 'min(96vw, 900px)',
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
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h2
              className="text-lg font-black"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full transition-all hover:bg-black/10 active:scale-90"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de reciclagem (só dono) */}
          {enableRecycle && plantIds.length > 0 && (
            <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
              {recycleMode ? (
                <>
                  <span className="text-[11px] font-bold" style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                    Selecione 3 da mesma raridade ({selected.length}/3)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={exitRecycle}
                      className="px-3 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-mid)', background: 'rgba(92,58,30,0.1)', border: '1px solid rgba(92,58,30,0.25)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={doConfirm}
                      disabled={selected.length !== 3}
                      className="px-3 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95 disabled:cursor-not-allowed inline-flex items-center gap-1"
                      style={{
                        fontFamily: 'var(--font-display)',
                        background: selected.length === 3 ? 'linear-gradient(135deg, #2a5a1e, #1e4014)' : 'rgba(92,58,30,0.15)',
                        color: selected.length === 3 ? '#d9f0c8' : 'var(--color-text-muted)',
                        border: `1px solid ${selected.length === 3 ? 'rgba(74,222,128,0.35)' : 'rgba(92,58,30,0.25)'}`,
                      }}
                    >
                      <Check className="w-3.5 h-3.5" /> Confirmar
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => { setRecycleMode(true); setSelected([]); setLockedRarity(null); }}
                  className="ml-auto px-3 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95 inline-flex items-center gap-1.5"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-dark)', background: 'rgba(201,162,39,0.16)', border: '1px solid rgba(201,162,39,0.4)' }}
                  title="Junte 3 plantas da mesma raridade em 1 semente melhor"
                >
                  <Recycle className="w-3.5 h-3.5" /> Reciclar
                </button>
              )}
            </div>
          )}

          {/* Grid — 3 cols (mobile) → 5 (sm) → 6 (md) → 8 (lg). Breakpoints por LARGURA.
              padding + overflow-x-hidden dão folga ao hover:scale sem gerar
              scrollbar lateral flutuante. */}
          {plantIds.length === 0 ? (
            <p
              className="text-sm text-center py-10"
              style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}
            >
              Nenhuma planta neste jardim ainda. 🌱
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2.5 overflow-y-auto overflow-x-hidden p-1.5">
              {plantIds.map((pid) => (
                <PlantCell
                  key={pid}
                  plantId={pid}
                  onClick={onSelectPlant ? () => onSelectPlant(pid) : undefined}
                  recycle={recycleMode ? {
                    active: true,
                    selected: selected.includes(pid),
                    lockedRarity,
                    onToggle,
                  } : undefined}
                  onZoom={(url, alt) => setZoomed({ url, alt })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Imagem em tamanho grande (só a imagem) */}
      {zoomed && (
        <div
          className="fixed inset-0 z-[9995] flex items-center justify-center p-6"
          style={{ background: 'rgba(3,6,2,0.82)', backdropFilter: 'blur(6px)' }}
          onClick={() => setZoomed(null)}
        >
          <button
            onClick={() => setZoomed(null)}
            className="absolute top-4 right-4 p-2 rounded-full transition-all hover:bg-white/10 active:scale-90"
            style={{ color: '#e8d5a0' }}
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomed.url}
            alt={zoomed.alt}
            draggable={false}
            className="max-w-[92vw] max-h-[88vh] object-contain select-none"
            style={{ filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.6))' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Animação de reciclagem (raios + plantas convergindo → semente) */}
      {recycling && (
        <RecycleLoader plantIds={recycling} seedRarity={resultRarity} onDone={onRecycleDone} />
      )}
    </>
  );
}
