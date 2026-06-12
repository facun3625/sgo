"use client";

import { useState, useEffect } from "react";
import { Gavel, Info, Loader2, AlertCircle, CalendarCheck } from "lucide-react";

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function parseDate(s: string): Date {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function fmtDate(d: Date): string {
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function diaSemana(d: Date): string {
    return DIAS_SEMANA[d.getDay()];
}

function addMonths(d: Date, months: number): Date {
    return new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
}

function addDays(d: Date, days: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function diffFromToday(d: Date): string {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "hoy";
    if (diff > 0) {
        if (diff < 30) return `en ${diff} días`;
        if (diff < 365) return `en ${Math.round(diff / 30)} meses`;
        return `en ${(diff / 365).toFixed(1)} años`;
    }
    const abs = Math.abs(diff);
    if (abs < 30) return `hace ${abs} días`;
    if (abs < 365) return `hace ${Math.round(abs / 30)} meses`;
    return `hace ${(abs / 365).toFixed(1)} años`;
}

interface Resultado {
    vencimiento: Date;
    salidasTransitorias: Date;
    libertadCondicional: Date;
    libertadAsistida: Date;
    totalDias: number;
    ley: string;
}

function calcular(
    fechaStr: string, años: number, meses: number, dias: number,
    descuento: number, ley: string
): Resultado | string {
    if (!fechaStr) return "Ingresá la fecha de detención";
    const base = parseDate(fechaStr);

    // Vencimiento: fecha(año+años, mes+meses, día+días-1-descuento)
    const venc = new Date(base.getFullYear() + años, base.getMonth() + meses, base.getDate() + dias - 1 - descuento);
    if (venc <= base) return "El vencimiento debe ser posterior a la fecha de detención";

    const totalDias = Math.round((venc.getTime() - base.getTime()) / 86400000) + 1;

    // Salidas transitorias: mitad de pena
    const salidas = addDays(base, Math.ceil(totalDias / 2) - 1);

    // Libertad condicional: <= 3 años exactos → 8 meses; resto → 2/3
    let lc: Date;
    if (años < 3 || (años === 3 && meses === 0 && dias === 0)) {
        lc = addDays(addMonths(base, 8), -1);
    } else {
        lc = addDays(base, Math.ceil(totalDias * 2 / 3) - 1);
    }

    // Libertad asistida: 6 meses (24660) o 3 meses (27375) antes del vencimiento
    const la = addMonths(venc, ley === "24660" ? -6 : -3);

    return { vencimiento: venc, salidasTransitorias: salidas, libertadCondicional: lc, libertadAsistida: la, totalDias, ley };
}

export default function CalculadoraPenasPage() {
    const [habilitada, setHabilitada] = useState<boolean | null>(null);
    const [fecha, setFecha] = useState("");
    const [años, setAños] = useState("0");
    const [meses, setMeses] = useState("0");
    const [dias, setDias] = useState("0");
    const [descuento, setDescuento] = useState("0");
    const [ley, setLey] = useState<"24660" | "27375">("27375");
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/user/calculadora-penas")
            .then(r => r.ok ? r.json() : null)
            .then(d => setHabilitada(d?.activa !== false))
            .catch(() => setHabilitada(false));
    }, []);

    function handleCalcular() {
        setError(null); setResultado(null);
        const a = parseInt(años) || 0, m = parseInt(meses) || 0, d = parseInt(dias) || 0;
        if (a === 0 && m === 0 && d === 0) { setError("Ingresá la duración de la pena"); return; }
        const desc = parseInt(descuento) || 0;
        const res = calcular(fecha, a, m, d, desc, ley);
        if (typeof res === "string") { setError(res); return; }
        setResultado(res);
    }

    if (habilitada === null) return <div className="flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-slate-300" /></div>;

    if (!habilitada) return (
        <div className="p-4 md:p-8 max-w-2xl">
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Gavel size={24} className="text-slate-700" /></div>
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">Calculadora no disponible</h2>
                <p className="text-[13px] text-slate-700 max-w-xs">Esta herramienta está temporalmente deshabilitada.</p>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Gavel size={20} className="text-slate-700" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Cómputo de Penas</h1>
                    <p className="text-slate-700 text-sm mt-0.5">Ley 24.660 · Ley 27.375 · Vencimiento y egresos anticipados</p>
                </div>
            </div>

            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800">
                <Info size={15} className="text-sky-500 mt-0.5 flex-shrink-0" />
                <p className="text-[13px] text-sky-700 dark:text-sky-300 leading-relaxed">
                    Calcula vencimiento de pena, salidas transitorias (½), libertad condicional (⅔) y libertad asistida.
                    La diferencia clave entre leyes: la <strong>Ley 24.660</strong> prevé libertad asistida 6 meses antes del agotamiento;
                    la <strong>Ley 27.375</strong> la redujo a 3 meses, con exclusiones del art. 56 bis.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Fecha de detención / inicio de cómputo</label>
                    <input type="date" value={fecha} onChange={e => { setFecha(e.target.value); setResultado(null); }}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30" />
                </div>

                <div>
                    <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide block mb-2">Duración de la pena</label>
                    <div className="grid grid-cols-3 gap-3">
                        {[["Años", años, setAños], ["Meses", meses, setMeses], ["Días", dias, setDias]].map(([label, val, setter]) => (
                            <div key={label as string} className="space-y-1">
                                <label className="text-[11px] text-slate-700 font-semibold">{label as string}</label>
                                <input type="number" min="0" value={val as string}
                                    onChange={e => { (setter as (v: string) => void)(e.target.value); setResultado(null); }}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#063f68]/30" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Días de descuento</label>
                        <input type="number" min="0" value={descuento} onChange={e => { setDescuento(e.target.value); setResultado(null); }}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#063f68]/30" />
                        <p className="text-[11px] text-slate-700">Si no hay descuento, dejá en 0</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Ley aplicable</label>
                        <div className="grid grid-cols-2 gap-2 h-[42px]">
                            {(["24660", "27375"] as const).map(l => (
                                <button key={l} onClick={() => { setLey(l); setResultado(null); }}
                                    className={`rounded-xl text-[13px] font-bold transition-all border
                                        ${ley === l ? "bg-[#063f68] text-white border-[#063f68]" : "bg-white dark:bg-slate-900 text-slate-700 border-slate-200 dark:border-slate-700 hover:border-[#063f68]/40"}`}>
                                    {l}
                                </button>
                            ))}
                        </div>
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
                    <Gavel size={15} /> Calcular cómputo
                </button>
            </div>

            {resultado && (
                <div className="space-y-3">
                    <p className="text-[12px] font-black uppercase tracking-widest text-slate-700 px-1">
                        Pena total: {Math.round(resultado.totalDias / 365 * 10) / 10} años · {resultado.totalDias} días · Ley {resultado.ley}
                    </p>
                    {[
                        {
                            label: "Vencimiento de pena",
                            sub: "Agotamiento total",
                            date: resultado.vencimiento,
                            color: "border-rose-400 dark:border-rose-600",
                            badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400",
                            icon: "🔒",
                        },
                        {
                            label: "Salidas transitorias",
                            sub: "½ de la pena cumplida",
                            date: resultado.salidasTransitorias,
                            color: "border-orange-400 dark:border-orange-600",
                            badge: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400",
                            icon: "🚶",
                        },
                        {
                            label: "Libertad condicional",
                            sub: "⅔ de la pena cumplida",
                            date: resultado.libertadCondicional,
                            color: "border-blue-400 dark:border-blue-600",
                            badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
                            icon: "⚖️",
                        },
                        {
                            label: "Libertad asistida",
                            sub: `${resultado.ley === "24660" ? "6" : "3"} meses antes del vencimiento (art. ${resultado.ley === "24660" ? "54 Ley 24.660" : "54 Ley 27.375"})`,
                            date: resultado.libertadAsistida,
                            color: "border-emerald-400 dark:border-emerald-600",
                            badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400",
                            icon: "✅",
                        },
                    ].map(item => (
                        <div key={item.label} className={`bg-white dark:bg-slate-900 rounded-2xl border-2 ${item.color} p-5`}>
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-base">{item.icon}</span>
                                        <p className="text-[14px] font-bold text-slate-800 dark:text-white">{item.label}</p>
                                    </div>
                                    <p className="text-[12px] text-slate-700 mb-3">{item.sub}</p>
                                    <p className="text-[24px] font-black text-slate-900 dark:text-white">{fmtDate(item.date)}</p>
                                    <p className="text-[12px] text-slate-700 capitalize mt-0.5">{diaSemana(item.date)}</p>
                                </div>
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${item.badge} flex-shrink-0`}>
                                    {diffFromToday(item.date)}
                                </span>
                            </div>
                        </div>
                    ))}

                    {resultado.ley === "27375" && (
                        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <p className="text-[12px] text-amber-700 dark:text-amber-300 font-semibold mb-0.5">⚠️ Exclusiones Ley 27.375 — Art. 56 bis</p>
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                                No aplica libertad asistida para condenas por: homicidio agravado (art. 80), delitos contra la integridad sexual con acceso carnal (arts. 119 3°/4° párr., 120 2° párr.), privación ilegal de la libertad coactiva con resultado muerte (art. 142 bis), torturas con resultado muerte (art. 144 ter), homicidio en ocasión de robo (art. 165), secuestro extorsivo (art. 170), entre otros. Verificar el caso con asesoramiento profesional.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
