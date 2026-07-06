import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getMission } from '@/config/missions';
import { canClaimMission } from '@/lib/missionStatus';
import { addStackableItem } from '@/services/inventoryService';

/**
 * Resgata a recompensa (1 semente) de uma missão concluída, uma única vez.
 * A unicidade é garantida pela constraint (user_id, mission_key); se a entrega
 * da semente falhar, a claim é revertida (padrão de compensação do store/buy).
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let key: unknown;
  try {
    ({ key } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  const mission = typeof key === 'string' ? getMission(key) : undefined;
  if (!mission) return NextResponse.json({ error: 'Missão inválida.' }, { status: 404 });

  // 1. Confere no servidor: pode resgatar se atingiu a meta agora OU antes (pico).
  if (!(await canClaimMission(user.id, mission))) {
    return NextResponse.json(
      { error: 'Missão ainda não concluída.', code: 'MISSION_NOT_COMPLETE' },
      { status: 400 },
    );
  }

  // 2. Registra o resgate (unique constraint impede resgate duplo)
  const { error: claimErr } = await supabaseAdmin
    .from('mission_claims')
    .insert({ user_id: user.id, mission_key: mission.key });

  if (claimErr) {
    if ((claimErr as { code?: string }).code === '23505') {
      return NextResponse.json(
        { error: 'Recompensa já resgatada.', code: 'ALREADY_CLAIMED' },
        { status: 409 },
      );
    }
    console.error('[Missions] Falha ao registrar claim:', claimErr);
    return NextResponse.json({ error: 'Falha ao resgatar.' }, { status: 500 });
  }

  // 3. Entrega a semente; se falhar, reverte a claim (compensação)
  try {
    await addStackableItem(user.id, 'seed');
  } catch (err) {
    await supabaseAdmin
      .from('mission_claims')
      .delete()
      .eq('user_id', user.id)
      .eq('mission_key', mission.key);

    if ((err as { code?: string }).code === 'INVENTORY_FULL') {
      return NextResponse.json(
        { error: 'Inventário cheio. Libere espaço e tente de novo.', code: 'INVENTORY_FULL' },
        { status: 409 },
      );
    }
    console.error('[Missions] Falha ao entregar semente:', err);
    return NextResponse.json({ error: 'Falha ao entregar a recompensa.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, mission: mission.key });
}
