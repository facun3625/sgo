"use client";

import { useState, useEffect } from "react";
import { Landmark, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ConfigJusPage() {
    const [valor, setValor] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

    useEffect(() => {
        fetch("/api/admin/config")
            .then((r) => r.json())
            .then((data) => { setValor(data.jus ?? ""); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        if (!valor || isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
            setMsg({ tipo: "error", texto: "Ingresá un valor numérico mayor a 0." });
            return;
        }
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch("/api/admin/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clave: "jus", valor }),
            });
            if (res.ok) {
                setMsg({ tipo: "success", texto: "Valor de JUS guardado correctamente." });
            } else {
                const data = await res.json();
                setMsg({ tipo: "error", texto: data.error ?? "Error al guardar." });
            }
        } catch {
            setMsg({ tipo: "error", texto: "Error de conexión." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <Landmark size={20} className="text-amber-500" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Valor del JUS</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Unidad de referencia para cálculos de sanciones y multas</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-slate-400" />
                </div>
            ) : (
                <div className="max-w-md space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                        <div>
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                JUS — Valor actual ($)
                            </label>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Este valor se usa como base para calcular multas en suspensiones, rehabilitaciones y sanciones disciplinarias.
                            </p>
                        </div>

                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[14px]">$</span>
                            <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={valor}
                                onChange={(e) => { setValor(e.target.value); setMsg(null); }}
                                placeholder="0.00"
                                className="w-full h-12 pl-8 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[16px] font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                        </div>

                        {valor && !isNaN(parseFloat(valor)) && parseFloat(valor) > 0 && (
                            <p className="text-[12px] text-slate-400">
                                Ejemplo: 5 JUS ={" "}
                                <strong className="text-slate-700 dark:text-slate-200">
                                    ${(parseFloat(valor) * 5).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                </strong>
                            </p>
                        )}

                        {msg && (
                            <div className={`flex items-center gap-2 text-[12px] font-bold ${msg.tipo === "success" ? "text-emerald-500" : "text-red-500"}`}>
                                {msg.tipo === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                {msg.texto}
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 h-10 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all active:scale-95"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />}
                            {saving ? "Guardando..." : "Guardar JUS"}
                        </button>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-800/40 p-4">
                        <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
                            <strong>¿Qué es el JUS?</strong> El JUS es la unidad de medida económica utilizada por el Colegio para determinar el monto de sanciones y multas. Su valor debe actualizarse cuando las autoridades lo indiquen.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
