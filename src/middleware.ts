import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Rate limiter simples via Edge Runtime (in-memory por instância).
 *
 * Limitações:
 *   - Não persiste entre cold starts / instâncias múltiplas (Vercel Hobby)
 *   - Para produção com tráfego real, migrar para @upstash/ratelimit com Redis
 *
 * Configuração por rota:
 *   key = `${ip}:${route}`
 *   window = 60 s (sliding)
 */

const counts = new Map<string, { count: number; resetAt: number }>();

const LIMITS: Record<string, number> = {
  '/api/users/search': 20,         // enumeração de nicknames
  '/api/gifts/send':   5,          // spam de presentes
  '/api/store/buy':    10,         // compras
  '/api/coins/purchase': 5,        // compras de moedas (legado)
  '/api/coins/create-checkout': 8, // criação de sessões Stripe
};

const WINDOW_MS = 60_000;

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Encontra limite para este path (busca prefixo mais longo)
  const limit = Object.entries(LIMITS).find(([route]) => path.startsWith(route))?.[1];
  if (!limit) return NextResponse.next();

  const ip  = getIp(req);
  const key = `${ip}:${path}`;
  const now = Date.now();

  let entry = counts.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    counts.set(key, entry);
  }

  entry.count++;

  if (entry.count > limit) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Tente novamente em breve.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  // NÃO incluir /api/webhooks/stripe — o Stripe precisa de acesso livre.
  matcher: [
    '/api/users/search',
    '/api/gifts/send',
    '/api/store/buy',
    '/api/coins/purchase',
    '/api/coins/create-checkout',
  ],
};
