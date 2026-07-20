'use client';

import { UpgradeHub } from '@/components/upgrades/UpgradeHub';

/**
 * Melhorias do poço = categoria `well` da árvore de upgrades genérica.
 * Mantido como componente próprio pelo ponto de entrada em /agua.
 */
export function WaterUpgradesModal({ onClose }: { onClose: () => void }) {
  return <UpgradeHub categoryId="well" onClose={onClose} />;
}
