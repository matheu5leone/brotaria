'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import type { NodeView } from '@/lib/upgradeTree';
import { UpgradeInfo } from '@/components/upgrades/UpgradeInfo';

const HEX = 64;

/**
 * Um nó da árvore = apenas o hexágono. Estados:
 *  - owned: preenchido + check.
 *  - next + affordable: glow verde, clicável.
 *  - next + !affordable: filtro escuro; ao tentar comprar → shake.
 *  - fog: não renderiza (a trilha agrega numa tampa "?").
 * Desktop mostra info no hover (popover); mobile pede o sheet via onRequestInfo.
 */
export function UpgradeNode({
  node, trackName, isMobile, onBuy, pending, onRequestInfo, justBought,
}: {
  node: NodeView;
  trackName: string;
  isMobile: boolean;
  onBuy: () => void;
  pending: boolean;
  onRequestInfo: (n: NodeView) => void;
  justBought: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [shake, setShake] = useState(false);

  if (node.status === 'fog' || !node.nodeLevel) return null;

  const owned = node.status === 'owned';
  const next = node.status === 'next';
  const canBuy = next && node.affordable;

  const doShake = () => { setShake(true); setTimeout(() => setShake(false), 400); };

  const handleClick = () => {
    if (owned) return;
    if (isMobile) { onRequestInfo(node); return; }
    if (!canBuy) doShake();
  };

  const handleBuy = () => {
    if (!canBuy) { doShake(); return; }
    onBuy();
  };

  return (
    <div
      className="relative"
      style={{ width: HEX, height: HEX }}
      onMouseEnter={() => !isMobile && setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        onClick={handleClick}
        aria-label={node.nodeLevel.label}
        className={`relative block w-full h-full transition-transform active:scale-95 ${canBuy ? 'upg-glow' : ''} ${shake ? 'upg-shake' : ''} ${justBought ? 'upg-pop' : ''}`}
        style={{ filter: next && !node.affordable ? 'brightness(0.5)' : undefined }}
      >
        <Image src="/imgs/hex-button.webp" alt="" fill className="object-contain" draggable={false} />
        {owned ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Check className="w-6 h-6" style={{ color: '#d9f0c8' }} strokeWidth={3} />
          </span>
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center text-sm font-black"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}
          >
            {node.level}
          </span>
        )}
      </button>

      {!isMobile && hover && !owned && (
        <div
          className="absolute z-50 left-1/2 -translate-x-1/2 mt-1 rounded-2xl p-3"
          style={{
            top: '100%',
            background: 'var(--color-parch-light)',
            border: '1.5px solid var(--color-wood-light)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
          }}
        >
          <UpgradeInfo trackName={trackName} node={node} onBuy={handleBuy} pending={pending} canBuy={canBuy} />
        </div>
      )}
    </div>
  );
}
