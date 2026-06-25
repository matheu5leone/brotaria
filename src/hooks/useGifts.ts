import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlantDNA } from '@/types';

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
  return useQuery<PendingGift[]>({
    queryKey: ['gifts', 'pending', userId],
    queryFn: async () => {
      const res = await fetch(`/api/gifts/pending?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch gifts');
      return res.json();
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useUnwrap(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      const res = await fetch('/api/inventory/unwrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, itemId }),
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
      const res = await fetch('/api/gifts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, itemId, recipientNickname, message }),
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
      const res = await fetch('/api/gifts/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, giftId }),
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
      const res = await fetch('/api/gifts/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, giftId }),
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
