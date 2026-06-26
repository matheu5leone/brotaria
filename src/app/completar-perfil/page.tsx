'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FallingLeaves } from '@/components/FallingLeaves';
import { AtSign, Loader2, Check, X } from 'lucide-react';
import { User } from '@supabase/supabase-js';

const inputClass = 'w-full pl-10 pr-10 py-3 rounded-xl outline-none transition-all text-sm';
const inputStyle = {
  background: 'rgba(255,255,255,0.45)',
  border: '1.5px solid rgba(139,99,70,0.35)',
  color: 'var(--color-text-dark)',
};

type NicknameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function CompletarPerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState<NicknameStatus>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega sessão e verifica se já tem nickname
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.replace('/login'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', session.user.id)
        .single();
      if (profile?.nickname) { router.replace('/'); return; }
      setUser(session.user);
      setLoading(false);
    });
  }, [router]);

  // Validação de nickname com debounce
  const validateNickname = (value: string) => {
    const clean = value.replace(/^@/, '').trim().toLowerCase();

    if (!clean) { setStatus('idle'); return; }

    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setStatus('invalid');
      return;
    }

    setStatus('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?nickname=${encodeURIComponent(clean)}`);
        setStatus(res.ok ? 'taken' : 'available');
      } catch {
        setStatus('available');
      }
    }, 500);
  };

  const handleChange = (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9_@]/g, '');
    setNickname(clean);
    validateNickname(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || status !== 'available') return;

    const clean = nickname.replace(/^@/, '').trim().toLowerCase();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email ?? '',
          nickname: clean,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao salvar');
      router.replace('/');
    } catch (err: unknown) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  // Avatar e nome do Google
  const googleName  = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? '';
  const googlePhoto = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-garden-deep)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  const statusIcon = () => {
    if (status === 'checking') return <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-text-muted)' }} />;
    if (status === 'available') return <Check className="w-4 h-4 text-green-600" />;
    if (status === 'taken' || status === 'invalid') return <X className="w-4 h-4 text-red-500" />;
    return null;
  };

  const statusMessage = () => {
    if (status === 'available') return { text: 'Apelido disponível!', color: '#16a34a' };
    if (status === 'taken') return { text: 'Este apelido já está em uso.', color: '#dc2626' };
    if (status === 'invalid') return { text: '3–20 caracteres: letras, números ou _', color: '#dc2626' };
    return null;
  };

  const msg = statusMessage();

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6"
      style={{
        background:
          'linear-gradient(160deg, var(--color-garden-mid) 0%, var(--color-garden-deep) 40%, var(--color-garden-light) 70%, var(--color-garden-deep) 100%)',
      }}
    >
      <FallingLeaves />
      <div className="pointer-events-none absolute inset-0 z-0" style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)' }} />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
      >
        {/* Acento dourado */}
        <div className="absolute top-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }} />

        {/* Avatar Google */}
        <div className="flex flex-col items-center mb-7">
          <div
            className="relative w-20 h-20 rounded-full overflow-hidden mb-3"
            style={{ boxShadow: '0 0 0 3px var(--color-wood-light)' }}
          >
            {googlePhoto ? (
              <Image src={googlePhoto} alt={googleName} fill className="object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-2xl font-black"
                style={{ background: 'linear-gradient(135deg, #2a4a1e, #1a2f10)', color: 'var(--color-wood-light)', fontFamily: 'var(--font-display)' }}
              >
                {user?.email?.[0].toUpperCase()}
              </div>
            )}
          </div>

          {googleName && (
            <p className="text-sm font-bold mb-0.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
              Olá, {googleName.split(' ')[0]}! 👋
            </p>
          )}

          <h1 className="text-xl font-black text-center" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
            Escolha seu apelido
          </h1>
          <p className="text-sm text-center mt-1" style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
            É com ele que outros jogadores vão te encontrar e enviar presentes.
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg text-sm mb-5" style={{ background: 'rgba(139,40,40,0.12)', border: '1px solid rgba(139,40,40,0.25)', color: '#8b2828' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              className="block text-[10px] font-black uppercase tracking-widest mb-1.5"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
            >
              Apelido
            </label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-wood-light)' }} />
              <input
                type="text"
                required
                autoFocus
                className={inputClass}
                style={{
                  ...inputStyle,
                  border: status === 'available'
                    ? '1.5px solid #16a34a'
                    : status === 'taken' || status === 'invalid'
                    ? '1.5px solid #dc2626'
                    : inputStyle.border,
                }}
                placeholder="seunome"
                value={nickname}
                onChange={(e) => handleChange(e.target.value)}
                minLength={3}
                maxLength={21}
              />
              {/* Ícone de status à direita */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {statusIcon()}
              </div>
            </div>
            {msg && (
              <p className="text-xs mt-1.5" style={{ color: msg.color, fontFamily: 'var(--font-body)' }}>
                {msg.text}
              </p>
            )}
            <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-caption)' }}>
              Pode usar letras minúsculas, números e _ · Não pode mudar depois
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || status !== 'available'}
            className="w-full py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 mt-2"
            style={{
              fontFamily: 'var(--font-display)',
              background: (saving || status !== 'available')
                ? 'var(--color-wood-mid)'
                : 'linear-gradient(135deg, #2a5a1e, #1e4014)',
              color: 'var(--color-parch-light)',
              border: '1px solid rgba(201,162,39,0.3)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            {saving
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : '🌱 Plantar meu Jardim'
            }
          </button>
        </form>
      </div>
    </div>
  );
}
