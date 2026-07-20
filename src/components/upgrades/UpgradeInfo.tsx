'use client';

import { Check } from 'lucide-react';
import { HerboIcon } from '@/components/HerboIcon';
import type { NodeView } from '@/lib/upgradeTree';

/**
 * Conteúdo de informação de um nó de upgrade (título, ramo, efeito, comprar).
 * Compartilhado entre o popover de hover (desktop) e o bottom sheet (mobile).
 * Nós já comprados mostram o efeito + "Comprado" (para reler quando precisar).
 */
export function UpgradeInfo({
  trackName, node, onBuy, pending, canBuy, owned,
}: {
  trackName: string;
  node: NodeView;
  onBuy: () => void;
  pending: boolean;
  canBuy: boolean;
  owned: boolean;
}) {
  const lv = node.nodeLevel;
  if (!lv) return null;

  return (
    <div className="flex flex-col gap-2" style={{ minWidth: 180 }}>
      <div>
        <p className="text-sm font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
          {lv.label}
        </p>
        <p className="text-[11px]" style={{ color: 'var(--color-text-mid)', fontFamily: 'var(--font-caption)' }}>
          {trackName}
        </p>
      </div>
      <p className="text-xs font-bold" style={{ color: '#1a6ba0', fontFamily: 'var(--font-display)' }}>
        {lv.effectLine}
      </p>

      {owned ? (
        <div
          className="mt-1 w-full rounded-xl py-2 flex items-center justify-center gap-1.5 text-sm font-black"
          style={{ background: 'rgba(42,90,30,0.15)', color: '#2a5a1e', fontFamily: 'var(--font-display)' }}
        >
          <Check className="w-4 h-4" /> Comprado
        </div>
      ) : (
        <button
          onClick={onBuy}
          disabled={!canBuy || pending}
          className="mt-1 w-full rounded-xl py-2 text-sm font-black transition-all active:scale-95 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1"
          style={{
            fontFamily: 'var(--font-display)',
            background: canBuy ? 'linear-gradient(135deg, #2a5a1e, #1e4014)' : 'rgba(92,58,30,0.2)',
            color: canBuy ? '#d9f0c8' : 'var(--color-text-muted)',
            border: `1.5px solid ${canBuy ? 'rgba(74,222,128,0.35)' : 'rgba(92,58,30,0.3)'}`,
            opacity: pending ? 0.6 : 1,
          }}
        >
          {canBuy
            ? <>Comprar · <HerboIcon size={14} /> {lv.cost_herbo}</>
            : <><HerboIcon size={14} /> {lv.cost_herbo} — herbo insuficiente</>}
        </button>
      )}
    </div>
  );
}
