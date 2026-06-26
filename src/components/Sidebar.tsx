'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import NavLink from '@/components/NavLink';
import Inventory from '@/components/Inventory';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import {
  LogOut, LayoutDashboard, Store, Settings,
  ChevronLeft, ChevronRight, Trophy,
} from 'lucide-react';
import { CoinIcon } from '@/components/CoinIcon';

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const { coins, herbo } = useWallet();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItemClass = (href: string) => {
    const isActive = pathname === href;
    const base = 'flex items-center rounded-lg transition-all border-l-2';
    const layout = isSidebarCollapsed
      ? 'justify-center p-2.5 w-10 h-10 mx-auto border-l-0'
      : 'gap-3 px-3 py-2';
    const state = isActive
      ? 'border-l-[var(--color-wood-mid)] bg-[rgba(92,58,30,0.1)] text-[var(--color-text-dark)] font-bold'
      : 'border-l-transparent text-[var(--color-text-mid)] hover:bg-[rgba(92,58,30,0.07)] hover:text-[var(--color-text-dark)] font-medium';
    return `${base} ${layout} ${state}`;
  };

  return (
    <aside
      className={`${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } border-r-[3px] flex flex-col sticky top-0 h-screen z-20 shadow-sm transition-all duration-300 ease-in-out relative`}
      style={{
        background: `linear-gradient(180deg, var(--color-parch-mid) 0%, var(--color-parch-dark) 100%)`,
        borderRightColor: 'var(--color-wood-mid)',
        backgroundImage: `linear-gradient(180deg, var(--color-parch-mid) 0%, var(--color-parch-dark) 100%), repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(92,58,30,0.03) 20px, rgba(92,58,30,0.03) 21px)`,
        backgroundBlendMode: 'normal',
      }}
    >
      {/* Borda direita dourada */}
      <div
        className="absolute right-0 top-0 bottom-0 w-[3px] pointer-events-none"
        style={{
          background: `linear-gradient(180deg, var(--color-gold), var(--color-wood-mid) 30%, var(--color-gold) 50%, var(--color-wood-dark) 70%, var(--color-gold))`,
        }}
      />

      {/* Toggle Button */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="absolute top-6 -right-3 w-6 h-6 rounded-full flex items-center justify-center shadow-md cursor-pointer hover:scale-110 active:scale-95 transition-all z-30"
        style={{
          background: 'var(--color-parch-mid)',
          border: `1px solid var(--color-wood-light)`,
        }}
        title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {isSidebarCollapsed
          ? <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--color-text-mid)' }} />
          : <ChevronLeft  className="w-3.5 h-3.5" style={{ color: 'var(--color-text-mid)' }} />
        }
      </button>

      {/* Logo / Wordmark */}
      <div
        className={`px-5 flex items-center h-20 ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}
        style={{ borderBottom: `1px solid rgba(92,58,30,0.25)` }}
      >
        <NavLink href="/" className="flex items-center gap-2.5" title="Brotaria">
          <Image
            src="/imgs/brotaria.png"
            alt="Brotaria"
            width={36}
            height={36}
            className="w-9 h-9 object-contain hover:scale-110 transition-transform"
            preload
          />
          {!isSidebarCollapsed && (
            <span
              className="text-xl font-black tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
            >
              Brotaria
            </span>
          )}
        </NavLink>
      </div>

      {/* Navigation / Inventory */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Coins chip */}
        <NavLink
          href="/loja"
          title={`Moedas: ${coins}`}
          className={`flex items-center rounded-xl transition-all ${
            isSidebarCollapsed ? 'justify-center p-2.5 w-12 h-12 mx-auto' : 'gap-2 px-3 py-2'
          }`}
          style={{ background: 'rgba(201,162,39,0.1)', border: '1px solid rgba(201,162,39,0.4)' }}
        >
          <CoinIcon size={20} />
          {!isSidebarCollapsed && (
            <span className="font-black text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-dark)' }}>
              {coins}{' '}
              <span className="text-xs font-bold" style={{ color: 'var(--color-gold)' }}>moedas</span>
            </span>
          )}
        </NavLink>

        {/* Herbo chip */}
        <div
          className={`flex items-center rounded-xl ${
            isSidebarCollapsed ? 'justify-center p-2.5 w-12 h-12 mx-auto' : 'gap-2 px-3 py-2'
          }`}
          style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}
          title={`Herbo: ${herbo}`}
        >
          <span className="text-lg min-w-[20px] text-center">🍃</span>
          {!isSidebarCollapsed && (
            <span className="font-black text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-dark)' }}>
              {herbo}{' '}
              <span className="text-xs font-bold" style={{ color: '#4ade80' }}>herbo</span>
            </span>
          )}
        </div>

        <div className="space-y-1">
          {!isSidebarCollapsed && (
            <p
              className="px-3 text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
            >
              Principal
            </p>
          )}

          <NavLink href="/" title="Meu Jardim" className={navItemClass('/')}>
            <LayoutDashboard className="w-5 h-5 min-w-[20px]" />
            {!isSidebarCollapsed && <span style={{ fontFamily: 'var(--font-body)' }}>Meu Jardim</span>}
          </NavLink>

          <NavLink href="/loja" title="Loja" className={navItemClass('/loja')}>
            <Store className="w-5 h-5 min-w-[20px]" />
            {!isSidebarCollapsed && <span style={{ fontFamily: 'var(--font-body)' }}>Loja</span>}
          </NavLink>

          <NavLink href="/ranking" title="Ranking" className={navItemClass('/ranking')}>
            <Trophy className="w-5 h-5 min-w-[20px]" />
            {!isSidebarCollapsed && <span style={{ fontFamily: 'var(--font-body)' }}>Ranking</span>}
          </NavLink>
        </div>

        <div
          className="pt-4"
          style={{ borderTop: `1px solid rgba(92,58,30,0.2)` }}
        >
          {!isSidebarCollapsed && (
            <p
              className="px-3 text-[10px] font-bold uppercase tracking-widest mb-4"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
            >
              Inventário
            </p>
          )}
          <div className={isSidebarCollapsed ? '' : 'px-1'}>
            <Inventory isCollapsed={isSidebarCollapsed} />
          </div>
        </div>
      </nav>

      {/* User / Profile */}
      <div
        className="p-4"
        style={{
          borderTop: `1px solid rgba(92,58,30,0.2)`,
          background: 'rgba(92,58,30,0.04)',
        }}
      >
        {user ? (
          <div className="flex flex-col gap-3">
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-2 py-1'}`}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold border flex-shrink-0 cursor-help"
                style={{
                  background: 'linear-gradient(135deg, #2a4a1e, #1a2f10)',
                  borderColor: 'var(--color-wood-light)',
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-wood-light)',
                  fontSize: 14,
                }}
                title={user.email || ''}
              >
                {user.email?.[0].toUpperCase()}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <p
                    className="text-sm font-bold truncate"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
                  >
                    {user.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {user.email}
                  </p>
                </div>
              )}
            </div>

            <div className={`flex ${isSidebarCollapsed ? 'flex-col items-center gap-2' : 'gap-1'}`}>
              <button
                className={`flex items-center justify-center p-2 rounded-lg transition-colors hover:bg-[rgba(92,58,30,0.07)] ${
                  isSidebarCollapsed ? 'w-10 h-10' : 'flex-1'
                }`}
                style={{ color: 'var(--color-text-muted)' }}
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={signOut}
                className={`flex items-center justify-center rounded-lg font-bold transition-colors hover:bg-[rgba(139,64,64,0.1)] ${
                  isSidebarCollapsed ? 'w-10 h-10 p-2' : 'flex-1 p-2 gap-2'
                }`}
                style={{ color: '#8b4040' }}
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
                {!isSidebarCollapsed && (
                  <span className="text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                    Sair
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
