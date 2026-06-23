'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { Pot } from '@/types';
import { Droplets, Plus, Shovel, Trash2, X } from 'lucide-react';
import Loader from './Loader';
import CoinPurchaseModal from './CoinPurchaseModal';
import { usePots, useShovelStatus } from '@/hooks/useGardenData';
import { usePlant, usePlantVersion } from '@/hooks/usePlantData';
import {
  useDigMutation,
  usePlantMutation,
  useWaterMutation,
  useDeleteMutation,
} from '@/hooks/useGardenMutations';
import { useQueryClient } from '@tanstack/react-query';
import { RarityEffect } from '@/components/RarityEffect';
import { PlantHistoryModal } from '@/components/PlantHistoryModal';
import { InventoryPanel } from '@/components/InventoryPanel';
import { useWrapPlant } from '@/hooks/useInventory';
import { HexButton } from '@/components/HexButton';

const DIG_DURATION_MS = 60_000;

type PotState = 'digging' | 'ready' | 'planted';

function getPotState(pot: Pot): PotState {
  if (pot.plant_id) return 'planted';
  if (pot.digging_started_at) {
    const elapsed = Date.now() - new Date(pot.digging_started_at).getTime();
    if (elapsed < DIG_DURATION_MS) return 'digging';
  }
  return 'ready';
}

function formatSecondsLeft(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatCooldown(ms: number): string {
  if (ms <= 0) return 'Pronta';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.ceil((ms % 60_000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function Garden() {
  const { user } = useAuth();

  // ── Dados via React Query ─────────────────────────────────────────────
  const qc = useQueryClient();
  const { data: pots = [], isPending: potsLoading } = usePots(user?.id);
  const { data: shovelStatus } = useShovelStatus(user?.id);
  const shovelCooldownMs = shovelStatus?.cooldownRemainingMs ?? 0;
  const shovelReady = shovelCooldownMs === 0;

  // ── Mutations ────────────────────────────────────────────────────────
  const digMutation = useDigMutation(user?.id ?? '');

  // ── UI state (local — não pertence ao servidor) ───────────────────────
  const [coinModalPotId, setCoinModalPotId] = useState<string | null>(null);
  const [shovelActive, setShovelActive] = useState(false);
  const [shovelError, setShovelError] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [wrappingMode, setWrappingMode] = useState(false);

  const wrapPlantMutation = useWrapPlant(user?.id ?? '');
  const [wrapError, setWrapError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  if (potsLoading) {
    return (
      <div className="p-8 text-center text-stone-600 font-bold">
        Carregando seu jardim...
      </div>
    );
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleGardenMouseMove = (e: React.MouseEvent) => {
    if (!shovelActive) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleGardenMouseLeave = () => setCursorPos(null);

  const handleGardenClick = async (e: React.MouseEvent) => {
    if (!shovelActive || digMutation.isPending || !user) return;
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
  };

  const toggleShovel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!shovelReady) return;
    setShovelActive((v) => !v);
    setShovelError(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none ${
        shovelActive ? 'cursor-none' : ''
      }`}
      style={{
        background: `
          radial-gradient(ellipse at 20% 10%, rgba(30,60,20,0.8) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 90%, rgba(20,50,10,0.8) 0%, transparent 50%),
          linear-gradient(160deg, var(--color-garden-mid) 0%, var(--color-garden-deep) 40%, var(--color-garden-light) 60%, var(--color-garden-deep) 100%)
        `,
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)',
      }}
      onMouseMove={handleGardenMouseMove}
      onMouseLeave={handleGardenMouseLeave}
      onClick={handleGardenClick}
    >
      {/* Pots */}
      {pots.map((pot) => {
        const x = pot.pos_x ?? 50;
        const y = pot.pos_y ?? 50;
        const state = getPotState(pot);
        return (
          <div
            key={pot.id}
            className="absolute w-[15%] aspect-square"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
            }}
          >
            <PotSlot
              pot={pot}
              state={state}
              onNeedSeed={setCoinModalPotId}
              wrappingMode={wrappingMode}
              onWrap={async (plantId: string) => {
                if (!confirm('Embrulhar esta planta? 1 kit de embrulho será consumido.')) return;
                try {
                  await wrapPlantMutation.mutateAsync({ plantId });
                  setWrapError(null);
                  setWrappingMode(false);
                } catch (err: unknown) {
                  const e = err as { code?: string; message?: string };
                  setWrapError(e.message ?? 'Erro ao embrulhar');
                  setWrappingMode(false);
                }
              }}
            />
          </div>
        );
      })}

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

      {/* Shovel custom cursor */}
      {shovelActive && cursorPos && (
        <div
          className="pointer-events-none absolute z-50 rounded-full border-2 border-white shadow-lg"
          style={{
            width: 40,
            height: 40,
            left: cursorPos.x - 20,
            top: cursorPos.y - 20,
          }}
        />
      )}

      {/* Inventory Panel */}
      {!wrappingMode && (
        <InventoryPanel
          userId={user?.id}
          onWrapMode={() => setWrappingMode(true)}
        />
      )}

      {/* Shovel toolbar — hexágono de madeira */}
      <div
        className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-3"
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
            <button onClick={() => setShovelError(null)}>
              <X className="w-3 h-3" />
            </button>
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
          title={
            shovelReady ? 'Usar pá para cavar'
            : `Recarregando: ${formatCooldown(shovelCooldownMs)}`
          }
        />
      </div>

      {/* Toolbar de seleção de embrulho */}
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
            <X className="w-4 h-4" />
            Cancelar
          </button>
          {wrapError && (
            <div className="text-xs bg-red-700 text-white px-3 py-1.5 rounded-lg">
              {wrapError}
            </div>
          )}
        </div>
      )}

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

function PotSlot({
  pot,
  state,
  onNeedSeed,
  wrappingMode = false,
  onWrap,
}: {
  pot: Pot;
  state: PotState;
  onNeedSeed: (potId: string) => void;
  wrappingMode?: boolean;
  onWrap?: (plantId: string) => void;
}) {
  const { user } = useAuth();
  const { data: plant } = usePlant(pot.plant_id);
  const { data: latestVersion } = usePlantVersion(pot.plant_id);
  const plantMutation = usePlantMutation(user?.id ?? '');
  const waterMutation = useWaterMutation(user?.id ?? '');
  const deleteMutation = useDeleteMutation(user?.id ?? '');

  const [isEvolving, setIsEvolving] = useState(false);
  const [msLeft, setMsLeft] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (state !== 'digging' || !pot.digging_started_at) return;
    const deadline = new Date(pot.digging_started_at).getTime() + DIG_DURATION_MS;
    const update = () => setMsLeft(Math.max(0, deadline - Date.now()));
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [state, pot.digging_started_at]);

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleWater = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !plant || waterMutation.isPending) return;
    const willEvolve =
      plant.current_stage_waters + 1 >= plant.current_stage.waters_required;
    if (willEvolve) setIsEvolving(true);
    try {
      await waterMutation.mutateAsync({ plantId: plant.id });
    } finally {
      setIsEvolving(false);
    }
  };

  const handlePlant = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await plantMutation.mutateAsync({ potId: pot.id });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'NO_SEEDS') onNeedSeed(pot.id);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !plant || deleteMutation.isPending) return;
    if (!window.confirm('Tem certeza que deseja remover esta planta? Esta ação não pode ser desfeita e você perderá o DNA único dela.')) return;
    try {
      await deleteMutation.mutateAsync({ plantId: plant.id, potId: pot.id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir planta.';
      alert(msg);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (state === 'digging') {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Canteiro oval — cavando */}
        <div
          className="relative flex items-center justify-center animate-pulse"
          style={{
            width: '82%', height: '58%',
            borderRadius: '50px / 36px',
            background: 'radial-gradient(ellipse at 38% 30%, #3d2a18, #1a0f05)',
            border: '2.5px solid var(--color-wood-mid)',
            boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.8), 0 3px 8px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <Shovel className="w-4 h-4" style={{ color: 'var(--color-parch-dark)', opacity: 0.8 }} />
            <span className="font-mono text-xs font-bold leading-none" style={{ color: 'var(--color-parch-light)' }}>
              {formatSecondsLeft(msLeft)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'ready') {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Canteiro oval — pronto para plantar */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: '82%', height: '58%',
            borderRadius: '50px / 36px',
            background: 'radial-gradient(ellipse at 38% 30%, #2d1c10, #0f0905)',
            border: '2.5px solid var(--color-wood-mid)',
            boxShadow: 'inset 0 6px 20px rgba(0,0,0,0.95), inset 0 -2px 6px rgba(80,50,20,0.2), 0 3px 8px rgba(0,0,0,0.4)',
          }}
        >
          {/* Anel ornamental interno */}
          <div className="absolute pointer-events-none" style={{
            inset: '-7px', borderRadius: '57px / 43px',
            border: '2px solid var(--color-wood-light)', opacity: 0.5,
          }} />
          {/* Anel tracejado externo */}
          <div className="absolute pointer-events-none" style={{
            inset: '-11px', borderRadius: '61px / 47px',
            border: '1.5px dashed rgba(92,58,30,0.3)',
          }} />
          <button
            disabled={plantMutation.isPending}
            onClick={handlePlant}
            className="p-2 rounded-full transition-all active:scale-95"
            style={{ color: 'rgba(139,99,70,0.7)' }}
            title="Plantar semente"
          >
            <Plus className={`w-7 h-7 ${plantMutation.isPending ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  // state === 'planted'
  return (
    <div className="relative group w-full h-full flex flex-col items-center justify-end select-none">
      {plant ? (
        <>
          {/* Canteiro oval de base (terra visível embaixo da planta) */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: '78%', height: '32%',
              borderRadius: '50px / 36px',
              background: 'radial-gradient(ellipse at 40% 40%, #2d1c10, #100806)',
              border: '2.5px solid var(--color-wood-mid)',
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.5)',
              zIndex: 0,
            }}
          />
          <div className="relative w-full h-full flex items-center justify-center" style={{ zIndex: 1 }}>
            {isEvolving ? (
              <Loader variant="inline" spin size={56} />
            ) : latestVersion?.image_url ? (
              <div
                className="relative w-full h-full cursor-pointer"
                onClick={() => setHistoryOpen(true)}
                title="Ver histórico de evolução"
              >
                <RarityEffect rarity={plant.dna.rarity} alwaysVisible={false}>
                  <Image
                    src={latestVersion.image_url}
                    alt={plant.current_stage.name}
                    fill
                    draggable={false}
                    className="drop-shadow-lg object-contain animate-in fade-in zoom-in duration-500"
                  />
                </RarityEffect>
              </div>
            ) : (
              <div className="w-16 h-16 bg-stone-800/20 rounded-full blur-md animate-pulse" />
            )}

            {!isEvolving && plant.hydration_status === 'waiting_water' && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white p-1 rounded-full animate-bounce shadow-lg">
                <Droplets className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Overlay de seleção de embrulho */}
          {wrappingMode && plant && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-rose-900/50 rounded-full cursor-pointer ring-2 ring-rose-400 transition-all hover:bg-rose-800/60"
              onClick={(e) => { e.stopPropagation(); onWrap?.(plant.id); }}
            >
              <span className="text-2xl">🎁</span>
            </div>
          )}

          <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity bg-black/20 rounded-full p-2 ${
            wrappingMode ? 'hidden' : 'opacity-0 group-hover:opacity-100'
          }`}>
            <p className="text-[10px] font-bold text-white uppercase tracking-tighter mb-1 bg-stone-900/50 px-2 rounded-full">
              {plant.current_stage.name}
            </p>
            <div className="flex gap-2">
              <button
                disabled={waterMutation.isPending || plant.hydration_status === 'waiting_water'}
                onClick={handleWater}
                className={`p-2 rounded-full shadow-xl transition-all ${
                  plant.hydration_status === 'waiting_water'
                    ? 'bg-amber-500'
                    : 'bg-blue-500 hover:bg-blue-400 active:scale-95'
                } text-white`}
              >
                <Droplets
                  className={`w-5 h-5 ${waterMutation.isPending && !isEvolving ? 'animate-spin' : ''}`}
                />
              </button>
              <button
                disabled={deleteMutation.isPending}
                onClick={handleDelete}
                className="p-2 rounded-full shadow-xl transition-all bg-red-500 hover:bg-red-400 active:scale-95 text-white"
                title="Remover planta"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: plant.current_stage.waters_required }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i < plant.current_stage_waters ? 'bg-blue-400' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {plant && (
            <PlantHistoryModal
              key={historyOpen ? 1 : 0}
              plant={plant}
              open={historyOpen}
              onClose={() => setHistoryOpen(false)}
            />
          )}
        </>
      ) : (
        <div className="w-16 h-16 bg-stone-800/20 rounded-full blur-md animate-pulse" />
      )}
    </div>
  );
}
