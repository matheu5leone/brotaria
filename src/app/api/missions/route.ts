import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getMissionStatus } from '@/lib/missionStatus';

/** Lista as missões do usuário com progresso e estado de resgate (por pico). */
export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const missions = await getMissionStatus(user.id);
  return NextResponse.json(missions);
}
