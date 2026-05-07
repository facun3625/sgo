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
    suspendedUntil: string | null;
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

interface LegajoData {
    dato: Dato | null;
    user: UserData | null;
    cambioDatos: CambioDato[];
    historialMatricula: HistorialItem[];
    tribunalEtica: TribunalItem[];
}

type Tab = "datos" | "cambios" | "historial" | "tribunal";

function fmt(d: string) {
    return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtFull(d: string) {
    return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
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

    useEffect(() => {
        fetch(`/api/admin/legajo/${expediente}`)
            .then((r) => r.json())
            .then((d) => setData(d))
            .catch(() => setError("Error al cargar el legajo"))
            .finally(() => setLoading(false));
    }, [expediente]);

    const nombre = data?.dato
        ? `${data.dato.apellido}, ${data.dato.nombre}`
        : expediente;

    const tabs = [
        { key: "datos" as Tab, label: "Datos", icon: User, count: null },
        { key: "cambios" as Tab, label: "Modificaciones", icon: ClipboardList, count: data?.cambioDatos.length ?? 0 },
        { key: "historial" as Tab, label: "Historial Matrícula", icon: ShieldOff, count: data?.historialMatricula.length ?? 0 },
        { key: "tribunal" as Tab, label: "Tribunal de Ética", icon: Scale, count: data?.tribunalEtica.length ?? 0 },
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
                                                display = fmt(String(val));
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
                                                {data.user.suspendedUntil && (
                                                    <div className="flex items-center gap-3">
                                                        <dt className="text-[11px] text-slate-400 min-w-[130px]">Suspendido hasta</dt>
                                                        <dd className="text-[13px] text-amber-600 dark:text-amber-400 font-medium">{fmt(data.user.suspendedUntil)}</dd>
                                                    </div>
                                                )}
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
                                                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${badge.cls}`}>
                                                                    {badge.label}
                                                                </span>
                                                                {h.motivoNombre && (
                                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">· {h.motivoNombre}</span>
                                                                )}
                                                                <span className="ml-auto text-[11px] text-slate-400">{fmtFull(h.createdAt)}</span>
                                                            </div>
                                                            {h.comentario && (
                                                                <p className="text-[13px] text-slate-700 dark:text-slate-300 mb-2">{h.comentario}</p>
                                                            )}
                                                            <div className="flex flex-wrap gap-4 text-[11px] text-slate-400">
                                                                {h.fechaInicio && (
                                                                    <span>Desde: <strong className="text-slate-600 dark:text-slate-300">{fmt(h.fechaInicio)}</strong></span>
                                                                )}
                                                                {h.fechaFin && (
                                                                    <span>Hasta: <strong className="text-slate-600 dark:text-slate-300">{fmt(h.fechaFin)}</strong></span>
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
                                        <div key={t.id} className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 flex items-center gap-1.5">
                                                    <Scale size={11} /> Tribunal de Ética
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    {fmtFull(t.inicio)} — {fmtFull(t.fin)}
                                                </span>
                                                <span className="ml-auto text-[10px] text-slate-300">Registrado: {fmt(t.createdAt)}</span>
                                            </div>
                                            <p className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{t.texto}</p>
                                        </div>
                                    ))
                                )}
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
