'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Gift, Check } from 'lucide-react';
import { useAcceptGift, useDeclineGift, PendingGift } from '@/hooks/useGifts';
import { FallingLeaves } from '@/components/FallingLeaves';

type Phase = 'preview' | 'opening' | 'revealed';

// ── Confetti CSS-only ─────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#c9a227', '#4ade80', '#60a5fa', '#f87171', '#a78bfa', '#fb923c', '#34d399'];

const CONFETTI_PIECES = Array.from({ length: 48 }, (_, i) => ({
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: `${(i / 48) * 100}%`,
  delay: `${(i * 0.06).toFixed(2)}s`,
  dur: `${1.2 + (i % 4) * 0.3}s`,
  size: 6 + (i % 4) * 3,
  rotate: `${(i * 37) % 360}deg`,
}));

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
      {CONFETTI_PIECES.map((p, i) => (
        <div
          key={i}
          className="absolute top-0"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rotate})`,
            animation: `confetti-fall ${p.dur} ${p.delay} ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}

// ── Modal principal ────────────────────────────────────────────────────────────

export function GiftReceiveModal({
  userId,
  gift,
  onClose,
}: {
  userId: string;
  gift: PendingGift;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('preview');
  const [revealedMessage, setRevealedMessage] = useState<string | null>(null);
  const acceptMutation = useAcceptGift(userId);
  const declineMutation = useDeclineGift(userId);

  const senderName = gift.sender?.nickname ? `@${gift.sender.nickname}` : 'Alguém';
  const plantName = gift.plant?.current_stage?.name ?? 'Planta';

  const handleAccept = async () => {
    setPhase('opening');
    try {
      const result = await acceptMutation.mutateAsync({ giftId: gift.id });
      setRevealedMessage(result.message ?? null);
      setPhase('revealed');
    } catch {
      setPhase('preview');
    }
  };

  const handleDecline = async () => {
    await declineMutation.mutateAsync({ giftId: gift.id });
    onClose();
  };

  return (
    <>
      {/* Confetti + leaves during reveal */}
      {phase === 'revealed' && (
        <>
          <Confetti />
          <div className="fixed inset-0 pointer-events-none z-[9997]">
            <FallingLeaves />
          </div>
        </>
      )}

      <div
        className="fixed inset-0 z-[9996] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        onClick={phase === 'revealed' ? onClose : undefined}
      >
        <div
          className="relative flex flex-col items-center gap-5 p-7 rounded-3xl mx-5 w-full max-w-sm text-center"
          style={{
            background: 'linear-gradient(160deg, #1c2d10, #0a1205)',
            border: '1.5px solid rgba(201,162,39,0.4)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gold accent */}
          <div className="absolute top-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }} />

          {/* Close (só no revealed) */}
          {phase === 'revealed' && (
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 transition-all" style={{ color: 'rgba(232,213,160,0.5)' }}>
              <X className="w-5 h-5" />
            </button>
          )}

          {/* ── Preview ────────────────────────────────────────────────────── */}
          {phase === 'preview' && (
            <>
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(201,162,39,0.1)', border: '2px solid rgba(201,162,39,0.3)' }}
              >
                {gift.sender?.avatar_url ? (
                  <div className="relative w-full h-full rounded-full overflow-hidden">
                    <Image src={gift.sender.avatar_url} alt={senderName} fill className="object-cover" />
                  </div>
                ) : (
                  <span className="text-3xl font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>
                    {gift.sender?.nickname?.[0]?.toUpperCase() ?? '?'}
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-lg font-black mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>
                  {senderName} te enviou um presente!
                </h2>
                <p className="text-sm" style={{ color: 'rgba(232,213,160,0.6)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>
                  Um(a) {plantName} embrulhado(a) aguarda você.
                </p>
              </div>

              {/* Presente animado */}
              <div style={{ fontSize: 64, animation: 'gift-shake 1.2s ease-in-out infinite' }}>🎁</div>

              {gift.message && (
                <div
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,162,39,0.15)', color: 'rgba(232,213,160,0.8)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}
                >
                  "{gift.message}"
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={handleDecline}
                  disabled={declineMutation.isPending}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                  style={{ fontFamily: 'var(--font-display)', background: 'rgba(127,29,29,0.3)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  Recusar
                </button>
                <button
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                  style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #166534, #15803d)', color: '#bbf7d0', border: '1px solid rgba(74,222,128,0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                >
                  <Gift className="w-4 h-4" />
                  Aceitar
                </button>
              </div>
            </>
          )}

          {/* ── Opening animation ──────────────────────────────────────────── */}
          {phase === 'opening' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div style={{ fontSize: 72, animation: 'gift-explode 0.8s ease-out forwards' }}>🎁</div>
              <p className="text-sm" style={{ color: 'rgba(232,213,160,0.6)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>
                Abrindo presente...
              </p>
            </div>
          )}

          {/* ── Revealed ───────────────────────────────────────────────────── */}
          {phase === 'revealed' && (
            <>
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.15)', border: '2px solid rgba(74,222,128,0.4)' }}>
                <Check className="w-10 h-10" style={{ color: '#4ade80' }} />
              </div>

              <div>
                <h2 className="text-xl font-black mb-1" style={{ fontFamily: 'var(--font-display)', color: '#4ade80' }}>
                  Presente recebido! 🎉
                </h2>
                <p className="text-sm" style={{ color: 'rgba(232,213,160,0.6)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>
                  Agora está no seu inventário.
                </p>
              </div>

              {revealedMessage && (
                <div
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}
                >
                  <p className="text-xs mb-1 font-black uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)', color: 'rgba(74,222,128,0.6)' }}>Dedicatória</p>
                  <p className="text-sm" style={{ color: 'rgba(232,213,160,0.85)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>"{revealedMessage}"</p>
                </div>
              )}

              <button
                onClick={onClose}
                className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #166534, #15803d)', color: '#bbf7d0', border: '1px solid rgba(74,222,128,0.3)' }}
              >
                ✦ Maravilha!
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
