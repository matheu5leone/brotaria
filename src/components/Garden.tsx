'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Pot } from '@/types';
import { X } from 'lucide-react';
import CoinPurchaseModal from './CoinPurchaseModal';
import { usePots, useShovelStatus } from '@/hooks/useGardenData';
import { usePlant } from '@/hooks/usePlantData';
import {
  useDigMutation,
  usePlantMutation,
  useWaterMutation,
  useDeleteMutation,
} from '@/hooks/useGardenMutations';
import { useQueryClient } from '@tanstack/react-query';
import { PlantHistoryModal } from '@/components/PlantHistoryModal';
import { InventoryPanel } from '@/components/InventoryPanel';
import { useWrapPlant } from '@/hooks/useInventory';
import { HexButton } from '@/components/HexButton';
import { HexPot, getPotState } from '@/components/HexPot';
import { PlantActionMenu } from '@/components/PlantActionMenu';
import { PlantDetailModal } from '@/components/PlantDetailModal';

const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

// Partículas decorativas — posições fixas para SSR-safe
const PARTICLES = [
  { x: 4,  y: 8,  s: 18, d: 0,   o: 0.22, dur: 5.2 },
  { x: 14, y: 82, s: 13, d: 1.3, o: 0.17, dur: 6.1 },
  { x: 87, y: 6,  s: 16, d: 0.8, o: 0.20, dur: 4.8 },
  { x: 94, y: 72, s: 11, d: 2.1, o: 0.15, dur: 5.7 },
  { x: 48, y: 91, s: 10, d: 0.5, o: 0.14, dur: 6.4 },
  { x: 2,  y: 48, s: 12, d: 1.9, o: 0.16, dur: 5.0 },
  { x: 76, y: 88, s: 14, d: 0.3, o: 0.18, dur: 4.6 },
  { x: 28, y: 4,  s: 9,  d: 1.6, o: 0.13, dur: 5.9 },
];

function formatCooldown(ms: number): string {
  if (ms <= 0) return 'Pronta';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.ceil((ms % 60_000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Wrapper para buscar plant e abrir o modal de histórico
function HistoryWrapper({ plantId, onClose }: { plantId: string; onClose: () => void }) {
  const { data: plant } = usePlant(plantId);
  if (!plant) return null;
  return <PlantHistoryModal plant={plant} open onClose={onClose} />;
}

export default function Garden() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: pots = [], isPending: potsLoading, error: potsError } = usePots(user?.id);
  const { data: shovelStatus } = useShovelStatus(user?.id);
  const shovelCooldownMs = shovelStatus?.cooldownRemainingMs ?? 0;
  const shovelReady = shovelCooldownMs === 0;

  // ── Mutations ────────────────────────────────────────────────────────────
  const digMutation    = useDigMutation(user?.id ?? '');
  const plantMutation  = usePlantMutation(user?.id ?? '');
  const waterMutation  = useWaterMutation(user?.id ?? '');
  const deleteMutation = useDeleteMutation(user?.id ?? '');
  const wrapMutation   = useWrapPlant(user?.id ?? '');

  // ── UI state ─────────────────────────────────────────────────────────────
  const [selectedPotId, setSelectedPotId]   = useState<string | null>(null);
  const [historyPlantId, setHistoryPlantId] = useState<string | null>(null);
  const [coinModalPotId, setCoinModalPotId] = useState<string | null>(null);
  const [shovelActive, setShovelActive]     = useState(false);
  const [shovelError, setShovelError]       = useState<string | null>(null);
  const [cursorPos, setCursorPos]           = useState<{ x: number; y: number } | null>(null);
  const [wrappingMode, setWrappingMode]     = useState(false);
  const [wrapError, setWrapError]           = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Derived ──────────────────────────────────────────────────────────────
  const selectedPot    = pots.find(p => p.id === selectedPotId) ?? null;
  const selectedPlantId = selectedPot?.plant_id ?? null;

  // ── Callbacks ────────────────────────────────────────────────────────────
  const handleDigComplete = useCallback(
    () => qc.invalidateQueries({ queryKey: ['garden', 'pots', user?.id] }),
    [qc, user?.id],
  );

  const digAt = useCallback(async (e: React.MouseEvent) => {
    if (digMutation.isPending || !user) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const posX = Math.min(94, Math.max(6, rawX));
    const posY = Math.min(92, Math.max(8, rawY));
    setShovelError(null);
    setShovelActive(false);
    setCursorPos(null);
    try {
      await digMutation.mutateAsync({ posX, posY });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      setShovelError(e.code === 'COOLDOWN' ? 'A pá ainda está recarregando.' : (e.message ?? 'Erro ao cavar.'));
    }
  }, [digMutation, user]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleGardenMouseMove = (e: React.MouseEvent) => {
    if (!shovelActive) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleGardenMouseLeave = () => setCursorPos(null);

  const handleGardenClick = async (e: React.MouseEvent) => {
    // Deselect on background click
    if (selectedPotId) { setSelectedPotId(null); return; }
    if (!shovelActive) return;
    await digAt(e);
  };

  const handlePotClick = (pot: Pot) => async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (shovelActive) { await digAt(e); return; }

    if (wrappingMode && pot.plant_id) {
      if (!confirm('Embrulhar esta planta? 1 kit de embrulho será consumido.')) return;
      try {
        await wrapMutation.mutateAsync({ plantId: pot.plant_id });
        setWrapError(null);
        setWrappingMode(false);
      } catch (err: unknown) {
        setWrapError((err as { message?: string }).message ?? 'Erro ao embrulhar');
        setWrappingMode(false);
      }
      return;
    }

    if (pot.plant_id) {
      setSelectedPotId(prev => prev === pot.id ? null : pot.id);
      return;
    }

    if (getPotState(pot) === 'ready') {
      try {
        await plantMutation.mutateAsync({ potId: pot.id });
      } catch (err: unknown) {
        if ((err as { code?: string }).code === 'NO_SEEDS') setCoinModalPotId(pot.id);
      }
    }
  };

  const handleRegar = async () => {
    if (!selectedPlantId) return;
    try { await waterMutation.mutateAsync({ plantId: selectedPlantId }); } catch {}
  };

  const handleRemover = async () => {
    if (!selectedPot?.plant_id) return;
    if (!window.confirm('Remover esta planta? Esta ação não pode ser desfeita e você perderá o DNA único dela.')) return;
    try {
      await deleteMutation.mutateAsync({ plantId: selectedPot.plant_id, potId: selectedPot.id });
      setSelectedPotId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir planta.');
    }
  };

  const toggleShovel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!shovelReady) return;
    setShovelActive(v => !v);
    setShovelError(null);
    setSelectedPotId(null);
  };

  // ── Early returns ─────────────────────────────────────────────────────────

  if (potsError) {
    const err = potsError as { message?: string; code?: string; details?: string };
    return (
      <div className="p-4 text-xs break-all" style={{ color: '#ff6b6b', background: '#1a0a0a', fontFamily: 'monospace' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 6 }}>ERRO AO CARREGAR JARDIM</div>
        <div>msg: {err.message ?? String(potsError)}</div>
        {err.code && <div>code: {err.code}</div>}
        {err.details && <div>details: {err.details}</div>}
        <div style={{ marginTop: 6, opacity: 0.6 }}>raw: {JSON.stringify(potsError).slice(0, 300)}</div>
      </div>
    );
  }

  if (potsLoading) {
    return (
      <div className="p-8 text-center font-bold" style={{ color: 'var(--color-text-light)' }}>
        Carregando seu jardim...
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showActionMenu = !!(selectedPot?.plant_id && !wrappingMode);
  const showDetailModal = !!(selectedPlantId && !wrappingMode);

  return (
    <div
      ref={containerRef}
      className={`garden-bg relative w-full h-full overflow-hidden select-none ${shovelActive ? 'cursor-none' : ''}`}
      style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)' }}
      onMouseMove={handleGardenMouseMove}
      onMouseLeave={handleGardenMouseLeave}
      onClick={handleGardenClick}
    >
      {/* ── Partículas decorativas ──────────────────────────────────────── */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.s,
            height: p.s,
            color: 'rgba(201,162,39,0.9)',
            ['--p-opacity' as string]: p.o,
            animation: `garden-float ${p.dur}s ease-in-out ${p.d}s infinite`,
            opacity: p.o,
          }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <ellipse cx="10" cy="4"  rx="2.5" ry="4.5" transform="rotate(0   10 10)" />
            <ellipse cx="10" cy="4"  rx="2.5" ry="4.5" transform="rotate(90  10 10)" />
            <ellipse cx="10" cy="4"  rx="2.5" ry="4.5" transform="rotate(180 10 10)" />
            <ellipse cx="10" cy="4"  rx="2.5" ry="4.5" transform="rotate(270 10 10)" />
            <circle  cx="10" cy="10" r="2" />
          </svg>
        </div>
      ))}

      {/* ── Pots ────────────────────────────────────────────────────────── */}
      {pots.map((pot) => {
        const x = pot.pos_x ?? 50;
        const y = pot.pos_y ?? 50;
        return (
          <div
            key={pot.id}
            className="absolute w-[16%] aspect-square"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: selectedPotId === pot.id ? 5 : 2,
            }}
          >
            <HexPot
              pot={pot}
              isSelected={selectedPotId === pot.id}
              onClick={handlePotClick(pot)}
              onDigComplete={handleDigComplete}
            />
          </div>
        );
      })}

      {/* ── Wrap overlay on planted pots ────────────────────────────────── */}
      {wrappingMode && pots.map(pot => {
        if (!pot.plant_id) return null;
        const x = pot.pos_x ?? 50;
        const y = pot.pos_y ?? 50;
        return (
          <div
            key={`wrap-${pot.id}`}
            className="absolute flex items-center justify-center cursor-pointer z-10"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: '16%',
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              clipPath: HEX_CLIP,
              background: 'rgba(136,19,55,0.55)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              handlePotClick(pot)(e);
            }}
          >
            <span className="text-2xl">🎁</span>
          </div>
        );
      })}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {pots.length === 0 && !shovelActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p
            className="font-bold text-lg px-4 py-2 rounded-xl backdrop-blur-sm"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-light)',
              background: 'rgba(15,32,12,0.7)',
              border: '1px solid rgba(92,58,30,0.3)',
            }}
          >
            Use a pá para cavar seu primeiro buraco!
          </p>
        </div>
      )}

      {/* ── Shovel cursor ────────────────────────────────────────────────── */}
      {shovelActive && cursorPos && (
        <div
          className="pointer-events-none absolute z-50 rounded-full border-2 border-white shadow-lg"
          style={{ width: 40, height: 40, left: cursorPos.x - 20, top: cursorPos.y - 20 }}
        />
      )}

      {/* ── Plant action menu (via SelectedPlantStatus para resolver canWater) */}
      {showActionMenu && selectedPlantId && selectedPot && (
        <SelectedPlantStatus
          plantId={selectedPlantId}
          potX={selectedPot.pos_x ?? 50}
          potY={selectedPot.pos_y ?? 50}
          isWaterPending={waterMutation.isPending}
          isDeletePending={deleteMutation.isPending}
          onRegar={handleRegar}
          onHistorico={() => setHistoryPlantId(selectedPlantId)}
          onRemover={handleRemover}
        />
      )}

      {/* ── Inventory panel ──────────────────────────────────────────────── */}
      {!wrappingMode && (
        <InventoryPanel userId={user?.id} onWrapMode={() => setWrappingMode(true)} />
      )}

      {/* ── Shovel toolbar ───────────────────────────────────────────────── */}
      <div
        className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-3"
        style={{ paddingBottom: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {shovelError && (
          <div
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg shadow"
            style={{
              background: 'rgba(139,40,40,0.9)',
              color: '#fecaca',
              border: '1px solid rgba(220,80,80,0.4)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <span>{shovelError}</span>
            <button onClick={() => setShovelError(null)}><X className="w-3 h-3" /></button>
          </div>
        )}
        {shovelActive && (
          <div
            className="text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm"
            style={{
              background: 'rgba(15,32,12,0.85)',
              color: 'var(--color-text-light)',
              border: '1px solid rgba(92,58,30,0.3)',
              fontFamily: 'var(--font-caption)',
              fontStyle: 'italic',
            }}
          >
            Clique no jardim para cavar
          </div>
        )}
        <HexButton
          icon={digMutation.isPending ? '⏳' : '⛏'}
          label={
            digMutation.isPending ? 'Cavando...'
            : shovelActive ? 'Cancelar'
            : shovelReady ? 'Pá'
            : formatCooldown(shovelCooldownMs)
          }
          badge={!shovelReady ? formatCooldown(shovelCooldownMs) : undefined}
          disabled={!shovelReady || digMutation.isPending}
          active={shovelActive}
          onClick={toggleShovel}
          title={shovelReady ? 'Usar pá para cavar' : `Recarregando: ${formatCooldown(shovelCooldownMs)}`}
        />
      </div>

      {/* ── Wrap mode toolbar ────────────────────────────────────────────── */}
      {wrappingMode && (
        <div
          className="absolute bottom-4 left-4 z-20 flex flex-col items-start gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs bg-rose-900/80 text-rose-200 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            Clique numa planta para embrulhar
          </div>
          <button
            onClick={() => { setWrappingMode(false); setWrapError(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold shadow-lg bg-stone-800 text-white hover:bg-stone-700 active:scale-95 transition-all text-sm"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>
          {wrapError && (
            <div className="text-xs bg-red-700 text-white px-3 py-1.5 rounded-lg">{wrapError}</div>
          )}
        </div>
      )}

      {/* ── Plant detail modal ───────────────────────────────────────────── */}
      {showDetailModal && selectedPlantId && (
        <PlantDetailModal
          plantId={selectedPlantId}
          onClose={() => setSelectedPotId(null)}
          onRegar={handleRegar}
          onRemover={handleRemover}
          isWaterPending={waterMutation.isPending}
          isDeletePending={deleteMutation.isPending}
        />
      )}

      {/* ── History modal ────────────────────────────────────────────────── */}
      {historyPlantId && (
        <HistoryWrapper plantId={historyPlantId} onClose={() => setHistoryPlantId(null)} />
      )}

      {/* ── Coin purchase modal ──────────────────────────────────────────── */}
      <CoinPurchaseModal
        open={coinModalPotId !== null}
        onClose={() => setCoinModalPotId(null)}
        potId={coinModalPotId ?? undefined}
        onComplete={() => {
          const uid = user?.id;
          if (uid) qc.invalidateQueries({ queryKey: ['garden', 'pots', uid] });
        }}
      />
    </div>
  );
}

// Resolve canWater from the selected plant and re-renders PlantActionMenu with correct value.
// Separated to avoid prop-drilling hydration_status through Garden's root state.
function SelectedPlantStatus({
  plantId, potX, potY,
  isWaterPending, isDeletePending,
  onRegar, onHistorico, onRemover,
}: {
  plantId: string;
  potX: number; potY: number;
  isWaterPending: boolean; isDeletePending: boolean;
  onRegar: () => void; onHistorico: () => void; onRemover: () => void;
}) {
  const { data: plant } = usePlant(plantId);
  const canWater = plant?.hydration_status === 'waiting_water';
  return (
    <PlantActionMenu
      potX={potX} potY={potY}
      canWater={canWater}
      isWaterPending={isWaterPending}
      isDeletePending={isDeletePending}
      onRegar={onRegar}
      onHistorico={onHistorico}
      onRemover={onRemover}
    />
  );
}
