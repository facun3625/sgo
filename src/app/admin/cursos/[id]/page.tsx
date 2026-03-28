"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, X, Plus, Trash2, Loader2, GraduationCap, Users, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Opcion {
    id?: number;
    nombre: string;
    precio: number;
    cupo: number;
    inscritos?: number;
}

interface Inscripcion {
    id: number;
    expediente: string;
    estado: string;
    metodoPago: string | null;
    fecha: string;
    opcion: { nombre: string } | null;
}

interface Curso {
    id: number;
    titulo: string;
    descripcion: string;
    organizador: string | null;
    fecha: string;
    fechaFin: string | null;
    hora: string | null;
    lugar: string | null;
    imagen: string | null;
    modalidad: string;
    fechaLimiteInscripcion: string | null;
    activo: boolean;
    mostrarEnCalendario: boolean;
    opciones: Opcion[];
    inscripciones: Inscripcion[];
}

export default function EditarCursoPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"datos" | "inscripciones">("datos");
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
    const [opciones, setOpciones] = useState<Opcion[]>([]);
    const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch(`/api/admin/cursos/${id}`)
            .then(r => r.json())
            .then((data: Curso) => {
                setForm({
                    titulo: data.titulo,
                    descripcion: data.descripcion,
                    organizador: data.organizador || "",
                    fecha: data.fecha.split("T")[0],
                    fechaFin: data.fechaFin ? data.fechaFin.split("T")[0] : "",
                    hora: data.hora || "",
                    lugar: data.lugar || "",
                    imagen: data.imagen || "",
                    modalidad: data.modalidad,
                    fechaLimiteInscripcion: data.fechaLimiteInscripcion ? data.fechaLimiteInscripcion.split("T")[0] : "",
                    activo: data.activo,
                    mostrarEnCalendario: data.mostrarEnCalendario,
                });
                if (data.imagen) setImagePreview(data.imagen);
                setOpciones(data.opciones);
                setInscripciones(data.inscripciones);
            })
            .finally(() => setLoading(false));
    }, [id]);

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
            const res = await fetch(`/api/admin/cursos/${id}`, {
                method: "PATCH",
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
            if (!res.ok) throw new Error();
            showToast("Curso guardado correctamente");
            setTimeout(() => router.push("/admin/cursos"), 3500);
        } catch {
            setError("Error al guardar. Intentá de nuevo.");
        } finally {
            setSaving(false);
        }
    }

    async function handleConfirmarPago(inscId: number) {
        await fetch(`/api/admin/inscripciones/${inscId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: "confirmada" }),
        });
        setInscripciones(prev => prev.map(i => i.id === inscId ? { ...i, estado: "confirmada" } : i));
    }

    async function handleCancelarInscripcion(inscId: number) {
        if (!confirm("¿Cancelás esta inscripción?")) return;
        await fetch(`/api/admin/inscripciones/${inscId}`, { method: "DELETE" });
        setInscripciones(prev => prev.filter(i => i.id !== inscId));
    }

    async function handleDelete() {
        if (!confirm("¿Eliminás este curso? Se borrarán todas sus inscripciones.")) return;
        setDeleting(true);
        await fetch(`/api/admin/cursos/${id}`, { method: "DELETE" });
        router.push("/admin/cursos");
    }

    const estadoLabel: Record<string, { label: string; color: string }> = {
        pendiente_pago: { label: "Pendiente de pago", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
        confirmada: { label: "Confirmada", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
        cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    };

    if (loading) return (
        <div className="p-10 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
    );

    return (
        <div className="p-6 md:p-10 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/admin/cursos"
                        className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        <ArrowLeft size={16} className="text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Editar curso</h1>
                        <p className="text-slate-400 text-sm mt-0.5">{inscripciones.length} inscripción{inscripciones.length !== 1 ? "es" : ""}</p>
                    </div>
                </div>
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 h-9 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[12px] font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all disabled:opacity-60">
                    {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Eliminar
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab("datos")}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${activeTab === "datos" ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                    Datos del curso
                </button>
                <button
                    onClick={() => setActiveTab("inscripciones")}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === "inscripciones" ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                    <Users size={13} />
                    Inscripciones
                    {inscripciones.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-[#063f68] text-white rounded-full text-[10px] font-bold">{inscripciones.length}</span>
                    )}
                </button>
            </div>

            {activeTab === "datos" ? (
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
                                    {uploadingImage ? "Subiendo..." : "Cambiar imagen"}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                                </label>
                                {imagePreview && (
                                    <button type="button" onClick={() => { setImagePreview(null); setField("imagen", ""); }}
                                        className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-red-500 transition-colors">
                                        <X size={11} /> Quitar imagen
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Datos principales */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                        <h2 className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Datos del curso</h2>

                        <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-slate-500">Título *</label>
                            <input value={form.titulo} onChange={e => setField("titulo", e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-slate-500">Descripción *</label>
                            <textarea value={form.descripcion} onChange={e => setField("descripcion", e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68] resize-none" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-slate-500">Organizador</label>
                            <input value={form.organizador} onChange={e => setField("organizador", e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-medium text-slate-500">Fecha inicio *</label>
                                <input type="date" value={form.fecha} onChange={e => setField("fecha", e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-medium text-slate-500">Fecha fin <span className="text-slate-300 font-normal">(opcional)</span></label>
                                <input type="date" value={form.fechaFin} onChange={e => setField("fechaFin", e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-medium text-slate-500">Hora</label>
                                <input type="time" value={form.hora} onChange={e => setField("hora", e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-medium text-slate-500">Modalidad</label>
                                <select value={form.modalidad} onChange={e => setField("modalidad", e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]">
                                    <option>Presencial</option>
                                    <option>Virtual</option>
                                    <option>Híbrida</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-medium text-slate-500">Fecha límite inscripción</label>
                                <input type="date" value={form.fechaLimiteInscripcion} onChange={e => setField("fechaLimiteInscripcion", e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-slate-500">Lugar</label>
                            <input value={form.lugar} onChange={e => setField("lugar", e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                        </div>

                        <div className="flex items-center justify-between py-1">
                            <div>
                                <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Activo</p>
                                <p className="text-[11px] text-slate-400">Los matriculados pueden ver e inscribirse</p>
                            </div>
                            <button type="button" onClick={() => setField("activo", !form.activo)}
                                className={`relative w-11 h-6 rounded-full transition-colors ${form.activo ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}>
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.activo ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between py-1">
                            <div>
                                <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Mostrar en calendario</p>
                                <p className="text-[11px] text-slate-400">Aparece en la agenda institucional de los matriculados</p>
                            </div>
                            <button type="button" onClick={() => setField("mostrarEnCalendario", !form.mostrarEnCalendario)}
                                className={`relative w-11 h-6 rounded-full transition-colors ${form.mostrarEnCalendario ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"}`}>
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.mostrarEnCalendario ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                        </div>
                    </div>

                    {/* Opciones */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Opciones de inscripción</h2>
                                <p className="text-[11px] text-slate-400 mt-0.5">Cambiar opciones no afecta inscripciones ya realizadas</p>
                            </div>
                            <button type="button" onClick={addOpcion}
                                className="flex items-center gap-1.5 px-3 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                                <Plus size={12} /> Agregar
                            </button>
                        </div>

                        <div className="space-y-3">
                            {opciones.map((op, i) => (
                                <div key={i} className="flex items-end gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-[11px] font-medium text-slate-400">Nombre</label>
                                        <input value={op.nombre} onChange={e => updateOpcion(i, "nombre", e.target.value)}
                                            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[12px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                                    </div>
                                    <div className="w-24 space-y-1.5">
                                        <label className="text-[11px] font-medium text-slate-400">Precio $</label>
                                        <input type="number" min="0" value={op.precio} onChange={e => updateOpcion(i, "precio", e.target.value)}
                                            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[12px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                                    </div>
                                    <div className="w-20 space-y-1.5">
                                        <label className="text-[11px] font-medium text-slate-400">Cupo</label>
                                        <input type="number" min="0" value={op.cupo} onChange={e => updateOpcion(i, "cupo", e.target.value)}
                                            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[12px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]" />
                                    </div>
                                    {opciones.length > 1 && (
                                        <button type="button" onClick={() => removeOpcion(i)}
                                            className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-[13px] text-red-600 dark:text-red-400 flex items-center gap-2">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    <div className="flex items-center gap-3 pb-6">
                        <Link href="/admin/cursos"
                            className="flex-1 flex items-center justify-center h-11 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            Cancelar
                        </Link>
                        <button type="submit" disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 h-11 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all active:scale-95 disabled:opacity-60">
                            {saving ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : "Guardar cambios"}
                        </button>
                    </div>
                </form>
            ) : (
                /* Inscripciones tab */
                <div className="space-y-4 pb-6">
                    {inscripciones.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
                            <Users size={28} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 text-[13px] font-medium">Sin inscripciones todavía</p>
                        </div>
                    ) : (
                        <>
                            {/* Contadores */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Total", count: inscripciones.length, cls: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300" },
                                    { label: "Confirmadas", count: inscripciones.filter(i => i.estado === "confirmada").length, cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" },
                                    { label: "Pend. pago", count: inscripciones.filter(i => i.estado === "pendiente_pago").length, cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" },
                                ].map(s => (
                                    <div key={s.label} className={`rounded-xl p-3 text-center ${s.cls}`}>
                                        <p className="text-xl font-bold">{s.count}</p>
                                        <p className="text-[11px] font-medium opacity-70">{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Lista */}
                            <div className="space-y-2">
                                {inscripciones.map(insc => {
                                    const est = estadoLabel[insc.estado] || { label: insc.estado, color: "bg-slate-100 text-slate-600" };
                                    return (
                                        <div key={insc.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{insc.expediente}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    {insc.opcion?.nombre || "Sin opción"}
                                                    <span className="mx-1.5">·</span>
                                                    {new Date(insc.fecha).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })}
                                                </p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${est.color}`}>
                                                {est.label}
                                            </span>
                                            {insc.estado === "pendiente_pago" && (
                                                <button
                                                    onClick={() => handleConfirmarPago(insc.id)}
                                                    className="flex-shrink-0 px-3 h-8 bg-emerald-500 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-600 transition-all active:scale-95">
                                                    Confirmar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleCancelarInscripcion(insc.id)}
                                                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
