'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';

export type AvatarSlot =
  | { id: string; locked: false; name: string; imageUrl: string; selected: boolean }
  | { id: string; locked: true };

export type AvatarPickerData = {
  slots: AvatarSlot[];
  unlockedCount: number;
  total: number;
};

export function useAvatars(enabled = true) {
  const { user } = useAuth();
  return useQuery<AvatarPickerData>({
    queryKey: ['avatars', user?.id],
    queryFn: async () => {
      const res = await authFetch('/api/avatars');
      if (!res.ok) throw new Error('Failed to fetch avatars');
      return res.json();
    },
    enabled: !!user && enabled,
    staleTime: 30_000,
  });
}

export function useSelectAvatar() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (avatarId: string) => {
      const res = await authFetch('/api/avatars/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao selecionar'), { code: data.code });
      return data as { avatarUrl: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avatars', user?.id] });
      qc.invalidateQueries({ queryKey: ['wallet', user?.id] }); // circle do perfil lê avatar_url daqui
    },
  });
}
