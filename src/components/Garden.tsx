'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { Pot } from '@/types';
import { X, Loader2 } from 'lucide-react';

// Ícones PNG dimensionados em `em` para escalar com o tamanho do botão (.hex-button)
const WateringCanIcon = () => (
  <span className="relative inline-block" style={{ width: '2em', height: '2em' }}>
    <Image src="/imgs/watering-can.png" alt="regador" fill className="object-contain" draggable={false} />
  </span>
);
const ShovelIcon = () => (
  <span className="relative inline-block" style={{ width: '1.7em', height: '2em', transform: 'rotate(-35deg)' }}>
    <Image src="/imgs/shovel.png" alt="pá" fill className="object-contain" draggable={false} />
  </span>
);
const BackpackIcon = ({ open }: { open: boolean }) => (
  <span className="relative inline-block" style={{ width: '2.2em', height: '2.2em' }}>
    <Image src={open ? '/imgs/backpack-open.png' : '/imgs/backpack.png'} alt="mochila" fill className="object-contain" draggable={false} />
  </span>
);
const SpinnerIcon = () => (
  <Loader2 className="animate-spin text-amber-200" style={{ width: '1.4em', height: '1.4em' }} />
);
import CoinPurchaseModal from './CoinPurchaseModal';
import { usePots, useShovelStatus, useWateringStatus } from '@/hooks/useGardenData';
import { usePlant } from '@/hooks/usePlantData';
import {
  useDigMutation,
  usePlantMutation,
  useWaterMutation,
  useDeleteMutation,
  useRemovePotMutation,
  useMovePlantMutation,
} from '@/hooks/useGardenMutations';
import { useQueryClient } from '@tanstack/react-query';
import { PlantHistoryModal } from '@/components/PlantHistoryModal';
import { InventoryPanel } from '@/components/InventoryPanel';
import { useWrapPlant } from '@/hooks/useInventory';
import { HexButton } from '@/components/HexButton';
import { HexPot, getPotState } from '@/components/HexPot';
import { PlantActionMenu } from '@/components/PlantActionMenu';
import { PlantDetailModal } from '@/components/PlantDetailModal';
import { usePendingGifts } from '@/hooks/useGifts';
import { GiftReceiveModal } from '@/components/GiftReceiveModal';
import type { PendingGift } from '@/hooks/useGifts';

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
function HistoryWrapper({
  plantId, onClose, onRegar, onRemover, isWaterPending, isDeletePending,
}: {
  plantId: string;
  onClose: () => void;
  onRegar: () => void;
  onRemover: () => void;
  isWaterPending: boolean;
  isDeletePending: boolean;
}) {
  const { data: plant } = usePlant(plantId);
  if (!plant) return null;
  return (
    <PlantHistoryModal
      plant={plant}
      open
      onClose={onClose}
      onRegar={onRegar}
      onRemover={onRemover}
      isWaterPending={isWaterPending}
      isDeletePending={isDeletePending}
    />
  );
}

export default function Garden() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: pots = [], isPending: potsLoading, error: potsError } = usePots(user?.id);
  const { data: shovelStatus } = useShovelStatus(user?.id);
  const { data: wateringStatus } = useWateringStatus(user?.id);
  const { data: pendingGifts = [] } = usePendingGifts(user?.id);
  const shovelCooldownMs = shovelStatus?.cooldownRemainingMs ?? 0;
  const shovelReady = shovelCooldownMs === 0;
  const watersRemaining = wateringStatus?.watersRemaining ?? 10;
  const canWaterToday = watersRemaining > 0;

  // ── Mutations ────────────────────────────────────────────────────────────
  const digMutation       = useDigMutation(user?.id ?? '');
  const plantMutation     = usePlantMutation(user?.id ?? '');
  const waterMutation     = useWaterMutation(user?.id ?? '');
  const deleteMutation    = useDeleteMutation(user?.id ?? '');
  const wrapMutation      = useWrapPlant(user?.id ?? '');
  const removePotMutation = useRemovePotMutation(user?.id ?? '');
  const movePlantMutation = useMovePlantMutation(user?.id ?? '');

  // ── UI state ─────────────────────────────────────────────────────────────
  const [selectedPotId, setSelectedPotId]           = useState<string | null>(null);
  const [historyPlantId, setHistoryPlantId]         = useState<string | null>(null);
  const [coinModalPotId, setCoinModalPotId]         = useState<string | null>(null);
  const [shovelActive, setShovelActive]             = useState(false);
  const [shovelError, setShovelError]               = useState<string | null>(null);
  // Drag-and-drop do regador
  const [wateringDrag, setWateringDrag]             = useState(false);
  const [wateringDragPos, setWateringDragPos]       = useState<{ x: number; y: number } | null>(null);
  const [wateringTargetPotId, setWateringTargetPotId] = useState<string | null>(null);
  const [wateringError, setWateringError]           = useState<string | null>(null);
  // Remove spot mode
  const [removeMode, setRemoveMode]                 = useState(false);
  const [removeError, setRemoveError]               = useState<string | null>(null);
  // Move plant drag
  const [moveMode, setMoveMode]                     = useState(false);
  const [moveSrcPotId, setMoveSrcPotId]             = useState<string | null>(null);
  const [moveDragPos, setMoveDragPos]               = useState<{ x: number; y: number } | null>(null);
  const [moveTargetPotId, setMoveTargetPotId]       = useState<string | null>(null);
  const [moveDragImageUrl, setMoveDragImageUrl]     = useState<string | null>(null);
  const [moveError, setMoveError]                   = useState<string | null>(null);
  // Stressed pots (sad face after move)
  const [stressedPotIds, setStressedPotIds]         = useState<Set<string>>(new Set());
  const [cursorPos, setCursorPos]                   = useState<{ x: number; y: number } | null>(null);
  const [wrappingMode, setWrappingMode]             = useState(false);
  const [wrapError, setWrapError]                   = useState<string | null>(null);
  const [activeGift, setActiveGift]                 = useState<PendingGift | null>(null);
  const [inventoryOpen, setInventoryOpen]           = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLDivElement>(null);

  // ── Pan / Zoom state ─────────────────────────────────────────────────────
  const [pan,  setPan]  = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // Refs para leitura síncrona dentro de event listeners nativos
  const panRef  = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  useEffect(() => { panRef.current  = pan;  }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Clamp pan para que o fundo 120% sempre cubra o viewport
  const clampPan = useCallback((x: number, y: number, z: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x, y };
    const maxX = rect.width  * (1.2 * z - 1) / 2;
    const maxY = rect.height * (1.2 * z - 1) / 2;
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }, []);

  // Pan por pointer (mouse drag / 1 dedo)
  const panPointer    = useRef<{ id: number; startX: number; startY: number; panX: number; panY: number } | null>(null);
  const activePointers = useRef(new Set<number>());
  const hasPanned     = useRef(false);

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
    // Converte posição do viewport → espaço do canvas (desfaz translate + scale)
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const canvasX = (e.clientX - rect.left - cx - pan.x) / zoom + cx;
    const canvasY = (e.clientY - rect.top  - cy - pan.y) / zoom + cy;
    const rawX = (canvasX / rect.width)  * 100;
    const rawY = (canvasY / rect.height) * 100;
    // Área plantável = apenas dentro dos 100% originais do canvas
    if (rawX < 0 || rawX > 100 || rawY < 0 || rawY > 100) {
      setShovelError('Fora da área plantável.');
      return;
    }
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
  }, [digMutation, user, pan, zoom]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleGardenMouseMove = (e: React.MouseEvent) => {
    if (!shovelActive) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleGardenMouseLeave = () => setCursorPos(null);

  const handleGardenClick = async (e: React.MouseEvent) => {
    if (hasPanned.current) { hasPanned.current = false; return; }
    if (selectedPotId) { setSelectedPotId(null); return; }
    if (!shovelActive) return;
    await digAt(e);
  };

  // Rega via drag: chamado pelo pointerup quando soltar sobre uma planta
  const handleWaterPot = useCallback(async (pot: Pot) => {
    if (!pot.plant_id || !canWaterToday || waterMutation.isPending) return;
    setWateringError(null);
    try {
      await waterMutation.mutateAsync({ plantId: pot.plant_id });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      const msg =
        e.code === 'DAILY_LIMIT_REACHED' ? 'Limite diário atingido! Volte amanhã.' :
        e.code === 'NOT_READY' ? 'Esta planta ainda não precisa de água.' :
        (e.message ?? 'Erro ao regar.');
      setWateringError(msg);
    }
  }, [canWaterToday, waterMutation]);

  // Encontra o pot pelo ponto na tela usando data-pot-id
  const findPotAtPoint = useCallback((x: number, y: number): Pot | null => {
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      const id = (el as HTMLElement).dataset?.potId;
      if (id) return pots.find(p => p.id === id) ?? null;
    }
    return null;
  }, [pots]);

  // Drag-and-drop do regador: inicia no pointerdown do botão
  const handleWateringPointerDown = useCallback((e: React.PointerEvent) => {
    if (!canWaterToday || waterMutation.isPending) return;
    e.preventDefault();
    e.stopPropagation();

    setWateringDrag(true);
    setWateringDragPos({ x: e.clientX, y: e.clientY });
    setWateringTargetPotId(null);
    setWateringError(null);
    setShovelActive(false);

    let active = true;

    const onMove = (ev: PointerEvent) => {
      if (!active) return;
      setWateringDragPos({ x: ev.clientX, y: ev.clientY });
      const pot = findPotAtPoint(ev.clientX, ev.clientY);
      setWateringTargetPotId(pot?.plant_id ? pot.id : null);
    };

    const onUp = (ev: PointerEvent) => {
      active = false;
      setWateringDrag(false);
      setWateringDragPos(null);
      setWateringTargetPotId(null);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);

      const pot = findPotAtPoint(ev.clientX, ev.clientY);
      if (pot?.plant_id) handleWaterPot(pot);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [canWaterToday, waterMutation.isPending, findPotAtPoint, handleWaterPot]);

  // Remove spot: click no pot vazio
  const handleRemovePot = useCallback(async (pot: Pot) => {
    if (pot.plant_id) { setRemoveError('Remova a planta antes de apagar o canteiro.'); return; }
    setRemoveError(null);
    try { await removePotMutation.mutateAsync({ potId: pot.id }); }
    catch (err: unknown) { setRemoveError((err as Error).message); }
  }, [removePotMutation]);

  // Move plant drag via Pointer Events
  const handleMovePotPointerDown = useCallback((pot: Pot) => (e: React.PointerEvent) => {
    if (!moveMode || !pot.plant_id || movePlantMutation.isPending) return;
    e.preventDefault(); e.stopPropagation();

    // Pega imagem do cache do React Query
    const cachedVersion = qc.getQueryData<{ image_url: string | null }>(['plant', pot.plant_id, 'version']);
    setMoveSrcPotId(pot.id);
    setMoveDragPos({ x: e.clientX, y: e.clientY });
    setMoveDragImageUrl(cachedVersion?.image_url ?? null);
    setMoveTargetPotId(null);
    setMoveError(null);

    let active = true;

    const onMove = (ev: PointerEvent) => {
      if (!active) return;
      setMoveDragPos({ x: ev.clientX, y: ev.clientY });
      const target = findPotAtPoint(ev.clientX, ev.clientY);
      setMoveTargetPotId(target && !target.plant_id ? target.id : null);
    };

    const onUp = async (ev: PointerEvent) => {
      active = false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      setMoveDragPos(null);
      setMoveDragImageUrl(null);

      const target = findPotAtPoint(ev.clientX, ev.clientY);
      setMoveTargetPotId(null);
      setMoveSrcPotId(null);

      if (!target || target.plant_id || target.id === pot.id) return;

      try {
        const result = await movePlantMutation.mutateAsync({ fromPotId: pot.id, toPotId: target.id });
        if (result.stressed) {
          setStressedPotIds(prev => new Set([...prev, target.id]));
          setTimeout(() => {
            setStressedPotIds(prev => { const s = new Set(prev); s.delete(target.id); return s; });
          }, 6000);
        }
      } catch (err: unknown) {
        setMoveError((err as Error).message);
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [moveMode, movePlantMutation, findPotAtPoint, qc]);

  const handlePotClick = (pot: Pot) => async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wateringDrag || moveMode) return; // drag cuida da rega/move

    if (removeMode) { await handleRemovePot(pot); return; }

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

  const closeAllModes = () => {
    setShovelActive(false); setRemoveMode(false); setMoveMode(false); setInventoryOpen(false);
  };

  const toggleShovel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!shovelReady) return;
    const next = !shovelActive;
    closeAllModes(); setShovelActive(next);
    setShovelError(null); setSelectedPotId(null);
  };

  const toggleRemoveMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !removeMode;
    closeAllModes(); setRemoveMode(next);
    setRemoveError(null);
  };

  const toggleMoveMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !moveMode;
    closeAllModes(); setMoveMode(next);
    setMoveError(null);
  };

  const toggleInventory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInventoryOpen(v => !v);
  };

  // ── Canvas pan handlers ───────────────────────────────────────────────────

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.add(e.pointerId);
    // Cancela pan se 2º dedo entrar (será pinch)
    if (activePointers.current.size > 1) { panPointer.current = null; return; }
    if (shovelActive || wateringDrag || moveMode || removeMode || wrappingMode) return;
    panPointer.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
    hasPanned.current = false;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, [shovelActive, wateringDrag, moveMode, removeMode, wrappingMode]);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panPointer.current || panPointer.current.id !== e.pointerId) return;
    const dx = e.clientX - panPointer.current.startX;
    const dy = e.clientY - panPointer.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasPanned.current = true;
    if (!hasPanned.current) return;
    const newPan = clampPan(panPointer.current.panX + dx, panPointer.current.panY + dy, zoomRef.current);
    setPan(newPan);
  }, [clampPan]);

  const handleCanvasPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    if (panPointer.current?.id === e.pointerId) panPointer.current = null;
  }, []);

  // ── Wheel zoom ───────────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.06 : 0.06;
      const next = Math.max(1, Math.min(1.3, zoomRef.current + delta));
      zoomRef.current = next;
      setZoom(next);
      const clamped = clampPan(panRef.current.x, panRef.current.y, next);
      panRef.current = clamped;
      setPan(clamped);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [clampPan]);

  // ── Pinch zoom (touch) ───────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startDist = 0;
    let startZoom = 1;
    let startPan  = { x: 0, y: 0 };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        panPointer.current = null; // cancela pan de 1 dedo
        const [a, b] = [e.touches[0], e.touches[1]];
        startDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        startZoom = zoomRef.current;
        startPan  = { ...panRef.current };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || startDist === 0) return;
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const next = Math.max(1, Math.min(1.3, startZoom * (dist / startDist)));
      zoomRef.current = next;
      setZoom(next);
      const clamped = clampPan(startPan.x, startPan.y, next);
      panRef.current = clamped;
      setPan(clamped);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) startDist = 0;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd,   { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [clampPan]);

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
      className={`relative w-full h-full overflow-hidden select-none ${shovelActive ? 'cursor-none' : ''}`}
      style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)' }}
      onMouseMove={handleGardenMouseMove}
      onMouseLeave={handleGardenMouseLeave}
      onClick={handleGardenClick}
    >
      {/* ══════════════════════════════════════════════════════════════════
          CANVAS — recebe pan + zoom. Fundo 120% fica aqui dentro.
          HUD, cursores e modais ficam FORA para não serem afetados.
      ══════════════════════════════════════════════════════════════════ */}
      <div
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '50% 50%',
          transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          willChange: 'transform',
          touchAction: 'none',
        }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
      >
        {/* Fundo — estendido 10% além de cada borda para permitir pan */}
        <div
          className="garden-bg absolute pointer-events-none"
          style={{ top: '-10%', left: '-10%', width: '120%', height: '120%', zIndex: 0 }}
        />

        {/* ── Partículas decorativas ──────────────────────────────────── */}
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
              zIndex: 1,
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

        {/* ── Pots ────────────────────────────────────────────────────── */}
        {pots.map((pot) => {
          const x = pot.pos_x ?? 50;
          const y = pot.pos_y ?? 50;
          return (
            <div
              key={pot.id}
              data-pot-id={pot.id}
              className="absolute"
              style={{
                width: '12%',
                aspectRatio: '1 / 1.65',
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: selectedPotId === pot.id ? 5 : 2,
              }}
            >
              <HexPot
                pot={pot}
                isSelected={selectedPotId === pot.id}
                isStressed={stressedPotIds.has(pot.id)}
                moveMode={moveMode}
                onClick={handlePotClick(pot)}
                onPointerDown={moveMode && pot.plant_id ? handleMovePotPointerDown(pot) : undefined}
                onDigComplete={handleDigComplete}
              />
            </div>
          );
        })}

        {/* ── Wrap overlay on planted pots ────────────────────────────── */}
        {wrappingMode && pots.map(pot => {
          if (!pot.plant_id) return null;
          const x = pot.pos_x ?? 50;
          const y = pot.pos_y ?? 50;
          return (
            <div
              key={`wrap-${pot.id}`}
              className="absolute flex items-end justify-center cursor-pointer z-10 pb-[5%]"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: '12%',
                aspectRatio: '1 / 1.65',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(136,19,55,0.45)',
                clipPath: 'polygon(0 38%, 50% 25%, 100% 38%, 100% 100%, 0 100%)',
              }}
              onClick={(e) => { e.stopPropagation(); handlePotClick(pot)(e); }}
            >
              <span className="text-2xl">🎁</span>
            </div>
          );
        })}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {pots.length === 0 && !shovelActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 3 }}>
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

        {/* ── Move target highlight ────────────────────────────────────── */}
        {moveMode && moveTargetPotId && (() => {
          const pot = pots.find(p => p.id === moveTargetPotId);
          if (!pot) return null;
          return (
            <div className="absolute pointer-events-none z-10" style={{ left: `${pot.pos_x ?? 50}%`, top: `${pot.pos_y ?? 50}%`, width: '12%', aspectRatio: '1/1.65', transform: 'translate(-50%,-50%)', background: 'rgba(251,191,36,0.3)', clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)', filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.8))' }} />
          );
        })()}

        {/* ── Watering target highlight ─────────────────────────────────── */}
        {wateringDrag && wateringTargetPotId && (() => {
          const pot = pots.find(p => p.id === wateringTargetPotId);
          if (!pot) return null;
          return (
            <div
              className="absolute pointer-events-none z-10"
              style={{
                left: `${pot.pos_x ?? 50}%`,
                top: `${pot.pos_y ?? 50}%`,
                width: '12%',
                aspectRatio: '1 / 1.65',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(59,130,246,0.25)',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.8))',
              }}
            />
          );
        })()}

        {/* ── Plant action menu ────────────────────────────────────────── */}
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
      </div>
      {/* ══ fim do canvas ═════════════════════════════════════════════════ */}

      {/* ── Shovel cursor (viewport space) ──────────────────────────────── */}
      {shovelActive && cursorPos && (
        <div
          className="pointer-events-none absolute z-50 rounded-full border-2 border-white shadow-lg"
          style={{ width: 40, height: 40, left: cursorPos.x - 20, top: cursorPos.y - 20 }}
        />
      )}

      {/* ── Move plant drag cursor (fixed) ──────────────────────────────── */}
      {moveMode && moveDragPos && moveSrcPotId && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{ left: moveDragPos.x - 24, top: moveDragPos.y - 36, width: 48, height: 48 }}
        >
          {moveDragImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={moveDragImageUrl} alt="planta" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6)) brightness(1.1)' }} />
          ) : (
            <span style={{ fontSize: 36 }}>🌱</span>
          )}
        </div>
      )}

      {/* ── Watering cursor (fixed) ──────────────────────────────────────── */}
      {wateringDrag && wateringDragPos && (
        <div
          className="fixed pointer-events-none z-[9999] select-none"
          style={{ left: wateringDragPos.x - 18, top: wateringDragPos.y - 32, fontSize: 32, filter: 'drop-shadow(0 2px 6px rgba(59,130,246,0.7))' }}
        >
          🪣
        </div>
      )}

      {/* ── Inventory panel ──────────────────────────────────────────────── */}
      {!wrappingMode && (
        <InventoryPanel
          userId={user?.id}
          onWrapMode={() => setWrappingMode(true)}
          open={inventoryOpen}
          onClose={() => setInventoryOpen(false)}
        />
      )}

      {/* ── HUD Toolbar unificado ─────────────────────────────────────────── */}
      <div
        className="absolute right-4 z-20 bottom-6 md:bottom-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-end gap-1.5 mb-2">
          {(shovelError || wateringError || removeError || moveError) && (
            <div
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg shadow"
              style={{ background: 'rgba(139,40,40,0.9)', color: '#fecaca', border: '1px solid rgba(220,80,80,0.4)', fontFamily: 'var(--font-body)' }}
            >
              <span>{shovelError ?? wateringError ?? removeError ?? moveError}</span>
              <button onClick={() => { setShovelError(null); setWateringError(null); setRemoveError(null); setMoveError(null); }}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {shovelActive  && <div className="text-xs px-3 py-1 rounded-lg backdrop-blur-sm" style={{ background: 'rgba(15,32,12,0.85)', color: 'var(--color-text-light)', border: '1px solid rgba(92,58,30,0.3)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>Clique no jardim para cavar</div>}
          {removeMode    && <div className="text-xs px-3 py-1 rounded-lg backdrop-blur-sm" style={{ background: 'rgba(15,32,12,0.85)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>Clique num canteiro vazio para removê-lo</div>}
          {moveMode      && <div className="text-xs px-3 py-1 rounded-lg backdrop-blur-sm" style={{ background: 'rgba(15,32,12,0.85)', color: '#fde68a', border: '1px solid rgba(251,191,36,0.3)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>Arraste uma planta para outro canteiro</div>}
        </div>

        <div className="hub-toolbar">
          {/* 1 — Mochila */}
          <HexButton
            icon={<BackpackIcon open={inventoryOpen} />}
            label="Mochila"
            badge={undefined}
            active={inventoryOpen}
            onClick={toggleInventory}
            title="Abrir mochila"
          />
          {/* 2 — Pá */}
          <HexButton
            icon={digMutation.isPending ? <SpinnerIcon /> : <ShovelIcon />}
            badge={!shovelReady ? formatCooldown(shovelCooldownMs) : undefined}
            disabled={!shovelReady || digMutation.isPending}
            active={shovelActive}
            onClick={toggleShovel}
            label="Pá"
            title={shovelReady ? 'Usar pá para cavar' : `Recarregando: ${formatCooldown(shovelCooldownMs)}`}
          />
          {/* 3 — Regador */}
          <HexButton
            icon={waterMutation.isPending ? <SpinnerIcon /> : <WateringCanIcon />}
            badge={watersRemaining}
            disabled={!canWaterToday || waterMutation.isPending}
            active={wateringDrag}
            onPointerDown={handleWateringPointerDown}
            label="Regador"
            title={canWaterToday ? 'Arraste até uma planta para regar' : 'Limite diário atingido'}
          />
          {/* 4 — Mover planta */}
          <HexButton
            icon={movePlantMutation.isPending ? <SpinnerIcon /> : '🔀'}
            disabled={movePlantMutation.isPending}
            active={moveMode}
            onClick={toggleMoveMode}
            label="Mover"
            title="Arrastar planta para outro canteiro"
          />
          {/* 5 — Excluir canteiro */}
          <HexButton
            icon="🕳️"
            disabled={removePotMutation.isPending}
            active={removeMode}
            onClick={toggleRemoveMode}
            label="Excluir"
            title="Remover canteiro vazio do jardim"
          />
          {/* SEMPRE ÚLTIMO — Presente */}
          {pendingGifts.length > 0 && (
            <HexButton
              icon={<span style={{ animation: 'gift-shake 1.2s ease-in-out infinite', display: 'inline-block' }}>🎁</span>}
              badge={pendingGifts.length}
              onClick={(e) => { e.stopPropagation(); setActiveGift(pendingGifts[0]); }}
              label="Presente"
              title={`${pendingGifts.length} presente(s) aguardando`}
            />
          )}
        </div>
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

      {/* ── Gift receive modal ──────────────────────────────────────────── */}
      {activeGift && user && (
        <GiftReceiveModal
          userId={user.id}
          gift={activeGift}
          onClose={() => setActiveGift(null)}
        />
      )}

      {/* ── History modal ────────────────────────────────────────────────── */}
      {historyPlantId && (
        <HistoryWrapper
          plantId={historyPlantId}
          onClose={() => setHistoryPlantId(null)}
          onRegar={handleRegar}
          onRemover={handleRemover}
          isWaterPending={waterMutation.isPending}
          isDeletePending={deleteMutation.isPending}
        />
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
