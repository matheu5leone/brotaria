'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { Pot } from '@/types';
import { X, Loader2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

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
const WheelbarrowIcon = ({ carriedImageUrl }: { carriedImageUrl: string | null }) => (
  <span className="relative inline-block" style={{ width: '2.2em', height: '2.2em' }}>
    <Image src="/imgs/wheelbarrow.png" alt="carrinho" fill className="object-contain" draggable={false} />
    {/* Miniatura da planta recolhida sobreposta ao carrinho */}
    {carriedImageUrl && (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={carriedImageUrl}
        alt="planta"
        style={{ position: 'absolute', left: '50%', top: '-0.45em', transform: 'translateX(-50%)', width: '1.3em', height: '1.3em', objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.55))' }}
      />
    )}
  </span>
);
const TrashIcon = () => (
  <span className="relative inline-block" style={{ width: '2.1em', height: '2.1em' }}>
    <Image src="/imgs/trash.png" alt="lixeira" fill className="object-contain" draggable={false} />
  </span>
);
const SpinnerIcon = () => (
  <Loader2 className="animate-spin text-amber-200" style={{ width: '1.4em', height: '1.4em' }} />
);
// Chevron do toggle do HUD: vertical em portrait, horizontal em landscape/desktop.
// (mesma quebra do .hub-toolbar: row quando md OU landscape)
const HudToggleIcon = ({ expanded }: { expanded: boolean }) => {
  const sz = { width: '1.6em', height: '1.6em' } as const;
  return (
    <>
      <span className="inline-flex landscape:hidden md:hidden">
        {expanded ? <ChevronDown style={sz} /> : <ChevronUp style={sz} />}
      </span>
      <span className="hidden landscape:inline-flex md:inline-flex">
        {expanded ? <ChevronRight style={sz} /> : <ChevronLeft style={sz} />}
      </span>
    </>
  );
};
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
  const [removeError, setRemoveError]               = useState<string | null>(null);
  // Lixeira (remover planta / canteiro) — drag-and-drop estilo regador
  const [trashDrag, setTrashDrag]                   = useState(false);
  const [trashDragPos, setTrashDragPos]             = useState<{ x: number; y: number } | null>(null);
  const [trashTargetPotId, setTrashTargetPotId]     = useState<string | null>(null);
  const [confirmDeletePot, setConfirmDeletePot]     = useState<Pot | null>(null);
  // Carrinho de mão (mover plantas) — drag-and-drop estilo regador
  // carried = planta atualmente "no carrinho" (recolhida, aguardando replante)
  const [carried, setCarried]                       = useState<{ plantId: string; fromPotId: string; imageUrl: string | null } | null>(null);
  const [barrowDrag, setBarrowDrag]                 = useState(false);
  const [barrowDragPos, setBarrowDragPos]           = useState<{ x: number; y: number } | null>(null);
  const [barrowTargetPotId, setBarrowTargetPotId]   = useState<string | null>(null);
  const [moveError, setMoveError]                   = useState<string | null>(null);
  // Stressed pots (sad face after move)
  const [stressedPotIds, setStressedPotIds]         = useState<Set<string>>(new Set());
  const [cursorPos, setCursorPos]                   = useState<{ x: number; y: number } | null>(null);
  const [wrappingMode, setWrappingMode]             = useState(false);
  const [wrapError, setWrapError]                   = useState<string | null>(null);
  const [activeGift, setActiveGift]                 = useState<PendingGift | null>(null);
  const [inventoryOpen, setInventoryOpen]           = useState(false);
  const [hudExpanded, setHudExpanded]               = useState(true); // HUD recolhível
  // Landscape mobile: HUD vai pro footer (portal) para aproveitar o espaço
  const [isLandscapeMobile, setIsLandscapeMobile]   = useState(false);
  const [toolsSlot, setToolsSlot]                   = useState<HTMLElement | null>(null);

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
  // Bloqueia clique sintético logo após soltar a rega (não abrir card da planta)
  const suppressClickRef = useRef(false);

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

    // Pointer capture garante que pointermove/up cheguem mesmo movendo o dedo
    // para fora do botão (essencial no mobile/touch).
    const captureEl = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try { captureEl.setPointerCapture(pointerId); } catch {}

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
      captureEl.removeEventListener('pointermove', onMove);
      captureEl.removeEventListener('pointerup', onUp);
      captureEl.removeEventListener('pointercancel', onUp);
      try { captureEl.releasePointerCapture(pointerId); } catch {}

      const pot = findPotAtPoint(ev.clientX, ev.clientY);
      if (pot?.plant_id) {
        // Bloqueia o clique sintético pós-toque (evitaria abrir o card da planta)
        suppressClickRef.current = true;
        setTimeout(() => { suppressClickRef.current = false; }, 400);
        handleWaterPot(pot);
      }
    };

    // Com pointer capture, os eventos são entregues ao elemento capturante
    captureEl.addEventListener('pointermove', onMove);
    captureEl.addEventListener('pointerup', onUp);
    captureEl.addEventListener('pointercancel', onUp);
  }, [canWaterToday, waterMutation.isPending, findPotAtPoint, handleWaterPot]);

  // Remove canteiro vazio
  const handleRemovePot = useCallback(async (pot: Pot) => {
    if (pot.plant_id) { setRemoveError('Remova a planta antes de apagar o canteiro.'); return; }
    setRemoveError(null);
    try { await removePotMutation.mutateAsync({ potId: pot.id }); }
    catch (err: unknown) { setRemoveError((err as Error).message); }
  }, [removePotMutation]);

  // Drag da lixeira (inicia no pointerdown do botão), estilo regador.
  // - Solta em pot COM planta → abre confirmação de exclusão da planta
  // - Solta em pot SEM planta → remove o canteiro vazio direto
  const handleTrashPointerDown = useCallback((e: React.PointerEvent) => {
    if (deleteMutation.isPending || removePotMutation.isPending) return;
    e.preventDefault();
    e.stopPropagation();

    const captureEl = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try { captureEl.setPointerCapture(pointerId); } catch {}

    setTrashDrag(true);
    setTrashDragPos({ x: e.clientX, y: e.clientY });
    setTrashTargetPotId(null);
    setRemoveError(null);
    setShovelActive(false);

    let active = true;

    const onMove = (ev: PointerEvent) => {
      if (!active) return;
      setTrashDragPos({ x: ev.clientX, y: ev.clientY });
      const pot = findPotAtPoint(ev.clientX, ev.clientY);
      setTrashTargetPotId(pot ? pot.id : null);
    };

    const onUp = (ev: PointerEvent) => {
      active = false;
      setTrashDrag(false);
      setTrashDragPos(null);
      setTrashTargetPotId(null);
      captureEl.removeEventListener('pointermove', onMove);
      captureEl.removeEventListener('pointerup', onUp);
      captureEl.removeEventListener('pointercancel', onUp);
      try { captureEl.releasePointerCapture(pointerId); } catch {}

      const pot = findPotAtPoint(ev.clientX, ev.clientY);
      if (!pot) return;
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 400);

      if (pot.plant_id) {
        setConfirmDeletePot(pot); // confirma antes de excluir a planta
      } else {
        handleRemovePot(pot); // canteiro vazio: remove direto
      }
    };

    captureEl.addEventListener('pointermove', onMove);
    captureEl.addEventListener('pointerup', onUp);
    captureEl.addEventListener('pointercancel', onUp);
  }, [deleteMutation.isPending, removePotMutation.isPending, findPotAtPoint, handleRemovePot]);

  // Move plant drag via Pointer Events
  // Drag do carrinho de mão (inicia no pointerdown do botão), estilo regador.
  // - Carrinho vazio + solta em pot COM planta  → recolhe a planta (carried)
  // - Carrinho cheio  + solta em pot SEM planta  → replanta (movePlant)
  const handleBarrowPointerDown = useCallback((e: React.PointerEvent) => {
    if (movePlantMutation.isPending) return;
    e.preventDefault();
    e.stopPropagation();

    const captureEl = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try { captureEl.setPointerCapture(pointerId); } catch {}

    setBarrowDrag(true);
    setBarrowDragPos({ x: e.clientX, y: e.clientY });
    setBarrowTargetPotId(null);
    setMoveError(null);
    setShovelActive(false);

    const loaded = !!carried; // tem planta no carrinho?
    let active = true;

    const onMove = (ev: PointerEvent) => {
      if (!active) return;
      setBarrowDragPos({ x: ev.clientX, y: ev.clientY });
      const pot = findPotAtPoint(ev.clientX, ev.clientY);
      // Alvo válido: vazio se carregado (replante), com planta se vazio (recolher)
      const valid = pot && (loaded ? !pot.plant_id : !!pot.plant_id);
      setBarrowTargetPotId(valid ? pot!.id : null);
    };

    const onUp = async (ev: PointerEvent) => {
      active = false;
      setBarrowDrag(false);
      setBarrowDragPos(null);
      setBarrowTargetPotId(null);
      captureEl.removeEventListener('pointermove', onMove);
      captureEl.removeEventListener('pointerup', onUp);
      captureEl.removeEventListener('pointercancel', onUp);
      try { captureEl.releasePointerCapture(pointerId); } catch {}

      const pot = findPotAtPoint(ev.clientX, ev.clientY);
      if (!pot) return;
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 400);

      if (!loaded) {
        // Recolher: planta sai do pot (otimista) e vai para o carrinho
        if (!pot.plant_id) return;
        const cachedVersion = qc.getQueryData<{ image_url: string | null }>(['plant', pot.plant_id, 'version']);
        setCarried({ plantId: pot.plant_id, fromPotId: pot.id, imageUrl: cachedVersion?.image_url ?? null });
      } else {
        // Replantar: move do pot de origem para o pot vazio escolhido
        if (pot.plant_id || pot.id === carried!.fromPotId) { setCarried(null); return; }
        try {
          const result = await movePlantMutation.mutateAsync({ fromPotId: carried!.fromPotId, toPotId: pot.id });
          if (result.stressed) {
            setStressedPotIds(prev => new Set([...prev, pot.id]));
            setTimeout(() => {
              setStressedPotIds(prev => { const s = new Set(prev); s.delete(pot.id); return s; });
            }, 6000);
          }
          setCarried(null);
        } catch (err: unknown) {
          setMoveError((err as Error).message);
        }
      }
    };

    captureEl.addEventListener('pointermove', onMove);
    captureEl.addEventListener('pointerup', onUp);
    captureEl.addEventListener('pointercancel', onUp);
  }, [movePlantMutation, findPotAtPoint, qc, carried]);

  const handlePotClick = (pot: Pot) => async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (suppressClickRef.current) return; // ignora clique sintético pós-rega
    if (wateringDrag || barrowDrag || trashDrag) return; // drag cuida das ferramentas

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
    setConfirmDeletePot(selectedPot); // usa o diálogo de confirmação estilizado
  };

  // Confirmação da lixeira / card: exclui a planta do pot pendente
  const handleConfirmDelete = async () => {
    const pot = confirmDeletePot;
    if (!pot?.plant_id) { setConfirmDeletePot(null); return; }
    try {
      await deleteMutation.mutateAsync({ plantId: pot.plant_id, potId: pot.id });
      if (selectedPotId === pot.id) setSelectedPotId(null);
    } catch (err: unknown) {
      setRemoveError(err instanceof Error ? err.message : 'Erro ao excluir planta.');
    } finally {
      setConfirmDeletePot(null);
    }
  };

  const closeAllModes = () => {
    setShovelActive(false); setInventoryOpen(false);
  };

  const toggleShovel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!shovelReady) return;
    const next = !shovelActive;
    closeAllModes(); setShovelActive(next);
    setShovelError(null); setSelectedPotId(null);
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
    if (shovelActive || wateringDrag || barrowDrag || trashDrag || wrappingMode) return;
    panPointer.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
    hasPanned.current = false;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, [shovelActive, wateringDrag, barrowDrag, trashDrag, wrappingMode]);

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

  // ── Landscape mobile: detecta e localiza o slot do footer ─────────────────
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape) and (max-height: 600px)');
    const update = () => setIsLandscapeMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setToolsSlot(isLandscapeMobile ? document.getElementById('garden-tools-slot') : null);
  }, [isLandscapeMobile]);

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
          // Pot de origem da planta recolhida aparece vazio (otimista)
          const displayPot = carried?.fromPotId === pot.id
            ? { ...pot, plant_id: null, digging_started_at: null }
            : pot;
          return (
            <div
              key={pot.id}
              className="absolute hex-pot"
              style={{
                aspectRatio: '1 / 1.65',
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: selectedPotId === pot.id ? 5 : 2,
                pointerEvents: 'none', // só o hitbox recortado dentro do HexPot clica
              }}
            >
              <HexPot
                pot={displayPot}
                isSelected={selectedPotId === pot.id}
                isStressed={stressedPotIds.has(pot.id)}
                isWaterTarget={wateringDrag && wateringTargetPotId === pot.id}
                isMoveTarget={barrowDrag && barrowTargetPotId === pot.id}
                isTrashTarget={trashDrag && trashTargetPotId === pot.id}
                onClick={handlePotClick(pot)}
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
              className="absolute hex-pot flex items-end justify-center cursor-pointer z-10 pb-[5%]"
              style={{
                left: `${x}%`,
                top: `${y}%`,
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

        {/* Highlights de alvo (água/mover) agora são glow na silhueta das
            imagens, aplicados dentro do HexPot via isWaterTarget/isMoveTarget. */}

        {/* Popup de ações (Regar/Remover) removido — tudo via HUD agora. */}
      </div>
      {/* ══ fim do canvas ═════════════════════════════════════════════════ */}

      {/* ── Shovel cursor (viewport space) ──────────────────────────────── */}
      {shovelActive && cursorPos && (
        <div
          className="pointer-events-none absolute z-50 rounded-full border-2 border-white shadow-lg"
          style={{ width: 40, height: 40, left: cursorPos.x - 20, top: cursorPos.y - 20 }}
        />
      )}

      {/* ── Carrinho de mão drag cursor (fixed) — carrinho + miniatura ──── */}
      {barrowDrag && barrowDragPos && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{ left: barrowDragPos.x - 28, top: barrowDragPos.y - 32, width: 56, height: 56, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.55))' }}
        >
          <Image src="/imgs/wheelbarrow.png" alt="carrinho" width={56} height={56} className="object-contain" draggable={false} />
          {carried?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={carried.imageUrl}
              alt="planta"
              style={{ position: 'absolute', left: '50%', top: '-30%', transform: 'translateX(-50%)', width: 34, height: 34, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5)) brightness(1.05)' }}
            />
          )}
        </div>
      )}

      {/* ── Watering cursor (fixed) ──────────────────────────────────────── */}
      {wateringDrag && wateringDragPos && (
        <div
          className="fixed pointer-events-none z-[9999] select-none"
          style={{ left: wateringDragPos.x - 24, top: wateringDragPos.y - 28, width: 48, height: 48, filter: 'drop-shadow(0 2px 6px rgba(59,130,246,0.7))' }}
        >
          <Image src="/imgs/watering-can.png" alt="regador" width={48} height={48} className="object-contain" draggable={false} />
        </div>
      )}

      {/* ── Trash cursor (fixed) ─────────────────────────────────────────── */}
      {trashDrag && trashDragPos && (
        <div
          className="fixed pointer-events-none z-[9999] select-none"
          style={{ left: trashDragPos.x - 26, top: trashDragPos.y - 30, width: 52, height: 52, filter: 'drop-shadow(0 2px 6px rgba(239,68,68,0.6))' }}
        >
          <Image src="/imgs/trash.png" alt="lixeira" width={52} height={52} className="object-contain" draggable={false} />
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

      {/* ── HUD Toolbar unificado — flutuante OU no footer (landscape mobile) ── */}
      {(() => {
        const hudInner = (
          <>
        <div className="absolute bottom-full right-0 mb-2 flex flex-col items-end gap-1.5">
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
          {trashDrag     && <div className="text-xs px-3 py-1 rounded-lg backdrop-blur-sm" style={{ background: 'rgba(15,32,12,0.85)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>Solte numa planta para removê-la</div>}
          {carried       && <div className="text-xs px-3 py-1 rounded-lg backdrop-blur-sm" style={{ background: 'rgba(15,32,12,0.85)', color: '#fde68a', border: '1px solid rgba(251,191,36,0.3)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>Arraste o carrinho até um canteiro vazio para replantar</div>}
        </div>

        <div className="hub-toolbar">
          {/* 0 — Toggle recolher/expandir (ocupa a posição-âncora) */}
          <HexButton
            anchor
            icon={<HudToggleIcon expanded={hudExpanded} />}
            label={hudExpanded ? 'Recolher' : 'Menu'}
            active={false}
            onClick={(e) => { e.stopPropagation(); setHudExpanded(v => !v); }}
            title={hudExpanded ? 'Recolher menu' : 'Abrir menu'}
          />

          {/* Grupo colapsável (animação grid 0fr/1fr) — sempre montado */}
          <div className="hud-group" data-expanded={hudExpanded}>
            <div className="hud-group-inner">
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
              {/* 4 — Carrinho de mão (mover planta) */}
              <HexButton
                icon={movePlantMutation.isPending ? <SpinnerIcon /> : <WheelbarrowIcon carriedImageUrl={carried?.imageUrl ?? null} />}
                disabled={movePlantMutation.isPending}
                active={barrowDrag || !!carried}
                onPointerDown={handleBarrowPointerDown}
                label="Carrinho"
                title={carried ? 'Arraste até um canteiro vazio para replantar' : 'Arraste até uma planta para recolhê-la'}
              />
              {/* 5 — Lixeira (remover planta / canteiro) */}
              <HexButton
                icon={deleteMutation.isPending || removePotMutation.isPending ? <SpinnerIcon /> : <TrashIcon />}
                disabled={deleteMutation.isPending || removePotMutation.isPending}
                active={trashDrag}
                onPointerDown={handleTrashPointerDown}
                label="Lixeira"
                title="Arraste até uma planta para removê-la"
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
          </div>
          </>
        );
        return isLandscapeMobile && toolsSlot
          ? createPortal(
              <div className="hud-in-footer relative flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                {hudInner}
              </div>,
              toolsSlot,
            )
          : (
            <div className="hud-pos absolute right-4 z-20" onClick={(e) => e.stopPropagation()}>
              {hudInner}
            </div>
          );
      })()}

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

      {/* ── Confirmação de exclusão de planta (lixeira) ──────────────────── */}
      {confirmDeletePot && (
        <ConfirmDeleteModal
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeletePot(null)}
        />
      )}
    </div>
  );
}

// Diálogo de confirmação de exclusão — tema grimório escuro (design.md §4.7)
function ConfirmDeleteModal({
  isPending, onConfirm, onCancel,
}: {
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,3,0.62)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="relative flex flex-col items-center text-center px-6 py-6"
        style={{
          width: 'min(88vw, 340px)',
          background: 'linear-gradient(160deg, #1c2d10, #0f1a08, #0a1205)',
          border: '1.5px solid rgba(201,162,39,0.35)',
          boxShadow: '0 18px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,162,39,0.12)',
          borderRadius: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-center mb-3"
          style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.4)' }}
        >
          <Trash2 className="w-7 h-7" style={{ color: '#f87171' }} />
        </div>

        <h3
          className="mb-1.5"
          style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 900, color: 'var(--color-text-light)', letterSpacing: '0.02em' }}
        >
          Remover planta?
        </h3>
        <p
          className="mb-5"
          style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.45, color: 'rgba(232,213,160,0.7)' }}
        >
          Esta ação não pode ser desfeita. Você perderá o DNA único desta planta para sempre.
        </p>

        <div className="flex gap-2.5 w-full">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ fontFamily: 'var(--font-display)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,162,39,0.25)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ fontFamily: 'var(--font-display)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fecaca', background: 'rgba(185,28,28,0.45)', border: '1px solid rgba(239,68,68,0.55)' }}
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}

