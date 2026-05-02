import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { initDB, addPendingOperation, getPendingOperations, isOnline, onConnectionChange } from './syncService';
import { processSyncQueue, startAutoSync, stopAutoSync } from './syncQueue';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    initDB();
    
    const unsubscribe = onConnectionChange((online) => {
      setIsOffline(!online);
      if (online) {
        triggerSync();
      }
    });

    updatePendingCount();
    const autoSyncStop = startAutoSync(
      ({ processed, total }) => setIsSyncing(true),
      ({ processed, failed }) => {
        setIsSyncing(false);
        setLastSync(new Date());
        updatePendingCount();
      },
      (error) => {
        setIsSyncing(false);
        console.error('Sync error:', error);
      }
    );

    return () => {
      unsubscribe();
      autoSyncStop();
      stopAutoSync();
    };
  }, []);

  const updatePendingCount = async () => {
    try {
      const ops = await getPendingOperations();
      setPendingCount(ops.length);
    } catch (e) {
      console.error('Error updating pending count:', e);
    }
  };

  const triggerSync = useCallback(async () => {
    if (!isOnline()) return;
    
    setIsSyncing(true);
    try {
      await processSyncQueue(
        null,
        ({ processed, failed }) => {
          updatePendingCount();
        },
        (error) => {
          console.error('Sync failed:', error);
        }
      );
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return (
    <SyncContext.Provider value={{
      isOffline,
      pendingCount,
      isSyncing,
      lastSync,
      triggerSync,
      updatePendingCount
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within SyncProvider');
  }
  return context;
}

export function useOfflineMutation({
  table,
  mutationFn,
  action = 'create',
  onSuccess,
  onError,
  getId
}) {
  const queryClient = useQueryClient();
  const { isOffline, updatePendingCount } = useSyncContext();

  return useMutation({
    mutationFn: async (data) => {
      if (isOffline) {
        const pendingOp = {
          table,
          action,
          data,
          id: getId?.(data)
        };
        
        const id = await addPendingOperation(pendingOp);
        updatePendingCount();
        
        return { offline: true, localId: id, data };
      }
      
      return mutationFn(data);
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      if (onSuccess) onSuccess(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (onError) onError(error, variables, context);
    }
  });
}

export function usePendingCount() {
  const { pendingCount, isOffline, isSyncing, lastSync, triggerSync } = useSyncContext();
  return { pendingCount, isOffline, isSyncing, lastSync, triggerSync };
}