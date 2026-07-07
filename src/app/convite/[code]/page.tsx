'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Landing de indicação. Guarda o código na sessão do navegador e manda o visitante
 * para o cadastro; o código é enviado ao /api/auth/init quando a conta é criada.
 */
export default function ConvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();

  useEffect(() => {
    const code = (params?.code ?? '').toString().trim().toLowerCase();
    if (code) {
      try { localStorage.setItem('brotaria_ref', code); } catch { /* storage indisponível */ }
    }
    router.replace('/signup');
  }, [params, router]);

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: 'var(--color-garden-deep)' }}
    >
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
    </div>
  );
}
