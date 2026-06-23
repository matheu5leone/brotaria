import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Workaround para @supabase/supabase-js@2.107.0 + Next.js 16 Turbopack:
 *
 * O cliente auto-gera 'X-Client-Info' com caracteres não-ASCII no campo
 * runtime-version (process.version polyfill do Turbopack), causando:
 * "Failed to read the 'headers' property: String contains non ISO-8859-1 code point"
 *
 * Solução dupla:
 * 1. global.headers: fornece X-Client-Info limpo para tentar sobrescrever o ruim
 * 2. safeFetch: intercepta TODA chamada fetch() e sanitiza os headers antes
 *    de chegar ao browser, lidando com os 3 formatos possíveis de HeadersInit
 */
const CLEAN_CLIENT_INFO = 'supabase-js/2.107.0';

const safeFetch: typeof fetch = (input, init) => {
  if (!init?.headers) return fetch(input, init);

  const safe: Record<string, string> = {};

  if (init.headers instanceof Headers) {
    // PostgREST client passa Headers instance
    init.headers.forEach((value, key) => {
      safe[key] = value.replace(/[^\x20-\x7E]/g, '');
    });
  } else if (Array.isArray(init.headers)) {
    for (const [key, value] of init.headers) {
      safe[key] = typeof value === 'string' ? value.replace(/[^\x20-\x7E]/g, '') : value;
    }
  } else {
    // GoTrueClient passa objeto simples — é aqui que estava falhando
    for (const [key, value] of Object.entries(init.headers as Record<string, string>)) {
      safe[key] = typeof value === 'string' ? value.replace(/[^\x20-\x7E]/g, '') : value;
    }
  }

  // Garante que X-Client-Info sempre fica com valor ASCII puro
  safe['X-Client-Info'] = CLEAN_CLIENT_INFO;

  return fetch(input, { ...init, headers: safe });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: { 'X-Client-Info': CLEAN_CLIENT_INFO },
    fetch: safeFetch,
  },
});
