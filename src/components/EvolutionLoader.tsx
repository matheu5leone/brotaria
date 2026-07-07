'use client';

import Image from 'next/image';

/**
 * Tela de carregamento exibida enquanto a evolução da planta é gerada
 * (descrição + imagem via OpenRouter). Prende o usuário com raios solares
 * girando em volta da logo do jogo, que pulsa com scale().
 *
 * Renderizada por cima de tudo (z-index acima dos modais), bloqueia
 * interação até a requisição voltar.
 */
export function EvolutionLoader({ open }: { open: boolean }) {
  if (!open) return null;

  return (
    <div
      className="evo-fade-in fixed inset-0 z-[10050] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(ellipse at center, #2b4a17 0%, #16290c 55%, #0a1606 100%)',
      }}
    >
      {/* ── Raios solares girando (duas camadas em sentidos opostos) ────── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="evo-rays absolute"
          style={{
            width: '180vmax',
            height: '180vmax',
            background:
              'repeating-conic-gradient(from 0deg, rgba(255,224,140,0.16) 0deg 5deg, transparent 5deg 17deg)',
            WebkitMaskImage:
              'radial-gradient(circle, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 35%, transparent 70%)',
            maskImage:
              'radial-gradient(circle, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 35%, transparent 70%)',
          }}
        />
        <div
          className="evo-rays--rev absolute"
          style={{
            width: '180vmax',
            height: '180vmax',
            background:
              'repeating-conic-gradient(from 8deg, rgba(255,200,90,0.10) 0deg 3deg, transparent 3deg 22deg)',
            WebkitMaskImage:
              'radial-gradient(circle, rgba(0,0,0,0.8) 0%, transparent 60%)',
            maskImage:
              'radial-gradient(circle, rgba(0,0,0,0.8) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* ── Halo dourado pulsante atrás da logo ─────────────────────────── */}
      <div className="relative flex items-center justify-center">
        <div
          className="evo-halo absolute rounded-full pointer-events-none"
          style={{
            width: 320,
            height: 320,
            background:
              'radial-gradient(circle, rgba(255,228,150,0.55) 0%, rgba(255,200,90,0.18) 45%, transparent 70%)',
            filter: 'blur(6px)',
          }}
        />

        {/* ── Logo pulsando com scale() ─────────────────────────────────── */}
        <div className="evo-logo relative" style={{ width: 200, height: 200 }}>
          <Image
            src="/imgs/brotaria.webp"
            alt="Brotaria"
            fill
            priority
            className="object-contain"
            draggable={false}
            style={{ filter: 'drop-shadow(0 6px 24px rgba(0,0,0,0.45))' }}
          />
        </div>
      </div>

      {/* ── Texto de espera ─────────────────────────────────────────────── */}
      <div className="relative mt-10 flex flex-col items-center gap-2 px-6 text-center">
        <p
          className="text-base font-black tracking-wide"
          style={{
            fontFamily: 'var(--font-display, serif)',
            color: '#fdeec2',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          Cultivando uma nova fase
          <span className="evo-dot">.</span>
          <span className="evo-dot">.</span>
          <span className="evo-dot">.</span>
        </p>
        <p
          className="text-xs"
          style={{
            fontFamily: 'var(--font-caption, serif)',
            fontStyle: 'italic',
            color: 'rgba(253,238,194,0.7)',
          }}
        >
          A natureza leva alguns segundos para florescer 🌱
        </p>
      </div>
    </div>
  );
}
