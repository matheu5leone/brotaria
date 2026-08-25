'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { authFetch } from '@/lib/authFetch';

type Fase = 'off' | 'apontando' | 'lendo' | 'fim';

export interface TutorialOficina {
  fase: Fase;
  /** O livro não pode ser fechado enquanto o jogador não virar as duas páginas. */
  travandoLivro: boolean;
  aoAbrirLivro: () => void;
  aoFecharLivro: () => void;
  aoVirarPagina: (indice: number) => void;
}

/**
 * Tutorial da primeira visita à Oficina.
 *
 * Fase 'apontando': tudo escurece menos o livro, e só ele aceita toque. É
 * deliberado — a sala tem receitas, bancada e prateleira competindo por atenção,
 * e sem o funil o jogador mexe em tudo antes de descobrir onde as regras estão
 * escritas.
 *
 * Fase 'lendo': o livro está aberto e não fecha até as duas páginas terem sido
 * vistas. Não é para prender: é que fechar na primeira página deixaria metade do
 * conteúdo sem ser lido, e o tutorial não volta.
 */
export function useTutorialOficina(): TutorialOficina {
  const { craftUnlocked, craftTutorialSeen, refresh } = useWallet();
  // A fase é DERIVADA da carteira, não sincronizada por efeito: ligar o tutorial
  // dentro de um useEffect é setState em render encadeado, e o lint reclama com
  // razão — o dado já diz tudo o que é preciso saber.
  const [etapa, setEtapa] = useState<'apontando' | 'lendo' | 'fim'>('apontando');
  const [vistas, setVistas] = useState<Set<number>>(new Set([0]));
  const ativo = craftUnlocked && !craftTutorialSeen;
  const fase: Fase = ativo ? etapa : 'off';

  const encerrar = useCallback(() => {
    setEtapa('fim');
    authFetch('/api/profile/craft-tutorial-ack', { method: 'POST' })
      .then(() => refresh())
      .catch(() => { /* tenta de novo na próxima visita */ });
  }, [refresh]);

  const aoAbrirLivro = useCallback(() => {
    setEtapa((f) => (f === 'apontando' ? 'lendo' : f));
  }, []);

  const aoVirarPagina = useCallback((indice: number) => {
    setVistas((v) => new Set(v).add(indice));
  }, []);

  const aoFecharLivro = useCallback(() => {
    if (fase === 'lendo') encerrar();
  }, [fase, encerrar]);

  // Duas páginas vistas → o livro destrava e o tutorial se dá por cumprido.
  const travandoLivro = fase === 'lendo' && vistas.size < 2;

  return { fase, travandoLivro, aoAbrirLivro, aoFecharLivro, aoVirarPagina };
}

/**
 * O véu do coach mark. Só existe na fase 'apontando': cobre a sala inteira,
 * bloqueia o toque, e deixa um buraco por cima do livro.
 *
 * O buraco é feito com um `box-shadow` gigante em vez de máscara SVG — mesmo
 * truque do TutorialCoach do jardim, que já provou funcionar em todo navegador
 * que o jogo suporta.
 */
export function CoachMarkOficina({ estado }: { estado: TutorialOficina }) {
  const [alvo, setAlvo] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Sem limpar o alvo aqui: setState sincrono no efeito e render encadeado.
    // Nao precisa — fora da fase 'apontando' o componente ja nao renderiza nada.
    if (estado.fase !== 'apontando') return;
    const medir = () => {
      const el = document.querySelector('[data-craft-livro]');
      setAlvo(el ? el.getBoundingClientRect() : null);
    };
    // rAF em vez de chamada direta: medir() faz setState, e setState sincrono
    // dentro do efeito e render encadeado (o lint pega, e com razao).
    const raf = requestAnimationFrame(medir);
    // Remede: a sala tem imagem de fundo que muda o layout ao carregar.
    const id = setInterval(medir, 200);
    window.addEventListener('resize', medir);
    return () => { cancelAnimationFrame(raf); clearInterval(id); window.removeEventListener('resize', medir); };
  }, [estado.fase]);

  if (estado.fase !== 'apontando' || !alvo) return null;

  const folga = 8;

  return (
    <div className="fixed inset-0 z-[10030]" style={{ pointerEvents: 'none' }}>
      {/* Buraco: o retângulo é transparente e a sombra imensa escurece o resto.
          `pointerEvents: none` aqui deixa o toque passar SÓ neste furo. */}
      <div
        className="absolute rounded-2xl"
        style={{
          left: alvo.left - folga,
          top: alvo.top - folga,
          width: alvo.width + folga * 2,
          height: alvo.height + folga * 2,
          boxShadow: '0 0 0 9999px rgba(5,8,3,0.82)',
          border: '2px solid var(--color-gold)',
          animation: 'brota-carry 1.6s ease-in-out infinite',
        }}
      />

      {/* Balão. Abaixo do livro, porque o livro mora no topo da tela. */}
      <div
        className="absolute rounded-2xl p-4 text-center"
        style={{
          top: alvo.bottom + 16,
          right: Math.max(12, window.innerWidth - alvo.right - 4),
          width: 'min(76vw, 260px)',
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
          pointerEvents: 'none',
        }}
      >
        <p className="text-sm font-black mb-1"
           style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
          Bem-vindo à Oficina
        </p>
        <p className="text-[12px] leading-relaxed"
           style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}>
          Toda receita está escrita no livro. Abra ele para ver o que dá para
          preparar aqui.
        </p>
      </div>
    </div>
  );
}
