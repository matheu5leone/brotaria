'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { CURRENT_VERSION } from '@/config/changelog';

interface WalletContextType {
  coins: number;
  herbo: number;
  seedCount: number;
  welcomeAck: boolean;
  tutorialSeen: boolean;
  polenTutorialSeen: boolean;
  /** Última versão do jogo cuja nota de atualização o jogador já leu. */
  lastChangelogVersion: string | null;
  nickname: string | null;
  referralCode: string | null;
  avatarUrl: string | null;
  refresh: () => Promise<void>;
  setCoins: (coins: number) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

type WalletData = { coins: number; herbo: number; seedCount: number; welcomeAck: boolean; tutorialSeen: boolean; polenTutorialSeen: boolean; lastChangelogVersion: string | null; nickname: string | null; referralCode: string | null; avatarUrl: string | null };

const PROFILE_COLS = 'coins, herbo, welcome_ack, tutorial_seen, polen_tutorial_seen, nickname, referral_code, avatar_url';

/** Perfil lido. `last_changelog_version` é opcional: pode faltar antes da migração. */
type ProfileRow = {
  coins?: number;
  herbo?: number;
  welcome_ack?: boolean;
  tutorial_seen?: boolean;
  polen_tutorial_seen?: boolean;
  last_changelog_version?: string | null;
  nickname?: string | null;
  referral_code?: string | null;
  avatar_url?: string | null;
} | null;

/**
 * Lê o perfil pedindo também `last_changelog_version`. Se a coluna ainda não foi
 * migrada (as migrations deste projeto são aplicadas à mão), o PostgREST devolve
 * 42703 — aí relê sem ela, em vez de derrubar a carteira inteira (moedas, herbo,
 * sementes) por causa da nota de atualização. Some sozinho quando a migração roda.
 */
async function loadProfile(userId: string) {
  const full = await supabase
    .from('profiles')
    .select(`${PROFILE_COLS}, last_changelog_version`)
    .eq('id', userId)
    .single();
  if (!full.error || full.error.code !== '42703') return full;

  console.warn('[Wallet] Coluna last_changelog_version ausente — aplique a migração.');
  return supabase.from('profiles').select(PROFILE_COLS).eq('id', userId).single();
}

async function loadWallet(userId: string): Promise<WalletData> {
  const [{ data: profileData, error: profileErr }, { data: seedSlots, error: slotsErr }] =
    await Promise.all([
      loadProfile(userId),
      supabase
        .from('inventory_items')
        .select('quantity')
        .eq('user_id', userId)
        .eq('item_type', 'seed'),
    ]);
  const profile = profileData as ProfileRow;
  if (profileErr) throw profileErr;
  if (slotsErr) throw slotsErr;
  const seedCount = (seedSlots ?? []).reduce((sum, s) => sum + s.quantity, 0);
  return {
    coins: profile?.coins ?? 0,
    herbo: profile?.herbo ?? 0,
    seedCount,
    welcomeAck: profile?.welcome_ack ?? true,
    tutorialSeen: profile?.tutorial_seen ?? true,
    polenTutorialSeen: profile?.polen_tutorial_seen ?? true,
    // null = nunca leu nenhuma nota. Diferente de "carregando" (tratado no provider).
    lastChangelogVersion: profile?.last_changelog_version ?? null,
    nickname: profile?.nickname ?? null,
    referralCode: profile?.referral_code ?? null,
    avatarUrl: profile?.avatar_url ?? null,
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
      tutorialSeen: data?.tutorialSeen ?? true,
      polenTutorialSeen: data?.polenTutorialSeen ?? true,
      // Enquanto carrega, finge "já leu a versão atual" — mesmo espírito do `?? true`
      // acima: nunca piscar a nota. Já carregado, `null` passa como null de verdade.
      lastChangelogVersion: data ? data.lastChangelogVersion : CURRENT_VERSION,
      nickname:   data?.nickname ?? null,
      referralCode: data?.referralCode ?? null,
      avatarUrl:  data?.avatarUrl ?? null,
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
