"use client";

import { useState, useEffect } from "react";
import { Trash2, Loader2, ShieldAlert, Settings2, ToggleLeft, ToggleRight, Calculator, CalendarDays, Scale, Gavel, Banknote, Save } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const IMPORTAR_TABS = [
    { id: "matriculados",        label: "Matriculados" },
    { id: "nuevos-matriculados", label: "Nuevos Matriculados" },
    { id: "financiero",          label: "Financiero" },
    { id: "banelco",             label: "Home Banking" },
    { id: "fiadores",            label: "Fiadores" },
    { id: "adhesiones",          label: "Débito Automático" },
    { id: "usuarios",            label: "Usuarios" },
    { id: "suspensiones",        label: "Suspensiones" },
    { id: "tribunal",            label: "Tribunal de Ética" },
];

export default function ConfigSistemaPage() {
    const { showToast } = useToast();

    // Vaciar datos
    const [confirmDatos, setConfirmDatos] = useState(false);
    const [borrandoDatos, setBorrandoDatos] = useState(false);

    // Calculadora de intereses
    const [calculadoraActiva, setCalculadoraActiva] = useState(true);
    const [guardandoCalc, setGuardandoCalc] = useState(false);

    // Calculadora de fechas
    const [calculadoraFechasActiva, setCalculadoraFechasActiva] = useState(true);
    const [guardandoCalcFechas, setGuardandoCalcFechas] = useState(false);

    // Calculadora de incapacidad
    const [calculadoraIncapacidadActiva, setCalculadoraIncapacidadActiva] = useState(true);
    const [guardandoCalcIncap, setGuardandoCalcIncap] = useState(false);

    // Cómputo de penas
    const [calculadoraPenasActiva, setCalculadoraPenasActiva] = useState(true);
    const [guardandoCalcPenas, setGuardandoCalcPenas] = useState(false);

    // Calculadora de honorarios
    const [calculadoraHonorariosActiva, setCalculadoraHonorariosActiva] = useState(true);
    const [guardandoCalcHonorarios, setGuardandoCalcHonorarios] = useState(false);

    // Valor JUS
    const [valorJus, setValorJus] = useState("");
    const [valorJusActualizadoEn, setValorJusActualizadoEn] = useState("");
    const [guardandoJus, setGuardandoJus] = useState(false);

    // Tabs importar
    const [tabsActivas, setTabsActivas] = useState<string[]>(IMPORTAR_TABS.map(t => t.id));
    const [loadingTabs, setLoadingTabs] = useState(true);
    const [guardandoTabs, setGuardandoTabs] = useState(false);

    useEffect(() => {
        fetch("/api/admin/config")
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    setCalculadoraActiva(data.calculadoraActiva !== false);
                    setCalculadoraFechasActiva(data.calculadoraFechasActiva !== false);
                    setCalculadoraIncapacidadActiva(data.calculadoraIncapacidadActiva !== false);
                    setCalculadoraPenasActiva(data.calculadoraPenasActiva !== false);
                    setCalculadoraHonorariosActiva(data.calculadoraHonorariosActiva !== false);
                    if (data.valorJus) setValorJus(data.valorJus);
                    if (data.valorJusActualizadoEn) setValorJusActualizadoEn(data.valorJusActualizadoEn);
                }
            });
    }, []);

    async function guardarCalculadora(activa: boolean) {
        setGuardandoCalc(true);
        try {
            const res = await fetch("/api/admin/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clave: "calculadoraActiva", valor: activa ? "1" : "0" }),
            });
            if (res.ok) showToast(`Calculadora de intereses ${activa ? "activada" : "desactivada"}`, "success");
            else showToast("Error al guardar", "error");
        } catch { showToast("Error de conexión", "error"); }
        finally { setGuardandoCalc(false); }
    }

    async function guardarCalculadoraFechas(activa: boolean) {
        setGuardandoCalcFechas(true);
        try {
            const res = await fetch("/api/admin/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clave: "calculadoraFechasActiva", valor: activa ? "1" : "0" }),
            });
            if (res.ok) showToast(`Calculadora de fechas ${activa ? "activada" : "desactivada"}`, "success");
            else showToast("Error al guardar", "error");
        } catch { showToast("Error de conexión", "error"); }
        finally { setGuardandoCalcFechas(false); }
    }

    async function guardarCalculadoraIncapacidad(activa: boolean) {
        setGuardandoCalcIncap(true);
        try {
            const res = await fetch("/api/admin/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clave: "calculadoraIncapacidadActiva", valor: activa ? "1" : "0" }),
            });
            if (res.ok) showToast(`Cálculo de incapacidad ${activa ? "activado" : "desactivado"}`, "success");
            else showToast("Error al guardar", "error");
        } catch { showToast("Error de conexión", "error"); }
        finally { setGuardandoCalcIncap(false); }
    }

    async function guardarCalculadoraPenas(activa: boolean) {
        setGuardandoCalcPenas(true);
        try {
            const res = await fetch("/api/admin/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clave: "calculadoraPenasActiva", valor: activa ? "1" : "0" }),
            });
            if (res.ok) showToast(`Cómputo de penas ${activa ? "activado" : "desactivado"}`, "success");
            else showToast("Error al guardar", "error");
        } catch { showToast("Error de conexión", "error"); }
        finally { setGuardandoCalcPenas(false); }
    }

    async function guardarCalculadoraHonorarios(activa: boolean) {
        setGuardandoCalcHonorarios(true);
        try {
            const res = await fetch("/api/admin/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clave: "calculadoraHonorariosActiva", valor: activa ? "1" : "0" }),
            });
            if (res.ok) showToast(`Calculadora de honorarios ${activa ? "activada" : "desactivada"}`, "success");
            else showToast("Error al guardar", "error");
        } catch { showToast("Error de conexión", "error"); }
        finally { setGuardandoCalcHonorarios(false); }
    }

    async function guardarValorJus() {
        if (!valorJus || isNaN(Number(valorJus.replace(",", ".")))) {
            showToast("Ingresá un valor JUS válido", "error");
            return;
        }
        setGuardandoJus(true);
        const hoy = new Date().toISOString().split("T")[0];
        try {
            const [r1, r2] = await Promise.all([
                fetch("/api/admin/config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ clave: "valorJus", valor: valorJus }),
                }),
                fetch("/api/admin/config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ clave: "valorJusActualizadoEn", valor: hoy }),
                }),
            ]);
            if (r1.ok && r2.ok) {
                setValorJusActualizadoEn(hoy);
                showToast("Valor JUS actualizado", "success");
            } else showToast("Error al guardar", "error");
        } catch { showToast("Error de conexión", "error"); }
        finally { setGuardandoJus(false); }
    }

    useEffect(() => {
        fetch("/api/admin/config/importar-tabs")
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.tabsActivas) setTabsActivas(data.tabsActivas);
            })
            .finally(() => setLoadingTabs(false));
    }, []);

    function toggleTab(id: string) {
        setTabsActivas(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    }

    async function guardarTabs() {
        setGuardandoTabs(true);
        try {
            const res = await fetch("/api/admin/config/importar-tabs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tabsActivas }),
            });
            if (res.ok) showToast("Configuración guardada", "success");
            else showToast("Error al guardar", "error");
        } catch { showToast("Error de conexión", "error"); }
        finally { setGuardandoTabs(false); }
    }

    async function handleVaciarDatos() {
        setBorrandoDatos(true);
        try {
            const res = await fetch("/api/admin/importar/matriculados", { method: "DELETE" });
            const data = await res.json();
            if (res.ok) {
                showToast(`Se eliminaron ${data.eliminados} registros de la tabla Datos.`, "success");
                setConfirmDatos(false);
            } else {
                showToast(data.error ?? "Error al eliminar", "error");
            }
        } catch { showToast("Error de conexión", "error"); }
        finally { setBorrandoDatos(false); }
    }

    return (
        <div className="p-6 md:p-10 max-w-2xl space-y-8">
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <ShieldAlert size={20} className="text-red-500" /> Configuración del Sistema
                </h1>
                <p className="text-[12px] text-slate-400 mt-1">Solo visible para superadministradores.</p>
            </div>

            {/* Calculadora de Intereses */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                    <Calculator size={14} className="text-slate-500" />
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">Calculadora de Intereses (Ley 27.802)</span>
                </div>
                <div className="px-5 py-5">
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">
                        Activa o desactiva la calculadora de intereses para créditos laborales judicializados visible en el dashboard de usuarios.
                    </p>
                    <button
                        onClick={async () => {
                            const nuevo = !calculadoraActiva;
                            setCalculadoraActiva(nuevo);
                            await guardarCalculadora(nuevo);
                        }}
                        disabled={guardandoCalc}
                        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-[13px] font-medium transition-all w-full sm:w-72
                            ${calculadoraActiva
                                ? "bg-[#063f68]/5 dark:bg-blue-900/20 border-[#063f68]/20 dark:border-blue-700 text-slate-700 dark:text-slate-200"
                                : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700 text-slate-400"}`}>
                        <span>{calculadoraActiva ? "Calculadora activa" : "Calculadora desactivada"}</span>
                        {guardandoCalc
                            ? <Loader2 size={18} className="animate-spin text-slate-400 shrink-0" />
                            : calculadoraActiva
                                ? <ToggleRight size={22} className="text-[#063f68] dark:text-blue-400 shrink-0" />
                                : <ToggleLeft size={22} className="text-slate-300 dark:text-slate-600 shrink-0" />}
                    </button>
                </div>
            </div>

            {/* Calculadora de Fechas */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                    <CalendarDays size={14} className="text-slate-500" />
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">Calculadora de Fechas</span>
                </div>
                <div className="px-5 py-5">
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">
                        Activa o desactiva la calculadora de días hábiles y corridos visible en el dashboard de usuarios.
                    </p>
                    <button
                        onClick={async () => {
                            const nuevo = !calculadoraFechasActiva;
                            setCalculadoraFechasActiva(nuevo);
                            await guardarCalculadoraFechas(nuevo);
                        }}
                        disabled={guardandoCalcFechas}
                        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-[13px] font-medium transition-all w-full sm:w-72
                            ${calculadoraFechasActiva
                                ? "bg-[#063f68]/5 dark:bg-blue-900/20 border-[#063f68]/20 dark:border-blue-700 text-slate-700 dark:text-slate-200"
                                : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700 text-slate-400"}`}>
                        <span>{calculadoraFechasActiva ? "Calculadora activa" : "Calculadora desactivada"}</span>
                        {guardandoCalcFechas
                            ? <Loader2 size={18} className="animate-spin text-slate-400 shrink-0" />
                            : calculadoraFechasActiva
                                ? <ToggleRight size={22} className="text-[#063f68] dark:text-blue-400 shrink-0" />
                                : <ToggleLeft size={22} className="text-slate-300 dark:text-slate-600 shrink-0" />}
                    </button>
                </div>
            </div>

            {/* Cálculo de Incapacidad */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                    <Scale size={14} className="text-slate-500" />
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">Cálculo de Incapacidad (Art. 1746 CCyC)</span>
                </div>
                <div className="px-5 py-5">
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">
                        Activa o desactiva la calculadora de indemnización por incapacidad con ingreso variable probable (fórmula Acciarri).
                    </p>
                    <button
                        onClick={async () => {
                            const nuevo = !calculadoraIncapacidadActiva;
                            setCalculadoraIncapacidadActiva(nuevo);
                            await guardarCalculadoraIncapacidad(nuevo);
                        }}
                        disabled={guardandoCalcIncap}
                        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-[13px] font-medium transition-all w-full sm:w-72
                            ${calculadoraIncapacidadActiva
                                ? "bg-[#063f68]/5 dark:bg-blue-900/20 border-[#063f68]/20 dark:border-blue-700 text-slate-700 dark:text-slate-200"
                                : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700 text-slate-400"}`}>
                        <span>{calculadoraIncapacidadActiva ? "Calculadora activa" : "Calculadora desactivada"}</span>
                        {guardandoCalcIncap
                            ? <Loader2 size={18} className="animate-spin text-slate-400 shrink-0" />
                            : calculadoraIncapacidadActiva
                                ? <ToggleRight size={22} className="text-[#063f68] dark:text-blue-400 shrink-0" />
                                : <ToggleLeft size={22} className="text-slate-300 dark:text-slate-600 shrink-0" />}
                    </button>
                </div>
            </div>

            {/* Cómputo de Penas */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                    <Gavel size={14} className="text-slate-500" />
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">Cómputo de Penas (Ley 24.660 / 27.375)</span>
                </div>
                <div className="px-5 py-5">
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">
                        Activa o desactiva la calculadora de vencimiento de pena, salidas transitorias, libertad condicional y libertad asistida.
                    </p>
                    <button
                        onClick={async () => {
                            const nuevo = !calculadoraPenasActiva;
                            setCalculadoraPenasActiva(nuevo);
                            await guardarCalculadoraPenas(nuevo);
                        }}
                        disabled={guardandoCalcPenas}
                        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-[13px] font-medium transition-all w-full sm:w-72
                            ${calculadoraPenasActiva
                                ? "bg-[#063f68]/5 dark:bg-blue-900/20 border-[#063f68]/20 dark:border-blue-700 text-slate-700 dark:text-slate-200"
                                : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700 text-slate-400"}`}>
                        <span>{calculadoraPenasActiva ? "Calculadora activa" : "Calculadora desactivada"}</span>
                        {guardandoCalcPenas
                            ? <Loader2 size={18} className="animate-spin text-slate-400 shrink-0" />
                            : calculadoraPenasActiva
                                ? <ToggleRight size={22} className="text-[#063f68] dark:text-blue-400 shrink-0" />
                                : <ToggleLeft size={22} className="text-slate-300 dark:text-slate-600 shrink-0" />}
                    </button>
                </div>
            </div>

            {/* Calculadora de Honorarios */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                    <Banknote size={14} className="text-slate-500" />
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">Calculadora de Honorarios (Ley 6767 / 12.851)</span>
                </div>
                <div className="px-5 py-5 space-y-5">
                    <p className="text-[12px] text-slate-500 dark:text-slate-400">
                        Activa o desactiva la calculadora de honorarios profesionales. El valor JUS se actualiza manualmente a continuación.
                    </p>
                    <button
                        onClick={async () => {
                            const nuevo = !calculadoraHonorariosActiva;
                            setCalculadoraHonorariosActiva(nuevo);
                            await guardarCalculadoraHonorarios(nuevo);
                        }}
                        disabled={guardandoCalcHonorarios}
                        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-[13px] font-medium transition-all w-full sm:w-72
                            ${calculadoraHonorariosActiva
                                ? "bg-[#063f68]/5 dark:bg-blue-900/20 border-[#063f68]/20 dark:border-blue-700 text-slate-700 dark:text-slate-200"
                                : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700 text-slate-400"}`}>
                        <span>{calculadoraHonorariosActiva ? "Calculadora activa" : "Calculadora desactivada"}</span>
                        {guardandoCalcHonorarios
                            ? <Loader2 size={18} className="animate-spin text-slate-400 shrink-0" />
                            : calculadoraHonorariosActiva
                                ? <ToggleRight size={22} className="text-[#063f68] dark:text-blue-400 shrink-0" />
                                : <ToggleLeft size={22} className="text-slate-300 dark:text-slate-600 shrink-0" />}
                    </button>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Valor JUS actual</p>
                        {valorJusActualizadoEn && (
                            <p className="text-[11px] text-slate-400">Última actualización: {valorJusActualizadoEn}</p>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 max-w-[220px]">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-slate-400 font-semibold">$</span>
                                <input
                                    type="text"
                                    value={valorJus}
                                    onChange={e => setValorJus(e.target.value)}
                                    placeholder="136317.62"
                                    className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                                />
                            </div>
                            <button
                                onClick={guardarValorJus}
                                disabled={guardandoJus}
                                className="flex items-center gap-1.5 px-4 h-10 bg-[#063f68] text-white rounded-xl text-[12px] font-bold hover:bg-[#052d4a] disabled:opacity-40 transition-all">
                                {guardandoJus ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                {guardandoJus ? "Guardando..." : "Guardar JUS"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pestañas activas en Importar */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                    <Settings2 size={14} className="text-slate-500" />
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">Pestañas activas en Importar Datos</span>
                </div>
                <div className="px-5 py-5 space-y-4">
                    <p className="text-[12px] text-slate-500 dark:text-slate-400">
                        Elegí qué pestañas son visibles en la sección Importar Datos. La pestaña "Registros" siempre está activa.
                    </p>
                    {loadingTabs ? (
                        <div className="flex items-center gap-2 text-slate-400"><Loader2 size={14} className="animate-spin" /> Cargando...</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {IMPORTAR_TABS.map(tab => {
                                const activa = tabsActivas.includes(tab.id);
                                return (
                                    <button key={tab.id} onClick={() => toggleTab(tab.id)}
                                        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-[13px] font-medium transition-all
                                            ${activa
                                                ? "bg-[#063f68]/5 dark:bg-blue-900/20 border-[#063f68]/20 dark:border-blue-700 text-slate-700 dark:text-slate-200"
                                                : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700 text-slate-400"}`}>
                                        <span>{tab.label}</span>
                                        {activa
                                            ? <ToggleRight size={20} className="text-[#063f68] dark:text-blue-400 shrink-0" />
                                            : <ToggleLeft size={20} className="text-slate-300 dark:text-slate-600 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="flex justify-end pt-1">
                        <button onClick={guardarTabs} disabled={guardandoTabs || loadingTabs}
                            className="flex items-center gap-1.5 px-5 h-9 bg-[#063f68] text-white rounded-xl text-[12px] font-bold hover:bg-[#052d4a] disabled:opacity-40 transition-all">
                            {guardandoTabs ? <Loader2 size={13} className="animate-spin" /> : <Settings2 size={13} />}
                            {guardandoTabs ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Zona de peligro */}
            <div className="border border-red-200 dark:border-red-900/40 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-red-50 dark:bg-red-900/10 flex items-center gap-2 border-b border-red-100 dark:border-red-900/30">
                    <Trash2 size={14} className="text-red-500" />
                    <span className="text-[12px] font-bold text-red-700 dark:text-red-400">Vaciar tabla Datos (matriculados)</span>
                </div>
                <div className="px-5 py-5 space-y-4">
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Elimina <strong className="text-slate-700 dark:text-slate-200">todos</strong> los registros de la tabla <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">datos</code>. Esta acción <strong className="text-red-600">no se puede deshacer</strong>.
                    </p>
                    {!confirmDatos ? (
                        <button onClick={() => setConfirmDatos(true)}
                            className="flex items-center gap-2 px-4 h-9 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-[12px] font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all">
                            <Trash2 size={13} /> Vaciar tabla Datos
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[12px] font-bold text-red-600 dark:text-red-400">¿Confirmar? Esta acción no se puede deshacer.</span>
                            <button onClick={handleVaciarDatos} disabled={borrandoDatos}
                                className="flex items-center gap-1.5 px-4 h-9 bg-red-600 text-white rounded-xl text-[12px] font-bold hover:bg-red-700 disabled:opacity-50 transition-all">
                                {borrandoDatos ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                {borrandoDatos ? "Eliminando..." : "Sí, eliminar todo"}
                            </button>
                            <button onClick={() => setConfirmDatos(false)} className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors">
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
