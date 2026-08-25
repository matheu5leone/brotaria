'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { RECIPES, type Recipe } from '@/config/recipes';
import { ITEM_VISUAL } from '@/components/ItemGain';

/** Ícone de item — sprite quando existe, senão emoji do catálogo. */
export function ItemIcon({ tipo, size = 28 }: { tipo: string; size?: number }) {
  const v = ITEM_VISUAL[tipo];
  if (v?.src) {
    return (
      <Image src={v.src} alt={v.label} width={size} height={size}
             className="object-contain pointer-events-none" draggable={false} />
    );
  }
  return <span className="leading-none pointer-events-none" style={{ fontSize: size * 0.8 }}>{v?.emoji ?? '❔'}</span>;
}

/** Como cada estação se joga — o "modo de preparo" da página. */
const MODO_DE_PREPARO: Record<Recipe['minigame'], { titulo: string; passos: string[]; icone: string }> = {
  macetar: {
    titulo: 'Macetar',
    icone: '/imgs/craft/macetador.webp',
    passos: [
      'Ponha o pólen na bancada.',
      'Pegue o macetador e bata sem parar.',
      'Quanto mais rápido, mais depressa a barra enche.',
    ],
  },
  torcer: {
    titulo: 'Torcer',
    icone: '/imgs/craft/pano.webp',
    passos: [
      'Ponha a terra molhada no pano.',
      'Gire o dedo em volta do pano, sem pressa.',
      'Três voltas e a água escorre para a garrafa.',
    ],
  },
};

/**
 * O livro de receitas, aberto — duas páginas por receita: à esquerda o modo de
 * preparo, à direita o que sai dali.
 *
 * Era uma lista de cartões. Virou livro porque o cenário já tem um grimório
 * sobre a mesa, e porque uma receita tem duas metades naturais (como se faz ×
 * o que se ganha) que a lista misturava numa coluna só.
 */
export function LivroDeReceitas({
  estoque,
  onClose,
  paginaInicial = 0,
  /** Trava o fechar — usado pelo tutorial da primeira visita. */
  bloquearFechar = false,
  aoVirarPagina,
}: {
  estoque: Map<string, number>;
  onClose: () => void;
  paginaInicial?: number;
  bloquearFechar?: boolean;
  aoVirarPagina?: (indice: number) => void;
}) {
  const [i, setI] = useState(paginaInicial);
  const receita = RECIPES[i];
  const preparo = MODO_DE_PREPARO[receita.minigame];
  const tem = estoque.get(receita.input.type) ?? 0;
  const pronto = tem >= receita.input.qty;

  const ir = (delta: number) => {
    const prox = (i + delta + RECIPES.length) % RECIPES.length;
    setI(prox);
    aoVirarPagina?.(prox);
  };

  return (
    <div
      className="evo-fade-in fixed inset-0 z-[10040] flex items-center justify-center p-3"
      style={{ background: 'rgba(5,8,3,0.68)', backdropFilter: 'blur(4px)' }}
      onClick={bloquearFechar ? undefined : onClose}
    >
      <div
        className="relative flex flex-col rounded-3xl overflow-hidden"
        style={{
          width: 'min(96vw, 560px)',
          maxHeight: '88vh',
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-10 right-10 h-px pointer-events-none"
             style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }} />

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Image src="/imgs/craft/receitas.webp" alt="" width={26} height={26} className="object-contain" />
            <h2 className="text-base font-black"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
              Livro de Receitas
            </h2>
          </div>
          {!bloquearFechar && (
            <button onClick={onClose} aria-label="Fechar"
                    className="p-1.5 rounded-full hover:bg-black/10 active:scale-90 transition-all"
                    style={{ color: 'var(--color-text-muted)' }}>
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* As duas páginas. Empilham no celular; lado a lado a partir de sm. */}
        <div className="overflow-y-auto px-5 pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
            {/* Vinco do meio — só existe quando as páginas estão lado a lado */}
            <div className="hidden sm:block absolute inset-y-2 left-1/2 w-px pointer-events-none"
                 style={{ background: 'linear-gradient(180deg, transparent, rgba(92,58,30,0.35), transparent)' }} />

            {/* ── Página esquerda: modo de preparo ── */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}>
                Modo de preparo
              </p>

              <div className="flex items-center gap-2 mb-3">
                <Image src={preparo.icone} alt="" width={42} height={42} className="object-contain" />
                <span className="text-sm font-black"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-dark)' }}>
                  {preparo.titulo}
                </span>
              </div>

              {/* Ingrediente exigido, com o que o jogador tem hoje */}
              <div className="flex items-center gap-2 mb-3 px-2.5 py-2 rounded-xl"
                   style={{
                     background: pronto ? 'rgba(42,90,30,0.10)' : 'rgba(92,58,30,0.07)',
                     border: `1px solid ${pronto ? 'rgba(42,90,30,0.32)' : 'rgba(92,58,30,0.2)'}`,
                   }}>
                <ItemIcon tipo={receita.input.type} size={26} />
                <span className="text-xs font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
                  {receita.input.qty}× {ITEM_VISUAL[receita.input.type]?.label ?? receita.input.type}
                </span>
                <span className="ml-auto text-[11px] font-bold"
                      style={{ fontFamily: 'var(--font-display)', color: pronto ? '#2a5a1e' : 'var(--color-text-muted)' }}>
                  {pronto ? 'você tem' : 'tem'} {tem}
                </span>
              </div>

              <ol className="flex flex-col gap-1.5">
                {preparo.passos.map((passo, n) => (
                  <li key={n} className="flex gap-2 text-[12px] leading-relaxed"
                      style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}>
                    <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black mt-0.5"
                          style={{ background: 'rgba(92,58,30,0.15)', color: 'var(--color-wood-dark)', fontFamily: 'var(--font-display)' }}>
                      {n + 1}
                    </span>
                    {passo}
                  </li>
                ))}
              </ol>
            </div>

            {/* ── Página direita: o resultado ── */}
            <div className="flex flex-col">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}>
                O que sai daqui
              </p>

              <div className="flex flex-col items-center text-center px-3 py-4 rounded-2xl"
                   style={{ background: 'rgba(201,162,39,0.10)', border: '1px solid rgba(201,162,39,0.35)' }}>
                <ItemIcon tipo={receita.output.type} size={72} />
                <span className="text-sm font-black mt-2"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
                  {receita.name}
                </span>
                <p className="text-[12px] leading-relaxed mt-1.5"
                   style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}>
                  {receita.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Virar página */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
             style={{ borderTop: '1px solid rgba(92,58,30,0.2)' }}>
          <button onClick={() => ir(-1)} aria-label="Página anterior"
                  className="p-2 rounded-lg hover:bg-black/10 active:scale-90 transition-all"
                  style={{ color: 'var(--color-wood-mid)' }}>
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5">
            {RECIPES.map((r, n) => (
              <button key={r.id} onClick={() => { setI(n); aoVirarPagina?.(n); }}
                      aria-label={r.name}
                      className="rounded-full transition-all"
                      style={{
                        width: n === i ? 20 : 7, height: 7,
                        background: n === i ? 'var(--color-gold)' : 'rgba(92,58,30,0.3)',
                      }} />
            ))}
          </div>

          <button onClick={() => ir(1)} aria-label="Próxima página"
                  className="p-2 rounded-lg hover:bg-black/10 active:scale-90 transition-all"
                  style={{ color: 'var(--color-wood-mid)' }}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
