'use client';

import { useState } from 'react';
import Image from 'next/image';
import { GAME } from '@/config/economy';

const ELIXIR_POLEN_COST = GAME.ELIXIR_POLEN_COST;

/**
 * Tutorial ilustrado do pólen — abre na 1ª vez que o jogador clica numa abelha.
 * Páginas de "avançar" com sprites reais + animações CSS (keyframes em globals.css,
 * prefixo polentut-*). Explica o fluxo: abelha → pólen → Elixir Floral → reroll de sede.
 */

/** Palco da ilustração: caixa relativa onde os sprites são posicionados em absoluto. */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto mb-5 w-full overflow-hidden rounded-2xl"
      style={{
        height: 168,
        background: 'radial-gradient(ellipse at 50% 120%, rgba(120,180,90,0.28) 0%, rgba(60,110,45,0.10) 45%, transparent 72%)',
        border: '1px solid rgba(201,162,39,0.25)',
      }}
    >
      {/* chão sugerido */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: 40, background: 'linear-gradient(180deg, transparent, rgba(74,120,40,0.22))' }}
      />
      {children}
    </div>
  );
}

type Page = { badge: string; title: string; text: string; stage: React.ReactNode };

function buildPages(cost: number): Page[] {
  return [
    {
      badge: 'Passo 1',
      title: 'Uma abelha visita seu jardim',
      text: 'De vez em quando, uma abelhinha pousa entre suas plantas. Fique de olho — ela não fica para sempre!',
      stage: (
        <Stage>
          <Image
            src="/imgs/abelha.webp"
            alt="abelha"
            width={72}
            height={72}
            unoptimized
            className="polentut-anim absolute object-contain"
            style={{ left: '50%', top: '48%', animation: 'polentut-buzz 2.4s ease-in-out infinite' }}
          />
        </Stage>
      ),
    },
    {
      badge: 'Passo 2',
      title: 'Toque nela e ganhe pólen',
      text: 'Um toque na abelha rende +1 pólen, que voa direto para a sua mochila. Simples assim.',
      stage: (
        <Stage>
          <Image
            src="/imgs/abelha.webp"
            alt="abelha"
            width={58}
            height={58}
            unoptimized
            className="absolute object-contain"
            style={{ left: '18%', top: '58%', transform: 'translate(-50%,-50%)' }}
          />
          <Image
            src="/imgs/polen.webp"
            alt="pólen"
            width={30}
            height={30}
            unoptimized
            className="polentut-anim absolute object-contain drop-shadow"
            style={{ transform: 'translate(-50%,-50%)', animation: 'polentut-fly 2.2s ease-in-out infinite' }}
          />
          {/* mochila-alvo */}
          <div
            className="absolute text-3xl"
            style={{ right: '10%', top: '18%' }}
            aria-hidden
          >
            🎒
          </div>
        </Stage>
      ),
    },
    {
      badge: 'Passo 3',
      title: `Junte ${cost} e forje um Elixir`,
      text: `Ao reunir ${cost} pólen na mochila, você pode forjá-los em um Elixir Floral brilhante.`,
      stage: (
        <Stage>
          <Image
            src="/imgs/polen.webp"
            alt="pólen"
            width={54}
            height={54}
            unoptimized
            className="polentut-anim absolute object-contain"
            style={{ left: '38%', top: '50%', animation: 'polentut-forge 3s ease-in-out infinite' }}
          />
          <Image
            src="/imgs/elixir.webp"
            alt="Elixir Floral"
            width={64}
            height={64}
            unoptimized
            className="polentut-anim absolute object-contain"
            style={{
              left: '62%',
              top: '48%',
              filter: 'drop-shadow(0 0 10px rgba(180,120,255,0.65))',
              animation: 'polentut-forge-out 3s ease-in-out infinite',
            }}
          />
        </Stage>
      ),
    },
    {
      badge: 'Passo 4',
      title: 'Use o Elixir numa planta',
      text: 'Arraste o Elixir Floral sobre uma planta para re-sortear o tempo entre as regas dela. Com sorte, ela fica muito mais tempo sem sede!',
      stage: (
        <Stage>
          {/* planta-alvo */}
          <div className="absolute" style={{ left: '62%', top: '52%', transform: 'translate(-50%,-50%)' }} aria-hidden>
            <div className="text-5xl">🪴</div>
          </div>
          {/* roleta girando sobre a planta */}
          <div
            className="polentut-anim absolute text-2xl"
            style={{ left: '62%', top: '26%', transform: 'translate(-50%,-50%)', animation: 'polentut-reroll 1.8s ease-in-out infinite' }}
            aria-hidden
          >
            🎲
          </div>
          {/* elixir sendo arrastado */}
          <Image
            src="/imgs/elixir.webp"
            alt="Elixir Floral"
            width={46}
            height={46}
            unoptimized
            className="polentut-anim absolute object-contain"
            style={{
              transform: 'translate(-50%,-50%)',
              filter: 'drop-shadow(0 0 8px rgba(180,120,255,0.6))',
              animation: 'polentut-drag 2.6s ease-in-out infinite',
            }}
          />
        </Stage>
      ),
    },
  ];
}

export function PolenTutorial({ onDone }: { onDone: () => void }) {
  const pages = buildPages(ELIXIR_POLEN_COST);
  const [i, setI] = useState(0);
  const last = i === pages.length - 1;
  const page = pages[i];

  return (
    <div
      className="evo-fade-in fixed inset-0 z-[10060] flex items-center justify-center overflow-hidden select-none px-6"
      style={{ background: 'radial-gradient(ellipse at center, rgba(20,36,14,0.92) 0%, rgba(10,22,6,0.96) 70%)' }}
      // O modal é montado dentro do canvas de pan/zoom do jardim (BeeScene fica
      // na Garden). Sem isto, o pointerdown borbulha até handleCanvasPointerDown,
      // que chama setPointerCapture() no canvas e RETARGETA o click subsequente —
      // os botões ("Avançar"/"Voltar"/"Entendi!") ficam sem resposta no desktop.
      // Mesmo motivo/fix do onPointerDown da abelha em BeeScene.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl p-6 text-center"
        style={{
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
      >
        <div
          className="absolute top-0 left-10 right-10 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        <span
          className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3"
          style={{
            background: 'rgba(201,162,39,0.15)',
            color: 'var(--color-wood-mid)',
            border: '1px solid rgba(201,162,39,0.35)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {page.badge}
        </span>

        {page.stage}

        <h2
          className="text-xl font-black mb-2 leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
        >
          {page.title}
        </h2>
        <p
          className="text-sm leading-relaxed mb-5 min-h-[3.5rem]"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}
        >
          {page.text}
        </p>

        {/* Indicadores de página */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {pages.map((_, idx) => (
            <span
              key={idx}
              className="rounded-full transition-all"
              style={{
                width: idx === i ? 20 : 7,
                height: 7,
                background: idx === i ? 'var(--color-gold)' : 'rgba(120,90,40,0.3)',
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {i > 0 && (
            <button
              onClick={() => setI((v) => v - 1)}
              className="py-3 px-4 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'rgba(120,90,40,0.12)',
                color: 'var(--color-wood-mid)',
                border: '1px solid rgba(120,90,40,0.25)',
              }}
            >
              Voltar
            </button>
          )}
          <button
            onClick={() => (last ? onDone() : setI((v) => v + 1))}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
              color: '#d9f0c8',
              border: '1px solid rgba(74,222,128,0.25)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}
          >
            {last ? 'Entendi!' : 'Avançar'}
          </button>
        </div>
      </div>
    </div>
  );
}
