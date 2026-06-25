import { createClient } from '@supabase/supabase-js';

/**
 * Mesmo bug do Android Chrome mas no Node.js/Vercel:
 * postgrest-js chama `new Headers()` e depois `headers.set('X-Client-Info', valor_com_BOM)`.
 * O set() acontece ANTES do nosso safeFetch ser chamado, então o safeFetch não consegue
 * interceptar. O undici do Node.js lança TypeError igual ao Chrome Mobile.
 *
 * Solução: patch em globalThis.Headers com SafeHeaders que sobrescreve set() e append()
 * — idêntico ao que fazemos no supabase.ts (browser).
 */
function sanitize(v: string): string {
  return v.replace(/[^\x20-\x7E]/g, '');
}

if (typeof globalThis !== 'undefined' && typeof (globalThis as { Headers?: unknown }).Headers === 'function') {
  const NativeHeaders = (globalThis as { Headers: typeof Headers }).Headers;

  class SafeHeaders extends NativeHeaders {
    constructor(init?: HeadersInit) {
      if (
        init != null &&
        typeof init === 'object' &&
        !Array.isArray(init) &&
        !(init instanceof NativeHeaders)
      ) {
        const sanitized: Record<string, string> = {};
        for (const [k, v] of Object.entries(init as Record<string, string>)) {
          sanitized[k] = typeof v === 'string' ? sanitize(v) : (v as string);
        }
        super(sanitized);
      } else {
        super(init as HeadersInit);
      }
    }

    set(name: string, value: string): void {
      super.set(name, typeof value === 'string' ? sanitize(value) : value);
    }

    append(name: string, value: string): void {
      super.append(name, typeof value === 'string' ? sanitize(value) : value);
    }
  }

  (globalThis as { Headers: typeof Headers }).Headers = SafeHeaders as unknown as typeof Headers;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const keyToUse = (supabaseServiceKey && supabaseServiceKey !== 'mock-service-role-key')
  ? supabaseServiceKey
  : supabaseAnonKey;

const CLEAN_CLIENT_INFO = 'supabase-js/2.107.0';

const safeFetch: typeof fetch = (input, init) => {
  if (!init?.headers) return fetch(input, init);

  const safe: Record<string, string> = {};

  if (init.headers instanceof Headers) {
    (init.headers as Headers).forEach((value, key) => {
      safe[key] = sanitize(value);
    });
  } else if (Array.isArray(init.headers)) {
    for (const [key, value] of init.headers) {
      safe[key] = typeof value === 'string' ? sanitize(value) : value;
    }
  } else {
    for (const [key, value] of Object.entries(init.headers as Record<string, string>)) {
      safe[key] = typeof value === 'string' ? sanitize(value) : value;
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
