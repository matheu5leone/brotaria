/**
 * Camada de sonoplastia — síntese via Web Audio (sem arquivos de áudio).
 *
 * O zumbido da abelha é gerado em código: dois osciladores levemente
 * desafinados (o "batimento" que dá corpo ao som) + um LFO modulando a
 * frequência, que é o bater de asa. Sai ~2KB de código em vez de um MP3, toca
 * offline e a afinação é ajustável.
 *
 * Regras respeitadas:
 *  - Autoplay: o AudioContext nasce suspenso; só destrava após um gesto do
 *    usuário. Se ainda estiver suspenso na hora de tocar, o som é descartado
 *    em silêncio (nunca lança).
 *  - Mudo: `localStorage.brotaria_sfx_muted === '1'` silencia tudo.
 *
 * Os demais efeitos (`drumroll`, `reveal`, `polen`) seguem como no-op: o motor
 * já está aqui, é só implementá-los quando quiser.
 */
export type SfxName = 'drumroll' | 'reveal' | 'bee' | 'polen';

const MUTE_KEY = 'brotaria_sfx_muted';

let ctx: AudioContext | null = null;
let unlockBound = false;

function isMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

/** Deixa o contexto pronto no primeiro gesto do usuário (política de autoplay). */
function bindUnlock(ac: AudioContext) {
  if (unlockBound) return;
  unlockBound = true;
  const unlock = () => { void ac.resume().catch(() => {}); };
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(ev, unlock, { once: true, passive: true });
  }
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try { ctx = new Ctor(); } catch { return null; }
    bindUnlock(ctx);
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

/** Zumbido curto de abelha (~1,4s), com aproximação e afastamento. */
function playBee(ac: AudioContext) {
  const t0 = ac.currentTime;
  const dur = 1.4;

  const out = ac.createGain();
  out.gain.setValueAtTime(0, t0);
  out.gain.linearRampToValueAtTime(0.10, t0 + 0.25);   // aproximando
  out.gain.setValueAtTime(0.10, t0 + dur - 0.55);
  out.gain.linearRampToValueAtTime(0, t0 + dur);       // se afastando

  // Abafa os harmônicos ásperos da serra — zumbido é grave e "redondo".
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(820, t0);
  filter.Q.value = 3;

  // Bater de asa: modula a frequência ~19x por segundo.
  const lfo = ac.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(19, t0);
  const lfoGain = ac.createGain();
  lfoGain.gain.setValueAtTime(14, t0);
  lfo.connect(lfoGain);

  const oscs = [190, 197].map((freq) => {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, t0);
    // Leve queda no fim: dá a sensação de a abelha se afastar.
    o.frequency.linearRampToValueAtTime(freq * 0.88, t0 + dur);
    lfoGain.connect(o.frequency);
    o.connect(filter);
    return o;
  });

  filter.connect(out);
  out.connect(ac.destination);

  lfo.start(t0);
  oscs.forEach((o) => o.start(t0));
  lfo.stop(t0 + dur);
  oscs.forEach((o) => o.stop(t0 + dur));
  // Libera os nós quando o som termina.
  oscs[0].onended = () => { try { out.disconnect(); } catch { /* ignora */ } };
}

export function playSfx(name: SfxName): void {
  if (isMuted()) return;
  const ac = audio();
  if (!ac || ac.state !== 'running') return; // sem gesto do usuário ainda
  try {
    if (name === 'bee') playBee(ac);
    // drumroll / reveal / polen: a implementar (motor já pronto).
  } catch { /* som nunca pode quebrar a UI */ }
}

/** Liga/desliga o som do jogo (persistido no navegador). */
export function setSfxMuted(muted: boolean): void {
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignora */ }
}
export function getSfxMuted(): boolean {
  return isMuted();
}
