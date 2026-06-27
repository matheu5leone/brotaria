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
  const [banner, setBanner] = useState<{ type: 'success' | 'cancel'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Retorno do Stripe Checkout: ?success=<session_id> ou ?canceled=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('success')) {
      setBanner({ type: 'success', text: 'Pagamento concluído! Suas moedas chegam em instantes.' });
      // Webhook credita as moedas; revalidamos o saldo algumas vezes para refletir logo
      const id = setInterval(() => refresh(), 2000);
      setTimeout(() => clearInterval(id), 12000);
      window.history.replaceState({}, '', '/loja');
    } else if (params.has('canceled')) {
      setBanner({ type: 'cancel', text: 'Pagamento cancelado. Nenhuma cobrança foi feita.' });
      window.history.replaceState({}, '', '/loja');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {/* Banner de retorno do Stripe */}
          {banner && (
            <div
              className="mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium"
              style={
                banner.type === 'success'
                  ? { background: 'rgba(42,90,30,0.14)', border: '1px solid rgba(42,90,30,0.3)', color: '#2a5a1e' }
                  : { background: 'rgba(92,58,30,0.1)', border: '1px solid rgba(92,58,30,0.25)', color: 'var(--color-text-muted)' }
              }
            >
              <span>{banner.type === 'success' ? '✅ ' : 'ℹ️ '}{banner.text}</span>
              <button onClick={() => setBanner(null)} className="opacity-60 hover:opacity-100">✕</button>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>Loja</h1>
              <p className="text-sm" style={{ color: 'rgba(232,213,160,0.45)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>Use suas moedas para fazer seu jardim crescer.</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(180deg, var(--color-parch-light), var(--color-parch-dark))',
                color: 'var(--color-text-dark)',
                border: '1.5px solid var(--color-wood-light)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              }}
            >
              <CoinIcon size={20} />
              <span className="font-black">{coins}</span>
              <span className="opacity-70">moedas</span>
              <Plus className="w-4 h-4 ml-1" style={{ color: 'var(--color-wood-mid)' }} />
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
                  className="relative rounded-3xl overflow-hidden flex flex-col"
                  style={{
                    background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
                    border: '1.5px solid var(--color-wood-light)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 1px 1px rgba(242,232,213,0.8)',
                  }}
                >
                  {/* Acento dourado no topo */}
                  <div
                    className="absolute top-0 left-6 right-6 h-px pointer-events-none z-10"
                    style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
                  />
                  <div className="p-8 flex items-center justify-center relative" style={{ background: 'rgba(42,90,30,0.08)' }}>
                    {product.id === 'skip_time' && (
                      <span className="absolute top-2 left-2 text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded">
                        DEV
                      </span>
                    )}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.5)', boxShadow: 'inset 0 2px 6px rgba(92,58,30,0.15)' }}>
                      <Sprout className="w-12 h-12" style={{ color: '#2a5a1e' }} />
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-black text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>{product.name}</h3>
                    <p className="text-sm flex-1 mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{product.description}</p>

                    <div className="flex items-center justify-between mt-4">
                      <span className="flex items-center gap-1.5 font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-dark)' }}>
                        {product.cost_coins === 0 ? (
                          <span style={{ color: '#2a5a1e' }}>Grátis</span>
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
                        className="px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95"
                        style={
                          affordable
                            ? { fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #2a5a1e, #1e4014)', color: 'var(--color-parch-light)', border: '1px solid rgba(201,162,39,0.3)' }
                            : { fontFamily: 'var(--font-display)', background: 'rgba(201,162,39,0.15)', color: 'var(--color-wood-dark)', border: '1px solid rgba(201,162,39,0.35)' }
                        }
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
