import { getSiteUrl } from '@/lib/siteUrl';

/**
 * Onde este build está rodando, e onde ele busca a API.
 *
 * O jogo é compilado para DOIS destinos a partir deste mesmo repositório:
 *
 *   web  — Next completo na Vercel. Páginas e API na mesma origem.
 *   app  — export estático dentro do Capacitor. A página abre de
 *          `https://localhost` (Android) ou `capacitor://localhost` (iOS), e a
 *          API continua na Vercel. Caminho relativo ali procuraria dentro do
 *          pacote do app e daria 404.
 *
 * O valor é resolvido em tempo de BUILD e embutido no bundle pelo `env` do
 * next.config. O acesso a `process.env` aqui é literal de propósito:
 * desestruturar não funciona, porque o que acontece é substituição de texto.
 */
export const BUILD_TARGET: 'web' | 'app' =
  process.env.NEXT_PUBLIC_BUILD_TARGET === 'app' ? 'app' : 'web';

/**
 * Prefixo das chamadas de API. Vazio no web de propósito: mantém a chamada
 * relativa e de mesma origem, sem CORS e sem preflight.
 */
export const API_BASE: string = BUILD_TARGET === 'app' ? getSiteUrl() : '';

/** Caminho de API (`/api/...`) → URL que funciona nos dois destinos. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
