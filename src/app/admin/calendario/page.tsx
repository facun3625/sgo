"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Evento {
    id: number;
    titulo: string;
    descripcion: string | null;
    fecha: string;
    tipo: string;
}

const TIPOS = [
    { value: "institucional", label: "Institucional", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    { value: "social", label: "Social", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    { value: "feriado", label: "Feriado", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
];

const tipoColor = (tipo: string) => TIPOS.find(t => t.value === tipo)?.color ?? "bg-slate-100 text-slate-600";
const tipoLabel = (tipo: string) => TIPOS.find(t => t.value === tipo)?.label ?? tipo;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function parseFecha(fechaStr: string) {
    // Parsear desde el ISO string sin pasar por Date para evitar desfase de timezone
    const part = fechaStr.split("T")[0]; // "2026-03-31"
    const [y, m, d] = part.split("-").map(Number);
    return { dia: d, mes: MESES[m - 1], fechaStr: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}` };
}

const emptyForm = { titulo: "", descripcion: "", fecha: "", tipo: "institucional" };

export default function CalendarioAdminPage() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const { showToast } = useToast();

    useEffect(() => {
        fetch("/api/admin/eventos")
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setEventos(data); })
            .finally(() => setLoading(false));
    }, []);

    function startEdit(ev: Evento) {
        setEditingId(ev.id);
        setForm({
            titulo: ev.titulo,
            descripcion: ev.descripcion ?? "",
            fecha: ev.fecha.split("T")[0],
            tipo: ev.tipo,
        });
        setShowForm(false);
        setError("");
    }

    function startNew() {
        setEditingId(null);
        setForm(emptyForm);
        setShowForm(true);
        setError("");
    }

    function cancelForm() {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        setError("");
    }

    async function handleSave() {
        if (!form.titulo.trim() || !form.fecha) { setError("Título y fecha son obligatorios."); return; }
        setSaving(true);
        setError("");
        const url = editingId ? `/api/admin/eventos/${editingId}` : "/api/admin/eventos";
        const method = editingId ? "PATCH" : "POST";
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, descripcion: form.descripcion || null }),
        });
        if (res.ok) {
            const saved = await res.json();
            if (editingId) {
                setEventos(prev => prev.map(e => e.id === editingId ? saved : e).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
            } else {
                setEventos(prev => [...prev, saved].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
            }
            showToast(editingId ? "Evento actualizado correctamente" : "Evento creado correctamente");
            cancelForm();
        } else {
            setError("Error al guardar el evento.");
        }
        setSaving(false);
    }

    async function handleDelete(id: number) {
        if (!confirm("¿Eliminás este evento?")) return;
        setDeletingId(id);
        await fetch(`/api/admin/eventos/${id}`, { method: "DELETE" });
        setEventos(prev => prev.filter(e => e.id !== id));
        setDeletingId(null);
        showToast("Evento eliminado", "error");
    }

    return (
        <div className="p-6 md:p-10 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <CalendarDays size={20} className="text-[#063f68] dark:text-blue-400" /> Calendario
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">{eventos.length} evento{eventos.length !== 1 ? "s" : ""} cargado{eventos.length !== 1 ? "s" : ""}</p>
                </div>
                <button onClick={startNew}
                    className="flex items-center gap-2 px-4 h-10 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all">
                    <Plus size={15} /> Nuevo evento
                </button>
            </div>

            {/* Formulario nuevo / editar */}
            {(showForm || editingId !== null) && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                    <p className="text-[13px] font-bold text-slate-800 dark:text-white">{editingId ? "Editar evento" : "Nuevo evento"}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-slate-500">Título *</label>
                            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                                placeholder="Ej: Asamblea General Ordinaria"
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-slate-500">Fecha *</label>
                            <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-500">Descripción</label>
                        <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                            rows={2} placeholder="Descripción opcional..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68] resize-none" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-500">Tipo</label>
                        <div className="flex gap-2">
                            {TIPOS.map(t => (
                                <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                                    className={`px-3 h-9 rounded-xl text-[12px] font-semibold transition-all border
                                        ${form.tipo === t.value
                                            ? "bg-[#063f68] border-[#063f68] text-white"
                                            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && <p className="text-[12px] text-red-500">{error}</p>}

                    <div className="flex gap-2 pt-1">
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-1.5 px-4 h-9 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all disabled:opacity-50">
                            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            {editingId ? "Guardar cambios" : "Crear evento"}
                        </button>
                        <button onClick={cancelForm}
                            className="flex items-center gap-1.5 px-4 h-9 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <X size={13} /> Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Lista */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-14">
                        <Loader2 size={24} className="animate-spin text-slate-300" />
                    </div>
                ) : eventos.length === 0 ? (
                    <div className="py-14 text-center">
                        <CalendarDays size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium text-sm">No hay eventos cargados</p>
                    </div>
                ) : (
                    eventos.map(ev => (
                        <div key={ev.id} className={`flex items-center gap-4 px-5 py-4 transition-colors ${editingId === ev.id ? "bg-blue-50/30 dark:bg-blue-900/5" : ""}`}>
                            {/* Fecha badge */}
                            {(() => { const f = parseFecha(ev.fecha); return (
                            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex-shrink-0">
                                <span className="text-[15px] font-black text-slate-700 dark:text-white leading-none">
                                    {String(f.dia).padStart(2, "0")}
                                </span>
                                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wide">
                                    {f.mes}
                                </span>
                            </div>
                            ); })()}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${tipoColor(ev.tipo)}`}>
                                        {tipoLabel(ev.tipo)}
                                    </span>
                                    <span className="text-[11px] text-slate-400">{parseFecha(ev.fecha).fechaStr}</span>
                                </div>
                                <p className="text-[13px] font-semibold text-slate-800 dark:text-white truncate">{ev.titulo}</p>
                                {ev.descripcion && <p className="text-[12px] text-slate-400 truncate">{ev.descripcion}</p>}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => startEdit(ev)}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-[#063f68] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                    <Pencil size={13} />
                                </button>
                                <button onClick={() => handleDelete(ev.id)} disabled={deletingId === ev.id}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50">
                                    {deletingId === ev.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
