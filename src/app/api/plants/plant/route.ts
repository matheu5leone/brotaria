import { NextResponse } from 'next/server';
import { plantSeed } from '@/services/inventoryService';
import { getAuthUser } from '@/lib/getAuthUser';
import { RARITY_ORDER } from '@/config/rarity';
import type { Rarity, Biome } from '@/types';

const BIOMES: string[] = ['planicie', 'floresta', 'deserto', 'montanha', 'pantano', 'oceano', 'vulcao', 'tundra', 'selva', 'caverna'];

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { potId, seedRarity, seedBiome } = await request.json();
    const userId = user.id;

    if (!potId) {
      return NextResponse.json({ error: 'Missing potId' }, { status: 400 });
    }

    const rarity: Rarity | null =
      typeof seedRarity === 'string' && (RARITY_ORDER as string[]).includes(seedRarity)
        ? (seedRarity as Rarity)
        : null;
    const biome: Biome | null =
      typeof seedBiome === 'string' && BIOMES.includes(seedBiome) ? (seedBiome as Biome) : null;

    const plant = await plantSeed(userId, potId, rarity, biome);

    return NextResponse.json({ success: true, plant });
  } catch (error: unknown) {
    console.error('[Plant API] Error:', error);
    const e = error as { code?: string; message?: string };

    // Erro de negócio esperado: usuário sem sementes -> 400 com código para a UI
    // abrir o popup de compra de moedas em vez de tratar como falha do servidor.
    if (e?.code === 'NO_SEEDS') {
      return NextResponse.json(
        { error: 'No seeds available', code: 'NO_SEEDS' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: e?.message || 'Failed to plant seed' }, { status: 500 });
  }
}
