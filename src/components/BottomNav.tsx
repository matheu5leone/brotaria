'use client';

import NavLink from '@/components/NavLink';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { LayoutDashboard, Store, Trophy } from 'lucide-react';
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

export function BottomNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { coins, herbo } = useWallet();

  return (
    <nav
      className="flex items-center px-3 gap-1"
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

      {/* Nav items */}
      <NavItem href="/" label="Jardim" active={pathname === '/'}>
        <LayoutDashboard className="w-5 h-5" />
      </NavItem>

      <NavItem href="/loja" label="Loja" active={pathname === '/loja'}>
        <Store className="w-5 h-5" />
      </NavItem>

      <NavItem href="/ranking" label="Ranking" active={pathname === '/ranking'}>
        <Trophy className="w-5 h-5" />
      </NavItem>

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
  );
}
