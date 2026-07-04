'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { WelcomeSeedModal } from '@/components/WelcomeSeedModal';
import { useWallet } from '@/hooks/useWallet';

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
  const { welcomeAck, refresh } = useWallet();
  const [welcomeDone, setWelcomeDone] = useState(false);

  return (
    <div
      className="app-shell flex overflow-hidden"
      style={{ height: '100dvh', background: 'var(--color-garden-deep)' }}
    >
      {/* Popup de boas-vindas (semente-cortesia) — só para contas novas */}
      {!welcomeAck && !welcomeDone && (
        <WelcomeSeedModal onDone={() => { setWelcomeDone(true); refresh(); }} />
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
