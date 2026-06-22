'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

/**
 * Carteira do usuário: saldo de moedas + contagem de sementes, compartilhados
 * por toda a app (Sidebar, Inventário, Loja, modal de compra).
 *
 * Centralizar evita estado obsoleto: depois de comprar moedas/sementes em
 * qualquer lugar, basta chamar `refresh()` (ou `setCoins()` com o saldo novo
 * retornado pela API) para todos os pontos atualizarem juntos.
 */
interface WalletContextType {
  coins: number;
  seedCount: number;
  refresh: () => Promise<void>;
  setCoins: (coins: number) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

async function loadWallet(userId: string): Promise<{ coins: number; seedCount: number }> {
  const [{ data: profile, error: profileErr }, { count, error: countErr }] = await Promise.all([
    supabase.from('profiles').select('coins').eq('id', userId).single(),
    supabase.from('seeds').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  if (profileErr) throw profileErr;
  if (countErr) throw countErr;
  return { coins: profile?.coins ?? 0, seedCount: count ?? 0 };
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: () => loadWallet(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['wallet', user?.id] });
  }, [qc, user?.id]);

  // Permite override otimista do saldo sem aguardar re-fetch
  const setCoins = useCallback((coins: number) => {
    qc.setQueryData(['wallet', user?.id], (old: { coins: number; seedCount: number } | undefined) =>
      old ? { ...old, coins } : { coins, seedCount: 0 }
    );
  }, [qc, user?.id]);

  return (
    <WalletContext.Provider value={{
      coins: data?.coins ?? 0,
      seedCount: data?.seedCount ?? 0,
      refresh,
      setCoins,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (ctx === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return ctx;
}
