'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { UPGRADE_TREE, type UpgradeCategoryId } from '@/config/upgrades';
import { trackView, type NodeView } from '@/lib/upgradeTree';
import { UpgradeNode } from '@/components/upgrades/UpgradeNode';
import { UpgradeInfo } from '@/components/upgrades/UpgradeInfo';
import { useWaterUpgrades, useBuyWaterUpgrade } from '@/hooks/useWaterUpgrades';
import { useWallet } from '@/hooks/useWallet';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { HerboIcon } from '@/components/HerboIcon';

const ROOT_R = 132;   // distância do centro (poço) até o 1º nó
const NODE_GAP = 98;  // distância entre nós ao longo da trilha
const HEX = 64;       // tamanho do hexágono (igual ao UpgradeNode)
const PAN_LIMIT = 900;

/**
 * Árvore de upgrades como CANVAS em tela cheia (não é modal): substitui a cena
 * do poço. Layout radial — o poço no centro, cada trilha irradia num ângulo,
 * e o usuário arrasta (pan) para explorar. Cresce para todos os lados conforme
 * novas trilhas/categorias entrarem.
 */
export function UpgradeCanvas({ categoryId, onClose }: { categoryId: UpgradeCategoryId; onClose: () => void }) {
  const category = UPGRADE_TREE[categoryId];
  const { data } = useWaterUpgrades();
  const { herbo: walletHerbo } = useWallet();
  const buy = useBuyWaterUpgrade();
  const isMobile = !useIsDesktop();

  const herbo = data?.herbo ?? walletHerbo ?? 0;
  const levels: Record<string, number> = {
    water_capacity: data?.capacityLevel ?? 0,
    water_bonus: data?.bonusLevel ?? 0,
  };

  const [justBought, setJustBought] = useState<{ trackId: string; level: number } | null>(null);
  const [infoNode, setInfoNode] = useState<{ trackId: string; node: NodeView } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // ── Pan (arrastar) ─────────────────────────────────────────────────────────
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const drag = useRef<{ id: number; startX: number; startY: number; panX: number; panY: number } | null>(null);
  const moved = useRef(false);

  const clamp = (v: number) => Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, v));

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Não faz pan se o toque começou num nó (deixa o clique do nó agir).
    if ((e.target as HTMLElement).closest('[data-upg-node]')) return;
    drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
    moved.current = false;
    try { (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true;
    if (!moved.current) return;
    const next = { x: clamp(drag.current.panX + dx), y: clamp(drag.current.panY + dy) };
    panRef.current = next;
    setPan(next);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  }, []);

  if (!category) return null;

  const doBuy = (trackId: string) => {
    setPendingId(trackId);
    const targetLevel = (levels[trackId] ?? 0) + 1;
    buy.mutate(trackId, {
      onSuccess: () => {
        setJustBought({ trackId, level: targetLevel });
        setTimeout(() => setJustBought(null), 600);
        setInfoNode(null);
      },
      onSettled: () => setPendingId(null),
    });
  };

  const trackCount = category.tracks.length;

  return (
    <div
      className="absolute inset-0 z-30 overflow-hidden select-none"
      style={{
        background: 'radial-gradient(circle at 50% 45%, #2f4128 0%, #1b2712 60%, #121a0c 100%)',
        touchAction: 'none',
        cursor: 'grab',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Camada "mundo": origem (0,0) no centro da tela + deslocamento do pan. */}
      <div className="absolute" style={{ left: '50%', top: '50%', width: 0, height: 0, transform: `translate(${pan.x}px, ${pan.y}px)` }}>
        {/* Trilhas (radiais) */}
        {category.tracks.map((track, ti) => {
          const angleDeg = 180 + (ti * 360) / trackCount; // 2 trilhas → 180°(esq) e 0°(dir)
          const rad = (angleDeg * Math.PI) / 180;
          const ux = Math.cos(rad);
          const uy = Math.sin(rad);
          const ownedLevel = levels[track.id] ?? 0;
          const { nodes, hasFog } = trackView(track, ownedLevel, herbo);
          const visible = nodes.filter((n) => n.status !== 'fog');

          const distAt = (j: number) => ROOT_R + j * NODE_GAP;

          // Conectores: raiz→nó0 e entre nós visíveis consecutivos.
          const connectors: { from: number; to: number; filled: boolean }[] = [];
          connectors.push({ from: HEX * 0.4, to: distAt(0) - HEX / 2, filled: ownedLevel >= 1 });
          for (let j = 1; j < visible.length; j++) {
            connectors.push({ from: distAt(j - 1) + HEX / 2, to: distAt(j) - HEX / 2, filled: visible[j].level - 1 <= ownedLevel });
          }
          if (hasFog) {
            const fogDist = ROOT_R + visible.length * NODE_GAP;
            connectors.push({ from: distAt(visible.length - 1) + HEX / 2, to: fogDist - 22, filled: false });
          }

          return (
            <div key={track.id}>
              {connectors.map((c, ci) => {
                const mid = (c.from + c.to) / 2;
                const len = Math.max(0, c.to - c.from);
                return (
                  <div
                    key={ci}
                    className="upg-conn-h"
                    style={{
                      left: ux * mid, top: uy * mid, width: len, height: 6,
                      transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
                    }}
                  >
                    <div className={`upg-conn-h-fill ${c.filled ? 'filled' : ''}`} style={{ transform: c.filled ? 'scaleX(1)' : 'scaleX(0)' }} />
                  </div>
                );
              })}

              {/* Nós visíveis */}
              {visible.map((node, j) => {
                const d = distAt(j);
                return (
                  <div key={node.level} data-upg-node className="absolute upg-grow-in" style={{ left: ux * d, top: uy * d, transform: 'translate(-50%, -50%)' }}>
                    <UpgradeNode
                      node={node}
                      trackName={track.name}
                      isMobile={isMobile}
                      onBuy={() => doBuy(track.id)}
                      pending={pendingId === track.id}
                      onRequestInfo={(n) => setInfoNode({ trackId: track.id, node: n })}
                      justBought={justBought?.trackId === track.id && justBought.level === node.level}
                    />
                  </div>
                );
              })}

              {/* Tampa de névoa (há mais níveis) */}
              {hasFog && (
                <div
                  className="absolute flex items-center justify-center rounded-xl"
                  style={{
                    left: ux * (ROOT_R + visible.length * NODE_GAP), top: uy * (ROOT_R + visible.length * NODE_GAP),
                    transform: 'translate(-50%, -50%)', width: 44, height: 44,
                    background: 'rgba(0,0,0,0.35)', border: '1.5px dashed rgba(217,240,200,0.35)',
                    color: 'rgba(217,240,200,0.6)', fontFamily: 'var(--font-display)', fontWeight: 900,
                  }}
                >
                  ?
                </div>
              )}

              {/* Rótulo do ramo (nível X/N) perto do 1º nó */}
              <div
                className="absolute text-center whitespace-nowrap"
                style={{ left: ux * (ROOT_R - 34), top: uy * (ROOT_R - 34) - 44, transform: 'translate(-50%, -50%)' }}
              >
                <span className="text-[11px] font-black" style={{ fontFamily: 'var(--font-display)', color: '#d9f0c8', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                  {track.name} {ownedLevel}/{track.levels.length}
                </span>
              </div>
            </div>
          );
        })}

        {/* Root — o poço, no centro */}
        <div className="absolute upg-grow-in flex flex-col items-center" style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}>
          <div className="rounded-full p-3" style={{ background: 'rgba(96,165,250,0.14)', border: '2px solid rgba(96,165,250,0.5)', boxShadow: '0 0 30px rgba(96,165,250,0.35)' }}>
            <Image src={category.rootIcon} alt={category.name} width={72} height={72} className="object-contain" draggable={false} />
          </div>
        </div>
      </div>

      {/* ── Overlay fixo (não sofre pan) ─────────────────────────────────────── */}
      <button
        onClick={onClose}
        aria-label="Voltar ao poço"
        className="absolute top-4 left-4 z-40 flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-sm transition-all active:scale-95"
        style={{ fontFamily: 'var(--font-display)', color: '#d9f0c8', background: 'rgba(8,14,5,0.72)', border: '1px solid rgba(217,240,200,0.3)', backdropFilter: 'blur(6px)' }}
      >
        <ArrowLeft className="w-4 h-4" /> Poço
      </button>

      <div
        key={herbo}
        className="count-pop absolute top-4 right-4 z-40 flex items-center gap-1.5 px-3 py-2 rounded-xl"
        style={{ background: 'rgba(8,14,5,0.72)', border: '1px solid rgba(74,222,128,0.4)', backdropFilter: 'blur(6px)' }}
      >
        <HerboIcon size={18} />
        <span className="font-black text-base leading-none" style={{ fontFamily: 'var(--font-display)', color: '#d9f0c8' }}>{herbo}</span>
      </div>

      <p
        className="absolute bottom-4 inset-x-0 z-40 text-center text-[11px] px-6 pointer-events-none"
        style={{ color: 'rgba(217,240,200,0.5)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}
      >
        Arraste para explorar a árvore de melhorias
      </p>

      {buy.isError && (
        <p className="absolute bottom-10 inset-x-0 z-40 text-center text-xs font-bold px-6" style={{ color: '#fca5a5', fontFamily: 'var(--font-display)' }}>
          {(buy.error as Error)?.message ?? 'Não foi possível comprar.'}
        </p>
      )}

      {/* Bottom sheet de info (mobile) */}
      {isMobile && infoNode && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(5,8,3,0.5)' }} onClick={() => setInfoNode(null)}>
          <div
            className="w-full rounded-t-3xl p-5 pt-6"
            style={{ background: 'var(--color-parch-light)', border: '1.5px solid var(--color-wood-light)', boxShadow: '0 -20px 60px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <UpgradeInfo
              trackName={category.tracks.find((t) => t.id === infoNode.trackId)?.name ?? ''}
              node={infoNode.node}
              onBuy={() => doBuy(infoNode.trackId)}
              pending={pendingId === infoNode.trackId}
              canBuy={infoNode.node.affordable}
            />
          </div>
        </div>
      )}
    </div>
  );
}
