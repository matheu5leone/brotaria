import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// No backend, usamos a SERVICE_ROLE_KEY se disponível (para bypassar RLS).
// Caso contrário, usamos a ANON_KEY para não quebrar a execução com 'Invalid API key'.
const keyToUse = (supabaseServiceKey && supabaseServiceKey !== 'mock-service-role-key') 
  ? supabaseServiceKey 
  : supabaseAnonKey;

export const supabaseAdmin = createClient(supabaseUrl, keyToUse);
