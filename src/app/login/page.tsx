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
      setError(error.message);
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
            src="/imgs/brotaria.png"
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

        <p
          className="mt-7 text-center text-sm"
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
