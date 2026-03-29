"use client";

import { useEffect, useState } from "react";
import { UserCheck, X, Circle, CheckCircle2, ArrowLeftRight } from "lucide-react";

interface CamposDiff {
    [key: string]: { anterior: string; nuevo: string; label: string };
}

interface CambioDatos {
    id: number;
    expediente: string;
    campos: CamposDiff;
    leido: boolean;
    createdAt: string;
    usuario: { nombre: string; apellido: string; expediente: string } | null;
}

function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "hace un momento";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function CambiosDatosPage() {
    const [cambios, setCambios] = useState<CambioDatos[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<CambioDatos | null>(null);
    const [tab, setTab] = useState<"todos" | "no-leidos">("todos");

    const fetchCambios = async () => {
        const res = await fetch("/api/admin/cambios-datos");
        if (res.ok) setCambios(await res.json());
        setLoading(false);
    };

    useEffect(() => { fetchCambios(); }, []);

    const marcarLeido = async (cambio: CambioDatos) => {
        if (!cambio.leido) {
            await fetch(`/api/admin/cambios-datos/${cambio.id}`, { method: "PATCH" });
            setCambios(prev => prev.map(c => c.id === cambio.id ? { ...c, leido: true } : c));
            setSelected(prev => prev?.id === cambio.id ? { ...prev, leido: true } : prev);
        }
    };

    const handleSelect = (cambio: CambioDatos) => {
        setSelected(cambio);
        marcarLeido(cambio);
    };

    const filtrados = tab === "no-leidos" ? cambios.filter(c => !c.leido) : cambios;
    const noLeidos = cambios.filter(c => !c.leido).length;

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                    <UserCheck size={20} className="text-violet-500" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Modificaciones de Datos</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Historial de cambios en datos personales de matriculados</p>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{cambios.length}</p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sin leer</p>
                    <p className="text-3xl font-black text-violet-500">{noLeidos}</p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Leídos</p>
                    <p className="text-3xl font-black text-emerald-500">{cambios.length - noLeidos}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                {(["todos", "no-leidos"] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${tab === t
                            ? "bg-violet-500 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                    >
                        {t === "todos" ? "Todos" : `Sin leer (${noLeidos})`}
                    </button>
                ))}
            </div>

            <div className="flex gap-6">
                {/* Lista */}
                <div className={`flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden ${selected ? "hidden md:block md:max-w-[55%]" : ""}`}>
                    {loading ? (
                        <div className="p-12 text-center text-slate-400 text-sm">Cargando...</div>
                    ) : filtrados.length === 0 ? (
                        <div className="p-12 text-center">
                            <UserCheck size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm font-medium">Sin modificaciones registradas</p>
                        </div>
                    ) : (
                        <div>
                            <div className="grid grid-cols-[1fr_auto_auto] px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campos</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6">Fecha</span>
                            </div>
                            {filtrados.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handleSelect(c)}
                                    className={`w-full grid grid-cols-[1fr_auto_auto] items-center px-5 py-4 border-b border-slate-50 dark:border-slate-800/60 last:border-0 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${selected?.id === c.id ? "bg-violet-50 dark:bg-violet-900/10" : ""}`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {!c.leido && <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />}
                                        {c.leido && <div className="w-2 h-2 rounded-full shrink-0" />}
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                                {c.usuario ? `${c.usuario.apellido}, ${c.usuario.nombre}` : `Mat. ${c.expediente}`}
                                            </p>
                                            <p className="text-[11px] text-slate-400">Mat. {c.expediente}</p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg mx-4">
                                        {Object.keys(c.campos as object).length} campo{Object.keys(c.campos as object).length !== 1 ? "s" : ""}
                                    </span>
                                    <span className="text-[11px] text-slate-400">{timeAgo(c.createdAt)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Panel detalle */}
                {selected && (
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in">
                        {/* Header panel */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <p className="text-[13px] font-black text-slate-900 dark:text-white">
                                    {selected.usuario ? `${selected.usuario.apellido}, ${selected.usuario.nombre}` : `Mat. ${selected.expediente}`}
                                </p>
                                <p className="text-[11px] text-slate-400">Mat. {selected.expediente} · {timeAgo(selected.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {selected.leido ? (
                                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
                                        <CheckCircle2 size={11} /> Leído
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2.5 py-1 rounded-full">
                                        <Circle size={11} /> Sin leer
                                    </span>
                                )}
                                <button
                                    onClick={() => setSelected(null)}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    <X size={16} className="text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Campos modificados */}
                        <div className="p-6 space-y-3">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Campos modificados</p>
                            {Object.entries(selected.campos as CamposDiff).map(([key, diff]) => (
                                <div key={key} className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                            <ArrowLeftRight size={11} className="text-violet-500" />
                                            {diff.label}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
                                        <div className="px-4 py-3">
                                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Anterior</p>
                                            <p className="text-[13px] text-slate-700 dark:text-slate-300 font-medium break-words">
                                                {diff.anterior || <span className="text-slate-300 italic">vacío</span>}
                                            </p>
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Nuevo</p>
                                            <p className="text-[13px] text-slate-700 dark:text-slate-300 font-medium break-words">
                                                {diff.nuevo || <span className="text-slate-300 italic">vacío</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
