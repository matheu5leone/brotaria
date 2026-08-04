import { NextResponse } from 'next/server';
import { getGardenWaterings } from '@/services/neighborService';

/**
 * Rastro visual: plantas do jardim regadas por vizinhos nas últimas 24h.
 * Leitura pública (o jardim já é público) e sem dado sensível — só o apelido
 * de quem regou, que o próprio jardim já exibe.
 */
export async function GET(request: Request) {
  const ownerId = new URL(request.url).searchParams.get('ownerId');
  if (!ownerId) return NextResponse.json({ error: 'Missing ownerId' }, { status: 400 });
  return NextResponse.json({ waterings: await getGardenWaterings(ownerId) });
}
