'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { useWallet } from '@/hooks/useWallet';
import {
  CHANGELOG,
  LATEST,
  CURRENT_VERSION,
  type ChangelogEntry,
  type ChangelogNoteType,
} from '@/config/changelog';

/** Cor e rótulo do chip de cada tipo de linha. */
const NOTE_STYLE: Record<ChangelogNoteType, { label: string; color: string; bg: string; border: string }> = {
  novo:          { label: 'Novo',       color: '#2a5a1e',                 bg: 'rgba(42,90,30,0.10)',   border: 'rgba(42,90,30,0.28)' },
  melhoria:      { label: 'Melhoria',   color: 'var(--color-wood-dark)',  bg: 'rgba(201,162,39,0.14)', border: 'rgba(201,162,39,0.38)' },
  balanceamento: { label: 'Ajuste',     color: 'var(--color-wood-mid)',   bg: 'rgba(92,58,30,0.09)',   border: 'rgba(92,58,30,0.25)' },
  correcao:      { label: 'Correção',   color: 'var(--color-text-muted)', bg: 'rgba(92,58,30,0.05)',   border: 'rgba(92,58,30,0.18)' },
};

/** dd/mm/aaaa a partir do ISO, sem depender de fuso. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function NoteRow({ note }: { note: { type: ChangelogNoteType; text: string } }) {
  const s = NOTE_STYLE[note.type] ?? NOTE_STYLE.melhoria;
  return (
    <li className="flex gap-2.5 items-start">
      <span
        className="flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-display)', color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
      >
        {s.label}
      </span>
      <span
        className="text-[13px] leading-relaxed"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}
      >
        {note.text}
      </span>
    </li>
  );
}

/** Um release inteiro — usado no destaque e em cada item do histórico. */
function Release({ entry, compact = false }: { entry: ChangelogEntry; compact?: boolean }) {
  return (
    <div>
      {!compact && entry.image && (
        <div
          className="mx-auto mb-3 flex items-center justify-center rounded-full"
          style={{
            width: 84,
            height: 84,
            background: 'radial-gradient(circle, rgba(201,162,39,0.26) 0%, rgba(92,58,30,0.10) 55%, transparent 72%)',
            border: '2px solid rgba(201,162,39,0.35)',
          }}
        >
          <Image src={entry.image} alt="" width={52} height={52} className="object-contain drop-shadow-lg" />
        </div>
      )}

      <h3
        className={`font-black leading-tight ${compact ? 'text-base' : 'text-xl text-center'}`}
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
      >
        {entry.title}
      </h3>

      <p
        className={`text-[13px] leading-relaxed italic mt-1 mb-3 ${compact ? '' : 'text-center'}`}
        style={{ fontFamily: 'var(--font-caption)', color: 'var(--color-text-muted)' }}
      >
        {entry.intro}
      </p>

      <ul className="flex flex-col gap-2.5 text-left">
        {entry.notes.map((note, i) => (
          <NoteRow key={i} note={note} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Nota de atualização — conta ao jogador o que mudou no jogo.
 *
 * `mode: 'auto'`   → abriu sozinho depois de um update; o botão confirma a leitura.
 * `mode: 'browse'` → o jogador abriu pelo menu; só fecha, não mexe no que foi lido.
 */
export function ChangelogModal({
  mode = 'browse',
  onClose,
}: {
  mode?: 'auto' | 'browse';
  onClose: () => void;
}) {
  const { refresh } = useWallet();
  const [loading, setLoading] = useState(false);
  const older = CHANGELOG.slice(1);

  const close = async () => {
    if (loading) return;
    if (mode === 'auto') {
      setLoading(true);
      try {
        await authFetch('/api/profile/changelog-ack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: CURRENT_VERSION }),
        });
        await refresh();
      } catch {
        // Não travar o jogador no popup se a confirmação falhar.
      }
    }
    onClose();
  };

  return (
    <div
      className="evo-fade-in fixed inset-0 z-[10040] flex items-center justify-center"
      style={{ background: 'rgba(5,8,3,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={close}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="relative flex flex-col mx-4 rounded-3xl overflow-hidden"
        style={{
          width: 'min(94vw, 420px)',
          maxHeight: '86vh',
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* filete dourado do topo */}
        <div
          className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-2 px-6 pt-6 pb-3 flex-shrink-0">
          <div>
            <span
              className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
              style={{
                background: 'rgba(201,162,39,0.15)',
                color: 'var(--color-wood-mid)',
                border: '1px solid rgba(201,162,39,0.35)',
                fontFamily: 'var(--font-display)',
              }}
            >
              Nota de atualização · v{LATEST.version}
            </span>
            <p
              className="text-[10px] mt-1.5 ml-1"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}
            >
              {formatDate(LATEST.date)}
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Fechar"
            className="p-1.5 rounded-full transition-colors hover:bg-black/10 active:scale-90 flex-shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo rolável — o histórico não pode empurrar o botão pra fora da tela */}
        <div className="px-6 overflow-y-auto overflow-x-hidden">
          <Release entry={LATEST} />

          {older.length > 0 && (
            <details className="mt-5 mb-1">
              <summary
                className="cursor-pointer text-[11px] font-black uppercase tracking-widest py-2 list-none select-none"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
              >
                Atualizações anteriores ({older.length})
              </summary>
              <div className="flex flex-col gap-5 pt-2">
                {older.map((entry) => (
                  <div
                    key={entry.version}
                    className="pt-4"
                    style={{ borderTop: '1px solid rgba(92,58,30,0.18)' }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-widest mb-1"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-mid)' }}
                    >
                      v{entry.version} · {formatDate(entry.date)}
                    </p>
                    <Release entry={entry} compact />
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 pt-4 pb-6 flex-shrink-0">
          <button
            onClick={close}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
              color: '#d9f0c8',
              border: '1px solid rgba(74,222,128,0.25)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'auto' ? 'Entendi' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  );
}
