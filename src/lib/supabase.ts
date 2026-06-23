import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Wrapper de fetch que remove caracteres fora do range ISO-8859-1 dos
 * valores de header antes de chamar o fetch nativo.
 *
 * Workaround para @supabase/supabase-js@2.107.0 que pode incluir
 * caracteres Unicode (ex: na string de runtime do X-Client-Info) quando
 * bundlado pelo Turbopack/webpack do Next.js, causando o erro:
 * "String contains non ISO-8859-1 code point" no Fetch API do browser.
 */
const safeFetch: typeof fetch = (input, init) => {
  if (!init?.headers) return fetch(input, init);

  const safe: Record<string, string> = {};
  const source = init.headers as Record<string, string>;

  for (const [key, value] of Object.entries(source)) {
    // Mantém apenas caracteres no range ASCII imprimível (0x20–0x7E)
    // para garantir compatibilidade com o header ISO-8859-1 do Fetch API
    safe[key] = typeof value === 'string'
      ? value.replace(/[^\x20-\x7E]/g, '')
      : value;
  }

  return fetch(input, { ...init, headers: safe });
};

// Client para uso no Frontend (Client Components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: safeFetch },
});
