'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Fix para @supabase/supabase-js@2.107.0 + Next.js 16 Turbopack em Chrome Mobile Android.
 *
 * Raiz do problema:
 *   1. Turbopack injeta polyfill de `process` no browser com `process.version`
 *      contendo caracteres fora do range ISO-8859-1 em Chrome Android.
 *   2. @supabase/postgrest-js usa esse valor em 'X-Client-Info' e chama
 *      `new Headers({ 'X-Client-Info': valor_ruim })` internamente,
 *      ANTES de chamar o fetch wrapper (safeFetch não consegue interceptar).
 *   3. Chrome Mobile lança TypeError em `new Headers()` com valor não-ASCII.
 *
 * Solução: patch no construtor global `Headers` para sanitizar na origem do throw.
 * Isso cobre qualquer library que chame `new Headers({ key: badValue })`.
 */

// Camada 1: Patch do construtor global Headers — sanitiza valores não-ASCII no ponto do throw
if (typeof globalThis !== 'undefined' && typeof (globalThis as { Headers?: unknown }).Headers === 'function') {
  const NativeHeaders = (globalThis as { Headers: typeof Headers }).Headers;

  class SafeHeaders extends NativeHeaders {
    constructor(init?: HeadersInit) {
      // Sanitiza apenas plain objects; Arrays e instâncias Headers existentes ficam intactos
      if (
        init != null &&
        typeof init === 'object' &&
        !Array.isArray(init) &&
        !(init instanceof NativeHeaders)
      ) {
        const sanitized: Record<string, string> = {};
        for (const [k, v] of Object.entries(init as Record<string, string>)) {
          sanitized[k] = typeof v === 'string' ? v.replace(/[^\x20-\x7E]/g, '') : (v as string);
        }
        super(sanitized);
      } else {
        super(init as HeadersInit);
      }
    }
  }

  (globalThis as { Headers: typeof Headers }).Headers = SafeHeaders as unknown as typeof Headers;
}

// Camada 2: Sanitizar process.version antes que supabase-js o leia
if (typeof process !== 'undefined' && typeof process.version === 'string') {
  const cleanVersion = process.version.replace(/[^\x20-\x7E]/g, '');
  try {
    Object.defineProperty(process, 'version', {
      value: cleanVersion,
      writable: true,
      configurable: true,
    });
  } catch {
    (process as NodeJS.Process & { version: string }).version = cleanVersion;
  }
}

const CLEAN_CLIENT_INFO = 'supabase-js/2.107.0';

// Camada 3: safeFetch — fallback para headers passados como plain object a fetch
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

  safe['X-Client-Info'] = CLEAN_CLIENT_INFO;

  return fetch(input, { ...init, headers: safe });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: { 'X-Client-Info': CLEAN_CLIENT_INFO },
    fetch: safeFetch,
  },
});
