'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { Pot } from '@/types';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@/hooks/useWallet';
import { Droplets, Plus, Shovel, Trash2, X } from 'lucide-react';
import Loader from './Loader';
import CoinPurchaseModal from './CoinPurchaseModal';

const DIG_DURATION_MS = 60_000;
const SHOVEL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Minimal types for Supabase join responses (not worth exporting to types/index.ts)
type PlantRow = {
  id: string;
  hydration_status: string;
  current_stage_waters: number;
  current_stage: { id: string; name: string; waters_required: number };
};
type PlantVersionRow = { id: string; image_url: string | null };

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
  const { refresh: refreshWallet } = useWallet();
  const [pots, setPots] = useState<Pot[]>([]);
  const [loading, setLoading] = useState(true);
  const [coinModalPotId, setCoinModalPotId] = useState<string | null>(null);

  // Shovel state
  const [shovelActive, setShovelActive] = useState(false);
  const [shovelLastUsed, setShovelLastUsed] = useState<string | null>(null);
  const [isShoveling, setIsShoveling] = useState(false);
  const [shovelError, setShovelError] = useState<string | null>(null);

  // Custom cursor position (pixels relative to garden container)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Forces re-render every second so dig countdowns stay live
  const [, setTick] = useState(0);

  // Shovel cooldown computed as state so Date.now() stays out of the render path
  const [shovelCooldownMs, setShovelCooldownMs] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Declared before useEffects that reference them ──────────────────────

  const fetchGarden = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [potsResult, profileResult] = await Promise.all([
      supabase
        .from('pots')
        .select('*, plant_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('shovel_last_used_at')
        .eq('id', user.id)
        .single(),
    ]);

    if (!potsResult.error && potsResult.data) setPots(potsResult.data);
    if (!profileResult.error && profileResult.data) {
      setShovelLastUsed(profileResult.data.shovel_last_used_at ?? null);
    }
    setLoading(false);
  }, [user]);

  const handleUpdate = useCallback(async () => {
    await fetchGarden();
    refreshWallet();
  }, [fetchGarden, refreshWallet]);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user) fetchGarden();
  }, [user, fetchGarden]);

  // Tick every second only while there are active digs
  const hasActiveDigs = pots.some(
    (p) => !p.plant_id && p.digging_started_at && getPotState(p) === 'digging'
  );
  useEffect(() => {
    if (!hasActiveDigs) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [hasActiveDigs]);

  // Update shovel cooldown every second (keeps Date.now() out of render path)
  useEffect(() => {
    const compute = () => {
      if (!shovelLastUsed) { setShovelCooldownMs(0); return; }
      const remaining = Math.max(
        0,
        SHOVEL_COOLDOWN_MS - (Date.now() - new Date(shovelLastUsed).getTime()),
      );
      setShovelCooldownMs(remaining);
    };
    compute();
    if (!shovelLastUsed) return;
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [shovelLastUsed]);

  // ── Derived values ────────────────────────────────────────────────────────

  const shovelReady = shovelCooldownMs === 0;

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleGardenMouseMove = (e: React.MouseEvent) => {
    if (!shovelActive) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleGardenMouseLeave = () => setCursorPos(null);

  const handleGardenClick = async (e: React.MouseEvent) => {
    if (!shovelActive || isShoveling || !user) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const posX = Math.min(94, Math.max(6, rawX));
    const posY = Math.min(92, Math.max(8, rawY));

    setIsShoveling(true);
    setShovelError(null);
    setShovelActive(false);
    setCursorPos(null);

    try {
      const res = await fetch('/api/shovel/dig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, posX, posY }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchGarden();
      } else if (data.code === 'COOLDOWN') {
        setShovelError('A pá ainda está recarregando.');
        await fetchGarden();
      } else {
        setShovelError(data.error ?? 'Erro ao cavar.');
      }
    } catch {
      setShovelError('Erro de conexão ao tentar cavar.');
    } finally {
      setIsShoveling(false);
    }
  };

  const toggleShovel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!shovelReady) return;
    setShovelActive((v) => !v);
    setShovelError(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 text-center text-stone-600 font-bold">
        Carregando seu jardim...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-green-300 overflow-hidden select-none ${
        shovelActive ? 'cursor-none' : ''
      }`}
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
              onUpdate={handleUpdate}
              onNeedSeed={setCoinModalPotId}
            />
          </div>
        );
      })}

      {pots.length === 0 && !shovelActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-stone-600 font-bold text-lg bg-white/60 px-4 py-2 rounded-xl">
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

      {/* Shovel toolbar */}
      <div
        className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {shovelError && (
          <div className="flex items-center gap-2 text-xs bg-red-600 text-white px-3 py-2 rounded-lg shadow">
            <span>{shovelError}</span>
            <button onClick={() => setShovelError(null)}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {shovelActive && (
          <div className="text-xs bg-stone-800/80 text-white px-3 py-1.5 rounded-lg backdrop-blur-sm">
            Clique no jardim para cavar
          </div>
        )}

        <button
          onClick={toggleShovel}
          disabled={!shovelReady || isShoveling}
          title={
            shovelReady
              ? 'Usar pá para cavar'
              : `Recarregando: ${formatCooldown(shovelCooldownMs)}`
          }
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold shadow-lg transition-all text-sm ${
            isShoveling
              ? 'bg-stone-400 text-white cursor-wait'
              : shovelActive
              ? 'bg-amber-600 text-white hover:bg-amber-500 active:scale-95'
              : shovelReady
              ? 'bg-stone-800 text-white hover:bg-stone-700 active:scale-95'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
          }`}
        >
          <Shovel className={`w-4 h-4 ${isShoveling ? 'animate-spin' : ''}`} />
          <span>
            {isShoveling
              ? 'Cavando...'
              : shovelActive
              ? 'Cancelar'
              : shovelReady
              ? 'Pá'
              : formatCooldown(shovelCooldownMs)}
          </span>
        </button>
      </div>

      <CoinPurchaseModal
        open={coinModalPotId !== null}
        onClose={() => setCoinModalPotId(null)}
        potId={coinModalPotId ?? undefined}
        onComplete={handleUpdate}
      />
    </div>
  );
}

function PotSlot({
  pot,
  state,
  onUpdate,
  onNeedSeed,
}: {
  pot: Pot;
  state: PotState;
  onUpdate: () => void;
  onNeedSeed: (potId: string) => void;
}) {
  const { user } = useAuth();
  const [plant, setPlant] = useState<PlantRow | null>(null);
  const [latestVersion, setLatestVersion] = useState<PlantVersionRow | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isEvolving, setIsEvolving] = useState(false);
  const [msLeft, setMsLeft] = useState(0);

  // ── Declared before useEffects that reference them ──────────────────────

  const fetchPlant = useCallback(async (id: string) => {
    const { data: plantData } = await supabase
      .from('plants')
      .select('*, current_stage:plant_stages(*)')
      .eq('id', id)
      .single();

    if (plantData) {
      setPlant(plantData as unknown as PlantRow);
      const { data: versionData } = await supabase
        .from('plant_versions')
        .select('id, image_url')
        .eq('plant_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      setLatestVersion((versionData as PlantVersionRow | null) ?? null);
    }
  }, []);

  const resetPlant = useCallback(() => {
    setPlant(null);
    setLatestVersion(null);
  }, []);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (pot.plant_id) fetchPlant(pot.plant_id);
    else resetPlant();
  }, [pot.plant_id, fetchPlant, resetPlant]);

  useEffect(() => {
    if (state !== 'digging' || !pot.digging_started_at) return;
    const deadline = new Date(pot.digging_started_at).getTime() + DIG_DURATION_MS;
    const update = () => setMsLeft(Math.max(0, deadline - Date.now()));
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [state, pot.digging_started_at]);

  // ── Action handlers ───────────────────────────────────────────────────────

  const handlePlant = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/plants/plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, potId: pot.id }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdate();
      } else if (data.code === 'NO_SEEDS') {
        onNeedSeed(pot.id);
      }
    } catch (err) {
      console.error('Error planting:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleWater = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!plant || isActionLoading) return;

    const willEvolve =
      plant.current_stage_waters + 1 >= plant.current_stage.waters_required;

    setIsActionLoading(true);
    if (willEvolve) setIsEvolving(true);
    try {
      const res = await fetch('/api/plants/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantId: plant.id }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdate();
        await fetchPlant(plant.id);
      }
    } catch (err) {
      console.error('Error watering:', err);
    } finally {
      setIsActionLoading(false);
      setIsEvolving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!plant || isActionLoading) return;

    const confirmed = window.confirm(
      'Tem certeza que deseja remover esta planta? Esta ação não pode ser desfeita e você perderá o DNA único dela.'
    );
    if (!confirmed) return;

    setIsActionLoading(true);
    try {
      const res = await fetch('/api/plants/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantId: plant.id, potId: pot.id }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdate();
      } else {
        alert(`Erro ao excluir: ${data.error}`);
      }
    } catch (err) {
      console.error('Error deleting:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (state === 'digging') {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="w-full h-full rounded-full bg-amber-900/50 border-4 border-amber-800/40 flex flex-col items-center justify-center animate-pulse shadow-inner">
          <Shovel className="w-5 h-5 text-amber-200 mb-1" />
          <span className="text-amber-100 font-mono text-sm font-bold leading-none">
            {formatSecondsLeft(msLeft)}
          </span>
        </div>
      </div>
    );
  }

  if (state === 'ready') {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="w-full h-full rounded-full bg-stone-900/60 border-4 border-stone-700/50 flex items-center justify-center shadow-inner">
          <button
            disabled={isActionLoading}
            onClick={handlePlant}
            className="p-2 rounded-full text-stone-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            title="Plantar semente"
          >
            <Plus className={`w-8 h-8 ${isActionLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  // state === 'planted'
  return (
    <div className="relative group w-full h-full flex flex-col items-center justify-end pb-4 transition-transform select-none">
      {plant ? (
        <>
          <div className="relative w-full h-full flex items-center justify-center">
            {isEvolving ? (
              <Loader variant="inline" spin size={56} />
            ) : latestVersion?.image_url ? (
              <div className="relative w-full h-full">
                <Image
                  src={latestVersion.image_url}
                  alt={plant.current_stage.name}
                  fill
                  draggable={false}
                  className="drop-shadow-lg object-contain animate-in fade-in zoom-in duration-500"
                />
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

          <div className="absolute inset-0 flex flex-col items-center justify-center transition-opacity bg-black/20 rounded-full p-2 opacity-0 group-hover:opacity-100">
            <p className="text-[10px] font-bold text-white uppercase tracking-tighter mb-1 bg-stone-900/50 px-2 rounded-full">
              {plant.current_stage.name}
            </p>
            <div className="flex gap-2">
              <button
                disabled={isActionLoading || plant.hydration_status === 'waiting_water'}
                onClick={handleWater}
                className={`p-2 rounded-full shadow-xl transition-all ${
                  plant.hydration_status === 'waiting_water'
                    ? 'bg-amber-500'
                    : 'bg-blue-500 hover:bg-blue-400 active:scale-95'
                } text-white`}
              >
                <Droplets
                  className={`w-5 h-5 ${isActionLoading && !isEvolving ? 'animate-spin' : ''}`}
                />
              </button>
              <button
                disabled={isActionLoading}
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
        </>
      ) : (
        <div className="w-16 h-16 bg-stone-800/20 rounded-full blur-md animate-pulse" />
      )}
    </div>
  );
}
