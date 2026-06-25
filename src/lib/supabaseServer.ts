import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const keyToUse = (supabaseServiceKey && supabaseServiceKey !== 'mock-service-role-key')
  ? supabaseServiceKey
  : supabaseAnonKey;

const CLEAN_CLIENT_INFO = 'supabase-js/2.107.0';

/**
 * O mesmo bug do Android Chrome ocorre no servidor:
 * supabase-js chama Headers.set() com um valor contendo U+FEFF (BOM = 65279)
 * que o undici do Node.js rejeita com "Cannot convert argument to a ByteString".
 * Aplicamos o mesmo safeFetch do supabase.ts para sanitizar no lado server.
 */
const safeFetch: typeof fetch = (input, init) => {
  if (!init?.headers) return fetch(input, init);

  const safe: Record<string, string> = {};

  if (init.headers instanceof Headers) {
    (init.headers as Headers).forEach((value, key) => {
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

  safe['X-Client-Info'] = CLEAN_CLIENT_INFO;

  return fetch(input, { ...init, headers: safe });
};

export const supabaseAdmin = createClient(supabaseUrl, keyToUse, {
  global: {
    headers: { 'X-Client-Info': CLEAN_CLIENT_INFO },
    fetch: safeFetch,
  },
});
