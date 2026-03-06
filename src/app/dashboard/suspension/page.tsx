"use client";

import React, { useState, useEffect } from "react";
import {
    ChevronLeft,
    Send,
    Info,
    Loader2,
    CheckCircle2,
    XOctagon,
    Calendar as CalendarIcon,
    User,
    IdCard
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserDatos {
    apellido: string;
    nombre: string;
    expediente: string | null;
}

export default function SolicitudSuspensionPage() {
    const router = useRouter();
    const [datos, setDatos] = useState<UserDatos | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [hasDebt, setHasDebt] = useState(false);
    const [totalDeuda, setTotalDeuda] = useState(0);

    // Campos del formulario
    const [tipoTramite, setTipoTramite] = useState("Suspensión");
    const [fechaInicio, setFechaInicio] = useState("");
    const [motivo, setMotivo] = useState("Motivos personales");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resDatos, resPagos] = await Promise.all([
                    fetch("/api/user/datos"),
                    fetch("/api/user/pagos")
                ]);

                if (resDatos.ok) {
                    const data = await resDatos.json();
                    setDatos(data);
                }

                if (resPagos.ok) {
                    const dataPagos = await resPagos.json();
                    const deudaTotal = dataPagos.totalDeuda || 0;
                    setTotalDeuda(deudaTotal);
                    setHasDebt(deudaTotal > 0);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (hasDebt) {
            alert("No se puede iniciar el trámite con deuda pendiente.");
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch("/api/user/solicitudes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipo: `Solicitud de ${tipoTramite}`,
                    detalles: {
                        nombre: datos?.nombre,
                        apellido: datos?.apellido,
                        expediente: datos?.expediente,
                        tipo: tipoTramite,
                        fechaInicio: fechaInicio,
                        motivo: motivo
                    }
                })
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
                        <XOctagon size={18} className="text-slate-400" />
                        <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Solicitud de Suspensión / Cancelación</h2>
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
                                Tu solicitud de {tipoTramite.toLowerCase()} ha sido recibida correctamente.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push("/dashboard/solicitudes/enviadas")}
                            className="px-8 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all"
                        >
                            Ver mis solicitudes
                        </button>
                    </div>
                ) : hasDebt ? (
                    <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-[32px] p-12 text-center space-y-6">
                        <div className="w-20 h-20 bg-rose-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-rose-500/10">
                            <XOctagon size={40} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-rose-900 dark:text-rose-400">Trámite Bloqueado</h3>
                            <p className="text-rose-700/70 dark:text-rose-400/60 font-medium max-w-md mx-auto">
                                No es posible solicitar la suspensión o cancelación de la matrícula contando con deuda pendiente. El saldo actual es de <span className="font-bold text-rose-600 dark:text-rose-300">${totalDeuda.toLocaleString()}</span>.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push("/dashboard/pagos")}
                            className="px-8 h-12 bg-[#063f68] hover:bg-[#0a4d7a] text-white rounded-xl font-bold text-sm transition-all shadow-blue-500/10"
                        >
                            Ir a mis Pagos
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex gap-4 items-start">
                            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-[#063f68] dark:text-blue-400 shrink-0">
                                <Info size={16} />
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Estando al día con las cuotas sociales de esta Institución, solicito tenga a bien proceder a realizar el trámite correspondiente.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <User size={10} /> Nombre Completo
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={`${datos?.apellido || ""} ${datos?.nombre || ""}`.toLowerCase()}
                                            className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:outline-none cursor-not-allowed opacity-70"
                                        />
                                    </div>
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
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Solicito tenga a bien proceder a la</label>
                                    <select
                                        value={tipoTramite}
                                        onChange={(e) => setTipoTramite(e.target.value)}
                                        className="w-full h-14 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:ring-2 focus:ring-[#063f68] dark:focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="Suspensión">Suspensión</option>
                                        <option value="Cancelación">Cancelación</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <CalendarIcon size={12} /> de mi matrícula profesional a partir de
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={fechaInicio}
                                        onChange={(e) => setFechaInicio(e.target.value)}
                                        className="w-full h-14 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:ring-2 focus:ring-[#063f68] dark:focus:ring-blue-500 outline-none transition-all cursor-pointer"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">en razón de</label>
                                    <select
                                        value={motivo}
                                        onChange={(e) => setMotivo(e.target.value)}
                                        className="w-full h-14 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-black dark:text-white font-medium focus:ring-2 focus:ring-[#063f68] dark:focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="Motivos personales">Motivos personales</option>
                                        <option value="Incompatibilidad">Incompatibilidad</option>
                                        <option value="Acogerme a los beneficios jubilatorios">Acogerme a los beneficios jubilatorios</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !fechaInicio}
                                className="w-full md:w-auto h-14 px-12 bg-[#063f68] dark:bg-blue-600 hover:bg-[#0a4d7a] dark:hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Enviando solicitud...
                                    </>
                                ) : (
                                    <>
                                        Enviar Trámite
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
