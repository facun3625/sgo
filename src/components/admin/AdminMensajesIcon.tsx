"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mail, CheckCheck } from "lucide-react";
import Link from "next/link";

export default function AdminMensajesIcon() {
    const [count, setCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [clearing, setClearing] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/mensajes/unread");
            if (!res.ok) return;
            const data = await res.json();
            setCount(data.count ?? 0);
        } catch {}
    }, []);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 30000);
        window.addEventListener("admin-mensajes-leidos", refresh);
        return () => {
            clearInterval(interval);
            window.removeEventListener("admin-mensajes-leidos", refresh);
        };
    }, [refresh]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        if (open) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    async function marcarTodasLeidas() {
        setClearing(true);
        try {
            await fetch("/api/admin/mensajes/leer-todo", { method: "POST" });
            setCount(0);
            setOpen(false);
        } finally {
            setClearing(false);
        }
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className="p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-all relative"
                aria-label="Mensajes"
            >
                <Mail size={20} />
                {count > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-sky-400 text-white text-[9px] font-black rounded-full border-2 border-green-900 flex items-center justify-center leading-none">
                        {count > 9 ? "9+" : count}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl z-50 overflow-hidden">
                    <Link href="/admin/mensajes" onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-b border-slate-100 dark:border-slate-800">
                        <Mail size={15} className="text-sky-500" />
                        Ver mensajes {count > 0 && <span className="ml-auto text-[11px] font-black text-sky-500">{count} sin leer</span>}
                    </Link>
                    {count > 0 && (
                        <button onClick={marcarTodasLeidas} disabled={clearing}
                            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50">
                            <CheckCheck size={15} className="text-emerald-500" />
                            {clearing ? "Limpiando..." : "Marcar todas como leídas"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
