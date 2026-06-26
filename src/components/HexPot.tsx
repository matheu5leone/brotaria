'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Shovel } from 'lucide-react';
import { Pot } from '@/types';
import { usePlant, usePlantVersion } from '@/hooks/usePlantData';
import { RarityEffect } from '@/components/RarityEffect';
import Loader from './Loader';

const DIG_DURATION_MS = 60_000;

export type PotState = 'digging' | 'ready' | 'planted';

export function getPotState(pot: Pot): PotState {
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
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function HexPot({
  pot,
  isSelected,
  isStressed = false,
  moveMode = false,
  onClick,
  onPointerDown,
  onDigComplete,
}: {
  pot: Pot;
  isSelected: boolean;
  isStressed?: boolean;
  moveMode?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onDigComplete?: () => void;
}) {
  const state = getPotState(pot);
  const { data: plant } = usePlant(pot.plant_id);
  const { data: latestVersion } = usePlantVersion(pot.plant_id);
  const level = plant ? plant.current_stage.order_index + 1 : null;

  const [msLeft, setMsLeft] = useState(0);
  const notifiedRef = useRef(false);

  useEffect(() => { notifiedRef.current = false; }, [pot.digging_started_at]);

  useEffect(() => {
    if (state !== 'digging' || !pot.digging_started_at) return;
    const deadline = new Date(pot.digging_started_at).getTime() + DIG_DURATION_MS;
    const update = () => {
      const remaining = deadline - Date.now();
      setMsLeft(Math.max(0, remaining));
      if (remaining <= 0 && !notifiedRef.current) {
        notifiedRef.current = true;
        onDigComplete?.();
      }
    };
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [state, pot.digging_started_at, onDigComplete]);

  // Altura que o canteiro hexagonal ocupa no container
  const POT_HEIGHT = '82%';
  // Base da planta alinhada à superfície de terra do canteiro hex
  const PLANT_BOTTOM = '56%';

  return (
    <div
      className="relative w-full h-full select-none"
      style={{ cursor: moveMode && state === 'planted' ? 'grab' : 'pointer' }}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >

      {/* ── Plant image — flutua acima do canteiro ── */}
      {state === 'planted' && (
        <div
          className="absolute left-0 right-0 top-0 pointer-events-none"
          style={{ bottom: PLANT_BOTTOM }}
        >
          <div className="relative w-full h-full">
            {latestVersion?.image_url ? (
              <RarityEffect rarity={plant?.dna.rarity ?? 'comum'} alwaysVisible={false}>
                <Image
                  src={latestVersion.image_url}
                  alt={plant?.current_stage.name ?? 'Planta'}
                  fill
                  draggable={false}
                  className="object-contain object-bottom"
                />
              </RarityEffect>
            ) : plant && plant.current_stage.order_index > 0 ? (
              // Só mostra loading se não é o estágio inicial (enterrada não gera imagem)
              <div className="flex items-end justify-center w-full h-full pb-1">
                <Loader variant="inline" spin size={22} />
              </div>
            ) : null}
          </div>

          {/* Balão triste (stressed) */}
          {isStressed && (
            <div
              className="water-speech-bubble absolute pointer-events-none z-20 flex flex-col items-center"
              style={{ top: '-38%', left: '50%', animation: 'water-bubble 2.2s ease-in-out infinite', filter: 'drop-shadow(0 2px 5px rgba(239,68,68,0.5))' }}
            >
              <div style={{ background: 'rgba(255,240,240,0.97)', border: '1.5px solid rgba(239,68,68,0.6)', borderRadius: 8, padding: '3px 6px', fontSize: 14, lineHeight: 1, userSelect: 'none' }}>😢</div>
              <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid rgba(255,240,240,0.97)', marginTop: -1 }} />
            </div>
          )}

          {/* Balão de rega — mostra se status é waiting_water OU se o timer já passou (sem depender do cron) */}
          {!isStressed && plant && (
            plant.hydration_status === 'waiting_water' ||
            (plant.next_water_needed_at && new Date(plant.next_water_needed_at) < new Date())
          ) && (
            <div
              className="water-speech-bubble absolute pointer-events-none z-20 flex flex-col items-center"
              style={{ top: '-38%', left: '50%', animation: 'water-bubble 2.2s ease-in-out infinite', filter: 'drop-shadow(0 2px 5px rgba(59,130,246,0.5))' }}
            >
              <div style={{ background: 'rgba(239,246,255,0.97)', border: '1.5px solid rgba(96,165,250,0.75)', borderRadius: 8, padding: '3px 6px', fontSize: 14, lineHeight: 1, userSelect: 'none' }}>💧</div>
              <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid rgba(239,246,255,0.97)', marginTop: -1 }} />
            </div>
          )}
        </div>
      )}

      {/* ── Canteiro (imagem PNG) — aparece em todos os estados ── */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: POT_HEIGHT,
          filter: isSelected
            ? 'drop-shadow(0 0 10px rgba(201,162,39,0.85))'
            : undefined,
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image
            src="/imgs/empty-pot.png"
            alt="canteiro"
            fill
            className="object-contain object-bottom"
            draggable={false}
            priority
            style={{
              filter: isSelected ? 'brightness(1.2) saturate(1.3)' : undefined,
            }}
          />
        </div>

        {/* ── Conteúdo sobreposto ao canteiro ── */}
        {state === 'digging' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-0.5" style={{ paddingBottom: '18%' }}>
            <Shovel className="w-4 h-4 animate-pulse" style={{ color: '#d4b483' }} />
            <span className="font-mono text-[10px] font-bold" style={{ color: '#f2e8d5' }}>
              {formatSecondsLeft(msLeft)}
            </span>
          </div>
        )}

        {state === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-0.5" style={{ paddingBottom: '18%' }}>
            <span className="text-sm font-bold leading-none" style={{ color: 'rgba(210,165,100,0.8)' }}>+</span>
            <span className="text-[7px] uppercase tracking-widest font-black" style={{ color: 'rgba(210,165,100,0.65)', fontFamily: 'var(--font-display)' }}>
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

      {/* ── Level badge ── */}
      {state === 'planted' && level !== null && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[40%] px-1.5 py-0.5 rounded-full z-20 whitespace-nowrap pointer-events-none"
          style={{
            background: 'rgba(8,14,5,0.92)',
            color: 'var(--color-text-light)',
            fontFamily: 'var(--font-display)',
            fontSize: '7px',
            fontWeight: 900,
            border: '1px solid rgba(92,58,30,0.6)',
          }}
        >
          Nível {level}
        </div>
      )}
    </div>
  );
}
