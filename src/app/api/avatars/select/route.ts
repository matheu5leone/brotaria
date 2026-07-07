import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { selectAvatar } from '@/services/avatarService';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let avatarId: unknown;
  try {
    ({ avatarId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  if (typeof avatarId !== 'string') {
    return NextResponse.json({ error: 'avatarId inválido.' }, { status: 400 });
  }

  try {
    const result = await selectAvatar(user.id, avatarId);
    return NextResponse.json({ success: true, avatarUrl: result.avatarUrl });
  } catch (err) {
    const e = err as Error & { code?: string };
    const status = e.code === 'LOCKED' ? 403 : e.code === 'NOT_FOUND' ? 404 : 500;
    return NextResponse.json({ error: e.message ?? 'Falha ao selecionar avatar.', code: e.code }, { status });
  }
}
