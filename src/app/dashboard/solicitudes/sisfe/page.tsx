"use client";

import React, { useState, useEffect } from "react";
import {
    ChevronLeft,
    Send,
    FileText,
    Info,
    Loader2,
    CheckCircle2,
    Lock,
    AlertCircle,
    ArrowRight,
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

export default function SolicitudSISFEPage() {
    const router = useRouter();
    const [datos, setDatos] = useState<UserDatos | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [existing, setExisting] = useState<{ id: number; estado: string; detalles: any } | null>(null);

    const hoy = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    useEffect(() => {
        Promise.all([
            fetch("/api/user/datos").then(r => r.json()),
            fetch("/api/user/solicitudes/check?tipo=SISFE").then(r => r.json()),
        ]).then(([datosData, checkData]) => {
            setDatos(datosData);
            if (checkData.found) setExisting(checkData.solicitud);
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch("/api/user/solicitudes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipo: "Solicitud de Visualización de expedientes judiciales (SISFE)",
                    emailLegal: datos?.emailLegal,
                    detalles: {
                        tomo: datos?.tomo,
                        folio: datos?.folio,
                        expediente: datos?.expediente,
                        visualizacionSISFE: true
                    }
                })
            });

            if (res.ok) {
                setSubmitted(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
                alert("Error al enviar la solicitud. Por favor, reintente.");
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
                <p className="text-slate-700 dark:text-slate-400 font-medium tracking-tight">Cargando formulario...</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#02182b] pb-20 transition-colors duration-300">
            {/* Header Sticky - AHORA IGUAL A CERTIFICADOS (BLANCO) */}
            <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                    >
                        <ChevronLeft size={20} className="text-slate-700 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <FileText size={18} className="text-blue-600" />
                        <h2 className="text-[16px] font-bold text-black dark:text-white tracking-tight text-balance">Solicitud de Visualización de expedientes judiciales</h2>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-10 animate-fade-in">
                {submitted ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-[32px] p-12 text-center space-y-6">
                        <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                            <CheckCircle2 size={40} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-400">¡Solicitud Enviada!</h3>
                            <p className="text-emerald-700/70 dark:text-emerald-400/60 font-medium">
                                Tu solicitud de clave SISFE ha sido recibida y será procesada a la brevedad.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push("/dashboard/solicitudes/enviadas")}
                            className="px-8 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20"
                        >
                            Ver mis solicitudes
                        </button>
                    </div>
                ) : existing ? (
                    <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                            {existing.estado === "completada" ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-amber-600" />}
                        </div>
                        <div className="flex-1">
                            {existing.estado === "completada" ? (
                                <>
                                    <p className="text-[15px] font-black text-emerald-800 dark:text-emerald-300 mb-1">Ya tenés tu clave SISFE</p>
                                    {existing.detalles?.respuesta?.clave && (
                                        <p className="text-[14px] font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                                            Clave: <strong>{existing.detalles.respuesta.clave}</strong>
                                        </p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p className="text-[15px] font-black text-amber-800 dark:text-amber-300 mb-1">Ya tenés una solicitud en proceso</p>
                                    <p className="text-[13px] text-amber-700 dark:text-amber-400 mb-2">Tu pedido está siendo procesado por el Colegio.</p>
                                </>
                            )}
                            <Link href="/dashboard/solicitudes/enviadas"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-xl text-[12px] font-bold hover:bg-amber-50 transition-all">
                                Ver en mis solicitudes <ArrowRight size={11} />
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Alerta de Datos NO editables */}
                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex gap-4 items-start">
                            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-amber-500 shadow-sm shrink-0">
                                <Info size={16} />
                            </div>
                            <p className="text-[12px] text-amber-700 dark:text-amber-400/80 leading-relaxed font-medium">
                                Los datos que se autocompletan no pueden ser modificados desde este menú. Si desea hacerlo, diríjase a <Link href="/dashboard/mis-datos" className="underline font-bold">Modificar datos personales</Link>.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nombre y Apellido */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">El que suscribe, Dr/Dra</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${datos?.apellido || ""} ${datos?.nombre || ""}`.toLowerCase()}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Tomo */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">Inscripto al Tomo</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={datos?.tomo || ""}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Folio */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">Folio Nº</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={datos?.folio || ""}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Expediente */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">Expediente</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={datos?.expediente || ""}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Fecha */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">En Fecha</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={hoy}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Email Legal */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">Email (Legal)</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={datos?.emailLegal || ""}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>
                            </div>

                            <div className="py-2">
                                <p className="text-red-500 font-bold text-[15px] tracking-tight ml-1 animate-pulse">
                                    Solicito la clave de visualización de expedientes judiciales
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full md:w-auto h-14 px-12 bg-[#063f68] dark:bg-blue-600 hover:bg-[#0a4d7a] dark:hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-500/10 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Enviando...
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
