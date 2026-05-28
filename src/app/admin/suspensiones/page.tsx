"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
    ShieldOff, ShieldCheck, Search, Loader2, X,
    CheckCircle2, XCircle, History, ChevronDown, ChevronUp,
    AlertTriangle, Clock, RefreshCw, FileText, ChevronRight, Inbox,
    Tag, Plus, Pencil, Trash2, Check, ToggleLeft, ToggleRight, FileSpreadsheet, Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsuarioSuspension {
    cod: string;
    expediente: string | null;
    nombre: string;
    apellido: string;
    status: string;
    tieneUsuario: boolean;
    ultimaAccion?: {
        accion: string;
        comentario: string;
        adminNombre: string | null;
        createdAt: string;
    } | null;
}

interface RegistroHistorial {
    id: number;
    expediente: string;
    accion: string;
    comentario: string;
    adminNombre: string | null;
    createdAt: string;
}

interface SolicitudPedido {
    id: number;
    expediente: string;
    tipo: string;
    fecha: string;
    estado: string;
    detalles: any;
    nombre: string | null;
    apellido: string | null;
}

interface SolicitudRehab {
    id: number;
    expediente: string;
    nombre: string;
    apellido: string;
    estado: string;
    pasoActual: number;
    // Paso 1
    deudaOriginal?: number; p1Metodo?: string; p1Comprobante?: string; p1Ok: boolean;
    // Paso 2
    p2Desde?: string; p2Razon?: string; p2Ok: boolean;
    // Paso 3
    p3Pdf?: string; p3Ok: boolean;
    // Paso 4
    p4Tipo?: string; p4Dni?: string; p4Doc?: string; p4Ok: boolean;
    // Paso 5
    p5JusAmount?: number; p5Pesos?: number; p5Metodo?: string; p5Comprobante?: string; p5Ok: boolean;
    respuesta: string | null;
    adminNombre: string | null;
    createdAt: string;
}

interface MotivoSuspension {
    id: number;
    nombre: string;
    tipo: string;
    aplicaMulta: boolean;
    activo: boolean;
    createdAt: string;
}

type ModalSuspension = {
    expediente: string;
    nombre: string;
    apellido: string;
    targetStatus: "active" | "suspended" | "cancelled";
};

type ModalRehab = {
    id: number;
    expediente: string;
    nombre: string;
    apellido: string;
    accion: "aprobar" | "rechazar";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
        + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuspensionesPage() {
    const { showToast } = useToast();
    const [tab, setTab] = useState<"matriculados" | "rehabilitaciones" | "pedidos" | "motivos">("matriculados");

    // ── Tab Matriculados ──
    const [usuarios, setUsuarios] = useState<UsuarioSuspension[]>([]);
    const [loadingUsuarios, setLoadingUsuarios] = useState(true);
    const [search, setSearch] = useState("");
    const [filtro, setFiltro] = useState<"todos" | "active" | "suspended">("todos");
    const [modalSusp, setModalSusp] = useState<ModalSuspension | null>(null);
    const [comentario, setComentario] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [expandedExp, setExpandedExp] = useState<string | null>(null);
    const [historialMap, setHistorialMap] = useState<Record<string, RegistroHistorial[]>>({});
    const [loadingHistorial, setLoadingHistorial] = useState<string | null>(null);
    const suspTextareaRef = useRef<HTMLTextAreaElement>(null);

    // ── Tab Rehabilitaciones ──
    const [solicitudes, setSolicitudes] = useState<SolicitudRehab[]>([]);
    const [loadingRehab, setLoadingRehab] = useState(false);
    const [rehabCargado, setRehabCargado] = useState(false);
    const [filtroRehab, setFiltroRehab] = useState<"todos" | "pendiente" | "borrador" | "aprobada" | "rechazada">("pendiente");
    const [modalRehab, setModalRehab] = useState<ModalRehab | null>(null);
    const [respuesta, setRespuesta] = useState("");
    const [procesando, setProcesando] = useState(false);
    const rehabTextareaRef = useRef<HTMLTextAreaElement>(null);

    // ── Tab Pedidos ──
    const [pedidos, setPedidos] = useState<SolicitudPedido[]>([]);
    const [loadingPedidos, setLoadingPedidos] = useState(false);
    const [pedidosCargados, setPedidosCargados] = useState(false);
    const [filtroPedidos, setFiltroPedidos] = useState<"todos" | "pendiente" | "completada" | "rechazada">("pendiente");
    const [selectedPedido, setSelectedPedido] = useState<SolicitudPedido | null>(null);
    const [panelPedidoOpen, setPanelPedidoOpen] = useState(false);
    const [motivoPedido, setMotivoPedido] = useState("");
    const [procesandoPedido, setProcesandoPedido] = useState(false);

    // ── Tab Motivos ──
    const [motivos, setMotivos] = useState<MotivoSuspension[]>([]);
    const [loadingMotivos, setLoadingMotivos] = useState(false);
    const [motivosCargados, setMotivosCargados] = useState(false);
    const [nuevoMotivo, setNuevoMotivo] = useState({ nombre: "", tipo: "suspension" as string, aplicaMulta: false });
    const [creandoMotivo, setCreandoMotivo] = useState(false);
    const [editandoMotivo, setEditandoMotivo] = useState<number | null>(null);
    const [editNombre, setEditNombre] = useState("");

    // Modal suspensión — motivo seleccionado (guardamos el ID)
    const [selectedMotivoId, setSelectedMotivoId] = useState<number | null>(null);
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // ── Importar masivo ──
    type ImportRow = { expediente: string; status: "habilitado" | "suspendido" | "no_encontrado" | "cargando" };
    const [importOpen, setImportOpen] = useState(false);
    const [importRows, setImportRows] = useState<ImportRow[]>([]);
    const [importProcessing, setImportProcessing] = useState(false);
    const [importResult, setImportResult] = useState<{ habilitados: number; yaActivos: number; noEncontrados: string[] } | null>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    // ── Load ──

    useEffect(() => { cargarUsuarios(); cargarMotivos(); }, []);

    useEffect(() => {
        if (tab === "rehabilitaciones" && !rehabCargado) cargarRehabilitaciones();
        if (tab === "pedidos" && !pedidosCargados) cargarPedidos();
        if (tab === "motivos" && !motivosCargados) cargarMotivos();
    }, [tab]);

    useEffect(() => {
        if (modalSusp) setTimeout(() => suspTextareaRef.current?.focus(), 80);
    }, [modalSusp]);

    useEffect(() => {
        if (modalRehab) setTimeout(() => rehabTextareaRef.current?.focus(), 80);
    }, [modalRehab]);

    async function cargarUsuarios() {
        setLoadingUsuarios(true);
        try {
            const [usRes, histRes] = await Promise.all([
                fetch("/api/admin/usuarios").then(r => r.json()),
                fetch("/api/admin/suspensiones").then(r => r.json()),
            ]);
            const registros: RegistroHistorial[] = histRes.registros ?? [];
            const ultimaMap = new Map<string, RegistroHistorial>();
            for (const r of registros) {
                if (!ultimaMap.has(r.expediente)) ultimaMap.set(r.expediente, r);
            }
            const usLista = usRes?.usuarios ?? usRes ?? [];
            setUsuarios((usLista).map((u: UsuarioSuspension) => ({
                ...u,
                ultimaAccion: ultimaMap.get(u.expediente ?? "") ?? null,
            })));
        } finally {
            setLoadingUsuarios(false);
        }
    }

    async function cargarRehabilitaciones() {
        setLoadingRehab(true);
        try {
            const res = await fetch("/api/admin/suspensiones?tipo=rehabilitaciones");
            const data = await res.json();
            setSolicitudes(data.solicitudes ?? []);
            setRehabCargado(true);
        } finally {
            setLoadingRehab(false);
        }
    }

    async function cargarPedidos() {
        setLoadingPedidos(true);
        try {
            const res = await fetch("/api/admin/solicitudes");
            const data = await res.json();
            const todos = Array.isArray(data) ? data : [];
            setPedidos(todos.filter((s: SolicitudPedido) =>
                s.tipo.includes("Suspensión") || s.tipo.includes("Cancelación") ||
                s.tipo.toLowerCase().includes("suspension") || s.tipo.toLowerCase().includes("cancelacion")
            ));
            setPedidosCargados(true);
        } finally {
            setLoadingPedidos(false);
        }
    }

    async function cargarMotivos() {
        setLoadingMotivos(true);
        try {
            const res = await fetch("/api/admin/motivos-suspension");
            const data = await res.json();
            setMotivos(Array.isArray(data) ? data : []);
            setMotivosCargados(true);
        } finally {
            setLoadingMotivos(false);
        }
    }

    async function crearMotivo() {
        if (!nuevoMotivo.nombre.trim()) return;
        setCreandoMotivo(true);
        try {
            const res = await fetch("/api/admin/motivos-suspension", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nuevoMotivo),
            });
            if (!res.ok) { const e = await res.json(); showToast(e.error ?? "Error", "error"); return; }
            const creado = await res.json();
            setMotivos(prev => [creado, ...prev]);
            setNuevoMotivo({ nombre: "", tipo: "suspension", aplicaMulta: false });
            showToast("Motivo creado", "success");
        } finally {
            setCreandoMotivo(false);
        }
    }

    async function toggleActivoMotivo(id: number, activo: boolean) {
        const res = await fetch(`/api/admin/motivos-suspension/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activo: !activo }),
        });
        if (!res.ok) { showToast("Error", "error"); return; }
        setMotivos(prev => prev.map(m => m.id === id ? { ...m, activo: !activo } : m));
    }

    async function guardarEdicionMotivo(id: number) {
        if (!editNombre.trim()) return;
        const res = await fetch(`/api/admin/motivos-suspension/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: editNombre.trim() }),
        });
        if (!res.ok) { showToast("Error al guardar", "error"); return; }
        setMotivos(prev => prev.map(m => m.id === id ? { ...m, nombre: editNombre.trim() } : m));
        setEditandoMotivo(null);
        showToast("Motivo actualizado", "success");
    }

    async function toggleSeleccionarMotivo(id: number, aplicaMulta: boolean) {
        const res = await fetch(`/api/admin/motivos-suspension/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aplicaMulta: !aplicaMulta }),
        });
        if (!res.ok) { showToast("Error", "error"); return; }
        setMotivos(prev => prev.map(m => m.id === id ? { ...m, aplicaMulta: !aplicaMulta } : m));
    }

    async function eliminarMotivo(id: number) {
        const res = await fetch(`/api/admin/motivos-suspension/${id}`, { method: "DELETE" });
        if (!res.ok) { showToast("No se puede eliminar", "error"); return; }
        setMotivos(prev => prev.filter(m => m.id !== id));
        showToast("Motivo eliminado", "success");
    }

    async function accionPedido(action: string, extra: Record<string, string> = {}) {
        if (!selectedPedido) return;
        setProcesandoPedido(true);
        try {
            const res = await fetch(`/api/admin/solicitudes/${selectedPedido.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ...extra }),
            });
            if (!res.ok) { const e = await res.json(); showToast(e.error ?? "Error", "error"); return; }
            const updated = await res.json();
            showToast("Solicitud procesada", "success");
            setPedidos(prev => prev.map(p => p.id === selectedPedido.id ? { ...p, ...updated } : p));
            setSelectedPedido(prev => prev ? { ...prev, ...updated } : prev);
            setTimeout(() => { setPanelPedidoOpen(false); setSelectedPedido(null); setMotivoPedido(""); }, 1500);
        } finally {
            setProcesandoPedido(false);
        }
    }

    async function toggleHistorial(expediente: string) {
        if (expandedExp === expediente) { setExpandedExp(null); return; }
        setExpandedExp(expediente);
        if (historialMap[expediente]) return;
        setLoadingHistorial(expediente);
        try {
            const res = await fetch(`/api/admin/suspensiones?expediente=${encodeURIComponent(expediente)}`);
            const data = await res.json();
            setHistorialMap(prev => ({ ...prev, [expediente]: data.registros ?? [] }));
        } finally {
            setLoadingHistorial(null);
        }
    }

    async function confirmarSuspension() {
        if (!modalSusp || !comentario.trim()) return;
        setGuardando(true);
        const key = modalSusp.expediente;
        try {
            const res = await fetch(`/api/admin/usuarios/${encodeURIComponent(key)}/estado`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: modalSusp.targetStatus,
                    comentario: comentario.trim(),
                    motivoId: selectedMotivoId || undefined,
                    fechaInicio: fechaInicio || undefined,
                    fechaFin: fechaFin || undefined,
                }),
            });
            if (!res.ok) { const e = await res.json(); showToast(e.error ?? "Error", "error"); return; }
            const accionLabel = modalSusp.targetStatus === "suspended" ? `${modalSusp.apellido} suspendido`
                : modalSusp.targetStatus === "cancelled" ? `${modalSusp.apellido} cancelado`
                : `${modalSusp.apellido} habilitado`;
            showToast(accionLabel, modalSusp.targetStatus === "active" ? "success" : "error");
            const accionHistorial = modalSusp.targetStatus === "suspended" ? "suspension" : modalSusp.targetStatus === "cancelled" ? "cancelacion" : "habilitacion";
            setUsuarios(prev => prev.map(u =>
                (u.expediente ?? u.cod) === key
                    ? { ...u, status: modalSusp.targetStatus, ultimaAccion: { accion: accionHistorial, comentario: comentario.trim(), adminNombre: null, createdAt: new Date().toISOString() } }
                    : u
            ));
            setHistorialMap(prev => { const n = { ...prev }; delete n[key]; return n; });
            setModalSusp(null); setComentario(""); setSelectedMotivoId(null); setFechaInicio(""); setFechaFin("");
        } finally { setGuardando(false); }
    }

    async function confirmarRehab() {
        if (!modalRehab || !respuesta.trim()) return;
        setProcesando(true);
        try {
            const res = await fetch(`/api/admin/suspensiones/rehabilitacion/${modalRehab.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accion: modalRehab.accion, respuesta: respuesta.trim() }),
            });
            if (!res.ok) { const e = await res.json(); showToast(e.error ?? "Error", "error"); return; }
            const label = modalRehab.accion === "aprobar" ? "aprobada" : "rechazada";
            showToast(`Solicitud ${label}`, modalRehab.accion === "aprobar" ? "success" : "error");
            setSolicitudes(prev => prev.map(s =>
                s.id === modalRehab.id
                    ? { ...s, estado: modalRehab.accion === "aprobar" ? "aprobada" : "rechazada", respuesta: respuesta.trim() }
                    : s
            ));
            // Si fue aprobada, actualizar status en lista de usuarios
            if (modalRehab.accion === "aprobar") {
                setUsuarios(prev => prev.map(u =>
                    (u.expediente ?? u.cod) === modalRehab.expediente
                        ? { ...u, status: "active" }
                        : u
                ));
            }
            setModalRehab(null); setRespuesta("");
        } finally { setProcesando(false); }
    }

    // ── Computed ──

    const filtrados = useMemo(() => {
        const q = search.toLowerCase().trim();
        return usuarios.filter(u => {
            if (filtro !== "todos" && u.status !== filtro) return false;
            if (!q) return true;
            const nombreCompleto = `${u.apellido}, ${u.nombre}`.toLowerCase();
            return nombreCompleto.includes(q) || `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) || u.apellido.toLowerCase().includes(q) || u.nombre.toLowerCase().includes(q) || (u.expediente ?? "").toLowerCase().includes(q);
        });
    }, [usuarios, search, filtro]);

    const solicitudesFiltradas = useMemo(() =>
        filtroRehab === "todos" ? solicitudes : solicitudes.filter(s => s.estado === filtroRehab),
        [solicitudes, filtroRehab]
    );

    const pendientesCount = solicitudes.filter(s => s.estado === "pendiente" || s.estado === "borrador").length;
    const totalSuspendidos = usuarios.filter(u => u.status === "suspended").length;

    function exportarXLSX() {
        const filas = filtrados.map(u => ({
            Apellido: u.apellido,
            Nombre: u.nombre,
            Expediente: u.expediente ?? "",
            Estado: u.status === "suspended" ? "Suspendido" : u.status === "cancelled" ? "Cancelado" : "Habilitado",
            "Última acción": u.ultimaAccion?.accion ?? "",
            Comentario: u.ultimaAccion?.comentario ?? "",
            "Fecha acción": u.ultimaAccion ? new Date(u.ultimaAccion.createdAt).toLocaleDateString("es-AR") : "",
            "Admin": u.ultimaAccion?.adminNombre ?? "",
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(filas);
        XLSX.utils.book_append_sheet(wb, ws, "Matriculados");
        const label = filtro === "suspended" ? "suspendidos" : filtro === "active" ? "habilitados" : "todos";
        XLSX.writeFile(wb, `matriculados_${label}.xlsx`);
    }

    function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        const reader = new FileReader();
        reader.onload = (ev) => {
            const data = new Uint8Array(ev.target!.result as ArrayBuffer);
            const wb = XLSX.read(data, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
            const exps: string[] = [];
            for (const row of rows) {
                const cell = String(row[0] ?? "").trim();
                if (cell && cell.toLowerCase() !== "expediente") exps.push(cell);
            }
            const mapped: ImportRow[] = exps.map(exp => {
                const u = usuarios.find(u => u.expediente === exp || u.cod === exp);
                if (!u) return { expediente: exp, status: "no_encontrado" as const };
                return { expediente: exp, status: u.status === "suspended" ? "suspendido" as const : "habilitado" as const };
            });
            setImportRows(mapped);
            setImportResult(null);
        };
        reader.readAsArrayBuffer(file);
    }

    async function procesarImport() {
        const aHabilitar = importRows.filter(r => r.status === "suspendido").map(r => r.expediente);
        if (aHabilitar.length === 0) { showToast("No hay suspendidos en la lista", "error"); return; }
        setImportProcessing(true);
        try {
            const res = await fetch("/api/admin/suspensiones/habilitar-masivo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expedientes: importRows.map(r => r.expediente) }),
            });
            if (!res.ok) { const e = await res.json(); showToast(e.error ?? "Error", "error"); return; }
            const result = await res.json();
            setImportResult(result);
            showToast(`${result.habilitados} habilitado${result.habilitados !== 1 ? "s" : ""}`, "success");
            await cargarUsuarios();
        } finally {
            setImportProcessing(false);
        }
    }

    const pedidosFiltrados = useMemo(() =>
        filtroPedidos === "todos" ? pedidos : pedidos.filter(p => p.estado === filtroPedidos),
        [pedidos, filtroPedidos]
    );
    const pedidosCount = pedidos.filter(p => p.estado === "pendiente").length;

    return (
        <div className="p-6 md:p-10 space-y-6">

            {/* Modal preview imagen */}
            {previewUrl && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
                    <div className="relative max-w-3xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setPreviewUrl(null)}
                            className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-[13px]">
                            <X size={16} /> Cerrar
                        </button>
                        <img src={previewUrl} alt="Documento" className="w-full h-auto max-h-[85vh] object-contain rounded-xl" />
                    </div>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <ShieldOff size={20} className="text-rose-500" /> Suspensiones y Rehabilitaciones
                </h1>
                <p className="text-[12px] text-slate-400 mt-1">
                    {usuarios.length} matriculados · {totalSuspendidos} suspendidos
                    {pendientesCount > 0 && <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full">{pendientesCount} rehab. pendiente{pendientesCount !== 1 ? "s" : ""}</span>}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-slate-100 dark:border-slate-800">
                {[
                    { key: "matriculados" as const, label: "Matriculados" },
                    { key: "rehabilitaciones" as const, label: "Solicitudes de Rehabilitación", badge: pendientesCount },
                    { key: "pedidos" as const, label: "Pedidos de Suspensión", badge: pedidosCount },
                    { key: "motivos" as const, label: "Motivos", badge: null },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-5 py-3 text-[13px] font-semibold border-b-2 transition-all whitespace-nowrap
                            ${tab === t.key
                                ? "border-[#063f68] text-[#063f68] dark:border-blue-400 dark:text-blue-400"
                                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                        {t.label}
                        {t.badge != null && t.badge > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">{t.badge}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── TAB MATRICULADOS ─────────────────────────────────────────── */}
            {tab === "matriculados" && (
                <>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por apellido, nombre o expediente..."
                                className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/50" />
                        </div>
                        <div className="flex gap-2">
                            {(["todos", "active", "suspended"] as const).map(f => (
                                <button key={f} onClick={() => setFiltro(f)}
                                    className={`px-3 h-10 rounded-xl text-[12px] font-semibold border transition-all
                                        ${filtro === f
                                            ? f === "suspended" ? "bg-rose-500 border-rose-500 text-white"
                                                : f === "active" ? "bg-emerald-500 border-emerald-500 text-white"
                                                : "bg-[#063f68] border-[#063f68] text-white"
                                            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                                    {f === "todos" ? "Todos" : f === "active" ? "Habilitados" : "Suspendidos"}
                                </button>
                            ))}
                            <button
                                onClick={exportarXLSX}
                                disabled={filtrados.length === 0}
                                className="flex items-center gap-1.5 px-3 h-10 rounded-xl text-[12px] font-semibold border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-40 transition-all">
                                <FileSpreadsheet size={14} /> Exportar
                            </button>
                            <button
                                onClick={() => { setImportOpen(v => !v); setImportRows([]); setImportResult(null); }}
                                className={`flex items-center gap-1.5 px-3 h-10 rounded-xl text-[12px] font-semibold border transition-all
                                    ${importOpen
                                        ? "bg-[#063f68] border-[#063f68] text-white"
                                        : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                                <Upload size={14} /> Importar
                            </button>
                        </div>
                    </div>

                    {/* ── Panel importar masivo ── */}
                    {importOpen && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Upload size={14} className="text-[#063f68]" /> Habilitación masiva por expediente
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Subí el listado de matrículas que <span className="font-semibold text-slate-500 dark:text-slate-300">deben estar activas</span>. Si alguna figura suspendida en el sistema, será habilitada automáticamente.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const wb = XLSX.utils.book_new();
                                            const ws = XLSX.utils.aoa_to_sheet([["Expediente"]]);
                                            XLSX.utils.book_append_sheet(wb, ws, "Modelo");
                                            XLSX.writeFile(wb, "modelo_importacion.xlsx");
                                        }}
                                        className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-[12px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                        <FileSpreadsheet size={13} /> Descargar modelo
                                    </button>
                                    <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
                                    <button
                                        onClick={() => importFileRef.current?.click()}
                                        className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-[12px] font-semibold bg-[#063f68] text-white hover:bg-[#052d4a] transition-all">
                                        <FileSpreadsheet size={13} /> Elegir archivo
                                    </button>
                                </div>
                            </div>

                            {importRows.length > 0 && !importResult && (
                                <>
                                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800 max-h-64 overflow-y-auto">
                                        {importRows.map(r => (
                                            <div key={r.expediente} className="flex items-center justify-between px-4 py-2.5">
                                                <span className="text-[12px] font-mono text-slate-700 dark:text-slate-300">{r.expediente}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                                                    ${r.status === "suspendido" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                                                        : r.status === "habilitado" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                                                    {r.status === "suspendido" ? "Suspendido → habilitará"
                                                        : r.status === "habilitado" ? "Ya activo"
                                                        : "No encontrado"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <div className="text-[11px] text-slate-400 space-x-3">
                                            <span className="text-rose-500 font-semibold">{importRows.filter(r => r.status === "suspendido").length} a habilitar</span>
                                            <span>{importRows.filter(r => r.status === "habilitado").length} ya activos</span>
                                            <span>{importRows.filter(r => r.status === "no_encontrado").length} no encontrados</span>
                                        </div>
                                        <button
                                            onClick={procesarImport}
                                            disabled={importProcessing || importRows.filter(r => r.status === "suspendido").length === 0}
                                            className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-[12px] font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 transition-all">
                                            {importProcessing ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                                            {importProcessing ? "Procesando..." : "Confirmar habilitación"}
                                        </button>
                                    </div>
                                </>
                            )}

                            {importResult && (
                                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 space-y-2">
                                    <p className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                        <CheckCircle2 size={14} /> Proceso completado
                                    </p>
                                    <div className="text-[12px] text-slate-600 dark:text-slate-300 space-y-1">
                                        <p><span className="font-semibold text-emerald-600">{importResult.habilitados}</span> matrículas habilitadas</p>
                                        <p><span className="font-semibold">{importResult.yaActivos}</span> ya estaban activas</p>
                                        {importResult.noEncontrados.length > 0 && (
                                            <p><span className="font-semibold text-amber-500">{importResult.noEncontrados.length}</span> no encontrados: {importResult.noEncontrados.join(", ")}</p>
                                        )}
                                    </div>
                                    <button onClick={() => { setImportRows([]); setImportResult(null); }}
                                        className="text-[11px] text-slate-400 hover:text-slate-600 underline mt-1">
                                        Importar otro archivo
                                    </button>
                                </div>
                            )}

                            {importRows.length === 0 && !importResult && (
                                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
                                    <FileSpreadsheet size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                    <p className="text-[12px] text-slate-400">Elegí un archivo Excel (.xlsx) con los expedientes en la primera columna.<br/>Los que deban estar activos y figuren suspendidos serán habilitados.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {loadingUsuarios ? (
                        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-300" /></div>
                    ) : filtrados.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                            <ShieldOff size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Sin resultados</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/60">
                            {filtrados.map(u => {
                                const key = u.expediente ?? u.cod;
                                const isSuspended = u.status === "suspended";
                                const isExpanded = expandedExp === key;
                                const historial = historialMap[key];
                                return (
                                    <div key={u.cod}>
                                        <div className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 ${isSuspended ? "bg-rose-50/30 dark:bg-rose-950/10" : ""}`}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white">{u.apellido}, {u.nombre}</p>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                                                        ${isSuspended ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"}`}>
                                                        {isSuspended ? <XCircle size={9} /> : <CheckCircle2 size={9} />}
                                                        {isSuspended ? "Suspendido" : "Habilitado"}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{key}</p>
                                                {u.ultimaAccion && (
                                                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
                                                        <Clock size={10} />
                                                        <span className={u.ultimaAccion.accion === "suspension" ? "text-rose-500 font-semibold" : "text-emerald-500 font-semibold"}>
                                                            {u.ultimaAccion.accion === "suspension" ? "Suspensión" : "Habilitación"}
                                                        </span>
                                                        · {fmtFecha(u.ultimaAccion.createdAt)}
                                                        <span className="italic truncate max-w-[200px]">· {u.ultimaAccion.comentario}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button onClick={() => toggleHistorial(key)}
                                                    className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                                    <History size={12} /> Historial {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                                </button>
                                                {u.tieneUsuario && (
                                                    <>
                                                        {isSuspended ? (
                                                            <button
                                                                onClick={() => { setModalSusp({ expediente: key, nombre: u.nombre, apellido: u.apellido, targetStatus: "active" }); setComentario(""); setSelectedMotivoId(null); }}
                                                                className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-bold border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-all">
                                                                <ShieldCheck size={12} /> Habilitar
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => { setModalSusp({ expediente: key, nombre: u.nombre, apellido: u.apellido, targetStatus: "suspended" }); setComentario(""); setSelectedMotivoId(null); }}
                                                                    className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-bold border bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all">
                                                                    <ShieldOff size={12} /> Suspender
                                                                </button>
                                                                <button
                                                                    onClick={() => { setModalSusp({ expediente: key, nombre: u.nombre, apellido: u.apellido, targetStatus: "cancelled" }); setComentario(""); setSelectedMotivoId(null); }}
                                                                    className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-bold border bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-all">
                                                                    <XCircle size={12} /> Cancelar
                                                                </button>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-5 pb-4 bg-slate-50/50 dark:bg-slate-800/20">
                                                {loadingHistorial === key ? (
                                                    <div className="flex items-center gap-2 py-4 text-slate-400 text-[12px]"><Loader2 size={14} className="animate-spin" /> Cargando...</div>
                                                ) : !historial || historial.length === 0 ? (
                                                    <p className="text-[12px] text-slate-400 py-4">Sin registros para este matriculado.</p>
                                                ) : (
                                                    <div className="space-y-2 pt-3">
                                                        {historial.map(r => (
                                                            <div key={r.id} className="flex gap-3 items-start">
                                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                                                                    ${r.accion === "suspension" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"}`}>
                                                                    {r.accion === "suspension" ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className={`text-[11px] font-bold ${r.accion === "suspension" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                                                            {r.accion === "suspension" ? "Suspensión" : "Habilitación"}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400"><Clock size={9} className="inline mb-0.5" /> {fmtFecha(r.createdAt)}</span>
                                                                        {r.adminNombre && <span className="text-[10px] text-slate-400">— {r.adminNombre}</span>}
                                                                    </div>
                                                                    <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-0.5">{r.comentario}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── TAB REHABILITACIONES ─────────────────────────────────────── */}
            {tab === "rehabilitaciones" && (
                <>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex gap-2 flex-wrap">
                            {(["pendiente", "todos", "borrador", "aprobada", "rechazada"] as const).map(f => (
                                <button key={f} onClick={() => setFiltroRehab(f as typeof filtroRehab)}
                                    className={`px-3 h-9 rounded-xl text-[12px] font-semibold border transition-all
                                        ${filtroRehab === f
                                            ? f === "rechazada" ? "bg-rose-500 border-rose-500 text-white"
                                                : f === "aprobada" ? "bg-emerald-500 border-emerald-500 text-white"
                                                : f === "pendiente" ? "bg-amber-500 border-amber-500 text-white"
                                                : f === "borrador" ? "bg-slate-500 border-slate-500 text-white"
                                                : "bg-[#063f68] border-[#063f68] text-white"
                                            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                                    {f === "todos" ? "Todas" : f === "pendiente" ? "Pendientes" : f === "aprobada" ? "Aprobadas" : f === "rechazada" ? "Rechazadas" : "En trámite"}
                                </button>
                            ))}
                        </div>
                        <button onClick={cargarRehabilitaciones}
                            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <RefreshCw size={13} /> Actualizar
                        </button>
                    </div>

                    {loadingRehab ? (
                        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-300" /></div>
                    ) : solicitudesFiltradas.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                            <RefreshCw size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Sin solicitudes {filtroRehab !== "todos" ? `${filtroRehab}s` : ""}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {solicitudesFiltradas.map(s => (
                                <div key={s.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                            <p className="text-[13px] font-bold text-slate-800 dark:text-white">{s.apellido}, {s.nombre}</p>
                                            <p className="text-[11px] text-slate-400 font-mono">{s.expediente}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Clock size={9} /> {fmtFecha(s.createdAt)}</p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold
                                            ${s.estado === "pendiente" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                                : s.estado === "borrador" ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                : s.estado === "aprobada" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"}`}>
                                            {s.estado === "pendiente" ? <Clock size={11} /> : s.estado === "aprobada" ? <CheckCircle2 size={11} /> : s.estado === "borrador" ? <FileText size={11} /> : <XCircle size={11} />}
                                            {s.estado === "pendiente" ? "Pendiente revisión" : s.estado === "aprobada" ? "Aprobada" : s.estado === "borrador" ? `En trámite (paso ${s.pasoActual}/5)` : "Rechazada"}
                                        </span>
                                    </div>

                                    {/* Pasos completados */}
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {[
                                            { n: 1, label: "Deuda Vencida", ok: s.p1Ok },
                                            { n: 2, label: "Formulario", ok: s.p2Ok },
                                            { n: 3, label: "Reincidencia", ok: s.p3Ok },
                                            { n: 4, label: "Adhesión", ok: s.p4Ok },
                                            { n: 5, label: "Pago", ok: s.p5Ok },
                                        ].map(p => (
                                            <div key={p.n} className={`rounded-lg p-2 text-center border ${p.ok ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800" : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"}`}>
                                                <p className={`text-[9px] font-black uppercase tracking-wide ${p.ok ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>{p.label}</p>
                                                <p className="text-[10px] mt-0.5">{p.ok ? "✓" : "—"}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Detalles del legajo */}
                                    {s.estado === "pendiente" && (
                                        <div className="space-y-3 pt-1 border-t border-slate-50 dark:border-slate-800">
                                            {/* Paso 1 */}
                                            {s.p1Ok && s.p1Metodo !== "sin_deuda" && (
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Deuda vencida original · {s.p1Metodo}</p>
                                                        {s.deudaOriginal != null && <p className="text-[12px] text-slate-600 dark:text-slate-300">${s.deudaOriginal.toLocaleString("es-AR")}</p>}
                                                    </div>
                                                    {s.p1Comprobante && (
                                                        <button onClick={() => setPreviewUrl(s.p1Comprobante!)} className="text-[11px] font-bold text-blue-500 hover:underline flex items-center gap-1"><FileText size={11} /> Comprobante</button>
                                                    )}
                                                </div>
                                            )}
                                            {/* Paso 2 */}
                                            {s.p2Ok && (
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Formulario aceptado</p>
                                                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3 text-[12px] text-slate-600 dark:text-slate-300 space-y-1">
                                                        {s.p2Desde && <p><strong>A partir de:</strong> {s.p2Desde}</p>}
                                                        {s.p2Razon && <p><strong>En razón de:</strong> {s.p2Razon}</p>}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Paso 3 */}
                                            {s.p3Pdf && (
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cert. Reincidencia</p>
                                                    <a href={s.p3Pdf} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-purple-500 hover:underline flex items-center gap-1"><FileText size={11} /> Ver PDF</a>
                                                </div>
                                            )}
                                            {/* Paso 4 */}
                                            {s.p4Ok && (
                                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Adhesión · {s.p4Tipo}</p>
                                                    <div className="flex gap-2">
                                                        {s.p4Dni && <button onClick={() => setPreviewUrl(s.p4Dni!)} className="text-[11px] font-bold text-cyan-500 hover:underline flex items-center gap-1"><FileText size={11} /> DNI</button>}
                                                        {s.p4Doc && <button onClick={() => setPreviewUrl(s.p4Doc!)} className="text-[11px] font-bold text-cyan-500 hover:underline flex items-center gap-1"><FileText size={11} /> {s.p4Tipo === "CBU" ? "CBU" : "Tarjeta"}</button>}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Paso 5 */}
                                            {s.p5Ok && (
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pago rehab. · {s.p5Metodo}</p>
                                                        {s.p5JusAmount && <p className="text-[12px] text-slate-600 dark:text-slate-300">{s.p5JusAmount} JUS = ${s.p5Pesos?.toLocaleString("es-AR")}</p>}
                                                    </div>
                                                    {s.p5Comprobante && (
                                                        <button onClick={() => setPreviewUrl(s.p5Comprobante!)} className="text-[11px] font-bold text-emerald-500 hover:underline flex items-center gap-1"><FileText size={11} /> Comprobante</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Respuesta admin */}
                                    {s.respuesta && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                                                Respuesta {s.adminNombre && <span className="font-normal normal-case">— {s.adminNombre}</span>}
                                            </p>
                                            <p className={`text-[13px] rounded-xl p-4 leading-relaxed border
                                                ${s.estado === "aprobada" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800"
                                                    : "bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 border-rose-100 dark:border-rose-800"}`}>
                                                {s.respuesta}
                                            </p>
                                        </div>
                                    )}

                                    {/* Acciones */}
                                    {s.estado === "pendiente" && (
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={() => { setModalRehab({ id: s.id, expediente: s.expediente, nombre: s.nombre, apellido: s.apellido, accion: "aprobar" }); setRespuesta(""); }}
                                                className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-[12px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all">
                                                <ShieldCheck size={13} /> Aprobar y habilitar
                                            </button>
                                            <button onClick={() => { setModalRehab({ id: s.id, expediente: s.expediente, nombre: s.nombre, apellido: s.apellido, accion: "rechazar" }); setRespuesta(""); }}
                                                className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-[12px] font-bold bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all">
                                                <XCircle size={13} /> Rechazar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ── TAB PEDIDOS ──────────────────────────────────────────── */}
            {tab === "pedidos" && (
                <>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex gap-2 flex-wrap">
                            {(["pendiente", "todos", "completada", "rechazada"] as const).map(f => (
                                <button key={f} onClick={() => setFiltroPedidos(f)}
                                    className={`px-3 h-9 rounded-xl text-[12px] font-semibold border transition-all
                                        ${filtroPedidos === f
                                            ? f === "rechazada" ? "bg-rose-500 border-rose-500 text-white"
                                                : f === "completada" ? "bg-emerald-500 border-emerald-500 text-white"
                                                : f === "pendiente" ? "bg-amber-500 border-amber-500 text-white"
                                                : "bg-[#063f68] border-[#063f68] text-white"
                                            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                                    {f === "todos" ? "Todos" : f === "pendiente" ? "Pendientes" : f === "completada" ? "Aprobados" : "Rechazados"}
                                </button>
                            ))}
                        </div>
                        <button onClick={cargarPedidos}
                            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <RefreshCw size={13} /> Actualizar
                        </button>
                    </div>

                    {loadingPedidos ? (
                        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-300" /></div>
                    ) : pedidosFiltrados.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                            <Inbox size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Sin pedidos {filtroPedidos !== "todos" ? filtroPedidos + "s" : ""}</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Matriculado</th>
                                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Tipo</th>
                                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Fecha</th>
                                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                                        <th className="px-5 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {pedidosFiltrados.map(p => {
                                        const esCancelacion = p.tipo.toLowerCase().includes("cancelación") || p.tipo.toLowerCase().includes("cancelacion");
                                        return (
                                            <tr key={p.id} onClick={() => { setSelectedPedido(p); setPanelPedidoOpen(true); setMotivoPedido(""); }}
                                                className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white">
                                                        {p.apellido && p.nombre ? `${p.apellido}, ${p.nombre}` : p.expediente}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">Mat. {p.expediente}</p>
                                                </td>
                                                <td className="px-5 py-3.5 hidden sm:table-cell">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider
                                                        ${esCancelacion
                                                            ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30"
                                                            : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30"}`}>
                                                        {esCancelacion ? "Cancelación" : "Suspensión"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 hidden md:table-cell">
                                                    <p className="text-[12px] text-slate-500">{new Date(p.fecha).toLocaleDateString("es-AR")}</p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider
                                                        ${p.estado === "completada"
                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30"
                                                            : p.estado === "rechazada"
                                                                ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30"
                                                                : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30"}`}>
                                                        {p.estado === "completada" ? <><CheckCircle2 size={10} /> Aprobado</> : p.estado === "rechazada" ? <><XCircle size={10} /> Rechazado</> : <><Clock size={10} /> Pendiente</>}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* ── PANEL PEDIDO ─────────────────────────────────────────── */}
            {panelPedidoOpen && selectedPedido && (
                <>
                    <div className="fixed inset-0 bg-black/40 z-40" onClick={() => { setPanelPedidoOpen(false); setTimeout(() => setSelectedPedido(null), 300); }} />
                    <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white dark:bg-[#02182b] z-50 flex flex-col border-l border-slate-100 dark:border-slate-800 overflow-hidden animate-slide-in-right">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                                    <FileText size={17} className="text-rose-500" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white leading-tight">Pedido de {selectedPedido.tipo.toLowerCase().includes("cancelación") || selectedPedido.tipo.toLowerCase().includes("cancelacion") ? "Cancelación" : "Suspensión"}</p>
                                    <p className="text-[11px] text-slate-400">#{selectedPedido.id}</p>
                                </div>
                            </div>
                            <button onClick={() => { setPanelPedidoOpen(false); setTimeout(() => setSelectedPedido(null), 300); }}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Matriculado</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-[14px]">
                                        {selectedPedido.apellido ? selectedPedido.apellido[0] : "?"}
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-bold text-slate-800 dark:text-white">
                                            {selectedPedido.apellido && selectedPedido.nombre ? `${selectedPedido.apellido}, ${selectedPedido.nombre}` : "—"}
                                        </p>
                                        <p className="text-[11px] text-slate-400">Mat. {selectedPedido.expediente}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider
                                    ${selectedPedido.tipo.toLowerCase().includes("cancelación") || selectedPedido.tipo.toLowerCase().includes("cancelacion")
                                        ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30"
                                        : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30"}`}>
                                    {selectedPedido.tipo}
                                </span>
                                <span className="text-[11px] text-slate-400">{new Date(selectedPedido.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}</span>
                            </div>

                            {selectedPedido.detalles && Object.keys(selectedPedido.detalles).length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Datos del pedido</p>
                                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 space-y-2">
                                        {Object.entries(selectedPedido.detalles as Record<string, any>).map(([k, v]) => {
                                            if (k === "rechazo") return null;
                                            if (typeof v === "object" && v !== null) return null;
                                            return (
                                                <div key={k} className="flex items-start justify-between gap-3">
                                                    <span className="text-[11px] font-semibold text-slate-400 capitalize min-w-[80px]">{k}</span>
                                                    <span className="text-[12px] text-slate-700 dark:text-slate-300 text-right">{String(v)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {selectedPedido.estado === "completada" && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Solicitud aprobada
                                    </p>
                                    <p className="text-[12px] text-emerald-700 dark:text-emerald-300 mt-1">
                                        El estado del matriculado fue actualizado automáticamente.
                                    </p>
                                </div>
                            )}

                            {selectedPedido.estado === "rechazada" && (selectedPedido.detalles as any)?.rechazo?.motivo && (
                                <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4">
                                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Motivo de rechazo</p>
                                    <p className="text-[13px] text-rose-700 dark:text-rose-300">{(selectedPedido.detalles as any).rechazo.motivo}</p>
                                </div>
                            )}
                        </div>

                        {selectedPedido.estado === "pendiente" && (
                            <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 p-5 space-y-3">
                                <button onClick={() => accionPedido("suspender")} disabled={procesandoPedido}
                                    className="w-full flex items-center justify-center gap-2 h-10 bg-emerald-600 text-white rounded-xl text-[13px] font-bold hover:bg-emerald-700 disabled:opacity-40 transition-all">
                                    {procesandoPedido ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    Aprobar solicitud
                                </button>
                                <div className="flex gap-2">
                                    <input value={motivoPedido} onChange={e => setMotivoPedido(e.target.value)}
                                        placeholder="Motivo de rechazo (opcional)..."
                                        className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/40" />
                                    <button onClick={() => accionPedido("rechazar", { motivo: motivoPedido })} disabled={procesandoPedido}
                                        className="flex items-center gap-1.5 px-4 h-10 bg-rose-500 text-white rounded-xl text-[13px] font-bold hover:bg-rose-600 disabled:opacity-40 transition-all">
                                        {procesandoPedido ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── TAB MOTIVOS ──────────────────────────────────────────── */}
            {tab === "motivos" && (
                <div className="space-y-6">
                    {/* Formulario crear */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                        <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Plus size={13} /> Nuevo motivo
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                value={nuevoMotivo.nombre}
                                onChange={e => setNuevoMotivo(p => ({ ...p, nombre: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") crearMotivo(); }}
                                placeholder="Ej: Falta de pago de matrícula"
                                className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/50"
                            />
                            <select
                                value={nuevoMotivo.tipo}
                                onChange={e => setNuevoMotivo(p => ({ ...p, tipo: e.target.value }))}
                                className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/50"
                            >
                                <option value="suspension">Suspensión</option>
                                <option value="cancelacion">Cancelación</option>
                                <option value="ambos">Ambos</option>
                            </select>
                            <button
                                onClick={crearMotivo}
                                disabled={creandoMotivo || !nuevoMotivo.nombre.trim()}
                                className="flex items-center gap-2 px-4 h-10 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all active:scale-95 whitespace-nowrap"
                            >
                                {creandoMotivo ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                                Agregar
                            </button>
                        </div>
                    </div>

                    {/* Lista de motivos */}
                    {loadingMotivos ? (
                        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
                    ) : motivos.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-14 text-center">
                            <Tag size={28} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 text-[13px] font-medium">No hay motivos configurados</p>
                            <p className="text-slate-400 text-[12px] mt-1">Creá el primero con el formulario de arriba</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/60">
                            {motivos.map(m => (
                                <div key={m.id} className={`flex items-center gap-3 px-5 py-3.5 ${!m.activo ? "opacity-50" : ""}`}>
                                    <Tag size={14} className={m.tipo === "suspension" ? "text-rose-400" : m.tipo === "cancelacion" ? "text-purple-400" : "text-amber-400"} />
                                    <div className="flex-1 min-w-0">
                                        {editandoMotivo === m.id ? (
                                            <input
                                                value={editNombre}
                                                onChange={e => setEditNombre(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter") guardarEdicionMotivo(m.id); if (e.key === "Escape") setEditandoMotivo(null); }}
                                                autoFocus
                                                placeholder="Nombre del motivo"
                                                className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/50"
                                            />
                                        ) : (
                                            <p className="text-[13px] font-semibold text-slate-800 dark:text-white truncate">{m.nombre}</p>
                                        )}
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {m.tipo === "suspension" ? "Suspensión" : m.tipo === "cancelacion" ? "Cancelación" : "Ambos"}
                                            {" · "}{m.activo ? "Activo" : "Inactivo"}
                                            {m.aplicaMulta && <span className="text-amber-500 font-semibold"> · Aplica multa</span>}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {editandoMotivo === m.id ? (
                                            <>
                                                <button onClick={() => guardarEdicionMotivo(m.id)} className="w-8 h-8 flex items-center justify-center rounded-xl text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all">
                                                    <Check size={14} />
                                                </button>
                                                <button onClick={() => setEditandoMotivo(null)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                                    <X size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => { setEditandoMotivo(m.id); setEditNombre(m.nombre); }} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                                    <Pencil size={13} />
                                                </button>
                                                <button onClick={() => toggleSeleccionarMotivo(m.id, m.aplicaMulta)} title={m.aplicaMulta ? "Quitar selección" : "Seleccionar"} className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-amber-50 dark:hover:bg-amber-950/30">
                                                    {m.aplicaMulta
                                                        ? <CheckCircle2 size={15} className="text-amber-500" />
                                                        : <CheckCircle2 size={15} className="text-slate-300 dark:text-slate-600" />}
                                                </button>
                                                <button onClick={() => toggleActivoMotivo(m.id, m.activo)} title={m.activo ? "Desactivar" : "Activar"} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                                    {m.activo ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                                                </button>
                                                <button onClick={() => eliminarMotivo(m.id)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 transition-all">
                                                    <Trash2 size={13} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── MODAL SUSPENSIÓN/HABILITACIÓN ──────────────────────────── */}
            {modalSusp && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setModalSusp(null); setComentario(""); setSelectedMotivoId(null); setFechaInicio(""); setFechaFin(""); }}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 rounded-t-2xl
                            ${modalSusp.targetStatus === "suspended" ? "bg-rose-50/50 dark:bg-rose-950/20"
                            : modalSusp.targetStatus === "cancelled" ? "bg-purple-50/50 dark:bg-purple-950/20"
                            : "bg-emerald-50/50 dark:bg-emerald-950/20"}`}>
                            <div>
                                <p className={`text-[14px] font-bold flex items-center gap-2
                                    ${modalSusp.targetStatus === "suspended" ? "text-rose-700 dark:text-rose-400"
                                    : modalSusp.targetStatus === "cancelled" ? "text-purple-700 dark:text-purple-400"
                                    : "text-emerald-700 dark:text-emerald-400"}`}>
                                    {modalSusp.targetStatus === "suspended" ? <><ShieldOff size={15} /> Suspender matrícula</>
                                    : modalSusp.targetStatus === "cancelled" ? <><XCircle size={15} /> Cancelar matrícula</>
                                    : <><ShieldCheck size={15} /> Habilitar matrícula</>}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">{modalSusp.apellido}, {modalSusp.nombre}</p>
                            </div>
                            <button onClick={() => { setModalSusp(null); setComentario(""); setSelectedMotivoId(null); setFechaInicio(""); setFechaFin(""); }} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"><X size={15} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {modalSusp.targetStatus === "suspended" && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">El matriculado verá su acceso restringido mientras esté suspendido.</p>
                                </div>
                            )}
                            {modalSusp.targetStatus === "cancelled" && (
                                <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/30">
                                    <AlertTriangle size={14} className="text-purple-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">La matrícula quedará cancelada. El matriculado perderá acceso a la plataforma.</p>
                                </div>
                            )}
                            {(modalSusp.targetStatus === "suspended" || modalSusp.targetStatus === "cancelled") && (() => {
                                const tipoFiltro = modalSusp.targetStatus === "suspended" ? ["suspension", "ambos"] : ["cancelacion", "ambos"];
                                const motivosFiltrados = motivos.filter(m => m.activo && tipoFiltro.includes(m.tipo));
                                const isSusp = modalSusp.targetStatus === "suspended";
                                const selectedM = motivosFiltrados.find(m => m.id === selectedMotivoId);
                                if (motivosFiltrados.length === 0) return (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">No hay motivos configurados para este tipo. Creá uno en el tab "Motivos".</p>
                                    </div>
                                );
                                return (
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                            <Tag size={12} className={!isSusp ? "text-purple-400" : "text-rose-400"} />
                                            Motivo <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={selectedMotivoId ?? ""}
                                            onChange={e => setSelectedMotivoId(e.target.value ? Number(e.target.value) : null)}
                                            className={`w-full h-10 px-3 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2
                                                ${!selectedMotivoId ? "border-rose-300 dark:border-rose-700" : "border-slate-200 dark:border-slate-700"}
                                                ${!isSusp ? "focus:ring-purple-300/50" : "focus:ring-rose-300/50"}`}
                                        >
                                            <option value="">— Seleccioná un motivo —</option>
                                            {motivosFiltrados.map(m => (
                                                <option key={m.id} value={m.id}>{m.nombre}{m.aplicaMulta ? " ✓" : ""}</option>
                                            ))}
                                        </select>
                                        {selectedM?.aplicaMulta && (
                                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                                                <CheckCircle2 size={11} /> Este motivo cobrará un cargo al rehabilitar basado en el valor del JUS.
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}
                            {(modalSusp.targetStatus === "suspended" || modalSusp.targetStatus === "cancelled") && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Fecha de inicio <span className="text-slate-400 font-normal">(opc.)</span></label>
                                        <input
                                            type="date"
                                            value={fechaInicio}
                                            onChange={e => setFechaInicio(e.target.value)}
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/50"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Fecha de fin <span className="text-slate-400 font-normal">(opc.)</span></label>
                                        <input
                                            type="date"
                                            value={fechaFin}
                                            min={fechaInicio || undefined}
                                            onChange={e => setFechaFin(e.target.value)}
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/50"
                                        />
                                    </div>
                                </div>
                            )}
                            {fechaFin && (
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                                    <ShieldCheck size={11} /> El matriculado se habilitará automáticamente al vencer el plazo.
                                </p>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Comentario <span className="text-rose-500">*</span></label>
                                <textarea ref={suspTextareaRef} value={comentario} onChange={e => setComentario(e.target.value)} rows={4}
                                    placeholder={modalSusp.targetStatus === "suspended" ? "Ej: Deuda vencida pendiente de pago..." : modalSusp.targetStatus === "cancelled" ? "Ej: Baja voluntaria..." : "Ej: Regularizó situación..."}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/50 resize-none" />
                                <p className="text-[10px] text-slate-400">Quedará registrado con fecha y hora.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 px-5 pb-5">
                            <button onClick={() => { setModalSusp(null); setComentario(""); setSelectedMotivoId(null); setFechaInicio(""); setFechaFin(""); }} className="flex-1 h-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancelar</button>
                            <button onClick={confirmarSuspension} disabled={guardando || !comentario.trim() || (modalSusp.targetStatus === "suspended" && !selectedMotivoId)}
                                className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-bold disabled:opacity-50 transition-all text-white
                                    ${modalSusp.targetStatus === "suspended" ? "bg-rose-500 hover:bg-rose-600"
                                    : modalSusp.targetStatus === "cancelled" ? "bg-purple-600 hover:bg-purple-700"
                                    : "bg-emerald-500 hover:bg-emerald-600"}`}>
                                {guardando ? <Loader2 size={14} className="animate-spin" />
                                : modalSusp.targetStatus === "suspended" ? <><ShieldOff size={14} /> Confirmar suspensión</>
                                : modalSusp.targetStatus === "cancelled" ? <><XCircle size={14} /> Confirmar cancelación</>
                                : <><ShieldCheck size={14} /> Confirmar habilitación</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL REHABILITACIÓN ──────────────────────────────────── */}
            {modalRehab && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setModalRehab(null); setRespuesta(""); }}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 rounded-t-2xl
                            ${modalRehab.accion === "aprobar" ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "bg-rose-50/50 dark:bg-rose-950/20"}`}>
                            <div>
                                <p className={`text-[14px] font-bold flex items-center gap-2 ${modalRehab.accion === "aprobar" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                                    {modalRehab.accion === "aprobar" ? <><ShieldCheck size={15} /> Aprobar rehabilitación</> : <><XCircle size={15} /> Rechazar solicitud</>}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">{modalRehab.apellido}, {modalRehab.nombre}</p>
                            </div>
                            <button onClick={() => { setModalRehab(null); setRespuesta(""); }} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"><X size={15} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {modalRehab.accion === "aprobar" && (
                                <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                    <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Al aprobar, la matrícula se habilitará automáticamente y se registrará en el historial.</p>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Respuesta <span className="text-rose-500">*</span></label>
                                <textarea ref={rehabTextareaRef} value={respuesta} onChange={e => setRespuesta(e.target.value)} rows={4}
                                    placeholder={modalRehab.accion === "aprobar"
                                        ? "Ej: Se aprueba la rehabilitación una vez regularizada la situación..."
                                        : "Ej: Se rechaza la solicitud debido a que..."}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-300/50 resize-none" />
                                <p className="text-[10px] text-slate-400">Esta respuesta será visible para el matriculado.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 px-5 pb-5">
                            <button onClick={() => { setModalRehab(null); setRespuesta(""); }} className="flex-1 h-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancelar</button>
                            <button onClick={confirmarRehab} disabled={procesando || !respuesta.trim()}
                                className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-bold disabled:opacity-50 transition-all text-white ${modalRehab.accion === "aprobar" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}`}>
                                {procesando ? <Loader2 size={14} className="animate-spin" /> : modalRehab.accion === "aprobar" ? <><ShieldCheck size={14} /> Aprobar y habilitar</> : <><XCircle size={14} /> Confirmar rechazo</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style jsx global>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to   { transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.25s cubic-bezier(0.16,1,0.3,1) forwards;
                }
            `}</style>
        </div>
    );
}
