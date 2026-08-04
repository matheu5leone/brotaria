import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getGardenWaterings, getAskingPlantId, hasWateredToday } from '@/services/neighborService';

/**
 * Estado social do jardim:
 *  - `askingPlantId`: a ÚNICA planta que pede ajuda de vizinho hoje (o servidor
 *    é quem decide; o cliente só desenha o balão em cima dela).
 *  - `waterings`: rastro das plantas regadas nas últimas 24h.
 *
 * Leitura pública (o jardim já é público) e sem dado sensível — só o apelido de
 * quem regou, que o próprio jardim já exibe.
 */
export async function GET(request: Request) {
  const ownerId = new URL(request.url).searchParams.get('ownerId');
  if (!ownerId) return NextResponse.json({ error: 'Missing ownerId' }, { status: 400 });

  // Auth é OPCIONAL aqui: visitante deslogado só não recebe o `alreadyWateredByMe`.
  const [waterings, askingPlantId, user] = await Promise.all([
    getGardenWaterings(ownerId),
    getAskingPlantId(ownerId),
    getAuthUser(request).catch(() => null),
  ]);

  const alreadyWateredByMe =
    user && askingPlantId ? await hasWateredToday(user.id, askingPlantId) : false;

  return NextResponse.json({ waterings, askingPlantId, alreadyWateredByMe });
}
