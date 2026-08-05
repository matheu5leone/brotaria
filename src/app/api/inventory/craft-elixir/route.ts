import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { craftElixir } from '@/services/beeService';

/** Transforma ELIXIR_POLEN_COST de pólen em 1 Elixir Floral. */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const r = await craftElixir(user.id);
  if (!r.ok) return NextResponse.json({ error: r.code, code: r.code }, { status: 409 });
  return NextResponse.json(r);
}
