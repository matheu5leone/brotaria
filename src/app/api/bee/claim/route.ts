import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { claimBee } from '@/services/beeService';

/** Clique na abelha pousada → +1 pólen na mochila. */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const r = await claimBee(user.id);
    if (!r.ok) return NextResponse.json({ error: r.code, code: r.code }, { status: 409 });
    return NextResponse.json(r);
  } catch (e) {
    // Sem isto, um erro do Supabase (que não é Error) vira um 500 mudo.
    const msg = (e as { message?: string }).message ?? String(e);
    console.error('[bee/claim] falhou:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
