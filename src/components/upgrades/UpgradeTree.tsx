'use client';

import Image from 'next/image';
import type { UpgradeCategory } from '@/config/upgrades';
import type { NodeView } from '@/lib/upgradeTree';
import { UpgradeTrackLane } from '@/components/upgrades/UpgradeTrack';

/**
 * Árvore de uma categoria: root (poço) no topo + trilhas.
 * Desktop: trilhas lado a lado (leque). Mobile: trilhas empilhadas.
 */
export function UpgradeTree({
  category, levels, herbo, isMobile, onBuy, pendingId, onRequestInfo, justBought,
}: {
  category: UpgradeCategory;
  levels: Record<string, number>;
  herbo: number;
  isMobile: boolean;
  onBuy: (trackId: string) => void;
  pendingId: string | null;
  onRequestInfo: (trackId: string, node: NodeView) => void;
  justBought: { trackId: string; level: number } | null;
}) {
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="upg-grow-in flex flex-col items-center">
        <div className="rounded-full p-2" style={{ background: 'rgba(96,165,250,0.12)', border: '2px solid rgba(96,165,250,0.4)' }}>
          <Image src={category.rootIcon} alt={category.name} width={56} height={56} className="object-contain" />
        </div>
        <span className="text-xs font-black mt-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
          {category.name}
        </span>
      </div>

      <div className={isMobile ? 'flex flex-col gap-5 w-full items-center' : 'flex flex-row gap-8 items-start justify-center'}>
        {category.tracks.map((track) => (
          <UpgradeTrackLane
            key={track.id}
            track={track}
            ownedLevel={levels[track.id] ?? 0}
            herbo={herbo}
            isMobile={isMobile}
            onBuy={onBuy}
            pendingId={pendingId}
            onRequestInfo={onRequestInfo}
            justBoughtLevel={justBought?.trackId === track.id ? justBought.level : null}
          />
        ))}
      </div>
    </div>
  );
}
