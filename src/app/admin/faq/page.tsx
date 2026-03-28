"use client";

import { useState, useEffect } from "react";
import { HelpCircle, Plus, Pencil, Trash2, Check, X, Loader2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Faq {
    id: number;
    pregunta: string;
    respuesta: string;
    orden: number;
}

interface Categoria {
    id: number;
    nombre: string;
    orden: number;
    faqs: Faq[];
}

export default function FaqAdminPage() {
    const { showToast } = useToast();
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);

    // Estado categoría
    const [newCatNombre, setNewCatNombre] = useState("");
    const [addingCat, setAddingCat] = useState(false);
    const [editingCatId, setEditingCatId] = useState<number | null>(null);
    const [editCatNombre, setEditCatNombre] = useState("");
    const [deletingCatId, setDeletingCatId] = useState<number | null>(null);
    const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());

    // Estado FAQ
    const [addingFaqCatId, setAddingFaqCatId] = useState<number | null>(null);
    const [newFaq, setNewFaq] = useState({ pregunta: "", respuesta: "" });
    const [savingFaq, setSavingFaq] = useState(false);
    const [editingFaqId, setEditingFaqId] = useState<number | null>(null);
    const [editFaq, setEditFaq] = useState({ pregunta: "", respuesta: "" });
    const [deletingFaqId, setDeletingFaqId] = useState<number | null>(null);

    useEffect(() => {
        fetch("/api/admin/faq/categorias")
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) { setCategorias(data); setExpandedCats(new Set(data.map((c: Categoria) => c.id))); } })
            .finally(() => setLoading(false));
    }, []);

    // --- Categorías ---
    async function addCategoria() {
        const nombre = newCatNombre.trim();
        if (!nombre) return;
        setAddingCat(true);
        const res = await fetch("/api/admin/faq/categorias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) });
        if (res.ok) {
            const cat = await res.json();
            setCategorias(prev => [...prev, { ...cat, faqs: [] }]);
            setExpandedCats(prev => new Set([...prev, cat.id]));
            setNewCatNombre("");
            showToast("Categoría creada");
        }
        setAddingCat(false);
    }

    async function saveCategoria(id: number) {
        const nombre = editCatNombre.trim();
        if (!nombre) return;
        const res = await fetch(`/api/admin/faq/categorias/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) });
        if (res.ok) {
            setCategorias(prev => prev.map(c => c.id === id ? { ...c, nombre } : c));
            setEditingCatId(null);
            showToast("Categoría actualizada");
        }
    }

    async function deleteCategoria(id: number) {
        if (!confirm("¿Eliminás esta categoría y todas sus preguntas?")) return;
        setDeletingCatId(id);
        await fetch(`/api/admin/faq/categorias/${id}`, { method: "DELETE" });
        setCategorias(prev => prev.filter(c => c.id !== id));
        setDeletingCatId(null);
        showToast("Categoría eliminada", "error");
    }

    async function moveCategoria(id: number, dir: -1 | 1) {
        const idx = categorias.findIndex(c => c.id === id);
        const swapIdx = idx + dir;
        if (swapIdx < 0 || swapIdx >= categorias.length) return;
        const updated = [...categorias];
        [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
        setCategorias(updated);
        // persist new orders
        await Promise.all([
            fetch(`/api/admin/faq/categorias/${updated[idx].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orden: idx }) }),
            fetch(`/api/admin/faq/categorias/${updated[swapIdx].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orden: swapIdx }) }),
        ]);
    }

    // --- FAQs ---
    async function addFaq(catId: number) {
        const { pregunta, respuesta } = newFaq;
        if (!pregunta.trim() || !respuesta.trim()) return;
        setSavingFaq(true);
        const res = await fetch("/api/admin/faq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoriaId: catId, pregunta: pregunta.trim(), respuesta: respuesta.trim() }) });
        if (res.ok) {
            const faq = await res.json();
            setCategorias(prev => prev.map(c => c.id === catId ? { ...c, faqs: [...c.faqs, faq] } : c));
            setAddingFaqCatId(null);
            setNewFaq({ pregunta: "", respuesta: "" });
            showToast("Pregunta agregada");
        }
        setSavingFaq(false);
    }

    async function saveFaq(id: number, catId: number) {
        const { pregunta, respuesta } = editFaq;
        if (!pregunta.trim() || !respuesta.trim()) return;
        const res = await fetch(`/api/admin/faq/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pregunta: pregunta.trim(), respuesta: respuesta.trim() }) });
        if (res.ok) {
            setCategorias(prev => prev.map(c => c.id === catId ? { ...c, faqs: c.faqs.map(f => f.id === id ? { ...f, pregunta: pregunta.trim(), respuesta: respuesta.trim() } : f) } : c));
            setEditingFaqId(null);
            showToast("Pregunta actualizada");
        }
    }

    async function deleteFaq(id: number, catId: number) {
        if (!confirm("¿Eliminás esta pregunta?")) return;
        setDeletingFaqId(id);
        await fetch(`/api/admin/faq/${id}`, { method: "DELETE" });
        setCategorias(prev => prev.map(c => c.id === catId ? { ...c, faqs: c.faqs.filter(f => f.id !== id) } : c));
        setDeletingFaqId(null);
        showToast("Pregunta eliminada", "error");
    }

    async function moveFaq(faqId: number, catId: number, dir: -1 | 1) {
        const cat = categorias.find(c => c.id === catId);
        if (!cat) return;
        const idx = cat.faqs.findIndex(f => f.id === faqId);
        const swapIdx = idx + dir;
        if (swapIdx < 0 || swapIdx >= cat.faqs.length) return;
        const updated = [...cat.faqs];
        [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
        setCategorias(prev => prev.map(c => c.id === catId ? { ...c, faqs: updated } : c));
        await Promise.all([
            fetch(`/api/admin/faq/${updated[idx].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orden: idx }) }),
            fetch(`/api/admin/faq/${updated[swapIdx].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orden: swapIdx }) }),
        ]);
    }

    function toggleCat(id: number) {
        setExpandedCats(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    return (
        <div className="p-6 md:p-10 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <HelpCircle size={20} className="text-slate-400" /> Preguntas Frecuentes
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">{categorias.length} categoría{categorias.length !== 1 ? "s" : ""} · {categorias.reduce((a, c) => a + c.faqs.length, 0)} preguntas</p>
                </div>
            </div>

            {/* Nueva categoría */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-3">Nueva categoría</p>
                <div className="flex gap-2">
                    <input value={newCatNombre} onChange={e => setNewCatNombre(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addCategoria(); }}
                        placeholder="Ej: Matrícula, Pagos, Trámites..."
                        className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                    <button onClick={addCategoria} disabled={addingCat || !newCatNombre.trim()}
                        className="flex items-center gap-1.5 px-4 h-10 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all disabled:opacity-50">
                        {addingCat ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Agregar
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
            ) : categorias.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                    <HelpCircle size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No hay categorías todavía</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {categorias.map((cat, catIdx) => (
                        <div key={cat.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            {/* Header categoría */}
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                                <GripVertical size={15} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />

                                {editingCatId === cat.id ? (
                                    <>
                                        <input autoFocus value={editCatNombre} onChange={e => setEditCatNombre(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") saveCategoria(cat.id); if (e.key === "Escape") setEditingCatId(null); }}
                                            className="flex-1 h-9 px-3 rounded-xl border border-[#063f68]/40 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30" />
                                        <button onClick={() => saveCategoria(cat.id)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 transition-all">
                                            <Check size={13} />
                                        </button>
                                        <button onClick={() => setEditingCatId(null)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                            <X size={13} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => toggleCat(cat.id)} className="flex-1 flex items-center gap-2 text-left">
                                            <span className="text-[14px] font-bold text-slate-800 dark:text-white">{cat.nombre}</span>
                                            <span className="text-[11px] text-slate-400 font-medium">{cat.faqs.length} pregunta{cat.faqs.length !== 1 ? "s" : ""}</span>
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => moveCategoria(cat.id, -1)} disabled={catIdx === 0}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 disabled:opacity-30 transition-all">
                                                <ChevronUp size={13} />
                                            </button>
                                            <button onClick={() => moveCategoria(cat.id, 1)} disabled={catIdx === categorias.length - 1}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 disabled:opacity-30 transition-all">
                                                <ChevronDown size={13} />
                                            </button>
                                            <button onClick={() => { setEditingCatId(cat.id); setEditCatNombre(cat.nombre); }}
                                                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-[#063f68] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                                <Pencil size={13} />
                                            </button>
                                            <button onClick={() => deleteCategoria(cat.id)} disabled={deletingCatId === cat.id}
                                                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50">
                                                {deletingCatId === cat.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                            </button>
                                            <button onClick={() => toggleCat(cat.id)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                                {expandedCats.has(cat.id) ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* FAQs de esta categoría */}
                            {expandedCats.has(cat.id) && (
                                <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                    {cat.faqs.map((faq, faqIdx) => (
                                        <div key={faq.id} className="px-5 py-4">
                                            {editingFaqId === faq.id ? (
                                                <div className="space-y-3">
                                                    <input value={editFaq.pregunta} onChange={e => setEditFaq(f => ({ ...f, pregunta: e.target.value }))}
                                                        placeholder="Pregunta"
                                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                                                    <textarea value={editFaq.respuesta} onChange={e => setEditFaq(f => ({ ...f, respuesta: e.target.value }))}
                                                        rows={3} placeholder="Respuesta"
                                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68] resize-none" />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => saveFaq(faq.id, cat.id)}
                                                            className="flex items-center gap-1.5 px-3 h-8 bg-emerald-500 text-white rounded-xl text-[12px] font-bold hover:bg-emerald-600 transition-all">
                                                            <Check size={12} /> Guardar
                                                        </button>
                                                        <button onClick={() => setEditingFaqId(null)}
                                                            className="flex items-center gap-1.5 px-3 h-8 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl text-[12px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                                            <X size={12} /> Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex gap-3">
                                                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                                                        <button onClick={() => moveFaq(faq.id, cat.id, -1)} disabled={faqIdx === 0}
                                                            className="w-6 h-5 flex items-center justify-center rounded text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 disabled:opacity-30 transition-all">
                                                            <ChevronUp size={12} />
                                                        </button>
                                                        <button onClick={() => moveFaq(faq.id, cat.id, 1)} disabled={faqIdx === cat.faqs.length - 1}
                                                            className="w-6 h-5 flex items-center justify-center rounded text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 disabled:opacity-30 transition-all">
                                                            <ChevronDown size={12} />
                                                        </button>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-semibold text-slate-800 dark:text-white leading-snug">{faq.pregunta}</p>
                                                        <p className="text-[12px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{faq.respuesta}</p>
                                                    </div>
                                                    <div className="flex items-start gap-1 flex-shrink-0">
                                                        <button onClick={() => { setEditingFaqId(faq.id); setEditFaq({ pregunta: faq.pregunta, respuesta: faq.respuesta }); }}
                                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-[#063f68] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                                            <Pencil size={13} />
                                                        </button>
                                                        <button onClick={() => deleteFaq(faq.id, cat.id)} disabled={deletingFaqId === faq.id}
                                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50">
                                                            {deletingFaqId === faq.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Agregar FAQ */}
                                    {addingFaqCatId === cat.id ? (
                                        <div className="px-5 py-4 bg-slate-50/50 dark:bg-slate-800/20 space-y-3">
                                            <input autoFocus value={newFaq.pregunta} onChange={e => setNewFaq(f => ({ ...f, pregunta: e.target.value }))}
                                                placeholder="Pregunta *"
                                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                                            <textarea value={newFaq.respuesta} onChange={e => setNewFaq(f => ({ ...f, respuesta: e.target.value }))}
                                                rows={3} placeholder="Respuesta *"
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68] resize-none" />
                                            <div className="flex gap-2">
                                                <button onClick={() => addFaq(cat.id)} disabled={savingFaq || !newFaq.pregunta.trim() || !newFaq.respuesta.trim()}
                                                    className="flex items-center gap-1.5 px-3 h-8 bg-[#063f68] text-white rounded-xl text-[12px] font-bold hover:bg-[#0a4d7a] transition-all disabled:opacity-50">
                                                    {savingFaq ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Agregar
                                                </button>
                                                <button onClick={() => { setAddingFaqCatId(null); setNewFaq({ pregunta: "", respuesta: "" }); }}
                                                    className="flex items-center gap-1.5 px-3 h-8 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl text-[12px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                                    <X size={12} /> Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="px-5 py-3">
                                            <button onClick={() => { setAddingFaqCatId(cat.id); setNewFaq({ pregunta: "", respuesta: "" }); }}
                                                className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-[#063f68] dark:hover:text-blue-400 transition-colors">
                                                <Plus size={14} /> Agregar pregunta
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
