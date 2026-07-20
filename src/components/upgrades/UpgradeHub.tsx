'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { UPGRADE_TREE, type UpgradeCategoryId } from '@/config/upgrades';
import { UpgradeTree } from '@/components/upgrades/UpgradeTree';
import { UpgradeInfo } from '@/components/upgrades/UpgradeInfo';
import { useWaterUpgrades, useBuyWaterUpgrade } from '@/hooks/useWaterUpgrades';
import { useWallet } from '@/hooks/useWallet';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { HerboIcon } from '@/components/HerboIcon';
import type { NodeView } from '@/lib/upgradeTree';

/**
 * Casca genérica da árvore de upgrades. Hoje só existe a categoria `well`
 * (aberta a partir de /agua); quando `garden` entrar, a barra de abas aparece
 * sozinha (só rendem quando há >1 categoria).
 */
export function UpgradeHub({ categoryId, onClose }: { categoryId: UpgradeCategoryId; onClose: () => void }) {
  const category = UPGRADE_TREE[categoryId];
  const { data } = useWaterUpgrades();
  const { herbo: walletHerbo } = useWallet();
  const buy = useBuyWaterUpgrade();
  const isMobile = !useIsDesktop();

  const herbo = data?.herbo ?? walletHerbo ?? 0;
  const levels: Record<string, number> = {
    water_capacity: data?.capacityLevel ?? 0,
    water_bonus: data?.bonusLevel ?? 0,
  };

  const [justBought, setJustBought] = useState<{ trackId: string; level: number } | null>(null);
  const [infoNode, setInfoNode] = useState<{ trackId: string; node: NodeView } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (!category) return null;

  const doBuy = (trackId: string) => {
    setPendingId(trackId);
    const targetLevel = (levels[trackId] ?? 0) + 1;
    buy.mutate(trackId, {
      onSuccess: () => {
        setJustBought({ trackId, level: targetLevel });
        setTimeout(() => setJustBought(null), 600);
        setInfoNode(null);
      },
      onSettled: () => setPendingId(null),
    });
  };

  const multi = Object.keys(UPGRADE_TREE).length > 1;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,3,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full rounded-3xl p-5 pt-6 flex flex-col items-center gap-4"
        style={{
          maxWidth: isMobile ? 380 : 780,
          maxHeight: '88vh',
          overflowY: 'auto',
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
          Melhorias
        </h2>

        {/* Saldo de herbo */}
        <div
          className="w-full rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #1e4014, #2a5a1e)', border: '1.5px solid rgba(74,222,128,0.35)' }}
        >
          <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)', color: 'rgba(217,240,200,0.75)' }}>
            Seu saldo
          </span>
          <span key={herbo} className="count-pop text-xl font-black inline-flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)', color: '#d9f0c8' }}>
            <HerboIcon size={20} /> {herbo} <span className="text-sm font-bold" style={{ color: 'rgba(217,240,200,0.7)' }}>herbo</span>
          </span>
        </div>

        {/* Abas de categoria — só quando há mais de uma */}
        {multi && (
          <div className="flex gap-2">
            {Object.values(UPGRADE_TREE).map((c) => c && (
              <span
                key={c.id}
                className="px-3 py-1 rounded-full text-xs font-black"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: c.id === categoryId ? 'var(--color-gold)' : 'rgba(92,58,30,0.12)',
                  color: c.id === categoryId ? '#fff' : 'var(--color-text-muted)',
                }}
              >
                {c.name}
              </span>
            ))}
          </div>
        )}

        <UpgradeTree
          category={category}
          levels={levels}
          herbo={herbo}
          isMobile={isMobile}
          onBuy={doBuy}
          pendingId={pendingId}
          onRequestInfo={(trackId, node) => setInfoNode({ trackId, node })}
          justBought={justBought}
        />

        {buy.isError && (
          <p className="text-xs font-bold text-center" style={{ color: '#b91c1c', fontFamily: 'var(--font-display)' }}>
            {(buy.error as Error)?.message ?? 'Não foi possível comprar.'}
          </p>
        )}
      </div>

      {/* Bottom sheet de info (mobile) */}
      {isMobile && infoNode && (
        <div className="fixed inset-0 z-[10001] flex items-end" style={{ background: 'rgba(5,8,3,0.5)' }} onClick={() => setInfoNode(null)}>
          <div
            className="w-full rounded-t-3xl p-5 pt-6"
            style={{ background: 'var(--color-parch-light)', border: '1.5px solid var(--color-wood-light)', boxShadow: '0 -20px 60px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <UpgradeInfo
              trackName={category.tracks.find((t) => t.id === infoNode.trackId)?.name ?? ''}
              node={infoNode.node}
              onBuy={() => doBuy(infoNode.trackId)}
              pending={pendingId === infoNode.trackId}
              canBuy={infoNode.node.affordable}
            />
          </div>
        </div>
      )}
    </div>
  );
}
