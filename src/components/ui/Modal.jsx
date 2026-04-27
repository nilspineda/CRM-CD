// filepath: src/components/ui/Modal.jsx
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-start sm:items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className={`relative bg-white rounded-lg shadow-2xl w-full ${sizes[size]} max-h-[calc(100svh-24px)] sm:max-h-[calc(100svh-32px)] overflow-hidden transform transition-all animate-scale-in`}>
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-5 border-b border-slate-200/60">
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 min-w-0 truncate">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Content */}
          <div className="px-4 py-4 sm:px-6 sm:py-5 overflow-y-auto max-h-[calc(100svh-92px)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
