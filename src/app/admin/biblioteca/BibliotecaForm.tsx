"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, X, Loader2, BookOpen, Trash2, Plus, FileText, Settings2, Check } from "lucide-react";

interface BibliotecaFormProps {
    initialData?: {
        id: number;
        tipo: string;
        titulo: string;
        autor: string;
        categoria: string;
        tags: string[];
        archivo: string;
        portada: string | null;
        activa: boolean;
        destacado: boolean;
    };
}

export default function BibliotecaForm({ initialData }: BibliotecaFormProps) {
    const router = useRouter();
    const isEdit = !!initialData;
    const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
    const [addingCat, setAddingCat] = useState(false);
    const [newCatNombre, setNewCatNombre] = useState("");
    const [savingCat, setSavingCat] = useState(false);
    const newCatRef = useRef<HTMLInputElement>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [uploadingPortada, setUploadingPortada] = useState(false);
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        tipo: initialData?.tipo || "libro",
        titulo: initialData?.titulo || "",
        autor: initialData?.autor || "",
        categoria: initialData?.categoria || "",
        tags: initialData?.tags || [] as string[],
        archivo: initialData?.archivo || "",
        portada: initialData?.portada || "",
        activa: initialData?.activa ?? true,
        destacado: initialData?.destacado ?? false,
    });

    useEffect(() => {
        fetch("/api/admin/biblioteca/categorias")
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setCategorias(data); });
    }, []);

    function setField(key: string, value: string | boolean | string[]) {
        setForm(prev => ({ ...prev, [key]: value }));
    }

    function startAddCat() {
        setAddingCat(true);
        setNewCatNombre("");
        setTimeout(() => newCatRef.current?.focus(), 50);
    }

    async function confirmAddCat() {
        const nombre = newCatNombre.trim();
        if (!nombre) { setAddingCat(false); return; }
        setSavingCat(true);
        const res = await fetch("/api/admin/biblioteca/categorias", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre }),
        });
        if (res.ok) {
            const cat = await res.json();
            setCategorias(prev => [...prev, cat].sort((a, b) => a.nombre.localeCompare(b.nombre)));
            setField("categoria", cat.nombre);
        }
        setSavingCat(false);
        setAddingCat(false);
        setNewCatNombre("");
    }

    function addTag() {
        const t = tagInput.trim();
        if (!t || form.tags.includes(t)) return;
        setForm(prev => ({ ...prev, tags: [...prev.tags, t] }));
        setTagInput("");
    }

    function removeTag(tag: string) {
        setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    }

    async function uploadFile(file: File, type: "portada" | "pdf") {
        const setter = type === "portada" ? setUploadingPortada : setUploadingPdf;
        setter(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/admin/biblioteca/upload", { method: "POST", body: fd });
            const data = await res.json();
            setField(type === "portada" ? "portada" : "archivo", data.url);
        } catch {
            setError("Error al subir el archivo");
        } finally {
            setter(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!form.titulo || !form.autor || !form.categoria || !form.archivo) {
            setError("Título, autor, categoría y PDF son obligatorios.");
            return;
        }
        setSaving(true);
        try {
            const url = isEdit ? `/api/admin/biblioteca/${initialData!.id}` : "/api/admin/biblioteca";
            const method = isEdit ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, portada: form.portada || null }),
            });
            if (!res.ok) throw new Error();
            router.push("/admin/biblioteca");
        } catch {
            setError("Error al guardar.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm("¿Eliminás este documento?")) return;
        setDeleting(true);
        await fetch(`/api/admin/biblioteca/${initialData!.id}`, { method: "DELETE" });
        router.push("/admin/biblioteca");
    }

    return (
        <div className="p-6 md:p-10 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/admin/biblioteca"
                        className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        <ArrowLeft size={16} className="text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white">{isEdit ? "Editar documento" : "Nuevo documento"}</h1>
                        <p className="text-slate-400 text-sm mt-0.5">Biblioteca CASF</p>
                    </div>
                </div>
                {isEdit && (
                    <button onClick={handleDelete} disabled={deleting}
                        className="flex items-center gap-1.5 px-3 h-9 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[12px] font-semibold hover:bg-red-100 transition-all disabled:opacity-60">
                        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Eliminar
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Tipo */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-3">Tipo de documento</label>
                    <div className="flex gap-3">
                        {[{ value: "libro", label: "Libro", icon: BookOpen }, { value: "jurisprudencia", label: "Jurisprudencia", icon: FileText }].map(opt => (
                            <button key={opt.value} type="button" onClick={() => setField("tipo", opt.value)}
                                className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border text-[13px] font-semibold transition-all
                                    ${form.tipo === opt.value
                                        ? "bg-[#063f68] border-[#063f68] text-white"
                                        : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                                <opt.icon size={14} /> {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Portada + PDF */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                    <h2 className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Archivos</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Portada */}
                        <div>
                            <label className="text-[12px] font-medium text-slate-500 mb-2 block">Portada (opcional)</label>
                            <div className="flex items-center gap-3">
                                <div className="w-16 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                                    {form.portada ? (
                                        <img src={form.portada} alt="Portada" className="w-full h-full object-cover" />
                                    ) : (
                                        <BookOpen size={20} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 px-3 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-semibold cursor-pointer hover:bg-slate-100 transition-all">
                                        {uploadingPortada ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                                        {uploadingPortada ? "Subiendo..." : "Subir imagen"}
                                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], "portada")} disabled={uploadingPortada} />
                                    </label>
                                    {form.portada && (
                                        <button type="button" onClick={() => setField("portada", "")}
                                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 transition-colors">
                                            <X size={10} /> Quitar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* PDF */}
                        <div>
                            <label className="text-[12px] font-medium text-slate-500 mb-2 block">Archivo PDF *</label>
                            <div className="space-y-2">
                                <label className={`flex items-center gap-2 px-4 h-10 border rounded-xl text-[12px] font-semibold cursor-pointer transition-all w-fit
                                    ${form.archivo ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}>
                                    {uploadingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                                    {uploadingPdf ? "Subiendo..." : form.archivo ? "PDF cargado ✓" : "Subir PDF"}
                                    <input type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], "pdf")} disabled={uploadingPdf} />
                                </label>
                                {form.archivo && (
                                    <button type="button" onClick={() => setField("archivo", "")}
                                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 transition-colors">
                                        <X size={10} /> Quitar PDF
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Datos */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                    <h2 className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Información</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-slate-500">Título *</label>
                            <input value={form.titulo} onChange={e => setField("titulo", e.target.value)}
                                placeholder="Ej: Derecho Civil Argentino"
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-slate-500">Autor *</label>
                            <input value={form.autor} onChange={e => setField("autor", e.target.value)}
                                placeholder="Ej: Llambías, Jorge Joaquín"
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[12px] font-medium text-slate-500">Categoría *</label>
                            <Link href="/admin/biblioteca/categorias" target="_blank"
                                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#063f68] transition-colors">
                                <Settings2 size={11} /> Administrar
                            </Link>
                        </div>
                        {addingCat ? (
                            <div className="flex gap-2">
                                <input
                                    ref={newCatRef}
                                    value={newCatNombre}
                                    onChange={e => setNewCatNombre(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirmAddCat(); } if (e.key === "Escape") setAddingCat(false); }}
                                    placeholder="Nombre de la nueva categoría..."
                                    className="flex-1 h-10 px-3 rounded-xl border border-[#063f68]/40 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                                />
                                <button type="button" onClick={confirmAddCat} disabled={savingCat || !newCatNombre.trim()}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50">
                                    {savingCat ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                </button>
                                <button type="button" onClick={() => setAddingCat(false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <select value={form.categoria} onChange={e => setField("categoria", e.target.value)}
                                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]">
                                    <option value="">Seleccioná una categoría...</option>
                                    {categorias.map(c => (
                                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                    ))}
                                </select>
                                <button type="button" onClick={startAddCat} title="Nueva categoría"
                                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-[#063f68] hover:border-[#063f68]/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                    <Plus size={15} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tags */}
                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-500">Tags</label>
                        <div className="flex gap-2">
                            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                                placeholder="Escribí un tag y presioná Enter"
                                className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                            <button type="button" onClick={addTag}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                                <Plus size={15} className="text-slate-500" />
                            </button>
                        </div>
                        {form.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {form.tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#063f68]/10 dark:bg-blue-900/30 text-[#063f68] dark:text-blue-400 rounded-lg text-[11px] font-semibold">
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)}><X size={10} /></button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Activo + Destacado */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Activo</p>
                            <p className="text-[11px] text-slate-400">Visible para los matriculados</p>
                        </div>
                        <button type="button" onClick={() => setField("activa", !form.activa)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${form.activa ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.activa ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                        <div>
                            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Destacado</p>
                            <p className="text-[11px] text-slate-400">Aparece en la sección de destacados de la biblioteca</p>
                        </div>
                        <button type="button" onClick={() => setField("destacado", !form.destacado)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${form.destacado ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.destacado ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-[13px] text-red-600 dark:text-red-400">{error}</div>
                )}

                <div className="flex items-center gap-3 pb-6">
                    <Link href="/admin/biblioteca"
                        className="flex-1 flex items-center justify-center h-11 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        Cancelar
                    </Link>
                    <button type="submit" disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 h-11 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all disabled:opacity-60">
                        {saving ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : isEdit ? "Guardar cambios" : "Publicar documento"}
                    </button>
                </div>
            </form>
        </div>
    );
}
