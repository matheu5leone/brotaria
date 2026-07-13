import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabaseServer';

/**
 * Layout server-side do jardim visitado. Existe só para poder exportar
 * `generateMetadata` (título/descrição personalizados por apelido) — a página
 * em si é client component e não consegue exportar metadados.
 *
 * A imagem do card vem de `opengraph-image.tsx` (mesmo segmento), que o Next
 * injeta automaticamente como og:image / twitter:image.
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
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function JardimLayout({ children }: { children: React.ReactNode }) {
  return children;
}
