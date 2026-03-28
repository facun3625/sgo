"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, Check, X, Loader2, Tag } from "lucide-react";

interface Categoria {
    id: number;
    nombre: string;
}

export default function CategoriasPage() {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [newNombre, setNewNombre] = useState("");
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editNombre, setEditNombre] = useState("");
    const [savingId, setSavingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/admin/biblioteca/categorias")
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setCategorias(data); })
            .finally(() => setLoading(false));
    }, []);

    async function handleAdd() {
        const nombre = newNombre.trim();
        if (!nombre) return;
        setAdding(true);
        setError("");
        const res = await fetch("/api/admin/biblioteca/categorias", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre }),
        });
        if (res.ok) {
            const cat = await res.json();
            setCategorias(prev => [...prev, cat].sort((a, b) => a.nombre.localeCompare(b.nombre)));
            setNewNombre("");
        } else {
            setError("Ya existe una categoría con ese nombre.");
        }
        setAdding(false);
    }

    function startEdit(cat: Categoria) {
        setEditingId(cat.id);
        setEditNombre(cat.nombre);
        setError("");
    }

    async function handleSave(id: number) {
        const nombre = editNombre.trim();
        if (!nombre) return;
        setSavingId(id);
        setError("");
        const res = await fetch(`/api/admin/biblioteca/categorias/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre }),
        });
        if (res.ok) {
            const updated = await res.json();
            setCategorias(prev => prev.map(c => c.id === id ? updated : c).sort((a, b) => a.nombre.localeCompare(b.nombre)));
            setEditingId(null);
        } else {
            setError("Ya existe una categoría con ese nombre.");
        }
        setSavingId(null);
    }

    async function handleDelete(id: number) {
        if (!confirm("¿Eliminás esta categoría?")) return;
        setDeletingId(id);
        await fetch(`/api/admin/biblioteca/categorias/${id}`, { method: "DELETE" });
        setCategorias(prev => prev.filter(c => c.id !== id));
        setDeletingId(null);
    }

    return (
        <div className="p-6 md:p-10 space-y-6 max-w-xl">
            <div className="flex items-center gap-3">
                <Link href="/admin/biblioteca"
                    className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                    <ArrowLeft size={16} className="text-slate-500" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Categorías</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Administrá las categorías de la biblioteca</p>
                </div>
            </div>

            {/* Agregar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-3">Nueva categoría</p>
                <div className="flex gap-2">
                    <input
                        value={newNombre}
                        onChange={e => setNewNombre(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                        placeholder="Ej: Derecho Civil, Derecho Penal..."
                        className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={adding || !newNombre.trim()}
                        className="flex items-center gap-1.5 px-4 h-10 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all disabled:opacity-50">
                        {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Agregar
                    </button>
                </div>
                {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}
            </div>

            {/* Lista */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-slate-300" />
                    </div>
                ) : categorias.length === 0 ? (
                    <div className="py-12 text-center">
                        <Tag size={28} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No hay categorías cargadas</p>
                    </div>
                ) : (
                    categorias.map(cat => (
                        <div key={cat.id} className="flex items-center gap-3 px-5 py-3.5">
                            {editingId === cat.id ? (
                                <>
                                    <input
                                        autoFocus
                                        value={editNombre}
                                        onChange={e => setEditNombre(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter") handleSave(cat.id); if (e.key === "Escape") setEditingId(null); }}
                                        className="flex-1 h-9 px-3 rounded-xl border border-[#063f68]/40 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                                    />
                                    <button onClick={() => handleSave(cat.id)} disabled={savingId === cat.id}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-50">
                                        {savingId === cat.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                    </button>
                                    <button onClick={() => setEditingId(null)}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 transition-all">
                                        <X size={13} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="flex-1 text-[13px] text-slate-700 dark:text-slate-200 font-medium">{cat.nombre}</span>
                                    <button onClick={() => startEdit(cat)}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-[#063f68] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                        <Pencil size={13} />
                                    </button>
                                    <button onClick={() => handleDelete(cat.id)} disabled={deletingId === cat.id}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50">
                                        {deletingId === cat.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                    </button>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
