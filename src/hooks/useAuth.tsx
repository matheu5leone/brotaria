'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Páginas que não devem ter redirecionamento de perfil incompleto
const AUTH_PAGES = ['/login', '/signup', '/esqueci-senha', '/redefinir-senha', '/completar-perfil'];

async function checkAndRedirectIfNoNickname(
  userId: string,
  pathname: string,
  router: ReturnType<typeof useRouter>,
) {
  if (AUTH_PAGES.some((p) => pathname.startsWith(p))) return;
  const { data } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', userId)
    .single();
  if (!data?.nickname) {
    router.push('/completar-perfil');
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Sessão existente ao carregar a página
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoading(false);
      if (currentUser) {
        await checkAndRedirectIfNoNickname(currentUser.id, pathname, router);
      }
    });

    // Mudanças de estado de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoading(false);

      if (_event === 'SIGNED_IN' && currentUser) {
        // Salva avatar do Google/OAuth se disponível
        const oauthAvatar =
          currentUser.user_metadata?.avatar_url ??
          currentUser.user_metadata?.picture ??
          null;

        try {
          await fetch('/api/auth/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.id,
              email: currentUser.email,
              avatarUrl: oauthAvatar,
            }),
          });
        } catch (err) {
          console.error('Error initializing user:', err);
        }

        // Redireciona se perfil incompleto (sem nickname — típico de Google OAuth)
        await checkAndRedirectIfNoNickname(currentUser.id, pathname, router);
      }

      if (_event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
