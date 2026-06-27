'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { COIN_PACKAGES, PRICES } from '@/config/economy';
const SEED_COST_COINS = PRICES.SEED;
import { X, Loader2, Sprout, Sparkles } from 'lucide-react';
import { CoinIcon } from '@/components/CoinIcon';
import { authFetch } from '@/lib/authFetch';

interface CoinPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Se presente, ao comprar a semente ela é plantada neste vaso e o modal fecha.
   * Se ausente (aberto pela Loja), comprar a semente só a adiciona ao inventário.
   */
  potId?: string;
  /** Chamado após uma ação concluída com sucesso (plantar / comprar semente). */
  onComplete?: () => void;
}

export default function CoinPurchaseModal({
  open,
  onClose,
  potId,
  onComplete,
}: CoinPurchaseModalProps) {
  const { user } = useAuth();
  const { coins, setCoins, refresh } = useWallet();
  const queryClient = useQueryClient();
  const [busyPackage, setBusyPackage] = useState<string | null>(null);
  const [buyingSeed, setBuyingSeed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const canBuySeed = coins >= SEED_COST_COINS;

  const handleBuyPackage = async (packageId: string) => {
    if (!user || busyPackage) return;
    setBusyPackage(packageId);
    setError(null);
    try {
      // Cria a sessão de checkout no servidor e redireciona para a página do Stripe.
      // As moedas são creditadas pelo webhook após o pagamento confirmado.
      const res = await authFetch('/api/coins/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // → página de pagamento do Stripe
      } else {
        setError(data.error || 'Falha ao iniciar pagamento');
        setBusyPackage(null);
      }
    } catch {
      setError('Falha ao iniciar pagamento');
      setBusyPackage(null);
    }
  };

  const handleBuySeed = async () => {
    if (!user || buyingSeed || !canBuySeed) return;
    setBuyingSeed(true);
    setError(null);
    try {
      // 1) Compra a semente com moedas.
      const buyRes = await authFetch('/api/store/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'seed' }),
      });
      const buyData = await buyRes.json();
      if (!buyData.success) {
        setError(buyData.error || 'Falha ao comprar semente');
        return;
      }
      setCoins(buyData.coins);

      // 2) Se veio de um vaso, planta nele imediatamente.
      if (potId) {
        const plantRes = await authFetch('/api/plants/plant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ potId }),
        });
        const plantData = await plantRes.json();
        if (!plantData.success) {
          setError(plantData.error || 'Falha ao plantar');
          return;
        }
      }

      // Atualiza saldo + contagem de sementes em toda a app.
      await refresh();
      queryClient.invalidateQueries({ queryKey: ['inventory', user?.id] });
      onComplete?.();
      onClose();
    } catch {
      setError('Falha ao comprar semente');
    } finally {
      setBuyingSeed(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,3,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
          borderRadius: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Acento dourado no topo */}
        <div
          className="absolute top-0 left-6 right-6 h-px pointer-events-none z-10"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        {/* Header */}
        <div className="relative p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full transition-all active:scale-90 hover:bg-black/10"
            style={{ color: 'var(--color-text-muted)' }}
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl" style={{ background: 'rgba(201,162,39,0.15)', border: '1px solid rgba(201,162,39,0.3)' }}>
              <CoinIcon size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>Comprar Moedas</h2>
              <p className="text-sm" style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                Saldo atual: <span className="font-bold">{coins}</span> moedas
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-3">
          {error && (
            <div className="px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(139,40,40,0.12)', border: '1px solid rgba(139,40,40,0.25)', color: '#8b2828' }}>
              {error}
            </div>
          )}

          {COIN_PACKAGES.map((pkg) => {
            const isBusy = busyPackage === pkg.id;
            return (
              <button
                key={pkg.id}
                onClick={() => handleBuyPackage(pkg.id)}
                disabled={!!busyPackage}
                className="w-full flex items-center justify-between p-4 rounded-2xl transition-all disabled:opacity-50 group hover:brightness-[1.03]"
                style={{ background: 'rgba(255,255,255,0.4)', border: '1.5px solid rgba(139,99,70,0.35)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl group-hover:scale-110 transition-transform" style={{ background: 'rgba(201,162,39,0.15)' }}>
                    <CoinIcon size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-lg leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
                      {pkg.coins} <span className="text-sm font-bold" style={{ color: 'var(--color-text-muted)' }}>moedas</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold px-3 py-1.5 rounded-lg" style={{ fontFamily: 'var(--font-display)', color: '#2a5a1e', background: 'rgba(42,90,30,0.1)', border: '1px solid rgba(42,90,30,0.2)' }}>
                    R$ {pkg.price_brl}
                  </span>
                  {isBusy && <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-wood-mid)' }} />}
                </div>
              </button>
            );
          })}

          {/* CTA de semente: aparece quando há moedas suficientes */}
          <div className="pt-2">
            <button
              onClick={handleBuySeed}
              disabled={!canBuySeed || buyingSeed}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              style={{
                fontFamily: 'var(--font-display)',
                background: canBuySeed ? 'linear-gradient(135deg, #2a5a1e, #1e4014)' : 'rgba(92,58,30,0.1)',
                color: canBuySeed ? 'var(--color-parch-light)' : 'var(--color-text-muted)',
                border: `1px solid ${canBuySeed ? 'rgba(201,162,39,0.3)' : 'rgba(92,58,30,0.2)'}`,
                boxShadow: canBuySeed ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {buyingSeed ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {canBuySeed ? <Sprout className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  <span>
                    {potId ? 'Comprar semente e plantar' : 'Comprar semente'} ({SEED_COST_COINS} moedas)
                  </span>
                </>
              )}
            </button>
            {!canBuySeed && (
              <p className="text-center text-xs mt-2" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>
                Compre um pacote acima para liberar a semente.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
