import { jardimCard } from '@/lib/og/jardimCard';

/**
 * Imagem de compartilhamento do jardim: `/api/og/jardim?u=<apelido>`.
 *
 * É uma rota de API, e não a convenção `opengraph-image.tsx`, por causa do
 * build do app — que é export estático e não aceita arquivo-especial em rota
 * dinâmica. Aqui a imagem fica junto do resto que só existe no servidor, e o
 * `layout.tsx` do jardim aponta para esta URL nos metadados.
 *
 * Sem JSX neste arquivo de propósito: o desenho mora em `@/lib/og/jardimCard`,
 * um módulo comum, para que o arquivo da rota possa ser `.ts` — é a extensão
 * que mantém a rota fora do build do app.
 */
export const revalidate = 3600;

export async function GET(req: Request) {
  const nickname = new URL(req.url).searchParams.get('u') ?? '';
  return jardimCard(nickname);
}
