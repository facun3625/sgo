"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Search, Loader2, ChevronDown, ChevronUp, Filter, X, RefreshCw } from "lucide-react";

interface LogEntry {
    id: number;
    adminId: number;
    adminNombre: string;
    expediente: string | null;
    modulo: string;
    accion: string;
    detalle: Record<string, unknown> | null;
    ip: string | null;
    createdAt: string;
}

const MODULO_COLORS: Record<string, string> = {
    usuarios:    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    tramites:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    tribunal:    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    cuotas:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    importar:    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    envios:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    config:      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    suspensiones:"bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    adhesiones:  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

function moduloColor(m: string) {
    return MODULO_COLORS[m] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
}

function formatFecha(iso: string) {
    return new Date(iso).toLocaleString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(0);
    const [admins, setAdmins] = useState<{ adminId: number; adminNombre: string }[]>([]);
    const [modulos, setModulos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<number | null>(null);

    // Filters
    const [expediente, setExpediente] = useState("");
    const [adminId, setAdminId] = useState("");
    const [modulo, setModulo] = useState("");
    const [accion, setAccion] = useState("");
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [page, setPage] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (expediente) params.set("expediente", expediente);
            if (adminId) params.set("adminId", adminId);
            if (modulo) params.set("modulo", modulo);
            if (accion) params.set("accion", accion);
            if (desde) params.set("desde", desde);
            if (hasta) params.set("hasta", hasta);
            params.set("page", String(page));

            const res = await fetch(`/api/admin/logs?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setTotal(data.total);
                setPages(data.pages);
                if (data.admins?.length) setAdmins(data.admins);
                if (data.modulos?.length) setModulos(data.modulos);
            }
        } finally {
            setLoading(false);
        }
    }, [expediente, adminId, modulo, accion, desde, hasta, page]);

    useEffect(() => { load(); }, [load]);

    function clearFilters() {
        setExpediente(""); setAdminId(""); setModulo("");
        setAccion(""); setDesde(""); setHasta(""); setPage(0);
    }

    const hasFilters = expediente || adminId || modulo || accion || desde || hasta;

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-500/10 flex items-center justify-center">
                        <ClipboardList size={20} className="text-slate-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Registro de Actividad</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Historial de acciones realizadas por administradores</p>
                    </div>
                </div>
                <button onClick={load} disabled={loading}
                    className="flex items-center gap-1.5 px-3 h-9 text-[12px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-all">
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Actualizar
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    <Filter size={12} /> Filtros
                    {hasFilters && (
                        <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-rose-500 hover:text-rose-600 normal-case font-semibold">
                            <X size={11} /> Limpiar filtros
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Expediente */}
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            value={expediente}
                            onChange={e => { setExpediente(e.target.value); setPage(0); }}
                            placeholder="Filtrar por expediente..."
                            className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[12px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50"
                        />
                    </div>

                    {/* Admin */}
                    <select value={adminId} onChange={e => { setAdminId(e.target.value); setPage(0); }}
                        className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[12px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50">
                        <option value="">Todos los administradores</option>
                        {admins.map(a => <option key={a.adminId} value={a.adminId}>{a.adminNombre}</option>)}
                    </select>

                    {/* Módulo */}
                    <select value={modulo} onChange={e => { setModulo(e.target.value); setPage(0); }}
                        className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[12px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50">
                        <option value="">Todos los módulos</option>
                        {modulos.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                    </select>

                    {/* Acción */}
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            value={accion}
                            onChange={e => { setAccion(e.target.value); setPage(0); }}
                            placeholder="Buscar acción..."
                            className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[12px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50"
                        />
                    </div>

                    {/* Desde */}
                    <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setPage(0); }}
                        className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[12px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50" />

                    {/* Hasta */}
                    <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setPage(0); }}
                        className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[12px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50" />
                </div>
            </div>

            {/* Contador */}
            <div className="flex items-center justify-between">
                <p className="text-[12px] text-slate-400">
                    {loading ? "Cargando..." : `${total.toLocaleString("es-AR")} registro${total !== 1 ? "s" : ""}`}
                </p>
                {pages > 1 && (
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">Página {page + 1} de {pages}</span>
                        <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                            className="px-2.5 h-7 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">← Ant.</button>
                        <button onClick={() => setPage(p => p + 1)} disabled={page >= pages - 1}
                            className="px-2.5 h-7 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">Sig. →</button>
                    </div>
                )}
            </div>

            {/* Tabla */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin text-slate-300" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <ClipboardList size={28} className="text-slate-200 dark:text-slate-700" />
                        <p className="text-[13px] text-slate-400">Sin registros para los filtros aplicados</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                        {logs.map(log => (
                            <div key={log.id}>
                                <div
                                    className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors"
                                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                >
                                    {/* Fecha */}
                                    <div className="w-32 shrink-0">
                                        <p className="text-[11px] text-slate-400">{formatFecha(log.createdAt)}</p>
                                    </div>

                                    {/* Admin */}
                                    <div className="w-40 shrink-0">
                                        <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300 truncate">{log.adminNombre}</p>
                                        {log.ip && <p className="text-[10px] text-slate-400 font-mono">{log.ip}</p>}
                                    </div>

                                    {/* Módulo */}
                                    <div className="w-28 shrink-0">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${moduloColor(log.modulo)}`}>
                                            {log.modulo}
                                        </span>
                                    </div>

                                    {/* Acción */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] text-slate-700 dark:text-slate-300 truncate">{log.accion}</p>
                                        {log.expediente && (
                                            <p className="text-[11px] text-slate-400">Mat. {log.expediente}</p>
                                        )}
                                    </div>

                                    {/* Expand */}
                                    {log.detalle && (
                                        <div className="shrink-0 text-slate-300 dark:text-slate-600">
                                            {expanded === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </div>
                                    )}
                                </div>

                                {/* Detalle expandido */}
                                {expanded === log.id && log.detalle && (
                                    <div className="px-5 pb-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-50 dark:border-slate-800/60">
                                        <div className="mt-3 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                            <div className="px-4 py-2 bg-slate-100/50 dark:bg-slate-800/50">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalle</p>
                                            </div>
                                            <div className="p-4 space-y-2">
                                                {Object.entries(log.detalle).map(([k, v]) => (
                                                    <div key={k} className="flex gap-3">
                                                        <span className="text-[11px] font-bold text-slate-400 min-w-[100px] shrink-0 capitalize">{k.replace(/_/g, " ")}</span>
                                                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-mono break-all">
                                                            {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v ?? "—")}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Paginador inferior */}
            {pages > 1 && !loading && (
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                        className="px-4 h-9 text-[12px] font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">← Anterior</button>
                    <span className="text-[12px] text-slate-400 px-2">Página {page + 1} de {pages}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= pages - 1}
                        className="px-4 h-9 text-[12px] font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">Siguiente →</button>
                </div>
            )}
        </div>
    );
}
