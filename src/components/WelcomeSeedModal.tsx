'use client';

import { useState } from 'react';
import { Loader2, Sprout, Check } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { useWallet } from '@/hooks/useWallet';

/**
 * Popup de boas-vindas: anuncia a semente-cortesia (já concedida no onboarding)
 * de forma inconfundível — card de recompensa, não tela de loading. Mostra a
 * semente já na mochila e, ao confirmar, atualiza a carteira.
 */
export function WelcomeSeedModal({ onDone }: { onDone: () => void }) {
  const { seedCount, refresh } = useWallet();
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await authFetch('/api/profile/welcome-ack', { method: 'POST' });
      await refresh(); // garante que a mochila reflita a semente na hora
    } catch {
      // Não travar o usuário no popup se a confirmação falhar.
    } finally {
      onDone();
    }
  };

  return (
    <div
      className="evo-fade-in fixed inset-0 z-[10060] flex items-center justify-center overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at center, #24401a 0%, #16290c 55%, #0a1606 100%)' }}
    >
      {/* Brilho de sol suave e ESTÁTICO atrás do card (não gira → não parece loading) */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 'min(120vw, 900px)',
          height: 'min(120vw, 900px)',
          background: 'radial-gradient(circle, rgba(255,224,150,0.22) 0%, rgba(255,200,90,0.08) 38%, transparent 66%)',
        }}
      />

      {/* Card de recompensa */}
      <div
        className="relative mx-6 p-7 rounded-3xl text-center max-w-sm w-full"
        style={{
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
      >
        <div
          className="absolute top-0 left-10 right-10 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        {/* Hero: semente em destaque */}
        <div
          className="mx-auto mb-4 flex items-center justify-center rounded-full"
          style={{
            width: 104,
            height: 104,
            background: 'radial-gradient(circle, rgba(74,222,128,0.28) 0%, rgba(42,90,30,0.12) 55%, transparent 72%)',
            border: '2px solid rgba(74,222,128,0.35)',
          }}
        >
          <Sprout className="w-14 h-14" style={{ color: '#2a7a2a' }} strokeWidth={1.6} />
        </div>

        <span
          className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3"
          style={{
            background: 'rgba(201,162,39,0.15)',
            color: 'var(--color-wood-mid)',
            border: '1px solid rgba(201,162,39,0.35)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Presente de boas-vindas
        </span>

        <h2
          className="text-2xl font-black mb-2 leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
        >
          Você ganhou<br />1 semente grátis! 🌱
        </h2>
        <p
          className="text-sm leading-relaxed mb-4"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}
        >
          Uma cortesia para você começar seu jardim. Cave um canteiro com a pá e
          plante-a para ver sua primeira planta ganhar vida!
        </p>

        {/* Prova tangível: a semente já está na mochila */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-5 text-sm font-bold"
          style={{
            background: 'rgba(42,90,30,0.1)',
            border: '1px solid rgba(42,90,30,0.25)',
            color: '#2a5a1e',
            fontFamily: 'var(--font-display)',
          }}
        >
          <Check className="w-4 h-4" />
          {seedCount > 0
            ? <>Adicionada à mochila · 🌱 {seedCount} {seedCount === 1 ? 'semente' : 'sementes'}</>
            : <>Adicionada à sua mochila 🌱</>}
        </div>

        <button
          onClick={confirm}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
            color: '#d9f0c8',
            border: '1px solid rgba(74,222,128,0.25)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pegar minha semente'}
        </button>
      </div>
    </div>
  );
}
