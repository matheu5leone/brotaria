'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { Pot } from '@/types';
import { GAME } from '@/config/economy';
import { useBeeStatus, useClaimBee, useAckPolenTutorial } from '@/hooks/useBee';
import { useWallet } from '@/hooks/useWallet';
import { playSfx } from '@/lib/sfx';
import { PolenTutorial } from '@/components/PolenTutorial';
import { useBackpackFull } from '@/components/BackpackFull';

/**
 * A abelha do jardim. Aparece quando o servidor diz que há uma (cooldown de 1–3h
 * vencido), fica ativa por BEE_ACTIVE_MINUTES pousando de planta em planta, e
 * some ao ser clicada (rende 1 pólen) ou quando a janela acaba.
 *
 * O servidor é dono do ritmo: aqui é só a encenação.
 */

type Phase = 'entering' | 'landed' | 'leaving';
type Spot = { x: number; y: number };

const FLIGHT_MS = 1500;   // duração do voo entre pontos (casa com a transition)
const HOP_MS = GAME.BEE_HOP_SECONDS * 1000;
const BUZZ_MS = GAME.BEE_BUZZ_SECONDS * 1000;

export function BeeScene({ pots }: { pots: Pot[] }) {
  const { data: status } = useBeeStatus();
  const claim = useClaimBee();
  const { polenTutorialSeen } = useWallet();
  const ackTutorial = useAckPolenTutorial();
  const askBackpack = useBackpackFull();
  const [showTutorial, setShowTutorial] = useState(false);
  // Garante que o tutorial só dispare uma vez por montagem, mesmo antes de o ack
  // persistir (evita reabrir se o jogador clicar noutra abelha na mesma sessão).
  const tutorialTriggeredRef = useRef(false);

  const planted = pots.filter((p) => p.plant_id);
  const active = !!status?.active && planted.length > 0;

  const [phase, setPhase] = useState<Phase>('entering');
  const [spot, setSpot] = useState<Spot>({ x: -10, y: 20 });
  const [gone, setGone] = useState(false);
  const [polenFly, setPolenFly] = useState<{ from: Spot; to: { x: number; y: number } } | null>(null);
  const beeRef = useRef<HTMLButtonElement>(null);

  /** Sorteia uma planta para pousar (evita repetir a atual quando dá). */
  const pickSpot = useCallback((): Spot => {
    const pool = planted.length > 1
      ? planted.filter((p) => (p.pos_x ?? 50) !== spot.x || (p.pos_y ?? 50) !== spot.y)
      : planted;
    const p = pool[Math.floor(Math.random() * pool.length)] ?? planted[0];
    // Pousa um pouco acima do centro do canteiro (em cima da planta).
    return { x: p.pos_x ?? 50, y: (p.pos_y ?? 50) - 6 };
  }, [planted, spot.x, spot.y]);

  // O servidor abriu uma abelha nova (cooldown vencido OU botão dev): reencena
  // do zero. Sem isto o `gone` local ficaria travado depois da primeira abelha
  // da sessão, e o dev-spawn não traria a abelha de volta sem reload.
  useEffect(() => {
    if (status?.active) {
      setGone(false);
      setPhase('entering');
      setSpot({ x: -10, y: 20 });
    }
  }, [status?.active]);

  // Entrada: voa da borda até a primeira planta.
  useEffect(() => {
    if (!active || gone) return;
    playSfx('bee');
    const t = setTimeout(() => { setSpot(pickSpot()); setPhase('landed'); }, 60);
    return () => clearTimeout(t);
    // Só na ativação — os pulos seguintes têm o próprio efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, gone]);

  // Pula de planta em planta enquanto estiver pousada.
  useEffect(() => {
    if (!active || gone || phase !== 'landed') return;
    const id = setInterval(() => setSpot(pickSpot()), HOP_MS);
    return () => clearInterval(id);
  }, [active, gone, phase, pickSpot]);

  // Zumbido de tempos em tempos, enquanto a abelha estiver no jardim. O som da
  // ENTRADA já toca no efeito acima; este é o repique enquanto ela fica.
  useEffect(() => {
    if (!active || gone) return;
    const id = setInterval(() => playSfx('bee'), BUZZ_MS);
    return () => clearInterval(id);
  }, [active, gone]);

  // Fim da janela (o servidor manda): a abelha vai embora.
  useEffect(() => {
    if (!active || gone) return;
    const ms = status?.remainingMs ?? 0;
    if (ms <= 0) return;
    const id = setTimeout(() => { setPhase('leaving'); setSpot({ x: 110, y: -10 }); }, ms);
    return () => clearTimeout(id);
  }, [active, gone, status?.remainingMs]);

  // Terminou de sair → desmonta.
  useEffect(() => {
    if (phase !== 'leaving') return;
    const t = setTimeout(() => setGone(true), FLIGHT_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const onClick = useCallback(() => {
    if (phase !== 'landed' || claim.isPending) return;
    const rect = beeRef.current?.getBoundingClientRect();

    // Feedback INSTANTÂNEO (mesmo padrão do LikeButton no modo visitante): som,
    // pólen voando até a mochila e abelha saindo acontecem NA HORA, sem esperar
    // o banco. A request vai em seguida; a mochila reconcilia no onSuccess do hook.
    playSfx('polen');
    const bag = document.querySelector('[data-tutorial="backpack"]')?.getBoundingClientRect();
    if (rect && bag) {
      setPolenFly({
        from: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        to: { x: bag.left + bag.width / 2, y: bag.top + bag.height / 2 },
      });
      setTimeout(() => setPolenFly(null), 900);
    }
    setPhase('leaving');
    setSpot({ x: 110, y: -10 });

    // 1ª abelha da vida do jogador: coleta o pólen E abre o tutorial juntos
    // (a recompensa não fica bloqueada pelo modal).
    if (!polenTutorialSeen && !tutorialTriggeredRef.current) {
      tutorialTriggeredRef.current = true;
      setShowTutorial(true);
    }

    claim.mutate(undefined, {
      // Falha rara (mochila cheia / corrida): desfaz o visual — traz a abelha de volta.
      onError: (err: unknown) => {
        setGone(false);
        setPhase('landed');
        setSpot(pickSpot());
        // Mochila cheia: a abelha NÃO foi consumida (o service checa espaço
        // antes do CAS), então basta abrir espaço e clicar de novo — o
        // onResolved refaz a coleta pelo caminho normal.
        if ((err as { code?: string }).code === 'INVENTORY_FULL') {
          askBackpack({
            incoming: [{ item_type: 'polen' }],
            onResolved: () => { claim.mutate(); },
          });
        }
      },
    });
  }, [phase, claim, pickSpot, polenTutorialSeen, askBackpack]);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
    ackTutorial.mutate();
  }, [ackTutorial]);

  const tutorialNode = showTutorial ? <PolenTutorial onDone={closeTutorial} /> : null;

  // A abelha pode já ter ido embora (gone) e o tutorial ainda estar aberto —
  // por isso o modal é renderizado FORA da encenação da abelha.
  if (!active || gone) return <>{polenFlyNode(polenFly)}{tutorialNode}</>;

  return (
    <>
      <button
        ref={beeRef}
        onClick={onClick}
        onPointerDown={(e) => {
          // Sem isto, o pointerdown sobe até o canvas de pan/zoom do jardim
          // (Garden.tsx: handleCanvasPointerDown), que chama setPointerCapture()
          // nele mesmo. Por spec, isso RETARGETA o mouseup/click subsequente pro
          // canvas — o onClick da abelha nunca dispara (some só no desktop:
          // no touch, o navegador sintetiza o click de outro jeito). Mesmo
          // padrão já usado nos outros botões arrastáveis deste arquivo.
          e.stopPropagation();
        }}
        aria-label="Pegar o pólen da abelha"
        title={phase === 'landed' ? 'Clique para pegar o pólen' : 'A abelha está voando...'}
        className={`absolute ${phase === 'landed' ? 'bee-clickable' : ''}`}
        style={{
          left: `${spot.x}%`,
          top: `${spot.y}%`,
          transform: 'translate(-50%, -50%)',
          width: 'min(11vmin, 56px)',
          height: 'min(11vmin, 56px)',
          transition: `left ${FLIGHT_MS}ms cubic-bezier(.45,.05,.55,.95), top ${FLIGHT_MS}ms cubic-bezier(.45,.05,.55,.95)`,
          // Acima de tudo no jardim: os canteiros chegam a ~z-1000 e os efeitos
          // de terra/água (PotFx) a 999998 — a abelha voa por cima de todos.
          zIndex: 999999,
          background: 'transparent',
          cursor: phase === 'landed' ? 'pointer' : 'default',
          pointerEvents: phase === 'landed' ? 'auto' : 'none',
          // Voando não tem hover: mantém só a sombra (a classe cuida do resto).
          filter: phase === 'landed' ? undefined : 'drop-shadow(0 3px 6px rgba(0,0,0,0.45))',
          animation: phase === 'landed' ? 'bee-hover 1.8s ease-in-out infinite' : undefined,
        }}
      >
        {/* WebP animado (2 frames: asa cima/baixo) */}
        <Image src="/imgs/abelha.webp" alt="" fill className="object-contain pointer-events-none" draggable={false} unoptimized />
      </button>
      {polenFlyNode(polenFly)}
      {tutorialNode}
    </>
  );
}

/** Pólen voando da abelha até a mochila. */
function polenFlyNode(fly: { from: Spot; to: { x: number; y: number } } | null) {
  if (!fly) return null;
  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: fly.from.x, top: fly.from.y,
        width: 30, height: 30, zIndex: 999999,
        transform: 'translate(-50%, -50%)',
        animation: 'polen-fly 0.9s cubic-bezier(.4,0,.6,1) forwards',
        ['--fly-dx' as string]: `${fly.to.x - fly.from.x}px`,
        ['--fly-dy' as string]: `${fly.to.y - fly.from.y}px`,
      }}
    >
      <Image src="/imgs/polen.webp" alt="" width={30} height={30} className="object-contain" draggable={false} />
    </div>
  );
}
