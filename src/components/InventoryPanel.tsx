'use client';

import { useState } from 'react';
import { Package, Sprout, Gift, X } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { InventoryItem } from '@/types';

function SlotContent({ item }: { item: InventoryItem | undefined }) {
  if (!item) {
    return (
      <div className="w-full h-full border-2 border-dashed border-stone-600/30 rounded-xl" />
    );
  }
  if (item.item_type === 'seed') {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full bg-green-900/30 border border-green-700/30 rounded-xl cursor-default">
        <Sprout className="w-5 h-5 text-green-400" />
        <span className="text-green-300 text-[9px] font-bold">×{item.quantity}</span>
      </div>
    );
  }
  if (item.item_type === 'wrapping_kit') {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full bg-rose-900/30 border border-rose-700/30 rounded-xl cursor-default">
        <Gift className="w-5 h-5 text-rose-400" />
        <span className="text-rose-300 text-[9px] font-bold">×{item.quantity}</span>
      </div>
    );
  }
  // wrapped_plant and plant handled in Plano B
  return (
    <div className="w-full h-full bg-stone-700/30 border border-stone-600/30 rounded-xl" />
  );
}

export function InventoryPanel({
  userId,
  onWrapMode,
}: {
  userId: string | undefined;
  onWrapMode: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: items = [] } = useInventory(userId);

  const slots = Array.from({ length: 10 }, (_, i) =>
    items.find((item) => item.slot_index === i),
  );

  const hasKits = items.some((i) => i.item_type === 'wrapping_kit');
  const totalItems = items.length;

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`absolute bottom-4 left-4 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold shadow-lg transition-all text-sm active:scale-95 ${
          open
            ? 'bg-stone-600 text-white'
            : 'bg-stone-800 text-white hover:bg-stone-700'
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
            <button
              onClick={() => setOpen(false)}
              className="text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grade 5×2 */}
          <div className="grid grid-cols-5 gap-2">
            {slots.map((item, i) => (
              <div key={i} className="aspect-square">
                <SlotContent item={item} />
              </div>
            ))}
          </div>

          {/* Botão embrulhar */}
          {hasKits && (
            <button
              onClick={() => {
                setOpen(false);
                onWrapMode();
              }}
              className="mt-3 w-full py-2 bg-rose-700 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-all active:scale-95"
            >
              🎁 Embrulhar planta
            </button>
          )}

          {items.length === 0 && (
            <p className="text-stone-500 text-xs text-center mt-2">
              Inventário vazio
            </p>
          )}
        </div>
      )}
    </>
  );
}
