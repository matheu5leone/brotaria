'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import NavLink from '@/components/NavLink';
import { FallingLeaves } from '@/components/FallingLeaves';
import { Flower, Mail, Loader2, CheckCircle } from 'lucide-react';

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
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6"
      style={{
        background: 'linear-gradient(160deg, var(--color-garden-mid) 0%, var(--color-garden-deep) 40%, var(--color-garden-light) 70%, var(--color-garden-deep) 100%)',
      }}
    >
      <FallingLeaves />
      <div className="pointer-events-none absolute inset-0 z-0" style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)' }} />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-100 p-3 rounded-xl mb-4">
            <Flower className="w-10 h-10" style={{ color: 'var(--color-wood-mid)' }} />
          </div>
          <h1 className="text-2xl font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>Recuperar senha</h1>
          <p className="text-sm text-center" style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
            Informe seu e-mail e enviaremos um link para redefinir sua senha
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <p className="text-stone-700 font-bold text-center">
              E-mail enviado!
            </p>
            <p className="text-stone-500 text-sm text-center">
              Verifique sua caixa de entrada (e a pasta de spam) para o link de redefinição.
            </p>
            <NavLink
              href="/login"
              className="mt-2 text-green-600 font-bold hover:underline text-sm"
            >
              ← Voltar ao login
            </NavLink>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  E-mail cadastrado
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enviar link de recuperação'}
              </button>
            </form>

            <p className="mt-6 text-center text-stone-500 text-sm">
              <NavLink href="/login" className="text-green-600 font-bold hover:underline">
                ← Voltar ao login
              </NavLink>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
