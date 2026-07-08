'use client';

import { useEffect, useState } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { TutorialStep } from '@/config/tutorialSteps';

/**
 * Coach marks: escurece a tela e abre um holofote sobre o botão real (achado por
 * data-tutorial), com um balão explicando o item. Leitura + Próximo. Todas as
 * medições acontecem em callbacks (rAF / interval / listeners) para não violar o
 * lint de setState-em-effect e para o holofote acompanhar animações e resize.
 */
export function TutorialCoach({
  steps,
  isDesktop,
  onClose,
}: {
  steps: TutorialStep[];
  isDesktop: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  useEffect(() => {
    if (!step) return;
    const measure = () => {
      const el = document.querySelector(`[data-tutorial="${step.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    const raf = requestAnimationFrame(measure);
    const id = setInterval(measure, 150);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step]);

  if (!step) return null;

  const body = isDesktop && step.bodyDesktop ? step.bodyDesktop : step.body;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const PAD = 8;
  const BW = Math.min(320, vw - 32);

  const spot = rect
    ? { left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;
  const below = rect ? rect.top < vh / 2 : true;
  const balloonLeft = spot ? Math.min(Math.max(12, spot.left), vw - BW - 12) : 0;

  const next = () => { if (isLast) onClose(); else setIndex((i) => i + 1); };
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  const balloonPos: React.CSSProperties = spot
    ? below
      ? { top: spot.top + spot.height + 12, left: balloonLeft }
      : { top: spot.top - 12, left: balloonLeft, transform: 'translateY(-100%)' }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <div className="fixed inset-0 z-[10050] select-none">
      {/* Bloqueia interação com o jogo durante o tour */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Holofote (dim + buraco no botão real) */}
      {spot ? (
        <div
          className="absolute rounded-2xl pointer-events-none transition-all duration-200"
          style={{
            left: spot.left,
            top: spot.top,
            width: spot.width,
            height: spot.height,
            boxShadow: '0 0 0 9999px rgba(8,14,5,0.82)',
            border: '2px solid var(--color-gold)',
          }}
        />
      ) : (
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(8,14,5,0.82)' }} />
      )}

      {/* Balão */}
      <div
        className="absolute rounded-2xl p-4"
        style={{
          ...balloonPos,
          width: BW,
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 1px 1px rgba(242,232,213,0.8)',
        }}
      >
        <div
          className="absolute top-0 left-6 right-6 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        {/* Cabeçalho: foto + título + fechar */}
        <div className="flex items-start gap-3 mb-2">
          {step.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={step.image} alt="" className="w-12 h-12 object-contain flex-shrink-0" draggable={false} />
          )}
          <h3 className="flex-1 text-lg font-black leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
            {step.title}
          </h3>
          <button onClick={onClose} aria-label="Pular tutorial" style={{ color: 'var(--color-text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}>
          {body}
        </p>

        {/* Rodapé: progresso + navegação */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === index ? 18 : 6,
                  height: 6,
                  background: i === index ? 'var(--color-wood-mid)' : 'rgba(92,58,30,0.3)',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                onClick={prev}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors hover:bg-[rgba(92,58,30,0.08)]"
                style={{ border: '1px solid rgba(92,58,30,0.2)', color: 'var(--color-text-mid)' }}
                aria-label="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={next}
              className="px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
                color: '#d9f0c8',
                border: '1px solid rgba(74,222,128,0.25)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              }}
            >
              {isLast ? 'Concluir' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
