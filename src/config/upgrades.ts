// ─────────────────────────────────────────────────────────────────────────────
// Motor de upgrades genérico (dirigido por config, por categoria).
//
// O poço (coleta de água) é apenas UMA categoria. No futuro entra `garden` só
// adicionando um bloco aqui — os componentes (UpgradeHub/Tree/Track/Node) não
// mencionam "água", só consomem esta estrutura.
//
// `upgrade_id` de cada trilha = a chave já gravada em user_upgrades
// (water_capacity, water_bonus). Custo/efeito derivam de WATER_UPGRADES
// (fonte da verdade), então não há duplicação de números.
// ─────────────────────────────────────────────────────────────────────────────
import { WATER_UPGRADES, WATER_BASE_MAX } from '@/config/economy';

export type UpgradeCategoryId = 'well' | 'garden';

export interface UpgradeNodeLevel {
  /** Custo em herbo para atingir este nível. */
  cost_herbo: number;
  /** Efeito bruto deste nível (ex.: { capacity_bonus: 5 } | { bonus_chance: 0.2 }). */
  effect: Record<string, number>;
  /** Rótulo do nó (ex.: "Capacidade I"). */
  label: string;
  /** Linha de efeito antes → depois (ex.: "Teto 5 → 10"). */
  effectLine: string;
}

export interface UpgradeTrack {
  /** = upgrade_id em user_upgrades. */
  id: string;
  name: string;
  description: string;
  /** Asset em /imgs para o ícone do ramo. */
  icon: string;
  levels: UpgradeNodeLevel[];
}

export interface UpgradeCategory {
  id: UpgradeCategoryId;
  name: string;
  rootIcon: string;
  tracks: UpgradeTrack[];
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

const capLevels: UpgradeNodeLevel[] = WATER_UPGRADES.water_capacity.levels.map((lv, i) => {
  const before =
    WATER_BASE_MAX +
    WATER_UPGRADES.water_capacity.levels.slice(0, i).reduce((s, l) => s + (l.capacity_bonus ?? 0), 0);
  const after = before + (lv.capacity_bonus ?? 0);
  return {
    cost_herbo: lv.cost_herbo,
    effect: { capacity_bonus: lv.capacity_bonus ?? 0 },
    label: `Capacidade ${ROMAN[i]}`,
    effectLine: `Teto ${before} → ${after}`,
  };
});

const bonusLevels: UpgradeNodeLevel[] = WATER_UPGRADES.water_bonus.levels.map((lv, i) => {
  const before = i > 0 ? Math.round((WATER_UPGRADES.water_bonus.levels[i - 1].bonus_chance ?? 0) * 100) : 0;
  const after = Math.round((lv.bonus_chance ?? 0) * 100);
  return {
    cost_herbo: lv.cost_herbo,
    effect: { bonus_chance: lv.bonus_chance ?? 0 },
    label: `Coleta Farta ${ROMAN[i]}`,
    effectLine: `Chance +1 água ${before}% → ${after}%`,
  };
});

export const UPGRADE_TREE: Partial<Record<UpgradeCategoryId, UpgradeCategory>> = {
  well: {
    id: 'well',
    name: 'Poço',
    rootIcon: '/imgs/watering-can.webp',
    tracks: [
      {
        id: 'water_capacity',
        name: 'Capacidade',
        description: WATER_UPGRADES.water_capacity.description,
        icon: '/imgs/watering-can.webp',
        levels: capLevels,
      },
      {
        id: 'water_bonus',
        name: 'Coleta Farta',
        description: WATER_UPGRADES.water_bonus.description,
        icon: '/imgs/watering-can.webp',
        levels: bonusLevels,
      },
    ],
  },
};

/** Quantos níveis à frente do comprado ficam revelados (o resto é névoa). */
export const REVEAL_LOOKAHEAD = 1;

export function trackMaxLevel(track: UpgradeTrack): number {
  return track.levels.length;
}
