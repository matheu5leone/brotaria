'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Sprout, Gift, X, Info, PackageOpen, SendHorizonal } from 'lucide-react';
import { useInventory, useOpenGift, usePatchLabel } from '@/hooks/useInventory';
import { useUnwrap } from '@/hooks/useGifts';
import { GiftSendModal } from '@/components/GiftSendModal';
import { usePlantVersion, usePlant } from '@/hooks/usePlantData';
import { RarityEffect } from '@/components/RarityEffect';
import { InventoryItem, Rarity, PlantDNA } from '@/types';

// ── Tipos de animação ────────────────────────────────────────────────────────

type OpenPhase = 'idle' | 'shaking' | 'exploding' | 'revealing';

// ── Slot: Planta embrulhada ───────────────────────────────────────────────────

function WrappedPlantSlot({
  item,
  userId,
  onOpen,
  onLabelSave,
}: {
  item: InventoryItem;
  userId: string;
  onOpen: () => void;
  onLabelSave: (label: string) => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(item.label ?? '');
  const [showActions, setShowActions] = useState(false);
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const escapeRef = useRef(false);
  const unwrapMutation = useUnwrap(userId);

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

  if (giftModalOpen) {
    return <GiftSendModal userId={userId} itemId={item.id} onClose={() => setGiftModalOpen(false)} />;
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center gap-0.5 w-full h-full bg-rose-200/50 border border-rose-400/50 rounded-xl transition-colors group"
      onClick={() => setShowActions(v => !v)}
    >
      <span className="text-2xl select-none">🎁</span>
      <span className="text-rose-700 text-[8px] font-bold">{showActions ? 'Fechar' : 'Opções'}</span>

      {/* Action overlay */}
      {showActions && (
        <div
          className="absolute inset-0 rounded-xl flex flex-col gap-1 p-1.5 z-10"
          style={{ background: 'rgba(10,5,5,0.92)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setShowActions(false); onOpen(); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-bold transition-all hover:bg-rose-900/60 active:scale-95"
            style={{ color: '#fca5a5' }}
          >
            <Gift className="w-3 h-3" /> Abrir
          </button>
          <button
            onClick={() => { setShowActions(false); unwrapMutation.mutate({ itemId: item.id }); }}
            disabled={unwrapMutation.isPending}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-bold transition-all hover:bg-amber-900/60 active:scale-95 disabled:opacity-40"
            style={{ color: '#fde68a' }}
          >
            <PackageOpen className="w-3 h-3" /> Desfazer
          </button>
          <button
            onClick={() => { setShowActions(false); setGiftModalOpen(true); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-bold transition-all hover:bg-green-900/60 active:scale-95"
            style={{ color: '#86efac' }}
          >
            <SendHorizonal className="w-3 h-3" /> Presentear
          </button>
        </div>
      )}

      {/* Ícone de info com label */}
      <button
        className="absolute top-0.5 right-0.5 text-rose-600/70 hover:text-rose-700 transition-colors"
        onClick={handleLabelClick}
        title={item.label || 'Sem etiqueta — clique para editar'}
      >
        <Info className="w-3 h-3" />
      </button>

      {/* Editor de label inline */}
      {editingLabel && (
        <div
          className="absolute inset-0 rounded-xl flex flex-col items-center justify-center p-1 gap-1 z-10"
          style={{ background: 'var(--color-parch-light)', border: '1px solid var(--color-wood-light)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            className="w-full text-[9px] rounded px-1 py-0.5 outline-none text-center"
            style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(139,99,70,0.35)', color: 'var(--color-text-dark)' }}
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
    <div
      className="relative flex flex-col items-center justify-center w-full h-full rounded-xl overflow-hidden"
      style={{ background: 'rgba(92,58,30,0.08)', border: '1px solid rgba(92,58,30,0.22)' }}
    >
      <RarityEffect rarity={rarity} alwaysVisible>
        {version?.image_url ? (
          <div className="relative w-full h-full">
            <Image src={version.image_url} alt="Planta" fill className="object-contain p-1" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full animate-pulse" style={{ background: 'rgba(92,58,30,0.25)' }} />
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
        className="relative flex items-center justify-center w-full h-full bg-rose-200/50 border border-rose-400/50 rounded-xl overflow-hidden"
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
        className="relative flex items-center justify-center w-full h-full border rounded-xl overflow-hidden"
        style={{
          background: 'rgba(92,58,30,0.08)',
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
  userId,
  animPhase,
  animRarity,
  onOpenGift,
  onLabelSave,
}: {
  item: InventoryItem | undefined;
  userId: string;
  animPhase: OpenPhase;
  animRarity: Rarity;
  onOpenGift: () => void;
  onLabelSave: (label: string) => void;
}) {
  if (animPhase !== 'idle') return <AnimatingSlot phase={animPhase} rarity={animRarity} />;

  if (!item) return <div className="w-full h-full border-2 border-dashed rounded-xl" style={{ borderColor: 'rgba(92,58,30,0.3)' }} />;

  if (item.item_type === 'seed') {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full bg-green-200/50 border border-green-600/40 rounded-xl">
        <Sprout className="w-5 h-5 text-green-700" />
        <span className="text-green-800 text-[9px] font-bold">×{item.quantity}</span>
      </div>
    );
  }
  if (item.item_type === 'wrapping_kit') {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full bg-rose-200/50 border border-rose-400/50 rounded-xl">
        <Gift className="w-5 h-5 text-rose-600" />
        <span className="text-rose-700 text-[9px] font-bold">×{item.quantity}</span>
      </div>
    );
  }
  if (item.item_type === 'wrapped_plant') {
    return <WrappedPlantSlot item={item} userId={userId} onOpen={onOpenGift} onLabelSave={onLabelSave} />;
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
  open,
  onClose,
}: {
  userId: string | undefined;
  onWrapMode: () => void;
  open: boolean;
  onClose: () => void;
}) {
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

  if (!open) return null;

  return (
    // Modal centralizado (desatrelado do botão da mochila) — tema pergaminho (login)
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,3,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => onClose()}
    >
      <div
        className="relative p-5"
        style={{
          width: 'min(92vw, 420px)',
          maxHeight: '88vh',
          overflowY: 'auto',
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
          borderRadius: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Acento dourado no topo */}
        <div
          className="absolute top-0 left-6 right-6 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        <div className="flex items-center justify-between mb-4">
          <span
            className="font-black text-base"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)', letterSpacing: '0.02em' }}
          >
            🎒 Mochila
          </span>
          <button
            onClick={() => onClose()}
            className="p-1.5 rounded-full transition-all active:scale-90 hover:bg-black/10"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grade 5×2 */}
        <div className="grid grid-cols-5 gap-2">
          {slots.map((item, i) => (
            <div key={i} className="aspect-square">
              <SlotContent
                item={item}
                userId={userId ?? ''}
                animPhase={animatingSlot === i ? animPhase : 'idle'}
                animRarity={animRarity}
                onOpenGift={() => item && handleOpenGift(item)}
                onLabelSave={(label) => item && handleLabelSave(item, label)}
              />
            </div>
          ))}
        </div>

        {/* Botão embrulhar — primário verde (padrão login) */}
        {hasKits && (
          <button
            onClick={() => { onClose(); onWrapMode(); }}
            className="mt-4 w-full py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
              color: 'var(--color-parch-light)',
              border: '1px solid rgba(201,162,39,0.3)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            🎁 Embrulhar planta
          </button>
        )}

        {items.length === 0 && (
          <p className="text-center text-xs mt-3" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>
            Inventário vazio
          </p>
        )}
      </div>
    </div>
  );
}
