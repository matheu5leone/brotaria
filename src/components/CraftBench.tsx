'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { X, Loader2 } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useItemGain } from '@/components/ItemGain';
import { useBackpackFull } from '@/components/BackpackFull';
import { authFetch } from '@/lib/authFetch';
import { useQueryClient } from '@tanstack/react-query';
import { RECIPES, CRAFT_BAR, type Recipe } from '@/config/recipes';
import { TorcendoPano } from '@/components/TorcendoPano';
import { LivroDeReceitas, ItemIcon } from '@/components/LivroDeReceitas';
import { CoachMarkOficina, useTutorialOficina } from '@/components/CoachMarkOficina';

/** Quanto do ingrediente o jogador tem na mochila (soma dos stacks). */
function useEstoque(userId: string | undefined) {
  const { data: items = [] } = useInventory(userId);
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it.item_type, (m.get(it.item_type) ?? 0) + it.quantity);
    return m;
  }, [items]);
}

// ── Minigame de macetar ──────────────────────────────────────────────────────

/**
 * O minigame do poço com METADE da dificuldade (ver CRAFT_BAR): mesmo enchimento
 * por toque, decaimento pela metade. Encheu a barra, a receita fecha.
 */
function Macetando({ recipe, onDone, onClose }: { recipe: Recipe; onDone: () => void; onClose: () => void }) {
  const [fill, setFill] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const fechouRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setFill((f) => (f > 0 ? Math.max(0, f - CRAFT_BAR.DECAY_PER_TICK) : 0));
    }, CRAFT_BAR.TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Updater PURO no clique: o StrictMode chama updaters 2x em dev, então o
  // disparo do craft mora no efeito abaixo, guardado por ref (mesma lição do poço).
  const macetar = useCallback(() => {
    if (enviando) return;
    setFill((f) => Math.min(100, f + CRAFT_BAR.FILL_PER_CLICK));
  }, [enviando]);

  useEffect(() => {
    if (fill < 100 || fechouRef.current) return;
    fechouRef.current = true;
    setEnviando(true);
    onDone();
  }, [fill, onDone]);

  return (
    <div className="evo-fade-in fixed inset-0 z-[10050] flex items-center justify-center p-4"
         style={{ background: 'rgba(5,8,3,0.6)', backdropFilter: 'blur(4px)' }}
         onClick={onClose}>
      <div
        className="relative w-full rounded-3xl p-6 pt-8 flex flex-col items-center gap-5"
        style={{
          maxWidth: 340,
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-8 right-8 h-px pointer-events-none"
             style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }} />
        <button onClick={onClose} aria-label="Fechar"
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/10 active:scale-90 transition-all"
                style={{ color: 'var(--color-text-muted)' }}>
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-lg font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
            Macetando
          </h2>
          <p className="text-[11px] mt-0.5" style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
            toque rápido até encher — {recipe.name}
          </p>
        </div>

        <div className="relative rounded-xl overflow-hidden"
             style={{ width: 88, height: 200, background: 'rgba(92,58,30,0.15)', border: '2px solid var(--color-wood-light)' }}>
          <div className="absolute bottom-0 left-0 right-0 transition-[height] duration-75 ease-linear"
               style={{ height: `${fill}%`, background: 'linear-gradient(180deg, #b98a4b, #6b4423)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.35)' }} />
          <div className="absolute inset-0 flex items-center justify-center font-black text-lg pointer-events-none"
               style={{ fontFamily: 'var(--font-display)', color: fill > 55 ? '#f2e8d5' : 'var(--color-text-dark)' }}>
            {Math.round(fill)}%
          </div>
        </div>

        <button
          onClick={macetar}
          disabled={enviando}
          aria-label="Macetar"
          className="select-none rounded-full p-5 transition-transform active:scale-90 disabled:opacity-50"
          style={{
            background: 'radial-gradient(circle at 50% 35%, rgba(139,99,70,0.25), rgba(139,99,70,0.08))',
            border: '1.5px solid var(--color-wood-light)',
            touchAction: 'manipulation',
          }}
        >
          {enviando ? <Loader2 className="w-9 h-9 animate-spin" style={{ color: 'var(--color-wood-mid)' }} />
                    : <Image src="/imgs/craft/macetador.webp" alt="macetador" width={56} height={56}
                             className="object-contain pointer-events-none" draggable={false} />}
        </button>
      </div>
    </div>
  );
}

// ── Bancada ──────────────────────────────────────────────────────────────────

export function CraftBench({ userId }: { userId: string | undefined }) {
  const estoque = useEstoque(userId);
  const qc = useQueryClient();
  const gain = useItemGain();
  const askBackpack = useBackpackFull();

  const tutorial = useTutorialOficina();
  const [livroAberto, setLivroAberto] = useState(false);
  /** O que está na mesa: receita escolhida (a mesa aceita uma receita por vez). */
  const [naMesa, setNaMesa] = useState<Recipe | null>(null);
  const [macetando, setMacetando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const podeFazer = useCallback(
    (r: Recipe) => (estoque.get(r.input.type) ?? 0) >= r.input.qty,
    [estoque],
  );

  const porNaMesa = (r: Recipe) => {
    setErro(null);
    if (!podeFazer(r)) {
      setErro(`Faltam ${r.input.qty - (estoque.get(r.input.type) ?? 0)} para essa receita.`);
      return;
    }
    setNaMesa(r);
  };

  const fechar = useCallback(async () => {
    if (!naMesa) return;
    const recipe = naMesa;
    try {
      const res = await authFetch('/api/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMacetando(false);
        if (data.code === 'INVENTORY_FULL') {
          // Reusa a tela de mochila cheia: o jogador escolhe o que sai e a
          // receita é refeita. Nada foi consumido — a RPC desfaz tudo no erro.
          askBackpack({ incoming: [{ item_type: recipe.output.type }], onResolved: () => setMacetando(true) });
          return;
        }
        setErro(data.error ?? 'Não deu para macetar.');
        return;
      }

      gain({ item: recipe.output.type });
      qc.invalidateQueries({ queryKey: ['inventory', userId] });
      setNaMesa(null);
      setMacetando(false);
    } catch {
      setMacetando(false);
      setErro('Não deu para macetar.');
    }
  }, [naMesa, askBackpack, gain, qc, userId]);

  return (
    <>
      {/* Livro de receitas — visível desde a primeira visita */}
      <button
        data-craft-livro
        onClick={() => { setLivroAberto(true); tutorial.aoAbrirLivro(); }}
        className="absolute top-3 right-3 z-[10035] flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all active:scale-95"
        style={{
          background: 'rgba(8,14,5,0.6)',
          border: '1.5px solid rgba(201,162,39,0.5)',
          color: 'var(--color-text-light)',
          backdropFilter: 'blur(4px)',
          fontFamily: 'var(--font-display)',
        }}
        title="Ver as receitas"
      >
        <Image src="/imgs/craft/receitas.webp" alt="" width={26} height={26} className="object-contain" />
        <span className="text-xs font-black">Receitas</span>
      </button>

      {/* A MESA — o que está posto. Durante o coach mark ela não aceita toque:
          o funil é o livro. */}
      <div className="absolute inset-x-0 z-10 flex flex-col items-center justify-center px-6"
           style={{ top: '22%', bottom: '30%', pointerEvents: tutorial.fase === 'apontando' ? 'none' : undefined }}>
        {naMesa ? (
          <>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3" style={{ maxWidth: 260 }}>
              {Array.from({ length: naMesa.input.qty }).map((_, i) => (
                <span key={i} style={{ transform: `rotate(${(i % 5) * 7 - 14}deg)` }}>
                  <ItemIcon tipo={naMesa.input.type} size={26} />
                </span>
              ))}
            </div>
            <button
              onClick={() => setMacetando(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm transition-all active:scale-95"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(135deg, #8b6346, #5c3a1e)',
                color: '#f2e8d5',
                border: '1.5px solid var(--color-gold)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
              }}
            >
              <Image
                src={naMesa.minigame === 'torcer' ? '/imgs/craft/pano.webp' : '/imgs/craft/macetador.webp'}
                alt="" width={24} height={24}
                className="object-contain pointer-events-none" draggable={false}
              /> {naMesa.minigame === 'torcer' ? 'Torcer' : 'Macetar'}
            </button>
            <button
              onClick={() => { setNaMesa(null); setErro(null); }}
              className="mt-2 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
              style={{ fontFamily: 'var(--font-display)', color: 'rgba(232,213,160,0.75)', background: 'rgba(8,14,5,0.45)' }}
            >
              tirar da mesa
            </button>
          </>
        ) : (
          <p className="text-center text-sm px-6 py-3 rounded-xl"
             style={{
               fontFamily: 'var(--font-caption)', fontStyle: 'italic',
               color: 'rgba(232,213,160,0.8)', background: 'rgba(8,14,5,0.45)',
               border: '1px dashed rgba(201,162,39,0.35)',
             }}>
            A bancada está livre. Escolha uma receita abaixo.
          </p>
        )}

        {erro && (
          <p className="mt-3 text-xs font-bold px-3 py-2 rounded-lg"
             style={{ fontFamily: 'var(--font-display)', color: '#f0b8b8', background: 'rgba(120,20,20,0.5)' }}>
            {erro}
          </p>
        )}
      </div>

      {/* PRATELEIRA — as receitas disponíveis, com o estoque de cada uma */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-3 flex gap-2 justify-center"
           style={{ background: 'linear-gradient(180deg, transparent, rgba(5,8,3,0.75) 45%)',
                    pointerEvents: tutorial.fase === 'apontando' ? 'none' : undefined }}>
        {RECIPES.map((r) => {
          const tem = estoque.get(r.input.type) ?? 0;
          const pronto = podeFazer(r);
          return (
            <button
              key={r.id}
              onClick={() => porNaMesa(r)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95"
              style={{
                background: pronto ? 'rgba(201,162,39,0.18)' : 'rgba(8,14,5,0.55)',
                border: `1.5px solid ${pronto ? 'var(--color-gold)' : 'rgba(232,213,160,0.25)'}`,
                opacity: pronto ? 1 : 0.65,
                minWidth: 92,
              }}
            >
              <ItemIcon tipo={r.output.type} size={30} />
              <span className="text-[10px] font-black leading-tight text-center"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>
                {r.name}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold"
                    style={{ fontFamily: 'var(--font-display)', color: pronto ? '#9ae6a0' : 'rgba(232,213,160,0.7)' }}>
                <ItemIcon tipo={r.input.type} size={12} /> {tem}/{r.input.qty}
              </span>
            </button>
          );
        })}
      </div>

      {livroAberto && (
        <LivroDeReceitas
          estoque={estoque}
          onClose={() => { setLivroAberto(false); tutorial.aoFecharLivro(); }}
          bloquearFechar={tutorial.travandoLivro}
          aoVirarPagina={tutorial.aoVirarPagina}
        />
      )}

      {/* Coach mark da primeira visita: escurece tudo menos o livro. */}
      <CoachMarkOficina estado={tutorial} />
      {/* Cada receita fecha do seu jeito: o pilao cobra rapidez, o pano cobra
          o gesto de girar. E a receita que diz qual estacao usar. */}
      {macetando && naMesa && (
        naMesa.minigame === 'torcer'
          ? <TorcendoPano recipe={naMesa} onDone={fechar} onClose={() => setMacetando(false)} />
          : <Macetando   recipe={naMesa} onDone={fechar} onClose={() => setMacetando(false)} />
      )}
    </>
  );
}
