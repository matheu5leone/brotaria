'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import NavLink from '@/components/NavLink';
import { FallingLeaves } from '@/components/FallingLeaves';
import { Lock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

const inputClass = 'w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all text-sm';
const inputStyle = {
  background: 'rgba(255,255,255,0.45)',
  border: '1.5px solid rgba(139,99,70,0.35)',
  color: 'var(--color-text-dark)',
};

const bgStyle = {
  background:
    'linear-gradient(160deg, var(--color-garden-mid) 0%, var(--color-garden-deep) 40%, var(--color-garden-light) 70%, var(--color-garden-deep) 100%)',
};

const cardStyle = {
  background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
  border: '1.5px solid var(--color-wood-light)',
  boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
};

export default function RedefinirSenhaPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
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

  const GoldAccent = () => (
    <div
      className="absolute top-0 left-6 right-6 h-px"
      style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
    />
  );

  const Vignette = () => (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)' }}
    />
  );

  if (done) {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6" style={bgStyle}>
        <FallingLeaves />
        <Vignette />
        <div className="relative z-10 w-full max-w-md rounded-2xl p-8 text-center" style={cardStyle}>
          <GoldAccent />
          <CheckCircle className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--color-wood-mid)' }} />
          <h1
            className="text-2xl font-black mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
          >
            Senha redefinida!
          </h1>
          <p
            className="text-sm"
            style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}
          >
            Você será redirecionado ao login em instantes...
          </p>
          <NavLink
            href="/login"
            className="mt-6 inline-block text-sm font-bold hover:underline"
            style={{ color: 'var(--color-wood-mid)', fontFamily: 'var(--font-display)' }}
          >
            Ir para o login agora
          </NavLink>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6" style={bgStyle}>
        <FallingLeaves />
        <Vignette />
        <div className="relative z-10 w-full max-w-md rounded-2xl p-8 text-center" style={cardStyle}>
          <GoldAccent />
          <Loader2
            className="w-10 h-10 mx-auto mb-4 animate-spin"
            style={{ color: 'var(--color-wood-mid)' }}
          />
          <p
            className="text-sm"
            style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}
          >
            Validando link de recuperação...
          </p>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
            Se esta tela persistir,{' '}
            <NavLink
              href="/esqueci-senha"
              className="font-bold hover:underline"
              style={{ color: 'var(--color-wood-mid)' }}
            >
              solicite um novo link
            </NavLink>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6" style={bgStyle}>
      <FallingLeaves />
      <Vignette />
      <div className="relative z-10 w-full max-w-md rounded-2xl p-8" style={cardStyle}>
        <GoldAccent />

        <div className="flex flex-col items-center mb-8">
          <h1
            className="text-2xl font-black tracking-wide mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
          >
            Nova senha
          </h1>
          <p
            className="text-sm text-center"
            style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}
          >
            Escolha uma senha forte para sua conta
          </p>
        </div>

        {error && (
          <div
            className="flex items-start gap-2 px-4 py-3 rounded-lg text-sm mb-5"
            style={{
              background: 'rgba(139,40,40,0.12)',
              border: '1px solid rgba(139,40,40,0.25)',
              color: '#8b2828',
            }}
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              className="block text-[10px] font-black uppercase tracking-widest mb-1.5"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
            >
              Nova senha
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--color-wood-light)' }}
              />
              <input
                type="password"
                required
                minLength={6}
                className={inputClass}
                style={inputStyle}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-[10px] font-black uppercase tracking-widest mb-1.5"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
            >
              Confirmar senha
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--color-wood-light)' }}
              />
              <input
                type="password"
                required
                minLength={6}
                className={inputClass}
                style={inputStyle}
                placeholder="Repita a nova senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '✦ Redefinir senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
