'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Package, Sprout, Gift, X, Info } from 'lucide-react';
import { useInventory, useOpenGift, usePatchLabel } from '@/hooks/useInventory';
import { usePlantVersion, usePlant } from '@/hooks/usePlantData';
import { RarityEffect } from '@/components/RarityEffect';
import { InventoryItem, Rarity, PlantDNA } from '@/types';

// ── Tipos de animação ────────────────────────────────────────────────────────

type OpenPhase = 'idle' | 'shaking' | 'exploding' | 'revealing';

// ── Slot: Planta embrulhada ───────────────────────────────────────────────────

function WrappedPlantSlot({
  item,
  onOpen,
  onLabelSave,
}: {
  item: InventoryItem;
  onOpen: () => void;
  onLabelSave: (label: string) => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(item.label ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const escapeRef = useRef(false);

  useEffect(() => {
    setLabelValue(item.label ?? '');
  }, [item.label]);

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLabel(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleLabelSave = () => {
    setEditingLabel(false);
    onLabelSave(labelValue);
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center gap-0.5 w-full h-full bg-rose-950/40 border border-rose-700/40 rounded-xl cursor-pointer hover:bg-rose-900/40 transition-colors group"
      onClick={onOpen}
    >
      <span className="text-2xl select-none">🎁</span>
      <span className="text-rose-300 text-[8px] font-bold">Abrir</span>

      {/* Ícone de info com label */}
      <button
        className="absolute top-0.5 right-0.5 text-rose-400/60 hover:text-rose-300 transition-colors"
        onClick={handleLabelClick}
        title={item.label || 'Sem etiqueta — clique para editar'}
      >
        <Info className="w-3 h-3" />
      </button>

      {/* Editor de label inline */}
      {editingLabel && (
        <div
          className="absolute inset-0 bg-stone-900/95 rounded-xl flex flex-col items-center justify-center p-1 gap-1 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            className="w-full text-[9px] bg-stone-700 text-white rounded px-1 py-0.5 outline-none text-center"
            value={labelValue}
            maxLength={100}
            onChange={(e) => setLabelValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { escapeRef.current = false; handleLabelSave(); }
              if (e.key === 'Escape') {
                escapeRef.current = true;
                setLabelValue(item.label ?? '');
                setEditingLabel(false);
              }
            }}
            onBlur={() => {
              if (!escapeRef.current) handleLabelSave();
              escapeRef.current = false;
            }}
            placeholder="Etiqueta..."
          />
        </div>
      )}
    </div>
  );
}

// ── Slot: Planta revelada ─────────────────────────────────────────────────────

function PlantSlot({ item }: { item: InventoryItem }) {
  const { data: version } = usePlantVersion(item.plant_id);
  const { data: plant } = usePlant(item.plant_id);
  const rarity: Rarity = (plant?.dna?.rarity as Rarity) ?? 'comum';

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full bg-stone-800/40 border border-stone-600/30 rounded-xl overflow-hidden">
      <RarityEffect rarity={rarity} alwaysVisible>
        {version?.image_url ? (
          <div className="relative w-full h-full">
            <Image src={version.image_url} alt="Planta" fill className="object-contain p-1" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-stone-600/40 animate-pulse" />
        )}
      </RarityEffect>
    </div>
  );
}

// ── Slot animado (abertura) ───────────────────────────────────────────────────

function AnimatingSlot({ phase, rarity }: { phase: OpenPhase; rarity: Rarity }) {
  if (phase === 'shaking' || phase === 'exploding') {
    return (
      <div
        className="relative flex items-center justify-center w-full h-full bg-rose-950/40 border border-rose-700/40 rounded-xl overflow-hidden"
        style={{
          animation: phase === 'shaking'
            ? 'gift-shake 0.8s ease-in-out forwards'
            : 'gift-explode 0.6s ease-out forwards',
        }}
      >
        {phase === 'exploding' && (
          <div className="absolute inset-0 rounded-xl" style={{ animation: 'gift-flash 0.3s ease-in-out' }} />
        )}
        <span className="text-2xl">🎁</span>
      </div>
    );
  }
  if (phase === 'revealing') {
    return (
      <div
        className="relative flex items-center justify-center w-full h-full bg-stone-800/40 border rounded-xl overflow-hidden"
        style={{
          borderColor: `var(--rarity-${rarity})`,
          animation: 'gift-reveal 0.6s ease-out forwards',
        }}
      >
        <RarityEffect rarity={rarity} alwaysVisible>
          <div className="relative w-full h-full flex items-center justify-center">
            <span className="text-2xl">🌱</span>
          </div>
        </RarityEffect>
      </div>
    );
  }
  return null;
}

// ── SlotContent principal ─────────────────────────────────────────────────────

function SlotContent({
  item,
  animPhase,
  animRarity,
  onOpenGift,
  onLabelSave,
}: {
  item: InventoryItem | undefined;
  animPhase: OpenPhase;
  animRarity: Rarity;
  onOpenGift: () => void;
  onLabelSave: (label: string) => void;
}) {
  if (animPhase !== 'idle') return <AnimatingSlot phase={animPhase} rarity={animRarity} />;

  if (!item) return <div className="w-full h-full border-2 border-dashed border-stone-600/30 rounded-xl" />;

  if (item.item_type === 'seed') {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full bg-green-900/30 border border-green-700/30 rounded-xl">
        <Sprout className="w-5 h-5 text-green-400" />
        <span className="text-green-300 text-[9px] font-bold">×{item.quantity}</span>
      </div>
    );
  }
  if (item.item_type === 'wrapping_kit') {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full bg-rose-900/30 border border-rose-700/30 rounded-xl">
        <Gift className="w-5 h-5 text-rose-400" />
        <span className="text-rose-300 text-[9px] font-bold">×{item.quantity}</span>
      </div>
    );
  }
  if (item.item_type === 'wrapped_plant') {
    return <WrappedPlantSlot item={item} onOpen={onOpenGift} onLabelSave={onLabelSave} />;
  }
  if (item.item_type === 'plant') {
    return <PlantSlot item={item} />;
  }
  return null;
}

// ── Painel principal ──────────────────────────────────────────────────────────

export function InventoryPanel({
  userId,
  onWrapMode,
}: {
  userId: string | undefined;
  onWrapMode: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [animatingSlot, setAnimatingSlot] = useState<number | null>(null);
  const [animPhase, setAnimPhase] = useState<OpenPhase>('idle');
  const [animRarity, setAnimRarity] = useState<Rarity>('comum');

  const { data: items = [] } = useInventory(userId);
  const openGiftMutation = useOpenGift(userId ?? '');
  const patchLabelMutation = usePatchLabel(userId ?? '');

  const slots = Array.from({ length: 10 }, (_, i) => items.find((it) => it.slot_index === i));
  const hasKits = items.some((i) => i.item_type === 'wrapping_kit');
  const totalItems = items.length;

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const handleOpenGift = async (item: InventoryItem) => {
    if (!confirm('Abrir o presente? A surpresa será revelada!')) return;

    // Chama API imediatamente (DB update rápido)
    let rarity: Rarity = 'comum';
    try {
      const result = await openGiftMutation.mutateAsync({ itemId: item.id });
      const dna = result.dna as PlantDNA | undefined;
      rarity = (dna?.rarity as Rarity) ?? 'comum';
    } catch {
      return; // API falhou, não animar
    }

    // If user prefers reduced motion, skip animation entirely
    if (prefersReducedMotion) {
      setAnimRarity(rarity);
      setAnimatingSlot(item.slot_index);
      setAnimPhase('revealing');
      setTimeout(() => {
        setAnimPhase('idle');
        setAnimatingSlot(null);
      }, 600);
      return;
    }

    setAnimRarity(rarity);
    setAnimatingSlot(item.slot_index);

    // Sequência de animação: shaking → exploding → revealing → idle
    setAnimPhase('shaking');
    setTimeout(() => setAnimPhase('exploding'), 800);
    setTimeout(() => setAnimPhase('revealing'), 1400);
    setTimeout(() => {
      setAnimPhase('idle');
      setAnimatingSlot(null);
    }, 2000);
  };

  const handleLabelSave = (item: InventoryItem, label: string) => {
    patchLabelMutation.mutate({ itemId: item.id, label });
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`absolute bottom-4 left-4 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold shadow-lg transition-all text-sm active:scale-95 ${
          open ? 'bg-stone-600 text-white' : 'bg-stone-800 text-white hover:bg-stone-700'
        }`}
      >
        <Package className="w-4 h-4" />
        <span>Mochila</span>
        {totalItems > 0 && (
          <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {totalItems}
          </span>
        )}
      </button>

      {/* Painel */}
      {open && (
        <div
          className="absolute bottom-16 left-4 z-30 w-72 bg-stone-900/95 backdrop-blur-sm border border-stone-700/50 rounded-2xl p-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-black text-white text-sm">🎒 Mochila</span>
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grade 5×2 */}
          <div className="grid grid-cols-5 gap-2">
            {slots.map((item, i) => (
              <div key={i} className="aspect-square">
                <SlotContent
                  item={item}
                  animPhase={animatingSlot === i ? animPhase : 'idle'}
                  animRarity={animRarity}
                  onOpenGift={() => item && handleOpenGift(item)}
                  onLabelSave={(label) => item && handleLabelSave(item, label)}
                />
              </div>
            ))}
          </div>

          {/* Botão embrulhar */}
          {hasKits && (
            <button
              onClick={() => { setOpen(false); onWrapMode(); }}
              className="mt-3 w-full py-2 bg-rose-700 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-all active:scale-95"
            >
              🎁 Embrulhar planta
            </button>
          )}

          {items.length === 0 && (
            <p className="text-stone-500 text-xs text-center mt-2">Inventário vazio</p>
          )}
        </div>
      )}
    </>
  );
}
