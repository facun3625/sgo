"use client";

import { useState, useEffect } from "react";
import { Banknote, Info, Loader2, AlertCircle, TrendingUp, RefreshCw } from "lucide-react";

function fmt(n: number) {
    return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtJus(n: number) {
    return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function minScale(b: number): number {
    if (b < 16)  return b * 0.22;
    if (b < 46)  return (b - 15) * 0.20 + 15 * 0.33;
    if (b < 91)  return (b - 45) * 0.18 + 45 * 0.26;
    if (b < 151) return (b - 90) * 0.17 + 90 * 0.24;
    if (b < 451) return (b - 150) * 0.15 + 150 * 0.22;
    if (b < 751) return (b - 450) * 0.13 + 450 * 0.20;
    return (b - 750) * 0.10 + 750 * 0.17;
}

function maxScale(b: number): number {
    if (b < 16)  return b * 0.33;
    if (b < 46)  return (b - 15) * 0.26 + 15 * 0.33;
    if (b < 91)  return (b - 45) * 0.24 + 45 * 0.26;
    if (b < 151) return (b - 90) * 0.22 + 90 * 0.24;
    if (b < 451) return (b - 150) * 0.20 + 150 * 0.22;
    if (b < 751) return (b - 450) * 0.17 + 450 * 0.20;
    return (b - 750) * 0.13 + 750 * 0.17;
}

const TIPOS = [
    { label: "Juicio ordinario / principal", pct: 1.0, art: "Art. 6" },
    { label: "Allanamiento · desistido post ofrecimiento de prueba", pct: 0.80, art: "Art. 7 inc. a" },
    { label: "Ejecución · apremio · ejecución laboral", pct: 0.70, art: "Art. 7 inc. b" },
    { label: "Desistido o perimido antes de ofrecimiento de prueba", pct: 0.70, art: "Art. 7 inc. a" },
    { label: "División de cosas comunes (con acuerdo)", pct: 0.70, art: "Art. 7 inc. c" },
    { label: "Medidas cautelares / previas / preparatorias", pct: 0.30, art: "Art. 7 inc. d" },
];

const MINIMOS_FIJOS = [
    { label: "Divorcio (por parte)", min: 8, nota: "14 JUS si representación unificada · 3 JUS conversión" },
    { label: "Filiación / adopción (por parte)", min: 6, nota: "Art. 12" },
    { label: "Desalojo (base: 3 años de alquiler)", min: 6, nota: "Art. 12 · valor = 3 × canon anual" },
    { label: "Declaratoria de herederos (sin denuncia)", min: 6, nota: "Art. 12" },
    { label: "Acción meramente declarativa", min: 6, nota: "Art. 12" },
    { label: "Amparo / acción contencioso-administrativa", min: 10, nota: "Art. 12" },
];

interface ConfigData {
    activa: boolean;
    valorJus: number | null;
    actualizadoEn: string | null;
}

export default function CalculadoraHonorariosPage() {
    const [config, setConfig] = useState<ConfigData | null>(null);
    const [base, setBase] = useState("");
    const [resultado, setResultado] = useState<{ baseJus: number; minJus: number; maxJus: number; minARS: number; maxARS: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [valorJusManual, setValorJusManual] = useState("");

    useEffect(() => {
        fetch("/api/user/calculadora-honorarios")
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                setConfig(d);
                if (d?.valorJus) setValorJusManual(String(d.valorJus));
            })
            .catch(() => setConfig({ activa: false, valorJus: null, actualizadoEn: null }));
    }, []);

    function handleCalcular() {
        setError(null); setResultado(null);
        const valorJus = parseFloat(valorJusManual.replace(/\./g, "").replace(",", "."));
        if (!valorJus || valorJus <= 0) { setError("Ingresá el valor del JUS"); return; }
        const baseARS = parseFloat(base.replace(/\./g, "").replace(",", "."));
        if (!baseARS || baseARS <= 0) { setError("Ingresá la base regulatoria"); return; }

        const baseJus = baseARS / valorJus;
        const minJus = minScale(baseJus);
        const maxJus = maxScale(baseJus);
        setResultado({ baseJus, minJus, maxJus, minARS: minJus * valorJus, maxARS: maxJus * valorJus });
    }

    if (config === null) return <div className="flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-slate-300" /></div>;

    if (!config.activa) return (
        <div className="p-4 md:p-8 max-w-2xl">
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Banknote size={24} className="text-slate-700" /></div>
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">Calculadora no disponible</h2>
                <p className="text-[13px] text-slate-700 max-w-xs">Esta herramienta está temporalmente deshabilitada.</p>
            </div>
        </div>
    );

    const valorJus = parseFloat(valorJusManual.replace(/\./g, "").replace(",", ".")) || 0;

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-3xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Banknote size={20} className="text-slate-700" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Calculadora de Honorarios</h1>
                    <p className="text-slate-700 text-sm mt-0.5">Ley 6767 · Modificación Ley 12.851 · Caja Forense Santa Fe</p>
                </div>
            </div>

            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800">
                <Info size={15} className="text-sky-500 mt-0.5 flex-shrink-0" />
                <p className="text-[13px] text-sky-700 dark:text-sky-300 leading-relaxed">
                    Calcula honorarios mínimos y máximos según la escala de la <strong>Ley 6767</strong> con modificación <strong>Ley 12.851</strong>.
                    La base regulatoria se convierte a JUS y se aplica la tabla progresiva por tramos.
                    {config.actualizadoEn && <span> Valor JUS actualizado el <strong>{config.actualizadoEn}</strong>.</span>}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                            Valor JUS ($)
                            {config.valorJus && <span className="text-[10px] font-normal text-slate-700 normal-case">(cargado desde sistema)</span>}
                        </label>
                        <input type="text" inputMode="decimal" placeholder="Ej: 136317.62"
                            value={valorJusManual}
                            onChange={e => { setValorJusManual(e.target.value); setResultado(null); }}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#063f68]/30" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Base regulatoria ($)</label>
                        <input type="text" inputMode="decimal" placeholder="Ej: 5000000"
                            value={base}
                            onChange={e => { setBase(e.target.value); setResultado(null); }}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#063f68]/30" />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800">
                        <AlertCircle size={14} className="text-rose-500 flex-shrink-0" />
                        <p className="text-[13px] text-rose-600 dark:text-rose-400">{error}</p>
                    </div>
                )}

                <button onClick={handleCalcular}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#063f68] hover:bg-[#052f50] text-white text-[14px] font-semibold transition-all">
                    <Banknote size={15} /> Calcular honorarios
                </button>
            </div>

            {resultado && (
                <div className="space-y-4">
                    {/* Resultado principal */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 p-5">
                            <p className="text-[11px] text-slate-700 uppercase tracking-wide font-semibold mb-1.5">Base en JUS</p>
                            <p className="text-[20px] font-black text-slate-800 dark:text-white">{fmtJus(resultado.baseJus)}</p>
                            <p className="text-[11px] text-slate-700 mt-0.5">JUS</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-5">
                            <p className="text-[11px] text-slate-700 uppercase tracking-wide font-semibold mb-1.5">Honorario mínimo</p>
                            <p className="text-[20px] font-black text-blue-700 dark:text-blue-400">${fmt(resultado.minARS)}</p>
                            <p className="text-[11px] text-slate-700 mt-0.5">{fmtJus(resultado.minJus)} JUS</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-400 dark:border-emerald-600 shadow-sm shadow-emerald-100 p-5">
                            <p className="text-[11px] text-slate-700 uppercase tracking-wide font-semibold mb-1.5">Honorario máximo</p>
                            <p className="text-[20px] font-black text-emerald-600 dark:text-emerald-400">${fmt(resultado.maxARS)}</p>
                            <p className="text-[11px] text-slate-700 mt-0.5">{fmtJus(resultado.maxJus)} JUS</p>
                        </div>
                    </div>

                    {/* Tabla por tipo de juicio */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <TrendingUp size={13} className="text-emerald-500" />
                            <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Por tipo de proceso</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-700 font-black uppercase tracking-wider">
                                        <th className="px-4 py-2.5 text-left">Tipo de proceso</th>
                                        <th className="px-3 py-2.5 text-center">%</th>
                                        <th className="px-4 py-2.5 text-right">Mínimo</th>
                                        <th className="px-4 py-2.5 text-right">Máximo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {TIPOS.map(tipo => {
                                        const min = resultado.minARS * tipo.pct;
                                        const max = resultado.maxARS * tipo.pct;
                                        return (
                                            <tr key={tipo.label} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                                <td className="px-4 py-3">
                                                    <p className="text-[13px] font-semibold text-slate-800 dark:text-white">{tipo.label}</p>
                                                    <p className="text-[11px] text-slate-700">{tipo.art}</p>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <span className="text-[12px] font-bold text-slate-700">{tipo.pct * 100}%</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <p className="text-[13px] font-bold text-blue-700 dark:text-blue-400">${fmt(min)}</p>
                                                    <p className="text-[11px] text-slate-700">{fmtJus(resultado.minJus * tipo.pct)} JUS</p>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">${fmt(max)}</p>
                                                    <p className="text-[11px] text-slate-700">{fmtJus(resultado.maxJus * tipo.pct)} JUS</p>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mínimos fijos */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Mínimos fijos especiales</h3>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {MINIMOS_FIJOS.map(m => (
                                <div key={m.label} className="px-5 py-3 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-[13px] font-semibold text-slate-800 dark:text-white">{m.label}</p>
                                        <p className="text-[11px] text-slate-700">{m.nota}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-[14px] font-black text-amber-600 dark:text-amber-400">{m.min} JUS</p>
                                        {valorJus > 0 && <p className="text-[11px] text-slate-700">${fmt(m.min * valorJus)}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
