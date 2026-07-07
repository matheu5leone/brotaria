import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getAvatarsForUser } from '@/services/avatarService';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await getAvatarsForUser(user.id);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[Avatars API] Error:', err);
    return NextResponse.json({ error: 'Failed to load avatars' }, { status: 500 });
  }
}
