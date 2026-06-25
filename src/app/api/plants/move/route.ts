import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/getAuthUser';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { fromPotId, toPotId } = await request.json();
    if (!fromPotId || !toPotId) return NextResponse.json({ error: 'Missing fromPotId or toPotId' }, { status: 400 });
    if (fromPotId === toPotId) return NextResponse.json({ error: 'Pots são iguais' }, { status: 400 });

    // Busca pot de origem com planta
    const { data: fromPot } = await supabaseAdmin
      .from('pots')
      .select('id, plant_id')
      .eq('id', fromPotId)
      .eq('user_id', user.id)
      .single();

    if (!fromPot?.plant_id) return NextResponse.json({ error: 'Canteiro de origem sem planta' }, { status: 404 });

    // Pot de destino deve estar vazio
    const { data: toPot } = await supabaseAdmin
      .from('pots')
      .select('id, plant_id, pos_x, pos_y')
      .eq('id', toPotId)
      .eq('user_id', user.id)
      .single();

    if (!toPot) return NextResponse.json({ error: 'Canteiro de destino não encontrado' }, { status: 404 });
    if (toPot.plant_id) return NextResponse.json({ error: 'Canteiro de destino ocupado', code: 'OCCUPIED' }, { status: 400 });

    // Busca planta para verificar águas
    const { data: plant } = await supabaseAdmin
      .from('plants')
      .select('id, current_stage_waters, satisfacao')
      .eq('id', fromPot.plant_id)
      .single();

    if (!plant) return NextResponse.json({ error: 'Planta não encontrada' }, { status: 404 });

    const stressed = plant.current_stage_waters === 0;
    const newWaters  = Math.max(0, plant.current_stage_waters - 1);
    const newSatisfacao = stressed ? (plant.satisfacao ?? 0) - 1 : (plant.satisfacao ?? 0);

    // Move planta: desvincula do pot original, vincula ao destino
    await supabaseAdmin.from('pots').update({ plant_id: null }).eq('id', fromPotId);
    await supabaseAdmin.from('pots').update({ plant_id: fromPot.plant_id }).eq('id', toPotId);
    await supabaseAdmin
      .from('plants')
      .update({ current_stage_waters: newWaters, satisfacao: newSatisfacao })
      .eq('id', fromPot.plant_id);

    return NextResponse.json({ success: true, stressed, satisfacao: newSatisfacao });
  } catch (err: unknown) {
    console.error('[Move Plant]', err);
    return NextResponse.json({ error: 'Erro ao mover planta' }, { status: 500 });
  }
}
