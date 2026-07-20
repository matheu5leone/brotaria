'use client';

import { useCallback, useRef, useState } from 'react';
import { UPGRADE_TREE, type UpgradeCategoryId } from '@/config/upgrades';
import { trackView, type NodeView } from '@/lib/upgradeTree';
import { UpgradeNode } from '@/components/upgrades/UpgradeNode';
import { UpgradeInfo } from '@/components/upgrades/UpgradeInfo';
import { useWaterUpgrades, useBuyWaterUpgrade } from '@/hooks/useWaterUpgrades';
import { useWallet } from '@/hooks/useWallet';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { HerboIcon } from '@/components/HerboIcon';

const ROOT_R = 132;   // distância do centro (orbe) até o 1º nó
const NODE_GAP = 98;  // distância entre nós ao longo da trilha
const PAN_LIMIT = 900;

/**
 * Árvore de upgrades como CANVAS em tela cheia (não é modal): substitui a cena
 * do poço. Layout radial — um orbe de água no centro, cada trilha irradia num
 * ângulo, conectores azuis passam ATRÁS dos hexágonos, e o usuário arrasta (pan)
 * para explorar. Só o próximo nível comprável aparece à frente dos comprados
 * (sem slot "?"). Fechar a tela é pelo botão flutuante (toggle no /agua).
 */
export function UpgradeCanvas({ categoryId }: { categoryId: UpgradeCategoryId }) {
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
    if ((e.target as HTMLElement).closest('[data-upg-node]')) return; // deixa o clique do nó agir
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
          const { nodes } = trackView(track, ownedLevel, herbo);
          const visible = nodes.filter((n) => n.status !== 'fog');

          const distAt = (j: number) => ROOT_R + j * NODE_GAP;

          // Conectores CONTÍNUOS (centro→centro) que passam ATRÁS dos nós (z abaixo).
          // Aceso até o nível comprado; o trecho até o próximo nível fica apagado.
          const segments: { from: number; to: number; bright: boolean }[] = [
            { from: 0, to: distAt(0), bright: ownedLevel >= 1 },
          ];
          for (let j = 1; j < visible.length; j++) {
            segments.push({ from: distAt(j - 1), to: distAt(j), bright: visible[j].level <= ownedLevel });
          }
          const surge = justBought?.trackId === track.id;

          return (
            <div key={track.id}>
              {/* Conectores — linha azul sólida, z abaixo dos nós */}
              {segments.map((c, ci) => {
                const mid = (c.from + c.to) / 2;
                const len = Math.max(0, c.to - c.from);
                return (
                  <div
                    key={ci}
                    className={`upg-conn ${c.bright ? '' : 'dim'} ${c.bright && surge ? 'surge' : ''}`}
                    style={{
                      left: ux * mid, top: uy * mid, width: len, height: 9,
                      transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
                      zIndex: 1,
                    }}
                  />
                );
              })}

              {/* Nós visíveis (comprados + o próximo) — z acima dos conectores */}
              {visible.map((node, j) => {
                const d = distAt(j);
                return (
                  // Posicionamento (translate de centralização) fica NO DE FORA e a
                  // animação de entrada NO DE DENTRO: um `transform` animado
                  // sobrescreveria o translate e descentralizaria o hexágono.
                  <div key={node.level} data-upg-node className="absolute" style={{ left: ux * d, top: uy * d, transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                    <div className="upg-grow-in">
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
                  </div>
                );
              })}

              {/* Rótulo do ramo (nível X/N) acima do 1º nó */}
              <div
                className="absolute text-center whitespace-nowrap"
                style={{ left: ux * (ROOT_R - 34), top: uy * (ROOT_R - 34) - 44, transform: 'translate(-50%, -50%)', zIndex: 2 }}
              >
                <span className="text-[11px] font-black" style={{ fontFamily: 'var(--font-display)', color: '#d9f0c8', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                  {track.name} {ownedLevel}/{track.levels.length}
                </span>
              </div>
            </div>
          );
        })}

        {/* Orbe de água no centro (âncora do meio) */}
        <div className="absolute" style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)', zIndex: 3 }}>
          <div
            className="upg-orb-breathe"
            style={{
              width: 78, height: 78, borderRadius: '50%',
              background: 'radial-gradient(circle at 50% 32%, #bfe3ff 0%, #60a5fa 44%, #2563eb 76%, #1e40af 100%)',
              border: '2px solid rgba(191,227,255,0.85)',
              boxShadow: '0 0 36px rgba(96,165,250,0.65), inset 0 -9px 16px rgba(0,0,0,0.35), inset 0 7px 13px rgba(255,255,255,0.5)',
            }}
          />
        </div>
      </div>

      {/* ── Overlay fixo (não sofre pan) ─────────────────────────────────────── */}
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

      {/* Bottom sheet de info (mobile) — inclui nós já comprados */}
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
              owned={infoNode.node.status === 'owned'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
