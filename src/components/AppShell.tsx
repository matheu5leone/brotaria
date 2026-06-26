'use client';

import Sidebar from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';

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
  return (
    <div
      className="app-shell flex overflow-hidden"
      style={{ height: '100dvh', background: 'var(--color-garden-deep)' }}
    >
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
