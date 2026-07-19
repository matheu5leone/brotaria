'use client';

import { useRef, useState } from 'react';
import NavLink from '@/components/NavLink';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import {
  LayoutDashboard, Store, Trophy, Target, Menu, Droplets, X,
  UserPlus, LogOut, Check, Camera, Heart,
} from 'lucide-react';
import { CoinIcon } from '@/components/CoinIcon';
import { HerboIcon } from '@/components/HerboIcon';
import { AvatarCircle } from '@/components/AvatarCircle';
import { AvatarPickerModal } from '@/components/AvatarPickerModal';
import { useLikes } from '@/hooks/useLikes';
import { useHasClaimableMission } from '@/hooks/useMissions';

/** Bolinha de notificação (sem número) — prêmio de missão pronto para resgatar. */
function NotifDot({ className = '-top-1 -right-1' }: { className?: string }) {
  return (
    <span
      className={`absolute w-2 h-2 rounded-full pointer-events-none ${className}`}
      style={{ background: '#ef4444', boxShadow: '0 0 0 2px var(--color-parch-mid)' }}
    />
  );
}

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
  dot = false,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick: () => void;
  dot?: boolean;
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
      <div className="relative" style={{ color: active ? 'var(--color-wood-mid)' : 'var(--color-text-muted)' }}>
        {children}
        {dot && <NotifDot />}
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
  const { coins, herbo, nickname, referralCode, avatarUrl } = useWallet();
  const myGarden = nickname ? `/jardim/${nickname}` : '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const inviteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Os menus fecham via onClick dos itens e do backdrop (sem effect de rota).

  const copyInviteLink = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/convite/${referralCode}`);
      setInviteCopied(true);
      if (inviteTimer.current) clearTimeout(inviteTimer.current);
      inviteTimer.current = setTimeout(() => { setInviteCopied(false); setProfileOpen(false); }, 1400);
    } catch {
      // clipboard indisponível — ignora
    }
  };

  // Clicar no @apelido copia o link do jardim (igual ao desktop).
  const [gardenCopied, setGardenCopied] = useState(false);
  const gardenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyGardenLink = async () => {
    if (!nickname) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jardim/${nickname}`);
      setGardenCopied(true);
      if (gardenTimer.current) clearTimeout(gardenTimer.current);
      gardenTimer.current = setTimeout(() => setGardenCopied(false), 1600);
    } catch {
      // clipboard indisponível — ignora
    }
  };

  const avatarInitial = (nickname?.[0] ?? user?.email?.[0])?.toUpperCase();
  const { data: myLikes } = useLikes(user?.id); // curtidas recebidas no próprio jardim
  const hasClaimableMission = useHasClaimableMission(); // badge de resgate (Missões fica no "Mais")

  const secondaryActive = pathname === '/ranking' || pathname === '/missoes' || pathname === '/agua';

  return (
    <>
      {pickerOpen && <AvatarPickerModal onClose={() => setPickerOpen(false)} />}

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
              <SheetItem href="/missoes" label="Missões" active={pathname === '/missoes'} onClick={() => setMenuOpen(false)} dot={hasClaimableMission}>
                <Target className="w-5 h-5" />
              </SheetItem>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet do perfil (avatar) */}
      {profileOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)}>
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
            {/* Cabeçalho: avatar + @apelido → clicar copia o link do jardim */}
            <div className="flex items-center gap-3 mb-4 px-1">
              <button
                onClick={copyGardenLink}
                disabled={!nickname}
                title="Copiar link do meu jardim"
                className="flex items-center gap-3 min-w-0 flex-1 rounded-lg -mx-1 px-1 py-1 transition-colors hover:bg-[rgba(92,58,30,0.08)] active:scale-[0.99]"
              >
                <AvatarCircle url={avatarUrl} initial={avatarInitial} size={40} />
                <div className="min-w-0 text-left">
                  <span
                    className="block text-base font-black truncate"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
                  >
                    @{nickname ?? '...'}
                  </span>
                  <span
                    className="block text-[10px] font-bold"
                    style={{ fontFamily: 'var(--font-display)', color: gardenCopied ? '#2a5a1e' : 'var(--color-text-muted)' }}
                  >
                    {gardenCopied ? '✓ Link do jardim copiado' : 'Toque para copiar o link'}
                  </span>
                </div>
              </button>
              {/* Curtidas recebidas no meu jardim */}
              <div
                className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg font-black text-sm flex-shrink-0"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: 'rgba(248,113,113,0.12)',
                  color: '#e05252',
                  border: '1px solid rgba(248,113,113,0.35)',
                }}
                title="Curtidas do seu jardim"
              >
                <Heart className="w-4 h-4" style={{ fill: '#e05252' }} />
                {myLikes?.total ?? 0}
              </div>
              <button onClick={() => setProfileOpen(false)} aria-label="Fechar" className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {/* Convidar amigos → copia o link de indicação */}
              <button
                onClick={copyInviteLink}
                disabled={!referralCode}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: 'rgba(92,58,30,0.04)', border: '1px solid rgba(92,58,30,0.15)' }}
              >
                {inviteCopied
                  ? <Check className="w-5 h-5" style={{ color: '#2a5a1e' }} />
                  : <UserPlus className="w-5 h-5" style={{ color: 'var(--color-wood-mid)' }} />}
                <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
                  {inviteCopied ? 'Link copiado!' : 'Convidar amigos'}
                </span>
              </button>

              {/* Mudar foto de perfil → abre o seletor */}
              <button
                onClick={() => { setProfileOpen(false); setPickerOpen(true); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
                style={{ background: 'rgba(92,58,30,0.04)', border: '1px solid rgba(92,58,30,0.15)' }}
              >
                <Camera className="w-5 h-5" style={{ color: 'var(--color-wood-mid)' }} />
                <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
                  Mudar foto de perfil
                </span>
              </button>

              {/* Sair */}
              <button
                onClick={signOut}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
                style={{ background: 'rgba(139,64,64,0.08)', border: '1px solid rgba(139,64,64,0.2)' }}
              >
                <LogOut className="w-5 h-5" style={{ color: '#8b4040' }} />
                <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)', color: '#8b4040' }}>
                  Sair
                </span>
              </button>
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
            <CoinIcon size={16} className="inline-block mr-1" />{coins} · <span data-herbo-target><HerboIcon size={16} className="mr-1" />{herbo}</span>
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
          onClick={() => { setProfileOpen(false); setMenuOpen((o) => !o); }}
          aria-label="Mais opções"
          className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all"
          style={{ background: menuOpen || secondaryActive ? 'rgba(92,58,30,0.15)' : 'transparent' }}
        >
          <div className="relative" style={{ color: menuOpen || secondaryActive ? 'var(--color-wood-mid)' : 'var(--color-text-muted)' }}>
            <Menu className="w-5 h-5" />
            {hasClaimableMission && !menuOpen && <NotifDot />}
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

        {/* Avatar → abre o menu de perfil (não sai direto) */}
        <button
          onClick={() => { setMenuOpen(false); setProfileOpen((o) => !o); }}
          aria-label="Perfil"
          className="flex flex-col items-center justify-center gap-0.5 flex-none px-2 py-1.5 rounded-xl transition-all active:scale-90"
          style={{ background: profileOpen ? 'rgba(92,58,30,0.15)' : 'transparent' }}
        >
          <AvatarCircle url={avatarUrl} initial={avatarInitial} size={28} />
          <span
            className="text-[8px] uppercase tracking-wide font-black"
            style={{ fontFamily: 'var(--font-display)', color: profileOpen ? 'var(--color-wood-mid)' : 'var(--color-text-muted)' }}
          >
            Perfil
          </span>
        </button>
      </nav>
    </>
  );
}
