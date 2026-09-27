'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GardenVisit } from '@/components/GardenVisit';

/**
 * A mesma tela de jardim, endereçada por query (`/jardim?u=lele`).
 *
 * É a rota que o app usa para tudo — dono e visita —, porque não é dinâmica e
 * portanto sobrevive ao export estático. No site ela também funciona; quem
 * compartilha continua espalhando `/jardim/<apelido>`. Use `gardenPath()` para
 * montar link interno em vez de escolher uma das duas na mão.
 */
function JardimPorQuery() {
  const params = useSearchParams();
  return <GardenVisit nickname={(params.get('u') ?? '').trim()} />;
}

export default function JardimPage() {
  // useSearchParams precisa de fronteira de Suspense em página pré-renderizada:
  // no HTML gerado no build ainda não existe query nenhuma.
  return (
    <Suspense fallback={null}>
      <JardimPorQuery />
    </Suspense>
  );
}
