"use client";

import { useState, useEffect, useRef } from "react";
import {
    FolderOpen, Plus, Trash2, Loader2, Upload, FileText, FileSpreadsheet,
    Presentation, Image, Archive, File, ChevronDown, ChevronRight,
    Pencil, Check, X, GripVertical, Download
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Archivo {
    id: number;
    nombre: string;
    descripcion: string | null;
    archivo: string;
    tipo: string;
    tamano: string | null;
    descargas: number;
    createdAt: string;
}

interface Categoria {
    id: number;
    nombre: string;
    orden: number;
    archivos: Archivo[];
}

const tipoIcon: Record<string, React.ReactNode> = {
    pdf: <FileText size={14} className="text-red-500" />,
    doc: <FileText size={14} className="text-blue-500" />,
    xls: <FileSpreadsheet size={14} className="text-emerald-500" />,
    ppt: <Presentation size={14} className="text-orange-500" />,
    img: <Image size={14} className="text-purple-500" />,
    zip: <Archive size={14} className="text-amber-500" />,
    otro: <File size={14} className="text-slate-400" />,
};

const tipoLabel: Record<string, string> = {
    pdf: "PDF", doc: "Word", xls: "Excel", ppt: "PowerPoint", img: "Imagen", zip: "Comprimido", otro: "Archivo",
};

export default function RepositorioAdminPage() {
    const { showToast: addToast } = useToast();
    const [cats, setCats] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [openCats, setOpenCats] = useState<Set<number>>(new Set());

    // Nueva categoría
    const [addingCat, setAddingCat] = useState(false);
    const [newCatName, setNewCatName] = useState("");
    const [savingCat, setSavingCat] = useState(false);
    const newCatRef = useRef<HTMLInputElement>(null);

    // Editar categoría
    const [editingCatId, setEditingCatId] = useState<number | null>(null);
    const [editingCatName, setEditingCatName] = useState("");

    // Nuevo archivo
    const [uploadingFor, setUploadingFor] = useState<number | null>(null);
    const [newFile, setNewFile] = useState<{ nombre: string; descripcion: string; archivo: string; tipo: string; tamano: string }>({ nombre: "", descripcion: "", archivo: "", tipo: "", tamano: "" });
    const [uploading, setUploading] = useState(false);
    const [savingFile, setSavingFile] = useState(false);

    // Editar archivo
    const [editingArchivo, setEditingArchivo] = useState<{ id: number; nombre: string; descripcion: string } | null>(null);

    // Deleting
    const [deletingCat, setDeletingCat] = useState<number | null>(null);
    const [deletingFile, setDeletingFile] = useState<number | null>(null);

    useEffect(() => { load(); }, []);
    useEffect(() => { if (addingCat) setTimeout(() => newCatRef.current?.focus(), 50); }, [addingCat]);

    async function load() {
        setLoading(true);
        const res = await fetch("/api/admin/repositorio/categorias");
        const data = await res.json();
        if (Array.isArray(data)) {
            setCats(data);
            setOpenCats(new Set(data.map((c: Categoria) => c.id)));
        }
        setLoading(false);
    }

    function toggleCat(id: number) {
        setOpenCats(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    }

    async function saveCat() {
        if (!newCatName.trim()) { setAddingCat(false); return; }
        setSavingCat(true);
        const res = await fetch("/api/admin/repositorio/categorias", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: newCatName.trim() }),
        });
        if (res.ok) {
            const cat = await res.json();
            setCats(prev => [...prev, { ...cat, archivos: [] }]);
            setOpenCats(prev => new Set([...prev, cat.id]));
            addToast("Categoría creada", "success");
        }
        setSavingCat(false); setAddingCat(false); setNewCatName("");
    }

    async function updateCat(id: number) {
        if (!editingCatName.trim()) { setEditingCatId(null); return; }
        const res = await fetch(`/api/admin/repositorio/categorias/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: editingCatName.trim() }),
        });
        if (res.ok) {
            setCats(prev => prev.map(c => c.id === id ? { ...c, nombre: editingCatName.trim() } : c));
            addToast("Categoría actualizada", "success");
        }
        setEditingCatId(null);
    }

    async function deleteCat(id: number) {
        if (!confirm("¿Eliminar esta categoría y todos sus archivos?")) return;
        setDeletingCat(id);
        await fetch(`/api/admin/repositorio/categorias/${id}`, { method: "DELETE" });
        setCats(prev => prev.filter(c => c.id !== id));
        addToast("Categoría eliminada", "success");
        setDeletingCat(null);
    }

    async function moveCat(id: number, dir: -1 | 1) {
        const idx = cats.findIndex(c => c.id === id);
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= cats.length) return;
        const reordered = [...cats];
        [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
        setCats(reordered);
        await Promise.all(reordered.map((c, i) =>
            fetch(`/api/admin/repositorio/categorias/${c.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orden: i }),
            })
        ));
    }

    async function uploadArchivo(catId: number, file: File) {
        setUploading(true);
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/repositorio/upload", { method: "POST", body: fd });
        const data = await res.json();
        setNewFile(prev => ({ ...prev, archivo: data.url, tipo: data.tipo, tamano: data.tamano, nombre: prev.nombre || file.name.replace(/\.[^/.]+$/, "") }));
        setUploading(false);
    }

    async function saveArchivo(catId: number) {
        if (!newFile.nombre.trim() || !newFile.archivo) return;
        setSavingFile(true);
        const res = await fetch("/api/admin/repositorio/archivos", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoriaId: catId, ...newFile }),
        });
        if (res.ok) {
            const arch = await res.json();
            setCats(prev => prev.map(c => c.id === catId ? { ...c, archivos: [...c.archivos, arch] } : c));
            addToast("Archivo agregado", "success");
        }
        setSavingFile(false);
        setUploadingFor(null);
        setNewFile({ nombre: "", descripcion: "", archivo: "", tipo: "", tamano: "" });
    }

    async function updateArchivo(id: number, catId: number) {
        if (!editingArchivo) return;
        const res = await fetch(`/api/admin/repositorio/archivos/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: editingArchivo.nombre, descripcion: editingArchivo.descripcion }),
        });
        if (res.ok) {
            setCats(prev => prev.map(c => c.id === catId ? {
                ...c, archivos: c.archivos.map(a => a.id === id ? { ...a, nombre: editingArchivo.nombre, descripcion: editingArchivo.descripcion || null } : a)
            } : c));
            addToast("Archivo actualizado", "success");
        }
        setEditingArchivo(null);
    }

    async function deleteArchivo(id: number, catId: number) {
        if (!confirm("¿Eliminar este archivo?")) return;
        setDeletingFile(id);
        await fetch(`/api/admin/repositorio/archivos/${id}`, { method: "DELETE" });
        setCats(prev => prev.map(c => c.id === catId ? { ...c, archivos: c.archivos.filter(a => a.id !== id) } : c));
        addToast("Archivo eliminado", "success");
        setDeletingFile(null);
    }

    const totalArchivos = cats.reduce((a, c) => a + c.archivos.length, 0);

    return (
        <div className="p-6 md:p-10 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <FolderOpen size={20} className="text-indigo-500" /> Repositorio de Archivos
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">{cats.length} categorías · {totalArchivos} archivos</p>
                </div>
                <button onClick={() => setAddingCat(true)} disabled={addingCat}
                    className="flex items-center gap-1.5 px-4 h-9 bg-indigo-600 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-700 transition-all disabled:opacity-60">
                    <Plus size={14} /> Nueva categoría
                </button>
            </div>

            {/* Nueva categoría inline */}
            {addingCat && (
                <div className="flex gap-2">
                    <input ref={newCatRef} value={newCatName} onChange={e => setNewCatName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveCat(); if (e.key === "Escape") setAddingCat(false); }}
                        placeholder="Nombre de la categoría..."
                        className="flex-1 h-10 px-3 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <button onClick={saveCat} disabled={savingCat || !newCatName.trim()}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50">
                        {savingCat ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button onClick={() => setAddingCat(false)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <X size={14} />
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-slate-300" />
                </div>
            ) : cats.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                    <FolderOpen size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No hay categorías aún</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {cats.map((cat, catIdx) => {
                        const isOpen = openCats.has(cat.id);
                        const isUploadingHere = uploadingFor === cat.id;
                        return (
                            <div key={cat.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                {/* Header categoría */}
                                <div className="flex items-center gap-2 px-4 py-3 group">
                                    {/* Orden */}
                                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                                        <button onClick={() => moveCat(cat.id, -1)} disabled={catIdx === 0}
                                            className="w-5 h-4 flex items-center justify-center text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-colors">
                                            <ChevronRight size={10} className="-rotate-90" />
                                        </button>
                                        <button onClick={() => moveCat(cat.id, 1)} disabled={catIdx === cats.length - 1}
                                            className="w-5 h-4 flex items-center justify-center text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-colors">
                                            <ChevronRight size={10} className="rotate-90" />
                                        </button>
                                    </div>

                                    <button onClick={() => toggleCat(cat.id)} className="flex-1 flex items-center gap-3 text-left">
                                        <span className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                                            <FolderOpen size={13} className="text-indigo-500" />
                                        </span>
                                        {editingCatId === cat.id ? (
                                            <input
                                                value={editingCatName} onChange={e => setEditingCatName(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter") updateCat(cat.id); if (e.key === "Escape") setEditingCatId(null); }}
                                                onClick={e => e.stopPropagation()}
                                                autoFocus
                                                className="flex-1 h-8 px-2 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] font-bold focus:outline-none" />
                                        ) : (
                                            <span className="text-[14px] font-bold text-slate-800 dark:text-white">{cat.nombre}</span>
                                        )}
                                        <span className="text-[11px] text-slate-400">{cat.archivos.length} archivo{cat.archivos.length !== 1 ? "s" : ""}</span>
                                        <ChevronDown size={14} className={`ml-auto text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    {/* Acciones */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {editingCatId === cat.id ? (
                                            <>
                                                <button onClick={() => updateCat(cat.id)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600">
                                                    <Check size={12} />
                                                </button>
                                                <button onClick={() => setEditingCatId(null)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50">
                                                    <X size={12} />
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.nombre); }}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 transition-all">
                                                <Pencil size={12} />
                                            </button>
                                        )}
                                        <button onClick={() => deleteCat(cat.id)} disabled={deletingCat === cat.id}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all">
                                            {deletingCat === cat.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Archivos */}
                                <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                    <div className="overflow-hidden">
                                        <div className="border-t border-slate-100 dark:border-slate-800">
                                            {cat.archivos.length === 0 && !isUploadingHere && (
                                                <p className="text-[12px] text-slate-400 text-center py-4">Sin archivos aún</p>
                                            )}

                                            {cat.archivos.map(arch => (
                                                <div key={arch.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group/row transition-colors">
                                                    <span className="flex-shrink-0">{tipoIcon[arch.tipo] || tipoIcon.otro}</span>

                                                    {editingArchivo?.id === arch.id ? (
                                                        <div className="flex-1 flex flex-col gap-1.5">
                                                            <input value={editingArchivo.nombre} onChange={e => setEditingArchivo(prev => prev ? { ...prev, nombre: e.target.value } : prev)}
                                                                className="w-full h-8 px-2 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[12px] font-semibold focus:outline-none" />
                                                            <input value={editingArchivo.descripcion} onChange={e => setEditingArchivo(prev => prev ? { ...prev, descripcion: e.target.value } : prev)}
                                                                placeholder="Descripción (opcional)"
                                                                className="w-full h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] focus:outline-none" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{arch.nombre}</p>
                                                            {arch.descripcion && <p className="text-[11px] text-slate-400 truncate">{arch.descripcion}</p>}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-shrink-0">
                                                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium">{tipoLabel[arch.tipo] || "Archivo"}</span>
                                                        {arch.tamano && <span>{arch.tamano}</span>}
                                                        <span className="flex items-center gap-0.5"><Download size={9} /> {arch.descargas}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                        {editingArchivo?.id === arch.id ? (
                                                            <>
                                                                <button onClick={() => updateArchivo(arch.id, cat.id)}
                                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600">
                                                                    <Check size={12} />
                                                                </button>
                                                                <button onClick={() => setEditingArchivo(null)}
                                                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400">
                                                                    <X size={12} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button onClick={() => setEditingArchivo({ id: arch.id, nombre: arch.nombre, descripcion: arch.descripcion || "" })}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600">
                                                                <Pencil size={12} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => deleteArchivo(arch.id, cat.id)} disabled={deletingFile === arch.id}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500">
                                                            {deletingFile === arch.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Formulario nuevo archivo */}
                                            {isUploadingHere && (
                                                <div className="px-5 py-4 bg-indigo-50/50 dark:bg-indigo-900/10 border-t border-indigo-100 dark:border-indigo-900/30 space-y-3">
                                                    {!newFile.archivo ? (
                                                        <label className={`flex items-center justify-center gap-2 h-20 border-2 border-dashed rounded-xl cursor-pointer transition-all
                                                            ${uploading ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"}`}>
                                                            {uploading ? <Loader2 size={18} className="animate-spin text-indigo-400" /> : <Upload size={18} className="text-slate-400" />}
                                                            <span className="text-[12px] text-slate-400 font-medium">{uploading ? "Subiendo..." : "Seleccioná el archivo"}</span>
                                                            <input type="file" className="hidden" disabled={uploading} onChange={e => e.target.files?.[0] && uploadArchivo(cat.id, e.target.files[0])} />
                                                        </label>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                                                {tipoIcon[newFile.tipo] || tipoIcon.otro}
                                                                <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400 flex-1 truncate">Archivo listo</span>
                                                                {newFile.tamano && <span className="text-[11px] text-slate-400">{newFile.tamano}</span>}
                                                                <button type="button" onClick={() => setNewFile(prev => ({ ...prev, archivo: "", tipo: "", tamano: "" }))}
                                                                    className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                                                            </div>
                                                            <input value={newFile.nombre} onChange={e => setNewFile(prev => ({ ...prev, nombre: e.target.value }))}
                                                                placeholder="Nombre del archivo *"
                                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                                                            <input value={newFile.descripcion} onChange={e => setNewFile(prev => ({ ...prev, descripcion: e.target.value }))}
                                                                placeholder="Descripción (opcional)"
                                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                                                        </div>
                                                    )}
                                                    <div className="flex gap-2">
                                                        <button onClick={() => saveArchivo(cat.id)} disabled={!newFile.archivo || !newFile.nombre.trim() || savingFile}
                                                            className="flex items-center gap-1.5 px-4 h-8 bg-indigo-600 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all">
                                                            {savingFile ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Guardar
                                                        </button>
                                                        <button onClick={() => { setUploadingFor(null); setNewFile({ nombre: "", descripcion: "", archivo: "", tipo: "", tamano: "" }); }}
                                                            className="flex items-center gap-1.5 px-4 h-8 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl text-[12px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">
                                                            <X size={12} /> Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Botón agregar archivo */}
                                            {!isUploadingHere && (
                                                <button onClick={() => { setUploadingFor(cat.id); setOpenCats(prev => new Set([...prev, cat.id])); }}
                                                    className="w-full flex items-center justify-center gap-1.5 py-3 text-[12px] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all font-medium">
                                                    <Plus size={13} /> Agregar archivo
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
