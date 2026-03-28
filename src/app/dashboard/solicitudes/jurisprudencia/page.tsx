"use client";

import React, { useState, useEffect } from "react";
import {
    ChevronLeft,
    Send,
    FileText,
    Info,
    Loader2,
    CheckCircle2,
    MessageSquare,
    Phone,
    Mail,
    User,
    IdCard
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserDatos {
    apellido: string;
    nombre: string;
    expediente: string | null;
    emailLegal: string | null;
    telefono: string | null;
}

export default function SolicitudJurisprudenciaPage() {
    const router = useRouter();
    const [datos, setDatos] = useState<UserDatos | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Campos editables
    const [telefono, setTelefono] = useState("");
    const [pedido, setPedido] = useState("");

    useEffect(() => {
        const fetchDatos = async () => {
            try {
                const res = await fetch("/api/user/datos");
                if (res.ok) {
                    const data = await res.json();
                    setDatos(data);
                    setTelefono(data.telefono || "");
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDatos();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch("/api/user/solicitudes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipo: "Solicitud de Jurisprudencia",
                    emailLegal: datos?.emailLegal || "",
                    detalles: {
                        nombre: datos?.nombre,
                        apellido: datos?.apellido,
                        expediente: datos?.expediente,
                        telefono: telefono,
                        pedido: pedido
                    }
                })
            });

            if (res.ok) {
                setSubmitted(true);
                window.scrollTo({ top: 0, behavior: "smooth" });

                // Si el teléfono cambió, lo actualizamos también en sus datos personales de forma silenciosa
                if (telefono !== datos?.telefono) {
                    fetch("/api/user/datos", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ telefono })
                    });
                }
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
        <div className="bg-white dark:bg-[#02182b] pb-20 transition-colors duration-300">
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
                        <FileText size={18} className="text-blue-600" />
                        <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Solicitud de Jurisprudencia</h2>
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
                            <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-400">¡Pedido Enviado!</h3>
                            <p className="text-emerald-700/70 dark:text-emerald-400/60 font-medium">
                                Tu solicitud de jurisprudencia ha sido recibida. Nos comunicaremos a la brevedad.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push("/dashboard/solicitudes/enviadas")}
                            className="px-8 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all"
                        >
                            Ver mis solicitudes
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Alerta Informativa */}
                        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex gap-4 items-start">
                            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-blue-500 shrink-0">
                                <Info size={16} />
                            </div>
                            <p className="text-[11px] text-blue-700 dark:text-blue-400/80 leading-relaxed font-medium">
                                Puede solicitar búsquedas de jurisprudencia específica indicando los detalles necesarios. Los datos de contacto se utilizarán para enviarle los resultados.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nombre */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <User size={10} /> Nombre
                                    </label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={datos?.nombre || ""}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Apellido */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <User size={10} /> Apellido
                                    </label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={datos?.apellido || ""}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Matrícula/Expediente */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <IdCard size={10} /> Matrícula
                                    </label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={datos?.expediente || ""}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Mail size={10} /> Email de contacto
                                    </label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={datos?.emailLegal || ""}
                                        className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Telefono (Editable) */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Phone size={10} /> Teléfono (Opcional)
                                    </label>
                                    <input
                                        type="tel"
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        placeholder="Ej: 342 1234567"
                                        className="w-full h-14 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:ring-2 focus:ring-[#063f68] dark:focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                                    />
                                </div>

                                {/* Pedido / Mensaje */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Su pedido</label>
                                    <textarea
                                        required
                                        value={pedido}
                                        onChange={(e) => setPedido(e.target.value)}
                                        placeholder="Describa el tema, fallos o palabras clave de la jurisprudencia que necesita..."
                                        className="w-full min-h-[160px] p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:ring-2 focus:ring-[#063f68] dark:focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300 resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !pedido}
                                className="w-full md:w-auto h-14 px-12 bg-[#063f68] dark:bg-blue-600 hover:bg-[#0a4d7a] dark:hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Enviando solicitud...
                                    </>
                                ) : (
                                    <>
                                        Enviar Pedido
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
