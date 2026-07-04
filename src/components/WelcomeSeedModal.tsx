'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';

/**
 * Popup de boas-vindas: anuncia a semente-cortesia (já concedida no onboarding)
 * com raios de sol girando ao fundo (reaproveita as classes .evo-rays do
 * EvolutionLoader) e um botão OK que confirma o recebimento.
 */
export function WelcomeSeedModal({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await authFetch('/api/profile/welcome-ack', { method: 'POST' });
    } catch {
      // Mesmo se a confirmação falhar, não travar o usuário no popup.
    } finally {
      onDone();
    }
  };

  return (
    <div
      className="evo-fade-in fixed inset-0 z-[10060] flex items-center justify-center overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at center, #2b4a17 0%, #16290c 55%, #0a1606 100%)' }}
    >
      {/* Raios solares girando (duas camadas em sentidos opostos) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="evo-rays absolute"
          style={{
            width: '180vmax',
            height: '180vmax',
            background:
              'repeating-conic-gradient(from 0deg, rgba(255,224,140,0.16) 0deg 5deg, transparent 5deg 17deg)',
            WebkitMaskImage:
              'radial-gradient(circle, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 35%, transparent 70%)',
            maskImage:
              'radial-gradient(circle, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 35%, transparent 70%)',
          }}
        />
        <div
          className="evo-rays--rev absolute"
          style={{
            width: '180vmax',
            height: '180vmax',
            background:
              'repeating-conic-gradient(from 8deg, rgba(255,200,90,0.10) 0deg 3deg, transparent 3deg 22deg)',
            WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, transparent 60%)',
            maskImage: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Card pergaminho */}
      <div
        className="relative mx-6 p-7 rounded-3xl text-center max-w-sm w-full"
        style={{
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
      >
        {/* Gold top accent */}
        <div
          className="absolute top-0 left-10 right-10 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        {/* Selo com o broto */}
        <div
          className="evo-halo mx-auto mb-4 flex items-center justify-center rounded-full"
          style={{
            width: 96,
            height: 96,
            background: 'radial-gradient(circle, rgba(255,228,150,0.55) 0%, rgba(255,200,90,0.15) 60%, transparent 75%)',
          }}
        >
          <span style={{ fontSize: 54, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.35))' }}>🌱</span>
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
          Cortesia de boas-vindas
        </span>

        <h2
          className="text-xl font-black mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
        >
          Bem-vindo à Brotaria!
        </h2>
        <p
          className="text-sm leading-relaxed mb-6"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}
        >
          Você recebeu <b>1 semente grátis</b> de cortesia para começar seu jardim.
          Cave um canteiro com a pá e plante-a para ver sua primeira planta ganhar vida! 🌿
        </p>

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
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'OK, recebi minha semente!'}
        </button>
      </div>
    </div>
  );
}
