import { REVEAL_LOOKAHEAD, trackMaxLevel, type UpgradeTrack, type UpgradeNodeLevel } from '@/config/upgrades';

export type NodeStatus = 'owned' | 'next' | 'fog';

export interface NodeView {
  /** 0-based na trilha. */
  index: number;
  /** 1-based (index + 1). */
  level: number;
  status: NodeStatus;
  affordable: boolean;
  /** null quando 'fog' (não revelado). */
  nodeLevel: UpgradeNodeLevel | null;
}

/**
 * Deriva os nós visíveis de uma trilha dado o nível comprado e o herbo.
 * - 1..ownedLevel: 'owned'
 * - ownedLevel+1 .. ownedLevel+REVEAL_LOOKAHEAD: 'next' (info visível)
 * - além disso: 'fog' (agregado numa tampa; nós individuais não são revelados)
 */
export function trackView(track: UpgradeTrack, ownedLevel: number, herbo: number) {
  const max = trackMaxLevel(track);
  const revealUpTo = ownedLevel + REVEAL_LOOKAHEAD; // último nível revelado
  const nodes: NodeView[] = [];

  for (let lvl = 1; lvl <= max; lvl++) {
    const idx = lvl - 1;
    if (lvl <= ownedLevel) {
      nodes.push({ index: idx, level: lvl, status: 'owned', affordable: false, nodeLevel: track.levels[idx] });
    } else if (lvl <= revealUpTo) {
      const cost = track.levels[idx].cost_herbo;
      nodes.push({ index: idx, level: lvl, status: 'next', affordable: herbo >= cost, nodeLevel: track.levels[idx] });
    } else {
      nodes.push({ index: idx, level: lvl, status: 'fog', affordable: false, nodeLevel: null });
    }
  }

  const complete = ownedLevel >= max;
  const hasFog = nodes.some((n) => n.status === 'fog');
  return { nodes, hasFog, complete };
}
