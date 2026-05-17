"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, UserPlus, DollarSign, FileText, CheckCircle2, AlertCircle, X, Loader2, List, Search, CreditCard, Ban, Clock, Landmark, HandshakeIcon, KeyRound, Banknote, ShieldOff, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

type TipoFinanciero = "deudas" | "pagoAnual" | "consultor";
type Seccion = "matriculados" | "financiero" | "banelco" | "registros" | "fiadores" | "usuarios" | "adhesiones" | "suspensiones";

const FINANCIERO_CONFIG: Record<TipoFinanciero, { label: string; columnas: string[]; ejemplo: string }> = {
    deudas: { label: "Deudas", columnas: ["expediente", "monto"], ejemplo: "expediente,monto\n564,15000\n792,8500" },
    pagoAnual: { label: "Pago Anual", columnas: ["expediente"], ejemplo: "expediente\n564\n792" },
    consultor: { label: "Consultores", columnas: ["expediente"], ejemplo: "expediente\n564\n792" },
};

const PLANTILLA_CONTENT: Record<string, { filename: string; content: string }> = {
    matriculados: {
        filename: "plantilla_matriculados.csv",
        content: "expediente,cod,apellido,nombre,documento,tomo,folio,domicilioLegal,postalLegal,localidadLegal,telefonosLegal,emailLegal,domicilioReal,postalReal,localidadReal,provinciaReal,telefonosReal,emailReal,codMovilLegal,movilLegal,codMovilReal,movilReal,fechaMatriculacion\n564,564,GARCIA,JUAN,12345678,1,100,AV SAN MARTIN 123,3000,SANTA FE,0342-123456,juan@email.com,,,,,,,,,,,",
    },
    deudas: { filename: "plantilla_deudas.csv", content: "expediente,monto\n564,15000\n792,8500" },
    pagoAnual: { filename: "plantilla_pago_anual.csv", content: "expediente\n564\n792" },
    consultor: { filename: "plantilla_consultores.csv", content: "expediente\n564\n792" },
};

interface ResultadoImport {
    tipo: "success" | "error" | "warning";
    mensaje: string;
    detalles?: string[];
}

interface RegistrosData {
    deudas: { id: number; expediente: string; monto: number }[];
    pagosAnuales: { id: number; expediente: string }[];
    adhesiones: { id: number; expediente: string; tipoAdhesion: string; estado: string; createdAt: string }[];
}

function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
    return lines.slice(1).map(line => {
        const values = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
        return row;
    });
}

function excelValToString(val: unknown): string {
    if (val instanceof Date) {
        // Con cellDates:true las celdas de fecha llegan como Date — formatear dd/mm/yyyy
        const d = val.getUTCDate().toString().padStart(2, "0");
        const m = (val.getUTCMonth() + 1).toString().padStart(2, "0");
        return `${d}/${m}/${val.getUTCFullYear()}`;
    }
    return String(val ?? "").trim();
}

function parseExcel(buffer: ArrayBuffer): Record<string, string>[] {
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    return rows.map(row => {
        const normalized: Record<string, string> = {};
        for (const key of Object.keys(row)) {
            normalized[key.toLowerCase().trim()] = excelValToString(row[key]);
        }
        return normalized;
    });
}

function getCurrentPeriodo() {
    return new Date().toISOString().slice(0, 7);
}

function formatPeriodo(p: string) {
    const [y, m] = p.split("-");
    return new Date(+y, +m - 1, 1)
        .toLocaleDateString("es-AR", { month: "long", year: "numeric" })
        .replace(/^\w/, c => c.toUpperCase());
}

export default function ImportarPage() {
    const [seccion, setSeccion] = useState<Seccion>("registros");
    const [periodo, setPeriodo] = useState(getCurrentPeriodo());

    function triggerDownload(url: string, filename: string) {
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
    }

    async function downloadTemplate(tipo: string) {
        const p = PLANTILLA_CONTENT[tipo];
        if (!p) return;
        try {
            const res = await fetch(`/api/admin/importar/plantilla?tipo=${tipo}`);
            if (!res.ok) throw new Error("auth");
            const blob = await res.blob();
            triggerDownload(URL.createObjectURL(blob), p.filename);
        } catch {
            const blob = new Blob(["﻿" + p.content], { type: "text/csv;charset=utf-8;" });
            triggerDownload(URL.createObjectURL(blob), p.filename);
        }
    }

    // Registros
    const [registros, setRegistros] = useState<RegistrosData | null>(null);
    const [registrosLoading, setRegistrosLoading] = useState(false);
    const [debitoSearch, setDebitoSearch] = useState("");
    const [deudasPage, setDeudasPage] = useState(0);
    const [pagosPage, setPagosPage] = useState(0);
    const PAGE_SIZE = 50;

    const cargarRegistros = async () => {
        setRegistrosLoading(true);
        setDeudasPage(0);
        setPagosPage(0);
        try {
            const res = await fetch("/api/admin/importar/registros");
            if (res.ok) setRegistros(await res.json());
        } finally {
            setRegistrosLoading(false);
        }
    };

    useEffect(() => {
        if (seccion === "registros" && !registros) cargarRegistros();
    }, [seccion]);

    useEffect(() => { cargarRegistros(); }, []);

    // Matriculados
    const [matRegistros, setMatRegistros] = useState<Record<string, string>[]>([]);
    const [matLoading, setMatLoading] = useState(false);
    const [matResultado, setMatResultado] = useState<ResultadoImport | null>(null);
    const [matModo, setMatModo] = useState<"crear" | "actualizar_fecha">("crear");
    const [matBorrarConfirm, setMatBorrarConfirm] = useState(false);
    const [matBorrandoLoading, setMatBorrandoLoading] = useState(false);
    const matFileRef = useRef<HTMLInputElement>(null);

    const handleBorrarDatos = async () => {
        setMatBorrandoLoading(true);
        try {
            const res = await fetch("/api/admin/importar/matriculados", { method: "DELETE" });
            const data = await res.json();
            if (res.ok) {
                setMatResultado({ tipo: "success", mensaje: `Se eliminaron ${data.eliminados} registros de la tabla Datos.` });
            } else {
                setMatResultado({ tipo: "error", mensaje: data.error ?? "Error al eliminar" });
            }
        } catch { setMatResultado({ tipo: "error", mensaje: "Error de conexión" }); }
        finally { setMatBorrandoLoading(false); setMatBorrarConfirm(false); }
    };

    // Financiero
    const [finTipo, setFinTipo] = useState<TipoFinanciero>("deudas");
    const [finRegistros, setFinRegistros] = useState<Record<string, string>[]>([]);
    const [finLoading, setFinLoading] = useState(false);
    const [finResultado, setFinResultado] = useState<ResultadoImport | null>(null);
    const finFileRef = useRef<HTMLInputElement>(null);

    // Banelco
    const [banTipo, setBanTipo] = useState<"cuota" | "deuda">("cuota");
    const [banRegistros, setBanRegistros] = useState<Record<string, string>[]>([]);
    const [banLoading, setBanLoading] = useState(false);
    const [banResultado, setBanResultado] = useState<ResultadoImport | null>(null);
    const banFileRef = useRef<HTMLInputElement>(null);

    // Adhesiones
    const [adhRegistros, setAdhRegistros] = useState<Record<string, string>[]>([]);
    const [adhLoading, setAdhLoading] = useState(false);
    const [adhResultado, setAdhResultado] = useState<ResultadoImport | null>(null);
    const adhFileRef = useRef<HTMLInputElement>(null);

    // Usuarios
    const [usrRegistros, setUsrRegistros] = useState<Record<string, string>[]>([]);
    const [usrLoading, setUsrLoading] = useState(false);
    const [usrResultado, setUsrResultado] = useState<ResultadoImport | null>(null);
    const usrFileRef = useRef<HTMLInputElement>(null);

    // Suspensiones
    const [suspRegistros, setSuspRegistros] = useState<Record<string, string>[]>([]);
    const [suspLoading, setSuspLoading] = useState(false);
    const [suspResultado, setSuspResultado] = useState<ResultadoImport | null>(null);
    const suspFileRef = useRef<HTMLInputElement>(null);

    // Fiadores
    const [fiadRegistros, setFiadRegistros] = useState<Record<string, string>[]>([]);
    const [fiadLoading, setFiadLoading] = useState(false);
    const [fiadResultado, setFiadResultado] = useState<ResultadoImport | null>(null);
    const fiadFileRef = useRef<HTMLInputElement>(null);

    const handleCSVChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        setReg: (r: Record<string, string>[]) => void,
        setRes: (r: ResultadoImport | null) => void
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setRes(null);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const rows = parseCSV(ev.target?.result as string);
            if (rows.length === 0) { setRes({ tipo: "error", mensaje: "El archivo no tiene datos válidos." }); return; }
            setReg(rows);
        };
        reader.readAsText(file);
    };

    const handleExcelChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        setReg: (r: Record<string, string>[]) => void,
        setRes: (r: ResultadoImport | null) => void
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setRes(null);
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const rows = parseExcel(ev.target?.result as ArrayBuffer);
                if (rows.length === 0) { setRes({ tipo: "error", mensaje: "El archivo no tiene datos válidos." }); return; }
                setReg(rows);
            } catch {
                setRes({ tipo: "error", mensaje: "No se pudo leer el archivo Excel." });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImportarMatriculados = async () => {
        setMatLoading(true); setMatResultado(null);
        try {
            const res = await fetch("/api/admin/importar/matriculados", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ registros: matRegistros, modo: matModo }),
            });
            const data = await res.json();
            if (res.ok) {
                if (matModo === "actualizar_fecha") {
                    setMatResultado({
                        tipo: data.errores?.length > 0 ? "warning" : "success",
                        mensaje: `${data.actualizados} fecha${data.actualizados !== 1 ? "s" : ""} actualizada${data.actualizados !== 1 ? "s" : ""}. ${data.omitidos} sin fecha o sin registro.`,
                        detalles: data.errores,
                    });
                } else {
                    setMatResultado({
                        tipo: data.errores?.length > 0 ? "warning" : "success",
                        mensaje: `${data.creados} creado${data.creados !== 1 ? "s" : ""}. ${data.omitidos} omitido${data.omitidos !== 1 ? "s" : ""} (ya existían o errores).`,
                        detalles: data.errores,
                    });
                }
                if ((data.creados > 0 || data.actualizados > 0)) { setMatRegistros([]); if (matFileRef.current) matFileRef.current.value = ""; }
            } else {
                setMatResultado({ tipo: "error", mensaje: data.error ?? "Error al importar" });
            }
        } catch { setMatResultado({ tipo: "error", mensaje: "Error de conexión" }); }
        finally { setMatLoading(false); }
    };

    const handleImportarFinanciero = async () => {
        setFinLoading(true); setFinResultado(null);
        try {
            const res = await fetch("/api/admin/importar/financiero", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tipo: finTipo, registros: finRegistros }),
            });
            const data = await res.json();
            if (res.ok) {
                setFinResultado({ tipo: "success", mensaje: `${data.actualizados} registro${data.actualizados !== 1 ? "s" : ""} actualizado${data.actualizados !== 1 ? "s" : ""} en ${FINANCIERO_CONFIG[finTipo].label}.` });
                setFinRegistros([]); if (finFileRef.current) finFileRef.current.value = "";
            } else {
                setFinResultado({ tipo: "error", mensaje: data.error ?? "Error al importar" });
            }
        } catch { setFinResultado({ tipo: "error", mensaje: "Error de conexión" }); }
        finally { setFinLoading(false); }
    };

    const handleImportarAdhesiones = async () => {
        setAdhLoading(true); setAdhResultado(null);
        try {
            const res = await fetch("/api/admin/importar/adhesiones", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ registros: adhRegistros }),
            });
            const data = await res.json();
            if (res.ok) {
                setAdhResultado({
                    tipo: data.errores?.length > 0 ? "warning" : "success",
                    mensaje: `${data.creados} adhesión${data.creados !== 1 ? "es" : ""} importada${data.creados !== 1 ? "s" : ""}. ${data.omitidos} ya existían.`,
                    detalles: data.errores,
                });
                if (data.creados > 0) { setAdhRegistros([]); if (adhFileRef.current) adhFileRef.current.value = ""; }
            } else {
                setAdhResultado({ tipo: "error", mensaje: data.error ?? "Error al importar" });
            }
        } catch { setAdhResultado({ tipo: "error", mensaje: "Error de conexión" }); }
        finally { setAdhLoading(false); }
    };

    const handleImportarUsuarios = async () => {
        setUsrLoading(true); setUsrResultado(null);
        try {
            const res = await fetch("/api/admin/importar/users", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ registros: usrRegistros }),
            });
            const data = await res.json();
            if (res.ok) {
                setUsrResultado({
                    tipo: data.errores?.length > 0 ? "warning" : "success",
                    mensaje: `${data.creados} cuenta${data.creados !== 1 ? "s" : ""} creada${data.creados !== 1 ? "s" : ""}. ${data.omitidos} ya tenían cuenta.`,
                    detalles: data.errores,
                });
                if (data.creados > 0) { setUsrRegistros([]); if (usrFileRef.current) usrFileRef.current.value = ""; }
            } else {
                setUsrResultado({ tipo: "error", mensaje: data.error ?? "Error al importar" });
            }
        } catch { setUsrResultado({ tipo: "error", mensaje: "Error de conexión" }); }
        finally { setUsrLoading(false); }
    };

    const handleImportarFiadores = async () => {
        setFiadLoading(true); setFiadResultado(null);
        try {
            const res = await fetch("/api/admin/fiadores/import", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ registros: fiadRegistros }),
            });
            const data = await res.json();
            if (res.ok) {
                const partes = [];
                if (data.creados > 0) partes.push(`${data.creados} nuevo${data.creados !== 1 ? "s" : ""}`);
                if (data.reemplazados > 0) partes.push(`${data.reemplazados} reemplazado${data.reemplazados !== 1 ? "s" : ""}`);
                if (data.omitidos > 0) partes.push(`${data.omitidos} omitido${data.omitidos !== 1 ? "s" : ""} (sin cambios)`);
                setFiadResultado({
                    tipo: data.errores?.length > 0 ? "warning" : "success",
                    mensaje: partes.length > 0 ? partes.join(", ") + "." : "Sin cambios.",
                    detalles: data.errores,
                });
                if (data.creados > 0 || data.reemplazados > 0) {
                    setFiadRegistros([]);
                    if (fiadFileRef.current) fiadFileRef.current.value = "";
                }
            } else {
                setFiadResultado({ tipo: "error", mensaje: data.error ?? "Error al importar" });
            }
        } catch { setFiadResultado({ tipo: "error", mensaje: "Error de conexión" }); }
        finally { setFiadLoading(false); }
    };

    const [banDuplicados, setBanDuplicados] = useState<{ cliente: string; expediente: string; comprobante: string }[]>([]);

    const handleImportarBanelco = async () => {
        setBanLoading(true); setBanResultado(null); setBanDuplicados([]);
        try {
            const url = banTipo === "deuda" ? "/api/admin/importar/banelco-deuda" : "/api/admin/importar/banelco";
            const res = await fetch(url, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ registros: banRegistros }),
            });
            const data = await res.json();
            if (res.ok) {
                if (banTipo === "deuda") {
                    const partes = [`${data.procesados} pago${data.procesados !== 1 ? "s" : ""} de deuda registrado${data.procesados !== 1 ? "s" : ""} vía Banelco.`];
                    if (data.sinExpediente > 0) partes.push(`${data.sinExpediente} sin expediente.`);
                    if (data.sinDeuda > 0) partes.push(`${data.sinDeuda} sin deuda registrada.`);
                    setBanResultado({
                        tipo: data.errores?.length > 0 ? "warning" : "success",
                        mensaje: partes.join(" "),
                        detalles: data.errores,
                    });
                    if (data.procesados > 0) { setBanRegistros([]); if (banFileRef.current) banFileRef.current.value = ""; }
                } else {
                    const partes = [`${data.pagados} cuota${data.pagados !== 1 ? "s" : ""} marcada${data.pagados !== 1 ? "s" : ""} como pagadas vía Banelco.`];
                    if (data.duplicados?.length > 0) partes.push(`${data.duplicados.length} posible${data.duplicados.length !== 1 ? "s" : ""} doble pago.`);
                    if (data.sinExpediente > 0) partes.push(`${data.sinExpediente} sin expediente.`);
                    if (data.sinCuota > 0) partes.push(`${data.sinCuota} sin cuota generada.`);
                    setBanResultado({
                        tipo: data.duplicados?.length > 0 ? "warning" : (data.errores?.length > 0 ? "warning" : "success"),
                        mensaje: partes.join(" "),
                        detalles: data.errores,
                    });
                    if (data.duplicados?.length > 0) setBanDuplicados(data.duplicados);
                    if (data.pagados > 0) { setBanRegistros([]); if (banFileRef.current) banFileRef.current.value = ""; }
                }
            } else {
                setBanResultado({ tipo: "error", mensaje: data.error ?? "Error al importar" });
            }
        } catch { setBanResultado({ tipo: "error", mensaje: "Error de conexión" }); }
        finally { setBanLoading(false); }
    };

    const handleImportarSuspensiones = async () => {
        setSuspLoading(true); setSuspResultado(null);
        try {
            const res = await fetch("/api/admin/importar/suspensiones", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ registros: suspRegistros }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuspResultado({
                    tipo: data.errores?.length > 0 ? "warning" : "success",
                    mensaje: `${data.procesados} suspensión${data.procesados !== 1 ? "es" : ""} aplicada${data.procesados !== 1 ? "s" : ""}. ${data.omitidos} sin cuenta de usuario.`,
                    detalles: data.errores,
                });
                if (data.procesados > 0) { setSuspRegistros([]); if (suspFileRef.current) suspFileRef.current.value = ""; }
            } else {
                setSuspResultado({ tipo: "error", mensaje: data.error ?? "Error al importar" });
            }
        } catch { setSuspResultado({ tipo: "error", mensaje: "Error de conexión" }); }
        finally { setSuspLoading(false); }
    };

    const tabs: { id: Seccion; label: string; icon: React.ReactNode; color: string; activeColor: string }[] = [
        { id: "registros", label: "Registros", icon: <List size={15} />, color: "text-violet-600 dark:text-violet-400", activeColor: "border-violet-500 bg-violet-50/50 dark:bg-violet-900/10" },
        { id: "matriculados", label: "Matriculados", icon: <UserPlus size={15} />, color: "text-cyan-600 dark:text-cyan-400", activeColor: "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-900/10" },
        { id: "financiero", label: "Financiero", icon: <DollarSign size={15} />, color: "text-emerald-600 dark:text-emerald-400", activeColor: "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10" },
        { id: "banelco", label: "Home Banking", icon: <Landmark size={15} />, color: "text-blue-600 dark:text-blue-400", activeColor: "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10" },
        { id: "fiadores", label: "Fiadores", icon: <HandshakeIcon size={15} />, color: "text-orange-600 dark:text-orange-400", activeColor: "border-orange-500 bg-orange-50/50 dark:bg-orange-900/10" },
        { id: "adhesiones", label: "Débito Aut.", icon: <Banknote size={15} />, color: "text-teal-600 dark:text-teal-400", activeColor: "border-teal-500 bg-teal-50/50 dark:bg-teal-900/10" },
        { id: "usuarios", label: "Usuarios", icon: <KeyRound size={15} />, color: "text-purple-600 dark:text-purple-400", activeColor: "border-purple-500 bg-purple-50/50 dark:bg-purple-900/10" },
        { id: "suspensiones", label: "Suspensiones", icon: <ShieldOff size={15} />, color: "text-rose-600 dark:text-rose-400", activeColor: "border-rose-500 bg-rose-50/50 dark:bg-rose-900/10" },
    ];

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                    <Upload size={20} className="text-cyan-500" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Importar Datos</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Carga masiva de matriculados, datos financieros y pagos desde archivos</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-0 overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setSeccion(t.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-t-xl transition-all border-b-2 -mb-px whitespace-nowrap
                            ${seccion === t.id ? `${t.activeColor} ${t.color}` : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            {/* MATRICULADOS */}
            {seccion === "matriculados" && (
                <div className="space-y-5">
                    <div className="p-5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-900/10 border border-cyan-100 dark:border-cyan-900/30">
                        <p className="text-[13px] font-bold text-cyan-800 dark:text-cyan-400 mb-1">¿Cómo funciona?</p>
                        <p className="text-[12px] text-cyan-700/70 dark:text-cyan-400/60 leading-relaxed">
                            Subí un CSV con los nuevos matriculados. Si el expediente ya existe, la fila se omite.
                        </p>
                        <button onClick={() => downloadTemplate("matriculados")} className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline">
                            <FileText size={12} /> Descargar plantilla CSV
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { key: "crear", label: "Crear nuevos", desc: "Agrega registros que no existen. Omite los que ya están." },
                            { key: "actualizar_fecha", label: "Actualizar fecha de matriculación", desc: "Solo pisa la fecha (fechaInscripcion / fechaMatriculacion) en registros existentes." },
                        ].map(opt => (
                            <button key={opt.key} onClick={() => { setMatModo(opt.key as typeof matModo); setMatRegistros([]); setMatResultado(null); if (matFileRef.current) matFileRef.current.value = ""; }}
                                className={`p-3 rounded-xl border-2 text-left transition-all ${matModo === opt.key ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-900/10" : "border-slate-100 dark:border-slate-800 hover:border-slate-200"}`}>
                                <p className={`text-[12px] font-bold ${matModo === opt.key ? "text-cyan-600 dark:text-cyan-400" : "text-slate-600 dark:text-slate-400"}`}>{opt.label}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                            </button>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Archivo CSV o Excel</label>
                        <UploadZone fileRef={matFileRef} hasData={matRegistros.length > 0} count={matRegistros.length}
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.name.match(/\.xlsx?$/i)) handleExcelChange(e, setMatRegistros, setMatResultado);
                                else handleCSVChange(e, setMatRegistros, setMatResultado);
                            }}
                            accept=".csv,.xlsx,.xls" color="cyan" label="Hacé clic o arrastrá el CSV o Excel" />
                        <PreviewTable rows={matRegistros} />
                        {matResultado && <Resultado resultado={matResultado} onClose={() => setMatResultado(null)} />}
                        <div className="flex items-center justify-between pt-2">
                            {matRegistros.length > 0 && (
                                <button onClick={() => { setMatRegistros([]); if (matFileRef.current) matFileRef.current.value = ""; }} className="text-[12px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                    <X size={13} /> Limpiar
                                </button>
                            )}
                            <button onClick={handleImportarMatriculados} disabled={matRegistros.length === 0 || matLoading}
                                className="ml-auto flex items-center gap-2 px-6 h-10 bg-cyan-500 text-white rounded-xl text-[13px] font-bold hover:bg-cyan-600 disabled:opacity-40 transition-all active:scale-95">
                                {matLoading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                                {matLoading ? "Procesando..." : matModo === "actualizar_fecha" ? `Actualizar fechas${matRegistros.length > 0 ? ` (${matRegistros.length})` : ""}` : `Importar${matRegistros.length > 0 ? ` ${matRegistros.length} registros` : ""}`}
                            </button>
                        </div>
                    </div>

                    {/* Zona de peligro */}
                    <div className="border border-red-100 dark:border-red-900/30 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 bg-red-50/50 dark:bg-red-900/10 flex items-center gap-2">
                            <Trash2 size={14} className="text-red-500" />
                            <span className="text-[12px] font-bold text-red-700 dark:text-red-400">Zona peligrosa</span>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">
                                Elimina <strong>todos</strong> los registros de la tabla Datos (matriculados). Esta acción es irreversible.
                            </p>
                            {!matBorrarConfirm ? (
                                <button onClick={() => setMatBorrarConfirm(true)}
                                    className="flex items-center gap-2 px-4 h-9 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-[12px] font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all">
                                    <Trash2 size={13} /> Vaciar tabla Datos
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-[12px] font-bold text-red-600 dark:text-red-400">¿Confirmar? Esta acción no se puede deshacer.</span>
                                    <button onClick={handleBorrarDatos} disabled={matBorrandoLoading}
                                        className="flex items-center gap-1.5 px-4 h-9 bg-red-600 text-white rounded-xl text-[12px] font-bold hover:bg-red-700 disabled:opacity-50 transition-all">
                                        {matBorrandoLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                        {matBorrandoLoading ? "Eliminando..." : "Sí, eliminar todo"}
                                    </button>
                                    <button onClick={() => setMatBorrarConfirm(false)} className="text-[12px] text-slate-400 hover:text-slate-600">
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FINANCIERO */}
            {seccion === "financiero" && (
                <div className="space-y-5">
                    <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                        <p className="text-[13px] font-bold text-emerald-800 dark:text-emerald-400 mb-1">¿Cómo funciona?</p>
                        <p className="text-[12px] text-emerald-700/70 dark:text-emerald-400/60 leading-relaxed">
                            Seleccioná el tipo de dato y subí el archivo. La tabla completa se reemplaza con los datos del archivo — los registros anteriores se borran y se cargan los nuevos.
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tipo de dato</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {(Object.keys(FINANCIERO_CONFIG) as TipoFinanciero[]).map(t => (
                                    <button key={t} onClick={() => { setFinTipo(t); setFinRegistros([]); setFinResultado(null); if (finFileRef.current) finFileRef.current.value = ""; }}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${finTipo === t ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-slate-100 dark:border-slate-800 hover:border-slate-200"}`}>
                                        <p className={`text-[12px] font-bold ${finTipo === t ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>{FINANCIERO_CONFIG[t].label}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{FINANCIERO_CONFIG[t].columnas.join(", ")}</p>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => downloadTemplate(finTipo)} className="inline-flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-1">
                                <FileText size={12} /> Descargar plantilla — {FINANCIERO_CONFIG[finTipo].label}
                            </button>
                        </div>
                        <UploadZone fileRef={finFileRef} hasData={finRegistros.length > 0} count={finRegistros.length}
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.name.match(/\.xlsx?$/i)) handleExcelChange(e, setFinRegistros, setFinResultado);
                                else handleCSVChange(e, setFinRegistros, setFinResultado);
                            }}
                            accept=".csv,.xlsx,.xls" color="emerald" label="Hacé clic o arrastrá el CSV o Excel" />
                        <PreviewTable rows={finRegistros} />
                        {finResultado && <Resultado resultado={finResultado} onClose={() => setFinResultado(null)} />}
                        <div className="flex items-center justify-between pt-2">
                            {finRegistros.length > 0 && (
                                <button onClick={() => { setFinRegistros([]); if (finFileRef.current) finFileRef.current.value = ""; }} className="text-[12px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                    <X size={13} /> Limpiar
                                </button>
                            )}
                            <button onClick={handleImportarFinanciero} disabled={finRegistros.length === 0 || finLoading}
                                className="ml-auto flex items-center gap-2 px-6 h-10 bg-emerald-500 text-white rounded-xl text-[13px] font-bold hover:bg-emerald-600 disabled:opacity-40 transition-all active:scale-95">
                                {finLoading ? <Loader2 size={15} className="animate-spin" /> : <DollarSign size={15} />}
                                {finLoading ? "Actualizando..." : `Actualizar${finRegistros.length > 0 ? ` ${finRegistros.length} registros` : ""}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BANELCO */}
            {seccion === "banelco" && (
                <div className="space-y-5">
                    {/* Selector tipo */}
                    <div className="flex gap-3">
                        {[
                            { key: "cuota", label: "Cuota Mensual", desc: "Marca la cuota del mes como pagada" },
                            { key: "deuda", label: "Pago de Deuda", desc: "Reduce o elimina la deuda del matriculado" },
                        ].map(opt => (
                            <button key={opt.key} onClick={() => { setBanTipo(opt.key as "cuota" | "deuda"); setBanRegistros([]); setBanResultado(null); setBanDuplicados([]); if (banFileRef.current) banFileRef.current.value = ""; }}
                                className={`flex-1 p-3 rounded-xl border-2 text-left transition-all ${banTipo === opt.key ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10" : "border-slate-100 dark:border-slate-800 hover:border-slate-200"}`}>
                                <p className={`text-[12px] font-bold ${banTipo === opt.key ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"}`}>{opt.label}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                            </button>
                        ))}
                    </div>

                    <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                        <p className="text-[13px] font-bold text-blue-800 dark:text-blue-400 mb-1">
                            {banTipo === "cuota" ? "Pagos por Banelco / Home Banking — Cuota Mensual" : "Pagos por Banelco / Home Banking — Deudas"}
                        </p>
                        <p className="text-[12px] text-blue-700/70 dark:text-blue-400/60 leading-relaxed">
                            {banTipo === "cuota"
                                ? <>Subí el Excel de cobranzas Banelco. El sistema usa la columna <strong>Cliente</strong> para identificar al matriculado y marca su cuota del <strong>mes actual</strong> como pagada.</>
                                : <>Subí el Excel de pagos de deuda. El sistema usa la columna <strong>Cliente</strong> (cod) y <strong>Importe</strong> para reducir o eliminar la deuda. Si el pago es total, la deuda queda en $0; si es parcial, se descuenta del saldo.</>
                            }
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                        <UploadZone fileRef={banFileRef} hasData={banRegistros.length > 0} count={banRegistros.length}
                            onChange={e => handleExcelChange(e, setBanRegistros, setBanResultado)}
                            accept=".xlsx,.xls,.csv" color="blue" label="Hacé clic o arrastrá el Excel de Banelco" />

                        {/* Preview */}
                        {banRegistros.length > 0 && (
                            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                <table className="w-full text-[11px]">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Nº</th>
                                            {Object.keys(banRegistros[0]).map(h => (
                                                <th key={h} className={`px-3 py-2 text-left font-bold uppercase tracking-wider whitespace-nowrap
                                                    ${["cliente", "Cliente"].includes(h) ? "text-blue-500" : "text-slate-400"}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                        {banRegistros.slice(0, 6).map((row, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                                                {Object.keys(row).map((k, j) => (
                                                    <td key={j} className={`px-3 py-2 whitespace-nowrap max-w-[150px] truncate
                                                        ${["cliente", "Cliente"].includes(k) ? "font-bold text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"}`}>
                                                        {row[k] || "—"}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {banRegistros.length > 6 && <p className="text-center text-[11px] text-slate-400 py-2">... y {banRegistros.length - 6} más</p>}
                            </div>
                        )}

                        {banResultado && <Resultado resultado={banResultado} onClose={() => { setBanResultado(null); setBanDuplicados([]); }} />}

                        {/* Alerta de dobles pagos */}
                        {banDuplicados.length > 0 && (
                            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
                                <p className="text-[12px] font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                                    <AlertCircle size={14} /> Posibles dobles pagos — estas cuotas ya estaban registradas como pagadas
                                </p>
                                <div className="overflow-x-auto rounded-lg border border-amber-100 dark:border-amber-900/40">
                                    <table className="w-full text-[11px]">
                                        <thead className="bg-amber-100/50 dark:bg-amber-900/30">
                                            <tr>
                                                {["Cliente", "Expediente", "Comprobante Banelco"].map(h => (
                                                    <th key={h} className="px-3 py-2 text-left font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-amber-50 dark:divide-amber-900/20">
                                            {banDuplicados.map((d, i) => (
                                                <tr key={i}>
                                                    <td className="px-3 py-2 font-bold text-amber-800 dark:text-amber-300">{d.cliente}</td>
                                                    <td className="px-3 py-2 text-amber-700 dark:text-amber-400">{d.expediente}</td>
                                                    <td className="px-3 py-2 font-mono text-amber-700 dark:text-amber-400">{d.comprobante || "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                            {banRegistros.length > 0 && (
                                <button onClick={() => { setBanRegistros([]); setBanDuplicados([]); if (banFileRef.current) banFileRef.current.value = ""; }}
                                    className="text-[12px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                    <X size={13} /> Limpiar
                                </button>
                            )}
                            <button onClick={handleImportarBanelco} disabled={banRegistros.length === 0 || banLoading}
                                className="ml-auto flex items-center gap-2 px-6 h-10 bg-blue-500 text-white rounded-xl text-[13px] font-bold hover:bg-blue-600 disabled:opacity-40 transition-all active:scale-95">
                                {banLoading ? <Loader2 size={15} className="animate-spin" /> : <Landmark size={15} />}
                                {banLoading ? "Procesando..." : `Procesar${banRegistros.length > 0 ? ` ${banRegistros.length} registros` : ""}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FIADORES */}
            {seccion === "fiadores" && (
                <div className="space-y-5">
                    <div className="p-5 rounded-2xl bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30">
                        <p className="text-[13px] font-bold text-orange-800 dark:text-orange-400 mb-1">¿Cómo funciona?</p>
                        <p className="text-[12px] text-orange-700/70 dark:text-orange-400/60 leading-relaxed">
                            Subí un CSV con columnas <strong>expediente</strong> y <strong>fiador</strong>. Si el expediente ya tiene fiador asignado, se reemplaza; si son iguales, se omite.
                            Los expedientes pueden no existir en el sistema (se guardan igualmente).
                        </p>
                        <button
                            onClick={() => {
                                const content = "expediente,fiador\n564,792\n831,1045";
                                const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
                                triggerDownload(URL.createObjectURL(blob), "plantilla_fiadores.csv");
                            }}
                            className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline"
                        >
                            <FileText size={12} /> Descargar plantilla CSV
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Archivo CSV</label>
                        <UploadZone fileRef={fiadFileRef} hasData={fiadRegistros.length > 0} count={fiadRegistros.length}
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.name.match(/\.xlsx?$/i)) handleExcelChange(e, setFiadRegistros, setFiadResultado);
                                else handleCSVChange(e, setFiadRegistros, setFiadResultado);
                            }}
                            accept=".csv,.xlsx,.xls" color="orange" label="Hacé clic o arrastrá el CSV o Excel" />
                        <PreviewTable rows={fiadRegistros} />
                        {fiadResultado && <Resultado resultado={fiadResultado} onClose={() => setFiadResultado(null)} />}
                        <div className="flex items-center justify-between pt-2">
                            {fiadRegistros.length > 0 && (
                                <button onClick={() => { setFiadRegistros([]); if (fiadFileRef.current) fiadFileRef.current.value = ""; }}
                                    className="text-[12px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                    <X size={13} /> Limpiar
                                </button>
                            )}
                            <button onClick={handleImportarFiadores} disabled={fiadRegistros.length === 0 || fiadLoading}
                                className="ml-auto flex items-center gap-2 px-6 h-10 bg-orange-500 text-white rounded-xl text-[13px] font-bold hover:bg-orange-600 disabled:opacity-40 transition-all active:scale-95">
                                {fiadLoading ? <Loader2 size={15} className="animate-spin" /> : <HandshakeIcon size={15} />}
                                {fiadLoading ? "Importando..." : `Importar${fiadRegistros.length > 0 ? ` ${fiadRegistros.length} registros` : ""}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADHESIONES */}
            {seccion === "adhesiones" && (
                <div className="space-y-5">
                    <div className="p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30">
                        <p className="text-[13px] font-bold text-teal-800 dark:text-teal-400 mb-1">¿Cómo funciona?</p>
                        <p className="text-[12px] text-teal-700/70 dark:text-teal-400/60 leading-relaxed">
                            Importá los expedientes adheridos al débito automático desde el sistema anterior.
                            El CSV solo necesita la columna <strong>expediente</strong>. Si no se indica tipo de adhesión, se registra como <strong>"Adherido sistema anterior"</strong>.
                            Los que ya tienen una adhesión aprobada se omiten. Se importan con estado <strong>aprobada</strong>.
                        </p>
                        <button
                            onClick={() => {
                                const content = "expediente,tipoAdhesion\n564,CBU\n792,Tarjeta\n831,";
                                const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
                                triggerDownload(URL.createObjectURL(blob), "plantilla_adhesiones.csv");
                            }}
                            className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                        >
                            <FileText size={12} /> Descargar plantilla CSV
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Archivo CSV o Excel</label>
                        <UploadZone fileRef={adhFileRef} hasData={adhRegistros.length > 0} count={adhRegistros.length}
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.name.match(/\.xlsx?$/i)) handleExcelChange(e, setAdhRegistros, setAdhResultado);
                                else handleCSVChange(e, setAdhRegistros, setAdhResultado);
                            }}
                            accept=".csv,.xlsx,.xls" color="teal" label="Hacé clic o arrastrá el CSV o Excel" />
                        <PreviewTable rows={adhRegistros} />
                        {adhResultado && <Resultado resultado={adhResultado} onClose={() => setAdhResultado(null)} />}
                        <div className="flex items-center justify-between pt-2">
                            {adhRegistros.length > 0 && (
                                <button onClick={() => { setAdhRegistros([]); if (adhFileRef.current) adhFileRef.current.value = ""; }}
                                    className="text-[12px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                    <X size={13} /> Limpiar
                                </button>
                            )}
                            <button onClick={handleImportarAdhesiones} disabled={adhRegistros.length === 0 || adhLoading}
                                className="ml-auto flex items-center gap-2 px-6 h-10 bg-teal-600 text-white rounded-xl text-[13px] font-bold hover:bg-teal-700 disabled:opacity-40 transition-all active:scale-95">
                                {adhLoading ? <Loader2 size={15} className="animate-spin" /> : <Banknote size={15} />}
                                {adhLoading ? "Importando..." : `Importar${adhRegistros.length > 0 ? ` ${adhRegistros.length} registros` : ""}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* USUARIOS */}
            {seccion === "usuarios" && (
                <div className="space-y-5">
                    <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                        <p className="text-[13px] font-bold text-purple-800 dark:text-purple-400 mb-1">¿Cómo funciona?</p>
                        <p className="text-[12px] text-purple-700/70 dark:text-purple-400/60 leading-relaxed">
                            Importá cuentas de usuarios desde el sistema anterior. El CSV debe tener la columna <strong>expediente</strong> y opcionalmente <strong>password</strong>.
                            Si no se indica contraseña, se usa el <strong>DNI del matriculado</strong> como contraseña por defecto.
                            El nombre y apellido se toman automáticamente desde los datos del matriculado.
                            Si el expediente ya tiene una cuenta, se omite.
                        </p>
                        <button
                            onClick={() => {
                                const content = "expediente,password\n564,miClave123\n792,";
                                const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
                                triggerDownload(URL.createObjectURL(blob), "plantilla_usuarios.csv");
                            }}
                            className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                        >
                            <FileText size={12} /> Descargar plantilla CSV
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Archivo CSV</label>
                        <UploadZone fileRef={usrFileRef} hasData={usrRegistros.length > 0} count={usrRegistros.length}
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.name.match(/\.xlsx?$/i)) handleExcelChange(e, setUsrRegistros, setUsrResultado);
                                else handleCSVChange(e, setUsrRegistros, setUsrResultado);
                            }}
                            accept=".csv,.xlsx,.xls" color="purple" label="Hacé clic o arrastrá el CSV o Excel" />
                        <PreviewTable rows={usrRegistros} />
                        {usrResultado && <Resultado resultado={usrResultado} onClose={() => setUsrResultado(null)} />}
                        <div className="flex items-center justify-between pt-2">
                            {usrRegistros.length > 0 && (
                                <button onClick={() => { setUsrRegistros([]); if (usrFileRef.current) usrFileRef.current.value = ""; }}
                                    className="text-[12px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                    <X size={13} /> Limpiar
                                </button>
                            )}
                            <button onClick={handleImportarUsuarios} disabled={usrRegistros.length === 0 || usrLoading}
                                className="ml-auto flex items-center gap-2 px-6 h-10 bg-purple-600 text-white rounded-xl text-[13px] font-bold hover:bg-purple-700 disabled:opacity-40 transition-all active:scale-95">
                                {usrLoading ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                                {usrLoading ? "Importando..." : `Importar${usrRegistros.length > 0 ? ` ${usrRegistros.length} registros` : ""}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REGISTROS */}
            {seccion === "registros" && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <p className="text-[12px] text-slate-400">Listado actual de registros en el sistema.</p>
                        <button onClick={cargarRegistros} disabled={registrosLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-all disabled:opacity-50">
                            {registrosLoading ? <Loader2 size={12} className="animate-spin" /> : null} Actualizar
                        </button>
                    </div>

                    {registrosLoading && !registros && (
                        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-violet-400" /></div>
                    )}

                    {registros && (
                        <div className="space-y-6">
                            {/* Deudas */}
                            <RegistroCard title="Deudas" count={registros.deudas.length} icon={<Ban size={13} className="text-red-500" />} color="red">
                                {registros.deudas.length === 0 ? <EmptyRow text="Sin deudas registradas" /> : (() => {
                                    const slice = registros.deudas.slice(deudasPage * PAGE_SIZE, (deudasPage + 1) * PAGE_SIZE);
                                    const totalPages = Math.ceil(registros.deudas.length / PAGE_SIZE);
                                    return <>
                                        <table className="w-full text-[12px]">
                                            <thead className="bg-slate-50 dark:bg-slate-800/40">
                                                <tr>
                                                    <th className="px-5 py-2.5 text-left font-bold text-slate-400 uppercase tracking-wider text-[10px]">Expediente</th>
                                                    <th className="px-5 py-2.5 text-right font-bold text-slate-400 uppercase tracking-wider text-[10px]">Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                                {slice.map(d => (
                                                    <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                                        <td className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-300">{d.expediente}</td>
                                                        <td className="px-5 py-2.5 text-right text-red-600 dark:text-red-400 font-bold">${d.monto.toLocaleString("es-AR")}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {totalPages > 1 && <Paginador page={deudasPage} total={totalPages} onChange={setDeudasPage} />}
                                    </>;
                                })()}
                            </RegistroCard>

                            {/* Pago Anual */}
                            <RegistroCard title="Pago Anual" count={registros.pagosAnuales.length} icon={<CheckCircle2 size={13} className="text-emerald-500" />} color="emerald">
                                {registros.pagosAnuales.length === 0 ? <EmptyRow text="Sin pagos anuales registrados" /> : (() => {
                                    const slice = registros.pagosAnuales.slice(pagosPage * PAGE_SIZE, (pagosPage + 1) * PAGE_SIZE);
                                    const totalPages = Math.ceil(registros.pagosAnuales.length / PAGE_SIZE);
                                    return <>
                                        <table className="w-full text-[12px]">
                                            <thead className="bg-slate-50 dark:bg-slate-800/40">
                                                <tr><th className="px-5 py-2.5 text-left font-bold text-slate-400 uppercase tracking-wider text-[10px]">Expediente</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                                {slice.map(p => (
                                                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                                        <td className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-300">{p.expediente}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {totalPages > 1 && <Paginador page={pagosPage} total={totalPages} onChange={setPagosPage} />}
                                    </>;
                                })()}
                            </RegistroCard>

                            {/* Débito Automático */}
                            <RegistroCard title="Débito Automático" count={registros.adhesiones.length} icon={<CreditCard size={13} className="text-blue-500" />} color="blue">
                                <div className="px-5 py-3 border-b border-slate-50 dark:border-slate-800/60">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Buscar por expediente..." value={debitoSearch} onChange={e => setDebitoSearch(e.target.value)}
                                            className="w-full pl-8 pr-4 py-2 text-[12px] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-300 text-slate-700 dark:text-slate-300 placeholder:text-slate-400" />
                                    </div>
                                </div>
                                {(() => {
                                    const filtered = debitoSearch.trim() ? registros.adhesiones.filter(a => a.expediente.includes(debitoSearch.trim())) : registros.adhesiones;
                                    return filtered.length === 0 ? <EmptyRow text={debitoSearch ? "Sin resultados" : "Sin adhesiones registradas"} /> : (
                                        <table className="w-full text-[12px]">
                                            <thead className="bg-slate-50 dark:bg-slate-800/40">
                                                <tr>
                                                    {["Expediente", "Tipo", "Estado", "Fecha"].map(h => (
                                                        <th key={h} className="px-5 py-2.5 text-left font-bold text-slate-400 uppercase tracking-wider text-[10px]">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                                {filtered.map(a => (
                                                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                                        <td className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-300">{a.expediente}</td>
                                                        <td className="px-5 py-2.5 text-slate-500 dark:text-slate-400">{a.tipoAdhesion}</td>
                                                        <td className="px-5 py-2.5">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${a.estado === "aprobada" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : a.estado === "rechazada" ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-amber-100 dark:bg-amber-900/30 text-amber-600"}`}>
                                                                {a.estado === "aprobada" ? <CheckCircle2 size={9} /> : a.estado === "rechazada" ? <Ban size={9} /> : <Clock size={9} />}
                                                                {a.estado.charAt(0).toUpperCase() + a.estado.slice(1)}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-2.5 text-slate-400">{new Date(a.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    );
                                })()}
                            </RegistroCard>
                        </div>
                    )}
                </div>
            )}

            {/* SUSPENSIONES */}
            {seccion === "suspensiones" && (
                <div className="space-y-5">
                    <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30">
                        <p className="text-[13px] font-bold text-rose-800 dark:text-rose-400 mb-1">¿Cómo funciona?</p>
                        <p className="text-[12px] text-rose-700/70 dark:text-rose-400/60 leading-relaxed">
                            Importá el estado de suspensiones desde el sistema anterior. El archivo debe tener las columnas <strong>expediente</strong>, <strong>accion</strong> y opcionalmente <strong>comentario</strong>.<br />
                            Acciones válidas: <strong>suspension</strong> · <strong>cancelacion</strong> · <strong>habilitacion</strong>.<br />
                            Cada fila aplica el estado al usuario y registra una entrada en el historial de matrícula.
                        </p>
                        <button
                            onClick={() => { window.open("/api/admin/importar/suspensiones", "_blank"); }}
                            className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                        >
                            <FileText size={12} /> Descargar plantilla CSV
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Archivo CSV o Excel</label>
                        <UploadZone fileRef={suspFileRef} hasData={suspRegistros.length > 0} count={suspRegistros.length}
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.name.match(/\.xlsx?$/i)) handleExcelChange(e, setSuspRegistros, setSuspResultado);
                                else handleCSVChange(e, setSuspRegistros, setSuspResultado);
                            }}
                            accept=".csv,.xlsx,.xls" color="rose" label="Hacé clic o arrastrá el CSV o Excel" />
                        <PreviewTable rows={suspRegistros} />
                        {suspResultado && <Resultado resultado={suspResultado} onClose={() => setSuspResultado(null)} />}
                        <div className="flex items-center justify-between pt-2">
                            {suspRegistros.length > 0 && (
                                <button onClick={() => { setSuspRegistros([]); if (suspFileRef.current) suspFileRef.current.value = ""; }}
                                    className="text-[12px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                    <X size={13} /> Limpiar
                                </button>
                            )}
                            <button onClick={handleImportarSuspensiones} disabled={suspRegistros.length === 0 || suspLoading}
                                className="ml-auto flex items-center gap-2 px-6 h-10 bg-rose-600 text-white rounded-xl text-[13px] font-bold hover:bg-rose-700 disabled:opacity-40 transition-all active:scale-95">
                                {suspLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldOff size={15} />}
                                {suspLoading ? "Aplicando..." : `Aplicar${suspRegistros.length > 0 ? ` ${suspRegistros.length} registros` : ""}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function UploadZone({ fileRef, hasData, count, onChange, accept, color, label }: {
    fileRef: React.RefObject<HTMLInputElement | null>;
    hasData: boolean; count: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    accept: string; color: string; label?: string;
}) {
    const borderActive = `border-${color}-300 dark:border-${color}-700 bg-${color}-50/30 dark:bg-${color}-900/10`;
    return (
        <div className="relative">
            <input ref={fileRef} type="file" accept={accept} onChange={onChange} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
            <div className={`h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${hasData ? borderActive : "border-slate-200 dark:border-slate-700"}`}>
                <Upload size={22} className={hasData ? `text-${color}-500` : "text-slate-300"} />
                <p className="text-[12px] font-bold text-slate-400">
                    {hasData ? `${count} registro${count !== 1 ? "s" : ""} cargado${count !== 1 ? "s" : ""}` : (label || "Hacé clic o arrastrá el archivo")}
                </p>
            </div>
        </div>
    );
}

function PreviewTable({ rows }: { rows: Record<string, string>[] }) {
    if (rows.length === 0) return null;
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>{Object.keys(rows[0]).map(h => <th key={h} className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {rows.slice(0, 5).map((row, i) => (
                        <tr key={i}>{Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[120px] truncate">{v || "—"}</td>)}</tr>
                    ))}
                </tbody>
            </table>
            {rows.length > 5 && <p className="text-center text-[11px] text-slate-400 py-2">... y {rows.length - 5} más</p>}
        </div>
    );
}

function RegistroCard({ title, count, icon, color, children }: { title: string; count: number; icon: React.ReactNode; color: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}>{icon}</div>
                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{title}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">{count}</span>
            </div>
            <div className="overflow-x-auto">{children}</div>
        </div>
    );
}

function EmptyRow({ text }: { text: string }) {
    return <p className="text-center text-[12px] text-slate-400 py-8">{text}</p>;
}

function Paginador({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
    return (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-50 dark:border-slate-800/60">
            <span className="text-[11px] text-slate-400">Página {page + 1} de {total}</span>
            <div className="flex gap-2">
                <button onClick={() => onChange(page - 1)} disabled={page === 0}
                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">
                    ← Ant.
                </button>
                <button onClick={() => onChange(page + 1)} disabled={page >= total - 1}
                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">
                    Sig. →
                </button>
            </div>
        </div>
    );
}

function Resultado({ resultado, onClose }: { resultado: { tipo: string; mensaje: string; detalles?: string[] }; onClose: () => void }) {
    const styles = {
        success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400",
        error: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400",
        warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400",
    };
    const Icon = resultado.tipo === "success" ? CheckCircle2 : AlertCircle;
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
