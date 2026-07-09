/**
 * Recuperação de "chunk skew" (defasagem de build) — alternativa GRATUITA ao
 * Vercel Skew Protection (pago).
 *
 * Quando um deploy novo entra no meio da sessão, o navegador tenta baixar um
 * chunk de JS/CSS com hash antigo que já não existe (404) → tela do Next
 * "This page couldn't load". Aqui detectamos o erro e recarregamos UMA vez com
 * cache-bust (?_r=ts), com cooldown anti-loop.
 *
 * Usado em 3 camadas:
 *   1. CHUNK_GUARD_INLINE — script inline no <head> (roda ANTES da hidratação).
 *   2. app/error.tsx        — erro de render/navegação num segmento.
 *   3. app/global-error.tsx — erro no root layout / hidratação.
 */

const RELOAD_KEY = 'brotaria_chunk_reload_at';
const RELOAD_COOLDOWN_MS = 15_000;

function messageOf(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const o = v as { name?: unknown; message?: unknown };
    return `${String(o.name ?? '')} ${String(o.message ?? '')}`;
  }
  return '';
}

/** Heurística: o erro é de carregamento de chunk/módulo (recuperável por reload)? */
export function isChunkError(v: unknown): boolean {
  const msg = messageOf(v);
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Loading CSS chunk/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

/**
 * Recarrega forçando o servidor (cache-bust). No iOS Safari um reload simples
 * às vezes reentrega o HTML/JS antigo do cache — o param novo garante o build atual.
 * @param force ignora o cooldown (ex.: clique manual do usuário no botão).
 * @returns true se disparou o reload; false se suprimido pelo cooldown.
 */
export function reloadWithCacheBust(force = false): boolean {
  if (!force) {
    let last = 0;
    try { last = Number(sessionStorage.getItem(RELOAD_KEY) ?? '0'); } catch { /* indisponível */ }
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false; // evita loop
  }
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* ignora */ }
  try {
    const u = new URL(window.location.href);
    u.searchParams.set('_r', String(Date.now()));
    window.location.replace(u.toString());
  } catch {
    window.location.reload();
  }
  return true;
}

/**
 * Versão auto-contida (sem imports) do guard, para injetar como <script> inline
 * no <head> — executa durante o parse do HTML, ANTES do React hidratar, então
 * pega o 404 do chunk de entrada que o ChunkReloadGuard (React) não alcançava.
 */
export const CHUNK_GUARD_INLINE = `(function(){
try{
var K=${JSON.stringify(RELOAD_KEY)},C=${RELOAD_COOLDOWN_MS};
function bust(){
  try{var l=+(sessionStorage.getItem(K)||0);if(Date.now()-l<C)return;sessionStorage.setItem(K,''+Date.now());}catch(e){}
  try{var u=new URL(location.href);u.searchParams.set('_r',''+Date.now());location.replace(u.toString());}catch(e){location.reload();}
}
function isChunk(m){return /ChunkLoadError|Loading chunk [\\w-]+ failed|Loading CSS chunk|dynamically imported module|Importing a module script failed/i.test(m||'');}
addEventListener('error',function(e){
  var t=e&&e.target;
  if(t&&(t.tagName==='SCRIPT'||t.tagName==='LINK')){var u=t.src||t.href||'';if(u.indexOf('/_next/static/')>-1){bust();return;}}
  var err=e&&e.error;
  if(isChunk(e&&e.message)||(err&&isChunk((err.name||'')+' '+(err.message||''))))bust();
},true);
addEventListener('unhandledrejection',function(e){
  var r=e&&e.reason;if(r&&isChunk((r.name||'')+' '+(r.message||r)))bust();
});
}catch(e){}
})();`;
