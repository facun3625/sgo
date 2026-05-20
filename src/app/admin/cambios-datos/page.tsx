"use client";

import { useEffect, useState, useCallback } from "react";
import { UserCheck, X, Circle, CheckCircle2, ArrowLeftRight, Download, ChevronLeft, ChevronRight, CheckSquare, Square } from "lucide-react";
import * as XLSX from "xlsx";

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

function exportarXLSX(seleccionados: CambioDatos[]) {
    const filas: Record<string, string>[] = [];
    for (const c of seleccionados) {
        const apellido = c.usuario?.apellido ?? "";
        const nombre = c.usuario?.nombre ?? "";
        const fecha = new Date(c.createdAt).toLocaleDateString("es-AR");
        for (const [, diff] of Object.entries(c.campos as CamposDiff)) {
            filas.push({ Matrícula: c.expediente, Apellido: apellido, Nombre: nombre, Campo: diff.label, Anterior: diff.anterior, Nuevo: diff.nuevo, Fecha: fecha });
        }
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, ws, "Cambios");
    XLSX.writeFile(wb, `cambios-datos-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function CambiosDatosPage() {
    const [cambios, setCambios] = useState<CambioDatos[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<CambioDatos | null>(null);
    const [tab, setTab] = useState<"todos" | "no-leidos">("todos");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [sinLeer, setSinLeer] = useState(0);
    const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

    const fetchCambios = useCallback(async (p = page, filtro = tab) => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(p), soloNoLeidos: String(filtro === "no-leidos") });
        const res = await fetch(`/api/admin/cambios-datos?${params}`);
        if (res.ok) {
            const json = await res.json();
            setCambios(json.data);
            setTotal(json.total);
            setSinLeer(json.sinLeer);
            setTotalPages(json.pages);
        }
        setLoading(false);
        setCheckedIds(new Set());
    }, [page, tab]);

    useEffect(() => { fetchCambios(page, tab); }, [page, tab]);

    const marcarEstado = async (ids: number[], leido: boolean) => {
        await fetch("/api/admin/cambios-datos", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, leido }),
        });
        setCambios(prev => prev.map(c => ids.includes(c.id) ? { ...c, leido } : c));
        if (selected && ids.includes(selected.id)) setSelected(prev => prev ? { ...prev, leido } : null);
        setSinLeer(prev => leido ? prev - ids.filter(id => !cambios.find(c => c.id === id)?.leido).length : prev + ids.filter(id => cambios.find(c => c.id === id)?.leido).length);
    };

    const toggleCheck = (id: number) => {
        setCheckedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleTodos = () => {
        if (checkedIds.size === cambios.length) {
            setCheckedIds(new Set());
        } else {
            setCheckedIds(new Set(cambios.map(c => c.id)));
        }
    };

    const seleccionados = cambios.filter(c => checkedIds.has(c.id));
    const todosChecked = cambios.length > 0 && checkedIds.size === cambios.length;
    const algunoChecked = checkedIds.size > 0;

    const handleSelect = (cambio: CambioDatos) => {
        setSelected(cambio);
        if (!cambio.leido) marcarEstado([cambio.id], true);
    };

    const cambiarTab = (t: "todos" | "no-leidos") => {
        setTab(t);
        setPage(1);
        setSelected(null);
    };

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                        <UserCheck size={20} className="text-violet-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Modificaciones de Datos</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Historial de cambios en datos personales de matriculados</p>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{total}</p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sin leer</p>
                    <p className="text-3xl font-black text-violet-500">{sinLeer}</p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Leídos</p>
                    <p className="text-3xl font-black text-emerald-500">{total - sinLeer}</p>
                </div>
            </div>

            {/* Tabs + acciones */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                    {(["todos", "no-leidos"] as const).map(t => (
                        <button key={t} onClick={() => cambiarTab(t)}
                            className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${tab === t ? "bg-violet-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
                            {t === "todos" ? "Todos" : `Sin leer (${sinLeer})`}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[12px] text-slate-400">
                        Mostrando {cambios.length === 0 ? 0 : (page - 1) * 30 + 1}–{Math.min(page * 30, total)} de {total} registros
                    </span>
                    {algunoChecked && (
                        <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {checkedIds.size} seleccionado{checkedIds.size !== 1 ? "s" : ""} de esta página
                        </span>
                    )}
                </div>

                {algunoChecked && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => marcarEstado([...checkedIds], true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[12px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all">
                            <CheckCircle2 size={13} /> Marcar leído
                        </button>
                        <button onClick={() => marcarEstado([...checkedIds], false)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-[12px] font-bold hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all">
                            <Circle size={13} /> Marcar no leído
                        </button>
                        <button onClick={() => exportarXLSX(seleccionados)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#063f68]/10 text-[#063f68] dark:text-sky-400 text-[12px] font-bold hover:bg-[#063f68]/20 transition-all"
                            title="La exportación incluye solo los registros seleccionados en esta página">
                            <Download size={13} /> Exportar seleccionados ({checkedIds.size}) — pág. {page}
                        </button>
                    </div>
                )}
            </div>

            <div className="flex gap-6">
                {/* Lista */}
                <div className={`flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden ${selected ? "hidden md:block md:max-w-[55%]" : ""}`}>
                    {loading ? (
                        <div className="p-12 text-center text-slate-400 text-sm">Cargando...</div>
                    ) : cambios.length === 0 ? (
                        <div className="p-12 text-center">
                            <UserCheck size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm font-medium">Sin modificaciones registradas</p>
                        </div>
                    ) : (
                        <div>
                            {/* Header tabla */}
                            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center px-5 py-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                                <button onClick={toggleTodos} className="text-slate-400 hover:text-violet-500 transition-colors">
                                    {todosChecked ? <CheckSquare size={16} className="text-violet-500" /> : <Square size={16} />}
                                </button>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campos</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Fecha</span>
                            </div>

                            {cambios.map(c => (
                                <div key={c.id}
                                    className={`grid grid-cols-[auto_1fr_auto_auto] items-center px-5 py-4 border-b border-slate-50 dark:border-slate-800/60 last:border-0 gap-3 transition-colors ${selected?.id === c.id ? "bg-violet-50 dark:bg-violet-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"}`}>
                                    <button onClick={e => { e.stopPropagation(); toggleCheck(c.id); }} className="text-slate-300 hover:text-violet-500 transition-colors shrink-0">
                                        {checkedIds.has(c.id) ? <CheckSquare size={16} className="text-violet-500" /> : <Square size={16} />}
                                    </button>
                                    <button onClick={() => handleSelect(c)} className="flex items-center gap-3 min-w-0 text-left">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${!c.leido ? "bg-violet-500" : ""}`} />
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                                {c.usuario ? `${c.usuario.apellido}, ${c.usuario.nombre}` : `Mat. ${c.expediente}`}
                                            </p>
                                            <p className="text-[11px] text-slate-400">Mat. {c.expediente}</p>
                                        </div>
                                    </button>
                                    <button onClick={() => handleSelect(c)}>
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg mx-2">
                                            {Object.keys(c.campos as object).length} campo{Object.keys(c.campos as object).length !== 1 ? "s" : ""}
                                        </span>
                                    </button>
                                    <button onClick={() => handleSelect(c)}>
                                        <span className="text-[11px] text-slate-400">{timeAgo(c.createdAt)}</span>
                                    </button>
                                </div>
                            ))}

                            {/* Paginación */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-[12px] text-slate-400">Página {page} de {totalPages}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all">
                                            <ChevronLeft size={16} className="text-slate-500" />
                                        </button>
                                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all">
                                            <ChevronRight size={16} className="text-slate-500" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Panel detalle */}
                {selected && (
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <p className="text-[13px] font-black text-slate-900 dark:text-white">
                                    {selected.usuario ? `${selected.usuario.apellido}, ${selected.usuario.nombre}` : `Mat. ${selected.expediente}`}
                                </p>
                                <p className="text-[11px] text-slate-400">Mat. {selected.expediente} · {timeAgo(selected.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {selected.leido ? (
                                    <button onClick={() => marcarEstado([selected.id], false)}
                                        className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition-all">
                                        <CheckCircle2 size={11} /> Leído
                                    </button>
                                ) : (
                                    <button onClick={() => marcarEstado([selected.id], true)}
                                        className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2.5 py-1 rounded-full hover:bg-violet-100 transition-all">
                                        <Circle size={11} /> Sin leer
                                    </button>
                                )}
                                <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    <X size={16} className="text-slate-400" />
                                </button>
                            </div>
                        </div>

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
