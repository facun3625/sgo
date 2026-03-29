"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, Plus, X, Loader2, ChevronLeft, Users, CheckCircle2, Clock, AlertCircle, BarChart3, Search } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

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
    const [creando, setCreando] = useState(false);

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

    async function crear() {
        if (!newAsunto.trim() || !newContenido.trim() || uniqueParsed.length === 0) return;
        setCreando(true);
        const res = await fetch("/api/admin/envios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ asunto: newAsunto, contenido: newContenido, expedientes: uniqueParsed }),
        });
        const data = await res.json();
        if (res.ok) {
            const inv = data.invalid?.length ? ` (${data.invalid.length} no encontrados)` : "";
            showToast(`Enviado a ${data.totalEnvios} usuarios${inv}`, "success");
            setShowModal(false);
            setNewAsunto(""); setNewContenido(""); setNewExpRaw("");
            // Notificar a tabs de usuario en el mismo browser
            try { new BroadcastChannel("sgo-updates").postMessage({ type: "new-comunicado" }); } catch {}
            load();
        } else {
            showToast(data.error || "Error al enviar", "error");
        }
        setCreando(false);
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
                {!selected && (
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
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Contenido del comunicado</p>
                        <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.contenido}</p>
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
                                                <button onClick={() => loadingDetail ? null : openDetail(e.id)}
                                                    className="px-3 h-7 text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-all flex items-center gap-1">
                                                    <BarChart3 size={11} /> Ver stats
                                                </button>
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
                                <label className="text-[12px] font-semibold text-slate-500">Destinatarios *</label>
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
                            </div>
                        </div>
                        <div className="flex gap-3 px-5 pb-5">
                            <button onClick={() => setShowModal(false)}
                                className="flex-1 h-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Cancelar
                            </button>
                            <button onClick={crear}
                                disabled={creando || !newAsunto.trim() || !newContenido.trim() || uniqueParsed.length === 0}
                                className="flex-1 flex items-center justify-center gap-2 h-10 bg-sky-500 text-white rounded-xl text-[13px] font-bold hover:bg-sky-600 disabled:opacity-50 transition-all">
                                {creando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                Enviar a {uniqueParsed.length || "0"} usuarios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
