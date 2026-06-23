import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Workaround para @supabase/supabase-js@2.107.0 + Next.js 16 Turbopack:
 *
 * O cliente auto-gera 'X-Client-Info: supabase-js/2.107.0; runtime=web; runtime-version=...'
 * onde o campo runtime-version pode conter caracteres não-ASCII quando bundlado pelo Turbopack
 * (process.version polyfill retorna algo fora do range ISO-8859-1).
 *
 * Isso causa "String contains non ISO-8859-1 code point" no construtor de Headers()
 * do PostgrestClient, ANTES do fetch() ser chamado — tornando todas as queries falhas.
 *
 * Solução: fornecer um X-Client-Info limpo via global.headers. O merge em createClient
 * acontece antes do PostgrestClient ser construído, sobrescrevendo o valor problemático.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      // Valor ASCII puro — substitui o X-Client-Info gerado automaticamente
      'X-Client-Info': 'supabase-js/2.107.0',
    },
  },
});
