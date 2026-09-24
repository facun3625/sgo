"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Megaphone, CalendarDays } from "lucide-react";
import Link from "next/link";
import { usePermisos } from "@/lib/permisos-context";

interface Notificacion {
    id: number;
    titulo: string;
    mensaje: string;
    tipo: string;
    leida: boolean;
    createdAt: string;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "hace un momento";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return `hace ${Math.floor(diff / 86400)} d`;
}

// Admin-only notification types and the permission key required to see them
const ADMIN_TIPO_PERMISO: Record<string, string> = {
    admin_debito: "adhesiones",
    admin_cambios: "cambios-datos",
    admin_import: "importar",
};

export default function NotificacionesBell() {
    const [open, setOpen] = useState(false);
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [marking, setMarking] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const { tiene } = usePermisos();

    const fetchNotificaciones = useCallback(async () => {
        try {
            const res = await fetch("/api/user/notificaciones");
            if (!res.ok) return;
            const data = await res.json();
            setNotificaciones(data.notificaciones ?? []);
            setUnreadCount(data.unreadCount ?? 0);
        } catch {
            // silencioso
        }
    }, []);

    useEffect(() => {
        fetchNotificaciones();
        const interval = setInterval(fetchNotificaciones, 30000);

        // Cross-tab: cuando admin envía masivo, notificar inmediatamente
        let bc: BroadcastChannel | null = null;
        try {
            bc = new BroadcastChannel("sgo-updates");
            bc.onmessage = (e) => { if (e.data?.type === "new-comunicado") fetchNotificaciones(); };
        } catch {}

        // Mismo tab: cuando el usuario lee un comunicado
        const onRead = () => fetchNotificaciones();
        window.addEventListener("comunicado-leido", onRead);

        return () => {
            clearInterval(interval);
            bc?.close();
            window.removeEventListener("comunicado-leido", onRead);
        };
    }, [fetchNotificaciones]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    async function marcarLeida(id: number) {
        setNotificaciones((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
        setUnreadCount((prev) => Math.max(0, prev - 1));
        fetch("/api/user/notificaciones/leer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        }).catch(() => {});
    }

    async function marcarTodasLeidas() {
        setMarking(true);
        try {
            await fetch("/api/user/notificaciones/leer", { method: "POST" });
            setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
            setUnreadCount(0);
        } finally {
            setMarking(false);
        }
    }

    const visibleNotificaciones = notificaciones.filter(n => {
        const requiredPermiso = ADMIN_TIPO_PERMISO[n.tipo];
        if (requiredPermiso) return tiene(requiredPermiso);
        return true;
    });
    const visibleUnreadCount = visibleNotificaciones.filter(n => !n.leida).length;
    const displayCount = visibleUnreadCount > 9 ? "9+" : String(visibleUnreadCount);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className={`p-2 rounded-xl transition-all duration-200 relative ${visibleUnreadCount > 0 ? "text-white hover:bg-white/10" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                aria-label="Notificaciones"
            >
                <Bell size={20} className={visibleUnreadCount > 0 ? "animate-bell-ring" : ""} />
                {visibleUnreadCount > 0 && (
                    <>
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-[#063f68] flex items-center justify-center leading-none">
                            {displayCount}
                        </span>
                    </>
                )}
            </button>

            {open && (
                <div className="fixed left-3 right-3 top-[4.25rem] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl z-50 overflow-hidden animate-fade-in">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-[14px] font-bold text-slate-800 dark:text-white">Notificaciones</p>
                        {visibleUnreadCount > 0 && (
                            <button
                                onClick={marcarTodasLeidas}
                                disabled={marking}
                                className="text-[12px] font-semibold text-[#063f68] dark:text-blue-400 hover:underline disabled:opacity-50 transition-all"
                            >
                                Marcar todas como leídas
                            </button>
                        )}
                    </div>

                    {/* Lista */}
                    <div className="max-h-80 overflow-y-auto">
                        {visibleNotificaciones.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <Bell size={28} className="text-slate-200 dark:text-slate-700" />
                                <p className="text-[13px] text-slate-700 font-medium">Sin notificaciones</p>
                            </div>
                        ) : (
                            visibleNotificaciones.map((n) => {
                                const isComunicado = n.tipo === "comunicado";
                                const isEvento = n.tipo === "evento";
                                const inner = (
                                    <div
                                        key={n.id}
                                        className={`px-4 py-3 border-b border-slate-50 dark:border-slate-800/60 last:border-0 flex gap-3 transition-colors
                                            ${!n.leida
                                                ? isComunicado ? "bg-amber-50/60 dark:bg-amber-900/10"
                                                : isEvento ? "bg-orange-50/60 dark:bg-orange-900/10"
                                                : "bg-blue-50/50 dark:bg-blue-900/10"
                                                : "hover:bg-slate-50 dark:hover:bg-slate-800/30"}`}
                                    >
                                        <div className="pt-0.5 flex-shrink-0">
                                            {isComunicado ? (
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${!n.leida ? "bg-amber-100 dark:bg-amber-900/30" : "bg-slate-100 dark:bg-slate-800"}`}>
                                                    <Megaphone size={12} className={!n.leida ? "text-amber-500" : "text-slate-700"} />
                                                </div>
                                            ) : isEvento ? (
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${!n.leida ? "bg-orange-100 dark:bg-orange-900/30" : "bg-slate-100 dark:bg-slate-800"}`}>
                                                    <CalendarDays size={12} className={!n.leida ? "text-orange-500" : "text-slate-700"} />
                                                </div>
                                            ) : (
                                                <div className="pt-1">
                                                    {!n.leida ? (
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-0.5" />
                                                    ) : (
                                                        <div className="w-2 h-2 rounded-full" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] font-bold text-slate-800 dark:text-white leading-snug">{n.titulo}</p>
                                            <p className="text-[13px] text-slate-700 mt-0.5 leading-snug">{n.mensaje}</p>
                                            <p className="text-[12px] text-slate-300 dark:text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                                        </div>
                                    </div>
                                );
                                const handleClick = () => {
                                    if (!n.leida) marcarLeida(n.id);
                                    setOpen(false);
                                };
                                const linkHref =
                                    n.tipo === "comunicado" ? "/dashboard/comunicados" :
                                    n.tipo === "tramite" ? "/dashboard/solicitudes/enviadas" :
                                    n.tipo === "debito" ? "/dashboard/solicitudes/adhesion-debito" :
                                    n.tipo === "admin_debito" ? "/admin/adhesiones" :
                                    n.tipo === "admin_cambios" ? "/admin/cambios-datos" :
                                    n.tipo === "admin_import" ? "/admin/importar" :
                                    n.tipo === "evento" ? "/dashboard/calendario" :
                                    null;
                                return linkHref ? (
                                    <Link key={n.id} href={linkHref} onClick={handleClick}>
                                        {inner}
                                    </Link>
                                ) : (
                                    <div key={n.id} onClick={handleClick} className="cursor-pointer">{inner}</div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
