'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Fix para @supabase/supabase-js@2.107.0 + Next.js 16 Turbopack em Chrome Mobile.
 *
 * Raiz do problema:
 *   1. Turbopack injeta um polyfill de `process` no browser com `process.version`
 *      contendo caracteres fora do range ISO-8859-1 em Chrome Android.
 *   2. supabase-js lê `process.version` para construir o header
 *      'X-Client-Info: supabase-js/2.107.0; runtime=web; runtime-version=<version>'
 *   3. O PostgRestClient chama `new Headers({ 'X-Client-Info': valor_ruim })`
 *      que lança em Chrome Mobile ANTES que qualquer fetch wrapper possa interceptar.
 *
 * Solução em camadas:
 *   1. Sanitizar `process.version` antes que supabase-js o leia.
 *   2. safeFetch para cobrir qualquer header ruim restante em GoTrueClient.
 *   3. global.headers para sobrescrever X-Client-Info limpo no merge do createClient.
 */

// Camada 1: sanitizar process.version no polyfill do browser
if (typeof process !== 'undefined' && typeof process.version === 'string') {
  const cleanVersion = process.version.replace(/[^\x20-\x7E]/g, '');
  try {
    Object.defineProperty(process, 'version', {
      value: cleanVersion,
      writable: true,
      configurable: true,
    });
  } catch {
    // Se não conseguir redefinir, força via atribuição direta
    (process as NodeJS.Process & { version: string }).version = cleanVersion;
  }
}

const CLEAN_CLIENT_INFO = 'supabase-js/2.107.0';

// Camada 2: safeFetch para sanitizar qualquer header ruim que ainda escapar
const safeFetch: typeof fetch = (input, init) => {
  if (!init?.headers) return fetch(input, init);

  const safe: Record<string, string> = {};

  if (init.headers instanceof Headers) {
    init.headers.forEach((value, key) => {
      safe[key] = value.replace(/[^\x20-\x7E]/g, '');
    });
  } else if (Array.isArray(init.headers)) {
    for (const [key, value] of init.headers) {
      safe[key] = typeof value === 'string' ? value.replace(/[^\x20-\x7E]/g, '') : value;
    }
  } else {
    for (const [key, value] of Object.entries(init.headers as Record<string, string>)) {
      safe[key] = typeof value === 'string' ? value.replace(/[^\x20-\x7E]/g, '') : value;
    }
  }

  // Camada 3: força X-Client-Info limpo em toda e qualquer chamada
  safe['X-Client-Info'] = CLEAN_CLIENT_INFO;

  return fetch(input, { ...init, headers: safe });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: { 'X-Client-Info': CLEAN_CLIENT_INFO },
    fetch: safeFetch,
  },
});
