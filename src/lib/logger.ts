import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabaseServer';

const LOG_FILE = path.join(process.cwd(), 'ai_requests.log');
const IS_DEV = process.env.NODE_ENV !== 'production';

/** Remove data URIs/base64 longos para manter o log enxuto (sem imagens). */
function stripBase64(text: string): string {
  return text
    .replace(/data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+/gi, '[base64 removido]')
    .replace(/"b64_json"\s*:\s*"[^"]+"/g, '"b64_json":"[removido]"');
}

/**
 * Loga uma requisição de IA na tabela `ai_requests` (Supabase) — fonte de
 * verdade em produção, onde o filesystem é read-only. Tabela enxuta: só
 * metadados e um excerto da resposta, nunca a imagem.
 *
 * Em dev, também grava no ai_requests.log local (debug rápido).
 * Fire-and-forget: nunca lança — logging não pode derrubar a geração.
 */
export function logAIRequest(
  type: 'LLM' | 'IMAGE',
  model: string,
  payload: unknown,
  response: unknown,
  status: number,
  durationMs?: number,
  error?: string,
) {
  const promptChars = JSON.stringify(payload)?.length ?? 0;
  const raw = typeof response === 'string' ? response : JSON.stringify(response);
  const excerpt = stripBase64(raw ?? '').slice(0, 800);

  supabaseAdmin
    .from('ai_requests')
    .insert({
      type,
      model,
      status,
      duration_ms: durationMs ?? null,
      prompt_chars: promptChars,
      response_excerpt: excerpt,
      error: error ?? null,
    })
    .then(({ error: dbErr }) => {
      if (dbErr) console.error('[Logger] Failed to persist AI log:', dbErr.message);
    });

  if (IS_DEV) {
    const entry = `
[${new Date().toISOString()}] TYPE: ${type} | MODEL: ${model} | STATUS: ${status}${durationMs ? ` | ${durationMs}ms` : ''}
PAYLOAD: ${stripBase64(JSON.stringify(payload)).slice(0, 2000)}
RESPONSE: ${excerpt}
--------------------------------------------------------------------------------
`;
    try {
      fs.appendFileSync(LOG_FILE, entry, 'utf8');
    } catch {
      // filesystem read-only (prod) — banco já cobriu
    }
  }
}
