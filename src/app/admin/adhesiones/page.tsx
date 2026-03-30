"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Banknote, Loader2, CheckCircle2, XCircle, Clock, Inbox,
    ChevronRight, X, CreditCard, FileText, User, Search,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface AdhesionItem {
    id: number;
    expediente: string;
    tipoAdhesion: string;
    estado: string;
    dniFrontal: string | null;
    constanciaCbu: string | null;
    frontalTarjeta: string | null;
    createdAt: string;
    nombre: string | null;
    apellido: string | null;
}

function estadoBadge(estado: string) {
    switch (estado) {
        case "aprobada":
            return { icon: <CheckCircle2 size={12} />, cls: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30", label: "Aprobada" };
        case "rechazada":
            return { icon: <XCircle size={12} />, cls: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30", label: "Rechazada" };
        default:
            return { icon: <Clock size={12} />, cls: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30", label: "Pendiente" };
    }
}

const TABS = [
    { key: "", label: "Todas" },
    { key: "pendiente", label: "Pendientes" },
    { key: "aprobada", label: "Aprobadas" },
    { key: "rechazada", label: "Rechazadas" },
];

export default function AdminAdhesionesPage() {
    const { showToast } = useToast();
    const [adhesiones, setAdhesiones] = useState<AdhesionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("");
    const [selected, setSelected] = useState<AdhesionItem | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/adhesiones");
            if (res.ok) setAdhesiones(await res.json());
        } catch {
            showToast("Error al cargar adhesiones", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const filtered = adhesiones.filter((a) => {
        if (activeTab === "pendiente" && a.estado !== "pendiente") return false;
        if (activeTab === "aprobada" && a.estado !== "aprobada") return false;
        if (activeTab === "rechazada" && a.estado !== "rechazada") return false;
        if (search.trim()) return a.expediente.includes(search.trim());
        return true;
    });

    const total = adhesiones.length;
    const pendientes = adhesiones.filter((a) => a.estado === "pendiente").length;
    const aprobadas = adhesiones.filter((a) => a.estado === "aprobada").length;
    const rechazadas = adhesiones.filter((a) => a.estado === "rechazada").length;

    async function updateEstado(id: number, estado: string) {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/adhesiones/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado }),
            });
            if (!res.ok) throw new Error();
            const updated = await res.json();
            showToast(`Adhesión ${estado === "aprobada" ? "aprobada" : "rechazada"}`, "success");
            setAdhesiones((prev) => prev.map((a) => a.id === id ? { ...a, estado: updated.estado } : a));
            setSelected((prev) => prev ? { ...prev, estado: updated.estado } : prev);
            setTimeout(() => { setPanelOpen(false); setSelected(null); }, 1200);
        } catch {
            showToast("Error al actualizar", "error");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="p-6 md:p-10 min-h-[calc(100vh-64px)]">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Banknote size={20} className="text-emerald-500" />
                    Adhesiones a Débito Automático
                </h1>
                <p className="text-slate-400 text-sm mt-0.5">
                    {total} solicitudes registradas
                    {pendientes > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                            {pendientes} pendientes
                        </span>
                    )}
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{total}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-100 dark:border-amber-900/30 p-4">
                    <p className="text-[11px] text-amber-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                        Pendientes
                    </p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendientes}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 p-4">
                    <p className="text-[11px] text-emerald-500 uppercase tracking-wider font-semibold">Aprobadas</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{aprobadas}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-rose-900/30 p-4">
                    <p className="text-[11px] text-rose-500 uppercase tracking-wider font-semibold">Rechazadas</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{rechazadas}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 flex-wrap mb-4">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all
                            ${activeTab === tab.key
                                ? "bg-green-900 text-white"
                                : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Buscador */}
            <div className="relative mb-4">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Buscar por número de expediente..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-300 dark:focus:border-blue-600 text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                />
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin text-slate-300" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Inbox size={32} className="text-slate-200 dark:text-slate-700" />
                        <p className="text-[13px] text-slate-400">Sin adhesiones en esta sección</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Usuario</th>
                                    <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                                    <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                                    <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {filtered.map((a) => {
                                    const estado = estadoBadge(a.estado);
                                    return (
                                        <tr
                                            key={a.id}
                                            onClick={() => { setSelected(a); setPanelOpen(true); }}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 uppercase">
                                                    {a.apellido}, {a.nombre}
                                                </p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">Mat. {a.expediente}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${a.tipoAdhesion === "CBU" ? "bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-900/30" : "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30"}`}>
                                                    {a.tipoAdhesion === "CBU" ? <Banknote size={11} /> : <CreditCard size={11} />}
                                                    {a.tipoAdhesion}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-[12px] text-slate-500 dark:text-slate-400">
                                                {new Date(a.createdAt).toLocaleDateString("es-AR")}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${estado.cls}`}>
                                                    {estado.icon} {estado.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 ml-auto" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Panel */}
            {panelOpen && selected && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setPanelOpen(false); setSelected(null); }} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl overflow-y-auto flex flex-col animate-slide-left">
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                    <Banknote size={18} className="text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white">Adhesión a Débito</p>
                                    <p className="text-[11px] text-slate-400">#{selected.id}</p>
                                </div>
                            </div>
                            <button onClick={() => { setPanelOpen(false); setSelected(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 flex-1">
                            {/* User info */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                    <User size={18} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white uppercase">{selected.apellido}, {selected.nombre}</p>
                                    <p className="text-[11px] text-slate-400">Matrícula {selected.expediente}</p>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Tipo</p>
                                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{selected.tipoAdhesion}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Fecha</p>
                                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{new Date(selected.createdAt).toLocaleDateString("es-AR")}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 col-span-2">
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Estado actual</p>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${estadoBadge(selected.estado).cls}`}>
                                        {estadoBadge(selected.estado).icon} {estadoBadge(selected.estado).label}
                                    </span>
                                </div>
                            </div>

                            {/* Adjuntos */}
                            <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Documentos adjuntos</p>
                                <div className="space-y-2">
                                    {[
                                        { label: "DNI Frontal", url: selected.dniFrontal },
                                        { label: "Constancia CBU", url: selected.constanciaCbu },
                                        { label: "Frente Tarjeta", url: selected.frontalTarjeta },
                                    ].filter(d => d.url).map((doc) => (
                                        <a
                                            key={doc.label}
                                            href={doc.url!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                                <FileText size={15} className="text-blue-500" />
                                            </div>
                                            <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 flex-1">{doc.label}</span>
                                            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                                        </a>
                                    ))}
                                    {!selected.dniFrontal && !selected.constanciaCbu && !selected.frontalTarjeta && (
                                        <p className="text-[12px] text-slate-400 italic">Sin documentos adjuntos</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        {selected.estado === "pendiente" && (
                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => updateEstado(selected.id, "rechazada")}
                                    disabled={submitting}
                                    className="h-11 rounded-xl border-2 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-bold text-[12px] hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all disabled:opacity-50"
                                >
                                    Rechazar
                                </button>
                                <button
                                    onClick={() => updateEstado(selected.id, "aprobada")}
                                    disabled={submitting}
                                    className="h-11 rounded-xl bg-emerald-600 text-white font-bold text-[12px] hover:bg-emerald-700 transition-all disabled:opacity-50"
                                >
                                    {submitting ? "Guardando..." : "Aprobar"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
