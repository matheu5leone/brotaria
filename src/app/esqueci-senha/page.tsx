'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import NavLink from '@/components/NavLink';
import { FallingLeaves } from '@/components/FallingLeaves';
import { Mail, Loader2, CheckCircle } from 'lucide-react';

const inputClass = 'w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all text-sm';
const inputStyle = {
  background: 'rgba(255,255,255,0.45)',
  border: '1.5px solid rgba(139,99,70,0.35)',
  color: 'var(--color-text-dark)',
};

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setLoading(false);
    if (error) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.');
    } else {
      setSent(true);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6"
      style={{
        background:
          'linear-gradient(160deg, var(--color-garden-mid) 0%, var(--color-garden-deep) 40%, var(--color-garden-light) 70%, var(--color-garden-deep) 100%)',
      }}
    >
      <FallingLeaves />

      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)' }}
      />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{
          background:
            'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
      >
        {/* Acento dourado no topo */}
        <div
          className="absolute top-0 left-6 right-6 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)',
          }}
        />

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle className="w-14 h-14" style={{ color: 'var(--color-wood-mid)' }} />
            <h2
              className="text-xl font-black"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
            >
              E-mail enviado!
            </h2>
            <p
              className="text-sm"
              style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}
            >
              Verifique sua caixa de entrada (e a pasta de spam) para o link de redefinição.
            </p>
            <NavLink
              href="/login"
              className="mt-2 text-sm font-bold hover:underline"
              style={{ color: 'var(--color-wood-mid)', fontFamily: 'var(--font-display)' }}
            >
              ← Voltar ao login
            </NavLink>
          </div>
        ) : (
          <>
            {/* Título */}
            <div className="flex flex-col items-center mb-8">
              <h1
                className="text-2xl font-black tracking-wide mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
              >
                Recuperar senha
              </h1>
              <p
                className="text-sm text-center"
                style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}
              >
                Informe seu e-mail para receber o link de redefinição
              </p>
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-lg text-sm mb-5"
                style={{
                  background: 'rgba(139,40,40,0.12)',
                  border: '1px solid rgba(139,40,40,0.25)',
                  color: '#8b2828',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  className="block text-[10px] font-black uppercase tracking-widest mb-1.5"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
                >
                  E-mail cadastrado
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--color-wood-light)' }}
                  />
                  <input
                    type="email"
                    required
                    className={inputClass}
                    style={inputStyle}
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 mt-2"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: loading
                    ? 'var(--color-wood-mid)'
                    : 'linear-gradient(135deg, #2a5a1e, #1e4014)',
                  color: 'var(--color-parch-light)',
                  border: '1px solid rgba(201,162,39,0.3)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '✦ Enviar link de recuperação'}
              </button>
            </form>

            <p
              className="mt-7 text-center text-sm"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}
            >
              <NavLink
                href="/login"
                className="font-bold hover:underline"
                style={{ color: 'var(--color-wood-mid)' }}
              >
                ← Voltar ao login
              </NavLink>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
