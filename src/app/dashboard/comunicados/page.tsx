"use client";

import { useState, useEffect } from "react";
import { Megaphone, Loader2, ChevronLeft, CheckCircle2, Clock } from "lucide-react";

interface Comunicado {
    id: number;
    destinatarioId: number;
    asunto: string;
    contenido: string;
    leido: boolean;
    leidoAt: string | null;
    createdAt: string;
}

function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "hace un momento";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)} días`;
    return new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ComunicadosPage() {
    const [comunicados, setComunicados] = useState<Comunicado[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Comunicado | null>(null);

    useEffect(() => {
        fetch("/api/user/comunicados", { cache: "no-store" })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setComunicados(data); })
            .finally(() => setLoading(false));
    }, []);

    async function open(c: Comunicado) {
        setSelected(c);
        // Always call API (marks notification as read too)
        await fetch(`/api/user/comunicados/${c.id}`);
        setComunicados(prev => prev.map(x => x.id === c.id ? { ...x, leido: true, leidoAt: new Date().toISOString() } : x));
        // Refrescar campana y badge del sidebar
        window.dispatchEvent(new CustomEvent("comunicado-leido"));
    }

    const unread = comunicados.filter(c => !c.leido).length;

    return (
        <div className="p-4 md:p-8">
            <div className="mb-5">
                {selected ? (
                    <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-slate-700 hover:text-slate-700 dark:hover:text-white transition-colors mb-2 text-[13px]">
                        <ChevronLeft size={15} /> Volver a comunicados
                    </button>
                ) : null}
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Megaphone size={20} className="text-amber-500" /> Comunicados
                </h1>
                <p className="text-slate-700 text-sm mt-0.5">
                    {selected ? selected.asunto : `Comunicaciones del CPASF${unread > 0 ? ` · ${unread} sin leer` : ""}`}
                </p>
            </div>

            {selected ? (
                /* Vista detalle */
                <div className="max-w-2xl">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-900/10">
                            <p className="text-[17px] font-bold text-slate-800 dark:text-white">{selected.asunto}</p>
                            <p className="text-[12px] text-slate-700 mt-1 flex items-center gap-2">
                                <span>CPASF · {timeAgo(selected.createdAt)}</span>
                                <span className="inline-flex items-center gap-1 text-emerald-500">
                                    <CheckCircle2 size={11} /> Leído
                                </span>
                            </p>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.contenido}</p>
                        </div>
                    </div>
                </div>
            ) : (
                /* Lista */
                <div className="max-w-2xl space-y-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-slate-300" />
                        </div>
                    ) : comunicados.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                            <Megaphone size={32} className="text-slate-200 dark:text-slate-700" />
                            <p className="text-[14px] text-slate-700">No tenés comunicados aún</p>
                        </div>
                    ) : comunicados.map(c => (
                        <button key={c.id} onClick={() => open(c)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all hover:border-amber-200 dark:hover:border-amber-800 hover:shadow-sm
                                ${!c.leido
                                    ? "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/50"
                                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                                }`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
                                        ${!c.leido ? "bg-amber-100 dark:bg-amber-900/30" : "bg-slate-100 dark:bg-slate-800"}`}>
                                        <Megaphone size={14} className={!c.leido ? "text-amber-500" : "text-slate-700"} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-[14px] truncate ${!c.leido ? "font-bold text-slate-800 dark:text-white" : "font-medium text-slate-600 dark:text-slate-300"}`}>
                                            {c.asunto}
                                        </p>
                                        <p className="text-[12px] text-slate-700 mt-0.5">CPASF</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <span className="text-[11px] text-slate-700">{timeAgo(c.createdAt)}</span>
                                    {!c.leido ? (
                                        <span className="w-2 h-2 bg-amber-400 rounded-full" />
                                    ) : (
                                        <CheckCircle2 size={12} className="text-slate-300 dark:text-slate-600" />
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
