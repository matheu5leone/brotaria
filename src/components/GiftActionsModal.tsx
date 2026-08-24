'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Gift, PackageOpen, SendHorizonal, Loader2, Tag, Check } from 'lucide-react';
import { useUnwrap } from '@/hooks/useGifts';
import type { InventoryItem } from '@/types';

/**
 * Ações de uma planta embrulhada (abrir / presentear / desfazer) + etiqueta.
 *
 * Antes isto era um overlay DENTRO do slot de 57×57px da mochila, com três
 * botões de 8px e o editor de etiqueta por cima — impossível de acertar no
 * dedo. Agora é um modal de tela, com alvos de toque de verdade.
 */
export function GiftActionsModal({
  item,
  userId,
  onOpenGift,
  onSendGift,
  onLabelSave,
  onClose,
}: {
  item: InventoryItem;
  userId: string;
  /** Abre o presente (revela a planta). */
  onOpenGift: () => void;
  /** Vai para o fluxo de escolher destinatário. */
  onSendGift: () => void;
  onLabelSave: (label: string) => void;
  onClose: () => void;
}) {
  const unwrap = useUnwrap(userId);
  const [label, setLabel] = useState(item.label ?? '');
  const [labelSaved, setLabelSaved] = useState(false);

  const saveLabel = () => {
    onLabelSave(label);
    setLabelSaved(true);
    setTimeout(() => setLabelSaved(false), 1400);
  };

  const acao =
    'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40';

  return (
    <div
      className="evo-fade-in fixed inset-0 z-[10030] flex items-center justify-center"
      style={{ background: 'rgba(5,8,3,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="relative flex flex-col mx-4 p-5 rounded-3xl"
        style={{
          width: 'min(94vw, 380px)',
          maxHeight: '88vh',
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-2 mb-1 flex-shrink-0">
          <h2
            className="text-lg font-black"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
          >
            Planta embrulhada
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-full transition-all hover:bg-black/10 active:scale-90 flex-shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="text-center py-3">
            <Image src="/imgs/presente.webp" alt="presente" width={92} height={84} className="object-contain mx-auto select-none" draggable={false} />
            <p
              className="text-[12px] mt-1"
              style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}
            >
              Ninguém sabe o que tem dentro até abrir.
            </p>
          </div>

          {/* Etiqueta */}
          <label
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
          >
            <Tag className="w-3 h-3" /> Etiqueta
          </label>
          <div className="flex gap-2 mb-4">
            <input
              value={label}
              maxLength={100}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(); }}
              placeholder="Para quem é? (opcional)"
              className="flex-1 min-w-0 text-sm rounded-lg px-3 py-2 outline-none"
              style={{
                fontFamily: 'var(--font-body)',
                background: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(139,99,70,0.35)',
                color: 'var(--color-text-dark)',
              }}
            />
            <button
              onClick={saveLabel}
              className="px-3 rounded-lg text-xs font-black transition-all active:scale-95 flex-shrink-0"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--color-wood-dark)',
                background: 'rgba(201,162,39,0.16)',
                border: '1px solid rgba(201,162,39,0.4)',
              }}
            >
              {labelSaved ? <Check className="w-4 h-4" /> : 'Salvar'}
            </button>
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { onClose(); onOpenGift(); }}
              className={acao}
              style={{
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
                color: '#d9f0c8',
                border: '1px solid rgba(74,222,128,0.25)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              }}
            >
              <Gift className="w-4 h-4 flex-shrink-0" />
              <span className="text-left">
                Abrir presente
                <span className="block text-[10px] font-normal opacity-75">Revela a planta na sua mochila</span>
              </span>
            </button>

            <button
              onClick={() => { onClose(); onSendGift(); }}
              className={acao}
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--color-wood-dark)',
                background: 'rgba(201,162,39,0.16)',
                border: '1px solid rgba(201,162,39,0.45)',
              }}
            >
              <SendHorizonal className="w-4 h-4 flex-shrink-0" />
              <span className="text-left">
                Presentear alguém
                <span className="block text-[10px] font-normal opacity-75">Envia para outro jardineiro</span>
              </span>
            </button>

            <button
              onClick={() => { unwrap.mutate({ itemId: item.id }, { onSuccess: onClose }); }}
              disabled={unwrap.isPending}
              className={acao}
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text-mid)',
                background: 'rgba(92,58,30,0.09)',
                border: '1px solid rgba(92,58,30,0.28)',
              }}
            >
              {unwrap.isPending
                ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                : <PackageOpen className="w-4 h-4 flex-shrink-0" />}
              <span className="text-left">
                Desfazer embrulho
                <span className="block text-[10px] font-normal opacity-75">Volta a ser uma planta comum</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
