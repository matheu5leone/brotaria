'use client';

/**
 * Global error boundary (App Router) — última rede de proteção: pega exceções no
 * próprio root layout / hidratação, que o error.tsx de segmento não alcança.
 * Substitui a tela morta padrão do Next ("This page couldn't load").
 *
 * Renderiza o PRÓPRIO <html>/<body> (o root layout foi ignorado), então o
 * globals.css pode não estar carregado → estilos inline com cores literais.
 */
import { useEffect } from 'react';
import { isChunkError, reloadWithCacheBust, reportClientError } from '@/lib/chunkReload';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunk = isChunkError(error);

  useEffect(() => {
    reportClientError('boundary-global', error);
    if (chunk) reloadWithCacheBust();
  }, [chunk, error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0 }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            background: 'linear-gradient(160deg, #1e3a1a 0%, #0f2010 60%, #24421f 100%)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 360,
              borderRadius: 16,
              padding: 32,
              background: 'linear-gradient(180deg, #f2e8d5 0%, #e0d0b0 100%)',
              border: '1.5px solid #8b6346',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 8px', color: '#2a1a0c' }}>
              {chunk ? 'Atualizando o jardim…' : 'Algo deu errado'}
            </h1>
            <p style={{ fontSize: 14, margin: '0 0 24px', color: '#5c4a38', lineHeight: 1.5 }}>
              {chunk
                ? 'Saiu uma versão nova. Recarregando para você automaticamente…'
                : 'Não foi possível carregar a página. Tente recarregar.'}
            </p>
            <button
              onClick={() => reloadWithCacheBust(true)}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                color: '#d9f0c8',
                background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
                border: '1px solid rgba(74,222,128,0.25)',
              }}
            >
              Recarregar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
