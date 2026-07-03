'use client';

import { useState } from 'react';
import { Loader2, Ticket } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';

type RedeemResult = { granted: number; package: string; coins: number };

/**
 * Card "Resgatar cupom" da Loja. Envia o código pro /api/coupons/redeem;
 * no sucesso, chama onRedeemed (a página atualiza o saldo e mostra o banner).
 * Erros ficam inline no próprio card.
 */
export function CouponRedeemCard({ onRedeemed }: { onRedeemed: (r: RedeemResult) => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redeem = async () => {
    const trimmed = code.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/coupons/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCode('');
        onRedeemed(data as RedeemResult);
      } else {
        setError(data.error || 'Não foi possível resgatar o cupom.');
      }
    } catch {
      setError('Erro de conexão. Tente de novo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="mb-6 rounded-2xl p-5"
      style={{
        background: 'linear-gradient(180deg, var(--color-parch-light), var(--color-parch-dark))',
        border: '1.5px solid var(--color-wood-light)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Ticket className="w-4 h-4" style={{ color: 'var(--color-wood-mid)' }} />
        <h2
          className="text-base font-black"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
        >
          Resgatar cupom
        </h2>
      </div>
      <p
        className="text-xs mb-3"
        style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}
      >
        Tem um código de early access? Resgate suas moedas grátis.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') redeem(); }}
          placeholder="EX: BIGBROTARIA"
          spellCheck={false}
          autoCapitalize="characters"
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold tracking-wider outline-none"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'rgba(255,255,255,0.55)',
            border: '1.5px solid var(--color-wood-light)',
            color: 'var(--color-text-dark)',
          }}
        />
        <button
          onClick={redeem}
          disabled={loading || !code.trim()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
            color: '#d9f0c8',
            border: '1px solid rgba(74,222,128,0.25)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Resgatar'}
        </button>
      </div>

      {error && (
        <div
          className="mt-3 px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'rgba(139,40,40,0.12)', border: '1px solid rgba(139,40,40,0.25)', color: '#8b2828' }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
