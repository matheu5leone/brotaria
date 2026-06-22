import { useQuery } from '@tanstack/react-query';
import { InventoryItem } from '@/types';

async function fetchInventory(userId: string): Promise<InventoryItem[]> {
  const res = await fetch(`/api/inventory?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export function useInventory(userId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', userId],
    queryFn: () => fetchInventory(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}
