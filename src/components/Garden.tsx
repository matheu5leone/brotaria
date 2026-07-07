'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { Pot } from '@/types';
import { X, Loader2, Trash2, Sprout, Heart } from 'lucide-react';

// Ícones PNG dimensionados em `em` para escalar com o tamanho do botão (.hex-button)
const WateringCanIcon = () => (
  <span className="relative inline-block" style={{ width: '2em', height: '2em' }}>
    <Image src="/imgs/watering-can.webp" alt="regador" fill className="object-contain" draggable={false} />
  </span>
);
const ShovelIcon = () => (
  <span className="relative inline-block" style={{ width: '1.7em', height: '2em', transform: 'rotate(-35deg)' }}>
    <Image src="/imgs/shovel.webp" alt="pá" fill className="object-contain" draggable={false} />
  </span>
);
const BackpackIcon = ({ open }: { open: boolean }) => (
  <span className="relative inline-block" style={{ width: '2.2em', height: '2.2em' }}>
    <Image src={open ? '/imgs/backpack-open.webp' : '/imgs/backpack.webp'} alt="mochila" fill className="object-contain" draggable={false} />
  </span>
);
const WheelbarrowIcon = ({ carriedImageUrl, carrying }: { carriedImageUrl: string | null; carrying: boolean }) => (
  <span className="relative inline-block" style={{ width: '2.2em', height: '2.2em' }}>
    <Image src="/imgs/wheelbarrow.webp" alt="carrinho" fill className="object-contain" draggable={false} />
    {/* Carga do carrinho: miniatura da planta OU broto (quando enterrada, sem imagem).
        Glow verde suave sinaliza que o carrinho está carregado. */}
    {carrying && (
      <span
        className="absolute flex items-center justify-center"
        style={{ left: '50%', top: '-0.45em', transform: 'translateX(-50%)', width: '1.3em', height: '1.3em' }}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.55), transparent 70%)' }}
        />
        {carriedImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={carriedImageUrl}
            alt="planta"
            style={{ position: 'relative', width: '1.3em', height: '1.3em', objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.55))' }}
          />
        ) : (
          <Sprout style={{ position: 'relative', width: '1em', height: '1em', color: '#4ade80', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} strokeWidth={2.4} />
        )}
      </span>
    )}
  </span>
);
const TrashIcon = () => (
  <span className="relative inline-block" style={{ width: '2.1em', height: '2.1em' }}>
    <Image src="/imgs/trash.webp" alt="lixeira" fill className="object-contain" draggable={false} />
  </span>
);
const SpinnerIcon = () => (
  <Loader2 className="animate-spin text-amber-200" style={{ width: '1.4em', height: '1.4em' }} />
);
// Chevron do toggle do painel: vertical em portrait, horizontal em landscape/desktop.
const PainelToggleIcon = ({ expanded }: { expanded: boolean }) => {
  // Seta de madeira (asset gerado no estilo do jogo, apontando pra CIMA).
  // As 4 direções saem por rotação: mobile abre pra cima/baixo, desktop
  // (e landscape) pra esquerda/direita.
  const arrow = (deg: number) => (
    <span
      className="relative inline-block transition-transform duration-300"
      style={{ width: '1.8em', height: '1.8em', transform: `rotate(${deg}deg)` }}
    >
      <Image src="/imgs/arrow.webp" alt="alternar menu" fill className="object-contain" draggable={false} />
    </span>
  );
  return (
    <>
      <span className="inline-flex landscape:hidden md:hidden">
        {arrow(expanded ? 180 : 0)}
      </span>
      <span className="hidden landscape:inline-flex md:inline-flex">
        {arrow(expanded ? 90 : -90)}
      </span>
    </>
  );
};
import CoinPurchaseModal from './CoinPurchaseModal';
import { usePots, useShovelStatus, useWateringStatus } from '@/hooks/useGardenData';
import { SHOVEL_COOLDOWN_MS } from '@/config/economy';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useLikes } from '@/hooks/useLikes';
import { potPolygonPx, polygonsOverlap, footprintBounds, POT_FOOTPRINT } from '@/lib/potGeometry';

// Pontos do footprint para o SVG da silhueta (viewBox 0 0 100 165 = aspecto da caixa)
const FOOTPRINT_SVG_POINTS = POT_FOOTPRINT.map(([x, y]) => `${(x * 100).toFixed(1)},${(y * 165).toFixed(1)}`).join(' ');
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
import { PlantsGridModal } from '@/components/PlantsGridModal';
import { EvolutionLoader } from '@/components/EvolutionLoader';
import type { PlantRow } from '@/hooks/usePlantData';
import { InventoryPanel } from '@/components/InventoryPanel';
import { useWrapPlant } from '@/hooks/useInventory';
import { HexButton } from '@/components/HexButton';
import { HexPot, getPotState } from '@/components/HexPot';
import { usePendingGifts } from '@/hooks/useGifts';
import { GiftReceiveModal } from '@/components/GiftReceiveModal';
import type { PendingGift } from '@/hooks/useGifts';

const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

/** Fundo estendido (140% = 1.4) — usado no clamp de pan */
const GARDEN_BG_EXTENT = 1.4;
const GARDEN_ZOOM_MIN = 1;
const GARDEN_ZOOM_MAX = 1.8;

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

// Wrapper para buscar plant e abrir o card story (histórico + navegação)
function HistoryWrapper({
  plantId, plantIds, onSelectPlant, onClose,
}: {
  plantId: string;
  plantIds: string[];
  onSelectPlant: (plantId: string) => void;
  onClose: () => void;
}) {
  const { data: plant } = usePlant(plantId);
  if (!plant) return null;
  return (
    <PlantHistoryModal
      plant={plant}
      open
      onClose={onClose}
      plantIds={plantIds}
      onSelectPlant={onSelectPlant}
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
  // Cooldown da pá com tick local (varredura/numero suaves, sem depender do refetch)
  const [shovelCdMs, setShovelCdMs] = useState(0);
  // Camada de segurança: com 0 canteiros a pá SEMPRE pode ser usada (o cooldown só
  // vale enquanto houver ao menos um canteiro). Evita ficar preso sem jardim ao
  // cavar e remover logo em seguida.
  const noPots = pots.length === 0;
  const shovelReady = noPots || shovelCdMs <= 0;
  // Cooldown exibido: escondido quando não há canteiros (a pá está liberada).
  const shovelCdShown = noPots ? 0 : shovelCdMs;
  const waterBalance = wateringStatus?.balance ?? 0;
  const canWaterToday = waterBalance > 0;

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
  const [coinModalPotId, setCoinModalPotId]         = useState<string | null>(null);
  const [shovelActive, setShovelActive]             = useState(false);
  const [shovelError, setShovelError]               = useState<string | null>(null);
  // Drag-and-drop do regador
  const [wateringDrag, setWateringDrag]             = useState(false);
  const [wateringDragPos, setWateringDragPos]       = useState<{ x: number; y: number } | null>(null);
  const [wateringTargetPotId, setWateringTargetPotId] = useState<string | null>(null);
  const [wateringError, setWateringError]           = useState<string | null>(null);
  // Tela de evolução (raios solares + logo) enquanto a IA gera a nova fase
  const [evolvingPlant, setEvolvingPlant]           = useState(false);
  const evoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (evoTimer.current) clearTimeout(evoTimer.current); }, []);
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
  // Pré-visualização da cava: silhueta-fantasma + validade (colisão/área)
  const [digPreview, setDigPreview]                 = useState<{ posX: number; posY: number; valid: boolean } | null>(null);
  const isDesktop = useIsDesktop();
  const { data: myLikes } = useLikes(user?.id); // curtidas do próprio jardim
  const [wrappingMode, setWrappingMode]             = useState(false);
  const [wrapError, setWrapError]                   = useState<string | null>(null);
  const [activeGift, setActiveGift]                 = useState<PendingGift | null>(null);
  // Presentes fechados sem decisão não reabrem sozinhos nesta sessão
  const [dismissedGiftIds, setDismissedGiftIds]     = useState<ReadonlySet<string>>(new Set());
  const [inventoryOpen, setInventoryOpen]           = useState(false);
  const [painelOpen, setPainelOpen]                 = useState(false); // painel recolhível (começa recolhido)
  const [plantsGridOpen, setPlantsGridOpen]         = useState(false); // grid "Minhas Plantas"
  // Toast central de feedback (evolução de fase, erros de rega, etc.)
  const [toast, setToast]                           = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-abre o presente pendente (chegado ao vivo via realtime ou já
  // esperando no login). Ajuste durante o render — o guard evita loop.
  const nextGift = pendingGifts.find(g => !dismissedGiftIds.has(g.id));
  if (!activeGift && nextGift) setActiveGift(nextGift);

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

  // `will-change: transform` deixa o pan/zoom fluido, MAS promove o canvas a
  // uma camada GPU rasterizada em 1x → ao dar zoom in a imagem fica borrada.
  // Solução: só usa will-change DURANTE a interação; parado, remove pra o
  // navegador re-rasterizar na escala atual (nítido).
  const [interacting, setInteracting] = useState(false);
  const interactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markInteracting = useCallback(() => {
    setInteracting(true);
    if (interactTimer.current) clearTimeout(interactTimer.current);
    interactTimer.current = setTimeout(() => setInteracting(false), 220);
  }, []);

  // Clamp pan para que o fundo 140% sempre cubra o viewport
  const clampPan = useCallback((x: number, y: number, z: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x, y };
    const maxX = rect.width  * (GARDEN_BG_EXTENT * z - 1) / 2;
    const maxY = rect.height * (GARDEN_BG_EXTENT * z - 1) / 2;
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }, []);

  const applyZoom = useCallback((next: number, focalX: number, focalY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clampedZoom = Math.max(GARDEN_ZOOM_MIN, Math.min(GARDEN_ZOOM_MAX, next));
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const prevZoom = zoomRef.current;
    const prevPan = panRef.current;
    const canvasX = (focalX - cx - prevPan.x) / prevZoom + cx;
    const canvasY = (focalY - cy - prevPan.y) / prevZoom + cy;
    const newPanX = focalX - cx - (canvasX - cx) * clampedZoom;
    const newPanY = focalY - cy - (canvasY - cy) * clampedZoom;
    const clampedPan = clampPan(newPanX, newPanY, clampedZoom);
    zoomRef.current = clampedZoom;
    panRef.current = clampedPan;
    setZoom(clampedZoom);
    setPan(clampedPan);
  }, [clampPan]);

  // Pan por pointer (mouse drag / 1 dedo)
  const panPointer    = useRef<{ id: number; startX: number; startY: number; panX: number; panY: number } | null>(null);
  const activePointers = useRef(new Set<number>());
  const hasPanned     = useRef(false);
  // Bloqueia clique sintético logo após soltar a rega (não abrir card da planta)
  const suppressClickRef = useRef(false);

  // ── Derived ──────────────────────────────────────────────────────────────
  const selectedPot    = pots.find(p => p.id === selectedPotId) ?? null;
  const selectedPlantId = selectedPot?.plant_id ?? null;
  // Lista de plantas (para swipe trocar de planta no card story) + seletor
  const plantedPlantIds = pots.filter(p => p.plant_id).map(p => p.plant_id as string);
  const selectPlantById = useCallback((pid: string) => {
    const pot = pots.find(p => p.plant_id === pid);
    if (pot) setSelectedPotId(pot.id);
  }, [pots]);

  // ── Callbacks ────────────────────────────────────────────────────────────
  const handleDigComplete = useCallback(
    () => qc.invalidateQueries({ queryKey: ['garden', 'pots', user?.id] }),
    [qc, user?.id],
  );

  // Converte um ponto de tela (clientX/Y) → % do jardim (desfaz pan/zoom).
  const screenToGardenPct = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const canvasX = (clientX - rect.left - cx - panRef.current.x) / zoomRef.current + cx;
    const canvasY = (clientY - rect.top  - cy - panRef.current.y) / zoomRef.current + cy;
    return { rect, rawX: (canvasX / rect.width) * 100, rawY: (canvasY / rect.height) * 100 };
  }, []);

  // Largura da caixa do vaso em px do canvas (sem zoom). Mede um .hex-pot real
  // (robusto a breakpoint); se não houver vaso ainda, cai para o % do breakpoint.
  const potBoxWidthPx = useCallback((rectWidth: number) => {
    const el = canvasRef.current?.querySelector('.hex-pot') as HTMLElement | null;
    if (el) return el.getBoundingClientRect().width / zoomRef.current;
    const pct = window.matchMedia('(min-width: 768px) and (min-height: 600px)').matches ? 0.14
      : window.matchMedia('(orientation: landscape) and (max-height: 600px)').matches ? 0.11
      : 0.18;
    return pct * rectWidth;
  }, []);

  // Posição candidata + validade: dentro da área plantável E sem colidir com vasos.
  const computeDig = useCallback((clientX: number, clientY: number) => {
    const s = screenToGardenPct(clientX, clientY);
    if (!s) return null;
    const { rect, rawX, rawY } = s;
    const posX = Math.min(100, Math.max(0, rawX));
    const posY = Math.min(100, Math.max(0, rawY));
    const inArea = rawX >= 6 && rawX <= 94 && rawY >= 8 && rawY <= 92;

    const boxW = potBoxWidthPx(rect.width);
    const boxH = boxW * 1.65;
    const candidate = potPolygonPx((posX / 100) * rect.width, (posY / 100) * rect.height, boxW, boxH);
    const b = footprintBounds(candidate);
    const inside = b.minX >= 0 && b.minY >= 0 && b.maxX <= rect.width && b.maxY <= rect.height;
    let collides = false;
    for (const p of pots) {
      const cxp = ((p.pos_x ?? 50) / 100) * rect.width;
      const cyp = ((p.pos_y ?? 50) / 100) * rect.height;
      if (polygonsOverlap(candidate, potPolygonPx(cxp, cyp, boxW, boxH))) { collides = true; break; }
    }
    return { posX, posY, valid: inArea && inside && !collides };
  }, [screenToGardenPct, potBoxWidthPx, pots]);

  const digAt = useCallback(async (clientX: number, clientY: number) => {
    if (digMutation.isPending || !user) return;
    const d = computeDig(clientX, clientY);
    if (!d) return;
    if (!d.valid) { setShovelError('Não dá pra cavar aqui — muito perto de outro canteiro ou fora da área.'); return; }
    const posX = Math.min(94, Math.max(6, d.posX));
    const posY = Math.min(92, Math.max(8, d.posY));
    setShovelError(null);
    setShovelActive(false);
    setDigPreview(null);
    try {
      await digMutation.mutateAsync({ posX, posY });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      setShovelError(e.code === 'COOLDOWN' ? 'A pá ainda está recarregando.' : (e.message ?? 'Erro ao cavar.'));
    }
  }, [digMutation, user, computeDig]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleGardenMouseMove = (e: React.MouseEvent) => {
    if (!shovelActive || !isDesktop) return;
    const d = computeDig(e.clientX, e.clientY);
    if (d) setDigPreview(d);
  };

  const handleGardenMouseLeave = () => { if (isDesktop) setDigPreview(null); };

  const handleGardenClick = async (e: React.MouseEvent) => {
    if (hasPanned.current) { hasPanned.current = false; return; }
    if (selectedPotId) { setSelectedPotId(null); return; }
    if (!shovelActive || !isDesktop) return; // mobile cava por drag
    await digAt(e.clientX, e.clientY);
  };

  // Mobile: cavar por arraste (espelha o padrão do regador).
  const handleShovelPointerDown = useCallback((e: React.PointerEvent) => {
    if (!shovelReady || digMutation.isPending) return;
    e.preventDefault();
    e.stopPropagation();
    setInventoryOpen(false);
    setSelectedPotId(null);
    setShovelError(null);
    setShovelActive(true);

    const captureEl = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try { captureEl.setPointerCapture(pointerId); } catch {}

    const d0 = computeDig(e.clientX, e.clientY);
    if (d0) setDigPreview(d0);

    let active = true;
    const onMove = (ev: PointerEvent) => {
      if (!active) return;
      const d = computeDig(ev.clientX, ev.clientY);
      if (d) setDigPreview(d);
    };
    const onUp = (ev: PointerEvent) => {
      active = false;
      captureEl.removeEventListener('pointermove', onMove);
      captureEl.removeEventListener('pointerup', onUp);
      captureEl.removeEventListener('pointercancel', onUp);
      try { captureEl.releasePointerCapture(pointerId); } catch {}
      const d = computeDig(ev.clientX, ev.clientY);
      setShovelActive(false);
      setDigPreview(null);
      if (d?.valid) { void digAt(ev.clientX, ev.clientY); }
    };
    captureEl.addEventListener('pointermove', onMove);
    captureEl.addEventListener('pointerup', onUp);
    captureEl.addEventListener('pointercancel', onUp);
  }, [shovelReady, digMutation.isPending, computeDig, digAt]);

  // Rega via drag: chamado pelo pointerup quando soltar sobre uma planta
  const showToast = useCallback((text: string, kind: 'success' | 'error') => {
    setToast({ text, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), kind === 'success' ? 3500 : 3000);
  }, []);

  const handleWaterPot = useCallback(async (pot: Pot) => {
    if (!pot.plant_id || !canWaterToday || waterMutation.isPending) return;
    setWateringError(null);

    // Esta rega vai evoluir a planta? Se a planta está no cache, dá pra prever
    // e mostrar a tela de evolução na hora; senão, um fallback por tempo cobre
    // requisições lentas (geração de imagem) sem piscar nas regas normais.
    const cached = qc.getQueryData<PlantRow>(['plant', pot.plant_id]);
    const willEvolve = !!cached &&
      cached.current_stage_waters + 1 >= cached.current_stage.waters_required;

    if (willEvolve) {
      setEvolvingPlant(true);
    } else {
      evoTimer.current = setTimeout(() => setEvolvingPlant(true), 700);
    }

    try {
      const result = await waterMutation.mutateAsync({ plantId: pot.plant_id }) as
        { evolved?: boolean; stageName?: string; herbo?: number } | undefined;
      if (result?.evolved) {
        const reward = result.herbo ? ` · +${result.herbo} 🍃` : '';
        showToast(`🌱 Nova fase: ${result.stageName ?? 'planta evoluiu'}!${reward}`, 'success');
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      const msg =
        e.code === 'NO_WATER' ? 'Sem água! Colete mais na aba Coleta de Água.' :
        e.code === 'NOT_READY' ? 'Esta planta ainda não precisa de água.' :
        (e.message ?? 'Erro ao regar.');
      showToast(msg, 'error');
    } finally {
      if (evoTimer.current) { clearTimeout(evoTimer.current); evoTimer.current = null; }
      setEvolvingPlant(false);
    }
  }, [canWaterToday, waterMutation, showToast, qc]);

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

    if (shovelActive && isDesktop) { await digAt(e.clientX, e.clientY); return; }

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

  // Confirmação da lixeira: exclui a planta do pot pendente
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
    markInteracting();
    const newPan = clampPan(panPointer.current.panX + dx, panPointer.current.panY + dy, zoomRef.current);
    setPan(newPan);
  }, [clampPan, markInteracting]);

  const handleCanvasPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    if (panPointer.current?.id === e.pointerId) panPointer.current = null;
  }, []);

  // ── Wheel zoom ───────────────────────────────────────────────────────────
  // Depende de `gardenReady`: o listener só pode ser registrado depois que o
  // canvas monta (durante loading o containerRef ainda não existe).

  const gardenReady = !potsLoading && !potsError;

  useEffect(() => {
    if (!gardenReady) return;
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const focalX = e.clientX - rect.left;
      const focalY = e.clientY - rect.top;
      const next = zoomRef.current - e.deltaY * 0.001;
      markInteracting();
      applyZoom(next, focalX, focalY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gardenReady, applyZoom, markInteracting]);

  // ── Pinch zoom (touch) ───────────────────────────────────────────────────

  useEffect(() => {
    if (!gardenReady) return;
    const el = canvasRef.current;
    if (!el) return;
    let startDist = 0;
    let startZoom = 1;
    let startPan = { x: 0, y: 0 };
    let startFocalX = 0;
    let startFocalY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        panPointer.current = null; // cancela pan de 1 dedo
        const [a, b] = [e.touches[0], e.touches[1]];
        startDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        startZoom = zoomRef.current;
        startPan = { ...panRef.current };
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          startFocalX = (a.clientX + b.clientX) / 2 - rect.left;
          startFocalY = (a.clientY + b.clientY) / 2 - rect.top;
        }
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || startDist === 0) return;
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const next = Math.max(GARDEN_ZOOM_MIN, Math.min(GARDEN_ZOOM_MAX, startZoom * (dist / startDist)));
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const canvasX = (startFocalX - cx - startPan.x) / startZoom + cx;
      const canvasY = (startFocalY - cy - startPan.y) / startZoom + cy;
      const newPanX = startFocalX - cx - (canvasX - cx) * next;
      const newPanY = startFocalY - cy - (canvasY - cy) * next;
      const clampedPan = clampPan(newPanX, newPanY, next);
      zoomRef.current = next;
      panRef.current = clampedPan;
      markInteracting();
      setZoom(next);
      setPan(clampedPan);
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
  }, [gardenReady, clampPan, markInteracting]);

  // ── Cooldown da pá: timer local p/ varredura/numero suaves (sem refetch) ──
  // Ressincroniza durante o render (padrão React p/ estado derivado de prop),
  // sem o re-render em cascata que um useEffect causaria.
  const [prevCooldownMs, setPrevCooldownMs] = useState(shovelCooldownMs);
  if (prevCooldownMs !== shovelCooldownMs) {
    setPrevCooldownMs(shovelCooldownMs);
    setShovelCdMs(shovelCooldownMs);
  }
  useEffect(() => {
    if (shovelCdMs <= 0) return;
    const id = setInterval(() => {
      setShovelCdMs((ms) => Math.max(0, ms - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [shovelCdMs > 0]); // eslint-disable-line react-hooks/exhaustive-deps

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
          CANVAS — recebe pan + zoom. Fundo 140% fica aqui dentro.
          HUD, cursores e modais ficam FORA para não serem afetados.
      ══════════════════════════════════════════════════════════════════ */}
      <div
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '50% 50%',
          transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          // will-change só durante interação → parado, re-rasteriza nítido no zoom
          willChange: interacting ? 'transform' : 'auto',
          touchAction: 'none',
        }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
      >
        {/* Fundo — estendido 20% além de cada borda para permitir pan */}
        <div
          className="garden-bg absolute pointer-events-none"
          style={{ top: '-20%', left: '-20%', width: '140%', height: '140%', zIndex: 0 }}
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
                // Profundidade por perspectiva: quem está mais pra baixo (maior
                // pos_y) sobressai. Selecionado/alvo flutua acima de todos.
                zIndex: Math.round(y * 10) + (
                  selectedPotId === pot.id ||
                  (wateringDrag && wateringTargetPotId === pot.id) ||
                  (barrowDrag && barrowTargetPotId === pot.id) ||
                  (trashDrag && trashTargetPotId === pot.id) ? 100000 : 0
                ),
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

        {/* ── Silhueta-fantasma da cava (verde=pode / vermelho=não) ────── */}
        {shovelActive && digPreview && (
          <div
            className="absolute hex-pot pointer-events-none"
            style={{
              left: `${digPreview.posX}%`,
              top: `${digPreview.posY}%`,
              aspectRatio: '1 / 1.65',
              transform: 'translate(-50%, -50%)',
              zIndex: 999999,
            }}
          >
            {/* Fantasma do vaso (mesmo render do HexPot: base 80%, object-bottom) */}
            <div className="absolute bottom-0 left-0 right-0" style={{ height: '80%', opacity: 0.5 }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <Image src="/imgs/empty-pot.webp" alt="" fill className="object-contain object-bottom" draggable={false} />
              </div>
            </div>
            {/* Contorno do footprint tingido de verde/vermelho */}
            <svg
              viewBox="0 0 100 165"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
              style={{ overflow: 'visible' }}
            >
              <polygon
                points={FOOTPRINT_SVG_POINTS}
                fill={digPreview.valid ? 'rgba(74,222,128,0.30)' : 'rgba(239,68,68,0.32)'}
                stroke={digPreview.valid ? '#16a34a' : '#dc2626'}
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

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

      {/* ── Carrinho de mão drag cursor (fixed) — carrinho + miniatura ──── */}
      {barrowDrag && barrowDragPos && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{ left: barrowDragPos.x - 28, top: barrowDragPos.y - 32, width: 56, height: 56, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.55))' }}
        >
          <Image src="/imgs/wheelbarrow.webp" alt="carrinho" width={56} height={56} className="object-contain" draggable={false} />
          {carried && (
            <span
              className="absolute flex items-center justify-center"
              style={{ left: '50%', top: '-30%', transform: 'translateX(-50%)', width: 34, height: 34 }}
            >
              <span
                className="absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.55), transparent 70%)' }}
              />
              {carried.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={carried.imageUrl}
                  alt="planta"
                  style={{ position: 'relative', width: 34, height: 34, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5)) brightness(1.05)' }}
                />
              ) : (
                <Sprout style={{ position: 'relative', width: 22, height: 22, color: '#4ade80', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }} strokeWidth={2.4} />
              )}
            </span>
          )}
        </div>
      )}

      {/* ── Watering cursor (fixed) ──────────────────────────────────────── */}
      {wateringDrag && wateringDragPos && (
        <div
          className="fixed pointer-events-none z-[9999] select-none"
          style={{ left: wateringDragPos.x - 24, top: wateringDragPos.y - 28, width: 48, height: 48, filter: 'drop-shadow(0 2px 6px rgba(59,130,246,0.7))' }}
        >
          <Image src="/imgs/watering-can.webp" alt="regador" width={48} height={48} className="object-contain" draggable={false} />
        </div>
      )}

      {/* ── Trash cursor (fixed) ─────────────────────────────────────────── */}
      {trashDrag && trashDragPos && (
        <div
          className="fixed pointer-events-none z-[9999] select-none"
          style={{ left: trashDragPos.x - 26, top: trashDragPos.y - 30, width: 52, height: 52, filter: 'drop-shadow(0 2px 6px rgba(239,68,68,0.6))' }}
        >
          <Image src="/imgs/trash.webp" alt="lixeira" width={52} height={52} className="object-contain" draggable={false} />
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

      {/* ── Canto superior esquerdo: botão de plantas + curtidas do jardim ──── */}
      <div className="absolute top-3 left-3 z-[100] flex flex-col items-start gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); setPlantsGridOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110 active:scale-95"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
            color: '#d9f0c8',
            border: '1px solid rgba(74,222,128,0.25)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
          }}
          title="Ver todas as suas plantas"
        >
          <Sprout className="w-4 h-4" />
          Minhas Plantas
        </button>

        {/* Curtidas recebidas no meu jardim (só leitura, votos anônimos) */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-sm"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'rgba(8,14,5,0.72)',
            color: '#f87171',
            border: '1px solid rgba(248,113,113,0.35)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(6px)',
          }}
          title="Curtidas do seu jardim"
        >
          <Heart className="w-4 h-4" style={{ fill: '#f87171' }} />
          {myLikes?.total ?? 0}
        </div>
      </div>

      {/* ── Painel de ferramentas — canto inferior direito, âncora fixa ────── */}
      <div className="painel" onClick={(e) => e.stopPropagation()}>
        {/* Âncora (fixa) — recolhe/expande os demais botões */}
        <HexButton
          anchor
          className="painel-btn"
          icon={<PainelToggleIcon expanded={painelOpen} />}
          label={painelOpen ? 'Recolher' : 'Menu'}
          onClick={(e) => { e.stopPropagation(); setPainelOpen(v => !v); }}
          title={painelOpen ? 'Recolher menu' : 'Abrir menu'}
        />

        {/* Grupo colapsável (animação grid 0fr/1fr) */}
        <div className="painel-group" data-expanded={painelOpen}>
          <div className="painel-group-inner">
            {/* Mochila */}
            <HexButton
              className="painel-btn"
              icon={<BackpackIcon open={inventoryOpen} />}
              label="Mochila"
              active={inventoryOpen}
              onClick={toggleInventory}
              title="Abrir mochila"
            />
            {/* Pá — cooldown radial */}
            <HexButton
              className="painel-btn"
              icon={digMutation.isPending ? <SpinnerIcon /> : <ShovelIcon />}
              disabled={digMutation.isPending}
              cooldown={shovelCdShown > 0 ? { remainingMs: shovelCdShown, totalMs: SHOVEL_COOLDOWN_MS, label: formatCooldown(shovelCdShown) } : undefined}
              active={shovelActive}
              onClick={isDesktop ? toggleShovel : undefined}
              onPointerDown={isDesktop ? undefined : handleShovelPointerDown}
              label="Pá"
              title={shovelReady ? 'Usar pá para cavar' : `Recarregando: ${formatCooldown(shovelCdShown)}`}
            />
            {/* Regador — badge com nº de regas */}
            <HexButton
              className="painel-btn"
              icon={waterMutation.isPending ? <SpinnerIcon /> : <WateringCanIcon />}
              badge={waterBalance}
              disabled={!canWaterToday || waterMutation.isPending}
              active={wateringDrag}
              onPointerDown={handleWateringPointerDown}
              label="Regador"
              title={canWaterToday ? 'Arraste até uma planta para regar' : 'Sem água — colete mais'}
            />
            {/* Carrinho de mão (mover planta) */}
            <HexButton
              className="painel-btn"
              icon={movePlantMutation.isPending ? <SpinnerIcon /> : <WheelbarrowIcon carriedImageUrl={carried?.imageUrl ?? null} carrying={!!carried} />}
              disabled={movePlantMutation.isPending}
              active={barrowDrag || !!carried}
              onPointerDown={handleBarrowPointerDown}
              label="Carrinho"
              title={carried ? 'Arraste até um canteiro vazio para replantar' : 'Arraste até uma planta para recolhê-la'}
            />
            {/* Lixeira (remover planta / canteiro) */}
            <HexButton
              className="painel-btn"
              icon={deleteMutation.isPending || removePotMutation.isPending ? <SpinnerIcon /> : <TrashIcon />}
              disabled={deleteMutation.isPending || removePotMutation.isPending}
              active={trashDrag}
              onPointerDown={handleTrashPointerDown}
              label="Lixeira"
              title="Arraste até uma planta para removê-la"
            />
          </div>
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

      {/* ── Toast de feedback (evolução / erros) ─────────────────────────── */}
      {toast && (
        <div
          className="fixed left-1/2 top-6 z-[10001] -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-bold text-center pointer-events-none"
          style={{
            fontFamily: 'var(--font-display)',
            maxWidth: '90vw',
            background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
            border: `1.5px solid ${toast.kind === 'success' ? 'var(--color-wood-light)' : 'rgba(139,40,40,0.5)'}`,
            color: toast.kind === 'success' ? 'var(--color-text-dark)' : '#8b2828',
            boxShadow: '0 12px 36px rgba(0,0,0,0.4), inset 0 1px 1px rgba(242,232,213,0.9)',
          }}
        >
          {toast.text}
        </div>
      )}

      {/* ── Grid "Minhas Plantas" (imagem, raridade e valor) ─────────────── */}
      <PlantsGridModal
        open={plantsGridOpen}
        plantIds={plantedPlantIds}
        onSelectPlant={selectPlantById}
        onClose={() => setPlantsGridOpen(false)}
      />

      {/* ── Card story da planta (clique abre; toque=estágio, swipe=planta) ── */}
      {showDetailModal && selectedPlantId && (
        <HistoryWrapper
          plantId={selectedPlantId}
          plantIds={plantedPlantIds}
          onSelectPlant={selectPlantById}
          onClose={() => setSelectedPotId(null)}
        />
      )}

      {/* ── Gift receive modal ──────────────────────────────────────────── */}
      {activeGift && user && (
        <GiftReceiveModal
          userId={user.id}
          gift={activeGift}
          onClose={() => {
            setDismissedGiftIds(prev => new Set(prev).add(activeGift.id));
            setActiveGift(null);
          }}
        />
      )}

      {/* ── Tela de evolução (raios solares + logo) durante a geração da IA ─ */}
      <EvolutionLoader open={evolvingPlant} />

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

// Diálogo de confirmação de exclusão — tema pergaminho (padrão login)
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
      style={{ background: 'rgba(5,8,3,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="relative flex flex-col items-center text-center px-6 py-6"
        style={{
          width: 'min(88vw, 340px)',
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
          borderRadius: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Acento dourado no topo */}
        <div
          className="absolute top-0 left-6 right-6 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        <div
          className="flex items-center justify-center mb-3"
          style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(139,40,40,0.12)', border: '1px solid rgba(139,40,40,0.3)' }}
        >
          <Trash2 className="w-7 h-7" style={{ color: '#8b2828' }} />
        </div>

        <h3
          className="mb-1.5"
          style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 900, color: 'var(--color-text-dark)', letterSpacing: '0.02em' }}
        >
          Remover planta?
        </h3>
        <p
          className="mb-5"
          style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.45, color: 'var(--color-text-muted)' }}
        >
          Esta ação não pode ser desfeita. Você perderá o DNA único desta planta para sempre.
        </p>

        <div className="flex gap-2.5 w-full">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ fontFamily: 'var(--font-display)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-dark)', background: 'rgba(255,255,255,0.45)', border: '1.5px solid rgba(139,99,70,0.35)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ fontFamily: 'var(--font-display)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-parch-light)', background: 'linear-gradient(135deg, #8b2828, #5a0d0d)', border: '1px solid rgba(139,40,40,0.5)' }}
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}

