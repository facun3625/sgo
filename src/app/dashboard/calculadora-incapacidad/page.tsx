"use client";

import { useState, useEffect, useRef } from "react";
import { Scale, Plus, Trash2, Loader2, TrendingUp, Info, AlertCircle } from "lucide-react";

interface TramoInput {
    id: number;
    edadFin: string;
    iap: string;
    prob: string;
}

interface TramoResult {
    edadInicio: number;
    edadFin: number;
    iap: number;
    prob: number;
    ive: number;
    ii: number;
    periodos: number;
}

interface Resultado {
    pvConstante: number;
    pvIncrementos: number;
    pvTotal: number;
    tramos: TramoResult[];
}

let _nextId = 1;
function nextId() { return _nextId++; }

function fmt(n: number) {
    return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcular(
    initialAge: number,
    incapPct: number,
    discountRate: number,
    tramos: TramoInput[]
): Resultado | string {
    if (tramos.length === 0) return "Agregá al menos un tramo";

    const parsed = tramos.map(t => ({
        edadFin: parseInt(t.edadFin),
        iap: parseFloat(t.iap.replace(/\./g, "").replace(",", ".")),
        prob: parseFloat(t.prob.replace(",", ".")) / 100,
    }));

    let prevAge = initialAge;
    for (let k = 0; k < parsed.length; k++) {
        const t = parsed[k];
        if (isNaN(t.edadFin) || t.edadFin <= prevAge)
            return `Tramo ${k + 1}: la edad fin debe ser mayor a ${prevAge}`;
        if (isNaN(t.iap) || t.iap <= 0)
            return `Tramo ${k + 1}: ingresá un ingreso anual válido`;
        if (k > 0 && (isNaN(t.prob) || t.prob < 0 || t.prob > 1))
            return `Tramo ${k + 1}: la probabilidad debe estar entre 0 y 100`;
        prevAge = t.edadFin;
    }

    // Compute IVE (expected income) per tramo
    const ive: number[] = [];
    for (let k = 0; k < parsed.length; k++) {
        if (k === 0) {
            ive.push(parsed[k].iap);
        } else {
            ive.push((1 - parsed[k].prob) * ive[k - 1] + parsed[k].prob * parsed[k].iap);
        }
    }

    const ii = ive.map(v => v * incapPct);
    const ii0 = ii[0]; // base constant income loss

    let pvTotal = 0;
    let pvConstante = 0;
    let startAge = initialAge;
    const tramosResult: TramoResult[] = [];

    for (let k = 0; k < parsed.length; k++) {
        const endAge = parsed[k].edadFin;
        for (let age = startAge; age < endAge; age++) {
            const exp = age - initialAge + 1;
            const factor = Math.pow(1 + discountRate, exp);
            pvTotal += ii[k] / factor;
            pvConstante += ii0 / factor;
        }
        tramosResult.push({
            edadInicio: startAge,
            edadFin: endAge,
            iap: parsed[k].iap,
            prob: parsed[k].prob,
            ive: ive[k],
            ii: ii[k],
            periodos: endAge - startAge,
        });
        startAge = endAge;
    }

    return { pvConstante, pvIncrementos: pvTotal - pvConstante, pvTotal, tramos: tramosResult };
}

export default function CalculadoraIncapacidadPage() {
    const [habilitada, setHabilitada] = useState<boolean | null>(null);
    const [edadInicial, setEdadInicial] = useState("20");
    const [incapacidad, setIncapacidad] = useState("50");
    const [tasa, setTasa] = useState("4");
    const [tramos, setTramos] = useState<TramoInput[]>([
        { id: nextId(), edadFin: "65", iap: "100000", prob: "100" },
    ]);
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/user/calculadora-incapacidad")
            .then(r => r.ok ? r.json() : null)
            .then(data => setHabilitada(data?.activa !== false))
            .catch(() => setHabilitada(false));
    }, []);

    function addTramo() {
        setTramos(prev => {
            const last = prev[prev.length - 1];
            const lastAge = parseInt(last?.edadFin ?? "65");
            return [...prev, { id: nextId(), edadFin: String(lastAge + 10), iap: last?.iap ?? "100000", prob: "50" }];
        });
    }

    function removeTramo(id: number) {
        setTramos(prev => prev.filter(t => t.id !== id));
        setResultado(null);
    }

    function updateTramo(id: number, field: keyof TramoInput, value: string) {
        setTramos(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
        setResultado(null);
    }

    function handleCalcular() {
        setError(null);
        setResultado(null);

        const age = parseInt(edadInicial);
        if (isNaN(age) || age < 1 || age > 100) { setError("Ingresá una edad inicial válida"); return; }

        const inc = parseFloat(incapacidad.replace(",", "."));
        if (isNaN(inc) || inc <= 0 || inc > 100) { setError("El porcentaje de incapacidad debe estar entre 0 y 100"); return; }

        const rate = parseFloat(tasa.replace(",", "."));
        if (isNaN(rate) || rate <= 0) { setError("Ingresá una tasa de descuento válida"); return; }

        const res = calcular(age, inc / 100, rate / 100, tramos);
        if (typeof res === "string") { setError(res); return; }
        setResultado(res);
    }

    if (habilitada === null) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 size={22} className="animate-spin text-slate-300" />
            </div>
        );
    }

    if (!habilitada) {
        return (
            <div className="p-4 md:p-8 max-w-3xl">
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Scale size={24} className="text-slate-700" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">Calculadora no disponible</h2>
                    <p className="text-[14px] text-slate-700 max-w-xs">Esta herramienta está temporalmente deshabilitada. Contactá al colegio para más información.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Scale size={20} className="text-slate-700" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Cálculo de Incapacidad</h1>
                    <p className="text-slate-700 text-sm mt-0.5">Ingreso variable probable · Art. 1746 CCyC · Fórmula Acciarri</p>
                </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800">
                <Info size={15} className="text-sky-500 mt-0.5 flex-shrink-0" />
                <p className="text-[13px] text-sky-700 dark:text-sky-300 leading-relaxed">
                    Calcula el <strong>valor presente</strong> de la indemnización por incapacidad con ingresos proyectados variables y probabilísticos. Basado en la metodología de Acciarri (art. 1746 CCyC).
                    El <strong>ingreso implicado</strong> por tramo se calcula como IVE × incapacidad, donde IVE pondera el ingreso anterior y el nuevo según la probabilidad de incremento.
                </p>
            </div>

            {/* Datos base */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                <h2 className="text-[13px] font-black uppercase tracking-widest text-slate-700">Datos base</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Edad inicial</label>
                        <input
                            type="number" min="1" max="100"
                            value={edadInicial}
                            onChange={e => { setEdadInicial(e.target.value); setResultado(null); }}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[16px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Incapacidad %</label>
                        <input
                            type="text" inputMode="decimal" placeholder="50"
                            value={incapacidad}
                            onChange={e => { setIncapacidad(e.target.value); setResultado(null); }}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[16px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Tasa descuento %</label>
                        <input
                            type="text" inputMode="decimal" placeholder="4"
                            value={tasa}
                            onChange={e => { setTasa(e.target.value); setResultado(null); }}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[16px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                        />
                    </div>
                </div>
            </div>

            {/* Tramos */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-[13px] font-black uppercase tracking-widest text-slate-700">Tramos de ingresos</h2>
                    <button
                        onClick={addTramo}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#063f68]/5 dark:bg-blue-900/20 text-[#063f68] dark:text-blue-400 text-[12px] font-bold border border-[#063f68]/15 hover:bg-[#063f68]/10 transition-all"
                    >
                        <Plus size={12} /> Agregar tramo
                    </button>
                </div>

                {/* Encabezado tabla */}
                <div className="grid grid-cols-[2rem_1fr_1.5fr_1fr_2rem] gap-3 px-6 py-2 bg-slate-50 dark:bg-slate-800/40 text-[11px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 dark:border-slate-800">
                    <span>#</span>
                    <span>Edad fin</span>
                    <span>Ingreso anual proyectado ($)</span>
                    <span>Prob. incremento %</span>
                    <span></span>
                </div>

                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {tramos.map((t, idx) => (
                        <div key={t.id} className="grid grid-cols-[2rem_1fr_1.5fr_1fr_2rem] gap-3 items-center px-6 py-3">
                            <span className="text-[12px] font-black text-slate-700">{idx + 1}</span>
                            <input
                                type="number" min="1"
                                value={t.edadFin}
                                onChange={e => updateTramo(t.id, "edadFin", e.target.value)}
                                placeholder="65"
                                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                            />
                            <input
                                type="text" inputMode="decimal"
                                value={t.iap}
                                onChange={e => updateTramo(t.id, "iap", e.target.value)}
                                placeholder="100000"
                                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                            />
                            {idx === 0 ? (
                                <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-[13px] text-slate-700 font-semibold">
                                    Ingreso base
                                </div>
                            ) : (
                                <input
                                    type="text" inputMode="decimal"
                                    value={t.prob}
                                    onChange={e => updateTramo(t.id, "prob", e.target.value)}
                                    placeholder="50"
                                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                                />
                            )}
                            <button
                                onClick={() => removeTramo(t.id)}
                                disabled={tramos.length === 1}
                                className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                        <strong>Edad fin:</strong> edad hasta la cual aplica el ingreso de ese tramo. · <strong>Prob. incremento:</strong> probabilidad de que el ingreso suba respecto al tramo anterior (0–100). El primer tramo es el ingreso base cierto.
                    </p>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800">
                    <AlertCircle size={14} className="text-rose-500 flex-shrink-0" />
                    <p className="text-[13px] text-rose-600 dark:text-rose-400">{error}</p>
                </div>
            )}

            {/* Calcular */}
            <button
                onClick={handleCalcular}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#063f68] hover:bg-[#052f50] text-white text-[15px] font-semibold transition-all"
            >
                <Scale size={15} /> Calcular
            </button>

            {/* Resultados */}
            {resultado && (
                <div className="space-y-4">
                    {/* Tres valores */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: "VP ingreso constante", value: resultado.pvConstante, color: "text-slate-800 dark:text-white" },
                            { label: "VP incrementos probables", value: resultado.pvIncrementos, color: "text-blue-600 dark:text-blue-400" },
                            { label: "Total indemnización", value: resultado.pvTotal, color: "text-emerald-600 dark:text-emerald-400", highlight: true },
                        ].map(item => (
                            <div key={item.label}
                                className={`bg-white dark:bg-slate-900 rounded-2xl border-2 p-5 ${item.highlight ? "border-emerald-400 dark:border-emerald-600 shadow-sm shadow-emerald-100 dark:shadow-emerald-900/20" : "border-slate-100 dark:border-slate-800"}`}>
                                <p className="text-[11px] text-slate-700 uppercase tracking-wide font-semibold mb-1.5">{item.label}</p>
                                <p className={`text-[19px] font-black ${item.color}`}>${fmt(item.value)}</p>
                            </div>
                        ))}
                    </div>

                    {/* Detalle por tramos */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <TrendingUp size={13} className="text-emerald-500" />
                            <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Detalle por tramo</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-700 font-black uppercase tracking-wider">
                                        <th className="px-4 py-2 text-left">Edades</th>
                                        <th className="px-4 py-2 text-right">Períodos</th>
                                        <th className="px-4 py-2 text-right">IAP</th>
                                        <th className="px-4 py-2 text-right">Prob.</th>
                                        <th className="px-4 py-2 text-right">IVE</th>
                                        <th className="px-4 py-2 text-right">II (pérdida anual)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {resultado.tramos.map((t, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-200">{t.edadInicio} – {t.edadFin - 1}</td>
                                            <td className="px-4 py-2.5 text-right text-slate-700">{t.periodos}</td>
                                            <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">${fmt(t.iap)}</td>
                                            <td className="px-4 py-2.5 text-right text-slate-700">
                                                {i === 0 ? "—" : `${(t.prob * 100).toFixed(0)}%`}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">${fmt(t.ive)}</td>
                                            <td className="px-4 py-2.5 text-right font-bold text-slate-800 dark:text-white">${fmt(t.ii)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
