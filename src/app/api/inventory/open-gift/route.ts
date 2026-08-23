import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { PlantDNA } from '@/types';
import { getAuthUser } from '@/lib/getAuthUser';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemId } = await request.json();
    const userId = user.id;

    if (!itemId) {
      return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
    }

    // 1. Busca o item wrapped_plant
    const { data: item, error: itemError } = await supabaseAdmin
      .from('inventory_items')
      .select('id, plant_id, slot_index')
      .eq('id', itemId)
      .eq('user_id', userId)
      .eq('item_type', 'wrapped_plant')
      .single();

    if (itemError || !item || !item.plant_id) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    // 2. Busca DNA e estágio atual da planta (para a animação de raridade)
    const { data: plant, error: plantError } = await supabaseAdmin
      .from('plants')
      .select('dna, current_stage:plant_stages(order_index)')
      .eq('id', item.plant_id)
      .single();

    if (plantError || !plant) {
      return NextResponse.json({ error: 'Planta não encontrada' }, { status: 404 });
    }

    // 3. Muda wrapped_plant → plant no mesmo slot, limpa a label
    const { error: updateError } = await supabaseAdmin
      .from('inventory_items')
      .update({ item_type: 'plant', label: null })
      .eq('id', itemId);

    if (updateError) throw updateError;

    // 4. Crédito da missão "presentear alguém" — para o REMETENTE, e só agora.
    //    Enviar não bastava: o destinatário podia recusar (planta volta) ou
    //    nunca abrir, e o remetente já tinha levado a recompensa. O presente só
    //    conta quando chega de fato do outro lado.
    //
    //    A troca de status 'accepted' → 'opened' é o cadeado de idempotência:
    //    quem credita é o UPDATE condicional, então abrir duas vezes (ou uma
    //    request repetida) não paga duas.
    const { data: gift } = await supabaseAdmin
      .from('gifts')
      .select('id, sender_id')
      .eq('plant_id', item.plant_id)
      .eq('recipient_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gift?.sender_id) {
      const { data: creditou } = await supabaseAdmin
        .from('gifts')
        .update({ status: 'opened' })
        .eq('id', gift.id)
        .eq('status', 'accepted')
        .select('id')
        .maybeSingle();

      if (creditou) {
        const { data: prof } = await supabaseAdmin
          .from('profiles').select('total_gifts_sent').eq('id', gift.sender_id).single();
        await supabaseAdmin
          .from('profiles')
          .update({ total_gifts_sent: (prof?.total_gifts_sent ?? 0) + 1 })
          .eq('id', gift.sender_id);
      }
    }

    type StageRow = { order_index: number };
    const stageOrder = (plant.current_stage as unknown as StageRow | null)?.order_index ?? 1;

    return NextResponse.json({
      success: true,
      dna: plant.dna as unknown as PlantDNA,
      stageOrder,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to open gift';
    console.error('[Open Gift API] Error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
