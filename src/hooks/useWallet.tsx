'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface WalletContextType {
  coins: number;
  herbo: number;
  seedCount: number;
  refresh: () => Promise<void>;
  setCoins: (coins: number) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

async function loadWallet(userId: string): Promise<{ coins: number; herbo: number; seedCount: number }> {
  const [{ data: profile, error: profileErr }, { data: seedSlots, error: slotsErr }] =
    await Promise.all([
      supabase.from('profiles').select('coins, herbo').eq('id', userId).single(),
      supabase
        .from('inventory_items')
        .select('quantity')
        .eq('user_id', userId)
        .eq('item_type', 'seed'),
    ]);
  if (profileErr) throw profileErr;
  if (slotsErr) throw slotsErr;
  const seedCount = (seedSlots ?? []).reduce((sum, s) => sum + s.quantity, 0);
  return { coins: profile?.coins ?? 0, herbo: profile?.herbo ?? 0, seedCount };
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

  const setCoins = useCallback((coins: number) => {
    qc.setQueryData(
      ['wallet', user?.id],
      (old: { coins: number; herbo: number; seedCount: number } | undefined) =>
        old ? { ...old, coins } : { coins, herbo: 0, seedCount: 0 },
    );
  }, [qc, user?.id]);

  return (
    <WalletContext.Provider value={{
      coins:     data?.coins    ?? 0,
      herbo:     data?.herbo    ?? 0,
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
  if (ctx === undefined) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
