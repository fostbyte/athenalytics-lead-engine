'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number, title?: string) => void;
  success: (message: string, duration?: number, title?: string) => void;
  error: (message: string, duration?: number, title?: string) => void;
  info: (message: string, duration?: number, title?: string) => void;
  warning: (message: string, duration?: number, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 4000, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Auto-remove toast
    setTimeout(() => {
      removeToast(id);
    }, duration);

    setToasts((prev) => [...prev, { id, type, message, duration, title }]);
  }, [removeToast]);

  const success = useCallback((msg: string, dur?: number, title = 'Success') => toast(msg, 'success', dur, title), [toast]);
  const error = useCallback((msg: string, dur?: number, title = 'Error') => toast(msg, 'error', dur, title), [toast]);
  const info = useCallback((msg: string, dur?: number, title = 'Info') => toast(msg, 'info', dur, title), [toast]);
  const warning = useCallback((msg: string, dur?: number, title = 'Warning') => toast(msg, 'warning', dur, title), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          let bgClass = '';
          let icon = null;

          switch (t.type) {
            case 'success':
              bgClass = 'bg-emerald-950/90 border-emerald-800/80 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.15)]';
              icon = <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />;
              break;
            case 'error':
              bgClass = 'bg-red-950/90 border-red-800/80 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.15)]';
              icon = <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />;
              break;
            case 'warning':
              bgClass = 'bg-amber-950/90 border-amber-800/80 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.15)]';
              icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
              break;
            default:
              bgClass = 'bg-zinc-900/90 border-zinc-800/80 text-zinc-100 shadow-[0_0_20px_rgba(99,102,241,0.15)]';
              icon = <Info className="w-5 h-5 text-indigo-400 shrink-0" />;
              break;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md transition-all duration-300 transform translate-x-0 animate-slideIn ${bgClass}`}
            >
              {icon}
              <div className="flex-1 space-y-0.5 text-left">
                {t.title && <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">{t.title}</h4>}
                <p className="text-xs font-normal leading-relaxed text-zinc-200">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded-lg hover:bg-zinc-800/40 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
