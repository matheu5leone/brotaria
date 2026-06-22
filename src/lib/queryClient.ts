import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados ficam "fresh" por 30s; após isso revalida em background
      staleTime: 30_000,
      // Mantém cache por 5 min sem subscribers (ex.: ao trocar de página)
      gcTime: 5 * 60_000,
      // Não re-fetcha ao focar a janela (evita flash durante alt+tab)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
