'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { X, Search, Loader2, Gift, Send } from 'lucide-react';
import { searchUser, useSendGift, UserPreview } from '@/hooks/useGifts';

export function GiftSendModal({
  userId,
  itemId,
  onClose,
}: {
  userId: string;
  itemId: string;
  onClose: () => void;
}) {
  const [nicknameInput, setNicknameInput] = useState('');
  const [recipient, setRecipient] = useState<UserPreview | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const sendMutation = useSendGift(userId);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    const nick = nicknameInput.replace(/^@/, '').trim();
    if (!nick) return;
    setSearching(true);
    setSearchError(null);
    setRecipient(null);
    try {
      const user = await searchUser(nick);
      setRecipient(user);
    } catch (err: unknown) {
      setSearchError((err as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async () => {
    if (!recipient) return;
    try {
      await sendMutation.mutateAsync({ itemId, recipientNickname: recipient.nickname, message });
      setSent(true);
    } catch (err: unknown) {
      setSearchError((err as Error).message);
    }
  };

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
        <div
          className="relative flex flex-col items-center gap-5 p-8 rounded-3xl mx-8 text-center"
          style={{
            background: 'linear-gradient(160deg, #1c2d10, #0a1205)',
            border: '1.5px solid rgba(201,162,39,0.4)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 56 }}>🎁</div>
          <h2 className="text-xl font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>
            Presente enviado!
          </h2>
          <p className="text-sm" style={{ color: 'rgba(232,213,160,0.6)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>
            @{recipient?.nickname} vai receber uma notificação.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #2a5a1e, #1e4014)', color: '#bbf7d0', fontFamily: 'var(--font-display)' }}
          >
            ✦ Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div
        className="relative flex flex-col gap-5 p-6 rounded-3xl mx-4 w-full max-w-sm"
        style={{
          background: 'linear-gradient(160deg, #1c2d10, #0a1205)',
          border: '1.5px solid rgba(201,162,39,0.35)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold accent */}
        <div className="absolute top-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5" style={{ color: 'var(--color-gold)' }} />
            <h2 className="text-base font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>
              Presentear
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-all" style={{ color: 'rgba(232,213,160,0.5)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nickname search */}
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ fontFamily: 'var(--font-display)', color: 'rgba(232,213,160,0.45)' }}>
            Para quem?
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'rgba(232,213,160,0.4)' }}>@</span>
              <input
                ref={inputRef}
                className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(201,162,39,0.2)', color: 'var(--color-text-light)', fontFamily: 'var(--font-body)' }}
                placeholder="apelido"
                value={nicknameInput}
                onChange={(e) => { setNicknameInput(e.target.value); setRecipient(null); setSearchError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !nicknameInput.trim()}
              className="px-3 rounded-xl transition-all active:scale-90 disabled:opacity-40"
              style={{ background: 'rgba(201,162,39,0.2)', border: '1px solid rgba(201,162,39,0.3)', color: 'var(--color-gold)' }}
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          {searchError && <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>{searchError}</p>}
        </div>

        {/* Recipient preview */}
        {recipient && (
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,162,39,0.2)' }}>
            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: '1.5px solid rgba(201,162,39,0.4)', background: 'linear-gradient(135deg, #2a4a1e, #1a2f10)' }}>
              {recipient.avatar_url ? (
                <Image src={recipient.avatar_url} alt={recipient.nickname} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-black" style={{ color: 'var(--color-wood-light)', fontFamily: 'var(--font-display)' }}>
                  {recipient.nickname[0].toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>@{recipient.nickname}</p>
              <p className="text-[9px]" style={{ color: 'rgba(232,213,160,0.45)', fontFamily: 'var(--font-caption)' }}>Destinatário confirmado ✓</p>
            </div>
          </div>
        )}

        {/* Dedication message */}
        {recipient && (
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ fontFamily: 'var(--font-display)', color: 'rgba(232,213,160,0.45)' }}>
              Dedicatória (opcional)
            </label>
            <textarea
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(201,162,39,0.2)', color: 'var(--color-text-light)', fontFamily: 'var(--font-caption)', fontStyle: 'italic', height: 80 }}
              placeholder="Escreva uma mensagem carinhosa..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={280}
            />
          </div>
        )}

        {/* Send button */}
        {recipient && (
          <button
            onClick={handleSend}
            disabled={sendMutation.isPending}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
            style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #8b2a2a, #6b1a1a)', color: '#fecaca', border: '1px solid rgba(239,68,68,0.25)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar presente 🎁
          </button>
        )}
      </div>
    </div>
  );
}
