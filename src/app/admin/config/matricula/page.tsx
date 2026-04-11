"use client";

import { useState, useEffect } from "react";
import { Settings2, CheckCircle2, AlertCircle, Loader2, Zap, Calendar } from "lucide-react";

interface ConfigValues {
    montoMensual: string;
    montoAnual: string;
    pagoAnualDesde: string;
    pagoAnualHasta: string;
}

export default function ConfigMatriculaPage() {
    const [values, setValues] = useState<ConfigValues>({ montoMensual: "", montoAnual: "", pagoAnualDesde: "", pagoAnualHasta: "" });
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [savingMensual, setSavingMensual] = useState(false);
    const [savingAnual, setSavingAnual] = useState(false);
    const [savingVentana, setSavingVentana] = useState(false);
    const [mensualMsg, setMensualMsg] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
    const [anualMsg, setAnualMsg] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
    const [ventanaMsg, setVentanaMsg] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
    const [generando, setGenerando] = useState(false);
    const [generarMsg, setGenerarMsg] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

    useEffect(() => {
        Promise.all([
            fetch("/api/admin/config").then((r) => r.json()),
            fetch("/api/admin/me").then((r) => r.json()),
        ])
            .then(([config, me]) => {
                setValues({
                    montoMensual: config.montoMensual ?? "",
                    montoAnual: config.montoAnual ?? "",
                    pagoAnualDesde: config.pagoAnualDesde ?? "",
                    pagoAnualHasta: config.pagoAnualHasta ?? "",
                });
                setIsSuperAdmin(me.accessLevel === "superadmin");
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async (
        clave: string,
        valor: string,
        setSaving: (v: boolean) => void,
        setMsg: (m: { tipo: "success" | "error"; texto: string } | null) => void
    ) => {
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch("/api/admin/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clave, valor }),
            });
            if (res.ok) {
                setMsg({ tipo: "success", texto: "Guardado correctamente." });
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

    const handleSaveVentana = async () => {
        if (!values.pagoAnualDesde || !values.pagoAnualHasta) {
            setVentanaMsg({ tipo: "error", texto: "Seleccioná ambas fechas." });
            return;
        }
        if (new Date(values.pagoAnualDesde) > new Date(values.pagoAnualHasta)) {
            setVentanaMsg({ tipo: "error", texto: "La fecha de inicio debe ser anterior al cierre." });
            return;
        }
        setSavingVentana(true);
        setVentanaMsg(null);
        try {
            const [r1, r2] = await Promise.all([
                fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave: "pagoAnualDesde", valor: values.pagoAnualDesde }) }),
                fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave: "pagoAnualHasta", valor: values.pagoAnualHasta }) }),
            ]);
            if (r1.ok && r2.ok) setVentanaMsg({ tipo: "success", texto: "Ventana guardada correctamente." });
            else setVentanaMsg({ tipo: "error", texto: "Error al guardar las fechas." });
        } catch {
            setVentanaMsg({ tipo: "error", texto: "Error de conexión." });
        } finally {
            setSavingVentana(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-500/10 flex items-center justify-center">
                    <Settings2 size={20} className="text-slate-400" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Matrícula</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Montos y ventana de pago anual</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-slate-400" />
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Monto Mensual */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                            <div>
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Monto Mensual</label>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Cuota mensual de matrícula ($)</p>
                            </div>
                            <input type="number" min={0} value={values.montoMensual}
                                onChange={(e) => setValues((v) => ({ ...v, montoMensual: e.target.value }))}
                                className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                            {mensualMsg && (
                                <div className={`flex items-center gap-2 text-[12px] font-bold ${mensualMsg.tipo === "success" ? "text-emerald-500" : "text-red-500"}`}>
                                    {mensualMsg.tipo === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                    {mensualMsg.texto}
                                </div>
                            )}
                            <button onClick={() => handleSave("montoMensual", values.montoMensual, setSavingMensual, setMensualMsg)} disabled={savingMensual}
                                className="flex items-center gap-2 px-5 h-10 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all active:scale-95">
                                {savingMensual ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} />}
                                {savingMensual ? "Guardando..." : "Guardar"}
                            </button>
                        </div>

                        {/* Monto Anual */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                            <div>
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Monto Anual</label>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Matrícula anual completa ($)</p>
                            </div>
                            <input type="number" min={0} value={values.montoAnual}
                                onChange={(e) => setValues((v) => ({ ...v, montoAnual: e.target.value }))}
                                className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                            {anualMsg && (
                                <div className={`flex items-center gap-2 text-[12px] font-bold ${anualMsg.tipo === "success" ? "text-emerald-500" : "text-red-500"}`}>
                                    {anualMsg.tipo === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                    {anualMsg.texto}
                                </div>
                            )}
                            <button onClick={() => handleSave("montoAnual", values.montoAnual, setSavingAnual, setAnualMsg)} disabled={savingAnual}
                                className="flex items-center gap-2 px-5 h-10 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all active:scale-95">
                                {savingAnual ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} />}
                                {savingAnual ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </div>

                    {/* Ventana de Pago Anual — solo superadmin */}
                    {isSuperAdmin && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-blue-500" />
                                <div>
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Ventana de Pago Anual</label>
                                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Período en que el pago anual está visible y disponible para los matriculados.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold block mb-1.5">Desde</label>
                                    <input type="date" value={values.pagoAnualDesde}
                                        onChange={(e) => setValues((v) => ({ ...v, pagoAnualDesde: e.target.value }))}
                                        className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold block mb-1.5">Hasta</label>
                                    <input type="date" value={values.pagoAnualHasta}
                                        onChange={(e) => setValues((v) => ({ ...v, pagoAnualHasta: e.target.value }))}
                                        className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                            </div>
                            {values.pagoAnualDesde && values.pagoAnualHasta && (
                                <p className="text-[12px] text-slate-400">
                                    Disponible del{" "}
                                    <strong className="text-slate-700 dark:text-slate-300">{new Date(values.pagoAnualDesde + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}</strong>
                                    {" "}al{" "}
                                    <strong className="text-slate-700 dark:text-slate-300">{new Date(values.pagoAnualHasta + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}</strong>.
                                </p>
                            )}
                            {ventanaMsg && (
                                <div className={`flex items-center gap-2 text-[12px] font-bold ${ventanaMsg.tipo === "success" ? "text-emerald-500" : "text-red-500"}`}>
                                    {ventanaMsg.tipo === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                    {ventanaMsg.texto}
                                </div>
                            )}
                            <button onClick={handleSaveVentana} disabled={savingVentana}
                                className="flex items-center gap-2 px-5 h-10 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all active:scale-95">
                                {savingVentana ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                                {savingVentana ? "Guardando..." : "Guardar ventana"}
                            </button>
                        </div>
                    )}

                    {/* Generar cuotas */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                        <div>
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Generar Cuotas del Mes Actual</label>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Crea las cuotas mensuales para todos los matriculados activos (excluye pago anual y débito automático). El cron lo hace automáticamente el 1ro de cada mes.
                            </p>
                        </div>
                        {generarMsg && (
                            <div className={`flex items-center gap-2 text-[12px] font-bold ${generarMsg.tipo === "success" ? "text-emerald-500" : "text-red-500"}`}>
                                {generarMsg.tipo === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                {generarMsg.texto}
                            </div>
                        )}
                        <button
                            onClick={async () => {
                                setGenerando(true); setGenerarMsg(null);
                                try {
                                    const res = await fetch("/api/admin/cuotas/generar", { method: "POST" });
                                    const data = await res.json();
                                    if (res.ok) setGenerarMsg({ tipo: "success", texto: `${data.message} (${data.creadas} creadas)` });
                                    else setGenerarMsg({ tipo: "error", texto: data.error ?? "Error al generar." });
                                } catch {
                                    setGenerarMsg({ tipo: "error", texto: "Error de conexión." });
                                } finally { setGenerando(false); }
                            }}
                            disabled={generando}
                            className="flex items-center gap-2 px-5 h-10 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all active:scale-95">
                            {generando ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                            {generando ? "Generando..." : "Generar cuotas ahora"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
