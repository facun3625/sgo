"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, X, Plus, Trash2, Loader2, GraduationCap } from "lucide-react";

interface Opcion {
    nombre: string;
    precio: number;
    cupo: number;
}

export default function NuevoCursoPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [form, setForm] = useState({
        titulo: "",
        descripcion: "",
        organizador: "",
        fecha: "",
        fechaFin: "",
        hora: "",
        lugar: "",
        imagen: "",
        modalidad: "Presencial",
        fechaLimiteInscripcion: "",
        activo: true,
        mostrarEnCalendario: false,
    });
    const [opciones, setOpciones] = useState<Opcion[]>([
        { nombre: "", precio: 0, cupo: 0 }
    ]);
    const [error, setError] = useState("");

    function setField(key: string, value: string | boolean) {
        setForm(prev => ({ ...prev, [key]: value }));
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/admin/cursos/upload", { method: "POST", body: fd });
            const data = await res.json();
            setForm(prev => ({ ...prev, imagen: data.url }));
            setImagePreview(data.url);
        } catch {
            setError("Error al subir la imagen");
        } finally {
            setUploadingImage(false);
        }
    }

    function addOpcion() {
        setOpciones(prev => [...prev, { nombre: "", precio: 0, cupo: 0 }]);
    }

    function removeOpcion(i: number) {
        setOpciones(prev => prev.filter((_, idx) => idx !== i));
    }

    function updateOpcion(i: number, key: keyof Opcion, value: string | number) {
        setOpciones(prev => prev.map((op, idx) => idx === i ? { ...op, [key]: value } : op));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (!form.titulo || !form.descripcion || !form.fecha) {
            setError("Título, descripción y fecha son obligatorios.");
            return;
        }
        if (opciones.some(o => !o.nombre)) {
            setError("Todas las opciones deben tener un nombre.");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/admin/cursos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    organizador: form.organizador || null,
                    fechaFin: form.fechaFin || null,
                    hora: form.hora || null,
                    lugar: form.lugar || null,
                    imagen: form.imagen || null,
                    fechaLimiteInscripcion: form.fechaLimiteInscripcion || null,
                    opciones: opciones.map(o => ({
                        nombre: o.nombre,
                        precio: Number(o.precio),
                        cupo: Number(o.cupo),
                    })),
                }),
            });
            if (!res.ok) throw new Error("Error al crear curso");
            router.push("/admin/cursos");
        } catch {
            setError("Error al guardar el curso. Intentá de nuevo.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="p-6 md:p-10 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/admin/cursos"
                    className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                    <ArrowLeft size={16} className="text-slate-500" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Nuevo curso</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Completá los datos del curso</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Imagen */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-3">Imagen del curso</label>
                    <div className="flex items-start gap-4">
                        <div className="w-32 h-24 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <GraduationCap size={28} className="text-slate-300" />
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
                            <p className="text-[11px] text-slate-400">PNG, JPG. Recomendado: 800×450px</p>
                        </div>
                    </div>
                </div>

                {/* Datos principales */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                    <h2 className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Datos del curso</h2>

                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-500">Título *</label>
                        <input
                            value={form.titulo}
                            onChange={e => setField("titulo", e.target.value)}
                            placeholder="Ej: Jornada de Derecho Laboral 2026"
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-500">Descripción *</label>
                        <textarea
                            value={form.descripcion}
                            onChange={e => setField("descripcion", e.target.value)}
                            placeholder="Descripción del curso, contenido, disertantes..."
                            rows={4}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68] resize-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-500">Organizador</label>
                        <input
                            value={form.organizador}
                            onChange={e => setField("organizador", e.target.value)}
                            placeholder="Ej: Comisión de Derecho Laboral"
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-slate-500">Fecha inicio *</label>
                            <input
                                type="date"
                                value={form.fecha}
                                onChange={e => setField("fecha", e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-slate-500">Fecha fin <span className="text-slate-300 font-normal">(opcional)</span></label>
                            <input
                                type="date"
                                value={form.fechaFin}
                                onChange={e => setField("fechaFin", e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-slate-500">Hora</label>
                            <input
                                type="time"
                                value={form.hora}
                                onChange={e => setField("hora", e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-slate-500">Modalidad</label>
                            <select
                                value={form.modalidad}
                                onChange={e => setField("modalidad", e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                            >
                                <option>Presencial</option>
                                <option>Virtual</option>
                                <option>Híbrida</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-slate-500">Fecha límite inscripción</label>
                            <input
                                type="date"
                                value={form.fechaLimiteInscripcion}
                                onChange={e => setField("fechaLimiteInscripcion", e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-500">Lugar</label>
                        <input
                            value={form.lugar}
                            onChange={e => setField("lugar", e.target.value)}
                            placeholder="Ej: Salón Auditorio, Piso 3"
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                        />
                    </div>

                    <div className="flex items-center justify-between py-1">
                        <div>
                            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Activo</p>
                            <p className="text-[11px] text-slate-400">Los matriculados pueden ver e inscribirse</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setField("activo", !form.activo)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${form.activo ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.activo ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-1">
                        <div>
                            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Mostrar en calendario</p>
                            <p className="text-[11px] text-slate-400">Aparece en la agenda institucional de los matriculados</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setField("mostrarEnCalendario", !form.mostrarEnCalendario)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${form.mostrarEnCalendario ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.mostrarEnCalendario ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                    </div>
                </div>

                {/* Opciones */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Opciones de inscripción</h2>
                            <p className="text-[11px] text-slate-400 mt-0.5">Podés tener distintas opciones con diferentes precios y cupos</p>
                        </div>
                        <button
                            type="button"
                            onClick={addOpcion}
                            className="flex items-center gap-1.5 px-3 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                            <Plus size={12} /> Agregar
                        </button>
                    </div>

                    <div className="space-y-3">
                        {opciones.map((op, i) => (
                            <div key={i} className="flex items-end gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[11px] font-medium text-slate-400">Nombre</label>
                                    <input
                                        value={op.nombre}
                                        onChange={e => updateOpcion(i, "nombre", e.target.value)}
                                        placeholder="Ej: Matriculado"
                                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[12px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                                    />
                                </div>
                                <div className="w-24 space-y-1.5">
                                    <label className="text-[11px] font-medium text-slate-400">Precio $</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={op.precio}
                                        onChange={e => updateOpcion(i, "precio", e.target.value)}
                                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[12px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                                    />
                                </div>
                                <div className="w-20 space-y-1.5">
                                    <label className="text-[11px] font-medium text-slate-400">Cupo</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={op.cupo}
                                        onChange={e => updateOpcion(i, "cupo", e.target.value)}
                                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[12px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                                    />
                                </div>
                                {opciones.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeOpcion(i)}
                                        className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-[13px] text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* Acciones */}
                <div className="flex items-center gap-3 pb-6">
                    <Link href="/admin/cursos"
                        className="flex-1 flex items-center justify-center h-11 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 h-11 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all active:scale-95 disabled:opacity-60">
                        {saving ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : "Guardar curso"}
                    </button>
                </div>
            </form>
        </div>
    );
}
