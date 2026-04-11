"use client";

import { useState, useEffect, useCallback } from "react";
import { Landmark, Loader2, CheckCircle2, XCircle, Clock, ExternalLink, ChevronDown } from "lucide-react";

interface PagoPendiente {
    id: number;
    expediente: string;
    tipo: string;
    tipoLabel: string;
    ref: string;
    monto: number;
    comprobante: string;
    estado: string;
    nota: string | null;
    createdAt: string;
    usuario: { nombre: string; apellido: string } | null;
}

type FilterEstado = "todos" | "pendiente" | "aprobado" | "rechazado";

const ESTADO_STYLE: Record<string, string> = {
    pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    aprobado:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    rechazado: "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400",
};

export default function TransferenciasAdminPage() {
    const [pagos, setPagos] = useState<PagoPendiente[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterEstado>("pendiente");
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [notaMap, setNotaMap] = useState<Record<number, string>>({});
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const fetchPagos = useCallback(async () => {
        setLoading(true);
        const res = await fetch("/api/admin/transferencias");
        if (res.ok) setPagos(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchPagos(); }, [fetchPagos]);

    async function accionar(id: number, accion: "aprobar" | "rechazar") {
        setProcessingId(id);
        const res = await fetch(`/api/admin/transferencias/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accion, nota: notaMap[id] ?? "" }),
        });
        if (res.ok) await fetchPagos();
        setProcessingId(null);
    }

    const filtered = filter === "todos" ? pagos : pagos.filter((p) => p.estado === filter);
    const countFor = (est: string) => est === "todos" ? pagos.length : pagos.filter((p) => p.estado === est).length;

    const TABS: { key: FilterEstado; label: string }[] = [
        { key: "pendiente", label: "Pendientes" },
        { key: "aprobado",  label: "Aprobados" },
        { key: "rechazado", label: "Rechazados" },
        { key: "todos",     label: "Todos" },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Landmark size={20} className="text-slate-500" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Transferencias</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Comprobantes pendientes de acreditación manual</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
                {TABS.map((t) => (
                    <button key={t.key} onClick={() => setFilter(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-3 text-[12px] font-semibold transition-all whitespace-nowrap border-b-2
                            ${filter === t.key ? "border-[#063f68] text-[#063f68] dark:border-blue-400 dark:text-blue-400" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                        {t.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filter === t.key ? "bg-[#063f68]/10 text-[#063f68] dark:bg-blue-400/10 dark:text-blue-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                            {countFor(t.key)}
                        </span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Landmark size={28} className="text-slate-200 dark:text-slate-700" />
                    <p className="text-[13px] text-slate-400">Sin transferencias en esta categoría</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((p) => {
                        const expanded = expandedId === p.id;
                        return (
                            <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                {/* Header */}
                                <button className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-left"
                                    onClick={() => setExpandedId(expanded ? null : p.id)}>
                                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
                                        <div>
                                            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Usuario</p>
                                            <p className="text-[13px] font-bold text-slate-800 dark:text-white truncate">
                                                {p.usuario ? `${p.usuario.apellido}, ${p.usuario.nombre}` : p.expediente}
                                            </p>
                                            <p className="text-[10px] text-slate-400">{p.expediente}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Concepto</p>
                                            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{p.tipoLabel}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Monto</p>
                                            <p className="text-[13px] font-black text-slate-800 dark:text-white">${p.monto.toLocaleString("es-AR")}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Estado</p>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTADO_STYLE[p.estado] ?? ""}`}>
                                                {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                                </button>

                                {/* Expanded */}
                                {expanded && (
                                    <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <a href={p.comprobante} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[12px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                                                <ExternalLink size={13} /> Ver comprobante
                                            </a>
                                            <span className="text-[11px] text-slate-400">
                                                {new Date(p.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>

                                        {p.nota && (
                                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[12px] text-slate-500 dark:text-slate-400">
                                                <strong>Nota:</strong> {p.nota}
                                            </div>
                                        )}

                                        {p.estado === "pendiente" && (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold block mb-1.5">
                                                        Nota (opcional — visible al usuario si rechazás)
                                                    </label>
                                                    <input type="text" value={notaMap[p.id] ?? ""} onChange={(e) => setNotaMap((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                                        placeholder="Ej: El monto no coincide..."
                                                        className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => accionar(p.id, "aprobar")} disabled={processingId === p.id}
                                                        className="flex items-center gap-2 px-5 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold disabled:opacity-50 transition-all">
                                                        {processingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                                        Aprobar
                                                    </button>
                                                    <button onClick={() => accionar(p.id, "rechazar")} disabled={processingId === p.id}
                                                        className="flex items-center gap-2 px-5 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold disabled:opacity-50 transition-all">
                                                        {processingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                                                        Rechazar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
