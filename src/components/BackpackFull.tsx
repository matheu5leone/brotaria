'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useInventory } from '@/hooks/useInventory';
import { authFetch } from '@/lib/authFetch';
import { ITEM_VISUAL } from '@/components/ItemGain';
import type { InventoryItem } from '@/types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Mochila cheia — PADRÃO DO JOGO
 *
 *  Qualquer ação que não conseguiu entregar um item chama `askBackpack()`:
 *
 *      const askBackpack = useBackpackFull();
 *      askBackpack({ incoming: [{ item_type: 'minhoca' }], onResolved: retry });
 *
 *  A tela põe o que está CHEGANDO à esquerda e a mochila à direita, e o jogador
 *  arrasta entre as duas para decidir o que fica de fora.
 *
 *  Sobre poderes: ao concluir, o cliente só manda ao servidor os slots a
 *  DESCARTAR — nunca "adicione tal item". Conceder item a pedido do cliente
 *  seria entregar a economia de bandeja. Com o espaço aberto, quem repete a
 *  ação original é o `onResolved`, e a entrega volta a passar pelo caminho
 *  normal, já autenticado e validado.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type IncomingItem = {
  item_type: string;
  rarity?: string | null;
  biome?: string | null;
  quantity?: number;
};

type Ask = {
  incoming: IncomingItem[];
  /** Roda depois de liberar espaço: refaz a ação que não coube. */
  onResolved?: () => void | Promise<void>;
};

const BackpackFullContext = createContext<(a: Ask) => void>(() => {});
export const useBackpackFull = () => useContext(BackpackFullContext);

function visualOf(type: string) {
  return ITEM_VISUAL[type] ?? { label: type };
}

/** Quadradinho de item, usado nos dois lados da tela. */
function ItemTile({
  type, quantity, dim, onClick, title,
}: { type: string; quantity?: number; dim?: boolean; onClick?: () => void; title?: string }) {
  const v = visualOf(type);
  return (
    <button
      onClick={onClick}
      title={title}
      className="relative flex items-center justify-center rounded-xl transition-all active:scale-90"
      style={{
        width: 54, height: 54,
        background: dim ? 'rgba(120,40,40,0.18)' : 'rgba(255,255,255,0.42)',
        border: `1.5px solid ${dim ? 'rgba(160,60,60,0.55)' : 'rgba(139,99,70,0.4)'}`,
        opacity: dim ? 0.65 : 1,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {v.src
        ? <Image src={v.src} alt="" width={30} height={30} className="object-contain pointer-events-none" draggable={false} />
        : <span style={{ fontSize: 26, lineHeight: 1 }} className="pointer-events-none">{v.emoji ?? '📦'}</span>}
      {quantity != null && quantity > 1 && (
        <span
          className="absolute bottom-0.5 right-1 text-[9px] font-black pointer-events-none"
          style={{ color: '#f2e8d5', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
        >
          {quantity}
        </span>
      )}
    </button>
  );
}

export function BackpackFullProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: items = [] } = useInventory(user?.id);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [discardIds, setDiscardIds] = useState<string[]>([]);
  const [rejected, setRejected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const open = useCallback((a: Ask) => {
    setAsk(a);
    setDiscardIds([]);
    setRejected([]);
  }, []);

  const close = useCallback(() => { setAsk(null); setBusy(false); }, []);

  // Quantos slots vão sobrar depois dos descartes marcados, e quantos são
  // precisos para o que está chegando.
  const livres = useMemo(() => discardIds.length, [discardIds]);
  const precisa = useMemo(
    () => (ask?.incoming.length ?? 0) - rejected.length,
    [ask, rejected],
  );
  const podeConcluir = livres >= precisa;

  const concluir = useCallback(async () => {
    if (!ask || busy || !podeConcluir) return;
    setBusy(true);
    try {
      if (discardIds.length) {
        await authFetch('/api/inventory/discard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIds: discardIds }),
        });
        qc.invalidateQueries({ queryKey: ['inventory', user?.id] });
      }
      // Espaço aberto: a ação original tenta de novo pelo caminho normal.
      await ask.onResolved?.();
    } catch (err) {
      console.error('[BackpackFull] Falha ao resolver:', err);
    } finally {
      close();
    }
  }, [ask, busy, podeConcluir, discardIds, qc, user?.id, close]);

  const perdidos = useMemo(() => {
    const nomes = rejected.map((i) => visualOf(ask?.incoming[i]?.item_type ?? '').label);
    const daMochila = discardIds
      .map((id) => items.find((it) => it.id === id))
      .filter(Boolean)
      .map((it) => visualOf((it as InventoryItem).item_type).label);
    return [...nomes, ...daMochila];
  }, [rejected, discardIds, ask, items]);

  return (
    <BackpackFullContext.Provider value={open}>
      {children}

      {ask && (
        <div
          className="evo-fade-in fixed inset-0 z-[10065] flex items-center justify-center px-4"
          style={{ background: 'rgba(5,8,3,0.72)', backdropFilter: 'blur(4px)' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="relative w-full max-w-md rounded-3xl p-5"
            style={{
              background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
              border: '1.5px solid var(--color-wood-light)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
            }}
          >
            <h2
              className="text-lg font-black text-center leading-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
            >
              Mochila cheia
            </h2>
            <p
              className="text-xs text-center mt-1 mb-4"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}
            >
              Toque para mover entre os lados. O que ficar à esquerda será perdido.
            </p>

            <div className="flex gap-3">
              {/* ESQUERDA: o que está chegando (+ o que você tirou da mochila) */}
              <div
                className="flex-1 rounded-2xl p-2.5"
                style={{ background: 'rgba(160,60,60,0.10)', border: '1.5px dashed rgba(160,60,60,0.45)' }}
              >
                <p
                  className="text-[9px] uppercase tracking-widest font-black text-center mb-2"
                  style={{ fontFamily: 'var(--font-display)', color: '#a03c3c' }}
                >
                  Fica de fora
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {ask.incoming.map((inc, i) =>
                    rejected.includes(i) ? (
                      <ItemTile key={`inc-${i}`} type={inc.item_type} quantity={inc.quantity} dim
                        title="Toque para tentar guardar" onClick={() => setRejected((r) => r.filter((x) => x !== i))} />
                    ) : null,
                  )}
                  {discardIds.map((id) => {
                    const it = items.find((x) => x.id === id);
                    if (!it) return null;
                    return (
                      <ItemTile key={id} type={it.item_type} quantity={it.quantity} dim
                        title="Toque para devolver à mochila"
                        onClick={() => setDiscardIds((d) => d.filter((x) => x !== id))} />
                    );
                  })}
                  {rejected.length === 0 && discardIds.length === 0 && (
                    <span className="text-[10px] py-4" style={{ color: 'var(--color-text-muted)' }}>
                      (vazio)
                    </span>
                  )}
                </div>
              </div>

              {/* DIREITA: a mochila */}
              <div
                className="flex-1 rounded-2xl p-2.5"
                style={{ background: 'rgba(42,90,30,0.08)', border: '1.5px solid rgba(42,90,30,0.3)' }}
              >
                <p
                  className="text-[9px] uppercase tracking-widest font-black text-center mb-2"
                  style={{ fontFamily: 'var(--font-display)', color: '#2a5a1e' }}
                >
                  Fica guardado
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {/* Itens novos ainda aceitos aparecem aqui, esperando um slot */}
                  {ask.incoming.map((inc, i) =>
                    rejected.includes(i) ? null : (
                      <ItemTile key={`in-${i}`} type={inc.item_type} quantity={inc.quantity}
                        title="Toque para deixar de fora" onClick={() => setRejected((r) => [...r, i])} />
                    ),
                  )}
                  {items.filter((it) => !discardIds.includes(it.id)).map((it) => (
                    <ItemTile key={it.id} type={it.item_type} quantity={it.quantity}
                      title="Toque para descartar" onClick={() => setDiscardIds((d) => [...d, it.id])} />
                  ))}
                </div>
              </div>
            </div>

            {/* Placar do que falta abrir */}
            <p
              className="text-[11px] text-center mt-3 font-bold"
              style={{ fontFamily: 'var(--font-display)', color: podeConcluir ? '#2a5a1e' : '#a03c3c' }}
            >
              {podeConcluir
                ? (perdidos.length ? `Será perdido: ${perdidos.join(', ')}` : 'Nada será perdido')
                : `Abra mais ${precisa - livres} espaço${precisa - livres > 1 ? 's' : ''}`}
            </p>

            <button
              onClick={concluir}
              disabled={!podeConcluir || busy}
              className="w-full mt-3 py-3 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-45"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
                color: '#d9f0c8',
                border: '1px solid rgba(74,222,128,0.25)',
              }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Concluir'}
            </button>
            <button
              onClick={close}
              className="w-full mt-2 text-xs font-bold underline"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}
            >
              Cancelar (perde o que está chegando)
            </button>
          </div>
        </div>
      )}
    </BackpackFullContext.Provider>
  );
}
