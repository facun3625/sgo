"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, Plus, X, Loader2, ChevronLeft, Users, CheckCircle2, Clock, AlertCircle, BarChart3, Search, Trash2, Upload, FileText, Download, RotateCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import CursoFlyerButton from "@/components/cursos-publicos/CursoFlyerButton";

interface EnvioItem {
    id: number;
    asunto: string;
    totalEnvios: number;
    leidos: number;
    createdAt: string;
}

interface TimelineBucket { date: string; count: number; }

interface DestinatarioDetalle {
    id: number;
    expediente: string;
    nombre: string;
    leido: boolean;
    leidoAt: string | null;
}

interface EnvioDetalle {
    id: number;
    asunto: string;
    contenido: string;
    adjuntoUrl: string | null;
    adjuntoTipo: string | null;
    totalEnvios: number;
    leidos: number;
    createdAt: string;
    timeline: TimelineBucket[];
    destinatarios: DestinatarioDetalle[];
}

function pct(leidos: number, total: number) {
    if (total === 0) return 0;
    return Math.round((leidos / total) * 100);
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateShort(d: string) {
    return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

function parseExpedientes(raw: string): string[] {
    return raw
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
}

function PctBar({ value }: { value: number }) {
    const color = value >= 60 ? "bg-emerald-400" : value >= 30 ? "bg-amber-400" : "bg-rose-400";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
            </div>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 w-8 text-right">{value}%</span>
        </div>
    );
}

export default function AdminEnviosPage() {
    const { showToast } = useToast();
    const [envios, setEnvios] = useState<EnvioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<EnvioDetalle | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [searchDest, setSearchDest] = useState("");

    // Modal crear
    const [showModal, setShowModal] = useState(false);
    const [newAsunto, setNewAsunto] = useState("");
    const [newContenido, setNewContenido] = useState("");
    const [newExpRaw, setNewExpRaw] = useState("");
    const [enviarATodos, setEnviarATodos] = useState(false);
    const [creando, setCreando] = useState(false);
    const [emailAsunto, setEmailAsunto] = useState("");
    const [emailCuerpo, setEmailCuerpo] = useState("");
    const [emailBtnUrl, setEmailBtnUrl] = useState("https://app.sgo-casf.online/");
    const [emailBtnTexto, setEmailBtnTexto] = useState("Ir al portal");
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [adjunto, setAdjunto] = useState<{ url: string; tipo: string; nombre: string } | null>(null);
    const [subiendoAdjunto, setSubiendoAdjunto] = useState(false);
    const [reenviando, setReenviando] = useState(false);

    const parsed = parseExpedientes(newExpRaw);
    const uniqueParsed = [...new Set(parsed)];

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch("/api/admin/envios");
        const data = await res.json();
        if (Array.isArray(data)) setEnvios(data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    async function openDetail(id: number) {
        setLoadingDetail(true);
        setSelected(null);
        const res = await fetch(`/api/admin/envios/${id}`);
        const data = await res.json();
        setSelected(data);
        setLoadingDetail(false);
    }

    async function handleUploadAdjunto(file: File) {
        setSubiendoAdjunto(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch("/api/admin/envios/upload", { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || "Error al subir el archivo", "error"); return; }
            setAdjunto({ url: data.url, tipo: data.tipo, nombre: file.name });
        } finally {
            setSubiendoAdjunto(false);
        }
    }

    async function crear() {
        if (!newAsunto.trim() || !newContenido.trim()) return;
        if (!enviarATodos && uniqueParsed.length === 0) return;
        setCreando(true);
        const res = await fetch("/api/admin/envios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                asunto: newAsunto, contenido: newContenido, expedientes: uniqueParsed, enviarATodos,
                emailAsunto, emailCuerpo, emailBtnUrl, emailBtnTexto,
                adjuntoUrl: adjunto?.url || null, adjuntoTipo: adjunto?.tipo || null,
            }),
        });
        const data = await res.json();
        if (res.ok) {
            const inv = data.invalid?.length ? ` (${data.invalid.length} no encontrados)` : "";
            showToast(`Enviado a ${data.totalEnvios} usuarios${inv}`, "success");
            setShowModal(false);
            setNewAsunto(""); setNewContenido(""); setNewExpRaw(""); setEnviarATodos(false);
            setEmailAsunto(""); setEmailCuerpo("");
            setEmailBtnUrl("https://app.sgo-casf.online/"); setEmailBtnTexto("Ir al portal");
            setAdjunto(null);
            try { new BroadcastChannel("sgo-updates").postMessage({ type: "new-comunicado" }); } catch {}
            load();
        } else {
            showToast(data.error || "Error al enviar", "error");
        }
        setCreando(false);
    }

    async function reenviarEmail(id: number) {
        setReenviando(true);
        try {
            const res = await fetch(`/api/admin/envios/${id}/reenviar`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                showToast(`Email reenviado a ${data.emailsEnviados} destinatarios`, "success");
            } else {
                showToast(data.error || "Error al reenviar", "error");
            }
        } finally {
            setReenviando(false);
        }
    }

    async function eliminar(id: number) {
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/envios/${id}`, { method: "DELETE" });
            if (res.ok) {
                showToast("Envío eliminado", "success");
                setConfirmDelete(null);
                setSelected(null);
                load();
            } else {
                showToast("Error al eliminar", "error");
            }
        } catch {
            showToast("Error de conexión", "error");
        } finally {
            setDeleting(false);
        }
    }

    const maxTimeline = selected ? Math.max(...selected.timeline.map(t => t.count), 1) : 1;

    const filteredDest = selected?.destinatarios.filter(d => {
        if (!searchDest) return true;
        const q = searchDest.toLowerCase();
        return d.expediente.toLowerCase().includes(q) || d.nombre.toLowerCase().includes(q);
    }) ?? [];

    return (
        <div className="p-6 md:p-10 min-h-[calc(100vh-64px)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div>
                    {selected ? (
                        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors mb-1">
                            <ChevronLeft size={16} /> <span className="text-[12px]">Volver a la lista</span>
                        </button>
                    ) : null}
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Send size={20} className="text-sky-500" />
                        {selected ? selected.asunto : "Envíos Masivos"}
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {selected
                            ? `Enviado el ${fmtDate(selected.createdAt)} · ${selected.totalEnvios} destinatarios`
                            : `${envios.length} campañas enviadas`}
                    </p>
                </div>
                {selected ? (
                    <div className="flex items-center gap-2">
                        <button onClick={() => reenviarEmail(selected.id)} disabled={reenviando}
                            className="flex items-center gap-1.5 px-3 h-9 text-[12px] font-semibold text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all disabled:opacity-50">
                            {reenviando ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
                            Reenviar email
                        </button>
                        <button onClick={() => setConfirmDelete(selected.id)}
                            className="flex items-center gap-1.5 px-3 h-9 text-[12px] font-semibold text-rose-500 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                            <Trash2 size={13} /> Eliminar
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-1.5 px-4 h-9 bg-sky-500 text-white rounded-xl text-[12px] font-bold hover:bg-sky-600 transition-all">
                        <Plus size={14} /> Nuevo envío
                    </button>
                )}
            </div>

            {/* Vista detalle */}
            {selected ? (
                <div className="space-y-5">
                    {/* Cards resumen */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: "Total enviados", value: selected.totalEnvios, icon: <Users size={16} />, color: "text-sky-500 bg-sky-50 dark:bg-sky-900/20" },
                            { label: "Leídos", value: selected.leidos, icon: <CheckCircle2 size={16} />, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
                            { label: "No leídos", value: selected.totalEnvios - selected.leidos, icon: <Clock size={16} />, color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
                            { label: "Tasa de apertura", value: `${pct(selected.leidos, selected.totalEnvios)}%`, icon: <BarChart3 size={16} />, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
                        ].map((card, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                                    {card.icon}
                                </div>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{card.value}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{card.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Contenido del mensaje */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                        {selected.adjuntoUrl && selected.adjuntoTipo === "imagen" && (
                            <div className="relative w-full h-48 bg-slate-100 dark:bg-slate-800">
                                <img src={selected.adjuntoUrl} alt="" className="w-full h-full object-cover" />
                                <CursoFlyerButton imagen={selected.adjuntoUrl} titulo={selected.asunto} />
                            </div>
                        )}
                        <div className="p-5">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Contenido del comunicado</p>
                            <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.contenido}</p>
                            {selected.adjuntoUrl && (selected.adjuntoTipo === "pdf" || selected.adjuntoTipo === "doc") && (
                                <a href={selected.adjuntoUrl} target="_blank" rel="noopener noreferrer"
                                    className="mt-4 inline-flex items-center gap-2 px-4 h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                                    {selected.adjuntoTipo === "pdf" ? <FileText size={13} /> : <Download size={13} />}
                                    Ver adjunto
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Lecturas en el tiempo</p>
                        {selected.timeline.length === 0 ? (
                            <div className="flex items-center gap-2 py-6 justify-center text-slate-400 text-[13px]">
                                <Clock size={16} /> Aún no hay lecturas registradas
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {selected.timeline.map((t, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-[11px] text-slate-400 w-24 flex-shrink-0 text-right">{fmtDateShort(t.date)}</span>
                                        <div className="flex-1 h-6 bg-slate-50 dark:bg-slate-800 rounded-lg overflow-hidden">
                                            <div
                                                className="h-full bg-sky-400 rounded-lg flex items-center justify-end pr-2 transition-all duration-500"
                                                style={{ width: `${Math.max((t.count / maxTimeline) * 100, 4)}%` }}
                                            >
                                                <span className="text-[10px] font-bold text-white leading-none">{t.count}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tabla destinatarios */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex-1">Destinatarios</p>
                            <div className="relative">
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={searchDest} onChange={e => setSearchDest(e.target.value)}
                                    placeholder="Buscar..."
                                    className="h-7 pl-7 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-300" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[500px]">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                        <th className="text-left px-5 py-2.5">Matrícula</th>
                                        <th className="text-left px-5 py-2.5">Nombre</th>
                                        <th className="text-left px-5 py-2.5">Estado</th>
                                        <th className="text-left px-5 py-2.5">Fecha lectura</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDest.map(d => (
                                        <tr key={d.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-5 py-3 text-[12px] font-mono text-slate-500 dark:text-slate-400">{d.expediente}</td>
                                            <td className="px-5 py-3 text-[12px] font-medium text-slate-800 dark:text-white">{d.nombre}</td>
                                            <td className="px-5 py-3">
                                                {d.leido ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-100 dark:border-emerald-800">
                                                        <CheckCircle2 size={10} /> Leído
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-400 text-[10px] font-bold rounded-full border border-slate-100 dark:border-slate-700">
                                                        <Clock size={10} /> Pendiente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-[11px] text-slate-400">
                                                {d.leidoAt ? new Date(d.leidoAt).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                /* Lista de envíos */
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={24} className="animate-spin text-slate-300" />
                        </div>
                    ) : envios.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Send size={32} className="text-slate-200 dark:text-slate-700" />
                            <p className="text-[13px] text-slate-400">No hay envíos masivos aún</p>
                            <button onClick={() => setShowModal(true)}
                                className="mt-2 px-4 h-9 bg-sky-500 text-white rounded-xl text-[12px] font-bold hover:bg-sky-600 transition-all">
                                Crear el primero
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                        <th className="text-left px-5 py-3">Asunto</th>
                                        <th className="text-left px-5 py-3">Enviado</th>
                                        <th className="text-left px-5 py-3">Destinatarios</th>
                                        <th className="text-left px-5 py-3 min-w-[160px]">Apertura</th>
                                        <th className="px-5 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {envios.map(e => (
                                        <tr key={e.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <p className="text-[13px] font-semibold text-slate-800 dark:text-white">{e.asunto}</p>
                                            </td>
                                            <td className="px-5 py-3.5 text-[12px] text-slate-400">{fmtDate(e.createdAt)}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center gap-1 text-[12px] text-slate-600 dark:text-slate-300">
                                                    <Users size={12} className="text-slate-400" /> {e.totalEnvios}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 min-w-[160px]">
                                                <PctBar value={pct(e.leidos, e.totalEnvios)} />
                                                <p className="text-[10px] text-slate-400 mt-0.5">{e.leidos} de {e.totalEnvios} leídos</p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => loadingDetail ? null : openDetail(e.id)}
                                                        className="px-3 h-7 text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-all flex items-center gap-1">
                                                        <BarChart3 size={11} /> Ver stats
                                                    </button>
                                                    <button onClick={ev => { ev.stopPropagation(); setConfirmDelete(e.id); }}
                                                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all">
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal nuevo envío */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <p className="text-[14px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Send size={14} className="text-sky-500" /> Nuevo envío masivo
                            </p>
                            <button onClick={() => setShowModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-500">Asunto *</label>
                                <input value={newAsunto} onChange={e => setNewAsunto(e.target.value)}
                                    placeholder="Ej: Recordatorio de pagos - Marzo 2026"
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-500">Mensaje *</label>
                                <textarea value={newContenido} onChange={e => setNewContenido(e.target.value)}
                                    placeholder="Escribí el contenido del comunicado..." rows={5}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50 resize-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-500">Adjunto (imagen, PDF o Word) — opcional</label>
                                <p className="text-[11px] text-slate-400">Queda disponible dentro del comunicado en el portal. No se envía por email.</p>
                                {adjunto ? (
                                    <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-700/30 bg-emerald-50 dark:bg-emerald-900/10">
                                        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                                        <span className="text-[12px] text-emerald-700 dark:text-emerald-400 flex-1 truncate">{adjunto.nombre}</span>
                                        <button type="button" onClick={() => setAdjunto(null)}>
                                            <X size={14} className="text-slate-400" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                        {subiendoAdjunto ? <Loader2 size={15} className="animate-spin text-slate-400" /> : <Upload size={15} className="text-slate-400" />}
                                        <span className="text-[12px] text-slate-400">{subiendoAdjunto ? "Subiendo..." : "Subir imagen, PDF o Word"}</span>
                                        <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx"
                                            onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadAdjunto(f); }} disabled={subiendoAdjunto} />
                                    </label>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-500">Destinatarios *</label>

                                {/* Tilde enviar a todos */}
                                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                                    <div
                                        onClick={() => setEnviarATodos(v => !v)}
                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${enviarATodos ? "bg-sky-500 border-sky-500" : "border-slate-300 dark:border-slate-600 group-hover:border-sky-400"}`}
                                    >
                                        {enviarATodos && (
                                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                    <span onClick={() => setEnviarATodos(v => !v)} className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                                        Enviar a todos los usuarios
                                    </span>
                                </label>

                                {!enviarATodos && (
                                    <>
                                        <p className="text-[11px] text-slate-400 leading-relaxed">
                                            Pegá los expedientes separados por <strong>coma</strong> o <strong>uno por línea</strong>. Ej:<br />
                                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">1234, 5678, 9012</span>
                                            &nbsp;o&nbsp;
                                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">1234↵5678↵9012</span>
                                        </p>
                                        <textarea value={newExpRaw} onChange={e => setNewExpRaw(e.target.value)}
                                            placeholder={"1234, 5678\n9012\n3456"} rows={5}
                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-sky-300/50 resize-none" />
                                        {uniqueParsed.length > 0 && (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-xl">
                                                <AlertCircle size={13} className="text-sky-500 flex-shrink-0" />
                                                <p className="text-[12px] text-sky-700 dark:text-sky-300">
                                                    <strong>{uniqueParsed.length}</strong> expediente{uniqueParsed.length !== 1 ? "s" : ""} detectado{uniqueParsed.length !== 1 ? "s" : ""}. Los inválidos serán ignorados al enviar.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {enviarATodos && (
                                    <div className="flex items-center gap-2 px-3 py-2.5 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-xl">
                                        <Users size={13} className="text-sky-500 flex-shrink-0" />
                                        <p className="text-[12px] text-sky-700 dark:text-sky-300 font-medium">
                                            Se enviará a <strong>todos los usuarios registrados</strong> en el sistema.
                                        </p>
                                    </div>
                                )}
                            </div>
                            {/* Sección email */}
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Correo electrónico</p>
                                <p className="text-[11px] text-slate-400">Se enviará a los matriculados que tengan email registrado. El link al portal se incluye siempre.</p>
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-semibold text-slate-500">Asunto del email</label>
                                    <input
                                        value={emailAsunto}
                                        onChange={e => setEmailAsunto(e.target.value)}
                                        placeholder={newAsunto || "Igual al asunto del comunicado"}
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-semibold text-slate-500">Cuerpo del email</label>
                                    <textarea
                                        value={emailCuerpo}
                                        onChange={e => setEmailCuerpo(e.target.value)}
                                        placeholder={"Escribí el texto del email..."}
                                        rows={4}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50 resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-semibold text-slate-500">Texto del botón</label>
                                        <input
                                            value={emailBtnTexto}
                                            onChange={e => setEmailBtnTexto(e.target.value)}
                                            placeholder="Ir al portal"
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-semibold text-slate-500">URL del botón</label>
                                        <input
                                            value={emailBtnUrl}
                                            onChange={e => setEmailBtnUrl(e.target.value)}
                                            placeholder="https://app.sgo-casf.online/"
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 px-5 pb-5">
                            <button onClick={() => setShowModal(false)}
                                className="flex-1 h-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Cancelar
                            </button>
                            <button onClick={crear}
                                disabled={creando || !newAsunto.trim() || !newContenido.trim() || (!enviarATodos && uniqueParsed.length === 0)}
                                className="flex-1 flex items-center justify-center gap-2 h-10 bg-sky-500 text-white rounded-xl text-[13px] font-bold hover:bg-sky-600 disabled:opacity-50 transition-all">
                                {creando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                {enviarATodos ? "Enviar a todos" : `Enviar a ${uniqueParsed.length || "0"} usuarios`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmación eliminar */}
            {confirmDelete !== null && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-sm shadow-2xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                                <Trash2 size={18} className="text-rose-500" />
                            </div>
                            <div>
                                <p className="text-[14px] font-bold text-slate-800 dark:text-white">Eliminar envío</p>
                                <p className="text-[12px] text-slate-400">Esta acción no se puede deshacer.</p>
                            </div>
                        </div>
                        <p className="text-[13px] text-slate-600 dark:text-slate-300">
                            Se eliminará el envío y el registro de todos sus destinatarios. Los comunicados ya leídos por los usuarios seguirán visibles en sus paneles.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                                className="flex-1 h-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50">
                                Cancelar
                            </button>
                            <button onClick={() => eliminar(confirmDelete)} disabled={deleting}
                                className="flex-1 flex items-center justify-center gap-2 h-10 bg-rose-500 text-white rounded-xl text-[13px] font-bold hover:bg-rose-600 disabled:opacity-50 transition-all">
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
