"use client";

import { useState, useEffect } from "react";
import { Scale, Plus, Pencil, Trash2, Loader2, X, Check, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Registro {
    id: number;
    expediente: string;
    texto: string;
    inicio: string;
    fin: string;
    createdAt: string;
}

function isActive(registro: Registro) {
    const today = new Date();
    return new Date(registro.inicio) <= today && today <= new Date(registro.fin);
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toInputDate(iso: string) {
    return new Date(iso).toISOString().split("T")[0];
}

const emptyForm = { expediente: "", texto: "", inicio: "", fin: "" };

export default function TribunalEticaPage() {
    const { showToast } = useToast();
    const [registros, setRegistros] = useState<Registro[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState<"new" | "edit" | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [editId, setEditId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        fetch("/api/admin/tribunal-etica")
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setRegistros(data); })
            .finally(() => setLoading(false));
    }, []);

    function openNew() {
        setForm(emptyForm);
        setEditId(null);
        setModal("new");
    }

    function openEdit(r: Registro) {
        setForm({
            expediente: r.expediente,
            texto: r.texto,
            inicio: toInputDate(r.inicio),
            fin: toInputDate(r.fin),
        });
        setEditId(r.id);
        setModal("edit");
    }

    function closeModal() {
        setModal(null);
        setForm(emptyForm);
        setEditId(null);
    }

    async function handleSave() {
        if (!form.expediente.trim() || !form.texto.trim() || !form.inicio || !form.fin) {
            showToast("Completá todos los campos", "error");
            return;
        }
        if (new Date(form.fin) < new Date(form.inicio)) {
            showToast("La fecha de fin debe ser posterior al inicio", "error");
            return;
        }
        setSaving(true);
        try {
            const isEdit = modal === "edit";
            const res = await fetch("/api/admin/tribunal-etica", {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...(isEdit ? { id: editId } : {}), ...form }),
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || "Error", "error"); return; }

            if (isEdit) {
                setRegistros(prev => prev.map(r => r.id === editId ? data : r));
                showToast("Registro actualizado", "success");
            } else {
                setRegistros(prev => [data, ...prev]);
                showToast("Registro creado", "success");
            }
            closeModal();
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: number) {
        setDeletingId(id);
        try {
            await fetch("/api/admin/tribunal-etica", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            setRegistros(prev => prev.filter(r => r.id !== id));
            showToast("Registro eliminado", "success");
        } finally {
            setDeletingId(null);
        }
    }

    const filtered = registros.filter(r =>
        !search.trim() || r.expediente.toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = registros.filter(isActive).length;

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
    );

    return (
        <div className="p-6 md:p-10">
            {/* Header */}
            <div className="mb-7 flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Scale size={20} className="text-rose-500" /> Tribunal de Ética
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">
                        Registros de sanciones y altercados disciplinarios. Se incluyen automáticamente en certificados activos.
                    </p>
                </div>
                <button onClick={openNew}
                    className="h-9 px-4 bg-rose-500 text-white rounded-xl text-[12px] font-bold hover:bg-rose-600 transition-all flex items-center gap-1.5">
                    <Plus size={14} /> Nuevo registro
                </button>
            </div>

            {/* Stats */}
            {registros.length > 0 && (
                <div className="flex gap-4 mb-6 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <AlertTriangle size={14} className="text-rose-500" />
                        <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">{registros.length} registros totales</span>
                    </div>
                    {activeCount > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[12px] font-bold text-rose-600 dark:text-rose-400">{activeCount} activos ahora</span>
                        </div>
                    )}
                </div>
            )}

            {/* Buscador */}
            <div className="mb-5 max-w-xs">
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filtrar por expediente..."
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/50"
                />
            </div>

            {/* Lista */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl gap-3">
                    <Scale size={28} className="text-slate-200 dark:text-slate-700" />
                    <p className="text-[13px] text-slate-400">
                        {search ? "Sin resultados para ese expediente" : "No hay registros en el tribunal"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3 max-w-4xl">
                    {filtered.map(r => {
                        const active = isActive(r);
                        return (
                            <div key={r.id} className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden ${active ? "border-rose-200 dark:border-rose-800" : "border-slate-100 dark:border-slate-800"}`}>
                                <div className="p-5 flex gap-4 items-start">
                                    {/* Status dot */}
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-rose-100 dark:bg-rose-900/30" : "bg-slate-100 dark:bg-slate-800"}`}>
                                        {active
                                            ? <AlertTriangle size={16} className="text-rose-500" />
                                            : <Clock size={16} className="text-slate-400" />
                                        }
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                                            <span className="text-[13px] font-black text-slate-800 dark:text-white">Exp. {r.expediente}</span>
                                            {active
                                                ? <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wide">Activo</span>
                                                : <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">Inactivo</span>
                                            }
                                        </div>
                                        <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3 line-clamp-2">{r.texto}</p>
                                        <div className="flex items-center gap-4 text-[11px] text-slate-400">
                                            <span>Inicio: <strong className="text-slate-600 dark:text-slate-300">{formatDate(r.inicio)}</strong></span>
                                            <span>Fin: <strong className="text-slate-600 dark:text-slate-300">{formatDate(r.fin)}</strong></span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => openEdit(r)}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all disabled:opacity-50">
                                            {deletingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-[15px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Scale size={16} className="text-rose-500" />
                                {modal === "edit" ? "Editar registro" : "Nuevo registro"}
                            </h2>
                            <button onClick={closeModal} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Expediente *</label>
                                <input
                                    value={form.expediente}
                                    onChange={e => setForm(p => ({ ...p, expediente: e.target.value }))}
                                    placeholder="Ej: 12345"
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/50"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Descripción del altercado / sanción *</label>
                                <textarea
                                    value={form.texto}
                                    onChange={e => setForm(p => ({ ...p, texto: e.target.value }))}
                                    rows={5}
                                    placeholder="Ej: Suspensión de matrícula por resolución del Tribunal de Ética N° 123/2026..."
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/50 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Fecha inicio *</label>
                                    <input
                                        type="date"
                                        value={form.inicio}
                                        onChange={e => setForm(p => ({ ...p, inicio: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Fecha fin *</label>
                                    <input
                                        type="date"
                                        value={form.fin}
                                        onChange={e => setForm(p => ({ ...p, fin: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/50"
                                    />
                                </div>
                            </div>

                            {form.inicio && form.fin && new Date(form.fin) >= new Date(form.inicio) && (() => {
                                const today = new Date();
                                const inicio = new Date(form.inicio);
                                const fin = new Date(form.fin);
                                const active = inicio <= today && today <= fin;
                                return (
                                    <div className={`p-3 rounded-xl text-[11px] font-medium flex items-center gap-2 ${active ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400" : "bg-slate-50 dark:bg-slate-800 text-slate-500"}`}>
                                        {active ? <AlertTriangle size={12} /> : <Clock size={12} />}
                                        {active
                                            ? "Este registro estará ACTIVO hoy — se incluirá en certificados generados ahora."
                                            : "Este registro no está activo hoy — no afectará certificados actuales."}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Modal footer */}
                        <div className="px-6 pb-6 flex gap-3 justify-end">
                            <button onClick={closeModal}
                                className="h-10 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="h-10 px-5 bg-rose-500 text-white rounded-xl text-[13px] font-bold hover:bg-rose-600 disabled:opacity-50 transition-all flex items-center gap-2">
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                {modal === "edit" ? "Guardar cambios" : "Crear registro"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
