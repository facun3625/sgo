"use client";

import React, { useState, useEffect } from "react";
import {
    AlertTriangle,
    Calendar,
    CreditCard,
    CheckCircle2,
    ArrowRight,
    Info,
    Wallet,
    History,
    Loader2
} from "lucide-react";

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
}

interface PagosData {
    deudas: Concepto[];
    cuotaActual: CuotaMensualData | null;
    historialCuotas: CuotaMensualData[];
    montoAnual: number;
    hasDebitoAutomatico: boolean;
    hasDebitoEnTramite: boolean;
    hasPagoAnualActivo: boolean;
    hasCancelacionPendiente: boolean;
    totalDeuda: number;
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

    useEffect(() => {
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
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 size={32} className="text-[#063f68] dark:text-blue-500 animate-spin" />
                <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Consultando estado de cuenta...</p>
            </div>
        );
    }

    const hasDeuda = data?.deudas && data.deudas.length > 0;
    const totalDeuda = data?.totalDeuda || 0;
    const montoAnual = data?.montoAnual ?? 48000;

    // Annual payment card only shows in Jan (0), Feb (1), Mar (2)
    const currentMonth = new Date().getMonth();
    const showAnualCard = currentMonth <= 2;

    // Período label for monthly card
    const periodoLabel = data?.cuotaActual?.periodo
        ? formatPeriodo(data.cuotaActual.periodo)
        : formatPeriodo(new Date().toISOString().slice(0, 7));

    return (
        <div className="space-y-10 animate-fade-in pb-20">

            {/* 1. ESTADO DE DEUDA (Solo si existe) */}
            {hasDeuda ? (
                <div className="relative group overflow-hidden rounded-[32px] bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-8 transition-all hover:shadow-xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20">
                                <AlertTriangle size={28} />
                            </div>
                            <div>
                                <h3 className="text-red-900 dark:text-red-400 font-bold text-xl tracking-tight">Deuda Pendiente Detectada</h3>
                                <p className="text-red-700/70 dark:text-red-400/60 text-sm font-medium">Regularizá tu situación para mantener todos los beneficios activos.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 w-full md:w-auto">
                            <div className="text-left md:text-right">
                                <p className="text-[10px] font-bold text-red-800/40 dark:text-red-400/40 uppercase tracking-widest mb-1">Total a Pagar</p>
                                <p className="text-3xl font-black text-red-600 dark:text-red-400">${totalDeuda.toLocaleString()}</p>
                            </div>
                            <button className="flex-1 md:flex-none h-14 px-8 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2">
                                Pagar Ahora
                                <ArrowRight size={18} />
                            </button>
                        </div>
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
                            <p className="text-emerald-700/70 dark:text-emerald-400/60 text-sm font-medium">No se registran deudas pendientes a la fecha.</p>
                        </div>
                    </div>
                    {data?.hasDebitoAutomatico && (
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Débito Activo</span>
                        </div>
                    )}
                    {data?.hasDebitoEnTramite && (
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-amber-100 dark:border-amber-900/50 shadow-sm">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Débito en Trámite</span>
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
                                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-blue-100 dark:border-blue-900/50">
                                    Ciclo 2026
                                </span>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-black dark:text-white tracking-tight">Matrícula Anual</h4>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Aboná el año completo con bonificación exclusiva.</p>
                            </div>

                            <div className="flex items-end justify-between pt-4">
                                {data?.hasPagoAnualActivo || data?.hasDebitoAutomatico ? (
                                    <div className="w-full flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado</p>
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                                {data?.hasPagoAnualActivo ? "Cubierto — Pago Anual" : "Cubierto — Débito Automático"}
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center">
                                            <CheckCircle2 size={20} />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monto Final</p>
                                            <p className="text-3xl font-black text-black dark:text-white">${montoAnual.toLocaleString()}</p>
                                        </div>
                                        <button className="h-12 px-6 bg-[#063f68] dark:bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-[#0a4d7a] dark:hover:bg-blue-500 transition-all flex items-center gap-2">
                                            Pagar Anual
                                            <CreditCard size={16} />
                                        </button>
                                    </>
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
                            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/50">
                                Período Actual
                            </span>
                        </div>

                        <div>
                            <h4 className="text-xl font-bold text-black dark:text-white tracking-tight">Cuota Mensual</h4>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Cuota correspondiente al período {periodoLabel}.</p>
                        </div>

                        <div className="flex items-end justify-between pt-4">
                            {data?.hasDebitoAutomatico ? (
                                <div className="w-full flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado de Pago</p>
                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Cubierto — Débito Automático</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 size={20} />
                                    </div>
                                </div>
                            ) : data?.hasPagoAnualActivo ? (
                                <div className="w-full flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado de Pago</p>
                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Cubierto — Pago Anual</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 size={20} />
                                    </div>
                                </div>
                            ) : data?.cuotaActual?.estado === "pagado" ? (
                                <div className="w-full flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado de Pago</p>
                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                            Abonado — {formatPeriodo(data.cuotaActual.periodo)}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 size={20} />
                                    </div>
                                </div>
                            ) : data?.cuotaActual?.estado === "pendiente" ? (
                                <>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monto a Pagar</p>
                                        <p className="text-3xl font-black text-black dark:text-white">${data.cuotaActual.monto.toLocaleString()}</p>
                                    </div>
                                    <button className="h-12 px-6 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all flex items-center gap-2">
                                        Pagar Cuota
                                        <CreditCard size={16} />
                                    </button>
                                </>
                            ) : (
                                <div className="w-full">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado</p>
                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Sin cuota generada para este período</p>
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
                    {data?.historialCuotas && data.historialCuotas.length > 0 ? (
                        data.historialCuotas.map((c, i) => (
                            <ConceptItem
                                key={c.id}
                                label={`Cuota ${formatPeriodo(c.periodo)}`}
                                amount={c.monto.toLocaleString("es-AR")}
                                status={c.estado === "pagado" ? "paid" : "pending"}
                                isLast={i === data.historialCuotas.length - 1}
                            />
                        ))
                    ) : (
                        <div className="p-6 text-[13px] text-slate-400 text-center">Sin historial de cuotas</div>
                    )}
                </div>
            </div>

            {/* INFO ADICIONAL */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex gap-4 items-start">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-blue-500 shadow-sm shrink-0">
                    <Info size={16} />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Los pagos realizados pueden demorar hasta 48 horas hábiles en verse reflejados en tu estado de cuenta institucional. Guardá siempre el comprobante emitido por el sistema.
                </p>
            </div>

        </div>
    );
}

function ConceptItem({ label, amount, status, isLast }: { label: string; amount: string; status: "paid" | "pending"; isLast?: boolean }) {
    const paid = status === "paid";
    return (
        <div className={`p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!isLast ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paid ? "bg-slate-50 dark:bg-slate-800 text-emerald-500" : "bg-amber-50 dark:bg-amber-900/20 text-amber-500"}`}>
                    <CheckCircle2 size={18} />
                </div>
                <h5 className="text-[13px] font-bold text-black dark:text-white">{label}</h5>
            </div>
            <div className="text-right">
                <p className="text-[14px] font-black text-black dark:text-white">${amount}</p>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${paid ? "text-emerald-500" : "text-amber-500"}`}>
                    {paid ? "Pagado" : "Pendiente"}
                </p>
            </div>
        </div>
    );
}
