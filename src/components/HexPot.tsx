'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Pot } from '@/types';
import { usePlant, usePlantVersion } from '@/hooks/usePlantData';
import { RarityEffect } from '@/components/RarityEffect';
import { lifecycleFromOrder } from '@/config/lifecycle';
import { POT_IMG_HEIGHT_PCT, PLANT_ANCHOR_PCT } from '@/lib/potGeometry';
import Loader from './Loader';

/** Canteiros cavados antes do redesign da pá não têm duração gravada. */
const LEGACY_DIG_DURATION_MS = 60_000;

export const digDurationOf = (pot: Pot): number =>
  pot.dig_duration_ms ?? LEGACY_DIG_DURATION_MS;

/**
 * Torrões de terra da obra. Determinísticos e constantes de módulo (mesmo padrão
 * do WaterOverflowFx): nada de Math.random em render, senão as partículas
 * "pulariam" de lugar a cada re-render do canteiro.
 *
 * `delay` negativo faz o CSS entrar com a animação JÁ em andamento — os torrões
 * saem espalhados dentro do mesmo golpe, em vez de todos no mesmo instante.
 */
const DIG_DIRT = [
  { dx: '-13px', dy: '-11px', size: 3.5, delay: '0s',     color: '#6b4423' },
  { dx: '-8px',  dy: '-15px', size: 2.5, delay: '-0.04s', color: '#8a5a2b' },
  { dx: '-16px', dy: '-6px',  size: 2,   delay: '-0.07s', color: '#4a2e18' },
  { dx: '9px',   dy: '-13px', size: 3,   delay: '-0.02s', color: '#5c3a1e' },
  { dx: '14px',  dy: '-8px',  size: 2.5, delay: '-0.06s', color: '#6b4423' },
  { dx: '4px',   dy: '-17px', size: 2,   delay: '-0.09s', color: '#8a5a2b' },
] as const;

export type PotState = 'digging' | 'ready' | 'planted';

export function getPotState(pot: Pot): PotState {
  if (pot.plant_id) return 'planted';
  if (pot.digging_started_at) {
    const elapsed = Date.now() - new Date(pot.digging_started_at).getTime();
    if (elapsed < digDurationOf(pot)) return 'digging';
  }
  return 'ready';
}

/**
 * Contagem regressiva da obra. A escala vai de 1 minuto a 7 dias, então o
 * formato muda com a grandeza: `m:ss` só faz sentido nos minutos finais.
 */
export function formatDigLeft(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s >= 86400) return `${Math.ceil(s / 86400)}d`;
  if (s >= 3600)  return `${Math.ceil(s / 3600)}h`;
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function HexPot({
  pot,
  isSelected,
  isStressed = false,
  moveMode = false,
  isWaterTarget = false,
  isMoveTarget = false,
  isTrashTarget = false,
  isSeedTarget = false,
  isElixirTarget = false,
  isPlanting = false,
  hideStatusBalloons = false,
  rushCost = null,
  onRush,
  onClick,
  onPointerDown,
  onDigComplete,
}: {
  pot: Pot;
  isSelected: boolean;
  isStressed?: boolean;
  moveMode?: boolean;
  isWaterTarget?: boolean;
  isMoveTarget?: boolean;
  isTrashTarget?: boolean;
  isSeedTarget?: boolean;
  isElixirTarget?: boolean;
  isPlanting?: boolean;
  /** Esconde os balões de sede/estresse do DONO (usado na visita a outro jardim,
   *  onde só a planta que pede ajuda ao vizinho deve exibir balão). */
  hideStatusBalloons?: boolean;
  /** Moedas para apressar esta obra, ou null se a faixa não tem atalho. */
  rushCost?: number | null;
  onRush?: () => void;
  onClick: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onDigComplete?: () => void;
}) {
  const state = getPotState(pot);
  const { data: plant } = usePlant(pot.plant_id);
  const { data: latestVersion } = usePlantVersion(pot.plant_id);
  const stageName = plant ? lifecycleFromOrder(plant.current_stage.order_index).name : null;

  const [msLeft, setMsLeft] = useState(0);
  const notifiedRef = useRef(false);

  useEffect(() => { notifiedRef.current = false; }, [pot.digging_started_at]);

  useEffect(() => {
    if (state !== 'digging' || !pot.digging_started_at) return;
    const deadline = new Date(pot.digging_started_at).getTime() + digDurationOf(pot);
    const update = () => {
      const remaining = deadline - Date.now();
      setMsLeft(Math.max(0, remaining));
      if (remaining <= 0 && !notifiedRef.current) {
        notifiedRef.current = true;
        onDigComplete?.();
      }
    };
    update();
    // Obras longas (5h/24h/7d) não precisam de tique de 250ms: o mostrador só
    // muda de hora em hora. Poupa trabalho à toa em canteiros parados.
    const id = setInterval(update, deadline - Date.now() > 3_600_000 ? 30_000 : 250);
    return () => clearInterval(id);
  }, [state, pot, onDigComplete]);

  // Tile de terra hexagonal — imagem landscape em container portrait
  const POT_HEIGHT = `${POT_IMG_HEIGHT_PCT * 100}%`;
  // PLANT_BOTTOM = centro visual do tile: a base da planta brota do meio da terra
  const PLANT_BOTTOM = `${PLANT_ANCHOR_PCT * 100}%`;
  // BALLOON_BOTTOM = 48%: balão flutua logo acima do topo do tile
  const BALLOON_BOTTOM = '48%';

  // Escala visual da planta por categoria de estágio (renderização no HexPot)
  // broto (jovem) 0.375 · pequena 0.75 · media 1.0 · grande 1.25
  const stageCode = plant?.current_stage.code ?? '';
  const plantScale =
    stageCode.startsWith('grande')  ? 1.25  :
    stageCode.startsWith('media')   ? 1.0   :
    stageCode.startsWith('pequena') ? 0.75  :
    0.375; // broto/jovem (−25% do 0.5 anterior) e fallback

  // Glow seguindo a silhueta real das imagens (drop-shadow respeita o alpha do PNG).
  // Aplicado tanto ao canteiro quanto à planta para realçar o hitbox exato.
  const waterGlow = 'drop-shadow(0 0 4px rgba(59,130,246,0.95)) drop-shadow(0 0 9px rgba(59,130,246,0.85))';
  const moveGlow  = 'drop-shadow(0 0 4px rgba(251,191,36,0.95)) drop-shadow(0 0 9px rgba(251,191,36,0.85))';
  const trashGlow = 'drop-shadow(0 0 4px rgba(239,68,68,0.95)) drop-shadow(0 0 9px rgba(239,68,68,0.85))';
  const seedGlow  = 'drop-shadow(0 0 4px rgba(74,222,128,0.95)) drop-shadow(0 0 9px rgba(74,222,128,0.85))';
  const elixirGlow = 'drop-shadow(0 0 4px rgba(201,162,39,0.95)) drop-shadow(0 0 9px rgba(201,162,39,0.85))';
  const selectGlow = 'drop-shadow(0 0 10px rgba(201,162,39,0.85))';
  const targetGlow = isWaterTarget ? waterGlow : isMoveTarget ? moveGlow : isTrashTarget ? trashGlow : isSeedTarget ? seedGlow : isElixirTarget ? elixirGlow : undefined;
  // Glow do canteiro: alvo (água/mover) tem prioridade sobre seleção
  const potGlow = targetGlow ?? (isSelected ? selectGlow : undefined);

  // Hitbox preciso: tile (silhueta hexagonal do footprint) + coluna central da planta.
  // clip-path recorta os cantos vazios → não invade o hitbox do pot vizinho.
  // Segue POT_FOOTPRINT (potGeometry): coluna 37–63% da planta + hexágono do tile.
  const HITBOX_CLIP =
    'polygon(37% 8%, 63% 8%, 63% 62%, 90.4% 69.3%, 95.3% 85.6%, 86.8% 89.6%, 50% 97.1%, 10.1% 89.1%, 5.1% 86%, 9.2% 69.2%, 37% 62%)';

  return (
    <div className="relative w-full h-full select-none" style={{ pointerEvents: 'none' }}>
      {/* Hitbox clicável recortado na silhueta (canteiro + coluna da planta) */}
      <div
        data-pot-id={pot.id}
        className="absolute inset-0 z-30"
        style={{
          pointerEvents: 'auto',
          clipPath: HITBOX_CLIP,
          cursor: moveMode && state === 'planted' ? 'grab' : 'pointer',
        }}
        onClick={onClick}
        // Impede o canvas (ancestral) de capturar o ponteiro e "roubar" o clique
        // no desktop (mouse + setPointerCapture manda o click pro canvas).
        onPointerDown={(e) => { e.stopPropagation(); onPointerDown?.(e); }}
      />

      {/* ── Plant image — fica NA FRENTE do canteiro (z-10) ── */}
      {state === 'planted' && (
        <div
          className="absolute left-0 right-0 top-0 pointer-events-none z-10"
          style={{ bottom: PLANT_BOTTOM }}
        >
          <div
            className="hex-plant-img relative w-full h-full"
            style={{
              filter: targetGlow,
              transition: 'filter 0.12s ease',
              transform: `scale(${plantScale})`,
              transformOrigin: 'bottom center',
            }}
          >
            {latestVersion?.image_url ? (
              <RarityEffect rarity={plant?.dna.rarity ?? 'comum'} alwaysVisible={false}>
                <Image
                  src={latestVersion.image_url}
                  alt={plant?.current_stage.name ?? 'Planta'}
                  fill
                  draggable={false}
                  className="object-contain object-bottom"
                  quality={90}
                  sizes="(max-width: 768px) 60vw, 22vw"
                />
              </RarityEffect>
            ) : plant && plant.current_stage.order_index > 2 ? (
              // Loading só a partir do 4º estágio (broto em diante gera imagem via IA)
              <div className="flex items-end justify-center w-full h-full pb-1">
                <Loader variant="inline" spin size={22} />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Apressar a obra — só nas faixas longas (24h / 7 dias). Fica acima do
          canteiro, com pointerEvents próprio: o hitbox do canteiro não deve
          engolir este clique. */}
      {state === 'digging' && rushCost != null && onRush && (
        <button
          className="absolute z-30 flex items-center gap-1 px-2 py-1 rounded-full whitespace-nowrap transition-transform active:scale-90"
          style={{
            bottom: BALLOON_BOTTOM,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
            background: 'rgba(8,14,5,0.92)',
            border: '1px solid rgba(201,162,39,0.55)',
            color: 'var(--color-gold)',
            fontFamily: 'var(--font-display)',
            fontSize: 9,
            fontWeight: 900,
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            touchAction: 'manipulation',
          }}
          onClick={(e) => { e.stopPropagation(); onRush(); }}
          onPointerDown={(e) => e.stopPropagation()}
          title={`Terminar agora por ${rushCost} moedas`}
        >
          ⏩ {rushCost} 🪙
        </button>
      )}

      {/* ── Balões de status — ancorados ACIMA do canteiro (não na planta) ── */}
      {state === 'planted' && isStressed && !hideStatusBalloons && (
        <div
          className="water-speech-bubble absolute pointer-events-none z-20 flex flex-col items-center"
          style={{ bottom: BALLOON_BOTTOM, left: '50%', transform: 'translateX(-50%)', animation: 'water-bubble 2.2s ease-in-out infinite', filter: 'drop-shadow(0 2px 5px rgba(239,68,68,0.5))' }}
        >
          <div style={{ background: 'rgba(255,240,240,0.97)', border: '1.5px solid rgba(239,68,68,0.6)', borderRadius: 8, padding: '3px 6px', fontSize: 14, lineHeight: 1, userSelect: 'none' }}>😢</div>
          <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid rgba(255,240,240,0.97)', marginTop: -1 }} />
        </div>
      )}

      {state === 'planted' && !isStressed && !hideStatusBalloons && plant && (
        plant.hydration_status === 'waiting_water' ||
        (plant.next_water_needed_at && new Date(plant.next_water_needed_at) < new Date())
      ) && (
        <div
          className="water-speech-bubble absolute pointer-events-none z-20 flex flex-col items-center"
          style={{ bottom: BALLOON_BOTTOM, left: '50%', transform: 'translateX(-50%)', animation: 'water-bubble 2.2s ease-in-out infinite', filter: 'drop-shadow(0 2px 5px rgba(59,130,246,0.5))' }}
        >
          <div style={{ background: 'rgba(239,246,255,0.97)', border: '1.5px solid rgba(96,165,250,0.75)', borderRadius: 8, padding: '3px 6px', fontSize: 14, lineHeight: 1, userSelect: 'none' }}>💧</div>
          <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid rgba(239,246,255,0.97)', marginTop: -1 }} />
        </div>
      )}

      {/* ── Canteiro (imagem PNG) — z-0, fica ATRÁS da planta ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 pointer-events-none z-0${isPlanting ? ' pot-squash' : ''}`}
        style={{
          height: POT_HEIGHT,
          filter: potGlow,
          transition: 'filter 0.12s ease',
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image
            src="/imgs/hexpot.webp"
            alt="canteiro"
            fill
            className="object-contain object-bottom"
            draggable={false}
            priority
            quality={90}
            sizes="(max-width: 768px) 60vw, 22vw"
            style={{
              filter: isSeedTarget
                ? 'brightness(1.3) saturate(1.5)'
                : isSelected ? 'brightness(1.2) saturate(1.3)' : undefined,
            }}
          />
        </div>

        {/* ── Conteúdo sobreposto ao canteiro ── */}
        {state === 'digging' && (
          <>
            {/* A pá cava NA TERRA, não no ar: ancorada perto da base do tile, que
                é onde o hexágono de terra aparece (a imagem é object-bottom).
                É a MESMA arte da pá da barra de ferramentas, só girada por CSS —
                o jogador reconhece a ferramenta dele trabalhando. */}
            <div
              className="absolute left-1/2 z-10 pointer-events-none"
              style={{ bottom: '14%', width: '40%', aspectRatio: '1 / 1', transform: 'translateX(-42%)' }}
            >
              <div className="dig-shovel absolute inset-0">
                <Image src="/imgs/shovel.webp" alt="cavando" fill className="object-contain" draggable={false} />
              </div>

              {/* Terra jogada a cada golpe, saindo da ponta da pá */}
              {DIG_DIRT.map((d, i) => (
                <span
                  key={i}
                  className="dig-dirt absolute rounded-full"
                  style={{
                    left: '38%',
                    top: '72%',
                    width: d.size,
                    height: d.size,
                    background: d.color,
                    animationDelay: d.delay,
                    ['--dx' as string]: d.dx,
                    ['--dy' as string]: d.dy,
                  }}
                />
              ))}
            </div>

            {/* Contador no topo do tile, fora do caminho da pá */}
            <div className="absolute inset-x-0 z-20 flex justify-center pointer-events-none" style={{ top: '6%' }}>
              <span
                className="font-mono text-[10px] font-bold px-1 rounded"
                style={{ color: '#f2e8d5', background: 'rgba(8,14,5,0.55)' }}
              >
                {formatDigLeft(msLeft)}
              </span>
            </div>
          </>
        )}

        {state === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-0.5" style={{ paddingBottom: '20.5%' }}>
            <span
              className="text-sm font-bold leading-none transition-transform"
              style={{ color: isSeedTarget ? '#4ade80' : 'rgba(210,165,100,0.8)', transform: isSeedTarget ? 'scale(1.4)' : 'scale(1)' }}
            >+</span>
            <span
              className="text-[7px] uppercase tracking-widest font-black"
              style={{ color: isSeedTarget ? '#4ade80' : 'rgba(210,165,100,0.65)', fontFamily: 'var(--font-display)' }}
            >
              Plantar
            </span>
          </div>
        )}
      </div>

      {/* Move mode: glow âmbar */}
      {moveMode && state === 'planted' && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{ background: 'rgba(251,191,36,0.15)', filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.6))' }}
        />
      )}

      {/* ── Badge do estágio ── */}
      {state === 'planted' && stageName !== null && (
        <div
          className="absolute bottom-[6%] left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full z-20 whitespace-nowrap pointer-events-none"
          style={{
            background: 'rgba(8,14,5,0.92)',
            color: 'var(--color-text-light)',
            fontFamily: 'var(--font-display)',
            fontSize: '7px',
            fontWeight: 900,
            border: '1px solid rgba(92,58,30,0.6)',
          }}
        >
          {stageName}
        </div>
      )}
    </div>
  );
}
