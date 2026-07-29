import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { wakeGnome, getGnomeStatus } from '@/services/gnomeService';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const r = await wakeGnome(user.id);
  if (!r.ok) {
    const status = r.code === 'LOCKED' ? 403 : 409;
    return NextResponse.json({ error: r.code, code: r.code }, { status });
  }
  return NextResponse.json({ ok: true, status: await getGnomeStatus(user.id) });
}
