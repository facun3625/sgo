"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    User,
    Home,
    ShieldAlert,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Info,
    Pencil,
    X,
    Lock,
} from "lucide-react";

interface DatoPayload {
    id: number;
    apellido: string;
    nombre: string;
    cuil: string | null;
    documento: string | null;
    expediente: string | null;
    folio: string | null;
    tomo: string | null;
    fechaMatriculacion: string | null;
    domicilioLegal: string | null;
    postalLegal: string | null;
    localidadLegal: string | null;
    telefonosLegal: string | null;
    emailLegal: string | null;
    codMovilLegal: string | null;
    movilLegal: string | null;
    domicilioReal: string | null;
    postalReal: string | null;
    localidadReal: string | null;
    provinciaReal: string | null;
    telefonosReal: string | null;
    emailReal: string | null;
    codMovilReal: string | null;
    movilReal: string | null;
}

export default function PersonalDocsForm() {
    const router = useRouter();
    const [formData, setFormData] = useState<DatoPayload | null>(null);
    const [savedData, setSavedData] = useState<DatoPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch("/api/user/datos");
            const data = await res.json();
            if (res.ok) {
                setFormData(data);
                setSavedData(data);
                if (!data.cuil) setIsEditing(true);
            } else {
                setMessage({ type: "error", text: data.error || "Error al cargar datos" });
            }
        } catch {
            setMessage({ type: "error", text: "Error de conexión" });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setSavedData(formData);
        setIsEditing(true);
        setMessage(null);
    };

    const handleCancel = () => {
        if (!savedData?.cuil) return;
        setFormData(savedData);
        setIsEditing(false);
        setMessage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!savedData?.cuil && !formData?.cuil?.trim()) {
            setMessage({ type: "error", text: "El CUIL es obligatorio para continuar" });
            return;
        }
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch("/api/user/datos", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ type: "success", text: "Cambios guardados exitosamente" });
                const eraPrimerCuil = !savedData?.cuil && !!formData?.cuil;
                setSavedData(formData);
                setIsEditing(false);
                if (eraPrimerCuil) router.refresh();
            } else {
                setMessage({ type: "error", text: data.error || "Error al guardar cambios" });
            }
        } catch {
            setMessage({ type: "error", text: "Error de conexión" });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof DatoPayload, value: string) => {
        if (!formData) return;
        setFormData({ ...formData, [field]: value });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 size={32} className="text-[#063f68] dark:text-blue-500 animate-spin" />
                <p className="text-slate-700 dark:text-slate-400 font-medium">Cargando legajo personal...</p>
            </div>
        );
    }

    if (!formData) return null;

    return (
        <form onSubmit={handleSubmit} className="space-y-10 animate-fade-in pb-12">

            {/* Banner CUIL faltante */}
            {!savedData?.cuil && (
                <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-[14px] font-bold text-amber-700 dark:text-amber-400">Completá tu CUIL para continuar usando la plataforma</p>
                        <p className="text-[13px] text-amber-600 dark:text-amber-500 mt-0.5">
                            Ingresá tu número de CUIL y aprovechá para verificar que el resto de tus datos estén actualizados.
                        </p>
                    </div>
                </div>
            )}

            {/* Mensaje de feedback */}
            {message && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm animate-fade-in ${message.type === "success"
                    ? "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900/50 text-green-700 dark:text-green-400"
                    : "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-400"
                    }`}>
                    {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="font-medium">{message.text}</span>
                    <button type="button" onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100">✕</button>
                </div>
            )}

            {/* Botón Editar / Guardar / Cancelar */}
            <div className="flex items-center justify-between">
                <p className="text-[12px] text-slate-700 dark:text-slate-500 font-medium">
                    {isEditing ? "Modificá los campos que necesitás actualizar." : "Tus datos personales y de contacto registrados en el Colegio."}
                </p>
                {!isEditing ? (
                    <button
                        type="button"
                        onClick={handleEdit}
                        className="flex items-center gap-2 px-5 h-10 bg-[#063f68] dark:bg-blue-600 text-white rounded-xl font-bold text-[13px] hover:bg-[#0a4d7a] dark:hover:bg-blue-500 transition-all active:scale-95"
                    >
                        <Pencil size={14} />
                        Editar datos
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        {savedData?.cuil && (
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="flex items-center gap-2 px-4 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                            >
                                <X size={14} />
                                Cancelar
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-5 h-10 bg-[#063f68] dark:bg-blue-600 text-white rounded-xl font-bold text-[13px] hover:bg-[#0a4d7a] dark:hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                )}
            </div>

            {/* SECCIÓN 1: DATOS INSTITUCIONALES (siempre read-only) */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#063f68]/10 dark:bg-blue-400/10 text-[#063f68] dark:text-blue-400 flex items-center justify-center">
                            <ShieldAlert size={16} />
                        </div>
                        <h3 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Datos Institucionales</h3>
                    </div>
                    <div className="px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-100 dark:border-amber-900/50 flex items-center gap-1.5">
                        <Info size={11} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Solo Lectura</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DisplayField label="Apellido" value={formData.apellido} />
                    <DisplayField label="Nombre" value={formData.nombre} />
                    <DisplayField label="Documento (DNI)" value={formData.documento} />
                    <DisplayField label="Expediente / Matrícula" value={formData.expediente} />
                    <DisplayField label="Folio" value={formData.folio} />
                    <DisplayField label="Tomo" value={formData.tomo} />
                    <DisplayField
                        label="Fecha Matriculación"
                        value={(() => {
                            if (!formData.fechaMatriculacion) return "--";
                            const d = new Date(formData.fechaMatriculacion);
                            if (isNaN(d.getTime())) return "--";
                            return `${d.getUTCDate().toString().padStart(2,"0")}/${(d.getUTCMonth()+1).toString().padStart(2,"0")}/${d.getUTCFullYear()}`;
                        })()}
                    />
                    {/* CUIL — editable solo la primera vez */}
                    {!savedData?.cuil ? (
                        <div className="space-y-1.5 group md:col-span-1">
                            <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest ml-1">
                                CUIL *
                            </label>
                            <input
                                type="text"
                                value={formData.cuil || ""}
                                onChange={(e) => handleChange("cuil", e.target.value)}
                                placeholder="Ej: 20-12345678-9"
                                className="w-full h-11 px-4 rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 transition-all outline-none text-[14px] text-black dark:text-white font-medium"
                            />
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                                CUIL <Lock size={9} />
                            </label>
                            <div className="w-full h-11 px-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center text-[14px] text-slate-600 dark:text-slate-400 font-medium">
                                {formData.cuil}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* SECCIÓN 2: DOMICILIO LEGAL */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#063f68]/10 dark:bg-blue-400/10 text-[#063f68] dark:text-blue-400 flex items-center justify-center">
                        <Home size={16} />
                    </div>
                    <h3 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Domicilio Legal</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Dirección" value={formData.domicilioLegal} editing={isEditing} onChange={(v) => handleChange("domicilioLegal", v)} placeholder="Calle, Número, Piso, Dpto" />
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Localidad" value={formData.localidadLegal} editing={isEditing} onChange={(v) => handleChange("localidadLegal", v)} />
                        <Field label="Cód. Postal" value={formData.postalLegal} editing={isEditing} onChange={(v) => handleChange("postalLegal", v)} />
                    </div>
                    <Field label="Teléfonos" value={formData.telefonosLegal} editing={isEditing} onChange={(v) => handleChange("telefonosLegal", v)} placeholder="Ej: 0342-457..." />
                    <Field label="Email Institucional" value={formData.emailLegal} editing={isEditing} onChange={(v) => handleChange("emailLegal", v)} type="email" />
                    <div className="grid grid-cols-3 gap-4">
                        <Field label="Cód. Área" value={formData.codMovilLegal} editing={isEditing} onChange={(v) => handleChange("codMovilLegal", v)} />
                        <div className="col-span-2">
                            <Field label="Celular Legal" value={formData.movilLegal} editing={isEditing} onChange={(v) => handleChange("movilLegal", v)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 3: DOMICILIO REAL */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#063f68]/10 dark:bg-blue-400/10 text-[#063f68] dark:text-blue-400 flex items-center justify-center">
                        <User size={16} />
                    </div>
                    <h3 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Domicilio Real</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Dirección Real" value={formData.domicilioReal} editing={isEditing} onChange={(v) => handleChange("domicilioReal", v)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Localidad" value={formData.localidadReal} editing={isEditing} onChange={(v) => handleChange("localidadReal", v)} />
                        <Field label="Provincia" value={formData.provinciaReal} editing={isEditing} onChange={(v) => handleChange("provinciaReal", v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Cód. Postal" value={formData.postalReal} editing={isEditing} onChange={(v) => handleChange("postalReal", v)} />
                        <Field label="Teléfonos" value={formData.telefonosReal} editing={isEditing} onChange={(v) => handleChange("telefonosReal", v)} />
                    </div>
                    <Field label="Email Personal" value={formData.emailReal} editing={isEditing} onChange={(v) => handleChange("emailReal", v)} type="email" />
                    <div className="grid grid-cols-3 gap-4">
                        <Field label="Cód. Área" value={formData.codMovilReal} editing={isEditing} onChange={(v) => handleChange("codMovilReal", v)} />
                        <div className="col-span-2">
                            <Field label="Celular Real" value={formData.movilReal} editing={isEditing} onChange={(v) => handleChange("movilReal", v)} />
                        </div>
                    </div>
                </div>
            </div>
            {/* Botón guardar inferior (solo en modo edición) */}
            {isEditing && (
                <div className="flex items-center justify-end gap-2 pt-2">
                    {savedData?.cuil && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex items-center gap-2 px-4 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                        >
                            <X size={14} />
                            Cancelar
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-5 h-10 bg-[#063f68] dark:bg-blue-600 text-white rounded-xl font-bold text-[13px] hover:bg-[#0a4d7a] dark:hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            )}
        </form>
    );
}

function DisplayField({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
            <div className="w-full h-11 px-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center text-[14px] text-slate-600 dark:text-slate-400 font-medium">
                {value || <span className="text-slate-300 dark:text-slate-600">--</span>}
            </div>
        </div>
    );
}

function Field({
    label, value, editing, onChange, type = "text", placeholder
}: {
    label: string;
    value: string | null;
    editing: boolean;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
}) {
    if (!editing) {
        return <DisplayField label={label} value={value} />;
    }

    return (
        <div className="space-y-1.5 group">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-[#063f68] dark:group-focus-within:text-blue-500 transition-colors">
                {label}
            </label>
            <input
                type={type}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-[#063f68] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#063f68]/10 transition-all outline-none text-[14px] text-black dark:text-white font-medium"
            />
        </div>
    );
}
