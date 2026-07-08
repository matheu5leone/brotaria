'use client';

import { useEffect } from 'react';

/**
 * Recupera automaticamente da defasagem de build (chunk skew): quando um deploy
 * novo entra no meio da sessão, o navegador pode tentar baixar um chunk de JS/CSS
 * com hash antigo que já não existe (404) → tela "This page couldn't load".
 *
 * Aqui detectamos esse erro e damos UM reload — a página recarrega, pega o HTML
 * novo com os chunks certos e se recupera sozinha. Um cooldown evita loop de
 * reload caso algo persista.
 */
const RELOAD_KEY = 'brotaria_chunk_reload_at';
const RELOAD_COOLDOWN_MS = 15_000;

function messageOf(v: unknown): { name: string; msg: string } {
  if (typeof v === 'string') return { name: '', msg: v };
  if (v && typeof v === 'object') {
    const o = v as { name?: unknown; message?: unknown };
    return { name: String(o.name ?? ''), msg: String(o.message ?? '') };
  }
  return { name: '', msg: '' };
}

function isChunkError(v: unknown): boolean {
  const { name, msg } = messageOf(v);
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Loading CSS chunk/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

export function ChunkReloadGuard() {
  useEffect(() => {
    const reloadOnce = () => {
      let last = 0;
      try { last = Number(sessionStorage.getItem(RELOAD_KEY) ?? '0'); } catch { /* indisponível */ }
      if (Date.now() - last < RELOAD_COOLDOWN_MS) return; // evita loop de reload
      try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* ignora */ }
      window.location.reload();
    };

    const onError = (e: ErrorEvent) => {
      // Falha ao carregar a tag <script>/<link> de um chunk (erro de recurso).
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'SCRIPT' || t.tagName === 'LINK')) {
        const url = (t as HTMLScriptElement).src || (t as HTMLLinkElement).href || '';
        if (url.includes('/_next/static/')) { reloadOnce(); return; }
      }
      if (isChunkError(e.error) || isChunkError(e.message)) reloadOnce();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isChunkError(e.reason)) reloadOnce();
    };

    // capture=true para pegar erros de carregamento de recurso (não borbulham).
    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
