'use client';

import { useState } from 'react';
import NavLink from '@/components/NavLink';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { LayoutDashboard, Store, Trophy, Target, Menu, Droplets, X } from 'lucide-react';
import { CoinIcon } from '@/components/CoinIcon';

function NavItem({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      href={href}
      className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all"
      style={{
        background: active ? 'rgba(92,58,30,0.15)' : 'transparent',
      }}
    >
      <div style={{ color: active ? 'var(--color-wood-mid)' : 'var(--color-text-muted)' }}>
        {children}
      </div>
      <span
        className="text-[8px] uppercase tracking-wide font-black"
        style={{
          fontFamily: 'var(--font-display)',
          color: active ? 'var(--color-wood-mid)' : 'var(--color-text-muted)',
        }}
      >
        {label}
      </span>
    </NavLink>
  );
}

/** Item do menu (bottom sheet). */
function SheetItem({
  href,
  label,
  active,
  onClick,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
      style={{
        background: active ? 'rgba(92,58,30,0.12)' : 'rgba(92,58,30,0.04)',
        border: '1px solid rgba(92,58,30,0.15)',
      }}
    >
      <div style={{ color: active ? 'var(--color-wood-mid)' : 'var(--color-text-muted)' }}>
        {children}
      </div>
      <span
        className="text-sm font-bold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
      >
        {label}
      </span>
    </NavLink>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { coins, herbo, nickname } = useWallet();
  const myGarden = nickname ? `/jardim/${nickname}` : '/';
  const [menuOpen, setMenuOpen] = useState(false);
  // O menu fecha via onClick dos itens e do backdrop (sem effect de rota).

  const secondaryActive = pathname === '/ranking' || pathname === '/missoes' || pathname === '/agua';

  return (
    <>
      {/* Bottom sheet do menu ☰ */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(8,14,5,0.5)' }} />
          <div
            className="absolute left-0 right-0 rounded-t-2xl p-4 pb-6"
            style={{
              bottom: 62,
              background: 'linear-gradient(180deg, var(--color-parch-mid) 0%, var(--color-parch-dark) 100%)',
              borderTop: '2px solid var(--color-wood-mid)',
              boxShadow: '0 -8px 28px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
              >
                Mais
              </span>
              <button onClick={() => setMenuOpen(false)} aria-label="Fechar menu" style={{ color: 'var(--color-text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <SheetItem href="/agua" label="Coleta de Água" active={pathname === '/agua'} onClick={() => setMenuOpen(false)}>
                <Droplets className="w-5 h-5" />
              </SheetItem>
              <SheetItem href="/ranking" label="Ranking" active={pathname === '/ranking'} onClick={() => setMenuOpen(false)}>
                <Trophy className="w-5 h-5" />
              </SheetItem>
              <SheetItem href="/missoes" label="Missões" active={pathname === '/missoes'} onClick={() => setMenuOpen(false)}>
                <Target className="w-5 h-5" />
              </SheetItem>
            </div>
          </div>
        </div>
      )}

      <nav
        className="flex items-center w-full px-3 gap-1 relative z-50"
        style={{
          height: 62,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background:
            'linear-gradient(180deg, var(--color-parch-mid) 0%, var(--color-parch-dark) 100%)',
          borderTop: '2px solid var(--color-wood-mid)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.35)',
        }}
      >
        {/* Coins */}
        <NavLink
          href="/loja"
          className="flex flex-col items-center justify-center flex-none px-2 py-1.5 rounded-xl"
          style={{ background: 'rgba(201,162,39,0.1)', border: '1px solid rgba(201,162,39,0.35)' }}
        >
          <span
            className="text-sm font-black leading-none"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}
          >
            <CoinIcon size={16} className="inline-block mr-1" />{coins} · 🍃 {herbo}
          </span>
        </NavLink>

        <NavItem href={myGarden} label="Jardim" active={pathname === myGarden || pathname === '/'}>
          <LayoutDashboard className="w-5 h-5" />
        </NavItem>
        <NavItem href="/loja" label="Loja" active={pathname === '/loja'}>
          <Store className="w-5 h-5" />
        </NavItem>

        {/* ☰ Menu — abre o bottom sheet com os destinos secundários */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Mais opções"
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all"
          style={{ background: menuOpen || secondaryActive ? 'rgba(92,58,30,0.15)' : 'transparent' }}
        >
          <div style={{ color: menuOpen || secondaryActive ? 'var(--color-wood-mid)' : 'var(--color-text-muted)' }}>
            <Menu className="w-5 h-5" />
          </div>
          <span
            className="text-[8px] uppercase tracking-wide font-black"
            style={{
              fontFamily: 'var(--font-display)',
              color: menuOpen || secondaryActive ? 'var(--color-wood-mid)' : 'var(--color-text-muted)',
            }}
          >
            Mais
          </span>
        </button>

        {/* User avatar + logout */}
        <button
          onClick={signOut}
          className="flex flex-col items-center justify-center gap-0.5 flex-none px-2 py-1.5 rounded-xl transition-all hover:bg-[rgba(139,64,64,0.1)] active:scale-90"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, #2a4a1e, #1a2f10)',
              color: 'var(--color-wood-light)',
              border: '1px solid var(--color-wood-light)',
              fontFamily: 'var(--font-display)',
              fontSize: 12,
            }}
            title={user?.email ?? ''}
          >
            {user?.email?.[0].toUpperCase()}
          </div>
          <span
            className="text-[8px] uppercase tracking-wide font-black"
            style={{ fontFamily: 'var(--font-display)', color: '#8b4040' }}
          >
            Sair
          </span>
        </button>
      </nav>
    </>
  );
}
