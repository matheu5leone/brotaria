'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playSfx } from '@/lib/sfx';

/**
 * Minigame de cavar — três camadas, um golpe em cada.
 *
 * O marcador varre a pista; acertar a faixa clara crava fundo. A precisão média
 * dos três golpes vira `accuracy` (0..1), que só desloca a chance de material
 * dentro de uma faixa curta — o resultado de verdade é sorteado no servidor.
 * Mesmo espírito da barra do poço e da roleta do elixir: encenação por cima de
 * uma economia que o cliente não controla.
 *
 * A varredura visual é uma animação CSS (GPU, fora do ciclo do React) e a
 * posição lógica é derivada do TEMPO decorrido no momento do golpe — as duas
 * usam a mesma duração, então não saem de sincronia e o React não re-renderiza
 * a cada quadro.
 */

type Layer = {
  name: string;
  /** Duração de uma passada (ida). A volta usa a mesma. */
  sweepMs: number;
  /** Meia-largura da faixa de acerto, em % da pista. */
  zoneHalf: number;
  color: string;
  edge: string;
};

const LAYERS: Layer[] = [
  { name: 'Grama',      sweepMs: 1100, zoneHalf: 18, color: '#4a7c2a', edge: '#6faa42' },
  { name: 'Terra',      sweepMs: 950,  zoneHalf: 14, color: '#6b4423', edge: '#8a5a2b' },
  { name: 'Terra fofa', sweepMs: 800,  zoneHalf: 10, color: '#4a2e18', edge: '#5c3a1e' },
];

/** Posição do marcador (0..100) derivada do tempo, em vaivém linear. */
function sweepPosition(elapsedMs: number, sweepMs: number): number {
  const phase = (elapsedMs % (sweepMs * 2)) / sweepMs;
  return (phase <= 1 ? phase : 2 - phase) * 100;
}

export function DigMinigame({
  onDone,
  onCancel,
}: {
  onDone: (accuracy: number) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; good: boolean } | null>(null);
  const [shake, setShake] = useState(false);

  const startedAt = useRef(performance.now());
  const doneRef = useRef(false); // onDone é irreversível: cava de verdade

  // Sem animação, a varredura não acontece e o jogo fica injogável — então o
  // minigame vira um clique simples com precisão neutra.
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const layer = LAYERS[step];

  // Centro da faixa sorteado por camada: sempre no miolo da pista, para o
  // acerto não depender de pegar o marcador exatamente na virada da ponta.
  const zoneCenters = useMemo(() => LAYERS.map(() => 30 + Math.random() * 40), []);
  const zoneCenter = zoneCenters[step];

  // Cada camada recomeça a varredura do zero.
  useEffect(() => { startedAt.current = performance.now(); }, [step]);

  const strike = useCallback(() => {
    if (doneRef.current || !layer) return;

    const pos = reducedMotion
      ? zoneCenter // sem varredura não há perícia a medir: precisão neutra
      : sweepPosition(performance.now() - startedAt.current, layer.sweepMs);

    const dist = Math.abs(pos - zoneCenter);
    // Dentro da faixa: 1.0 no centro, caindo linearmente até 0 na borda.
    const score = reducedMotion ? 0.5 : Math.max(0, 1 - dist / layer.zoneHalf);

    playSfx(score > 0 ? 'dig_hit' : 'dig_miss');
    setFeedback(
      score > 0.66 ? { text: 'Em cheio!', good: true }
      : score > 0  ? { text: 'Boa!', good: true }
      :              { text: 'Pedra!', good: false },
    );
    setShake(true);
    setTimeout(() => setShake(false), 300);

    const next = [...scores, score];
    setScores(next);

    if (step === LAYERS.length - 1) {
      doneRef.current = true;
      const accuracy = next.reduce((a, b) => a + b, 0) / next.length;
      // Deixa o feedback do último golpe aparecer antes de fechar.
      setTimeout(() => onDone(accuracy), 420);
    } else {
      setTimeout(() => { setStep((s) => s + 1); setFeedback(null); }, 320);
    }
  }, [layer, reducedMotion, zoneCenter, scores, step, onDone]);

  // Barra de espaço também golpeia (desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); strike(); }
      if (e.code === 'Escape' && !doneRef.current) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [strike, onCancel]);

  return (
    <div
      className="evo-fade-in fixed inset-0 z-[10060] flex items-center justify-center overflow-hidden select-none px-6"
      style={{ background: 'radial-gradient(ellipse at center, rgba(20,36,14,0.92) 0%, rgba(10,22,6,0.96) 70%)' }}
      // O minigame é montado dentro do canvas de pan/zoom do jardim: sem isto o
      // pointerdown sobe até handleCanvasPointerDown, que captura o ponteiro e
      // retargeta o clique (mesmo bug já corrigido na abelha e no tutorial).
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className={`relative w-full max-w-sm rounded-3xl p-6 text-center${shake ? ' dig-shake' : ''}`}
        style={{
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
      >
        <span
          className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-1"
          style={{
            background: 'rgba(201,162,39,0.15)',
            color: 'var(--color-wood-mid)',
            border: '1px solid rgba(201,162,39,0.35)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Camada {step + 1} de {LAYERS.length} · {layer?.name}
        </span>

        <h2
          className="text-xl font-black mt-2 mb-4 leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
        >
          {reducedMotion ? 'Toque para cavar' : 'Acerte a faixa clara!'}
        </h2>

        {/* Corte do terreno: as camadas já vencidas afundam */}
        <div className="relative mx-auto mb-4 rounded-2xl overflow-hidden" style={{ height: 96 }}>
          {LAYERS.map((l, i) => (
            <div
              key={l.name}
              className="w-full transition-all duration-300"
              style={{
                height: 32,
                background: `linear-gradient(180deg, ${l.edge}, ${l.color})`,
                opacity: i < step ? 0.25 : 1,
                transform: i < step ? 'translateY(-6px) scaleY(0.7)' : 'none',
                filter: i === step ? 'brightness(1.15)' : undefined,
              }}
            />
          ))}
        </div>

        {/* Pista de varredura */}
        {!reducedMotion && layer && (
          <div
            className="relative mx-auto mb-4 rounded-full overflow-hidden"
            style={{ height: 26, background: 'rgba(60,40,20,0.30)', border: '1px solid rgba(120,90,40,0.35)' }}
          >
            {/* Faixa de acerto */}
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: `${zoneCenter - layer.zoneHalf}%`,
                width: `${layer.zoneHalf * 2}%`,
                background: 'linear-gradient(180deg, rgba(122,222,110,0.55), rgba(74,180,70,0.45))',
                borderLeft: '2px solid rgba(74,222,128,0.9)',
                borderRight: '2px solid rgba(74,222,128,0.9)',
              }}
            />
            {/* Marcador — animação CSS pura (o React não acompanha quadro a quadro) */}
            <div
              key={step} // remonta a cada camada → a animação recomeça junto com startedAt
              className="dig-sweep absolute top-0 bottom-0"
              style={{
                width: 4,
                marginLeft: -2,
                background: 'var(--color-gold)',
                boxShadow: '0 0 8px var(--color-gold)',
                animation: `dig-sweep ${layer.sweepMs}ms linear infinite alternate`,
              }}
            />
          </div>
        )}

        <div className="h-6 mb-3">
          {feedback && (
            <span
              className="text-sm font-black"
              style={{
                fontFamily: 'var(--font-display)',
                color: feedback.good ? '#2a7a1e' : '#b03030',
              }}
            >
              {feedback.text}
            </span>
          )}
        </div>

        <button
          onClick={strike}
          className="w-full py-4 rounded-xl font-black text-base transition-all active:scale-95"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(135deg, #6b4423, #4a2e18)',
            color: '#f2e8d5',
            border: '1px solid rgba(201,162,39,0.35)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            touchAction: 'manipulation',
          }}
        >
          ⛏️ Cavar
        </button>

        <button
          onClick={onCancel}
          className="mt-3 text-xs font-bold underline"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}
        >
          Desistir
        </button>
      </div>
    </div>
  );
}
