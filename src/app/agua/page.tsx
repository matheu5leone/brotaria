'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Droplets, X, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { AppShell } from '@/components/AppShell';
import { HexButton } from '@/components/HexButton';
import { UpgradeCanvas } from '@/components/upgrades/UpgradeCanvas';
import { WaterOverflowFx, type OverflowBurst } from '@/components/WaterOverflowFx';
import { GAME } from '@/config/economy';
import { useWaterStatus, useCollectWater } from '@/hooks/useWater';

const FILL_PER_CLICK = GAME.WATER_BAR_FILL_PER_CLICK;
const DECAY_PER_TICK = GAME.WATER_BAR_DECAY_PER_TICK;
const TICK_MS = GAME.WATER_BAR_TICK_MS;

function formatCd(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function AguaPage() {
  const statusQuery = useWaterStatus();
  const status = statusQuery.data;
  const collect = useCollectWater();

  const [modalOpen, setModalOpen] = useState(false);
  const [upgradesOpen, setUpgradesOpen] = useState(false);
  const [fill, setFill] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const collectingRef = useRef(false);
  const [overflowBursts, setOverflowBursts] = useState<OverflowBurst[]>([]);
  const burstIdRef = useRef(0);

  const balance = status?.balance ?? 0;
  const max = status?.max ?? GAME.WATER_MAX_BALANCE;
  const isFull = balance >= max;
  // Fim do cooldown derivado do momento em que a query trouxe o dado (sem ref/effect).
  const cdEnd = status?.cooldownRemainingMs ? statusQuery.dataUpdatedAt + status.cooldownRemainingMs : 0;
  const remaining = Math.max(0, cdEnd - now);
  const onCooldown = remaining > 0;
  const canFill = !!status?.collectableNow && !onCooldown && !isFull && !collect.isPending;

  // Relógio local: só faz tick (setState no callback, permitido pelo lint).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // Decaimento contínuo da barra (exige cliques rápidos). Reset feito no callback.
  useEffect(() => {
    if (!modalOpen) return;
    const id = setInterval(() => {
      setFill((f) => (canFill && f > 0 ? Math.max(0, f - DECAY_PER_TICK) : 0));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [canFill, modalOpen]);

  // Clique bombeia (updater PURO — sem side-effect: o StrictMode invoca updaters
  // 2x em dev e disparava coleta dupla quando o disparo morava aqui dentro).
  const pump = useCallback(() => {
    if (!canFill || collectingRef.current) return;
    setFill((f) => Math.min(100, f + FILL_PER_CLICK));
  }, [canFill]);

  // Cruzou 100% → coleta UMA vez (guarda por ref) e reseta a barra.
  // O saldo sobe OTIMISTA na hora (onMutate no hook); rollback se o servidor negar.
  useEffect(() => {
    if (fill < 100 || collectingRef.current) return;
    collectingRef.current = true;
    setFill(0);
    setOverflowBursts((b) => [...b, { id: ++burstIdRef.current, bonus: false }]);
    collect.mutateAsync()
      .then((data) => {
        if (data.bonus) setOverflowBursts((b) => [...b, { id: ++burstIdRef.current, bonus: true }]);
      })
      .catch(() => { /* rollback automático no hook */ })
      .finally(() => { collectingRef.current = false; });
  }, [fill, collect]);

  const removeOverflowBurst = useCallback((id: number) => {
    setOverflowBursts((b) => b.filter((x) => x.id !== id));
  }, []);

  const openModal = () => { setFill(0); setModalOpen(true); };

  // Chip de estado sob o poço (fora do modal)
  const wellHint = isFull
    ? 'Regador cheio!'
    : onCooldown
      ? `Recarrega em ${formatCd(remaining)}`
      : '💧 Coletar água';

  const statusLabel = isFull
    ? 'Regador cheio! Volte quando usar sua água.'
    : onCooldown
      ? `O poço recarrega em ${formatCd(remaining)}`
      : 'Clique rápido no regador para encher!';

  return (
    <AppShell scrollable={false}>
      {/* ── Cena: clareira com o poço (imagem de fundo) ─────────────────── */}
      <div
        className="relative w-full h-full overflow-hidden select-none"
        style={{
          backgroundImage: "url('/imgs/bg-coleta-agua.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)',
        }}
      >
        {/* Título — canto superior esquerdo */}
        <div className="absolute top-4 left-5 z-10">
          <h1
            className="text-2xl font-black leading-none"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
          >
            Coleta de Água
          </h1>
          <p
            className="text-xs mt-1"
            style={{ color: 'rgba(232,213,160,0.75)', fontFamily: 'var(--font-caption)', fontStyle: 'italic', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
          >
            Toque no poço para coletar
          </p>
        </div>

        {/* Saldo — canto superior direito (pop a cada mudança) */}
        <div
          key={balance}
          className="count-pop absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{
            background: 'rgba(8,14,5,0.72)',
            border: '1px solid rgba(96,165,250,0.45)',
            backdropFilter: 'blur(6px)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
          }}
        >
          <Droplets className="w-4 h-4" style={{ color: '#60a5fa' }} />
          <span className="font-black text-base leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>
            {balance}<span className="text-xs font-bold" style={{ color: 'rgba(232,213,160,0.55)' }}> / {max}</span>
          </span>
        </div>

        {/* ── Poço — hotspot clicável no centro da cena ──────────────────── */}
        <button
          onClick={openModal}
          aria-label="Abrir coleta de água"
          className="absolute z-10 flex flex-col items-center justify-end group"
          style={{
            left: '50%',
            top: '48%',
            transform: 'translate(-50%, -50%)',
            width: 'min(42vmin, 300px)',
            height: 'min(42vmin, 300px)',
            cursor: 'pointer',
            background: 'transparent',
            touchAction: 'manipulation',
          }}
        >
          {/* Glow que respira sobre o poço (some no hover, vira ring) */}
          <span
            className="well-breathe absolute inset-0 rounded-full pointer-events-none group-hover:opacity-0 transition-opacity"
            style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.16), transparent 62%)' }}
          />
          <span
            className="absolute inset-[8%] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ border: '2.5px solid rgba(96,165,250,0.65)', boxShadow: '0 0 24px rgba(96,165,250,0.45), inset 0 0 24px rgba(96,165,250,0.2)' }}
          />
          {/* Chip de estado logo abaixo do poço */}
          <span
            className="relative translate-y-3 px-3.5 py-1.5 rounded-full text-sm font-black whitespace-nowrap transition-transform group-hover:scale-105"
            style={{
              fontFamily: 'var(--font-display)',
              color: isFull ? '#d9f0c8' : onCooldown ? 'var(--color-text-light)' : '#bfe3ff',
              background: isFull ? 'rgba(42,90,30,0.85)' : onCooldown ? 'rgba(8,14,5,0.75)' : 'rgba(26,107,160,0.9)',
              border: `1.5px solid ${isFull ? 'rgba(74,222,128,0.4)' : onCooldown ? 'rgba(92,58,30,0.6)' : 'rgba(96,165,250,0.55)'}`,
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {wellHint}
          </span>
        </button>

        {/* Rodapé informativo */}
        <p
          className="absolute bottom-3 inset-x-0 z-10 text-center text-[11px] px-6"
          style={{ color: 'rgba(232,213,160,0.6)', fontFamily: 'var(--font-caption)', fontStyle: 'italic', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
        >
          Cada regador cheio rende 1 água · limite de {max} · nova coleta a cada {GAME.WATER_COLLECT_COOLDOWN_HOURS}h
        </p>

        {/* ── Botão flutuante — alterna entre abrir Melhorias e voltar ao poço ─ */}
        <div className="painel" onClick={(e) => e.stopPropagation()}>
          <HexButton
            className="painel-btn"
            icon={upgradesOpen
              ? <ArrowLeft style={{ width: '1em', height: '1em' }} />
              : <Droplets style={{ width: '1em', height: '1em' }} />}
            label={upgradesOpen ? 'Poço' : 'Melhorias'}
            onClick={(e) => { e.stopPropagation(); setUpgradesOpen((v) => !v); }}
            title={upgradesOpen ? 'Voltar ao poço' : 'Melhorias do poço'}
          />
        </div>

        {/* Árvore de melhorias — canvas em tela cheia (substitui a cena do poço) */}
        {upgradesOpen && <UpgradeCanvas categoryId="well" />}

        {/* ── Modal do minigame (abre ao clicar no poço) ─────────────────── */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ background: 'rgba(5,8,3,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => setModalOpen(false)}
          >
            <div
              className="relative w-full rounded-3xl p-6 pt-8 flex flex-col items-center gap-5"
              style={{
                maxWidth: 360,
                background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
                border: '1.5px solid var(--color-wood-light)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Acento dourado + fechar */}
              <div
                className="absolute top-0 left-8 right-8 h-px pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
              />
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Fechar"
                className="absolute top-3 right-3 p-1.5 rounded-full transition-all active:scale-90 hover:bg-black/10"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h2 className="text-lg font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
                  Poço do Jardim
                </h2>
                {/* Saldo dentro do modal — feedback instantâneo (otimista) */}
                <div key={balance} className="count-pop mt-1 inline-flex items-center gap-1.5 text-sm font-black" style={{ fontFamily: 'var(--font-display)', color: '#1a6ba0' }}>
                  <Droplets className="w-4 h-4" /> {balance} / {max} água
                </div>
              </div>

              {/* Barra vertical (wrapper sem clip para as gotas transbordarem pelo topo) */}
              <div className="relative" style={{ width: 88, height: 220 }}>
                <div
                  className="relative rounded-xl overflow-hidden"
                  style={{ width: 88, height: 220, background: 'rgba(92,58,30,0.15)', border: '2px solid var(--color-wood-light)' }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-[height] duration-75 ease-linear"
                    style={{
                      height: `${fill}%`,
                      background: 'linear-gradient(180deg, #60a5fa, #2563eb)',
                      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4)',
                    }}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center font-black text-lg pointer-events-none"
                    style={{ fontFamily: 'var(--font-display)', color: fill > 55 ? '#fff' : 'var(--color-text-dark)' }}
                  >
                    {Math.round(fill)}%
                  </div>
                </div>
                <WaterOverflowFx bursts={overflowBursts} onDone={removeOverflowBurst} />
              </div>

              {/* Regador — clique para bombear */}
              <button
                onClick={pump}
                disabled={!canFill}
                aria-label="Bombear água"
                className="select-none rounded-full p-4 transition-transform active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'radial-gradient(circle at 50% 35%, rgba(59,130,246,0.18), rgba(59,130,246,0.06))',
                  border: '2px solid rgba(59,130,246,0.4)',
                  touchAction: 'manipulation',
                }}
              >
                <Image src="/imgs/watering-can.webp" alt="regador" width={64} height={64} className="object-contain" draggable={false} />
              </button>

              <p
                className="text-sm font-bold text-center"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: isFull ? '#2a5a1e' : onCooldown ? 'var(--color-wood-mid)' : 'var(--color-text-mid)',
                }}
              >
                {statusLabel}
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
