import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

/**
 * Beacon de erro CLIENT-SIDE. Recebe o que o navegador captura (window.onerror,
 * unhandledrejection, error boundaries, boot) e grava em public.client_errors.
 *
 * Propositalmente SEM auth (erros acontecem pré-login e no boot) e à prova de
 * falha: nunca lança, sempre responde rápido (204). user_id vem do corpo
 * (não-confiável, best-effort) — bom o suficiente para diagnóstico.
 */

const MAX = { message: 4000, stack: 8000, url: 2000, ua: 1000, userId: 100, kind: 40 };
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : null);

function browserOf(ua: string): string {
  const s = ua.toLowerCase();
  if (s.includes('firefox') || s.includes('fxios')) return 'firefox';
  if (s.includes('edg/')) return 'edge';
  if (s.includes('samsungbrowser')) return 'samsung';
  if (s.includes('opr/') || s.includes('opera')) return 'opera';
  // Safari deve ser checado antes do Chrome (Safari não contém "chrome"; Chrome contém "safari")
  if (s.includes('chrome') || s.includes('crios')) return 'chrome';
  if (s.includes('safari')) return 'safari';
  return 'other';
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { /* corpo vazio/inválido → grava mesmo assim */ }

    const ua = request.headers.get('user-agent') ?? '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip') ?? null;

    await supabaseAdmin.from('client_errors').insert({
      user_id: clip(body.userId, MAX.userId),
      kind: clip(body.kind, MAX.kind),
      message: clip(body.message, MAX.message),
      stack: clip(body.stack, MAX.stack),
      url: clip(body.url, MAX.url),
      user_agent: ua.slice(0, MAX.ua),
      browser: browserOf(ua),
      app_version: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      ip,
    });
  } catch (err) {
    // Telemetria nunca pode virar mais um erro visível. Só loga no servidor.
    console.error('[client-error] falha ao gravar:', err);
  }
  // 204 sempre — o beacon não espera resposta útil.
  return new NextResponse(null, { status: 204 });
}
