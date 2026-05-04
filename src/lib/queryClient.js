import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 15 min: datos no se re-fetchen al volver a una página ya visitada
      staleTime: 15 * 60 * 1000,
      // 30 min: mantener cache en memoria al navegar entre módulos
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});