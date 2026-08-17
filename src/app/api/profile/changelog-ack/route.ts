import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { CURRENT_VERSION, isKnownVersion } from '@/config/changelog';

/**
 * Marca a nota de atualização como lida até uma versão.
 * O body é opcional: sem `version`, grava a versão atual do jogo.
 * Só aceita versão que existe no changelog — não grava string arbitrária.
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let version = CURRENT_VERSION;
  try {
    const body = await request.json();
    if (typeof body?.version === 'string' && isKnownVersion(body.version)) {
      version = body.version;
    }
  } catch {
    // body vazio ou inválido — segue com a versão atual
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ last_changelog_version: version })
    .eq('id', user.id);

  if (error) {
    console.error('[Changelog] Falha ao marcar nota como lida:', error);
    return NextResponse.json({ error: 'Falha ao confirmar.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, version });
}
