import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Wrapper de fetch que remove caracteres fora do range ASCII imprimível
 * dos valores de header antes de chamar o fetch nativo.
 *
 * Workaround para @supabase/supabase-js@2.107.0 que pode incluir
 * caracteres Unicode no X-Client-Info quando bundlado pelo Turbopack,
 * causando: "String contains non ISO-8859-1 code point" no browser.
 *
 * IMPORTANTE: trata os três formatos possíveis de HeadersInit:
 *   1. Headers instance (usado pelo cliente PostgREST internamente)
 *   2. Array de [key, value] pairs
 *   3. Objeto simples Record<string, string>
 */
const safeFetch: typeof fetch = (input, init) => {
  if (!init?.headers) return fetch(input, init);

  const safe: Record<string, string> = {};

  if (init.headers instanceof Headers) {
    // Caso 1: Headers instance — usar forEach para iterar
    init.headers.forEach((value, key) => {
      safe[key] = value.replace(/[^\x20-\x7E]/g, '');
    });
  } else if (Array.isArray(init.headers)) {
    // Caso 2: Array de [key, value]
    for (const [key, value] of init.headers) {
      safe[key] = typeof value === 'string' ? value.replace(/[^\x20-\x7E]/g, '') : value;
    }
  } else {
    // Caso 3: Objeto simples Record<string, string>
    for (const [key, value] of Object.entries(init.headers as Record<string, string>)) {
      safe[key] = typeof value === 'string' ? value.replace(/[^\x20-\x7E]/g, '') : value;
    }
  }

  return fetch(input, { ...init, headers: safe });
};

// Client para uso no Frontend (Client Components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: safeFetch },
});
