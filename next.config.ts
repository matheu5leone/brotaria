import type { NextConfig } from "next";

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
};

export default nextConfig;
