import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { collectGnomeBucket, getGnomeStatus } from '@/services/gnomeService';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const r = await collectGnomeBucket(user.id);
  if (!r.ok) {
    const status = r.code === 'LOCKED' ? 403 : 409;
    return NextResponse.json({ error: r.code, code: r.code }, { status });
  }
  return NextResponse.json({ ok: true, balance: r.balance, status: await getGnomeStatus(user.id) });
}
