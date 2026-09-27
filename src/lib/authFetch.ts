'use client';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/config/runtime';

/**
 * Funil ÚNICO de chamada autenticada à API. É aqui que o destino app ganha a
 * base absoluta: no web `API_BASE` é vazio e a chamada continua relativa, na
 * mesma origem, sem CORS.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};

  // Copy existing headers
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => { headers[k] = v; });
    } else if (Array.isArray(options.headers)) {
      for (const [k, v] of options.headers) headers[k] = v;
    } else {
      Object.assign(headers, options.headers);
    }
  }

  if (!headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  // Só caminho relativo ganha prefixo: URL absoluta (Supabase, Stripe) passa reta.
  const target = url.startsWith('/') ? `${API_BASE}${url}` : url;
  return fetch(target, { ...options, headers });
}
