'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  useGnomeStatus,
  useGnomeUnlock,
  useGnomeWake,
  useGnomeCollect,
} from '@/hooks/useGnome';

const SPRITE = {
  chapeu: '/imgs/pablo/chapeu-pablo.webp',
  chapeuJogado: '/imgs/pablo/chapeu-jogado.webp',
  emPe: '/imgs/pablo/pablo-em-pe.webp',
  dormindo: '/imgs/pablo/pablo-dormindo.webp',
  balde: '/imgs/pablo/balde-cheio.webp',
  dialogo: '/imgs/pablo/pablo-dialogo.webp',
  nervoso: '/imgs/pablo/pablo-dialogo-nervoso.webp',
} as const;

function fmtCd(ms: number): string {
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min`;
}

// Falas da cutscene de apresentação — voz do Pablo (pleonasmo redundante).
const CUTSCENE: { text: string; nervoso?: boolean }[] = [
  { text: '(bocejo) Ãaah... quem me acordou do meu sono soneca?', nervoso: true },
  { text: 'Eu sou o Pablo, gnomo gnômico. Fugi da sociedade trabalhadeira dos gnomos — trabalho é trabalhoso demais pro meu gosto gostoso.' },
  { text: 'Meu lance é cultivar cogumelo cogumeloso e dormir esperando eles crescerem crescidos pra eu comer.' },
  { text: 'Mas você me pagou com uma estrela estrelada... tá bom. Todo dia eu encho um balde baldoso de água molhada pra você. É só me acordar — e pegar o balde, seu boboca bobalho!' },
];

type Balloon = { text: string; nervoso?: boolean };

export function PabloScene() {
  const statusQuery = useGnomeStatus();
  const st = statusQuery.data;
  const unlock = useGnomeUnlock();
  const wake = useGnomeWake();
  const collect = useGnomeCollect();

  const [balloon, setBalloon] = useState<Balloon | null>(null);
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const [cutsceneStep, setCutsceneStep] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Relógio p/ o countdown do estado "awake".
  useEffect(() => {
    if (st?.state !== 'awake') return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [st?.state]);

  // Auto-dismiss do balão.
  useEffect(() => {
    if (!balloon) return;
    const id = setTimeout(() => setBalloon(null), 4000);
    return () => clearTimeout(id);
  }, [balloon]);

  const showBalloon = useCallback((text: string, nervoso = false) => setBalloon({ text, nervoso }), []);

  if (!st) return null;

  const cdEnd = st.cooldownRemainingMs ? statusQuery.dataUpdatedAt + st.cooldownRemainingMs : 0;
  const remaining = Math.max(0, cdEnd - now);

  const onPablo = () => {
    switch (st.state) {
      case 'locked':
        setConfirmUnlock(true);
        break;
      case 'awake':
        showBalloon(`volta em ${fmtCd(remaining)}, tô no meu sono soneca.`);
        break;
      case 'holding_water':
        showBalloon('eu já fiz meu trabalho trabalhoso, sua água molhada está bem ali no balde baldoso, seu boboca bobalho!', true);
        break;
      case 'asleep_idle':
        wake.mutate();
        break;
    }
  };

  const onBalde = () => {
    if (st.state !== 'holding_water' || collect.isPending) return;
    collect.mutate(undefined, {
      onError: (e) => {
        if ((e as { code?: string }).code === 'WATER_FULL') {
          showBalloon('teu regador tá cheião — guarda essa água molhada e volta depois, bobalho.', true);
        }
      },
    });
  };

  const doUnlock = () => {
    setConfirmUnlock(false);
    unlock.mutate(undefined, { onSuccess: () => setCutsceneStep(0) });
  };

  const pabloSprite = st.state === 'awake' ? SPRITE.emPe : SPRITE.dormindo;

  return (
    <div className="relative flex flex-row-reverse items-end gap-0.5 select-none" style={{ touchAction: 'manipulation' }}>
      {/* Balão de fala */}
      {balloon && (
        <div
          className="absolute z-20 right-0 bottom-full mb-1 flex items-center gap-2 px-3 py-2 rounded-2xl"
          style={{
            width: 'max-content', maxWidth: 220,
            background: 'linear-gradient(180deg, var(--color-parch-light), var(--color-parch-dark))',
            border: `1.5px solid ${balloon.nervoso ? 'rgba(163,45,45,0.7)' : 'var(--color-wood-light)'}`,
            boxShadow: '0 8px 22px rgba(0,0,0,0.4)',
          }}
        >
          {balloon.nervoso && (
            <span className="relative shrink-0" style={{ width: 34, height: 34 }}>
              <Image src={SPRITE.nervoso} alt="Pablo" fill className="object-contain" draggable={false} />
            </span>
          )}
          <span className="text-xs font-bold leading-snug" style={{ fontFamily: 'var(--font-caption)', color: 'var(--color-text-dark)' }}>
            {balloon.text}
          </span>
        </div>
      )}

      {/* Pablo (ou chapéu quando bloqueado) */}
      <button
        onClick={onPablo}
        aria-label={st.state === 'locked' ? 'Desbloquear o Pablo' : 'Pablo, o gnomo'}
        className="relative flex flex-col items-center transition-transform active:scale-95 hover:scale-105"
        style={{ background: 'transparent', cursor: 'pointer' }}
      >
        {st.state === 'locked' ? (
          <span className="relative group block" style={{ width: 'min(13vmin, 50px)', aspectRatio: '614 / 406' }}>
            {/* Chapéu jogado sobre a pedra (objeto do mapa) com glow mágico dourado */}
            <Image src={SPRITE.chapeuJogado} alt="Chapéu do Pablo jogado no chão" fill sizes="100px" unoptimized className="object-contain pablo-glow" draggable={false} />
            {/* Tooltip no hover (desktop) — custo em estrela */}
            <span
              className="absolute z-20 right-0 bottom-full mb-1 px-2.5 py-1 rounded-full text-xs font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ fontFamily: 'var(--font-display)', color: '#3a2a08', background: 'rgba(250,199,117,0.97)', border: '1.5px solid rgba(133,79,11,0.6)', boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }}
            >
              Desbloqueie por ⭐ 1
            </span>
          </span>
        ) : (
          <span className="relative" style={{ width: 'min(20vmin, 110px)', height: 'min(24vmin, 132px)' }}>
            <Image src={pabloSprite} alt="Pablo" fill className="object-contain object-bottom" draggable={false} priority />
          </span>
        )}
      </button>

      {/* Balde (só no holding_water) */}
      {st.state === 'holding_water' && (
        <button
          onClick={onBalde}
          disabled={collect.isPending}
          aria-label="Pegar a água do balde"
          className="relative transition-transform active:scale-90 hover:scale-105 disabled:opacity-60"
          style={{ background: 'transparent', cursor: 'pointer' }}
        >
          <span className="relative block animate-bounce" style={{ width: 'min(12vmin, 62px)', height: 'min(12vmin, 62px)', animationDuration: '1.6s' }}>
            <Image src={SPRITE.balde} alt="Balde cheio" fill className="object-contain" draggable={false} />
          </span>
        </button>
      )}

      {/* Confirmação de desbloqueio */}
      {confirmUnlock && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ background: 'rgba(5,8,3,0.55)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmUnlock(false)}>
          <div
            className="relative w-full rounded-3xl p-6 flex flex-col items-center gap-4 text-center"
            style={{ maxWidth: 320, background: 'linear-gradient(180deg, var(--color-parch-light), var(--color-parch-dark))', border: '1.5px solid var(--color-wood-light)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="relative" style={{ width: 96, height: 96 }}>
              <Image src={SPRITE.chapeu} alt="Chapéu do Pablo" fill className="object-contain" draggable={false} />
            </span>
            <h2 className="text-lg font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
              Desbloqueie por ⭐ 1
            </h2>
            {st.stars >= 1 ? (
              <>
                <p className="text-xs font-bold" style={{ fontFamily: 'var(--font-caption)', color: 'var(--color-text-mid)' }}>
                  O Pablo enche um balde baldoso de água molhada pra você a cada 24h.
                </p>
                <button
                  onClick={doUnlock}
                  disabled={unlock.isPending}
                  className="w-full py-3 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60"
                  style={{ fontFamily: 'var(--font-display)', color: '#fff', background: 'linear-gradient(180deg, #5bd06a, #2f9e44)', border: '1.5px solid rgba(22,90,20,0.7)', boxShadow: '0 4px 14px rgba(34,120,34,0.4), inset 0 1px 1px rgba(255,255,255,0.35)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                >
                  {unlock.isPending ? 'Acordando...' : '⭐ 1'}
                </button>
              </>
            ) : (
              <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-caption)', color: 'var(--color-text-mid)' }}>
                Você não tem estrela. Colha uma planta até o auge (adulta) pra ganhar ⭐.
              </p>
            )}
            <button onClick={() => setConfirmUnlock(false)} className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>
              {st.stars >= 1 ? 'Agora não' : 'Fechar'}
            </button>
          </div>
        </div>
      )}

      {/* Cutscene de apresentação */}
      {cutsceneStep !== null && (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center p-4 pb-8"
          style={{ background: 'rgba(5,8,3,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setCutsceneStep((s) => (s !== null && s < CUTSCENE.length - 1 ? s + 1 : null))}
        >
          <div className="relative w-full flex flex-col items-center gap-3" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <span className="relative" style={{ width: 150, height: 190 }}>
              <Image src={CUTSCENE[cutsceneStep].nervoso ? SPRITE.nervoso : SPRITE.dialogo} alt="Pablo" fill className="object-contain object-bottom" draggable={false} priority />
            </span>
            <div
              className="w-full rounded-3xl p-5"
              style={{ background: 'linear-gradient(180deg, var(--color-parch-light), var(--color-parch-dark))', border: '1.5px solid var(--color-wood-light)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            >
              <p className="text-sm font-bold leading-relaxed min-h-[3.5em]" style={{ fontFamily: 'var(--font-caption)', color: 'var(--color-text-dark)' }}>
                {CUTSCENE[cutsceneStep].text}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex gap-1">
                  {CUTSCENE.map((_, i) => (
                    <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: i === cutsceneStep ? 'var(--color-gold)' : 'rgba(92,58,30,0.3)' }} />
                  ))}
                </span>
                <button
                  onClick={() => setCutsceneStep((s) => (s !== null && s < CUTSCENE.length - 1 ? s + 1 : null))}
                  className="px-4 py-1.5 rounded-full text-xs font-black transition-transform active:scale-95"
                  style={{ fontFamily: 'var(--font-display)', color: '#3a2a08', background: 'rgba(250,199,117,0.95)', border: '1.5px solid rgba(133,79,11,0.6)' }}
                >
                  {cutsceneStep < CUTSCENE.length - 1 ? 'Continuar' : 'Fechar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
