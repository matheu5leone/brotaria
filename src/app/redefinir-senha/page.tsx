'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import NavLink from '@/components/NavLink';
import { FallingLeaves } from '@/components/FallingLeaves';
import { Flower, Lock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function RedefinirSenhaPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase processa o token do link e dispara PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError('Não foi possível redefinir a senha. O link pode ter expirado — solicite um novo.');
    } else {
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6" style={{ background: 'linear-gradient(160deg, var(--color-garden-mid) 0%, var(--color-garden-deep) 40%, var(--color-garden-light) 70%, var(--color-garden-deep) 100%)' }}>
      <FallingLeaves />
      <div className="pointer-events-none absolute inset-0 z-0" style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)' }} />
        <div className="relative z-10 w-full max-w-md rounded-2xl shadow-2xl p-8 text-center" style={{ background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)', border: '1.5px solid var(--color-wood-light)' }}>
          <CheckCircle className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--color-wood-mid)' }} />
          <h1 className="text-2xl font-black text-stone-800 mb-2">Senha redefinida!</h1>
          <p className="text-stone-500 text-sm">
            Você será redirecionado ao login em instantes...
          </p>
          <NavLink href="/login" className="mt-6 inline-block text-green-600 font-bold hover:underline text-sm">
            Ir para o login agora
          </NavLink>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6" style={{ background: 'linear-gradient(160deg, var(--color-garden-mid) 0%, var(--color-garden-deep) 40%, var(--color-garden-light) 70%, var(--color-garden-deep) 100%)' }}>
      <FallingLeaves />
      <div className="pointer-events-none absolute inset-0 z-0" style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)' }} />
        <div className="relative z-10 w-full max-w-md rounded-2xl shadow-2xl p-8 text-center" style={{ background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)', border: '1.5px solid var(--color-wood-light)' }}>
          <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin" style={{ color: 'var(--color-wood-mid)' }} />
          <p className="text-stone-500 text-sm">Validando link de recuperação...</p>
          <p className="text-stone-400 text-xs mt-3">
            Se esta tela persistir,{' '}
            <NavLink href="/esqueci-senha" className="text-green-600 hover:underline">
              solicite um novo link
            </NavLink>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6" style={{ background: 'linear-gradient(160deg, var(--color-garden-mid) 0%, var(--color-garden-deep) 40%, var(--color-garden-light) 70%, var(--color-garden-deep) 100%)' }}>
      <FallingLeaves />
      <div className="pointer-events-none absolute inset-0 z-0" style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)' }} />
      <div className="relative z-10 w-full max-w-md rounded-2xl shadow-2xl p-8" style={{ background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)', border: '1.5px solid var(--color-wood-light)' }}>
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(92,58,30,0.1)' }}>
            <Flower className="w-10 h-10" style={{ color: 'var(--color-wood-mid)' }} />
          </div>
          <h1 className="text-2xl font-black text-stone-800">Nova senha</h1>
          <p className="text-stone-500 text-sm">Escolha uma senha forte para sua conta</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
              Nova senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="password"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
              Confirmar senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="password"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                placeholder="Repita a nova senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Redefinir senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
