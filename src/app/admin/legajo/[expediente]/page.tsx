"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
    ChevronLeft,
    User,
    ClipboardList,
    ShieldOff,
    Scale,
    Loader2,
    AlertCircle,
    HandshakeIcon,
    Trash2,
    Plus,
    Check,
    X,
} from "lucide-react";

const FIELD_LABELS: Record<string, string> = {
    apellido: "Apellido",
    nombre: "Nombre",
    documento: "DNI",
    cuil: "CUIL",
    folio: "Folio",
    tomo: "Tomo",
    tipo: "Tipo",
    fechaMatriculacion: "Fecha Matric.",
    domicilioLegal: "Domicilio Legal",
    postalLegal: "CP Legal",
    localidadLegal: "Localidad Legal",
    telefonosLegal: "Teléfono Legal",
    codMovilLegal: "Cód. Móvil Legal",
    movilLegal: "Móvil Legal",
    emailLegal: "Email Legal",
    domicilioReal: "Domicilio Real",
    postalReal: "CP Real",
    localidadReal: "Localidad Real",
    provinciaReal: "Provincia Real",
    telefonosReal: "Teléfono Real",
    codMovilReal: "Cód. Móvil Real",
    movilReal: "Móvil Real",
    emailReal: "Email Real",
};

const DATO_FIELDS = [
    "apellido", "nombre", "documento", "cuil", "folio", "tomo", "tipo", "fechaMatriculacion",
    "domicilioLegal", "postalLegal", "localidadLegal", "telefonosLegal", "codMovilLegal", "movilLegal", "emailLegal",
    "domicilioReal", "postalReal", "localidadReal", "provinciaReal", "telefonosReal", "codMovilReal", "movilReal", "emailReal",
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    active: { label: "Activo", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    suspended: { label: "Suspendido", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    cancelled: { label: "Cancelado", cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
};

const ACCION_BADGE: Record<string, { label: string; cls: string }> = {
    suspension: { label: "Suspensión", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    cancelacion: { label: "Cancelación", cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
    habilitacion: { label: "Habilitación", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

interface Dato {
    [key: string]: string | number | null | undefined;
    fechaMatriculacion?: string | null;
}

interface UserData {
    status: string;
    createdAt: string;
    registered: number;
}

interface CambioDato {
    id: number;
    expediente: string;
    campos: Record<string, { anterior: string; nuevo: string }>;
    leido: boolean;
    createdAt: string;
}

interface HistorialItem {
    id: number;
    accion: string;
    comentario: string;
    motivoNombre: string | null;
    fechaInicio: string | null;
    fechaFin: string | null;
    adminNombre: string | null;
    createdAt: string;
}

interface TribunalItem {
    id: number;
    texto: string;
    inicio: string;
    fin: string;
    createdAt: string;
}

interface FiadorPersona {
    id: number;
    expediente: string;
    apellido: string | null;
    nombre: string | null;
}

interface FiadorData {
    misFiador: FiadorPersona | null;
    avalaA: FiadorPersona[];
}

interface LegajoData {
    dato: Dato | null;
    user: UserData | null;
    cambioDatos: CambioDato[];
    historialMatricula: HistorialItem[];
    tribunalEtica: TribunalItem[];
    fiador: FiadorData;
}

type Tab = "datos" | "cambios" | "historial" | "tribunal" | "fiador";

function fmt(d: string) {
    return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtFull(d: string) {
    return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

// Para campos de fecha "pura" (sin hora), guardados como medianoche UTC: se muestran en UTC
// para no correr un día hacia atrás en usuarios con huso horario negativo (Argentina, UTC-3).
function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDateFull(d: string) {
    return new Date(d).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric" });
}

export default function LegajoDetallePage({
    params,
}: {
    params: Promise<{ expediente: string }>;
}) {
    const { expediente } = use(params);
    const [data, setData] = useState<LegajoData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState<Tab>("datos");
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [asignarInput, setAsignarInput] = useState("");
    const [asignarLoading, setAsignarLoading] = useState(false);
    const [asignarError, setAsignarError] = useState("");
    const [avalaInput, setAvalaInput] = useState("");
    const [avalaLoading, setAvalaLoading] = useState(false);
    const [avalaError, setAvalaError] = useState("");
    const [deletingHistorialId, setDeletingHistorialId] = useState<number | null>(null);
    const [deletingTribunalId, setDeletingTribunalId] = useState<number | null>(null);

    useEffect(() => {
        fetch(`/api/admin/legajo/${expediente}`)
            .then((r) => r.json())
            .then((d) => setData(d))
            .catch(() => setError("Error al cargar el legajo"))
            .finally(() => setLoading(false));
    }, [expediente]);

    async function handleAsignarFiador() {
        const fExp = asignarInput.trim();
        if (!fExp) return;
        setAsignarLoading(true);
        setAsignarError("");
        try {
            const res = await fetch("/api/admin/fiadores", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expediente, fiadorExpediente: fExp }),
            });
            const json = await res.json();
            if (!res.ok) {
                setAsignarError(json.error ?? "Error al asignar");
                return;
            }
            setData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    fiador: {
                        ...prev.fiador,
                        misFiador: { id: json.id, expediente: json.expediente, apellido: json.apellido, nombre: json.nombre },
                    },
                };
            });
            setAsignarInput("");
        } finally {
            setAsignarLoading(false);
        }
    }

    async function handleAgregarAvala() {
        const aExp = avalaInput.trim();
        if (!aExp) return;
        setAvalaLoading(true);
        setAvalaError("");
        try {
            const res = await fetch("/api/admin/fiadores", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expediente: aExp, fiadorExpediente: expediente }),
            });
            const json = await res.json();
            if (!res.ok) {
                setAvalaError(json.error ?? "Error al asignar");
                return;
            }
            setData((prev) => {
                if (!prev) return prev;
                const yaExiste = prev.fiador.avalaA.some(a => a.expediente === aExp);
                if (yaExiste) return prev;
                return {
                    ...prev,
                    fiador: {
                        ...prev.fiador,
                        avalaA: [...prev.fiador.avalaA, { id: json.id, expediente: aExp, apellido: json.apellido, nombre: json.nombre }],
                    },
                };
            });
            setAvalaInput("");
        } finally {
            setAvalaLoading(false);
        }
    }

    async function handleDeleteHistorial(id: number) {
        if (!confirm("¿Eliminar este registro del historial de matrícula?")) return;
        setDeletingHistorialId(id);
        try {
            const res = await fetch(`/api/admin/suspensiones/historial/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                alert(j.error ?? "No se pudo eliminar el registro");
                return;
            }
            setData((prev) => prev ? { ...prev, historialMatricula: prev.historialMatricula.filter(h => h.id !== id) } : prev);
        } finally {
            setDeletingHistorialId(null);
        }
    }

    async function handleDeleteTribunal(id: number) {
        if (!confirm("¿Eliminar este registro del Tribunal de Ética?")) return;
        setDeletingTribunalId(id);
        try {
            const res = await fetch("/api/admin/tribunal-etica", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                alert(j.error ?? "No se pudo eliminar el registro");
                return;
            }
            setData((prev) => prev ? { ...prev, tribunalEtica: prev.tribunalEtica.filter(t => t.id !== id) } : prev);
        } finally {
            setDeletingTribunalId(null);
        }
    }

    async function handleDeleteFiador(id: number) {
        if (!confirm("¿Eliminar esta relación de fiador?")) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/admin/fiadores/${id}`, { method: "DELETE" });
            if (res.ok) {
                setData((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        fiador: {
                            misFiador: prev.fiador.misFiador?.id === id ? null : prev.fiador.misFiador,
                            avalaA: prev.fiador.avalaA.filter((a) => a.id !== id),
                        },
                    };
                });
            }
        } finally {
            setDeletingId(null);
        }
    }

    const nombre = data?.dato
        ? `${data.dato.apellido}, ${data.dato.nombre}`
        : expediente;

    const fiadorCount = data ? (data.fiador.misFiador ? 1 : 0) + data.fiador.avalaA.length : 0;

    const tabs = [
        { key: "datos" as Tab, label: "Datos", icon: User, count: null },
        { key: "cambios" as Tab, label: "Modificaciones", icon: ClipboardList, count: data?.cambioDatos.length ?? 0 },
        { key: "historial" as Tab, label: "Historial Matrícula", icon: ShieldOff, count: data?.historialMatricula.length ?? 0 },
        { key: "tribunal" as Tab, label: "Tribunal de Ética", icon: Scale, count: data?.tribunalEtica.length ?? 0 },
        { key: "fiador" as Tab, label: "Fiador", icon: HandshakeIcon, count: fiadorCount },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#02182b]">
            {/* Header */}
            <div className="sticky top-16 z-10 bg-white/80 dark:bg-[#02182b]/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 md:px-10 py-3.5">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/legajo"
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                    >
                        <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Legajo</p>
                        <h1 className="text-[15px] font-bold text-slate-800 dark:text-white truncate">{nombre}</h1>
                    </div>
                    {data?.user?.status && (
                        <span className={`px-3 py-1 rounded-xl text-[11px] font-bold ${STATUS_BADGE[data.user.status]?.cls ?? ""}`}>
                            {STATUS_BADGE[data.user.status]?.label ?? data.user.status}
                        </span>
                    )}
                    {!data?.user && !loading && (
                        <span className="px-3 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Sin cuenta SGO
                        </span>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 mt-3 -mb-px">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-[12px] font-semibold border-b-2 transition-all ${
                                tab === t.key
                                    ? "text-[#063f68] dark:text-blue-400 border-[#063f68] dark:border-blue-400 bg-[#063f68]/5"
                                    : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-white"
                            }`}
                        >
                            <t.icon size={13} />
                            {t.label}
                            {t.count != null && t.count > 0 && (
                                <span className={`ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black flex items-center justify-center ${
                                    tab === t.key ? "bg-[#063f68] text-white dark:bg-blue-400" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                }`}>
                                    {t.count > 99 ? "99+" : t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-10">
                {loading && (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 size={28} className="animate-spin text-slate-300" />
                    </div>
                )}
                {error && (
                    <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl text-rose-600 dark:text-rose-400">
                        <AlertCircle size={18} />
                        <p className="text-[13px]">{error}</p>
                    </div>
                )}

                {!loading && data && (
                    <>
                        {/* ── TAB DATOS ── */}
                        {tab === "datos" && (
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Datos personales / registro */}
                                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Datos del registro</p>
                                    <dl className="space-y-3">
                                        {DATO_FIELDS.map((field) => {
                                            const val = data.dato?.[field];
                                            if (!val && field !== "apellido" && field !== "nombre") return null;
                                            let display = val != null ? String(val) : "—";
                                            if (field === "fechaMatriculacion" && val) {
                                                display = fmtDate(String(val));
                                            }
                                            return (
                                                <div key={field} className="flex items-start gap-3">
                                                    <dt className="text-[11px] text-slate-400 min-w-[130px] pt-0.5 flex-shrink-0">{FIELD_LABELS[field] ?? field}</dt>
                                                    <dd className="text-[13px] text-slate-700 dark:text-slate-200 font-medium break-words">{display}</dd>
                                                </div>
                                            );
                                        })}
                                    </dl>
                                </div>

                                {/* Cuenta SGO */}
                                <div className="space-y-4">
                                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Cuenta SGO</p>
                                        {data.user ? (
                                            <dl className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <dt className="text-[11px] text-slate-400 min-w-[130px]">Estado</dt>
                                                    <dd>
                                                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold ${STATUS_BADGE[data.user.status]?.cls ?? ""}`}>
                                                            {STATUS_BADGE[data.user.status]?.label ?? data.user.status}
                                                        </span>
                                                    </dd>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <dt className="text-[11px] text-slate-400 min-w-[130px]">Registrado</dt>
                                                    <dd className="text-[13px] text-slate-700 dark:text-slate-200">{fmt(data.user.createdAt)}</dd>
                                                </div>
                                            </dl>
                                        ) : (
                                            <p className="text-[13px] text-slate-400">Este abogado aún no creó su cuenta en SGO.</p>
                                        )}
                                    </div>

                                    {/* Quick stats */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-center">
                                            <p className="text-2xl font-black text-slate-800 dark:text-white">{data.cambioDatos.length}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">Modif. datos</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-center">
                                            <p className="text-2xl font-black text-slate-800 dark:text-white">{data.historialMatricula.length}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">Hist. matríc.</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-center">
                                            <p className="text-2xl font-black text-slate-800 dark:text-white">{data.tribunalEtica.length}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">Tribunal</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TAB MODIFICACIONES ── */}
                        {tab === "cambios" && (
                            <div className="space-y-4">
                                {data.cambioDatos.length === 0 ? (
                                    <EmptyState text="Sin modificaciones de datos registradas" />
                                ) : (
                                    data.cambioDatos.map((c) => (
                                        <div key={c.id} className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-[11px] text-slate-400">{fmtFull(c.createdAt)}</p>
                                                {!c.leido && (
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-[9px] font-bold uppercase tracking-widest">
                                                        Nuevo
                                                    </span>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                {Object.entries(c.campos as Record<string, { anterior: string; nuevo: string }>).map(([field, val]) => (
                                                    <div key={field} className="grid grid-cols-[140px_1fr_1fr] gap-3 text-[12px]">
                                                        <span className="text-slate-400 font-medium">{FIELD_LABELS[field] ?? field}</span>
                                                        <span className="text-rose-500 dark:text-rose-400 line-through truncate">{val.anterior || "—"}</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate">{val.nuevo || "—"}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ── TAB HISTORIAL MATRÍCULA ── */}
                        {tab === "historial" && (
                            <div className="space-y-4">
                                {data.historialMatricula.length === 0 ? (
                                    <EmptyState text="Sin historial de matrícula registrado" />
                                ) : (
                                    <div className="relative">
                                        <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-100 dark:bg-slate-800" />
                                        <div className="space-y-4">
                                            {data.historialMatricula.map((h) => {
                                                const badge = ACCION_BADGE[h.accion] ?? { label: h.accion, cls: "bg-slate-100 text-slate-600" };
                                                return (
                                                    <div key={h.id} className="flex gap-4">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-[11px] font-black border-2 border-white dark:border-[#02182b] ${badge.cls}`}>
                                                            {h.accion === "habilitacion" ? "✓" : h.accion === "suspension" ? "!" : "✕"}
                                                        </div>
                                                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 group">
                                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${badge.cls}`}>
                                                                    {badge.label}
                                                                </span>
                                                                {h.motivoNombre && (
                                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">· {h.motivoNombre}</span>
                                                                )}
                                                                <span className="ml-auto text-[11px] text-slate-400">{fmtFull(h.createdAt)}</span>
                                                                <button
                                                                    onClick={() => handleDeleteHistorial(h.id)}
                                                                    disabled={deletingHistorialId === h.id}
                                                                    className="p-1.5 rounded-lg text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
                                                                    title="Eliminar registro"
                                                                >
                                                                    {deletingHistorialId === h.id
                                                                        ? <Loader2 size={13} className="animate-spin" />
                                                                        : <Trash2 size={13} />
                                                                    }
                                                                </button>
                                                            </div>
                                                            {h.comentario && (
                                                                <p className="text-[13px] text-slate-700 dark:text-slate-300 mb-2">{h.comentario}</p>
                                                            )}
                                                            <div className="flex flex-wrap gap-4 text-[11px] text-slate-400">
                                                                {h.fechaInicio && (
                                                                    <span>Desde: <strong className="text-slate-600 dark:text-slate-300">{fmtDate(h.fechaInicio)}</strong></span>
                                                                )}
                                                                {h.fechaFin && (
                                                                    <span>Hasta: <strong className="text-slate-600 dark:text-slate-300">{fmtDate(h.fechaFin)}</strong></span>
                                                                )}
                                                                {h.adminNombre && (
                                                                    <span>Admin: <strong className="text-slate-600 dark:text-slate-300">{h.adminNombre}</strong></span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── TAB TRIBUNAL DE ÉTICA ── */}
                        {tab === "tribunal" && (
                            <div className="space-y-4">
                                {data.tribunalEtica.length === 0 ? (
                                    <EmptyState text="Sin registros del Tribunal de Ética" />
                                ) : (
                                    data.tribunalEtica.map((t) => (
                                        <div key={t.id} className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 group">
                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 flex items-center gap-1.5">
                                                    <Scale size={11} /> Tribunal de Ética
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    {fmtDateFull(t.inicio)} — {fmtDateFull(t.fin)}
                                                </span>
                                                <span className="ml-auto text-[10px] text-slate-300">Registrado: {fmt(t.createdAt)}</span>
                                                <button
                                                    onClick={() => handleDeleteTribunal(t.id)}
                                                    disabled={deletingTribunalId === t.id}
                                                    className="p-1.5 rounded-lg text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
                                                    title="Eliminar registro"
                                                >
                                                    {deletingTribunalId === t.id
                                                        ? <Loader2 size={13} className="animate-spin" />
                                                        : <Trash2 size={13} />
                                                    }
                                                </button>
                                            </div>
                                            <p className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{t.texto}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ── TAB FIADOR ── */}
                        {tab === "fiador" && (
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Su fiador */}
                                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 space-y-4">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Su fiador</p>

                                    {data.fiador.misFiador ? (
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[13px] font-bold text-slate-800 dark:text-white">
                                                    {data.fiador.misFiador.apellido && data.fiador.misFiador.nombre
                                                        ? `${data.fiador.misFiador.apellido}, ${data.fiador.misFiador.nombre}`
                                                        : "Sin datos en el sistema"}
                                                </p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">Exp. {data.fiador.misFiador.expediente}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteFiador(data.fiador.misFiador!.id)}
                                                disabled={deletingId === data.fiador.misFiador.id}
                                                className="p-2 rounded-xl text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-all disabled:opacity-40"
                                                title="Eliminar fiador"
                                            >
                                                {deletingId === data.fiador.misFiador.id
                                                    ? <Loader2 size={15} className="animate-spin" />
                                                    : <Trash2 size={15} />
                                                }
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-[12px] text-slate-400">Sin fiador asignado.</p>
                                    )}

                                    {/* Asignar / reemplazar */}
                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                                            {data.fiador.misFiador ? "Reemplazar fiador" : "Asignar fiador"}
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={asignarInput}
                                                onChange={e => { setAsignarInput(e.target.value); setAsignarError(""); }}
                                                onKeyDown={e => e.key === "Enter" && handleAsignarFiador()}
                                                placeholder="Expediente del fiador"
                                                className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#063f68] dark:focus:border-blue-400 transition-colors"
                                            />
                                            <button
                                                onClick={handleAsignarFiador}
                                                disabled={!asignarInput.trim() || asignarLoading}
                                                className="h-9 px-4 rounded-xl bg-[#063f68] text-white text-[12px] font-bold hover:bg-[#052e4e] disabled:opacity-40 transition-all flex items-center gap-1.5"
                                            >
                                                {asignarLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                                Guardar
                                            </button>
                                        </div>
                                        {asignarError && (
                                            <p className="mt-1.5 text-[11px] text-rose-500 flex items-center gap-1">
                                                <X size={11} /> {asignarError}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Es fiador de */}
                                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 space-y-4">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Es fiador de
                                    </p>
                                    {data.fiador.avalaA.length === 0 ? (
                                        <p className="text-[12px] text-slate-400">No avala a ningún matriculado.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {data.fiador.avalaA.map((a) => (
                                                <div key={a.id} className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-[13px] font-bold text-slate-800 dark:text-white">
                                                            {a.apellido && a.nombre
                                                                ? `${a.apellido}, ${a.nombre}`
                                                                : "Sin datos en el sistema"}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">Exp. {a.expediente}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteFiador(a.id)}
                                                        disabled={deletingId === a.id}
                                                        className="p-2 rounded-xl text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-all disabled:opacity-40"
                                                        title="Eliminar relación"
                                                    >
                                                        {deletingId === a.id
                                                            ? <Loader2 size={15} className="animate-spin" />
                                                            : <Trash2 size={15} />
                                                        }
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Agregar avalado */}
                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                                            Agregar avalado
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={avalaInput}
                                                onChange={e => { setAvalaInput(e.target.value); setAvalaError(""); }}
                                                onKeyDown={e => e.key === "Enter" && handleAgregarAvala()}
                                                placeholder="Expediente del matriculado"
                                                className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#063f68] dark:focus:border-blue-400 transition-colors"
                                            />
                                            <button
                                                onClick={handleAgregarAvala}
                                                disabled={!avalaInput.trim() || avalaLoading}
                                                className="h-9 px-4 rounded-xl bg-[#063f68] text-white text-[12px] font-bold hover:bg-[#052e4e] disabled:opacity-40 transition-all flex items-center gap-1.5"
                                            >
                                                {avalaLoading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                                                Agregar
                                            </button>
                                        </div>
                                        {avalaError && (
                                            <p className="mt-1.5 text-[11px] text-rose-500 flex items-center gap-1">
                                                <X size={11} /> {avalaError}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle size={32} className="mb-3 opacity-30" />
            <p className="text-[13px]">{text}</p>
        </div>
    );
}
