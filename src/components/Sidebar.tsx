'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import NavLink from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import {
  LogOut, LayoutDashboard, Store,
  ChevronLeft, ChevronRight, Trophy, Target,
  MoreVertical, UserPlus, Check, Droplets, Camera, Heart,
} from 'lucide-react';
import { CoinIcon } from '@/components/CoinIcon';
import { AvatarCircle } from '@/components/AvatarCircle';
import { AvatarPickerModal } from '@/components/AvatarPickerModal';
import { useLikes } from '@/hooks/useLikes';
import { useHasClaimableMission } from '@/hooks/useMissions';

/** Bolinha de notificação (sem número) — prêmio de missão pronto para resgatar. */
function NotifDot() {
  return (
    <span
      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full pointer-events-none"
      style={{ background: '#ef4444', boxShadow: '0 0 0 2px var(--color-parch-mid)' }}
    />
  );
}

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const { coins, herbo, nickname, referralCode, avatarUrl } = useWallet();
  const { data: myLikes } = useLikes(user?.id); // curtidas recebidas no próprio jardim
  const hasClaimableMission = useHasClaimableMission(); // badge de resgate no menu Missões
  const myGarden = nickname ? `/jardim/${nickname}` : '/';
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyGardenLink = async () => {
    if (!nickname) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jardim/${nickname}`);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard indisponível — ignora
    }
  };

  // Menu "⋮" da linha do perfil → Convidar amigos (copia o link de indicação)
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inviteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const copyInviteLink = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/convite/${referralCode}`);
      setInviteCopied(true);
      if (inviteTimer.current) clearTimeout(inviteTimer.current);
      inviteTimer.current = setTimeout(() => { setInviteCopied(false); setMenuOpen(false); }, 1400);
    } catch {
      // clipboard indisponível — ignora
    }
  };

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
    <>
    {pickerOpen && <AvatarPickerModal onClose={() => setPickerOpen(false)} />}
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
            src="/imgs/brotaria.webp"
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

          <NavLink href={myGarden} title="Meu Jardim" className={navItemClass(myGarden)}>
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

          <NavLink href="/missoes" title="Missões" className={navItemClass('/missoes')}>
            <span className="relative min-w-[20px] w-5 h-5">
              <Target className="w-5 h-5" />
              {hasClaimableMission && <NotifDot />}
            </span>
            {!isSidebarCollapsed && <span style={{ fontFamily: 'var(--font-body)' }}>Missões</span>}
          </NavLink>

          <NavLink href="/agua" title="Coleta de Água" className={navItemClass('/agua')}>
            <Droplets className="w-5 h-5 min-w-[20px]" />
            {!isSidebarCollapsed && <span style={{ fontFamily: 'var(--font-body)' }}>Coleta de Água</span>}
          </NavLink>
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
            <div className="relative flex items-center">
              <button
                onClick={copyGardenLink}
                disabled={!nickname}
                title="Copiar link do meu jardim"
                className={`flex items-center rounded-lg transition-colors hover:bg-[rgba(92,58,30,0.09)] active:scale-[0.98] ${
                  isSidebarCollapsed ? 'w-full justify-center p-1' : 'flex-1 min-w-0 gap-3 px-2 py-1.5'
                }`}
              >
                <AvatarCircle url={avatarUrl} initial={nickname?.[0] ?? user.email?.[0]} size={40} />
                {!isSidebarCollapsed && (
                  <span
                    className="text-sm font-bold truncate"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
                  >
                    @{nickname ?? '...'}
                  </span>
                )}
              </button>

              {/* Curtidas recebidas no meu jardim */}
              {!isSidebarCollapsed && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-lg font-black text-xs flex-shrink-0"
                  style={{
                    fontFamily: 'var(--font-display)',
                    background: 'rgba(248,113,113,0.1)',
                    color: '#c0504d',
                    border: '1px solid rgba(248,113,113,0.3)',
                  }}
                  title="Curtidas do seu jardim"
                >
                  <Heart className="w-3.5 h-3.5" style={{ fill: '#c0504d' }} />
                  {myLikes?.total ?? 0}
                </div>
              )}

              {/* ⋮ — abre menu discreto com "Convidar amigos" */}
              {!isSidebarCollapsed && (
                <div ref={menuRef} className="relative flex-shrink-0">
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    title="Mais opções"
                    aria-label="Mais opções"
                    className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(92,58,30,0.09)] active:scale-95"
                    style={{ color: 'var(--color-text-mid)' }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {menuOpen && (
                    <div
                      className="absolute bottom-full right-0 mb-2 z-50 rounded-xl overflow-hidden min-w-[176px]"
                      style={{
                        background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
                        border: '1.5px solid var(--color-wood-light)',
                        boxShadow: '0 10px 28px rgba(0,0,0,0.4)',
                      }}
                    >
                      <button
                        onClick={() => { setMenuOpen(false); setPickerOpen(true); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-bold transition-colors hover:bg-[rgba(92,58,30,0.08)]"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
                      >
                        <Camera className="w-4 h-4" style={{ color: 'var(--color-wood-mid)' }} />
                        Mudar foto de perfil
                      </button>
                      <button
                        onClick={copyInviteLink}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-bold transition-colors hover:bg-[rgba(92,58,30,0.08)]"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
                      >
                        {inviteCopied ? (
                          <Check className="w-4 h-4" style={{ color: '#2a5a1e' }} />
                        ) : (
                          <UserPlus className="w-4 h-4" style={{ color: 'var(--color-wood-mid)' }} />
                        )}
                        {!referralCode ? 'Convite indisponível' : inviteCopied ? 'Link copiado!' : 'Convidar amigos'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mensagem "copiado" — perto da menção clicada */}
              {copied && (
                <div
                  className="absolute left-2 -top-8 z-50 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap pointer-events-none"
                  style={{
                    background: 'rgba(8,14,5,0.92)',
                    color: 'var(--color-text-light)',
                    border: '1px solid rgba(201,162,39,0.35)',
                    fontFamily: 'var(--font-display)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  }}
                >
                  Link do jardim copiado
                </div>
              )}
            </div>

            <div className={`flex ${isSidebarCollapsed ? 'flex-col items-center gap-2' : 'gap-1'}`}>
              {/* Configurações — desabilitado até a página de Settings existir.
              <button
                className={`flex items-center justify-center p-2 rounded-lg transition-colors hover:bg-[rgba(92,58,30,0.07)] ${
                  isSidebarCollapsed ? 'w-10 h-10' : 'flex-1'
                }`}
                style={{ color: 'var(--color-text-muted)' }}
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </button>
              */}
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
    </>
  );
}
