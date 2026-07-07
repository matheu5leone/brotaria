'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface WalletContextType {
  coins: number;
  herbo: number;
  seedCount: number;
  welcomeAck: boolean;
  nickname: string | null;
  referralCode: string | null;
  refresh: () => Promise<void>;
  setCoins: (coins: number) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

type WalletData = { coins: number; herbo: number; seedCount: number; welcomeAck: boolean; nickname: string | null; referralCode: string | null };

async function loadWallet(userId: string): Promise<WalletData> {
  const [{ data: profile, error: profileErr }, { data: seedSlots, error: slotsErr }] =
    await Promise.all([
      supabase.from('profiles').select('coins, herbo, welcome_ack, nickname, referral_code').eq('id', userId).single(),
      supabase
        .from('inventory_items')
        .select('quantity')
        .eq('user_id', userId)
        .eq('item_type', 'seed'),
    ]);
  if (profileErr) throw profileErr;
  if (slotsErr) throw slotsErr;
  const seedCount = (seedSlots ?? []).reduce((sum, s) => sum + s.quantity, 0);
  return {
    coins: profile?.coins ?? 0,
    herbo: profile?.herbo ?? 0,
    seedCount,
    welcomeAck: profile?.welcome_ack ?? true,
    nickname: profile?.nickname ?? null,
    referralCode: profile?.referral_code ?? null,
  };
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
    // Só atualiza se a carteira já carregou — evita gravar um estado parcial
    // (que poderia esconder o popup de boas-vindas com welcomeAck fixo em true).
    qc.setQueryData(
      ['wallet', user?.id],
      (old: WalletData | undefined) => (old ? { ...old, coins } : old),
    );
  }, [qc, user?.id]);

  return (
    <WalletContext.Provider value={{
      coins:      data?.coins    ?? 0,
      herbo:      data?.herbo    ?? 0,
      seedCount:  data?.seedCount ?? 0,
      welcomeAck: data?.welcomeAck ?? true,
      nickname:   data?.nickname ?? null,
      referralCode: data?.referralCode ?? null,
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
