"use client";

import { useState, useRef } from "react";
import { Upload, UserPlus, DollarSign, FileText, CheckCircle2, AlertCircle, X, ChevronDown, Loader2 } from "lucide-react";

type TipoFinanciero = "deudas" | "matriculaAnual" | "matriculaMensual" | "pagoAnual";

const FINANCIERO_CONFIG: Record<TipoFinanciero, { label: string; columnas: string[]; ejemplo: string }> = {
    deudas: {
        label: "Deudas",
        columnas: ["expediente", "monto"],
        ejemplo: "expediente,monto\n564,15000\n792,8500",
    },
    matriculaAnual: {
        label: "Matrícula Anual",
        columnas: ["expediente", "monto"],
        ejemplo: "expediente,monto\n564,48000\n792,48000",
    },
    matriculaMensual: {
        label: "Matrícula Mensual",
        columnas: ["expediente", "monto"],
        ejemplo: "expediente,monto\n564,4500\n792,4500",
    },
    pagoAnual: {
        label: "Pago Anual",
        columnas: ["expediente"],
        ejemplo: "expediente\n564\n792",
    },
};


function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
        return row;
    });
}

const PLANTILLA_CONTENT: Record<string, { filename: string; content: string }> = {
    matriculados: {
        filename: "plantilla_matriculados.csv",
        content: "expediente,cod,apellido,nombre,documento,tomo,folio,domicilioLegal,postalLegal,localidadLegal,telefonosLegal,emailLegal,domicilioReal,postalReal,localidadReal,provinciaReal,telefonosReal,emailReal,codMovilLegal,movilLegal,codMovilReal,movilReal,fechaMatriculacion\n564,564,GARCIA,JUAN,12345678,1,100,AV SAN MARTIN 123,3000,SANTA FE,0342-123456,juan@email.com,,,,,,,,,,,",
    },
    deudas: { filename: "plantilla_deudas.csv", content: "expediente,monto\n564,15000\n792,8500" },
    matriculaAnual: { filename: "plantilla_matricula_anual.csv", content: "expediente,monto\n564,48000\n792,48000" },
    matriculaMensual: { filename: "plantilla_matricula_mensual.csv", content: "expediente,monto\n564,4500\n792,4500" },
    pagoAnual: { filename: "plantilla_pago_anual.csv", content: "expediente\n564\n792" },
};


interface ResultadoImport {
    tipo: "success" | "error" | "warning";
    mensaje: string;
    detalles?: string[];
}

export default function ImportarPage() {
    const [seccion, setSeccion] = useState<"matriculados" | "financiero">("matriculados");
    async function downloadTemplate(tipo: string) {
        const p = PLANTILLA_CONTENT[tipo];
        if (!p) return;
        try {
            const res = await fetch(`/api/admin/importar/plantilla?tipo=${tipo}`);
            if (!res.ok) throw new Error("auth");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = p.filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            // fallback: contenido local
            const blob = new Blob(["\uFEFF" + p.content], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = p.filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }

    // Matriculados
    const [matRegistros, setMatRegistros] = useState<Record<string, string>[]>([]);
    const [matLoading, setMatLoading] = useState(false);
    const [matResultado, setMatResultado] = useState<ResultadoImport | null>(null);
    const matFileRef = useRef<HTMLInputElement>(null);

    // Financiero
    const [finTipo, setFinTipo] = useState<TipoFinanciero>("deudas");
    const [finRegistros, setFinRegistros] = useState<Record<string, string>[]>([]);
    const [finLoading, setFinLoading] = useState(false);
    const [finResultado, setFinResultado] = useState<ResultadoImport | null>(null);
    const finFileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        setRegistros: (r: Record<string, string>[]) => void,
        setResultado: (r: ResultadoImport | null) => void
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setResultado(null);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const rows = parseCSV(text);
            if (rows.length === 0) {
                setResultado({ tipo: "error", mensaje: "El archivo no tiene datos válidos o el formato es incorrecto." });
                return;
            }
            setRegistros(rows);
        };
        reader.readAsText(file);
    };

    const handleImportarMatriculados = async () => {
        setMatLoading(true);
        setMatResultado(null);
        try {
            const res = await fetch("/api/admin/importar/matriculados", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ registros: matRegistros }),
            });
            const data = await res.json();
            if (res.ok) {
                setMatResultado({
                    tipo: data.errores?.length > 0 ? "warning" : "success",
                    mensaje: `${data.creados} matriculado${data.creados !== 1 ? "s" : ""} creado${data.creados !== 1 ? "s" : ""}. ${data.omitidos} omitido${data.omitidos !== 1 ? "s" : ""} (ya existían o errores).`,
                    detalles: data.errores,
                });
                if (data.creados > 0) { setMatRegistros([]); if (matFileRef.current) matFileRef.current.value = ""; }
            } else {
                setMatResultado({ tipo: "error", mensaje: data.error ?? "Error al importar" });
            }
        } catch {
            setMatResultado({ tipo: "error", mensaje: "Error de conexión" });
        } finally {
            setMatLoading(false);
        }
    };

    const handleImportarFinanciero = async () => {
        setFinLoading(true);
        setFinResultado(null);
        try {
            const res = await fetch("/api/admin/importar/financiero", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tipo: finTipo, registros: finRegistros }),
            });
            const data = await res.json();
            if (res.ok) {
                setFinResultado({
                    tipo: "success",
                    mensaje: `${data.actualizados} registro${data.actualizados !== 1 ? "s" : ""} actualizado${data.actualizados !== 1 ? "s" : ""} en ${FINANCIERO_CONFIG[finTipo].label}.`,
                });
                setFinRegistros([]);
                if (finFileRef.current) finFileRef.current.value = "";
            } else {
                setFinResultado({ tipo: "error", mensaje: data.error ?? "Error al importar" });
            }
        } catch {
            setFinResultado({ tipo: "error", mensaje: "Error de conexión" });
        } finally {
            setFinLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                    <Upload size={20} className="text-cyan-500" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Importar Datos</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Carga masiva de matriculados y datos financieros desde CSV</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-0">
                <button
                    onClick={() => setSeccion("matriculados")}
                    className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-t-xl transition-all border-b-2 -mb-px ${seccion === "matriculados"
                        ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-900/10"
                        : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                    <UserPlus size={15} />
                    Nuevos Matriculados
                </button>
                <button
                    onClick={() => setSeccion("financiero")}
                    className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-t-xl transition-all border-b-2 -mb-px ${seccion === "financiero"
                        ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10"
                        : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                    <DollarSign size={15} />
                    Deudas y Matrículas
                </button>
            </div>

            {/* SECCIÓN: MATRICULADOS */}
            {seccion === "matriculados" && (
                <div className="space-y-5">
                    <div className="p-5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-900/10 border border-cyan-100 dark:border-cyan-900/30">
                        <p className="text-[13px] font-bold text-cyan-800 dark:text-cyan-400 mb-1">¿Cómo funciona?</p>
                        <p className="text-[12px] text-cyan-700/70 dark:text-cyan-400/60 leading-relaxed">
                            Subí un CSV con los nuevos matriculados. Si el expediente ya existe en el sistema, la fila se omite. Los nuevos se agregan al padrón para que puedan registrarse en el portal.
                        </p>
                        <button
                            onClick={() => downloadTemplate("matriculados")}
                            className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                        >
                            <FileText size={12} /> Descargar plantilla CSV
                        </button>
                    </div>

                    {/* Upload */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Archivo CSV</label>
                        <div className="relative">
                            <input
                                ref={matFileRef}
                                type="file"
                                accept=".csv,text/csv"
                                onChange={e => handleFileChange(e, setMatRegistros, setMatResultado)}
                                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                            />
                            <div className={`h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${matRegistros.length > 0 ? "border-cyan-300 dark:border-cyan-700 bg-cyan-50/30 dark:bg-cyan-900/10" : "border-slate-200 dark:border-slate-700"}`}>
                                <Upload size={22} className={matRegistros.length > 0 ? "text-cyan-500" : "text-slate-300"} />
                                <p className="text-[12px] font-bold text-slate-400">
                                    {matRegistros.length > 0
                                        ? `${matRegistros.length} registro${matRegistros.length !== 1 ? "s" : ""} cargado${matRegistros.length !== 1 ? "s" : ""}`
                                        : "Hacé clic o arrastrá el archivo CSV"}
                                </p>
                            </div>
                        </div>

                        {/* Preview */}
                        {matRegistros.length > 0 && (
                            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                <table className="w-full text-[11px]">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            {Object.keys(matRegistros[0]).map(h => (
                                                <th key={h} className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                        {matRegistros.slice(0, 5).map((row, i) => (
                                            <tr key={i}>
                                                {Object.values(row).map((v, j) => (
                                                    <td key={j} className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[120px] truncate">{v || "—"}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {matRegistros.length > 5 && (
                                    <p className="text-center text-[11px] text-slate-400 py-2">... y {matRegistros.length - 5} más</p>
                                )}
                            </div>
                        )}

                        {matResultado && <Resultado resultado={matResultado} onClose={() => setMatResultado(null)} />}

                        <div className="flex items-center justify-between pt-2">
                            {matRegistros.length > 0 && (
                                <button onClick={() => { setMatRegistros([]); if (matFileRef.current) matFileRef.current.value = ""; }} className="text-[12px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                    <X size={13} /> Limpiar
                                </button>
                            )}
                            <button
                                onClick={handleImportarMatriculados}
                                disabled={matRegistros.length === 0 || matLoading}
                                className="ml-auto flex items-center gap-2 px-6 h-10 bg-cyan-500 text-white rounded-xl text-[13px] font-bold hover:bg-cyan-600 disabled:opacity-40 transition-all active:scale-95"
                            >
                                {matLoading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                                {matLoading ? "Importando..." : `Importar ${matRegistros.length > 0 ? matRegistros.length + " registros" : ""}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SECCIÓN: FINANCIERO */}
            {seccion === "financiero" && (
                <div className="space-y-5">
                    <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                        <p className="text-[13px] font-bold text-emerald-800 dark:text-emerald-400 mb-1">¿Cómo funciona?</p>
                        <p className="text-[12px] text-emerald-700/70 dark:text-emerald-400/60 leading-relaxed">
                            Seleccioná el tipo de dato a actualizar y subí el CSV. Los registros existentes para los expedientes del archivo se reemplazan con los nuevos valores.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">

                        {/* Selector de tipo */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tipo de dato</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {(Object.keys(FINANCIERO_CONFIG) as TipoFinanciero[]).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => { setFinTipo(t); setFinRegistros([]); setFinResultado(null); if (finFileRef.current) finFileRef.current.value = ""; }}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${finTipo === t
                                            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
                                            : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"}`}
                                    >
                                        <p className={`text-[12px] font-bold ${finTipo === t ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>
                                            {FINANCIERO_CONFIG[t].label}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{FINANCIERO_CONFIG[t].columnas.join(", ")}</p>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => downloadTemplate(finTipo)}
                                className="inline-flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-1"
                            >
                                <FileText size={12} /> Descargar plantilla — {FINANCIERO_CONFIG[finTipo].label}
                            </button>
                        </div>

                        {/* Upload */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Archivo CSV</label>
                            <div className="relative">
                                <input
                                    ref={finFileRef}
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={e => handleFileChange(e, setFinRegistros, setFinResultado)}
                                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                />
                                <div className={`h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${finRegistros.length > 0 ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/30" : "border-slate-200 dark:border-slate-700"}`}>
                                    <Upload size={20} className={finRegistros.length > 0 ? "text-emerald-500" : "text-slate-300"} />
                                    <p className="text-[12px] font-bold text-slate-400">
                                        {finRegistros.length > 0
                                            ? `${finRegistros.length} registro${finRegistros.length !== 1 ? "s" : ""} cargado${finRegistros.length !== 1 ? "s" : ""}`
                                            : "Hacé clic o arrastrá el archivo CSV"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Preview */}
                        {finRegistros.length > 0 && (
                            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                <table className="w-full text-[11px]">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            {Object.keys(finRegistros[0]).map(h => (
                                                <th key={h} className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                        {finRegistros.slice(0, 5).map((row, i) => (
                                            <tr key={i}>
                                                {Object.values(row).map((v, j) => (
                                                    <td key={j} className="px-3 py-2 text-slate-600 dark:text-slate-400">{v || "—"}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {finRegistros.length > 5 && (
                                    <p className="text-center text-[11px] text-slate-400 py-2">... y {finRegistros.length - 5} más</p>
                                )}
                            </div>
                        )}

                        {finResultado && <Resultado resultado={finResultado} onClose={() => setFinResultado(null)} />}

                        <div className="flex items-center justify-between pt-2">
                            {finRegistros.length > 0 && (
                                <button onClick={() => { setFinRegistros([]); if (finFileRef.current) finFileRef.current.value = ""; }} className="text-[12px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                    <X size={13} /> Limpiar
                                </button>
                            )}
                            <button
                                onClick={handleImportarFinanciero}
                                disabled={finRegistros.length === 0 || finLoading}
                                className="ml-auto flex items-center gap-2 px-6 h-10 bg-emerald-500 text-white rounded-xl text-[13px] font-bold hover:bg-emerald-600 disabled:opacity-40 transition-all active:scale-95"
                            >
                                {finLoading ? <Loader2 size={15} className="animate-spin" /> : <DollarSign size={15} />}
                                {finLoading ? "Actualizando..." : `Actualizar ${finRegistros.length > 0 ? finRegistros.length + " registros" : ""}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Resultado({ resultado, onClose }: { resultado: { tipo: string; mensaje: string; detalles?: string[] }; onClose: () => void }) {
    const styles = {
        success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400",
        error: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400",
        warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400",
    };
    const icons = { success: CheckCircle2, error: AlertCircle, warning: AlertCircle };
    const Icon = icons[resultado.tipo as keyof typeof icons] ?? CheckCircle2;
    return (
        <div className={`p-4 rounded-xl border flex flex-col gap-2 ${styles[resultado.tipo as keyof typeof styles]}`}>
            <div className="flex items-center gap-2">
                <Icon size={16} />
                <span className="text-[13px] font-bold flex-1">{resultado.mensaje}</span>
                <button onClick={onClose}><X size={14} /></button>
            </div>
            {resultado.detalles && resultado.detalles.length > 0 && (
                <ul className="text-[11px] space-y-0.5 pl-5 list-disc opacity-80">
                    {resultado.detalles.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
            )}
        </div>
    );
}
