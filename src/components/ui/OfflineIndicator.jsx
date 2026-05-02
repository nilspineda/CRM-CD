import { WifiOff, Wifi, RefreshCw, AlertCircle } from 'lucide-react';
import { usePendingCount } from '../../lib/sync/useOfflineSync';

export default function OfflineIndicator() {
  const { pendingCount, isOffline, isSyncing, lastSync, triggerSync } = usePendingCount();
  
  if (pendingCount === 0 && !isOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {isOffline && (
        <div className="bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <WifiOff size={18} />
          <span className="text-sm font-medium">Sin conexión</span>
          {pendingCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
      
      {!isOffline && pendingCount > 0 && (
        <div className="bg-slate-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          {isSyncing ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span className="text-sm font-medium">Sincronizando...</span>
            </>
          ) : (
            <>
              <AlertCircle size={18} className="text-amber-400" />
              <span className="text-sm font-medium">
                {pendingCount} cambio{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
              </span>
              <button
                onClick={triggerSync}
                className="ml-2 bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded text-xs transition-colors"
              >
                Sincronizar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}