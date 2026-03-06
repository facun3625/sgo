"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    ChevronLeft,
    Send,
    FileText,
    Info,
    Loader2,
    CheckCircle2,
    Upload,
    File as FileIcon,
    X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserDatos {
    apellido: string;
    nombre: string;
    tomo: string | null;
    folio: string | null;
    expediente: string | null;
    emailLegal: string | null;
}

export default function SolicitudCatastroPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [datos, setDatos] = useState<UserDatos | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [cuit, setCuit] = useState("");
    const [archivo, setArchivo] = useState<File | null>(null);

    const hoy = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    useEffect(() => {
        const fetchDatos = async () => {
            try {
                const res = await fetch("/api/user/datos");
                if (res.ok) {
                    const data = await res.json();
                    setDatos(data);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDatos();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Validar tipo (PDF o Imagen)
            if (file.type === "application/pdf" || file.type.startsWith("image/")) {
                setArchivo(file);
            } else {
                alert("Por favor, suba un archivo PDF o una imagen.");
                e.target.value = "";
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!archivo) {
            alert("Por favor, adjunte la constancia de inscripción tributaria.");
            return;
        }

        setSubmitting(true);

        try {
            const formData = new FormData();
            formData.append("tipo", "Solicitud de usuario CATASTRO/SIGIT");
            formData.append("emailLegal", datos?.emailLegal || "");
            formData.append("detalles", JSON.stringify({
                tomo: datos?.tomo,
                folio: datos?.folio,
                expediente: datos?.expediente,
                cuit: cuit
            }));
            formData.append("archivo", archivo);

            const res = await fetch("/api/user/solicitudes", {
                method: "POST",
                body: formData
                // No configuramos Content-Type, el navegador lo hará automáticamente con el boundary
            });

            if (res.ok) {
                setSubmitted(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
                const error = await res.json();
                alert(`Error al enviar la solicitud: ${error.details || "Por favor, reintente."}`);
            }
        } catch (error) {
            console.error("Error submitting request:", error);
            alert("Error de conexión. Por favor, reintente.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 size={32} className="text-[#063f68] dark:text-blue-500 animate-spin" />
                <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Cargando formulario...</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#02182b] min-h-screen pb-20 transition-colors duration-300">
            {/* Header Sticky */}
            <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                    >
                        <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <FileText size={18} className="text-slate-400" />
                        <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Solicitud de usuario CATASTRO/SIGIT</h2>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 md:p-10 animate-fade-in">
                {submitted ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-[32px] p-12 text-center space-y-6">
                        <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                            <CheckCircle2 size={40} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-400">¡Solicitud Enviada!</h3>
                            <p className="text-emerald-700/70 dark:text-emerald-400/60 font-medium">
                                Tu solicitud de acceso a CATASTRO/SIGIT ha sido recibida correctamente.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push("/dashboard/solicitudes/enviadas")}
                            className="px-8 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20"
                        >
                            Ver mis solicitudes
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Alerta de Datos NO editables */}
                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex gap-4 items-start">
                            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-amber-500 shadow-sm shrink-0">
                                <Info size={16} />
                            </div>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400/80 leading-relaxed font-medium">
                                Los datos que se autocompletan no pueden ser modificados desde este menú. Si desea hacerlo, diríjase a <Link href="/dashboard/mis-datos" className="underline font-bold">Modificar datos personales</Link>.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nombre y Apellido */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${datos?.apellido || ""} ${datos?.nombre || ""}`.toLowerCase()}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Tomo */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Inscripto al Tomo</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={datos?.tomo || ""}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Folio */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Folio Nº</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={datos?.folio || ""}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Expediente */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Expediente</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={datos?.expediente || ""}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Email Legal */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={datos?.emailLegal || ""}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-red-600 font-bold text-[13px] tracking-tight ml-1 leading-relaxed">
                                    Solicita habilitación al acceso "Sistema de Integración y Gestión de Información Territorial" (SIGIT) implementado por el Servicio de Catastro e Información Territorial del Ministerio de Economía de la Provincia de Santa Fe.
                                </p>

                                {/* CUIT */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Constancia de inscripción tributaria (CUIT)</label>
                                    <input
                                        type="text"
                                        required
                                        value={cuit}
                                        onChange={(e) => setCuit(e.target.value)}
                                        placeholder="Ingrese su CUIT"
                                        className="w-full h-14 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:ring-2 focus:ring-[#063f68] dark:focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>

                                {/* File Upload */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Adjuntar Constancia (PDF o Imagen)</label>

                                    {!archivo ? (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="group flex flex-col items-center justify-center w-full min-h-[140px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] hover:border-[#063f68] dark:hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-blue-500/5 transition-all cursor-pointer"
                                        >
                                            <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                                                <Upload size={24} className="text-slate-400 group-hover:text-[#063f68] dark:group-hover:text-blue-400" />
                                            </div>
                                            <p className="mt-3 text-[13px] font-bold text-slate-500 group-hover:text-[#063f68] dark:group-hover:text-blue-400">
                                                Seleccionar archivo
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1">Carga de archivo disponible desde ordenador</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                                    <FileIcon size={20} className="text-[#063f68] dark:text-blue-400" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[13px] font-bold text-black dark:text-white truncate max-w-[200px] md:max-w-xs">{archivo.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{(archivo.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setArchivo(null)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    )}

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept="application/pdf,image/*"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full md:w-auto h-14 px-12 bg-[#063f68] dark:bg-blue-600 hover:bg-[#0a4d7a] dark:hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-500/10 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Enviando solicitud y archivo...
                                    </>
                                ) : (
                                    <>
                                        Enviar Solicitud
                                        <Send size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
