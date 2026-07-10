'use client';

/**
 * Error boundary de segmento (App Router). Substitui a tela morta padrão do Next
 * ("This page couldn't load") quando uma exceção sobe no render/navegação de uma
 * página. Se for erro de chunk (defasagem de build), recarrega sozinho com
 * cache-bust; senão mostra um fallback estilizado com botão de recarregar.
 */
import { useEffect } from 'react';
import { isChunkError, reloadWithCacheBust, reportClientError } from '@/lib/chunkReload';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunk = isChunkError(error);

  useEffect(() => {
    reportClientError('boundary', error);
    if (chunk) reloadWithCacheBust();
  }, [chunk, error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{
        background:
          'linear-gradient(160deg, var(--color-garden-mid) 0%, var(--color-garden-deep) 60%, var(--color-garden-light) 100%)',
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
      >
        <div className="text-4xl mb-3">🌱</div>
        <h1
          className="text-xl font-black mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
        >
          {chunk ? 'Atualizando o jardim…' : 'Algo deu errado'}
        </h1>
        <p
          className="text-sm mb-6"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}
        >
          {chunk
            ? 'Saiu uma versão nova. Recarregando para você automaticamente…'
            : 'Não foi possível carregar esta página. Tente recarregar.'}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => reloadWithCacheBust(true)}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
              color: '#d9f0c8',
              border: '1px solid rgba(74,222,128,0.25)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}
          >
            Recarregar
          </button>
          {!chunk && (
            <button
              onClick={reset}
              className="w-full py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-mid)', background: 'transparent' }}
            >
              Tentar de novo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
