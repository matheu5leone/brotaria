'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import NavLink from '@/components/NavLink';
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
      setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.');
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-100 p-3 rounded-xl mb-4">
            <Flower className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-stone-800">Recuperar senha</h1>
          <p className="text-stone-500 text-sm text-center">
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
