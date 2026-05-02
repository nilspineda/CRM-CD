import { getPendingOperations, removePendingOperation, isOnline, onConnectionChange } from './syncService';
import { supabase } from '../supabase';

const SYNC_INTERVAL = 30000;
let syncInterval = null;
let isSyncing = false;

const operationHandlers = {
  create: async (operation) => {
    const { table, data } = operation;
    const { data: result, error } = await supabase.from(table).insert(data).select().single();
    if (error) throw error;
    return result;
  },
  
  update: async (operation) => {
    const { table, data, id } = operation;
    const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select().single();
    if (error) throw error;
    return result;
  },
  
  delete: async (operation) => {
    const { table, id } = operation;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

export async function processSyncQueue(onProgress, onComplete, onError) {
  if (!isOnline()) {
    console.log('Offline - skipping sync');
    return { success: false, reason: 'offline' };
  }
  
  if (isSyncing) {
    return { success: false, reason: 'already_syncing' };
  }
  
  isSyncing = true;
  
  try {
    const operations = await getPendingOperations();
    
    if (operations.length === 0) {
      isSyncing = false;
      return { success: true, processed: 0 };
    }
    
    let processed = 0;
    let failed = 0;
    
    for (const op of operations) {
      try {
        const handler = operationHandlers[op.action];
        if (!handler) {
          console.error(`Unknown action: ${op.action}`);
          failed++;
          continue;
        }
        
        await handler(op);
        await removePendingOperation(op.id);
        processed++;
        
        if (onProgress) onProgress({ processed, total: operations.length, current: op });
      } catch (error) {
        console.error(`Failed to sync operation ${op.id}:`, error);
        failed++;
        
        if (op.retryCount < 3) {
          op.retryCount = (op.retryCount || 0) + 1;
        } else {
          console.error(`Max retries reached for operation ${op.id}`);
        }
      }
    }
    
    isSyncing = false;
    
    if (onComplete) onComplete({ processed, failed, total: operations.length });
    
    return { success: true, processed, failed };
  } catch (error) {
    isSyncing = false;
    if (onError) onError(error);
    throw error;
  }
}

export function startAutoSync(onProgress, onComplete, onError) {
  if (syncInterval) return;
  
  const sync = () => processSyncQueue(onProgress, onComplete, onError);
  
  sync();
  syncInterval = setInterval(sync, SYNC_INTERVAL);
  
  const unsubscribe = onConnectionChange((online) => {
    if (online) {
      console.log('Connection restored - triggering sync');
      sync();
    }
  });
  
  return () => {
    stopAutoSync();
    unsubscribe();
  };
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export function getPendingCount() {
  return getPendingOperations().then(ops => ops.length);
}