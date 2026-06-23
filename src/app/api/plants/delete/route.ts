import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function DELETE(req: NextRequest) {
  try {
    const { plantId, potId } = await req.json();

    if (!plantId || !potId) {
      return NextResponse.json({ error: 'Plant ID and Pot ID are required' }, { status: 400 });
    }

    // 1. Atualizar o vaso para remover a referência à planta
    const { error: potError } = await supabaseAdmin
      .from('pots')
      .update({ plant_id: null })
      .eq('id', potId);

    if (potError) throw potError;

    // 2. Deletar a planta (isso disparará o cascade nas versões se configurado, ou deletamos manualmente)
    const { error: plantError } = await supabaseAdmin
      .from('plants')
      .delete()
      .eq('id', plantId);

    if (plantError) throw plantError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Delete Plant] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
