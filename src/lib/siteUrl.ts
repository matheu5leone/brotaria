/**
 * URL base canônica do site, usada em `metadataBase` (Open Graph) e para montar
 * URLs absolutas de compartilhamento.
 *
 * Ordem de resolução:
 *  1. NEXT_PUBLIC_SITE_URL   — override manual (ex.: domínio próprio)
 *  2. VERCEL_PROJECT_PRODUCTION_URL — domínio de produção estável na Vercel
 *  3. VERCEL_URL             — deploy de preview
 *  4. localhost              — dev local
 *
 * As três primeiras só existem no SERVIDOR. Por isso o next.config resolve o
 * valor no build e o embute como NEXT_PUBLIC_SITE_URL: chamada daqui de dentro
 * de um client component (link de convite, base da API no app) cairia no
 * fallback de localhost, sem erro nenhum na tela.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;

  const preview = process.env.VERCEL_URL;
  if (preview) return `https://${preview}`;

  return 'http://localhost:3000';
}
