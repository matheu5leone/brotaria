'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, Loader2 } from 'lucide-react';
import { CRAFT_TORCER, type Recipe } from '@/config/recipes';

/**
 * TORCER O PANO — a terra molhada vai no pano e o jogador gira o dedo em volta
 * dele até espremer a água.
 *
 * O progresso é a rotação ACUMULADA do dedo em torno do centro, não a
 * velocidade: é o gesto que fecha a receita. Isso é de propósito diferente do
 * macetador, que cobra rapidez — duas estações, duas habilidades.
 *
 * Duas defesas contra ruído: deltas minúsculos (dedo parado tremendo) são
 * ignorados, e saltos maiores que 90° num evento só são descartados — isso é o
 * dedo pulando de um lado ao outro do círculo, não giro de verdade.
 */
export function TorcendoPano({
  recipe,
  onDone,
  onClose,
}: {
  recipe: Recipe;
  onDone: () => void;
  onClose: () => void;
}) {
  const [progresso, setProgresso] = useState(0); // 0..1
  const [voltas, setVoltas] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const alvoRef = useRef<HTMLDivElement>(null);
  const anguloAnterior = useRef<number | null>(null);
  const acumulado = useRef(0);
  const fechouRef = useRef(false);

  const anguloDoPonto = (x: number, y: number) => {
    const r = alvoRef.current?.getBoundingClientRect();
    if (!r) return null;
    return Math.atan2(y - (r.top + r.height / 2), x - (r.left + r.width / 2));
  };

  const comecar = (e: React.PointerEvent) => {
    if (enviando) return;
    // O ângulo é guardado PRIMEIRO: setPointerCapture lança em alguns casos
    // (ponteiro que já sumiu, evento sintético) e, se lançasse antes desta
    // linha, o gesto nunca começava — o onPointerMove sairia no `null` para
    // sempre. O try/catch é o mesmo padrão dos outros arrastes do jogo.
    anguloAnterior.current = anguloDoPonto(e.clientX, e.clientY);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* segue sem captura */ }
  };

  const girar = (e: React.PointerEvent) => {
    if (enviando || anguloAnterior.current === null) return;
    const a = anguloDoPonto(e.clientX, e.clientY);
    if (a === null) return;

    // Normaliza para (-pi, pi]: sem isso, cruzar o ponto onde o atan2 vira de
    // +pi para -pi contaria uma volta inteira num evento só.
    let d = a - anguloAnterior.current;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    anguloAnterior.current = a;

    const passo = Math.abs(d);
    if (passo < CRAFT_TORCER.RUIDO_MIN || passo > CRAFT_TORCER.SALTO_MAX) return;

    acumulado.current += passo;
    setProgresso(Math.min(1, acumulado.current / CRAFT_TORCER.RAD_TOTAL));
    setVoltas(acumulado.current / (2 * Math.PI));
  };

  const soltar = () => { anguloAnterior.current = null; };

  // O disparo mora no efeito, guardado por ref: updater de estado roda 2x no
  // StrictMode e chamaria o craft duas vezes se o disparo morasse no handler.
  useEffect(() => {
    if (progresso < 1 || fechouRef.current) return;
    fechouRef.current = true;
    setEnviando(true);
    onDone();
  }, [progresso, onDone]);

  const RAIO = 92;
  const CIRC = 2 * Math.PI * RAIO;

  return (
    <div
      className="evo-fade-in fixed inset-0 z-[10050] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,3,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full rounded-3xl p-6 pt-8 flex flex-col items-center gap-4"
        style={{
          maxWidth: 340,
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/10 active:scale-90 transition-all"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-lg font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
            Torcendo o pano
          </h2>
          <p className="text-[11px] mt-0.5" style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
            gire o dedo em volta do pano — {recipe.name}
          </p>
        </div>

        {/* Área do gesto. `touchAction: none` é obrigatório: sem isso o
            navegador rouba o arraste para rolar a página no meio do giro. */}
        <div
          ref={alvoRef}
          onPointerDown={comecar}
          onPointerMove={girar}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          className="relative flex items-center justify-center rounded-full select-none"
          style={{
            width: 210,
            height: 210,
            touchAction: 'none',
            cursor: enviando ? 'default' : 'grab',
            background: 'radial-gradient(circle, rgba(139,99,70,0.16), rgba(139,99,70,0.04) 70%, transparent)',
          }}
        >
          {/* Trilho pontilhado: mostra ONDE girar — sem ele ninguém adivinha. */}
          <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 210 210">
            <circle cx="105" cy="105" r={RAIO} fill="none" stroke="rgba(92,58,30,0.28)" strokeWidth="2" strokeDasharray="5 7" />
            <circle
              cx="105"
              cy="105"
              r={RAIO}
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${progresso * CIRC} ${CIRC}`}
              transform="rotate(-90 105 105)"
              style={{ transition: 'stroke-dasharray 80ms linear' }}
            />
          </svg>

          {/* O pano acompanha o dedo — é o retorno que faz o gesto ter peso. */}
          <Image
            src="/imgs/craft/pano.webp"
            alt="pano"
            width={120}
            height={120}
            className="object-contain pointer-events-none"
            draggable={false}
            style={{ transform: `rotate(${voltas * 360}deg)`, transition: 'transform 60ms linear' }}
          />

          {/* Gotas só a partir de 1/4 do caminho: antes disso ainda não saiu água. */}
          {progresso > 0.25 && [0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute pointer-events-none"
              style={{
                left: `${44 + i * 8}%`,
                top: '64%',
                fontSize: 13,
                opacity: Math.min(1, (progresso - 0.25) * 2),
                animation: `garden-float ${1 + i * 0.25}s ease-in-out infinite`,
              }}
            >
              💧
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-mid)' }}>
            {Math.min(CRAFT_TORCER.VOLTAS, Math.floor(voltas))} / {CRAFT_TORCER.VOLTAS} voltas
          </span>
          {enviando && <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-wood-mid)' }} />}
        </div>
      </div>
    </div>
  );
}
