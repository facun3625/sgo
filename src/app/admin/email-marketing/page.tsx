"use client";

import { useState, useEffect, useCallback } from "react";
import { Megaphone, Send, Loader2, ChevronLeft, Users, CheckCircle2, XCircle, Clock, Search, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import RichTextEditor from "@/components/admin/RichTextEditor";

interface CampanaItem {
    id: number;
    asunto: string;
    totalEnvios: number;
    enviados: number;
    errores: number;
    pendientes: number;
    adminNombre: string;
    createdAt: string;
}

interface DestinatarioDetalle {
    id: number;
    expediente: string;
    nombre: string;
    email: string;
    estado: string;
    error: string | null;
    enviadoAt: string | null;
}

interface CampanaDetalle {
    id: number;
    asunto: string;
    contenido: string;
    enviarATodos: boolean;
    adminNombre: string;
    totalEnvios: number;
    createdAt: string;
    destinatarios: DestinatarioDetalle[];
}

function parseExpedientes(raw: string): string[] {
    return raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const ESTADO_STYLE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    enviado: { label: "Enviado", cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800", icon: <CheckCircle2 size={10} /> },
    error: { label: "Error", cls: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800", icon: <XCircle size={10} /> },
    pendiente: { label: "Pendiente", cls: "bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700", icon: <Clock size={10} /> },
};

export default function EmailMarketingPage() {
    const { showToast } = useToast();
    const [campanas, setCampanas] = useState<CampanaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<CampanaDetalle | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [searchDest, setSearchDest] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Formulario
    const [editorKey, setEditorKey] = useState(0);
    const [asunto, setAsunto] = useState("");
    const [contenido, setContenido] = useState("");
    const [expRaw, setExpRaw] = useState("");
    const [enviarATodos, setEnviarATodos] = useState(false);
    const [enviando, setEnviando] = useState(false);

    const uniqueParsed = [...new Set(parseExpedientes(expRaw))];

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch("/api/admin/email-marketing");
        const data = await res.json();
        if (Array.isArray(data)) setCampanas(data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    async function openDetail(id: number) {
        setLoadingDetail(true);
        setSelected(null);
        const res = await fetch(`/api/admin/email-marketing/${id}`);
        const data = await res.json();
        setSelected(data);
        setLoadingDetail(false);
    }

    async function enviar() {
        if (!asunto.trim() || !contenido.trim() || contenido === "<p></p>") return;
        if (!enviarATodos && uniqueParsed.length === 0) return;
        setEnviando(true);
        try {
            const res = await fetch("/api/admin/email-marketing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ asunto, contenido, expedientes: uniqueParsed, enviarATodos }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast(`Campaña creada — enviando a ${data.totalEnvios} destinatarios en segundo plano`, "success");
                setAsunto(""); setContenido(""); setExpRaw(""); setEnviarATodos(false);
                setEditorKey(k => k + 1);
                load();
            } else {
                showToast(data.error || "Error al crear la campaña", "error");
            }
        } finally {
            setEnviando(false);
        }
    }

    async function eliminar(id: number) {
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/email-marketing/${id}`, { method: "DELETE" });
            if (res.ok) {
                showToast("Campaña eliminada", "success");
                setConfirmDelete(null);
                setSelected(null);
                load();
            } else {
                showToast("Error al eliminar", "error");
            }
        } finally {
            setDeleting(false);
        }
    }

    const filteredDest = selected?.destinatarios.filter(d => {
        if (!searchDest) return true;
        const q = searchDest.toLowerCase();
        return d.expediente.toLowerCase().includes(q) || d.nombre.toLowerCase().includes(q) || d.email.toLowerCase().includes(q);
    }) ?? [];

    return (
        <div className="p-6 md:p-10 min-h-[calc(100vh-64px)]">
            <div className="flex items-center justify-between mb-6">
                <div>
                    {selected && (
                        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors mb-1">
                            <ChevronLeft size={16} /> <span className="text-[12px]">Volver</span>
                        </button>
                    )}
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Megaphone size={20} className="text-sky-500" />
                        {selected ? selected.asunto : "Email Marketing"}
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {selected
                            ? `Por ${selected.adminNombre} · ${fmtDate(selected.createdAt)} · ${selected.totalEnvios} destinatarios`
                            : "Enviá un mail independiente del portal, a todos o a expedientes puntuales"}
                    </p>
                </div>
                {selected && (
                    <button onClick={() => setConfirmDelete(selected.id)}
                        className="flex items-center gap-1.5 px-3 h-9 text-[12px] font-semibold text-rose-500 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                        <Trash2 size={13} /> Eliminar
                    </button>
                )}
            </div>

            {selected ? (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: "Total", value: selected.totalEnvios, cls: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300" },
                            { label: "Enviados", value: selected.destinatarios.filter(d => d.estado === "enviado").length, cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" },
                            { label: "Pendientes", value: selected.destinatarios.filter(d => d.estado === "pendiente").length, cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" },
                            { label: "Errores", value: selected.destinatarios.filter(d => d.estado === "error").length, cls: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400" },
                        ].map(s => (
                            <div key={s.label} className={`rounded-2xl p-4 ${s.cls}`}>
                                <p className="text-xl font-black">{s.value}</p>
                                <p className="text-[11px] font-medium opacity-70">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Contenido</p>
                        <div className="prose prose-sm max-w-none text-[13px] text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: selected.contenido }} />
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex-1">Registro de envío</p>
                            <div className="relative">
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={searchDest} onChange={e => setSearchDest(e.target.value)} placeholder="Buscar..."
                                    className="h-7 pl-7 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-300" />
                            </div>
                        </div>
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            <table className="w-full min-w-[600px]">
                                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                        <th className="text-left px-5 py-2.5">Matrícula</th>
                                        <th className="text-left px-5 py-2.5">Nombre</th>
                                        <th className="text-left px-5 py-2.5">Email</th>
                                        <th className="text-left px-5 py-2.5">Estado</th>
                                        <th className="text-left px-5 py-2.5">Fecha envío</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDest.map(d => {
                                        const est = ESTADO_STYLE[d.estado] ?? ESTADO_STYLE.pendiente;
                                        return (
                                            <tr key={d.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="px-5 py-3 text-[12px] font-mono text-slate-500 dark:text-slate-400">{d.expediente}</td>
                                                <td className="px-5 py-3 text-[12px] font-medium text-slate-800 dark:text-white">{d.nombre}</td>
                                                <td className="px-5 py-3 text-[12px] text-slate-500 dark:text-slate-400">{d.email}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${est.cls}`} title={d.error ?? undefined}>
                                                        {est.icon} {est.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-[11px] text-slate-400">
                                                    {d.enviadoAt ? new Date(d.enviadoAt).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Layout de dos columnas: formulario + preview en vivo */}
                    <div className="grid lg:grid-cols-2 gap-5">
                        {/* Formulario */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Nueva campaña</p>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-500">Asunto *</label>
                                <input value={asunto} onChange={e => setAsunto(e.target.value)}
                                    placeholder="Ej: Nuevo beneficio para matriculados"
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-500">Mensaje *</label>
                                <RichTextEditor key={editorKey} value={contenido} onChange={setContenido} placeholder="Escribí el contenido del mail..." />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-500">Destinatarios *</label>
                                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                                    <div onClick={() => setEnviarATodos(v => !v)}
                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${enviarATodos ? "bg-sky-500 border-sky-500" : "border-slate-300 dark:border-slate-600 group-hover:border-sky-400"}`}>
                                        {enviarATodos && (
                                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                    <span onClick={() => setEnviarATodos(v => !v)} className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                                        Enviar a todos los matriculados con email
                                    </span>
                                </label>
                                {!enviarATodos && (
                                    <>
                                        <p className="text-[11px] text-slate-400">Pegá los expedientes separados por <strong>coma</strong> o <strong>uno por línea</strong>.</p>
                                        <textarea value={expRaw} onChange={e => setExpRaw(e.target.value)}
                                            placeholder={"1234, 5678\n9012"} rows={3}
                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-sky-300/50 resize-none" />
                                        {uniqueParsed.length > 0 && (
                                            <p className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">{uniqueParsed.length} expediente{uniqueParsed.length !== 1 ? "s" : ""} detectado{uniqueParsed.length !== 1 ? "s" : ""}</p>
                                        )}
                                    </>
                                )}
                            </div>
                            <button onClick={enviar}
                                disabled={enviando || !asunto.trim() || !contenido.trim() || contenido === "<p></p>" || (!enviarATodos && uniqueParsed.length === 0)}
                                className="w-full flex items-center justify-center gap-2 h-11 bg-sky-500 text-white rounded-xl text-[13px] font-bold hover:bg-sky-600 disabled:opacity-50 transition-all">
                                {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                {enviando ? "Creando campaña..." : enviarATodos ? "Enviar a todos" : `Enviar a ${uniqueParsed.length || 0} destinatarios`}
                            </button>
                            <p className="text-[11px] text-slate-400 text-center">El envío corre en segundo plano, en tandas — no vas a quedar esperando acá.</p>
                        </div>

                        {/* Preview en vivo */}
                        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 flex flex-col">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Vista previa del mail</p>
                            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 overflow-y-auto max-h-[560px]">
                                <div className="text-center mb-5">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPASF · SGO</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-6">
                                    <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wide mb-3">{asunto || "Asunto del mail"}</p>
                                    {contenido && contenido !== "<p></p>" ? (
                                        <div className="prose prose-sm max-w-none text-[14px] text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: contenido }} />
                                    ) : (
                                        <p className="text-[13px] text-slate-300 italic">El contenido que escribas va a aparecer acá...</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Historial de campañas */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Campañas enviadas</p>
                        </div>
                        {loading ? (
                            <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
                        ) : campanas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-2">
                                <Megaphone size={28} className="text-slate-200 dark:text-slate-700" />
                                <p className="text-[13px] text-slate-400">Todavía no enviaste ninguna campaña</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px]">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                            <th className="text-left px-5 py-3">Asunto</th>
                                            <th className="text-left px-5 py-3">Fecha</th>
                                            <th className="text-left px-5 py-3">Destinatarios</th>
                                            <th className="text-left px-5 py-3">Estado</th>
                                            <th className="px-5 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {campanas.map(c => (
                                            <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="px-5 py-3.5 text-[13px] font-semibold text-slate-800 dark:text-white">{c.asunto}</td>
                                                <td className="px-5 py-3.5 text-[12px] text-slate-400">{fmtDate(c.createdAt)}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className="inline-flex items-center gap-1 text-[12px] text-slate-600 dark:text-slate-300">
                                                        <Users size={12} className="text-slate-400" /> {c.totalEnvios}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-[12px] text-slate-500">
                                                    {c.pendientes > 0
                                                        ? <span className="text-amber-500 font-semibold">Enviando... ({c.enviados}/{c.totalEnvios})</span>
                                                        : c.errores > 0
                                                            ? <span className="text-rose-500 font-semibold">{c.enviados} ok · {c.errores} con error</span>
                                                            : <span className="text-emerald-500 font-semibold">Completado</span>}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <button onClick={() => openDetail(c.id)}
                                                        disabled={loadingDetail}
                                                        className="px-3 h-7 text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-all">
                                                        Ver registro
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {confirmDelete !== null && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-sm shadow-2xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                                <Trash2 size={18} className="text-rose-500" />
                            </div>
                            <div>
                                <p className="text-[14px] font-bold text-slate-800 dark:text-white">Eliminar campaña</p>
                                <p className="text-[12px] text-slate-400">Esta acción no se puede deshacer.</p>
                            </div>
                        </div>
                        <p className="text-[13px] text-slate-600 dark:text-slate-300">Se eliminará el registro de la campaña. Si todavía está enviando, los envíos en curso no se interrumpen.</p>
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
