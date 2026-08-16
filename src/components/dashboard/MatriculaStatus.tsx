"use client";

import React, { useState, useEffect } from "react";
import {
    AlertTriangle,
    Calendar,
    CreditCard,
    CheckCircle2,
    Info,
    Wallet,
    History,
    Loader2,
    Landmark,
    Clock,
    Download,
    GraduationCap,
    Briefcase,
    Award,
    Star,
} from "lucide-react";
import MpPayButton from "@/components/MpPayButton";
import TransferenciaPayButton from "@/components/TransferenciaPayButton";
import PaywayCardForm, { PaywayTokenResult } from "@/components/pagos/PaywayCardForm";

interface Concepto {
    id: number;
    expediente: string;
    monto: number;
}

interface CuotaMensualData {
    id: number;
    expediente: string;
    periodo: string;
    monto: number;
    estado: string;
    metodo?: "mercadopago" | "payway" | "transferencia" | "home_banking" | "transferencia_pendiente" | "matriculacion" | null;
    metodoPago?: string | null;
}

interface Boleta {
    tipo: string;
    periodo: string;
    archivo: string;
    factura: string | null;
}

interface PagosData {
    deudas: Concepto[];
    cuotaActual: CuotaMensualData | null;
    historialCuotas: CuotaMensualData[];
    montoAnual: number;
    showPagoAnual: boolean;
    mpDisponible: boolean;
    paywayDisponible: { matricula_mensual: boolean; matricula_anual: boolean; deuda: boolean };
    transferenciaHabilitada: { matricula_mensual: boolean; matricula_anual: boolean; deuda: boolean };
    hasDebitoAutomatico: boolean;
    hasDebitoEnTramite: boolean;
    hasPagoAnualActivo: boolean;
    hasCancelacionPendiente: boolean;
    totalDeuda: number;
    userStatus: string;
    esJoven: boolean;
    esVeterano: boolean;
    esExento: boolean;
    esConsultor: boolean;
    deudasPagadas: { id: number; monto: number; metodoPago: string; fechaPago: string }[];
    boletas: { mensual: Boleta | null; anual: Boleta | null; deuda: Boleta | null };
    boletaDescarga?: { mensual: boolean; anual: boolean; deuda: boolean };
}

function labelMetodoPago(metodo?: string | null): string {
    if (metodo === "mercadopago") return "Mercado Pago";
    if (metodo === "payway") return "PayWay";
    if (metodo === "banelco" || metodo === "home_banking") return "Banelco / Home Banking";
    if (metodo === "transferencia") return "Transferencia bancaria";
    if (metodo === "matriculacion") return "Incluido en matrícula";
    return "";
}

function formatPeriodo(periodo: string): string {
    const [year, month] = periodo.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
        .replace(/^\w/, (c) => c.toUpperCase());
}

export default function MatriculaStatus() {
    const [data, setData] = useState<PagosData | null>(null);
    const [loading, setLoading] = useState(true);
    const [paywayModo, setPaywayModo] = useState<null | "deuda" | "anual" | "mensual">(null);
    const [paywayProcesando, setPaywayProcesando] = useState(false);
    const [paywayError, setPaywayError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const res = await fetch("/api/user/pagos");
            const result = await res.json();
            if (res.ok) {
                setData(result);
            }
        } catch (error) {
            console.error("Error loading payments data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    async function pagarConPayway(tipo: "matricula_mensual" | "matricula_anual" | "deuda", ref: string, resultado: PaywayTokenResult) {
        setPaywayError(null);
        setPaywayProcesando(true);
        try {
            const res = await fetch("/api/payments/payway", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tipo, ref, ...resultado }),
            });
            const respData = await res.json();
            if (!res.ok) { setPaywayError(respData.error || "No se pudo procesar el pago."); return; }
            if (!respData.aprobado) { setPaywayError(respData.mensaje || "El pago fue rechazado."); return; }
            setPaywayModo(null);
            await fetchData();
        } catch {
            setPaywayError("Error de conexión. Intentá de nuevo.");
        } finally {
            setPaywayProcesando(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 size={32} className="text-[#063f68] dark:text-blue-500 animate-spin" />
                <p className="text-slate-700 dark:text-slate-400 font-medium tracking-tight">Consultando estado de cuenta...</p>
            </div>
        );
    }

    const isSuspended = data?.userStatus === "suspended" || data?.userStatus === "cancelled";
    const hasDeuda = data?.deudas && data.deudas.length > 0;
    const noPagaMensual = data?.esConsultor || data?.esExento || data?.hasDebitoAutomatico || data?.hasPagoAnualActivo;
    const cuotasVisibles = noPagaMensual
        ? (data?.historialCuotas ?? []).filter(c => c.estado === "pagado")
        : (data?.historialCuotas ?? []);
    const cuotaPendiente = data?.cuotaActual?.estado === "pendiente"
        && !data?.hasDebitoAutomatico
        && !data?.hasPagoAnualActivo
        && !data?.esConsultor
        && !data?.esExento;
    const totalDeuda = data?.totalDeuda || 0;
    const montoAnual = data?.montoAnual ?? 48000;
    const showAnualCard = data?.showPagoAnual ?? false;

    // Período label for monthly card
    const periodoLabel = data?.cuotaActual?.periodo
        ? formatPeriodo(data.cuotaActual.periodo)
        : formatPeriodo(new Date().toISOString().slice(0, 7));

    return (
        <div className="space-y-10 animate-fade-in pb-20">

            {/* BANNER CONSULTOR */}
            {data?.esConsultor && (
                <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/15 border border-indigo-100 dark:border-indigo-800/40">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                        <Briefcase size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[14px] font-bold text-indigo-800 dark:text-indigo-300">Matrícula Consultor</p>
                        <p className="text-[13px] text-indigo-700/70 dark:text-indigo-400/60">Tu matrícula es de tipo consultor — no estás sujeto al pago de cuota mensual ni anual.</p>
                    </div>
                </div>
            )}

            {/* BANNER JOVEN MATRICULADO */}
            {data?.esJoven && (
                <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-teal-50 dark:bg-teal-900/15 border border-teal-100 dark:border-teal-800/40">
                    <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shrink-0 shadow-md shadow-teal-500/20">
                        <GraduationCap size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[14px] font-bold text-teal-800 dark:text-teal-300">Beneficio Joven Matriculado activo</p>
                        <p className="text-[13px] text-teal-700/70 dark:text-teal-400/60">Tu matrícula tiene menos de 60 meses — aplicás el 50% de descuento en cuotas mensuales y anuales.</p>
                    </div>
                </div>
            )}

            {/* BANNER VETERANO (40-49 años) */}
            {data?.esVeterano && (
                <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/40">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                        <Award size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[14px] font-bold text-amber-800 dark:text-amber-300">Beneficio Trayectoria activo</p>
                        <p className="text-[13px] text-amber-700/70 dark:text-amber-400/60">Tu matrícula tiene entre 40 y 49 años — aplicás el 50% de descuento en cuotas mensuales y anuales.</p>
                    </div>
                </div>
            )}

            {/* BANNER EXENTO (50+ años) */}
            {data?.esExento && (
                <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-violet-50 dark:bg-violet-900/15 border border-violet-100 dark:border-violet-800/40">
                    <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20">
                        <Star size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[14px] font-bold text-violet-800 dark:text-violet-300">Exento de pago — 50 años de matrícula</p>
                        <p className="text-[13px] text-violet-700/70 dark:text-violet-400/60">Con más de 50 años de matrícula, estás exento del pago de cuota mensual y anual.</p>
                    </div>
                </div>
            )}

            {/* 1. ESTADO DE DEUDA / CUOTA PENDIENTE */}
            {hasDeuda ? (
                <div className="relative group overflow-hidden rounded-[32px] bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-8 transition-all hover:shadow-xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20">
                                <AlertTriangle size={28} />
                            </div>
                            <div>
                                <h3 className="text-red-900 dark:text-red-400 font-bold text-xl tracking-tight">Deuda Vencida Detectada</h3>
                                <p className="text-red-700/70 dark:text-red-400/60 text-sm font-medium">Regularizá tu situación para mantener todos los beneficios activos.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-8 w-full md:w-auto">
                            <div className="text-left md:text-right">
                                <p className="text-[11px] font-bold text-red-800/40 dark:text-red-400/40 uppercase tracking-widest mb-1">Total a Pagar</p>
                                <p className="text-3xl font-black text-red-600 dark:text-red-400">${totalDeuda.toLocaleString()}</p>
                            </div>
                            {paywayModo !== "deuda" && (
                                <div className="flex flex-col gap-2">
                                    {data?.mpDisponible && (
                                        <MpPayButton tipo="deuda" ref={data!.deudas.map((d) => d.id).join(",")} label="Pagar con Mercado Pago"
                                            className="w-full h-12 px-6 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2" />
                                    )}
                                    {data?.paywayDisponible?.deuda && (
                                        <button type="button" onClick={() => { setPaywayModo("deuda"); setPaywayError(null); }}
                                            className="w-full h-12 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                                            Pagar con tarjeta
                                        </button>
                                    )}
                                    {data?.transferenciaHabilitada?.deuda && (
                                        <TransferenciaPayButton tipo="deuda" ref={data!.deudas.map((d) => d.id).join(",")} monto={totalDeuda} label="Pagar con transferencia"
                                            className="w-full h-12 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2" />
                                    )}
                                    {data?.boletas?.deuda && data?.boletaDescarga?.deuda !== false && (
                                        <a href={data.boletas.deuda.archivo} target="_blank" rel="noopener noreferrer"
                                            className="w-full h-10 px-4 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl font-bold text-[12px] transition-all flex items-center justify-center gap-2">
                                            <Download size={13} /> Descargar boleta
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                        {paywayModo === "deuda" && (
                            <div className="w-full space-y-2">
                                <button type="button" onClick={() => { setPaywayModo(null); setPaywayError(null); }}
                                    className="text-[12px] font-semibold text-red-400 hover:text-red-600">
                                    ← Elegir otro medio de pago
                                </button>
                                <PaywayCardForm
                                    seccion="deuda"
                                    onToken={(r) => pagarConPayway("deuda", data!.deudas.map((d) => d.id).join(","), r)}
                                    procesando={paywayProcesando}
                                    error={paywayError}
                                    montoLabel={`$${totalDeuda.toLocaleString()}`}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ) : cuotaPendiente ? (
                <div className="p-8 rounded-[32px] bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-amber-900 dark:text-amber-400 font-bold text-lg tracking-tight">Cuota mensual pendiente</h3>
                        <p className="text-amber-700/70 dark:text-amber-400/60 text-sm font-medium">Tenés la cuota del período actual sin abonar. Podés pagarla desde la sección de abajo.</p>
                    </div>
                </div>
            ) : (
                <div className="p-8 rounded-[32px] bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-emerald-900 dark:text-emerald-400 font-bold text-lg tracking-tight">Al día con las obligaciones</h3>
                            <p className="text-emerald-700/70 dark:text-emerald-400/60 text-sm font-medium">No se registran deudas vencidas a la fecha.</p>
                        </div>
                    </div>
                    {data?.hasDebitoAutomatico && (
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Débito Activo</span>
                        </div>
                    )}
                    {data?.hasDebitoEnTramite && (
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-amber-100 dark:border-amber-900/50 shadow-sm">
                            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-widest">Débito en Trámite</span>
                        </div>
                    )}
                </div>
            )}

            {/* 2. OPCIONES DE MATRÍCULA */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* MATRÍCULA ANUAL — solo Jan/Feb/Mar */}
                {showAnualCard && (
                    <div className="group relative overflow-hidden rounded-[32px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 transition-all hover:shadow-2xl hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>

                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Calendar size={24} />
                                </div>
                                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 rounded-lg text-[11px] font-bold uppercase tracking-widest border border-blue-100 dark:border-blue-900/50">
                                    Ciclo 2026
                                </span>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-black dark:text-white tracking-tight">Matrícula Anual</h4>
                                <p className="text-slate-700 dark:text-slate-400 text-sm mt-1">Aboná el año completo con bonificación exclusiva.</p>
                            </div>

                            <div className="flex items-end justify-between pt-4">
                                {data?.esConsultor ? (
                                    <div className="w-full flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">Estado</p>
                                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Matrícula Consultor — no aplica</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center">
                                            <Briefcase size={18} />
                                        </div>
                                    </div>
                                ) : data?.esExento ? (
                                    <div className="w-full flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">Estado</p>
                                            <p className="text-sm font-bold text-violet-600 dark:text-violet-400">Exento — 50 años de matrícula</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center">
                                            <Star size={18} />
                                        </div>
                                    </div>
                                ) : data?.hasPagoAnualActivo || data?.hasDebitoAutomatico ? (
                                    <div className="w-full flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">Estado</p>
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                                {data?.hasPagoAnualActivo ? "Pago Anual Realizado" : "Adherido a Débito Automático"}
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center">
                                            <CheckCircle2 size={20} />
                                        </div>
                                    </div>
                                ) : isSuspended ? (
                                    <div className="w-full flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">Monto Final</p>
                                            <p className="text-3xl font-black text-black dark:text-white">${montoAnual.toLocaleString()}</p>
                                        </div>
                                        <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">No disponible</p>
                                            <p className="text-[12px] text-slate-700 dark:text-slate-400">Matrícula suspendida</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full space-y-3">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">Monto Final</p>
                                            <p className="text-3xl font-black text-black dark:text-white">${montoAnual.toLocaleString()}</p>
                                        </div>
                                        {paywayModo === "anual" ? (
                                            <div className="space-y-2">
                                                <button type="button" onClick={() => { setPaywayModo(null); setPaywayError(null); }}
                                                    className="text-[12px] font-semibold text-slate-400 hover:text-slate-600">
                                                    ← Elegir otro medio de pago
                                                </button>
                                                <PaywayCardForm
                                                    seccion="matricula_anual"
                                                    onToken={(r) => pagarConPayway("matricula_anual", "anual", r)}
                                                    procesando={paywayProcesando}
                                                    error={paywayError}
                                                    montoLabel={`$${montoAnual.toLocaleString()}`}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                {data?.mpDisponible && (
                                                    <MpPayButton
                                                        tipo="matricula_anual"
                                                        ref="anual"
                                                        label="Pagar con Mercado Pago"
                                                        className="w-full h-12 px-6 bg-[#063f68] dark:bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-[#0a4d7a] dark:hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                    />
                                                )}
                                                {data?.paywayDisponible?.matricula_anual && (
                                                    <button type="button" onClick={() => { setPaywayModo("anual"); setPaywayError(null); }}
                                                        className="w-full h-12 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2">
                                                        Pagar con tarjeta
                                                    </button>
                                                )}
                                                {data?.transferenciaHabilitada?.matricula_anual && (
                                                    <TransferenciaPayButton
                                                        tipo="matricula_anual"
                                                        ref="anual"
                                                        monto={montoAnual}
                                                        label="Pagar con transferencia"
                                                        className="w-full h-12 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                                                    />
                                                )}
                                                {data?.boletas?.anual && data?.boletaDescarga?.anual !== false && (
                                                    <a href={data.boletas.anual.archivo} target="_blank" rel="noopener noreferrer"
                                                        className="w-full h-10 px-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/40 rounded-xl font-bold text-[12px] transition-all flex items-center justify-center gap-2">
                                                        <Download size={13} /> Descargar boleta
                                                    </a>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* CUOTA MENSUAL */}
                <div className="group relative overflow-hidden rounded-[32px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <Wallet size={24} />
                            </div>
                            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[11px] font-bold uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/50">
                                Período Actual
                            </span>
                        </div>

                        <div>
                            <h4 className="text-xl font-bold text-black dark:text-white tracking-tight">Cuota Mensual</h4>
                            <p className="text-slate-700 dark:text-slate-400 text-sm mt-1">Cuota correspondiente al período {periodoLabel}.</p>
                        </div>

                        <div className="flex items-end justify-between pt-4">
                            {data?.esConsultor ? (
                                <div className="w-full flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">Estado de Pago</p>
                                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Matrícula Consultor — no aplica</p>
                                        <p className="text-[12px] text-slate-700 mt-0.5">Los consultores no abonan cuota mensual ni anual.</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center">
                                        <Briefcase size={18} />
                                    </div>
                                </div>
                            ) : data?.esExento ? (
                                <div className="w-full flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">Estado de Pago</p>
                                        <p className="text-sm font-bold text-violet-600 dark:text-violet-400">Exento — 50 años de matrícula</p>
                                        <p className="text-[12px] text-slate-700 mt-0.5">No abonás cuota mensual ni anual.</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center">
                                        <Star size={18} />
                                    </div>
                                </div>
                            ) : data?.hasDebitoAutomatico ? (
                                <div className="w-full flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">Estado de Pago</p>
                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Adherido a Débito Automático</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 size={20} />
                                    </div>
                                </div>
                            ) : data?.hasPagoAnualActivo ? (
                                <div className="w-full flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">Estado de Pago</p>
                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Pago Anual Realizado</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 size={20} />
                                    </div>
                                </div>
                            ) : data?.cuotaActual?.estado === "pagado" ? (
                                <div className="w-full space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">Estado de Pago</p>
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                Abonado — {formatPeriodo(data.cuotaActual.periodo)}
                                            </p>
                                            {labelMetodoPago(data.cuotaActual.metodoPago) && (
                                                <p className="text-[12px] text-slate-700 mt-0.5">
                                                    vía {labelMetodoPago(data.cuotaActual.metodoPago)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center">
                                            <CheckCircle2 size={20} />
                                        </div>
                                    </div>
                                </div>
                            ) : data?.cuotaActual?.estado === "pendiente" && isSuspended ? (
                                <div className="w-full flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">Monto a Pagar</p>
                                        <p className="text-3xl font-black text-black dark:text-white">${data.cuotaActual.monto.toLocaleString()}</p>
                                    </div>
                                    <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">No disponible</p>
                                        <p className="text-[12px] text-slate-700 dark:text-slate-400">Matrícula suspendida</p>
                                    </div>
                                </div>
                            ) : data?.cuotaActual?.estado === "pendiente" ? (
                                <div className="w-full space-y-3">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">Monto a Pagar</p>
                                        <p className="text-3xl font-black text-black dark:text-white">${data.cuotaActual.monto.toLocaleString()}</p>
                                    </div>
                                    {paywayModo === "mensual" ? (
                                        <div className="space-y-2">
                                            <button type="button" onClick={() => { setPaywayModo(null); setPaywayError(null); }}
                                                className="text-[12px] font-semibold text-slate-400 hover:text-slate-600">
                                                ← Elegir otro medio de pago
                                            </button>
                                            <PaywayCardForm
                                                seccion="matricula_mensual"
                                                onToken={(r) => pagarConPayway("matricula_mensual", String(data.cuotaActual!.id), r)}
                                                procesando={paywayProcesando}
                                                error={paywayError}
                                                montoLabel={`$${data.cuotaActual.monto.toLocaleString()}`}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            {data?.mpDisponible && (
                                                <MpPayButton
                                                    tipo="matricula_mensual"
                                                    ref={String(data.cuotaActual.id)}
                                                    label="Pagar con Mercado Pago"
                                                    className="w-full h-12 px-6 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                />
                                            )}
                                            {data?.paywayDisponible?.matricula_mensual && (
                                                <button type="button" onClick={() => { setPaywayModo("mensual"); setPaywayError(null); }}
                                                    className="w-full h-12 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2">
                                                    Pagar con tarjeta
                                                </button>
                                            )}
                                            {data?.transferenciaHabilitada?.matricula_mensual && (
                                                <TransferenciaPayButton
                                                    tipo="matricula_mensual"
                                                    ref={String(data.cuotaActual.id)}
                                                    monto={data.cuotaActual.monto}
                                                    label="Pagar con transferencia"
                                                    className="w-full h-12 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                                                />
                                            )}
                                            {data?.boletas?.mensual && data?.boletaDescarga?.mensual !== false && (
                                                <a href={data.boletas.mensual.archivo} target="_blank" rel="noopener noreferrer"
                                                    className="w-full h-10 px-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 rounded-xl font-bold text-[12px] transition-all flex items-center justify-center gap-2">
                                                    <Download size={13} /> Descargar boleta
                                                </a>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full">
                                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">Estado</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-400">Sin cuota generada para este período</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* 3. HISTORIAL Y CONCEPTOS (Flat Design) */}
            <div className="space-y-6 pt-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <History size={20} className="text-[#063f68] dark:text-blue-500" />
                        <h3 className="text-lg font-bold text-black dark:text-white tracking-tight">Conceptos Recientes</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden">
                    {cuotasVisibles.length > 0 ? (
                        cuotasVisibles.map((c, i) => (
                            <ConceptItem
                                key={c.id}
                                label={`Cuota ${formatPeriodo(c.periodo)}`}
                                amount={c.monto.toLocaleString("es-AR")}
                                status={c.estado === "pagado" ? "paid" : "pending"}
                                metodo={c.metodo}
                                isLast={i === cuotasVisibles.length - 1 && (!data?.deudasPagadas || data.deudasPagadas.length === 0)}
                            />
                        ))
                    ) : (!data?.deudasPagadas || data.deudasPagadas.length === 0) ? (
                        <div className="p-6 text-[14px] text-slate-700 text-center">Sin historial de cuotas</div>
                    ) : null}
                    {data?.deudasPagadas && data.deudasPagadas.map((d, i) => (
                        <ConceptItem
                            key={`deuda-${d.id}`}
                            label={`Deuda vencida saldada — ${new Date(d.fechaPago).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}`}
                            amount={d.monto.toLocaleString("es-AR")}
                            status="paid"
                            metodo={d.metodoPago === "banelco" ? "home_banking" : d.metodoPago === "transferencia" ? "transferencia" : d.metodoPago === "payway" ? "payway" : "mercadopago"}
                            isLast={i === data.deudasPagadas.length - 1}
                        />
                    ))}
                </div>
            </div>

            {/* INFO ADICIONAL */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex gap-4 items-start">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-blue-500 shadow-sm shrink-0">
                    <Info size={16} />
                </div>
                <p className="text-[12px] text-slate-700 dark:text-slate-400 leading-relaxed font-medium">
                    Los pagos realizados pueden demorar hasta 48 horas hábiles en verse reflejados en tu estado de cuenta institucional. Guardá siempre el comprobante emitido por el sistema.
                </p>
            </div>

        </div>
    );
}

function ConceptItem({ label, amount, status, metodo, isLast }: {
    label: string;
    amount: string;
    status: "paid" | "pending";
    metodo?: "mercadopago" | "payway" | "transferencia" | "home_banking" | "transferencia_pendiente" | "matriculacion" | null;
    isLast?: boolean;
}) {
    const paid = status === "paid";

    function MetodoTag() {
        if (metodo === "transferencia") return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-400">
                <Landmark size={10} /> Transferencia
            </span>
        );
        if (metodo === "home_banking") return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-400">
                <Landmark size={10} /> Home Banking
            </span>
        );
        if (metodo === "mercadopago") return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-400">
                <CreditCard size={10} /> Mercado Pago
            </span>
        );
        if (metodo === "payway") return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-400">
                <CreditCard size={10} /> PayWay
            </span>
        );
        if (metodo === "transferencia_pendiente") return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500">
                <Clock size={10} /> Transferencia pendiente
            </span>
        );
        if (metodo === "matriculacion") return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-500">
                <GraduationCap size={10} /> Incluido en matrícula
            </span>
        );
        return null;
    }

    return (
        <div className={`p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!isLast ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paid ? "bg-slate-50 dark:bg-slate-800 text-emerald-500" : "bg-amber-50 dark:bg-amber-900/20 text-amber-500"}`}>
                    <CheckCircle2 size={18} />
                </div>
                <div>
                    <h5 className="text-[14px] font-bold text-black dark:text-white">{label}</h5>
                    <MetodoTag />
                </div>
            </div>
            <div className="text-right">
                <p className="text-[15px] font-black text-black dark:text-white">${amount}</p>
                <p className={`text-[11px] font-bold uppercase tracking-widest ${paid ? "text-emerald-500" : "text-amber-500"}`}>
                    {paid ? "Pagado" : "Pendiente"}
                </p>
            </div>
        </div>
    );
}
