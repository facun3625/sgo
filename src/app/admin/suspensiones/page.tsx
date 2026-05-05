"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
    ShieldOff, ShieldCheck, Search, Loader2, X,
    CheckCircle2, XCircle, History, ChevronDown, ChevronUp,
    AlertTriangle, Clock, RefreshCw, FileText, ChevronRight, Inbox,
} from "lucide-react";
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
    mensaje: string;
    estado: string;
    respuesta: string | null;
    adminNombre: string | null;
    createdAt: string;
}

type ModalSuspension = {
    expediente: string;
    nombre: string;
    apellido: string;
    targetStatus: "active" | "suspended";
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
    const [tab, setTab] = useState<"matriculados" | "rehabilitaciones" | "pedidos">("matriculados");

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
    const [filtroRehab, setFiltroRehab] = useState<"todos" | "pendiente" | "aprobada" | "rechazada">("pendiente");
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

    // ── Load ──

    useEffect(() => { cargarUsuarios(); }, []);

    useEffect(() => {
        if (tab === "rehabilitaciones" && !rehabCargado) cargarRehabilitaciones();
        if (tab === "pedidos" && !pedidosCargados) cargarPedidos();
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
            setUsuarios((usRes ?? []).map((u: UsuarioSuspension) => ({
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
                body: JSON.stringify({ status: modalSusp.targetStatus, comentario: comentario.trim() }),
            });
            if (!res.ok) { const e = await res.json(); showToast(e.error ?? "Error", "error"); return; }
            showToast(
                modalSusp.targetStatus === "suspended" ? `${modalSusp.apellido} suspendido` : `${modalSusp.apellido} habilitado`,
                modalSusp.targetStatus === "suspended" ? "error" : "success"
            );
            setUsuarios(prev => prev.map(u =>
                (u.expediente ?? u.cod) === key
                    ? { ...u, status: modalSusp.targetStatus, ultimaAccion: { accion: modalSusp.targetStatus === "suspended" ? "suspension" : "habilitacion", comentario: comentario.trim(), adminNombre: null, createdAt: new Date().toISOString() } }
                    : u
            ));
            setHistorialMap(prev => { const n = { ...prev }; delete n[key]; return n; });
            setModalSusp(null); setComentario("");
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
            return u.apellido.toLowerCase().includes(q) || u.nombre.toLowerCase().includes(q) || (u.expediente ?? "").toLowerCase().includes(q);
        });
    }, [usuarios, search, filtro]);

    const solicitudesFiltradas = useMemo(() =>
        filtroRehab === "todos" ? solicitudes : solicitudes.filter(s => s.estado === filtroRehab),
        [solicitudes, filtroRehab]
    );

    const pendientesCount = solicitudes.filter(s => s.estado === "pendiente").length;
    const totalSuspendidos = usuarios.filter(u => u.status === "suspended").length;

    const pedidosFiltrados = useMemo(() =>
        filtroPedidos === "todos" ? pedidos : pedidos.filter(p => p.estado === filtroPedidos),
        [pedidos, filtroPedidos]
    );
    const pedidosCount = pedidos.filter(p => p.estado === "pendiente").length;

    return (
        <div className="p-6 md:p-10 space-y-6">

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
                        </div>
                    </div>

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
                                                    <button
                                                        onClick={() => { setModalSusp({ expediente: key, nombre: u.nombre, apellido: u.apellido, targetStatus: isSuspended ? "active" : "suspended" }); setComentario(""); }}
                                                        className={`flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-bold border transition-all
                                                            ${isSuspended
                                                                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                                                                : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100"}`}>
                                                        {isSuspended ? <><ShieldCheck size={12} /> Habilitar</> : <><ShieldOff size={12} /> Suspender</>}
                                                    </button>
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
                            {(["pendiente", "todos", "aprobada", "rechazada"] as const).map(f => (
                                <button key={f} onClick={() => setFiltroRehab(f)}
                                    className={`px-3 h-9 rounded-xl text-[12px] font-semibold border transition-all
                                        ${filtroRehab === f
                                            ? f === "rechazada" ? "bg-rose-500 border-rose-500 text-white"
                                                : f === "aprobada" ? "bg-emerald-500 border-emerald-500 text-white"
                                                : f === "pendiente" ? "bg-amber-500 border-amber-500 text-white"
                                                : "bg-[#063f68] border-[#063f68] text-white"
                                            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                                    {f === "todos" ? "Todas" : f === "pendiente" ? "Pendientes" : f === "aprobada" ? "Aprobadas" : "Rechazadas"}
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
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                            <p className="text-[13px] font-bold text-slate-800 dark:text-white">{s.apellido}, {s.nombre}</p>
                                            <p className="text-[11px] text-slate-400 font-mono">{s.expediente}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                                <Clock size={9} /> {fmtFecha(s.createdAt)}
                                            </p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold
                                            ${s.estado === "pendiente" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                                : s.estado === "aprobada" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"}`}>
                                            {s.estado === "pendiente" ? <Clock size={11} /> : s.estado === "aprobada" ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                                            {s.estado === "pendiente" ? "Pendiente" : s.estado === "aprobada" ? "Aprobada" : "Rechazada"}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Mensaje del matriculado</p>
                                        <p className="text-[13px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-xl p-4 leading-relaxed">{s.mensaje}</p>
                                    </div>

                                    {s.respuesta && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                                                Respuesta {s.adminNombre && <span className="font-normal normal-case">— {s.adminNombre}</span>}
                                            </p>
                                            <p className={`text-[13px] rounded-xl p-4 leading-relaxed border
                                                ${s.estado === "aprobada"
                                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800"
                                                    : "bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 border-rose-100 dark:border-rose-800"}`}>
                                                {s.respuesta}
                                            </p>
                                        </div>
                                    )}

                                    {s.estado === "pendiente" && (
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={() => { setModalRehab({ id: s.id, expediente: s.expediente, nombre: s.nombre, apellido: s.apellido, accion: "aprobar" }); setRespuesta(""); }}
                                                className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-[12px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all">
                                                <ShieldCheck size={13} /> Aprobar y habilitar
                                            </button>
                                            <button
                                                onClick={() => { setModalRehab({ id: s.id, expediente: s.expediente, nombre: s.nombre, apellido: s.apellido, accion: "rechazar" }); setRespuesta(""); }}
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

            {/* ── MODAL SUSPENSIÓN/HABILITACIÓN ──────────────────────────── */}
            {modalSusp && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setModalSusp(null); setComentario(""); }}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 rounded-t-2xl
                            ${modalSusp.targetStatus === "suspended" ? "bg-rose-50/50 dark:bg-rose-950/20" : "bg-emerald-50/50 dark:bg-emerald-950/20"}`}>
                            <div>
                                <p className={`text-[14px] font-bold flex items-center gap-2 ${modalSusp.targetStatus === "suspended" ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                                    {modalSusp.targetStatus === "suspended" ? <><ShieldOff size={15} /> Suspender matrícula</> : <><ShieldCheck size={15} /> Habilitar matrícula</>}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">{modalSusp.apellido}, {modalSusp.nombre}</p>
                            </div>
                            <button onClick={() => { setModalSusp(null); setComentario(""); }} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"><X size={15} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {modalSusp.targetStatus === "suspended" && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">El matriculado verá su acceso restringido mientras esté suspendido.</p>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Motivo / Comentario <span className="text-rose-500">*</span></label>
                                <textarea ref={suspTextareaRef} value={comentario} onChange={e => setComentario(e.target.value)} rows={4}
                                    placeholder={modalSusp.targetStatus === "suspended" ? "Ej: Deuda pendiente de pago..." : "Ej: Regularizó situación..."}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-300/50 resize-none" />
                                <p className="text-[10px] text-slate-400">Quedará registrado con fecha y hora.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 px-5 pb-5">
                            <button onClick={() => { setModalSusp(null); setComentario(""); }} className="flex-1 h-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancelar</button>
                            <button onClick={confirmarSuspension} disabled={guardando || !comentario.trim()}
                                className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-bold disabled:opacity-50 transition-all text-white ${modalSusp.targetStatus === "suspended" ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"}`}>
                                {guardando ? <Loader2 size={14} className="animate-spin" /> : modalSusp.targetStatus === "suspended" ? <><ShieldOff size={14} /> Confirmar suspensión</> : <><ShieldCheck size={14} /> Confirmar habilitación</>}
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
