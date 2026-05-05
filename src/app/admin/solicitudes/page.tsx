"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Scale,
    Loader2,
    Search,
    X,
    ExternalLink,
    FileText,
    Send,
    XCircle,
    CheckCircle2,
    Clock,
    Inbox,
    ChevronRight,
    Download,
    Upload,
    Eye,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface SolicitudItem {
    id: number;
    expediente: string;
    tipo: string;
    fecha: string;
    estado: string;
    presentarAnte: string | null;
    emailLegal: string | null;
    adjunto: string | null;
    detalles: any;
    nombre: string | null;
    apellido: string | null;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function tipoBadge(tipo: string) {
    if (tipo.includes("Certificado"))
        return { label: "Certificado", cls: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30" };
    if (tipo.includes("SISFE"))
        return { label: "SISFE", cls: "bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900/30" };
    if (tipo.includes("CATASTRO") || tipo.includes("SIGIT"))
        return { label: "CATASTRO", cls: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30" };
    if (tipo.includes("Jurisprudencia"))
        return { label: "Jurisprudencia", cls: "bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-900/30" };
    if (tipo.includes("Suspensión") || tipo.includes("Cancelación"))
        return { label: tipo.includes("Cancelación") ? "Cancelación" : "Suspensión", cls: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30" };
    return { label: tipo, cls: "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" };
}

function estadoBadge(estado: string) {
    switch (estado) {
        case "completada":
            return { icon: <CheckCircle2 size={12} />, cls: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30", label: "Completada" };
        case "rechazada":
            return { icon: <XCircle size={12} />, cls: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30", label: "Rechazada" };
        default:
            return { icon: <Clock size={12} />, cls: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30", label: "Pendiente" };
    }
}

const ALL_TABS = [
    { key: "", label: "Todos" },
    { key: "pendiente", label: "Pendientes" },
    { key: "Certificado", label: "Certificados" },
    { key: "SISFE", label: "SISFE" },
    { key: "CATASTRO", label: "CATASTRO" },
    { key: "Jurisprudencia", label: "Jurisprudencia" },
];

// Sub-tab key → tab filter key mapping
const SUBTAB_MAP: Record<string, string> = {
    "solicitudes:Certificado": "Certificado",
    "solicitudes:SISFE": "SISFE",
    "solicitudes:CATASTRO": "CATASTRO",
    "solicitudes:Jurisprudencia": "Jurisprudencia",
};

// ─── main component ──────────────────────────────────────────────────────────

export default function AdminSolicitudesPage() {
    const { showToast } = useToast();

    const [solicitudes, setSolicitudes] = useState<SolicitudItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("");
    const [selected, setSelected] = useState<SolicitudItem | null>(null);
    const [permisos, setPermisos] = useState<string[] | null>(null); // null = superadmin
    const [panelOpen, setPanelOpen] = useState(false);

    // Action states
    const [claveInput, setClaveInput] = useState("");
    const [usuarioInput, setUsuarioInput] = useState("");
    const [motivoInput, setMotivoInput] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [resSol, resMe] = await Promise.all([
                fetch("/api/admin/solicitudes"),
                fetch("/api/admin/me"),
            ]);
            if (resSol.ok) {
                const data = await resSol.json();
                setSolicitudes(Array.isArray(data) ? data : []);
            }
            if (resMe.ok) {
                const me = await resMe.json();
                if (me.accessLevel === "superadmin") {
                    setPermisos(null);
                } else {
                    setPermisos(me.permisos || []);
                    // Si tiene sub-tabs restringidos, forzar tab "pendiente"
                    // Sin forzar tab: el admin restringido puede navegar entre estados
                }
            }
        } catch {
            showToast("Error al cargar trámites", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    // Tabs visibles según permisos
    const subtabsActivos = permisos === null ? null : permisos.filter(p => p.startsWith("solicitudes:"));
    const TABS = (() => {
        if (permisos === null || !subtabsActivos || subtabsActivos.length === 0) return ALL_TABS;
        // Solo mostrar las tabs habilitadas (siempre en modo pendiente)
        return ALL_TABS.filter(t => {
            if (t.key === "pendiente") return true;
            const needed = Object.entries(SUBTAB_MAP).find(([, v]) => v === t.key)?.[0];
            return needed ? subtabsActivos.includes(needed) : false;
        });
    })();

    // Reset inputs when selected changes
    useEffect(() => {
        setClaveInput("");
        setUsuarioInput("");
        setMotivoInput("");
    }, [selected]);

    // ── filtering ────────────────────────────────────────────────────────────

    const filtered = solicitudes.filter((s) => {
        // Si admin con sub-tabs restringidos: solo ver sus categorías (todos los estados)
        if (subtabsActivos && subtabsActivos.length > 0) {
            const allowedTipos = subtabsActivos.map(k => SUBTAB_MAP[k]).filter(Boolean);
            const tipoMatch = allowedTipos.some(t => s.tipo.includes(t));
            if (!tipoMatch) return false;
        }

        // Tab filter
        if (activeTab === "pendiente" && s.estado !== "pendiente") return false;
        if (activeTab === "Certificado" && !s.tipo.includes("Certificado")) return false;
        if (activeTab === "SISFE" && !s.tipo.includes("SISFE")) return false;
        if (activeTab === "CATASTRO" && !s.tipo.includes("CATASTRO") && !s.tipo.includes("SIGIT")) return false;
        if (activeTab === "Jurisprudencia" && !s.tipo.includes("Jurisprudencia")) return false;

        // Search filter
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                s.expediente.toLowerCase().includes(q) ||
                s.tipo.toLowerCase().includes(q) ||
                (s.nombre ?? "").toLowerCase().includes(q) ||
                (s.apellido ?? "").toLowerCase().includes(q)
            );
        }
        return true;
    });

    // ── summary counts ───────────────────────────────────────────────────────

    const total = solicitudes.length;
    const pendientes = solicitudes.filter((s) => s.estado === "pendiente").length;
    const completadas = solicitudes.filter((s) => s.estado === "completada").length;
    const rechazadas = solicitudes.filter((s) => s.estado === "rechazada").length;

    // ── actions ──────────────────────────────────────────────────────────────

    async function doAction(action: string, extra: Record<string, string> = {}) {
        if (!selected) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/solicitudes/${selected.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ...extra }),
            });
            if (!res.ok) throw new Error();
            const updated = await res.json();
            showToast("Respuesta enviada", "success");
            // Update local state
            setSolicitudes((prev) =>
                prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            );
            setSelected((prev) => (prev ? { ...prev, ...updated } : prev));
            // Close panel after 1.5s
            setTimeout(() => {
                setPanelOpen(false);
                setSelected(null);
            }, 1500);
        } catch {
            showToast("Error al enviar respuesta", "error");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!selected) return;
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingFile(true);
        try {
            const fd = new FormData();
            fd.append("id", String(selected.id));
            fd.append("file", file);
            const res = await fetch("/api/admin/solicitudes/upload", { method: "POST", body: fd });
            if (!res.ok) throw new Error();
            const { url } = await res.json();
            await doAction("adjunto", { url });
        } catch {
            showToast("Error al subir el archivo", "error");
        } finally {
            setUploadingFile(false);
        }
    }

    // ── open panel ───────────────────────────────────────────────────────────

    function openPanel(s: SolicitudItem) {
        setSelected(s);
        setPanelOpen(true);
    }

    function closePanel() {
        setPanelOpen(false);
        setTimeout(() => setSelected(null), 300);
    }

    // ── render ───────────────────────────────────────────────────────────────

    return (
        <div className="p-6 md:p-10 min-h-[calc(100vh-64px)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Scale size={20} className="text-amber-500" />
                        Gestión de Trámites
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {total} trámites registrados
                        {pendientes > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                                {pendientes} pendientes
                            </span>
                        )}
                    </p>
                </div>
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
                    <p className="text-[11px] text-emerald-500 uppercase tracking-wider font-semibold">Completadas</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{completadas}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-rose-900/30 p-4">
                    <p className="text-[11px] text-rose-500 uppercase tracking-wider font-semibold">Rechazadas</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{rechazadas}</p>
                </div>
            </div>

            {/* Tabs + Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="flex gap-1 flex-wrap">
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
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por expediente, nombre..."
                        className="h-9 pl-9 pr-4 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-800/20 transition-all"
                    />
                </div>
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
                        <p className="text-[13px] text-slate-400">Sin trámites en esta sección</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                        Usuario
                                    </th>
                                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                                        Fecha
                                    </th>
                                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {filtered.map((s) => {
                                    const tipo = tipoBadge(s.tipo);
                                    const est = estadoBadge(s.estado);
                                    return (
                                        <tr
                                            key={s.id}
                                            onClick={() => openPanel(s)}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                                        >
                                            <td className="px-5 py-3.5">
                                                <p className="text-[13px] font-bold text-slate-800 dark:text-white">
                                                    {s.apellido && s.nombre
                                                        ? `${s.apellido}, ${s.nombre}`
                                                        : s.expediente}
                                                </p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    Mat. {s.expediente}
                                                </p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${tipo.cls}`}>
                                                    {tipo.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 hidden md:table-cell">
                                                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                                                    {new Date(s.fecha).toLocaleDateString("es-AR")}
                                                </p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${est.cls}`}>
                                                    {est.icon}
                                                    {est.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail panel overlay (mobile) / side panel (desktop) */}
            {panelOpen && selected && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 z-40 md:bg-black/20"
                        onClick={closePanel}
                    />

                    {/* Panel */}
                    <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white dark:bg-[#02182b] z-50 flex flex-col border-l border-slate-100 dark:border-slate-800 overflow-hidden animate-slide-in-right">
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-[#02182b]">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                    <FileText size={17} className="text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white leading-tight">
                                        Detalle del Trámite
                                    </p>
                                    <p className="text-[11px] text-slate-400">#{selected.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={closePanel}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Panel body */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {/* User info */}
                            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Usuario</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-green-900/10 dark:bg-green-900/30 flex items-center justify-center text-green-800 dark:text-green-400 font-bold text-[14px]">
                                        {selected.apellido ? selected.apellido[0] : "?"}
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-bold text-slate-800 dark:text-white">
                                            {selected.apellido && selected.nombre
                                                ? `${selected.apellido}, ${selected.nombre}`
                                                : "—"}
                                        </p>
                                        <p className="text-[11px] text-slate-400">Mat. {selected.expediente}</p>
                                    </div>
                                </div>
                                {selected.emailLegal && (
                                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
                                        {selected.emailLegal}
                                    </p>
                                )}
                            </div>

                            {/* Tipo + Estado */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {(() => {
                                    const tipo = tipoBadge(selected.tipo);
                                    return (
                                        <span className={`px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider ${tipo.cls}`}>
                                            {selected.tipo}
                                        </span>
                                    );
                                })()}
                                {(() => {
                                    const est = estadoBadge(selected.estado);
                                    return (
                                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider ${est.cls}`}>
                                            {est.icon} {est.label}
                                        </span>
                                    );
                                })()}
                                <span className="text-[11px] text-slate-400">
                                    {new Date(selected.fecha).toLocaleDateString("es-AR", {
                                        day: "2-digit",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </span>
                            </div>

                            {/* Presentar ante */}
                            {selected.presentarAnte && (
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Presentar ante</p>
                                    <p className="text-[13px] text-slate-700 dark:text-slate-300">{selected.presentarAnte}</p>
                                </div>
                            )}

                            {/* Detalles JSON */}
                            {selected.detalles && Object.keys(selected.detalles).length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Datos del trámite</p>
                                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 space-y-2">
                                        {Object.entries(selected.detalles as Record<string, any>).map(([key, val]) => {
                                            if (key === "respuesta" || key === "rechazo") return null;
                                            if (typeof val === "object" && val !== null) return null;
                                            return (
                                                <div key={key} className="flex items-start justify-between gap-3">
                                                    <span className="text-[11px] font-semibold text-slate-400 capitalize min-w-[80px]">{key}</span>
                                                    <span className="text-[12px] text-slate-700 dark:text-slate-300 text-right">{String(val)}</span>
                                                </div>
                                            );
                                        })}
                                        {/* CATASTRO: CUIT prominently */}
                                        {(selected.tipo.includes("CATASTRO") || selected.tipo.includes("SIGIT")) && selected.detalles?.cuit && (
                                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">CUIT</p>
                                                <p className="text-[16px] font-black text-orange-600 dark:text-orange-400 tracking-widest mt-0.5">
                                                    {selected.detalles.cuit}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* CATASTRO: constancia adjunto */}
                            {(selected.tipo.includes("CATASTRO") || selected.tipo.includes("SIGIT")) && selected.adjunto && selected.estado === "pendiente" && (
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Constancia adjunta</p>
                                    <a
                                        href={selected.adjunto}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl text-[12px] font-semibold border border-orange-100 dark:border-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all"
                                    >
                                        <Download size={13} />
                                        Ver constancia
                                        <ExternalLink size={11} className="opacity-60" />
                                    </a>
                                </div>
                            )}

                            {/* Completada: show response */}
                            {selected.estado === "completada" && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 space-y-2">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Respuesta enviada
                                    </p>
                                    {selected.detalles?.respuesta?.clave && (
                                        <p className="text-[13px] text-emerald-700 dark:text-emerald-300">
                                            Clave SISFE: <strong>{selected.detalles.respuesta.clave}</strong>
                                        </p>
                                    )}
                                    {selected.detalles?.respuesta?.usuario && (
                                        <p className="text-[13px] text-emerald-700 dark:text-emerald-300">
                                            Usuario CATASTRO: <strong>{selected.detalles.respuesta.usuario}</strong>
                                        </p>
                                    )}
                                    {selected.tipo.includes("Jurisprudencia") && selected.adjunto && (
                                        <a
                                            href={selected.adjunto}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-[12px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                                        >
                                            <Download size={12} /> Ver documento adjunto
                                        </a>
                                    )}
                                    {selected.tipo.includes("Certificado") && selected.adjunto && (
                                        <a
                                            href={selected.adjunto}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-[12px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                                        >
                                            <Download size={12} /> Ver certificado PDF
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Rechazada: show reason */}
                            {selected.estado === "rechazada" && selected.detalles?.rechazo?.motivo && (
                                <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4">
                                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Motivo de rechazo</p>
                                    <p className="text-[13px] text-rose-700 dark:text-rose-300">{selected.detalles.rechazo.motivo}</p>
                                </div>
                            )}
                        </div>

                        {/* Action area */}
                        <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 p-5 space-y-3 bg-white dark:bg-[#02182b]">

                            {/* Certificado: view only */}
                            {selected.tipo.includes("Certificado") && (
                                <div className="flex gap-2">
                                    {selected.adjunto && (
                                        <a
                                            href={selected.adjunto}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 flex items-center justify-center gap-2 h-10 bg-blue-500 text-white rounded-xl text-[13px] font-bold hover:bg-blue-600 transition-all"
                                        >
                                            <Download size={14} /> Ver PDF
                                        </a>
                                    )}
                                    <a
                                        href={`/verificar/certificado/${selected.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 h-10 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-[13px] font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-all"
                                    >
                                        <Eye size={14} /> Verificar
                                        <ExternalLink size={12} className="opacity-60" />
                                    </a>
                                </div>
                            )}

                            {/* SISFE: send clave */}
                            {selected.tipo.includes("SISFE") && selected.estado === "pendiente" && (
                                <div className="space-y-2">
                                    <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                                        Clave SISFE
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            value={claveInput}
                                            onChange={(e) => setClaveInput(e.target.value)}
                                            placeholder="Ingresar clave..."
                                            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                                        />
                                        <button
                                            onClick={() => doAction("ssfe", { clave: claveInput })}
                                            disabled={submitting || !claveInput.trim()}
                                            className="flex items-center gap-1.5 px-4 h-10 bg-violet-600 text-white rounded-xl text-[13px] font-bold hover:bg-violet-700 disabled:opacity-40 transition-all"
                                        >
                                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                            Enviar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* CATASTRO: send usuario */}
                            {(selected.tipo.includes("CATASTRO") || selected.tipo.includes("SIGIT")) && selected.estado === "pendiente" && (
                                <div className="space-y-2">
                                    <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                                        Usuario CATASTRO/SIGIT
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            value={usuarioInput}
                                            onChange={(e) => setUsuarioInput(e.target.value)}
                                            placeholder="Ingresar usuario..."
                                            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-orange-300/40"
                                        />
                                        <button
                                            onClick={() => doAction("catastro", { usuario: usuarioInput })}
                                            disabled={submitting || !usuarioInput.trim()}
                                            className="flex items-center gap-1.5 px-4 h-10 bg-orange-500 text-white rounded-xl text-[13px] font-bold hover:bg-orange-600 disabled:opacity-40 transition-all"
                                        >
                                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                            Enviar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Jurisprudencia: upload PDF */}
                            {selected.tipo.includes("Jurisprudencia") && selected.estado === "pendiente" && (
                                <div className="space-y-2">
                                    <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                                        Adjuntar respuesta PDF
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingFile || submitting}
                                        className="w-full flex items-center justify-center gap-2 h-10 border-2 border-dashed border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-400 rounded-xl text-[13px] font-semibold hover:bg-teal-50 dark:hover:bg-teal-900/10 disabled:opacity-40 transition-all"
                                    >
                                        {uploadingFile || submitting
                                            ? <Loader2 size={14} className="animate-spin" />
                                            : <Upload size={14} />
                                        }
                                        {uploadingFile ? "Subiendo..." : "Seleccionar PDF de respuesta"}
                                    </button>
                                </div>
                            )}

                            {/* Suspensión/Cancelación: Aprobar */}
                            {(selected.tipo.toLowerCase().includes("suspensión") || selected.tipo.toLowerCase().includes("suspension") || selected.tipo.toLowerCase().includes("cancelación") || selected.tipo.toLowerCase().includes("cancelacion")) && selected.estado === "pendiente" && (
                                <button
                                    onClick={() => doAction("suspender", {})}
                                    disabled={submitting}
                                    className="w-full flex items-center justify-center gap-2 h-10 bg-emerald-600 text-white rounded-xl text-[13px] font-bold hover:bg-emerald-700 disabled:opacity-40 transition-all"
                                >
                                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    Aprobar solicitud
                                </button>
                            )}

                            {/* Rechazar (all pendientes) */}
                            {selected.estado === "pendiente" && (
                                <div className="space-y-2 pt-1">
                                    <div className="flex gap-2">
                                        <input
                                            value={motivoInput}
                                            onChange={(e) => setMotivoInput(e.target.value)}
                                            placeholder="Motivo de rechazo (opcional)..."
                                            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/40"
                                        />
                                        <button
                                            onClick={() => doAction("rechazar", { motivo: motivoInput })}
                                            disabled={submitting}
                                            className="flex items-center gap-1.5 px-4 h-10 bg-rose-500 text-white rounded-xl text-[13px] font-bold hover:bg-rose-600 disabled:opacity-40 transition-all"
                                        >
                                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                            Rechazar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            <style jsx global>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to   { transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.25s cubic-bezier(0.16,1,0.3,1) forwards;
                }
            `}</style>
        </div>
    );
}
