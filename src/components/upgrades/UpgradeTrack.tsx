'use client';

import Image from 'next/image';
import { Crown } from 'lucide-react';
import type { UpgradeTrack } from '@/config/upgrades';
import { trackView, type NodeView } from '@/lib/upgradeTree';
import { UpgradeNode } from '@/components/upgrades/UpgradeNode';

/**
 * Uma trilha (ramo) = cabeçalho + coluna vertical de nós ligados por conectores
 * de água, com uma "tampa ?" quando há níveis em névoa. O layout em leque do
 * desktop é composição do UpgradeTree posicionando várias lanes; a lane em si é
 * sempre uma coluna vertical.
 */
export function UpgradeTrackLane({
  track, ownedLevel, herbo, isMobile, onBuy, pendingId, onRequestInfo, justBoughtLevel,
}: {
  track: UpgradeTrack;
  ownedLevel: number;
  herbo: number;
  isMobile: boolean;
  onBuy: (trackId: string) => void;
  pendingId: string | null;
  onRequestInfo: (trackId: string, node: NodeView) => void;
  justBoughtLevel: number | null;
}) {
  const { nodes, hasFog, complete } = trackView(track, ownedLevel, herbo);
  const visible = nodes.filter((n) => n.status !== 'fog');

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5 mb-1">
        <Image src={track.icon} alt="" width={18} height={18} className="object-contain" />
        <span className="text-xs font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
          {track.name}
        </span>
        <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>
          {ownedLevel}/{track.levels.length}
        </span>
        {complete && <Crown className="w-4 h-4" style={{ color: 'var(--color-gold)' }} />}
      </div>

      {visible.map((node, i) => {
        const connectorFilled = node.level - 1 <= ownedLevel;
        return (
          <div key={node.level} className="flex flex-col items-center">
            {i > 0 && (
              <div className="upg-connector" style={{ width: 6, height: 18 }}>
                <div
                  className={`upg-connector-fill ${connectorFilled ? 'filled' : ''}`}
                  style={{ transform: connectorFilled ? 'scaleY(1)' : 'scaleY(0)' }}
                />
              </div>
            )}
            <UpgradeNode
              node={node}
              trackName={track.name}
              isMobile={isMobile}
              onBuy={() => onBuy(track.id)}
              pending={pendingId === track.id}
              onRequestInfo={(n) => onRequestInfo(track.id, n)}
              justBought={justBoughtLevel === node.level}
            />
          </div>
        );
      })}

      {hasFog && (
        <div className="flex flex-col items-center">
          <div className="upg-connector" style={{ width: 6, height: 18 }} />
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 44, height: 44,
              background: 'rgba(92,58,30,0.12)',
              border: '1.5px dashed rgba(92,58,30,0.3)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-display)', fontWeight: 900,
            }}
          >
            ?
          </div>
        </div>
      )}
    </div>
  );
}
