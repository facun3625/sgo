"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, X, Loader2, Newspaper, Star, Trash2, Images, Plus } from "lucide-react";

interface NoticiaFormProps {
    initialData?: {
        id: number;
        titulo: string;
        contenido: string;
        imagen: string | null;
        imagenes: string[];
        activa: boolean;
        destacada: boolean;
    };
}

export default function NoticiaForm({ initialData }: NoticiaFormProps) {
    const router = useRouter();
    const isEdit = !!initialData;
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imagen || null);
    const [form, setForm] = useState({
        titulo: initialData?.titulo || "",
        contenido: initialData?.contenido || "",
        imagen: initialData?.imagen || "",
        imagenes: initialData?.imagenes || [] as string[],
        activa: initialData?.activa ?? true,
        destacada: initialData?.destacada ?? false,
    });
    const [error, setError] = useState("");

    function setField(key: string, value: string | boolean | string[]) {
        setForm(prev => ({ ...prev, [key]: value }));
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/admin/noticias/upload", { method: "POST", body: fd });
            const data = await res.json();
            setForm(prev => ({ ...prev, imagen: data.url }));
            setImagePreview(data.url);
        } catch {
            setError("Error al subir la imagen");
        } finally {
            setUploadingImage(false);
        }
    }

    async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploadingGallery(true);
        try {
            const urls: string[] = [];
            for (const file of files) {
                const fd = new FormData();
                fd.append("file", file);
                const res = await fetch("/api/admin/noticias/upload", { method: "POST", body: fd });
                const data = await res.json();
                urls.push(data.url);
            }
            setForm(prev => ({ ...prev, imagenes: [...prev.imagenes, ...urls] }));
        } catch {
            setError("Error al subir imágenes de galería");
        } finally {
            setUploadingGallery(false);
            e.target.value = "";
        }
    }

    function removeGalleryImage(url: string) {
        setForm(prev => ({ ...prev, imagenes: prev.imagenes.filter(i => i !== url) }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!form.titulo || !form.contenido) {
            setError("Título y contenido son obligatorios.");
            return;
        }
        setSaving(true);
        try {
            const url = isEdit ? `/api/admin/noticias/${initialData!.id}` : "/api/admin/noticias";
            const method = isEdit ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, imagen: form.imagen || null }),
            });
            if (!res.ok) throw new Error();
            router.push("/admin/noticias");
        } catch {
            setError("Error al guardar. Intentá de nuevo.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm("¿Eliminás esta noticia?")) return;
        setDeleting(true);
        await fetch(`/api/admin/noticias/${initialData!.id}`, { method: "DELETE" });
        router.push("/admin/noticias");
    }

    return (
        <div className="p-6 md:p-10 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/admin/noticias"
                        className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        <ArrowLeft size={16} className="text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white">{isEdit ? "Editar noticia" : "Nueva noticia"}</h1>
                        <p className="text-slate-400 text-sm mt-0.5">{isEdit ? "Modificá los datos de la noticia" : "Completá los datos de la noticia"}</p>
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
                {/* Imagen destacada */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-3">Imagen destacada</label>
                    <div className="flex items-start gap-4">
                        <div className="w-40 h-28 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <Newspaper size={28} className="text-slate-300" />
                            )}
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="flex items-center gap-2 px-4 h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[12px] font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-all w-fit">
                                {uploadingImage ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                                {uploadingImage ? "Subiendo..." : "Subir imagen"}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                            </label>
                            {imagePreview && (
                                <button type="button" onClick={() => { setImagePreview(null); setField("imagen", ""); }}
                                    className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-red-500 transition-colors">
                                    <X size={11} /> Quitar imagen
                                </button>
                            )}
                            <p className="text-[11px] text-slate-400">PNG, JPG. Recomendado: 1200×630px</p>
                        </div>
                    </div>
                </div>

                {/* Galería */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Images size={15} className="text-slate-400" />
                            <label className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Galería de imágenes</label>
                        </div>
                        <label className="flex items-center gap-2 px-3 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[12px] font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                            {uploadingGallery ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                            {uploadingGallery ? "Subiendo..." : "Agregar fotos"}
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} disabled={uploadingGallery} />
                        </label>
                    </div>

                    {form.imagenes.length === 0 ? (
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
                            <Images size={24} className="text-slate-300 mx-auto mb-2" />
                            <p className="text-[12px] text-slate-400">No hay imágenes en la galería. Podés agregar múltiples fotos.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                            {form.imagenes.map((url, i) => (
                                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                                    <img src={url} alt={`Galería ${i + 1}`} className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => removeGalleryImage(url)}
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <X size={16} className="text-white" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Datos */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                    <h2 className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Contenido</h2>

                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-500">Título *</label>
                        <input value={form.titulo} onChange={e => setField("titulo", e.target.value)}
                            placeholder="Ej: Nuevas disposiciones sobre honorarios profesionales"
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-500">Contenido *</label>
                        <textarea value={form.contenido} onChange={e => setField("contenido", e.target.value)}
                            placeholder="Escribí el contenido completo de la noticia..."
                            rows={10}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68] resize-y leading-relaxed" />
                    </div>
                </div>

                {/* Configuración */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-1">
                    <h2 className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-3">Configuración</h2>

                    <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800">
                        <div>
                            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Activa</p>
                            <p className="text-[11px] text-slate-400">Visible para los matriculados</p>
                        </div>
                        <button type="button" onClick={() => setField("activa", !form.activa)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${form.activa ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.activa ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Star size={13} className="text-amber-400" fill="currentColor" /> Destacada (popup)
                            </p>
                            <p className="text-[11px] text-slate-400">Aparece como popup al ingresar al dashboard</p>
                        </div>
                        <button type="button" onClick={() => setField("destacada", !form.destacada)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${form.destacada ? "bg-amber-400" : "bg-slate-200 dark:bg-slate-700"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.destacada ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-[13px] text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                <div className="flex items-center gap-3 pb-6">
                    <Link href="/admin/noticias"
                        className="flex-1 flex items-center justify-center h-11 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        Cancelar
                    </Link>
                    <button type="submit" disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 h-11 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all active:scale-95 disabled:opacity-60">
                        {saving ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : isEdit ? "Guardar cambios" : "Publicar noticia"}
                    </button>
                </div>
            </form>
        </div>
    );
}
