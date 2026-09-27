'use client';

import { useParams } from 'next/navigation';
import { GardenVisit } from '@/components/GardenVisit';

/**
 * URL compartilhável do jardim — só existe no build do site.
 *
 * O `.web.tsx` não é enfeite: é o que tira este arquivo do build do app (ver
 * `pageExtensions` no next.config). Rota dinâmica não sobrevive ao export
 * estático, e é justamente aqui que mora o card de Open Graph do
 * compartilhamento, que só faz sentido servido pela Vercel.
 */
export default function JardimPorApelido() {
  const { nickname } = useParams<{ nickname: string }>();
  return <GardenVisit nickname={nickname ?? ''} />;
}
