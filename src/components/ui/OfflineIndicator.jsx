import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { usePendingCount } from '../../lib/sync/useOfflineSync';

export default function OfflineIndicator() {
  const { pendingCount, isOffline, isSyncing, triggerSync } = usePendingCount();
  
  if (pendingCount === 0 && !isOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 max-w-sm sm:max-w-none mx-auto sm:mx-0">
      {isOffline && (
        <div className="bg-amber-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <WifiOff size={18} />
          <span className="text-sm font-medium flex-1">Sin conexión</span>
          {pendingCount > 0 && (
            <span className="bg-white/20 px-2 py-1 rounded text-xs font-medium">
              {pendingCount} pend.
            </span>
          )}
        </div>
      )}
      
      {!isOffline && pendingCount > 0 && (
        <div className="bg-slate-800 dark:bg-slate-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          {isSyncing ? (
            <>
              <RefreshCw size={18} className="animate-spin shrink-0" />
              <span className="text-sm font-medium flex-1">Sincronizando...</span>
            </>
          ) : (
            <>
              <AlertCircle size={18} className="text-amber-400 shrink-0" />
              <span className="text-sm font-medium flex-1">
                {pendingCount} cambio{pendingCount !== 1 ? 's' : ''} pend.
              </span>
              <button
                onClick={triggerSync}
                className="bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 touch-target"
              >
                Sync
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}