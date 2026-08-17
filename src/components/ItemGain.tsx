'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Image from 'next/image';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Ganho de item — PADRÃO DO JOGO
 *
 *  Qualquer ação que renda item chama `gain()` e ganha, de graça, o mesmo
 *  feedback: o ícone voa até a mochila e um "+1 <item>" sobe no lugar.
 *
 *      const gain = useItemGain();
 *      gain({ item: 'minhoca', from: rect });   // +1 🪱 minhoca
 *      gain({ item: 'polen', amount: 2 });      // +2, sem origem → centro
 *
 *  Por que um provider e não um componente solto: o efeito precisa sobreviver
 *  ao desmonte de quem o disparou (o canteiro some quando a obra conclui, a
 *  abelha voa embora) e precisa ficar por cima de tudo. Vivendo na raiz, some
 *  o prop-drilling e o z-index para de ser negociação.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Catálogo visual dos itens. Emoji é o padrão; sprite quando existir arte. */
export const ITEM_VISUAL: Record<string, { label: string; emoji?: string; src?: string }> = {
  minhoca:       { label: 'minhoca',       emoji: '🪱' },
  terra_molhada: { label: 'terra molhada', emoji: '🟫' },
  polen:         { label: 'pólen',         src: '/imgs/polen.webp' },
  elixir:        { label: 'elixir',        src: '/imgs/elixir.webp' },
  seed:          { label: 'semente',       src: '/imgs/seed.webp' },
  wrapping_kit:  { label: 'kit',           emoji: '🎁' },
};

export type GainRequest = {
  /** Chave do ITEM_VISUAL, ou um rótulo livre se vier `emoji`/`src`. */
  item: string;
  amount?: number;
  /** De onde parte o voo (centro do elemento). Sem isso, nasce no meio da tela. */
  from?: { x: number; y: number };
  emoji?: string;
  src?: string;
  label?: string;
};

type Gain = Required<Pick<GainRequest, 'item' | 'amount'>> & {
  id: number;
  label: string;
  emoji?: string;
  src?: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
};

const ItemGainContext = createContext<(g: GainRequest) => void>(() => {});

export const useItemGain = () => useContext(ItemGainContext);

/** Centro da mochila — o destino do voo. Cai pro canto se ela não estiver montada. */
function backpackPoint(): { x: number; y: number } {
  const el = document.querySelector('[data-tutorial="backpack"]');
  if (el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { x: window.innerWidth - 40, y: window.innerHeight - 40 };
}

export function ItemGainProvider({ children }: { children: React.ReactNode }) {
  const [gains, setGains] = useState<Gain[]>([]);
  const nextId = useRef(0);

  const gain = useCallback((req: GainRequest) => {
    if (typeof window === 'undefined') return;
    const visual = ITEM_VISUAL[req.item] ?? {};
    const from = req.from ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const g: Gain = {
      id: nextId.current++,
      item: req.item,
      amount: req.amount ?? 1,
      label: req.label ?? visual.label ?? req.item,
      emoji: req.emoji ?? visual.emoji,
      src: req.src ?? visual.src,
      from,
      to: backpackPoint(),
    };
    setGains((list) => [...list, g]);
    // 1,5s cobre a mais longa das duas animações (o texto subindo).
    setTimeout(() => setGains((list) => list.filter((x) => x.id !== g.id)), 1600);
  }, []);

  return (
    <ItemGainContext.Provider value={gain}>
      {children}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1000000 }}>
        {gains.map((g) => (
          <div key={g.id}>
            {/* O ícone voando até a mochila: diz PARA ONDE o item foi */}
            <div
              className="gain-fly fixed flex items-center justify-center"
              style={{
                left: g.from.x,
                top: g.from.y,
                width: 30,
                height: 30,
                fontSize: 24,
                lineHeight: 1,
                ['--fly-dx' as string]: `${g.to.x - g.from.x}px`,
                ['--fly-dy' as string]: `${g.to.y - g.from.y}px`,
              }}
            >
              {g.src
                ? <Image src={g.src} alt="" width={30} height={30} className="object-contain" draggable={false} />
                : <span>{g.emoji ?? '✨'}</span>}
            </div>

            {/* O texto subindo: diz O QUE foi ganho */}
            <span
              className="gain-rise fixed whitespace-nowrap font-black"
              style={{
                left: g.from.x,
                top: g.from.y - 16,
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                color: '#7ef06a',
              }}
            >
              +{g.amount} {g.label}
            </span>
          </div>
        ))}
      </div>
    </ItemGainContext.Provider>
  );
}
