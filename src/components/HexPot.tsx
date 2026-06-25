'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Shovel } from 'lucide-react';
import { Pot } from '@/types';
import { usePlant, usePlantVersion } from '@/hooks/usePlantData';
import { RarityEffect } from '@/components/RarityEffect';
import Loader from './Loader';

const DIG_DURATION_MS = 60_000;
const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

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

// Hex soil base — shared between states
function HexSoil({ borderColor, innerBg, children }: {
  borderColor: string;
  innerBg: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0" style={{ height: '52%' }}>
      {/* Border */}
      <div className="absolute inset-0" style={{ clipPath: HEX_CLIP, background: borderColor }} />
      {/* Content */}
      <div className="absolute inset-[2px]" style={{ clipPath: HEX_CLIP, background: innerBg }}>
        {children}
      </div>
    </div>
  );
}

export function HexPot({
  pot,
  isSelected,
  onClick,
  onDigComplete,
}: {
  pot: Pot;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
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

  const borderColor = isSelected
    ? 'rgba(201,162,39,0.95)'
    : 'rgba(60,38,18,0.85)';

  const soilBg = 'radial-gradient(ellipse at 40% 30%, #2a1c0f, #0f0905)';

  return (
    <div
      className="relative w-full h-full cursor-pointer select-none"
      onClick={onClick}
    >

      {/* ── Plant image — floats above the hex soil ── */}
      {state === 'planted' && (
        <div
          className="absolute left-0 right-0 top-0 pointer-events-none"
          style={{ bottom: '38%' }}
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
            ) : (
              <div className="flex items-end justify-center w-full h-full pb-1">
                <Loader variant="inline" spin size={22} />
              </div>
            )}
          </div>
          {/* Hydration dot */}
          {plant?.hydration_status === 'waiting_water' && (
            <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse z-10" />
          )}
        </div>
      )}

      {/* ── Hex soil base ── */}
      {state === 'planted' && (
        <HexSoil borderColor={borderColor} innerBg={soilBg} />
      )}

      {state === 'digging' && (
        <HexSoil borderColor={borderColor} innerBg="radial-gradient(ellipse, #3d2a18, #1a0f05)">
          <div className="w-full h-full flex flex-col items-center justify-center gap-0.5">
            <Shovel className="w-4 h-4 animate-pulse" style={{ color: 'var(--color-parch-dark)' }} />
            <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--color-parch-light)' }}>
              {formatSecondsLeft(msLeft)}
            </span>
          </div>
        </HexSoil>
      )}

      {state === 'ready' && (
        <HexSoil borderColor={borderColor} innerBg="radial-gradient(ellipse at 40% 30%, #1c1408, #080603)">
          <div className="w-full h-full flex flex-col items-center justify-center gap-0.5">
            <span className="text-base font-bold leading-none" style={{ color: 'rgba(139,99,70,0.55)' }}>+</span>
            <span
              className="text-[7px] uppercase tracking-widest font-black"
              style={{ color: 'rgba(139,99,70,0.45)', fontFamily: 'var(--font-display)' }}
            >
              Plantar
            </span>
          </div>
        </HexSoil>
      )}

      {/* ── Selection glow on the soil hex ── */}
      {isSelected && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
          style={{ height: '52%', clipPath: HEX_CLIP, boxShadow: 'inset 0 0 0 2px rgba(201,162,39,0.8)' }}
        />
      )}

      {/* ── Level badge ── */}
      {state === 'planted' && level !== null && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[45%] px-1.5 py-0.5 rounded-full z-20 whitespace-nowrap pointer-events-none"
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
