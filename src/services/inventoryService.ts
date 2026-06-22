import { supabaseAdmin } from '@/lib/supabaseServer';
import { generateRandomDNA } from './dnaService';

// ── Helpers de slot ────────────────────────────────────────────────────────

/** Retorna o primeiro slot com espaço para empilhar (quantity < 10), ou null. */
async function findStackableSlot(userId: string, itemType: 'seed' | 'wrapping_kit') {
  const { data } = await supabaseAdmin
    .from('inventory_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .lt('quantity', 10)
    .order('slot_index', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Retorna o próximo índice de slot vazio (0-9), ou null se inventário cheio. */
export async function findFreeSlot(userId: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from('inventory_items')
    .select('slot_index')
    .eq('user_id', userId);
  const used = new Set((data ?? []).map((r) => r.slot_index as number));
  for (let i = 0; i < 10; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}

/** Adiciona 1 unidade de um item empilhável ao inventário do usuário. */
export async function addStackableItem(
  userId: string,
  itemType: 'seed' | 'wrapping_kit',
  retried = false,
): Promise<void> {
  const stackable = await findStackableSlot(userId, itemType);
  if (stackable) {
    const { error } = await supabaseAdmin
      .from('inventory_items')
      .update({ quantity: stackable.quantity + 1 })
      .eq('id', stackable.id);
    if (error) throw error;
    return;
  }
  const slot = await findFreeSlot(userId);
  if (slot === null) {
    throw Object.assign(new Error('Inventário cheio'), { code: 'INVENTORY_FULL' });
  }
  const { error } = await supabaseAdmin.from('inventory_items').insert({
    user_id: userId,
    slot_index: slot,
    item_type: itemType,
    quantity: 1,
  });
  if (error) {
    // Unique constraint violation (concurrent request took the slot) — retry once
    if (!retried && (error as { code?: string }).code === '23505') {
      return addStackableItem(userId, itemType, true);
    }
    throw error;
  }
}

// ── Inicialização ──────────────────────────────────────────────────────────

export async function initializeUser(userId: string, email: string) {
  console.log(`[Inventory] Checking/Initializing user ${userId}`);

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, email: email })
    .select()
    .single();

  if (profileError) {
    console.error('[Inventory] Profile Error:', profileError);
    throw new Error(`Profile initialization failed: ${profileError.message}`);
  }

  // Verifica se usuário já foi inicializado (tem itens no inventário)
  const { count: invCount } = await supabaseAdmin
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (invCount && invCount > 0) {
    console.log(`[Inventory] User ${userId} already initialized.`);
    return { success: true, message: 'Already initialized' };
  }

  console.log(`[Inventory] Granting free seed to ${userId}`);
  await addStackableItem(userId, 'seed');

  return { success: true, message: 'Free seed granted' };
}

// ── Plantar ────────────────────────────────────────────────────────────────

export async function plantSeed(userId: string, potId: string) {
  console.log(`[Inventory] User ${userId} planting seed in pot ${potId}`);

  // 1. Verifica se tem semente no inventário
  const { data: seedSlot, error: seedFetchError } = await supabaseAdmin
    .from('inventory_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('item_type', 'seed')
    .gt('quantity', 0)
    .limit(1)
    .maybeSingle();

  if (seedFetchError || !seedSlot) {
    const err = new Error('No seeds available') as Error & { code?: string };
    err.code = 'NO_SEEDS';
    throw err;
  }

  // 2. Verifica se o pot está vazio
  const { data: pot, error: potFetchError } = await supabaseAdmin
    .from('pots')
    .select('id, plant_id')
    .eq('id', potId)
    .eq('user_id', userId)
    .single();

  if (potFetchError || !pot) throw new Error('Pot not found');
  if (pot.plant_id) throw new Error('Pot is already occupied');

  // 3. Gera DNA
  const dna = generateRandomDNA();

  // 4. Busca estágio inicial
  const { data: stage } = await supabaseAdmin
    .from('plant_stages')
    .select('id')
    .eq('code', 'enterrada')
    .single();

  if (!stage) throw new Error('Initial stage not found');

  // 5. Cria planta
  const { data: plant, error: plantError } = await supabaseAdmin
    .from('plants')
    .insert({
      user_id: userId,
      pot_id: potId,
      dna: dna,
      current_stage_id: stage.id,
      hydration_status: 'hydrated',
      next_water_needed_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (plantError) throw plantError;

  // 6. Atualiza pot e remove semente do inventário
  await supabaseAdmin.from('pots').update({ plant_id: plant.id }).eq('id', potId);

  if (seedSlot.quantity > 1) {
    await supabaseAdmin
      .from('inventory_items')
      .update({ quantity: seedSlot.quantity - 1 })
      .eq('id', seedSlot.id);
  } else {
    await supabaseAdmin.from('inventory_items').delete().eq('id', seedSlot.id);
  }

  return plant;
}
