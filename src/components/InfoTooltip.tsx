'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Infobox "?" — mostra um texto explicativo ao passar o mouse (desktop) ou tocar
 * (mobile). Fecha ao clicar fora. Pensado para o canto de um card.
 */
export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="Mais informações"
        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black leading-none transition-colors"
        style={{
          background: 'rgba(92,58,30,0.14)',
          color: 'var(--color-text-muted)',
          border: '1px solid rgba(92,58,30,0.3)',
          fontFamily: 'var(--font-display)',
        }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 right-0 top-6 w-56 px-3 py-2 rounded-lg text-[11px] leading-snug text-left pointer-events-none"
          style={{
            background: 'rgba(8,14,5,0.94)',
            color: 'var(--color-text-light)',
            border: '1px solid rgba(201,162,39,0.35)',
            boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
