"use client";

import { useState, useEffect } from "react";
import { Calculator, TrendingUp, Info, Loader2, AlertCircle, ExternalLink } from "lucide-react";

interface Resultado {
    capital: number;
    desde: string;
    hasta: string;
    dias: number;
    tasaPasiva: { label: string; intereses: number; total: number; ratio: number; fechaInicio: string; fechaFin: string };
    cer3: { label: string; intereses: number; total: number; ratio: number; fechaInicio: string; fechaFin: string };
    cer3_67: { label: string; intereses: number; total: number };
}

function fmt(n: number) {
    return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(ratio: number) {
    return ((ratio - 1) * 100).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

function fmtFecha(iso: string) {
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
}

export default function CalculadoraPage() {
    const [capital, setCapital] = useState("");
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [cargando, setCargando] = useState(false);
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [habilitada, setHabilitada] = useState<boolean | null>(null);

    useEffect(() => {
        fetch("/api/admin/config")
            .then(r => r.ok ? r.json() : null)
            .then(data => setHabilitada(data?.calculadoraActiva !== false))
            .catch(() => setHabilitada(true));
    }, []);

    async function calcular() {
        setError(null);
        setResultado(null);

        const cap = parseFloat(capital.replace(/\./g, "").replace(",", "."));
        if (!cap || cap <= 0) { setError("Ingresá un capital válido"); return; }
        if (!desde || !hasta) { setError("Ingresá ambas fechas"); return; }
        if (desde >= hasta) { setError("La fecha desde debe ser anterior a la fecha hasta"); return; }

        setCargando(true);
        try {
            const res = await fetch(`/api/user/calculadora?capital=${cap}&desde=${desde}&hasta=${hasta}`);
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Error al calcular"); return; }
            setResultado(data);
        } catch {
            setError("Error de conexión. Intentá de nuevo.");
        } finally {
            setCargando(false);
        }
    }

    const maxIntereses = resultado
        ? Math.max(resultado.tasaPasiva.intereses, resultado.cer3.intereses, resultado.cer3_67.intereses)
        : 0;

    if (habilitada === null) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 size={22} className="animate-spin text-slate-300" />
            </div>
        );
    }

    if (!habilitada) {
        return (
            <div className="p-4 md:p-8 max-w-2xl">
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Calculator size={24} className="text-slate-400" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">Calculadora no disponible</h2>
                    <p className="text-[13px] text-slate-400 max-w-xs">Esta herramienta está temporalmente deshabilitada. Contactá al colegio para más información.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Calculator size={20} className="text-slate-500" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Calculadora de Intereses</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Créditos laborales judicializados · Ley 27.802</p>
                </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800">
                <Info size={15} className="text-sky-500 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-sky-700 dark:text-sky-300 leading-relaxed">
                    Calculadora basada en la metodología oficial del BCRA. Compara la <strong>Tasa Pasiva Ley 27.802</strong>, <strong>CER + 3% anual</strong> y <strong>67% de CER + 3%</strong>. Los datos se obtienen en tiempo real de la API del BCRA.
                </p>
            </div>

            {/* Formulario */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Capital ($)</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ej: 500000"
                        value={capital}
                        onChange={(e) => setCapital(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Fecha desde</label>
                        <input
                            type="date"
                            value={desde}
                            onChange={(e) => setDesde(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Fecha hasta</label>
                        <input
                            type="date"
                            value={hasta}
                            onChange={(e) => setHasta(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800">
                        <AlertCircle size={14} className="text-rose-500 flex-shrink-0" />
                        <p className="text-[12px] text-rose-600 dark:text-rose-400">{error}</p>
                    </div>
                )}

                <button
                    onClick={calcular}
                    disabled={cargando}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#063f68] hover:bg-[#052f50] text-white text-[14px] font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {cargando ? <><Loader2 size={15} className="animate-spin" /> Consultando BCRA...</> : <><Calculator size={15} /> Calcular</>}
                </button>
            </div>

            {/* Resultados */}
            {resultado && (
                <div className="space-y-4">
                    {/* Resumen */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={15} className="text-emerald-500" />
                            <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Resultados</h2>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center text-[11px] text-slate-400 font-semibold mb-4">
                            <span>Capital original</span>
                            <span>Período</span>
                            <span>Días hábiles aprox.</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center mb-0">
                            <p className="text-[15px] font-black text-slate-800 dark:text-white">${fmt(resultado.capital)}</p>
                            <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">{fmtFecha(resultado.desde)} → {fmtFecha(resultado.hasta)}</p>
                            <p className="text-[15px] font-black text-slate-800 dark:text-white">{resultado.dias}</p>
                        </div>
                    </div>

                    {/* Tarjetas de cada método */}
                    {[
                        {
                            key: "tasaPasiva",
                            label: resultado.tasaPasiva.label,
                            intereses: resultado.tasaPasiva.intereses,
                            total: resultado.tasaPasiva.total,
                            ratio: resultado.tasaPasiva.ratio,
                            detalle: `Índice: ${fmtFecha(resultado.tasaPasiva.fechaInicio)} → ${fmtFecha(resultado.tasaPasiva.fechaFin)}`,
                            color: "emerald",
                        },
                        {
                            key: "cer3",
                            label: resultado.cer3.label,
                            intereses: resultado.cer3.intereses,
                            total: resultado.cer3.total,
                            ratio: resultado.cer3.ratio,
                            detalle: `CER: ${fmtFecha(resultado.cer3.fechaInicio)} → ${fmtFecha(resultado.cer3.fechaFin)}`,
                            color: "blue",
                        },
                        {
                            key: "cer3_67",
                            label: resultado.cer3_67.label,
                            intereses: resultado.cer3_67.intereses,
                            total: resultado.cer3_67.total,
                            ratio: null,
                            detalle: "67% del resultado CER + 3%",
                            color: "violet",
                        },
                    ].map((item) => {
                        const esMayor = item.intereses === maxIntereses;
                        return (
                            <div key={item.key}
                                className={`bg-white dark:bg-slate-900 rounded-2xl border-2 p-5 transition-all
                                    ${esMayor
                                        ? "border-emerald-400 dark:border-emerald-600 shadow-sm shadow-emerald-100 dark:shadow-emerald-900/20"
                                        : "border-slate-100 dark:border-slate-800"}`}>
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div>
                                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{item.label}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{item.detalle}</p>
                                    </div>
                                    {esMayor && (
                                        <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                                            Mayor
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Intereses</p>
                                        <p className="text-[18px] font-black text-slate-800 dark:text-white">${fmt(item.intereses)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Total c/ intereses</p>
                                        <p className="text-[18px] font-black text-emerald-600 dark:text-emerald-400">${fmt(item.total)}</p>
                                    </div>
                                    {item.ratio && (
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Tasa período</p>
                                            <p className="text-[18px] font-black text-slate-800 dark:text-white">{fmtPct(item.ratio)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Link BCRA */}
                    <a
                        href="https://www.bcra.gob.ar/calculadora-intereses-creditos-laborales-judicializados/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-[12px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                        <ExternalLink size={13} />
                        Verificar en calculadora oficial BCRA
                    </a>
                </div>
            )}
        </div>
    );
}
