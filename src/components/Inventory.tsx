'use client';

import React from 'react';
import { useWallet } from '@/hooks/useWallet';
import { ShoppingBasket } from 'lucide-react';

interface InventoryProps {
  isCollapsed?: boolean;
}

/**
 * Exibe a contagem de sementes do usuário. A compra de sementes acontece na Loja
 * (gastando moedas), não mais aqui.
 */
export default function Inventory({ isCollapsed = false }: InventoryProps) {
  const { seedCount } = useWallet();

  if (isCollapsed) {
    return (
      <div
        className="w-full flex items-center justify-center bg-stone-50 border border-stone-200 p-2.5 rounded-xl relative"
        title={`Sementes: ${seedCount}`}
      >
        <ShoppingBasket className="w-5 h-5 text-stone-500" />
        <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border border-white shadow-sm">
          {seedCount}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-white border border-stone-200 px-4 py-2.5 rounded-xl shadow-sm">
      <div className="bg-amber-100 text-amber-600 p-2 rounded-lg">
        <ShoppingBasket className="w-4 h-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight">Sementes</span>
        <span className="text-sm font-bold text-stone-800">{seedCount}</span>
      </div>
    </div>
  );
}
