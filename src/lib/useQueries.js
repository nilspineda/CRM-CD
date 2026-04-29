import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cuentasService } from '../features/cuentas/services/cuentasService';
import { clientesService } from '../features/clientes/services/clientesService';
import { movimientosService } from '../features/movimientos/services/movimientosService';

export const QUERY_KEYS = {
  cuentas: {
    all: ['cuentas'],
    activas: ['cuentas', 'activas'],
    byId: (id) => ['cuentas', id],
  },
  clientes: {
    all: ['clientes'],
    byId: (id) => ['clientes', id],
  },
  movimientos: {
    all: (filtros) => ['movimientos', filtros],
    stats: (fechas) => ['movimientos', 'stats', fechas],
   IVA: (fechas) => ['movimientos', 'iva', fechas],
  },
};

export function useCuentas() {
  return useQuery({
    queryKey: QUERY_KEYS.cuentas.all,
    queryFn: cuentasService.getAll,
  });
}

export function useCuentasActivas() {
  return useQuery({
    queryKey: QUERY_KEYS.cuentas.activas,
    queryFn: cuentasService.getActivas,
  });
}

export function useCrearCuenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cuentasService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cuentas.all });
    },
  });
}

export function useActualizarCuenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => cuentasService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cuentas.all });
    },
  });
}

export function useEliminarCuenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cuentasService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cuentas.all });
    },
  });
}

export function useActivarCuenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cuentasService.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cuentas.all });
    },
  });
}

export function useClientes() {
  return useQuery({
    queryKey: QUERY_KEYS.clientes.all,
    queryFn: clientesService.getAll,
  });
}

export function useCrearCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientes.all });
    },
  });
}

export function useActualizarCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => clientesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientes.all });
    },
  });
}

export function useMovimientos(filtros = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.movimientos.all,
    queryFn: () => movimientosService.getAll(filtros),
  });
}

export function useMovimientosStats(fechaInicio, fechaFin) {
  return useQuery({
    queryKey: QUERY_KEYS.movimientos.stats,
    queryFn: () => movimientosService.getEstadisticas(fechaInicio, fechaFin),
    enabled: !!fechaInicio && !!fechaFin,
  });
}

export function useCrearMovimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: movimientosService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movimientos.all });
    },
  });
}

export function useActualizarMovimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => movimientosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movimientos.all });
    },
  });
}

export function useAnularMovimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: movimientosService.anular,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.movimientos.all });
    },
  });
}