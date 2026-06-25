import { supabaseAdmin } from '@/lib/supabaseServer';
import type { User } from '@supabase/supabase-js';

export async function getAuthUser(request: Request): Promise<User | null> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}
