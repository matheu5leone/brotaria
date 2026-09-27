import type { NextConfig } from "next";
import { getSiteUrl } from "./src/lib/siteUrl";

/**
 * Dois destinos de build a partir do mesmo código (ver src/config/runtime.ts):
 *
 *   BUILD_TARGET ausente/"web" → Next completo na Vercel (o de sempre).
 *   BUILD_TARGET="app"         → export estático para dentro do Capacitor.
 *
 * O destino app não tem servidor: headers, redirects e proxy não existem lá, e
 * as 65 rotas de /api continuam só no web. Por isso a config é bifurcada em vez
 * de duplicada — um arquivo só, e o que é do servidor fica cercado.
 */
const BUILD_TARGET = process.env.BUILD_TARGET === "app" ? "app" : "web";
const IS_APP = BUILD_TARGET === "app";

// Resolvido aqui, no build, onde as variáveis da Vercel ainda são visíveis: o
// navegador não tem process.env, e o cliente precisa saber a URL canônica para
// montar link de convite e, no app, para achar a API.
const SITE_URL = getSiteUrl();

// O build do app roda fora da Vercel, onde as variáveis de sistema dela não
// existem — e um app com localhost gravado como endereço da API só funciona na
// máquina de quem compilou, sem nenhum erro visível. Falhar aqui é mais barato.
if (IS_APP && SITE_URL.includes('localhost')) {
  throw new Error(
    'BUILD_TARGET=app precisa de NEXT_PUBLIC_SITE_URL com o domínio real da API. Use `npm run build:app`.',
  );
}

const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // static.cloudflareinsights.com: a Cloudflare INJETA o beacon do Web
      // Analytics automaticamente no HTML que passa por ela. Sem este host o
      // script é bloqueado e o analytics simplesmente não coleta nada.
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co",
      // wss:// explícito p/ o realtime do Supabase: Chrome relaxa https->wss, mas
      // Firefox/Safari são estritos e bloqueiam o WebSocket sem isto (SecurityError
      // "The operation is insecure" → crash). Ver client-error-telemetry.
      // cloudflareinsights.com também no connect-src: o beacon POSTa a telemetria
      // em /cdn-cgi/rum. Liberar só o script deixaria o erro trocar de directive.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://openrouter.ai https://cloudflareinsights.com https://static.cloudflareinsights.com",
      "frame-src 'self' https://challenges.cloudflare.com",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  // No site vale tudo, mais o sufixo `.web.tsx` das rotas que só existem aqui.
  ...(IS_APP ? {} : { pageExtensions: ["web.tsx", "tsx", "ts", "jsx", "js"] }),
  ...(IS_APP
    ? {
        output: "export" as const,
        // Como o app é exportado como arquivo estático, ele não pode conter
        // nada que precise de servidor. A seleção é por EXTENSÃO, sem mover
        // arquivo de lugar nem manter duas árvores de rotas:
        //   route.ts      → as 65 rotas de /api ficam de fora (não são .tsx)
        //   *.web.tsx     → rota só-do-site fica de fora (rota dinâmica, que o
        //                   export não gera, e o card de Open Graph)
        pageExtensions: ["tsx"],
        // A WebView serve arquivo do pacote, não tem rewrite: com barra no fim o
        // export emite `craft/index.html`, que resolve como diretório.
        trailingSlash: true,
      }
    : {}),
  // O getSiteUrl() lê VERCEL_PROJECT_PRODUCTION_URL, que só existe no servidor:
  // chamado num client component, cairia no fallback de localhost. Resolvido
  // aqui, no build, o valor é embutido no bundle e o navegador enxerga o mesmo
  // domínio canônico que o metadataBase. O destino do build entra pelo mesmo
  // caminho — é o que diz ao cliente se a API mora na mesma origem ou na Vercel.
  env: {
    NEXT_PUBLIC_SITE_URL: SITE_URL,
    NEXT_PUBLIC_BUILD_TARGET: BUILD_TARGET,
  },
  images: {
    // Otimização da Vercel DESLIGADA de propósito. A cota de "Image
    // Transformations" (5.000/mês no free) é contada por variante ÚNICA de
    // (imagem + largura + qualidade + formato). Como cada planta de IA e cada
    // avatar é uma imagem única, o otimizador estourava a cota sozinho.
    //
    // E não precisamos dele: TODOS os assets já são WebP (estáticos convertidos
    // + imagens de IA encodadas em WebP antes de subir pro Supabase). Otimizar
    // WebP-já-pronto é gasto puro. `unoptimized` serve o arquivo cru → 0
    // transformations, e o next/image continua funcionando (só sem resize/srcset).
    // Se um dia a banda pesar, reduzir a resolução das imagens de IA no upload.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Sem servidor no destino app: o Next rejeita headers/redirects com
  // `output: "export"`, e a CSP ali não se aplica (os assets são locais).
  ...(IS_APP ? {} : {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      // Domínio canônico: qualquer acesso pelo host antigo (*.vercel.app) é
      // redirecionado 308 para brotaria.online, preservando o caminho.
      // Só dispara quando Host === brotaria.vercel.app; brotaria.online passa
      // pela Cloudflare e nunca casa aqui, então não há loop.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'brotaria.vercel.app' }],
        destination: 'https://brotaria.online/:path*',
        permanent: true,
      },
    ];
  },
  }),
};

export default nextConfig;
