'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

/**
 * Callback de autenticação (confirmação de e-mail e OAuth).
 *
 * O Supabase redireciona pra cá após verificar o e-mail (ou o OAuth). O
 * supabase-js (detectSessionInUrl) processa o token/código da URL e emite a
 * sessão; aqui só esperamos a sessão e mandamos pro app. Sem a rota, o link do
 * e-mail dava 404.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let finished = false;
    const go = (to: string) => { if (!finished) { finished = true; router.replace(to); } };

    // Erro explícito na URL (link expirado/ inválido) → volta pro login
    const raw = window.location.hash.replace(/^#/, '') || window.location.search.replace(/^\?/, '');
    const params = new URLSearchParams(raw);
    if (params.get('error') || params.get('error_code')) {
      const t = setTimeout(() => go('/login'), 1800);
      return () => clearTimeout(t);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) go('/');
    });
    // A sessão pode já ter sido processada (detectSessionInUrl no load do módulo)
    supabase.auth.getSession().then(({ data }) => { if (data.session) go('/'); });
    // Fallback: se nada resolver, manda pro login (ex.: link aberto noutro device)
    const t = setTimeout(() => go('/login'), 5000);

    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, [router]);

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 min-h-screen"
      style={{ background: 'var(--color-garden-deep)' }}
    >
      <Image src="/imgs/brotaria.webp" alt="Brotaria" width={56} height={56} className="animate-pulse opacity-80" />
      <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
        Confirmando sua conta…
      </p>
    </div>
  );
}
