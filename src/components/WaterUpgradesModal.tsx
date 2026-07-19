'use client';

import { X, Check } from 'lucide-react';
import { WATER_UPGRADES, WATER_BASE_MAX, nextWaterUpgradeCost, type WaterUpgradeId } from '@/config/economy';
import { useWaterUpgrades, useBuyWaterUpgrade } from '@/hooks/useWaterUpgrades';
import { useWallet } from '@/hooks/useWallet';
import { HerboIcon } from '@/components/HerboIcon';

/** Faixa verde no topo com o saldo de herbo. */
function HerboBanner({ herbo }: { herbo: number }) {
  return (
    <div
      key={herbo}
      className="count-pop w-full rounded-2xl px-4 py-3 flex items-center justify-between"
      style={{
        background: 'linear-gradient(135deg, #1e4014, #2a5a1e)',
        border: '1.5px solid rgba(74,222,128,0.35)',
        boxShadow: 'inset 0 1px 1px rgba(217,240,200,0.25), 0 4px 14px rgba(0,0,0,0.25)',
      }}
    >
      <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)', color: 'rgba(217,240,200,0.75)' }}>
        Seu saldo
      </span>
      <span className="text-xl font-black inline-flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)', color: '#d9f0c8' }}>
        <HerboIcon size={20} /> {herbo} <span className="text-sm font-bold" style={{ color: 'rgba(217,240,200,0.7)' }}>herbo</span>
      </span>
    </div>
  );
}

function UpgradeCard({
  id, currentLevel, herbo, onBuy, pending,
}: {
  id: WaterUpgradeId;
  currentLevel: number;
  herbo: number;
  onBuy: (id: WaterUpgradeId) => void;
  pending: boolean;
}) {
  const def = WATER_UPGRADES[id];
  const isMaxed = currentLevel >= def.maxLevel;
  const nextCost = nextWaterUpgradeCost(id, currentLevel);
  const canAfford = nextCost !== null && herbo >= nextCost;

  // Linha de efeito por upgrade.
  const effectLine =
    id === 'water_capacity'
      ? `Capacidade máxima ${WATER_BASE_MAX} → ${WATER_BASE_MAX + (def.levels[0].capacity_bonus ?? 0)}`
      : (() => {
          const curChance = currentLevel > 0 ? (def.levels[currentLevel - 1].bonus_chance ?? 0) : 0;
          const nextChance = !isMaxed ? (def.levels[currentLevel].bonus_chance ?? 0) : curChance;
          return isMaxed
            ? `Chance de +1 água: ${Math.round(curChance * 100)}%`
            : `Chance de +1 água: ${Math.round(curChance * 100)}% → ${Math.round(nextChance * 100)}%`;
        })();

  return (
    <div
      className="w-full rounded-2xl p-4 flex flex-col gap-2"
      style={{
        background: 'rgba(92,58,30,0.08)',
        border: '1.5px solid var(--color-wood-light)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
          {def.name}
        </h3>
        {def.maxLevel > 1 && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(42,90,30,0.12)', color: '#2a5a1e', fontFamily: 'var(--font-display)' }}>
            Nível {currentLevel}/{def.maxLevel}
          </span>
        )}
      </div>

      <p className="text-xs leading-snug" style={{ color: 'var(--color-text-mid)', fontFamily: 'var(--font-caption)' }}>
        {def.description}
      </p>
      <p className="text-xs font-bold" style={{ color: '#1a6ba0', fontFamily: 'var(--font-display)' }}>
        {effectLine}
      </p>

      {isMaxed ? (
        <div
          className="mt-1 w-full rounded-xl py-2 flex items-center justify-center gap-1.5 text-sm font-black"
          style={{ background: 'rgba(42,90,30,0.15)', color: '#2a5a1e', fontFamily: 'var(--font-display)' }}
        >
          <Check className="w-4 h-4" /> {def.maxLevel > 1 ? 'Nível máximo' : 'Comprado'}
        </div>
      ) : (
        <button
          onClick={() => onBuy(id)}
          disabled={!canAfford || pending}
          className="mt-1 w-full rounded-xl py-2.5 text-sm font-black transition-all active:scale-95 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1"
          style={{
            fontFamily: 'var(--font-display)',
            background: canAfford ? 'linear-gradient(135deg, #2a5a1e, #1e4014)' : 'rgba(92,58,30,0.2)',
            color: canAfford ? '#d9f0c8' : 'var(--color-text-muted)',
            border: `1.5px solid ${canAfford ? 'rgba(74,222,128,0.35)' : 'rgba(92,58,30,0.3)'}`,
            opacity: pending ? 0.6 : 1,
          }}
        >
          {canAfford
            ? <>Comprar{def.maxLevel > 1 ? ` nível ${currentLevel + 1}` : ''} · <HerboIcon size={14} /> {nextCost}</>
            : <><HerboIcon size={14} /> {nextCost} — herbo insuficiente</>}
        </button>
      )}
    </div>
  );
}

export function WaterUpgradesModal({ onClose }: { onClose: () => void }) {
  const { data } = useWaterUpgrades();
  const { herbo: walletHerbo } = useWallet();
  const buy = useBuyWaterUpgrade();

  // A view de upgrades traz o herbo autoritativo pós-compra; carteira é o fallback.
  const herbo = data?.herbo ?? walletHerbo ?? 0;
  const capacityLevel = data?.capacityLevel ?? 0;
  const bonusLevel = data?.bonusLevel ?? 0;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,3,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full rounded-3xl p-5 pt-6 flex flex-col items-center gap-4"
        style={{
          maxWidth: 380,
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 p-1.5 rounded-full transition-all active:scale-90 hover:bg-black/10"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
          Melhorias do Poço
        </h2>

        {/* Faixa de saldo de herbo — bem no topo */}
        <HerboBanner herbo={herbo} />

        {/* Cards de upgrade */}
        <div className="w-full flex flex-col gap-3">
          <UpgradeCard id="water_capacity" currentLevel={capacityLevel} herbo={herbo} onBuy={buy.mutate} pending={buy.isPending} />
          <UpgradeCard id="water_bonus" currentLevel={bonusLevel} herbo={herbo} onBuy={buy.mutate} pending={buy.isPending} />
        </div>

        {buy.isError && (
          <p className="text-xs font-bold text-center" style={{ color: '#b91c1c', fontFamily: 'var(--font-display)' }}>
            {(buy.error as Error)?.message ?? 'Não foi possível comprar.'}
          </p>
        )}
      </div>
    </div>
  );
}
