'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import NavLink from '@/components/NavLink';
import { FallingLeaves } from '@/components/FallingLeaves';
import { Mail, Lock, Loader2, AtSign } from 'lucide-react';

const inputClass =
  'w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all text-sm';
const inputStyle = {
  background: 'rgba(255,255,255,0.45)',
  border: '1.5px solid rgba(139,99,70,0.35)',
  color: 'var(--color-text-dark)',
};

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const nick = nickname.replace(/^@/, '').trim().toLowerCase();
    if (!nick) { setError('Escolha um apelido.'); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(nick)) {
      setError('Apelido: 3-20 caracteres, apenas letras, números e _'); return;
    }
    setLoading(true);
    setError(null);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // Salva o apelido junto com o perfil
    if (data.user) {
      await fetch('/api/auth/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id, email, nickname: nick }),
      });
    }

    setDone(true);
    setTimeout(() => router.push('/login'), 3000);
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
          boxShadow:
            '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
      >
        <div
          className="absolute top-0 left-6 right-6 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--color-gold), transparent)',
          }}
        />

        <div className="flex flex-col items-center mb-8">
          <Image
            src="/imgs/brotaria.png"
            alt="Brotaria"
            width={56}
            height={56}
            className="mb-4 drop-shadow-lg"
          />
          <h1
            className="text-2xl font-black tracking-wide mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
          >
            Crie seu Jardim
          </h1>
          <p
            className="text-sm text-center"
            style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}
          >
            Comece sua jornada botânica hoje
          </p>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="text-3xl">🌱</span>
            <p
              className="font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
            >
              Jardim criado!
            </p>
            <p
              className="text-sm"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}
            >
              Redirecionando para o login...
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div
                className="px-4 py-3 rounded-lg text-sm mb-5"
                style={{ background: 'rgba(139,40,40,0.12)', border: '1px solid rgba(139,40,40,0.25)', color: '#8b2828' }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-5">
              {/* Apelido */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}>
                  Apelido <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(único, para receber presentes)</span>
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-wood-light)' }} />
                  <input
                    type="text"
                    required
                    className={inputClass}
                    style={inputStyle}
                    placeholder="seunome"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_@]/g, ''))}
                    minLength={3}
                    maxLength={21}
                  />
                </div>
              </div>

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

              <div>
                <label
                  className="block text-[10px] font-black uppercase tracking-widest mb-1.5"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
                >
                  Senha
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
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '🌱 Plantar meu Jardim'}
              </button>
            </form>

            <p
              className="mt-7 text-center text-sm"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}
            >
              Já tem uma conta?{' '}
              <NavLink
                href="/login"
                className="font-bold hover:underline"
                style={{ color: 'var(--color-wood-mid)' }}
              >
                Entrar agora
              </NavLink>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
