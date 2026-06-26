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
      const res = await authFetch('/api/coins/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (data.success) {
        setCoins(data.coins);
      } else {
        setError(data.error || 'Falha ao comprar moedas');
      }
    } catch {
      setError('Falha ao comprar moedas');
    } finally {
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
      className="fixed inset-0 z-[90] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-amber-400 to-amber-500 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl">
              <CoinIcon size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black leading-tight">Comprar Moedas</h2>
              <p className="text-amber-50 text-sm">
                Saldo atual: <span className="font-bold">{coins}</span> moedas
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm">
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
                className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-stone-100 hover:border-amber-300 hover:bg-amber-50 transition-all disabled:opacity-50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 text-amber-600 p-2 rounded-xl group-hover:scale-110 transition-transform">
                    <CoinIcon size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-stone-800 text-lg leading-none">
                      {pkg.coins} <span className="text-sm font-bold text-stone-400">moedas</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                    R$ {pkg.price_brl}
                  </span>
                  {isBusy && <Loader2 className="w-5 h-5 animate-spin text-amber-500" />}
                </div>
              </button>
            );
          })}

          {/* CTA de semente: aparece quando há moedas suficientes */}
          <div className="pt-2">
            <button
              onClick={handleBuySeed}
              disabled={!canBuySeed || buyingSeed}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all ${
                canBuySeed
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl active:scale-95'
                  : 'bg-stone-100 text-stone-400 cursor-not-allowed'
              }`}
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
              <p className="text-center text-xs text-stone-400 mt-2">
                Compre um pacote acima para liberar a semente.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
