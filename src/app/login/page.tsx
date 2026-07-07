'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import NavLink from '@/components/NavLink';
import { FallingLeaves } from '@/components/FallingLeaves';
import { Mail, Lock, Loader2 } from 'lucide-react';

const inputClass =
  'w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all text-sm';
const inputStyle = {
  background: 'rgba(255,255,255,0.45)',
  border: '1.5px solid rgba(139,99,70,0.35)',
  color: 'var(--color-text-dark)',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('E-mail ou senha incorretos. Tente novamente.');
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
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

      {/* Vinheta */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)' }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{
          background:
            'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow:
            '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
      >
        {/* Acento dourado no topo */}
        <div
          className="absolute top-0 left-6 right-6 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--color-gold), transparent)',
          }}
        />

        {/* Logo + título */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/imgs/brotaria.webp"
            alt="Brotaria"
            width={56}
            height={56}
            className="mb-4 drop-shadow-lg"
            preload
          />
          <h1
            className="text-2xl font-black tracking-wide mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
          >
            Brotaria
          </h1>
          <p
            className="text-sm text-center"
            style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}
          >
            Entre para cuidar do seu jardim
          </p>
        </div>

        {error && (
          <div
            className="px-4 py-3 rounded-lg text-sm mb-5"
            style={{ background: 'rgba(139,40,40,0.12)', border: '1px solid rgba(139,40,40,0.25)', color: '#8b2828' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* E-mail */}
          <div>
            <label
              className="block text-[10px] font-black uppercase tracking-widest mb-1.5"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
            >
              E-mail
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

          {/* Senha */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className="block text-[10px] font-black uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
              >
                Senha
              </label>
              <NavLink
                href="/esqueci-senha"
                className="text-[10px] font-medium hover:underline"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--color-wood-mid)' }}
              >
                Esqueceu a senha?
              </NavLink>
            </div>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--color-wood-light)' }}
              />
              <input
                type="password"
                required
                className={inputClass}
                style={inputStyle}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '✦ Entrar no Jardim'}
          </button>
        </form>

        {/* Separador */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: 'rgba(92,58,30,0.2)' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)' }}>ou</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(92,58,30,0.2)' }} />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={async () => {
            const { supabase: sb } = await import('@/lib/supabase');
            await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/` } });
          }}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'rgba(255,255,255,0.92)',
            color: '#444',
            border: '1.5px solid rgba(139,99,70,0.25)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Entrar com Google
        </button>

        <p
          className="mt-5 text-center text-sm"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}
        >
          Não tem uma conta?{' '}
          <NavLink
            href="/signup"
            className="font-bold hover:underline"
            style={{ color: 'var(--color-wood-mid)' }}
          >
            Criar meu Jardim
          </NavLink>
        </p>
      </div>
    </div>
  );
}
