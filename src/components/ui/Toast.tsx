"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastData {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
    return useContext(ToastContext);
}

const ICONS = {
    success: <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />,
    error: <XCircle size={16} className="text-rose-500 flex-shrink-0" />,
    info: <AlertCircle size={16} className="text-blue-500 flex-shrink-0" />,
};

const BARS = {
    success: "bg-emerald-500",
    error: "bg-rose-500",
    info: "bg-blue-500",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const counter = useRef(0);

    const showToast = useCallback((message: string, type: ToastType = "success") => {
        const id = ++counter.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    function dismiss(id: number) {
        setToasts(prev => prev.filter(t => t.id !== id));
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id}
                        className="pointer-events-auto flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl px-4 py-3 min-w-[260px] max-w-[360px] animate-toast-in overflow-hidden relative">
                        {ICONS[toast.type]}
                        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 flex-1 leading-snug">{toast.message}</p>
                        <button onClick={() => dismiss(toast.id)} className="text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 transition-colors">
                            <X size={14} />
                        </button>
                        {/* Barra de progreso */}
                        <div className={`absolute bottom-0 left-0 h-[3px] ${BARS[toast.type]} rounded-full animate-toast-bar`} />
                    </div>
                ))}
            </div>
            <style jsx global>{`
                @keyframes toast-in {
                    from { opacity: 0; transform: translateY(12px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)    scale(1); }
                }
                .animate-toast-in { animation: toast-in 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }

                @keyframes toast-bar {
                    from { width: 100%; }
                    to   { width: 0%; }
                }
                .animate-toast-bar { animation: toast-bar 3.5s linear forwards; }
            `}</style>
        </ToastContext.Provider>
    );
}
