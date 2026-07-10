import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlantDNA } from '@/types';
import { authFetch } from '@/lib/authFetch';
import { supabase } from '@/lib/supabase';
import { reportClientError } from '@/lib/chunkReload';

export type PendingGift = {
  id: string;
  message: string | null;
  created_at: string;
  plant: { id: string; dna: PlantDNA; current_stage: { name: string; order_index: number } | null } | null;
  sender: { id: string; nickname: string | null; avatar_url: string | null } | null;
};

export type UserPreview = {
  id: string;
  nickname: string;
  avatar_url: string | null;
};

export function usePendingGifts(userId: string | undefined) {
  const qc = useQueryClient();

  // Realtime: presente chega ao vivo (INSERT em gifts p/ este destinatário
  // dispara refetch). O RLS (gifts_visible) garante que só eventos dos
  // próprios presentes chegam a este cliente.
  useEffect(() => {
    if (!userId) return;
    // Realtime é OPCIONAL: se o WebSocket for bloqueado (CSP/ETP do Firefox, ITP do
    // Safari, modo privado), o new WebSocket() lança SÍNCRONO (SecurityError) aqui.
    // Sem o try/catch isso subia pro error boundary e derrubava a página inteira.
    // O polling (refetchInterval) cobre a chegada de presentes — só perdemos o "ao vivo".
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`gifts-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'gifts', filter: `recipient_id=eq.${userId}` },
          () => qc.invalidateQueries({ queryKey: ['gifts', 'pending', userId] }),
        )
        .subscribe((status) => {
          // Erro assíncrono de canal → para de insistir (evita tempestade de reconexão).
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            try { if (channel) supabase.removeChannel(channel); } catch { /* ignora */ }
          }
        });
    } catch (err) {
      reportClientError('realtime', err); // degrada pro polling; não quebra a página
    }
    return () => { try { if (channel) supabase.removeChannel(channel); } catch { /* ignora */ } };
  }, [userId, qc]);

  return useQuery<PendingGift[]>({
    queryKey: ['gifts', 'pending', userId],
    queryFn: async () => {
      const res = await authFetch('/api/gifts/pending');
      if (!res.ok) throw new Error('Failed to fetch gifts');
      return res.json();
    },
    enabled: !!userId,
    staleTime: 30_000,
    // Fallback: com realtime cobrindo a chegada instantânea, o polling vira
    // só uma rede de segurança (reconexão de websocket, aba dormida etc.)
    refetchInterval: 300_000,
  });
}

export function useUnwrap(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      const res = await authFetch('/api/inventory/unwrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao desfazer embrulho');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', userId] }),
  });
}

export function useSendGift(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, recipientNickname, message }: { itemId: string; recipientNickname: string; message: string }) => {
      const res = await authFetch('/api/gifts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, recipientNickname, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar presente');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', userId] }),
  });
}

export function useAcceptGift(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ giftId }: { giftId: string }) => {
      const res = await authFetch('/api/gifts/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao aceitar presente');
      return data as { plant: { dna: PlantDNA; current_stage: unknown }; message: string | null };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gifts', 'pending', userId] });
      qc.invalidateQueries({ queryKey: ['inventory', userId] });
    },
  });
}

export function useDeclineGift(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ giftId }: { giftId: string }) => {
      const res = await authFetch('/api/gifts/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao recusar');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gifts', 'pending', userId] }),
  });
}

export async function searchUser(nickname: string): Promise<UserPreview> {
  const res = await fetch(`/api/users/search?nickname=${encodeURIComponent(nickname)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Usuário não encontrado');
  return data;
}
