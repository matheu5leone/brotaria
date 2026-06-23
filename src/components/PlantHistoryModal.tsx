'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Coins } from 'lucide-react';
import { PlantRow, PlantVersionHistoryRow, usePlantHistory } from '@/hooks/usePlantData';
import { RarityEffect } from '@/components/RarityEffect';
import { Rarity } from '@/types';
import { calcPlantScore } from '@/lib/scoring';

// Transforma delta de posição em transform 3D
function cardStyle(delta: number): React.CSSProperties {
  const abs = Math.abs(delta);
  if (abs > 2) return { display: 'none' };

  const configs = [
    { z: 0,    ry: 0,  scale: 1.0,  opacity: 1.0 },
    { z: -120, ry: 25, scale: 0.85, opacity: 0.7 },
    { z: -200, ry: 40, scale: 0.7,  opacity: 0.4 },
  ];
  const c = configs[abs];
  const rotateY = delta > 0 ? c.ry : -c.ry;

  return {
    transform: `perspective(1000px) translateZ(${c.z}px) rotateY(${rotateY}deg) scale(${c.scale})`,
    opacity: c.opacity,
    transition: 'transform 0.35s ease, opacity 0.35s ease',
    zIndex: 3 - abs,
    flexShrink: 0,
  };
}

function RarityLabel({ rarity }: { rarity: Rarity }) {
  const labels: Record<Rarity, string> = {
    comum: 'Comum',
    incomum: 'Incomum',
    raro: 'Raro',
    epico: 'Épico',
    lendario: 'Lendário',
    brotaria: 'Brotaria',
  };
  return (
    <span
      className="font-black uppercase text-sm tracking-widest"
      style={{ color: `var(--rarity-${rarity})` }}
    >
      {labels[rarity]}
    </span>
  );
}

function HistoryCard({
  version,
  delta,
}: {
  version: PlantVersionHistoryRow;
  delta: number;
}) {
  const rarity = version.dna_snapshot?.rarity ?? 'comum';
  return (
    <div
      className="relative w-48 h-48 bg-stone-900/90 rounded-2xl overflow-hidden"
      style={cardStyle(delta)}
    >
      {version.image_url ? (
        <RarityEffect rarity={rarity as Rarity} alwaysVisible={delta === 0}>
          <div className="relative w-full h-full">
            <Image
              src={version.image_url}
              alt={version.stage?.name ?? 'Fase'}
              fill
              className="plant-outline object-contain p-3"
            />
          </div>
        </RarityEffect>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-stone-700/40 animate-pulse" />
        </div>
      )}
      {/* Chip do estágio na base do card */}
      {version.stage && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
          <span className="text-[10px] font-bold text-white/80 bg-black/50 px-2 py-0.5 rounded-full">
            {version.stage.name}
          </span>
        </div>
      )}
    </div>
  );
}

export function PlantHistoryModal({
  plant,
  open,
  onClose,
}: {
  plant: PlantRow;
  open: boolean;
  onClose: () => void;
}) {
  const { data: versions = [], isPending } = usePlantHistory(open ? plant.id : null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev + (e.deltaY > 0 ? 1 : -1);
        return Math.max(0, Math.min(versions.length - 1, next));
      });
    },
    [versions.length],
  );

  // Resetar ao abrir
  if (!open) return null;

  const active = versions[activeIndex];
  const activeRarity: Rarity = (active?.dna_snapshot?.rarity as Rarity) ?? 'comum';
  const biome = active?.dna_snapshot?.biome ?? plant.dna.biome;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Container — stopPropagation para não fechar ao clicar dentro */}
      <div
        className="relative w-full max-w-2xl flex flex-col items-center gap-6 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-0 right-4 text-white/70 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="w-6 h-6" />
        </button>

        {/* ── Cards (coverflow 3D) ── */}
        <div
          className="relative flex items-center justify-center w-full h-56"
          style={{ perspective: '1000px' }}
          onWheel={handleWheel}
        >
          {isPending ? (
            <div className="text-white/50 text-sm">Carregando histórico...</div>
          ) : versions.length === 0 ? (
            <div className="text-white/50 text-sm">Esta planta ainda não evoluiu.</div>
          ) : (
            <div className="relative flex items-center justify-center w-full h-full">
              {versions.map((version, i) => (
                <div
                  key={version.id}
                  className="absolute"
                  style={cardStyle(i - activeIndex)}
                >
                  <HistoryCard version={version} delta={i - activeIndex} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indicadores de paginação */}
        {versions.length > 1 && (
          <div className="flex gap-1.5">
            {versions.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === activeIndex ? 'scale-125' : 'opacity-40'
                }`}
                style={{ backgroundColor: i === activeIndex ? `var(--rarity-${activeRarity})` : 'white' }}
              />
            ))}
          </div>
        )}

        {/* ── Infos da versão em foco ── */}
        {active && (
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-2">
              {/* Bolinha da raridade */}
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: `var(--rarity-${activeRarity})` }}
              />
              <span className="text-white font-bold text-base">
                {active.stage?.name ?? '—'}
              </span>
              <RarityLabel rarity={activeRarity} />
            </div>
            <p className="text-white/50 text-xs">
              {format(new Date(active.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} · {biome}
            </p>
            {active.dna_snapshot && active.stage && (
              <div className="flex items-center gap-1.5 text-amber-400 font-black text-sm mt-1">
                <Coins className="w-3.5 h-3.5" />
                {calcPlantScore(active.dna_snapshot, active.stage.order_index).toLocaleString('pt-BR')} moedas
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
