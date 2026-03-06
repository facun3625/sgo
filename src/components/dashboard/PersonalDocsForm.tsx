"use client";

import React, { useState, useEffect } from "react";
import {
    User,
    Home,
    Phone,
    Mail,
    ShieldAlert,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Info
} from "lucide-react";

interface DatoPayload {
    id: number;
    apellido: string;
    nombre: string;
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
    const [formData, setFormData] = useState<DatoPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
            } else {
                setMessage({ type: "error", text: data.error || "Error al cargar datos" });
            }
        } catch (error) {
            setMessage({ type: "error", text: "Error de conexión" });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                // Re-fetch to ensure sync
                fetchData();
            } else {
                setMessage({ type: "error", text: data.error || "Error al guardar cambios" });
            }
        } catch (error) {
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
                <p className="text-slate-500 dark:text-slate-400 font-medium">Cargando legajo personal...</p>
            </div>
        );
    }

    if (!formData) return null;

    return (
        <form onSubmit={handleSubmit} className="space-y-12 animate-fade-in pb-20">

            {/* Mensajes de feedback */}
            {message && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm animate-fade-in sticky top-24 z-20 shadow-lg ${message.type === "success"
                        ? "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900/50 text-green-700 dark:text-green-400"
                        : "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-400"
                    }`}>
                    {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="font-medium">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100">✕</button>
                </div>
            )}

            {/* SECCIÓN 1: DATOS MAESTROS (Read Only) */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#063f68]/10 dark:bg-blue-400/10 text-[#063f68] dark:text-blue-400 flex items-center justify-center">
                            <ShieldAlert size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-black dark:text-white tracking-tight">Datos Institucionales</h3>
                    </div>
                    <div className="px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-100 dark:border-amber-900/50 flex items-center gap-2">
                        <Info size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Solo Lectura</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ReadOnlyField label="Apellido" value={formData.apellido} />
                    <ReadOnlyField label="Nombre" value={formData.nombre} />
                    <ReadOnlyField label="Documento (DNI)" value={formData.documento} />
                    <ReadOnlyField label="Expediente / Matrícula" value={formData.expediente} />
                    <ReadOnlyField label="Folio" value={formData.folio} />
                    <ReadOnlyField label="Tomo" value={formData.tomo} />
                    <ReadOnlyField
                        label="Fecha Matriculación"
                        value={formData.fechaMatriculacion ? new Date(formData.fechaMatriculacion).toLocaleDateString() : "--"}
                    />
                </div>
            </div>

            {/* SECCIÓN 2: DOMICILIO LEGAL (Editable) */}
            <div className="space-y-8">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#063f68]/10 dark:bg-blue-400/10 text-[#063f68] dark:text-blue-400 flex items-center justify-center">
                        <Home size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-black dark:text-white tracking-tight">Domicilio Legal</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <EditableField
                        label="Dirección"
                        value={formData.domicilioLegal}
                        onChange={(v) => handleChange("domicilioLegal", v)}
                        placeholder="Calle, Número, Piso, Dpto"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <EditableField
                            label="Localidad"
                            value={formData.localidadLegal}
                            onChange={(v) => handleChange("localidadLegal", v)}
                        />
                        <EditableField
                            label="Cód. Postal"
                            value={formData.postalLegal}
                            onChange={(v) => handleChange("postalLegal", v)}
                        />
                    </div>
                    <EditableField
                        label="Teléfonos"
                        value={formData.telefonosLegal}
                        onChange={(v) => handleChange("telefonosLegal", v)}
                        placeholder="Ej: 0342-457..."
                    />
                    <EditableField
                        label="Email Institucional"
                        value={formData.emailLegal}
                        onChange={(v) => handleChange("emailLegal", v)}
                        type="email"
                    />
                    <div className="grid grid-cols-3 gap-4">
                        <EditableField
                            label="Cód. Área"
                            value={formData.codMovilLegal}
                            onChange={(v) => handleChange("codMovilLegal", v)}
                        />
                        <div className="col-span-2">
                            <EditableField
                                label="Celular Legal"
                                value={formData.movilLegal}
                                onChange={(v) => handleChange("movilLegal", v)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 3: DOMICILIO REAL (Editable) */}
            <div className="space-y-8">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#063f68]/10 dark:bg-blue-400/10 text-[#063f68] dark:text-blue-400 flex items-center justify-center">
                        <User size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-black dark:text-white tracking-tight">Domicilio Real</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <EditableField
                        label="Dirección Real"
                        value={formData.domicilioReal}
                        onChange={(v) => handleChange("domicilioReal", v)}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <EditableField
                            label="Localidad"
                            value={formData.localidadReal}
                            onChange={(v) => handleChange("localidadReal", v)}
                        />
                        <EditableField
                            label="Provincia"
                            value={formData.provinciaReal}
                            onChange={(v) => handleChange("provinciaReal", v)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <EditableField
                            label="Cód. Postal"
                            value={formData.postalReal}
                            onChange={(v) => handleChange("postalReal", v)}
                        />
                        <EditableField
                            label="Teléfonos"
                            value={formData.telefonosReal}
                            onChange={(v) => handleChange("telefonosReal", v)}
                        />
                    </div>
                    <EditableField
                        label="Email Personal"
                        value={formData.emailReal}
                        onChange={(v) => handleChange("emailReal", v)}
                        type="email"
                    />
                    <div className="grid grid-cols-3 gap-4">
                        <EditableField
                            label="Cód. Área"
                            value={formData.codMovilReal}
                            onChange={(v) => handleChange("codMovilReal", v)}
                        />
                        <div className="col-span-2">
                            <EditableField
                                label="Celular Real"
                                value={formData.movilReal}
                                onChange={(v) => handleChange("movilReal", v)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer de Acciones Sticky */}
            <div className="fixed bottom-8 right-8 md:right-12 z-30">
                <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-3 px-8 h-14 bg-[#063f68] dark:bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-2xl hover:bg-[#0a4d7a] dark:hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
            </div>
        </form>
    );
}

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="space-y-1.5 opacity-80">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
            <div className="w-full h-12 px-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center text-sm text-slate-600 dark:text-slate-400 font-semibold italic">
                {value || "--"}
            </div>
        </div>
    );
}

function EditableField({
    label,
    value,
    onChange,
    type = "text",
    placeholder
}: {
    label: string;
    value: string | null;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
}) {
    return (
        <div className="space-y-1.5 group">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-[#063f68] dark:group-focus-within:text-blue-500 transition-colors">
                {label}
            </label>
            <input
                type={type}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:border-[#063f68] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#063f68]/10 dark:focus:ring-blue-500/10 transition-all outline-none text-sm text-black dark:text-white font-medium"
            />
        </div>
    );
}
