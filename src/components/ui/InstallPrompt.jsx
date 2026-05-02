import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installed');
    }
    
    setDeferredPrompt(null);
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 animate-bounce-in">
      <div className="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-sm">
        <div className="bg-amber-500 p-2 rounded-lg">
          <Download size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Instalar CD CRM</p>
          <p className="text-xs text-slate-300">Añade a pantalla de inicio</p>
        </div>
        <button
          onClick={handleInstall}
          className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
    </div>
  );
}