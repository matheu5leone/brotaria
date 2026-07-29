import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getGnomeStatus } from '@/services/gnomeService';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await getGnomeStatus(user.id));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
