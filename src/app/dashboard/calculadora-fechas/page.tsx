"use client";

import { useState } from "react";
import { CalendarDays, Clock, Info, Loader2, AlertCircle } from "lucide-react";

interface Feriado {
    fecha: string;
    motivo: string;
}

interface Resultado {
    desde: string;
    dias: number;
    tipo: string;
    resultado: string;
    feriadosEnPeriodo: Feriado[];
}

function fmtFecha(iso: string) {
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
}

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function diaSemana(iso: string) {
    const [y, m, d] = iso.split("-").map(Number);
    return DIAS_SEMANA[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export default function CalculadoraFechasPage() {
    const [desde, setDesde] = useState("");
    const [dias, setDias] = useState("");
    const [tipo, setTipo] = useState<"habiles" | "corridos">("habiles");
    const [cargando, setCargando] = useState(false);
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function calcular() {
        setError(null);
        setResultado(null);

        if (!desde) { setError("Ingresá una fecha inicial"); return; }
        const d = parseInt(dias);
        if (!d || d <= 0) { setError("Ingresá una cantidad de días válida"); return; }

        setCargando(true);
        try {
            const res = await fetch(`/api/user/calculadora-fechas?desde=${desde}&dias=${d}&tipo=${tipo}`);
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Error al calcular"); return; }
            setResultado(data);
        } catch {
            setError("Error de conexión. Intentá de nuevo.");
        } finally {
            setCargando(false);
        }
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <CalendarDays size={20} className="text-slate-500" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Calculadora de Fechas</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Días hábiles y corridos · Feriados nacionales</p>
                </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800">
                <Info size={15} className="text-sky-500 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-sky-700 dark:text-sky-300 leading-relaxed">
                    Calculá la fecha resultante sumando días <strong>hábiles</strong> (excluye fines de semana y feriados nacionales) o <strong>corridos</strong> (días calendario). Los feriados se obtienen de la base oficial argentina.
                </p>
            </div>

            {/* Formulario */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Fecha inicial</label>
                    <input
                        type="date"
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Cantidad de días</label>
                        <input
                            type="number"
                            min="1"
                            placeholder="Ej: 30"
                            value={dias}
                            onChange={(e) => setDias(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Tipo</label>
                        <div className="grid grid-cols-2 gap-2 h-[42px]">
                            {(["habiles", "corridos"] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTipo(t)}
                                    className={`rounded-xl text-[12px] font-bold transition-all border
                                        ${tipo === t
                                            ? "bg-[#063f68] text-white border-[#063f68]"
                                            : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-[#063f68]/40"}`}
                                >
                                    {t === "habiles" ? "Hábiles" : "Corridos"}
                                </button>
                            ))}
                        </div>
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
                    {cargando
                        ? <><Loader2 size={15} className="animate-spin" /> Calculando...</>
                        : <><CalendarDays size={15} /> Calcular</>}
                </button>
            </div>

            {/* Resultado */}
            {resultado && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#063f68]/30 p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Clock size={15} className="text-[#063f68]" />
                            <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Resultado</h2>
                        </div>
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-1">Fecha inicial</p>
                                <p className="text-[17px] font-black text-slate-800 dark:text-white">{fmtFecha(resultado.desde)}</p>
                                <p className="text-[11px] text-slate-400 capitalize">{diaSemana(resultado.desde)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">
                                    + {resultado.dias} {resultado.tipo}
                                </p>
                                <div className="flex items-center justify-center gap-1">
                                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-1">Fecha resultante</p>
                                <p className="text-[17px] font-black text-emerald-600 dark:text-emerald-400">{fmtFecha(resultado.resultado)}</p>
                                <p className="text-[11px] text-slate-400 capitalize">{diaSemana(resultado.resultado)}</p>
                            </div>
                        </div>
                    </div>

                    {resultado.feriadosEnPeriodo.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                            <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-3">
                                Feriados en el período ({resultado.feriadosEnPeriodo.length})
                            </h3>
                            <div className="space-y-2">
                                {resultado.feriadosEnPeriodo.map((f) => (
                                    <div key={f.fecha} className="flex items-center gap-3">
                                        <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 w-24 flex-shrink-0">{fmtFecha(f.fecha)}</span>
                                        <span className="text-[11px] text-slate-400 w-20 flex-shrink-0 capitalize">{diaSemana(f.fecha)}</span>
                                        <span className="text-[12px] text-slate-500 dark:text-slate-400">{f.motivo}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {resultado.feriadosEnPeriodo.length === 0 && resultado.tipo === "habiles" && (
                        <p className="text-[12px] text-slate-400 text-center py-2">
                            No hay feriados nacionales en el período calculado.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
