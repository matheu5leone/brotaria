'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import NavLink from '@/components/NavLink';
import Inventory from '@/components/Inventory';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import {
  LogOut,
  LayoutDashboard,
  Store,
  Settings,
  ChevronLeft,
  ChevronRight,
  Coins,
  Trophy,
} from 'lucide-react';

/**
 * Shell de navegação compartilhado entre as páginas autenticadas (Home, Loja…).
 * Auto-contido: estado de colapso, chip de moedas, inventário e bloco do usuário.
 */
export default function Sidebar() {
  const { user, signOut } = useAuth();
  const { coins } = useWallet();
  const pathname = usePathname();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItemClass = (href: string) => {
    const isActive = pathname === href;
    const base = 'flex items-center rounded-lg transition-all';
    const layout = isSidebarCollapsed
      ? 'justify-center p-2.5 w-10 h-10 mx-auto'
      : 'gap-3 px-3 py-2';
    const state = isActive
      ? 'bg-green-50 text-green-700 font-bold'
      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900 font-medium';
    return `${base} ${layout} ${state}`;
  };

  return (
    <aside
      className={`${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } bg-white border-r border-stone-200 flex flex-col sticky top-0 h-screen z-20 shadow-sm transition-all duration-300 ease-in-out relative`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="absolute top-6 -right-3 w-6 h-6 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-stone-50 hover:scale-110 active:scale-95 transition-all z-30 group"
        title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-800 transition-colors" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-800 transition-colors" />
        )}
      </button>

      {/* Logo / Wordmark */}
      <div
        className={`px-5 border-b border-stone-100 flex items-center h-20 ${
          isSidebarCollapsed ? 'justify-center' : 'gap-2.5'
        }`}
      >
        <NavLink href="/" className="flex items-center gap-2.5" title="Brotaria">
          <Image
            src="/imgs/brotaria.png"
            alt="Brotaria"
            width={36}
            height={36}
            className="w-9 h-9 object-contain hover:scale-110 transition-transform"
            priority
          />
          {!isSidebarCollapsed && (
            <span className="text-xl font-black text-stone-800 tracking-tight">Brotaria</span>
          )}
        </NavLink>
      </div>

      {/* Navigation / Inventory */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Coins chip */}
        <NavLink
          href="/loja"
          title={`Moedas: ${coins}`}
          className={`flex items-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 transition-all hover:bg-amber-100 ${
            isSidebarCollapsed ? 'justify-center p-2.5 w-12 h-12 mx-auto' : 'gap-2 px-3 py-2'
          }`}
        >
          <Coins className="w-5 h-5 min-w-[20px]" />
          {!isSidebarCollapsed && (
            <span className="font-black text-base">
              {coins} <span className="text-xs font-bold text-amber-500">moedas</span>
            </span>
          )}
        </NavLink>

        <div className="space-y-1">
          {!isSidebarCollapsed && (
            <p className="px-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              Principal
            </p>
          )}

          <NavLink href="/" title="Meu Jardim" className={navItemClass('/')}>
            <LayoutDashboard className="w-5 h-5 min-w-[20px]" />
            {!isSidebarCollapsed && <span>Meu Jardim</span>}
          </NavLink>

          <NavLink href="/loja" title="Loja" className={navItemClass('/loja')}>
            <Store className="w-5 h-5 min-w-[20px]" />
            {!isSidebarCollapsed && <span>Loja</span>}
          </NavLink>

          <NavLink href="/ranking" title="Ranking" className={navItemClass('/ranking')}>
            <Trophy className="w-5 h-5 min-w-[20px]" />
            {!isSidebarCollapsed && <span>Ranking</span>}
          </NavLink>
        </div>

        <div className="pt-4 border-t border-stone-100">
          {!isSidebarCollapsed && (
            <p className="px-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">
              Inventário
            </p>
          )}
          <div className={isSidebarCollapsed ? '' : 'px-1'}>
            <Inventory isCollapsed={isSidebarCollapsed} />
          </div>
        </div>
      </nav>

      {/* User / Profile Section (Bottom) */}
      <div className="p-4 border-t border-stone-100 bg-stone-50/50">
        {user ? (
          <div className="flex flex-col gap-3">
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-2 py-1'}`}>
              <div
                className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold border border-green-200 flex-shrink-0 cursor-help"
                title={user.email || ''}
              >
                {user.email?.[0].toUpperCase()}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-stone-800 truncate">{user.email?.split('@')[0]}</p>
                  <p className="text-[10px] text-stone-400 truncate">{user.email}</p>
                </div>
              )}
            </div>

            <div className={`flex ${isSidebarCollapsed ? 'flex-col items-center gap-2' : 'gap-1'}`}>
              <button
                className={`flex items-center justify-center p-2 rounded-lg text-stone-500 hover:bg-stone-200 transition-colors ${
                  isSidebarCollapsed ? 'w-10 h-10' : 'flex-1'
                }`}
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={signOut}
                className={`flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors font-bold ${
                  isSidebarCollapsed ? 'w-10 h-10 p-2' : 'flex-1 p-2 gap-2'
                }`}
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
                {!isSidebarCollapsed && <span className="text-xs">Sair</span>}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
