'use client';

import { useState } from 'react';
import { X, Lock, Loader2, Check } from 'lucide-react';
import { useAvatars, useSelectAvatar, AvatarSlot } from '@/hooks/useAvatars';

/** Modal de seleção de foto de perfil. Bloqueadas aparecem como mistério (🔒). */
export function AvatarPickerModal({ onClose }: { onClose: () => void }) {
  const { data, isPending } = useAvatars();
  const select = useSelectAvatar();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const onPick = async (slot: AvatarSlot) => {
    if (slot.locked || slot.selected || select.isPending) return;
    setError(null);
    setPendingId(slot.id);
    try {
      await select.mutateAsync(slot.id);
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Erro ao selecionar.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(8,14,5,0.6)', backdropFilter: 'blur(3px)' }} />

      <div
        className="relative w-full max-w-md rounded-2xl p-5"
        style={{
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }} />

        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
            Foto de perfil
          </h2>
          <button onClick={onClose} aria-label="Fechar" style={{ color: 'var(--color-text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs mb-4" style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
          Escolha entre as que você já desbloqueou
          {data ? ` · ${data.unlockedCount}/${data.total} desbloqueadas` : ''}
        </p>

        {isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {(data?.slots ?? []).map((slot) => {
              if (slot.locked) {
                return (
                  <div
                    key={slot.id}
                    title="Bloqueada"
                    className="aspect-square rounded-full flex items-center justify-center"
                    style={{
                      background: 'repeating-linear-gradient(45deg, rgba(92,58,30,0.12), rgba(92,58,30,0.12) 6px, rgba(92,58,30,0.06) 6px, rgba(92,58,30,0.06) 12px)',
                      border: '1.5px dashed rgba(92,58,30,0.35)',
                    }}
                  >
                    <Lock className="w-5 h-5" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }} />
                  </div>
                );
              }
              const busy = pendingId === slot.id;
              return (
                <button
                  key={slot.id}
                  onClick={() => onPick(slot)}
                  disabled={select.isPending}
                  title={slot.name}
                  className="relative aspect-square rounded-full overflow-hidden transition-transform active:scale-95 disabled:opacity-70"
                  style={{
                    border: slot.selected ? '2.5px solid var(--color-gold)' : '2px solid var(--color-wood-light)',
                    boxShadow: slot.selected ? '0 0 0 3px rgba(201,162,39,0.25)' : 'none',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slot.imageUrl} alt={slot.name} className="w-full h-full object-cover" draggable={false} />
                  {slot.selected && (
                    <div className="absolute bottom-0 right-0 rounded-full p-0.5" style={{ background: 'var(--color-gold)' }}>
                      <Check className="w-3 h-3" style={{ color: '#1a2f10' }} />
                    </div>
                  )}
                  {busy && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(8,14,5,0.4)' }}>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {error && <p className="mt-3 text-xs text-center" style={{ color: '#8b2828' }}>{error}</p>}
      </div>
    </div>
  );
}
