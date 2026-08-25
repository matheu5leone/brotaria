'use client';

import Image from 'next/image';
import Link from 'next/link';

/**
 * Popup único: a Oficina acabou de abrir.
 *
 * Dispara na PRIMEIRA obra concluída — o mesmo momento em que o jogador pode ter
 * recebido terra molhada. Não é coincidência: a sala abre já com um ingrediente
 * na mão, em vez de virar mais um menu vazio esperando material.
 *
 * Visual no molde do WelcomeSeedModal (o padrão de "você ganhou algo" do jogo).
 */
export function OficinaDestravadaModal({
  nickname,
  onClose,
}: {
  nickname: string | null;
  onClose: () => void;
}) {
  return (
    <div
      className="evo-fade-in fixed inset-0 z-[10060] flex items-center justify-center overflow-hidden select-none px-6"
      style={{ background: 'radial-gradient(ellipse at center, #24401a 0%, #16290c 55%, #0a1606 100%)' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Brilho estático atrás do card — não gira, para não parecer loading. */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 'min(120vw, 900px)',
          height: 'min(120vw, 900px)',
          background: 'radial-gradient(circle, rgba(255,224,150,0.20) 0%, rgba(255,200,90,0.07) 38%, transparent 66%)',
        }}
      />

      <div
        className="relative p-7 rounded-3xl text-center max-w-sm w-full"
        style={{
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
      >
        <div
          className="absolute top-0 left-10 right-10 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        <div
          className="mx-auto mb-4 flex items-center justify-center rounded-full"
          style={{
            width: 104,
            height: 104,
            background: 'radial-gradient(circle, rgba(201,162,39,0.30) 0%, rgba(92,58,30,0.12) 55%, transparent 72%)',
            border: '2px solid rgba(201,162,39,0.4)',
          }}
        >
          <Image src="/imgs/craft/macetador.webp" alt="" width={70} height={70} className="object-contain drop-shadow-lg" />
        </div>

        <span
          className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3"
          style={{
            background: 'rgba(201,162,39,0.15)',
            color: 'var(--color-wood-mid)',
            border: '1px solid rgba(201,162,39,0.35)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Novo lugar no jardim
        </span>

        <h2
          className="text-2xl font-black mb-2 leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
        >
          A Oficina abriu!
        </h2>
        <p
          className="text-sm leading-relaxed mb-5"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}
        >
          A terra que você cavou não serve só de canteiro. Na Oficina dá para
          macetar, torcer e transformar o que sai dela em coisa melhor.
        </p>

        <Link
          href="/craft"
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 mb-2"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
            color: '#d9f0c8',
            border: '1px solid rgba(74,222,128,0.25)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          Conhecer a Oficina
        </Link>

        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
        >
          {nickname ? 'Agora não, fico no jardim' : 'Agora não'}
        </button>
      </div>
    </div>
  );
}
