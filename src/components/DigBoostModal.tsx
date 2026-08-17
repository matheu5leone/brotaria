'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { CoinIcon } from '@/components/CoinIcon';
import { useWallet } from '@/hooks/useWallet';
import { formatDigLeft } from '@/components/HexPot';

/**
 * Obra em andamento: cronômetro grande + oferta de terminar na hora com moedas.
 *
 * Só as faixas longas (24h e 7 dias) têm atalho — a espera curta é para ser
 * esperada. Quando não há atalho, o modal ainda abre: ele é a explicação da
 * regra ("buraco vazio atrasa o próximo"), que é o que o jogador precisa
 * entender para não achar que travou.
 *
 * Sem moedas suficientes, o botão vira o caminho da compra em vez de dar erro.
 */
export function DigBoostModal({
  msLeft,
  totalMs,
  cost,
  busy,
  onRush,
  onBuyCoins,
  onClose,
}: {
  msLeft: number;
  totalMs: number;
  /** Moedas para apressar, ou null se esta faixa não tem atalho. */
  cost: number | null;
  busy: boolean;
  onRush: () => void;
  onBuyCoins: () => void;
  onClose: () => void;
}) {
  const { coins } = useWallet();
  const [left, setLeft] = useState(msLeft);

  // Relógio próprio: o modal fica aberto e o número não pode congelar.
  useEffect(() => {
    setLeft(msLeft);
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1000)), 1000);
    return () => clearInterval(id);
  }, [msLeft]);

  const progress = Math.min(1, Math.max(0, 1 - left / totalMs));
  const podePagar = cost != null && coins >= cost;

  return (
    <div
      className="evo-fade-in fixed inset-0 z-[10060] flex items-center justify-center overflow-hidden select-none px-6"
      style={{ background: 'radial-gradient(ellipse at center, rgba(20,36,14,0.92) 0%, rgba(10,22,6,0.96) 70%)' }}
      onClick={onClose}
      // O modal nasce dentro do canvas de pan/zoom do jardim: sem isto o
      // pointerdown sobe até o handler do canvas, que captura o ponteiro e
      // retargeta o clique — os botões ficariam mortos no desktop.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-xs rounded-3xl p-6 text-center"
        style={{
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 p-1 rounded-full transition-transform active:scale-90"
          style={{ color: 'var(--color-wood-mid)' }}
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className="absolute top-0 left-10 right-10 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        <span
          className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4"
          style={{
            background: 'rgba(201,162,39,0.15)',
            color: 'var(--color-wood-mid)',
            border: '1px solid rgba(201,162,39,0.35)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Obra em andamento
        </span>

        {/* Cronômetro grande — mesma leitura do mostrador do canteiro */}
        <div
          className="dig-clock-ring relative rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{
            width: 116,
            height: 116,
            padding: 7,
            ['--prog' as string]: `${progress * 360}deg`,
            boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
          }}
        >
          <div
            className="relative w-full h-full rounded-full flex flex-col items-center justify-center overflow-hidden"
            style={{ background: 'rgba(12,20,8,0.96)', border: '1px solid rgba(201,162,39,0.35)' }}
          >
            <span
              className="dig-clock-hand absolute"
              style={{ width: 2.5, height: '36%', top: '14%', background: 'rgba(201,162,39,0.5)', borderRadius: 2 }}
            />
            <span
              className="relative font-mono font-black leading-none"
              style={{ fontSize: 26, color: '#f2e8d5', textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
            >
              {formatDigLeft(left)}
            </span>
            <span
              className="relative text-[9px] uppercase tracking-widest mt-1"
              style={{ color: 'rgba(242,232,213,0.6)', fontFamily: 'var(--font-display)' }}
            >
              restantes
            </span>
          </div>
        </div>

        {cost == null ? (
          <>
            <p
              className="text-sm leading-relaxed mb-5"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}
            >
              Esta obra é curta — daqui a pouco o canteiro está pronto.
              <br />
              <span className="text-xs opacity-80">
                Obras ficam mais longas quando você deixa canteiros vazios sem plantar.
              </span>
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
                color: '#d9f0c8',
                border: '1px solid rgba(74,222,128,0.25)',
              }}
            >
              Entendi
            </button>
          </>
        ) : (
          <>
            <p
              className="text-sm leading-relaxed mb-4"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}
            >
              Com pressa? Termine a obra <b>agora mesmo</b> e plante sem esperar.
            </p>

            <button
              onClick={podePagar ? onRush : onBuyCoins}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-60"
              style={{
                fontFamily: 'var(--font-display)',
                background: podePagar
                  ? 'linear-gradient(135deg, #c9a227, #9a7a15)'
                  : 'linear-gradient(135deg, #2a5a1e, #1e4014)',
                color: podePagar ? '#2a1f05' : '#d9f0c8',
                border: '1px solid rgba(201,162,39,0.45)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              }}
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : podePagar ? (
                <>⏩ Terminar agora · <CoinIcon size={16} /> {cost}</>
              ) : (
                <>Faltam moedas — conseguir mais</>
              )}
            </button>

            <div
              className="flex items-center justify-center gap-1.5 mt-3 text-xs font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-mid)' }}
            >
              <CoinIcon size={14} />
              <span>{coins}</span>
              <span className="opacity-70">
                {podePagar ? 'no seu bolso' : `— você precisa de ${cost}`}
              </span>
            </div>

            <p
              className="text-[11px] leading-snug mt-4"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}
            >
              Ou espere de graça. Dica: obras ficam mais longas quando você deixa
              canteiros vazios sem plantar.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
