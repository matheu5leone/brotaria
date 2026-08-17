'use client';

import { useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { WelcomeSeedModal } from '@/components/WelcomeSeedModal';
import { ChangelogModal } from '@/components/ChangelogModal';
import { useWallet } from '@/hooks/useWallet';
import { authFetch } from '@/lib/authFetch';
import { isFeatureRelease } from '@/config/changelog';

/**
 * Shell compartilhado para todas as páginas autenticadas.
 * - Desktop (md+): Sidebar à esquerda + conteúdo à direita
 * - Mobile  (<md): conteúdo em cima + BottomNav fixo embaixo
 *
 * scrollable=false para o jardim (Garden preenche exatamente o espaço)
 * scrollable=true  para loja, ranking e outras páginas com conteúdo longo
 */
export function AppShell({
  children,
  scrollable = true,
}: {
  children: React.ReactNode;
  scrollable?: boolean;
}) {
  const { welcomeAck, lastChangelogVersion, refresh } = useWallet();
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [changelogDone, setChangelogDone] = useState(false);

  // Conta nova não leva changelog na cara junto do popup de boas-vindas: marca a
  // nota como lida em silêncio, e a próxima atualização é que vai aparecer pra ela.
  const silentAcked = useRef(false); // guarda contra o duplo-efeito do StrictMode
  const isNewAccount = !welcomeAck;
  useEffect(() => {
    if (!isNewAccount || silentAcked.current) return;
    if (!isFeatureRelease(lastChangelogVersion)) return;
    silentAcked.current = true;
    authFetch('/api/profile/changelog-ack', { method: 'POST' })
      .then(() => refresh())
      .catch(() => { /* nota fica pendente; reabre na próxima sessão */ });
  }, [isNewAccount, lastChangelogVersion, refresh]);

  const showChangelog =
    !isNewAccount && !changelogDone && isFeatureRelease(lastChangelogVersion);

  return (
    <div
      className="app-shell flex overflow-hidden"
      style={{ height: '100dvh', background: 'var(--color-garden-deep)' }}
    >
      {/* Popup de boas-vindas (semente-cortesia) — só para contas novas */}
      {!welcomeAck && !welcomeDone && (
        <WelcomeSeedModal onDone={() => { setWelcomeDone(true); refresh(); }} />
      )}

      {/* Nota de atualização — abre sozinha quando o jogador volta depois de um
          update com mecânica nova (release de correção só acende a bolinha) */}
      {showChangelog && (
        <ChangelogModal mode="auto" onClose={() => setChangelogDone(true)} />
      )}

      {/* Sidebar — somente desktop real (largura E altura) */}
      <div className="shell-sidebar flex-shrink-0">
        <Sidebar />
      </div>

      {/* Conteúdo principal */}
      <main className={`flex-1 min-h-0 ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {children}
      </main>

      {/* BottomNav — mobile (inclui celular deitado) */}
      <div className="shell-bottomnav flex-shrink-0">
        <BottomNav />
      </div>
    </div>
  );
}
