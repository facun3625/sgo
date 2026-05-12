"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, PlayCircle, Eye, EyeOff, ChevronUp, ChevronDown, X, Check } from "lucide-react";

interface Tutorial {
    id: number;
    titulo: string;
    descripcion: string | null;
    videoUrl: string;
    tipo: string;
    orden: number;
    activo: boolean;
}

const EMPTY = { titulo: "", descripcion: "", videoUrl: "", tipo: "url" };

export default function AdminTutorialesPage() {
    const [tutoriales, setTutoriales] = useState<Tutorial[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [error, setError] = useState("");

    async function load() {
        const res = await fetch("/api/admin/tutoriales");
        const data = await res.json();
        setTutoriales(Array.isArray(data) ? data : []);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    function openNew() {
        setEditId(null);
        setForm(EMPTY);
        setError("");
        setShowForm(true);
    }

    function openEdit(t: Tutorial) {
        setEditId(t.id);
        setForm({ titulo: t.titulo, descripcion: t.descripcion ?? "", videoUrl: t.videoUrl, tipo: t.tipo });
        setError("");
        setShowForm(true);
    }

    function cancelForm() {
        setShowForm(false);
        setEditId(null);
        setForm(EMPTY);
        setError("");
    }

    async function handleSave() {
        if (!form.titulo.trim() || !form.videoUrl.trim()) {
            setError("Título y video son requeridos");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const url = editId ? `/api/admin/tutoriales/${editId}` : "/api/admin/tutoriales";
            const method = editId ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error();
            cancelForm();
            await load();
        } catch {
            setError("Error al guardar");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm("¿Eliminar este tutorial?")) return;
        await fetch(`/api/admin/tutoriales/${id}`, { method: "DELETE" });
        setTutoriales(prev => prev.filter(t => t.id !== id));
    }

    async function toggleActivo(t: Tutorial) {
        await fetch(`/api/admin/tutoriales/${t.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activo: !t.activo }),
        });
        setTutoriales(prev => prev.map(x => x.id === t.id ? { ...x, activo: !x.activo } : x));
    }

    async function moverOrden(t: Tutorial, dir: -1 | 1) {
        const sorted = [...tutoriales].sort((a, b) => a.orden - b.orden);
        const idx = sorted.findIndex(x => x.id === t.id);
        const swap = sorted[idx + dir];
        if (!swap) return;

        await Promise.all([
            fetch(`/api/admin/tutoriales/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orden: swap.orden }) }),
            fetch(`/api/admin/tutoriales/${swap.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orden: t.orden }) }),
        ]);
        await load();
    }

    const sorted = [...tutoriales].sort((a, b) => a.orden - b.orden);

    return (
        <div className="p-6 md:p-10 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Tutoriales</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{tutoriales.length} tutorial{tutoriales.length !== 1 ? "es" : ""}</p>
                </div>
                <button
                    onClick={openNew}
                    className="flex items-center gap-2 px-5 h-10 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all active:scale-95">
                    <Plus size={16} /> Nuevo tutorial
                </button>
            </div>

            {/* Formulario */}
            {showForm && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                    <h2 className="text-[14px] font-bold text-slate-700 dark:text-white">
                        {editId ? "Editar tutorial" : "Nuevo tutorial"}
                    </h2>

                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-500">Título *</label>
                        <input
                            value={form.titulo}
                            onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-500">Descripción <span className="font-normal text-slate-300">(opcional)</span></label>
                        <textarea
                            value={form.descripcion}
                            onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                            rows={2}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68] resize-none"
                        />
                    </div>

                    {/* Tipo de video */}
                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-500">Tipo de video *</label>
                        <div className="flex gap-2">
                            {[
                                { value: "url", label: "Link / URL", desc: "YouTube, Vimeo u otro enlace" },
                                { value: "embed", label: "Código embed", desc: "HTML de incrustación" },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, tipo: opt.value }))}
                                    className={`flex-1 py-2.5 px-3 rounded-xl border text-left transition-all ${
                                        form.tipo === opt.value
                                            ? "border-[#063f68] bg-[#063f68]/5 dark:bg-[#063f68]/10"
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                    }`}
                                >
                                    <p className={`text-[12px] font-bold ${form.tipo === opt.value ? "text-[#063f68] dark:text-blue-400" : "text-slate-600 dark:text-slate-300"}`}>{opt.label}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-500">
                            {form.tipo === "embed" ? "Código de incrustación *" : "URL del video *"}
                        </label>
                        {form.tipo === "embed" ? (
                            <textarea
                                value={form.videoUrl}
                                onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))}
                                rows={4}
                                placeholder='<iframe src="..." ...></iframe>'
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68] resize-none"
                            />
                        ) : (
                            <input
                                value={form.videoUrl}
                                onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                            />
                        )}
                        {form.tipo === "url" && (
                            <p className="text-[11px] text-slate-400">YouTube y Vimeo se incrustan automáticamente. Otros links se abren en pestaña nueva.</p>
                        )}
                    </div>

                    {error && (
                        <p className="text-[12px] text-red-500 font-medium">{error}</p>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={cancelForm}
                            className="flex items-center gap-1.5 px-4 h-9 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[12px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <X size={13} /> Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 h-9 bg-[#063f68] text-white rounded-xl text-[12px] font-bold hover:bg-[#0a4d7a] transition-all disabled:opacity-60">
                            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            {saving ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </div>
            )}

            {/* Lista */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 size={24} className="animate-spin text-slate-300" />
                </div>
            ) : sorted.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-14 text-center">
                    <PlayCircle size={28} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium text-[13px]">No hay tutoriales cargados</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sorted.map((t, i) => (
                        <div key={t.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center gap-4">
                            {/* Orden */}
                            <div className="flex flex-col gap-0.5">
                                <button onClick={() => moverOrden(t, -1)} disabled={i === 0}
                                    className="p-1 rounded-lg text-slate-300 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-20 transition-all">
                                    <ChevronUp size={13} />
                                </button>
                                <button onClick={() => moverOrden(t, 1)} disabled={i === sorted.length - 1}
                                    className="p-1 rounded-lg text-slate-300 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-20 transition-all">
                                    <ChevronDown size={13} />
                                </button>
                            </div>

                            <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center flex-shrink-0">
                                <PlayCircle size={16} className="text-pink-500" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className={`text-[13px] font-bold ${t.activo ? "text-slate-800 dark:text-white" : "text-slate-400 dark:text-slate-500 line-through"}`}>
                                    {t.titulo}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                                        {t.tipo === "embed" ? "Embed" : "URL"}
                                    </span>
                                    {t.descripcion && (
                                        <span className="text-[11px] text-slate-400 truncate max-w-[300px]">{t.descripcion}</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => toggleActivo(t)}
                                    className={`flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-semibold transition-all ${
                                        t.activo
                                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                                            : "bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    }`}>
                                    {t.activo ? <Eye size={11} /> : <EyeOff size={11} />}
                                    {t.activo ? "Visible" : "Oculto"}
                                </button>
                                <button onClick={() => openEdit(t)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-[#063f68] dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                    <Pencil size={13} />
                                </button>
                                <button onClick={() => handleDelete(t.id)}
                                    className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
