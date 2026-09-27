import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getSiteUrl } from '@/lib/siteUrl';
import { OG_SIZE } from '@/lib/og/jardimCard';

/** URL absoluta do card: crawler de rede social não resolve caminho relativo. */
function cardUrl(nickname: string) {
  return `${getSiteUrl()}/api/og/jardim?u=${encodeURIComponent(nickname)}`;
}

/**
 * Layout server-side do jardim visitado. Existe só para poder exportar
 * `generateMetadata` (título/descrição personalizados por apelido) — a página
 * em si é client component e não consegue exportar metadados.
 *
 * A imagem do card vem de `/api/og/jardim` — e é apontada à mão aqui, porque a
 * convenção `opengraph-image.tsx` não sobrevive ao build do app (ver o próprio
 * card em `@/lib/og/jardimCard`).
 */
export async function generateMetadata(
  { params }: { params: Promise<{ nickname: string }> },
): Promise<Metadata> {
  const { nickname: raw } = await params;
  const clean = decodeURIComponent(raw).replace(/^@/, '').trim();

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, nickname')
    .ilike('nickname', clean.toLowerCase())
    .single();

  if (!profile) {
    const title = `@${clean} não encontrado · Brotaria`;
    return { title, description: 'Este jardim não existe (ainda). Crie o seu no Brotaria.' };
  }


  const { count } = await supabaseAdmin
    .from('pots')
    .select('plant_id', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .not('plant_id', 'is', null);

  const plantCount = count ?? 0;
  const plantsPhrase =
    plantCount === 0 ? 'um jardim recém-plantado'
    : plantCount === 1 ? 'a planta única'
    : `as ${plantCount} plantas únicas`;

  const title = `Jardim de @${profile.nickname} · Brotaria`;
  const description = `Conheça ${plantsPhrase} que @${profile.nickname} cultivou no Brotaria — e comece o seu jardim virtual gerado por IA.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/jardim/${profile.nickname}`,
      siteName: 'Brotaria',
      locale: 'pt_BR',
      images: [{ url: cardUrl(profile.nickname), ...OG_SIZE, alt: `Jardim de @${profile.nickname}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [cardUrl(profile.nickname)],
    },
  };
}

export default function JardimLayout({ children }: { children: React.ReactNode }) {
  return children;
}
