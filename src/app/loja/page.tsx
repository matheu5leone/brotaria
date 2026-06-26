'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppShell } from '@/components/AppShell';
import CoinPurchaseModal from '@/components/CoinPurchaseModal';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { STORE_PRODUCTS } from '@/config/economy';
import { Sprout, Loader2, Plus } from 'lucide-react';
import { CoinIcon } from '@/components/CoinIcon';
import { authFetch } from '@/lib/authFetch';

export default function LojaPage() {
  const { user, isLoading } = useAuth();
  const { coins, refresh } = useWallet();
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const buyProduct = async (productId: string, costCoins: number) => {
    if (!user || buyingId) return;

    // Sem moedas suficientes: abre o popup de compra de moedas.
    if (coins < costCoins) {
      setModalOpen(true);
      return;
    }

    setBuyingId(productId);
    try {
      const res = await authFetch('/api/store/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success) {
        await refresh();
      } else if (data.code === 'INSUFFICIENT_COINS') {
        setModalOpen(true);
      } else {
        alert(data.error || 'Falha na compra');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBuyingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-garden-deep)' }}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Image src="/imgs/brotaria.png" alt="Logo" width={60} height={60} className="opacity-50" />
          <div className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Carregando Brotaria...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-stone-800">Loja</h1>
              <p className="text-stone-500">Use suas moedas para fazer seu jardim crescer.</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all"
            >
              <CoinIcon size={20} />
              <span className="font-black">{coins}</span>
              <span className="opacity-80">moedas</span>
              <Plus className="w-4 h-4 ml-1" />
            </button>
          </div>

          {/* Products grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {STORE_PRODUCTS.map((product) => {
              const isBuying = buyingId === product.id;
              const affordable = coins >= product.cost_coins;
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                >
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 flex items-center justify-center relative">
                    {product.id === 'skip_time' && (
                      <span className="absolute top-2 left-2 text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded">
                        DEV
                      </span>
                    )}
                    <div className="bg-white rounded-2xl p-5 shadow-inner">
                      <Sprout className="w-12 h-12 text-green-600" />
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-black text-lg text-stone-800">{product.name}</h3>
                    <p className="text-sm text-stone-500 flex-1 mt-1">{product.description}</p>

                    <div className="flex items-center justify-between mt-4">
                      <span className="flex items-center gap-1.5 font-black text-amber-600">
                        {product.cost_coins === 0 ? (
                          <span className="text-green-600">Grátis</span>
                        ) : (
                          <>
                            <CoinIcon size={20} />
                            {product.cost_coins}
                          </>
                        )}
                      </span>
                      <button
                        onClick={() => buyProduct(product.id, product.cost_coins)}
                        disabled={isBuying}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                          affordable
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                      >
                        {isBuying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : affordable ? (
                          'Comprar'
                        ) : (
                          'Comprar moedas'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <CoinPurchaseModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </AppShell>
  );
}
