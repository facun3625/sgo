"use client";
import { useState, useEffect, useMemo } from "react";
import { Search, Loader2, User, AlertTriangle, CheckCircle2, Wallet, X, Eye, Banknote, ShieldAlert, Home, ChevronDown, History, Download, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { exportarCobrosExcel } from "@/lib/exportCobrosExcel";

interface UsuarioLista {
    cod: string;
    expediente: string | null;
    nombre: string;
    apellido: string;
    deudaTotal: number;
}

type FiltroDeuda = "todos" | "con_deuda" | "sin_deuda";
const PAGE_SIZE = 50;

interface DatoCompleto {
    nombre: string; apellido: string; expediente: string | null; cod: string;
    documento: string | null; cuil: string | null; folio: string | null; tomo: string | null;
    fechaMatriculacion: string | null;
    domicilioLegal: string | null; postalLegal: string | null; localidadLegal: string | null;
    telefonosLegal: string | null; emailLegal: string | null; codMovilLegal: string | null; movilLegal: string | null;
    domicilioReal: string | null; postalReal: string | null; localidadReal: string | null; provinciaReal: string | null;
    telefonosReal: string | null; emailReal: string | null; codMovilReal: string | null; movilReal: string | null;
}

interface MatriculadoDetalle {
    dato: DatoCompleto;
    deuda: { total: number; comprobantes: { fechaVencimiento: string; monto: number }[] };
    cuotaActual: { id: number; periodo: string; monto: number; estado: string } | null;
    showPagoAnual: boolean;
    montoAnual: number;
    hasPagoAnualActivo: boolean;
}

type TipoCobro = "cuota_mensual" | "matricula_anual" | "deuda";

interface CobroFila {
    tipo: TipoCobro;
    expediente: string;
    nombre: string;
    apellido: string;
    monto: number;
    fecha: string | null;
    comprobante: string | null;
}

const LABEL_TIPO_COBRO: Record<TipoCobro, string> = {
    cuota_mensual: "Cuota mensual",
    matricula_anual: "Matrícula anual",
    deuda: "Deuda vencida",
};

function mesActual() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function fmtFechaUTC(iso: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return `${d.getUTCDate().toString().padStart(2, "0")}/${(d.getUTCMonth() + 1).toString().padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function DisplayField({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">{label}</label>
            <div className="w-full h-10 px-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                {value || <span className="text-slate-300 dark:text-slate-600">--</span>}
            </div>
        </div>
    );
}

export default function CobrarDelegacionPage() {
    const { showToast } = useToast();
    const [tab, setTab] = useState<"cobrar" | "historial">("cobrar");
    const [usuarios, setUsuarios] = useState<UsuarioLista[]>([]);
    const [loadingLista, setLoadingLista] = useState(true);
    const [sinZonaConfigurada, setSinZonaConfigurada] = useState(false);
    const [search, setSearch] = useState("");
    const [filtroDeuda, setFiltroDeuda] = useState<FiltroDeuda>("todos");
    const [page, setPage] = useState(0);

    const [mesHistorial, setMesHistorial] = useState(mesActual());
    const [historial, setHistorial] = useState<CobroFila[]>([]);
    const [totalHistorial, setTotalHistorial] = useState(0);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    const [seleccionado, setSeleccionado] = useState<string | null>(null);
    const [detalle, setDetalle] = useState<MatriculadoDetalle | null>(null);
    const [loadingDetalle, setLoadingDetalle] = useState(false);

    const [datosAbiertos, setDatosAbiertos] = useState(false);
    const [deudaDetalleAbierto, setDeudaDetalleAbierto] = useState(false);
    const [cobroModal, setCobroModal] = useState<{ tipo: TipoCobro; monto: number; label: string } | null>(null);
    const [comprobante, setComprobante] = useState("");
    const [cobrando, setCobrando] = useState(false);

    useEffect(() => {
        fetch("/api/delegaciones/buscar")
            .then(r => r.json())
            .then(data => {
                if (data.usuarios) setUsuarios(data.usuarios);
                setSinZonaConfigurada(!!data.sinZonaConfigurada);
            })
            .finally(() => setLoadingLista(false));
    }, []);

    useEffect(() => {
        if (tab !== "historial") return;
        setLoadingHistorial(true);
        fetch(`/api/delegaciones/historial?mes=${mesHistorial}`)
            .then(r => r.json())
            .then(data => { setHistorial(data.cobros ?? []); setTotalHistorial(data.totalCobrado ?? 0); })
            .finally(() => setLoadingHistorial(false));
    }, [tab, mesHistorial]);

    const filtrados = useMemo(() => {
        const q = search.toLowerCase().trim();
        return usuarios.filter(u => {
            if (filtroDeuda === "con_deuda" && u.deudaTotal <= 0) return false;
            if (filtroDeuda === "sin_deuda" && u.deudaTotal > 0) return false;
            if (!q) return true;
            return `${u.apellido}, ${u.nombre}`.toLowerCase().includes(q) || (u.expediente || "").includes(q);
        });
    }, [usuarios, search, filtroDeuda]);

    const conDeudaCount = useMemo(() => usuarios.filter(u => u.deudaTotal > 0).length, [usuarios]);

    useEffect(() => { setPage(0); }, [search, filtroDeuda]);

    const totalPages = Math.ceil(filtrados.length / PAGE_SIZE);
    const resultados = filtrados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const cargarDetalle = async (expediente: string) => {
        setSeleccionado(expediente);
        setDetalle(null);
        setDatosAbiertos(false);
        setLoadingDetalle(true);
        try {
            const res = await fetch(`/api/delegaciones/matriculado/${encodeURIComponent(expediente)}`);
            if (res.ok) setDetalle(await res.json());
            else showToast("No se pudo cargar el matriculado", "error");
        } finally { setLoadingDetalle(false); }
    };

    const confirmarCobro = async () => {
        if (!cobroModal || !seleccionado) return;
        setCobrando(true);
        try {
            const res = await fetch("/api/delegaciones/cobrar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expediente: seleccionado, tipo: cobroModal.tipo, comprobante }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Cobro registrado", "success");
                setCobroModal(null);
                setComprobante("");
                cargarDetalle(seleccionado);
            } else {
                showToast(data.error || "Error al registrar el cobro", "error");
            }
        } finally { setCobrando(false); }
    };

    return (
        <div className="p-6 md:p-8 max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <Banknote size={20} className="text-emerald-600" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Cobro en Delegación</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Buscá un matriculado para ver sus datos, su deuda y registrar cobros en efectivo</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-0">
                <button onClick={() => setTab("cobrar")}
                    className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-t-xl transition-all border-b-2 -mb-px ${tab === "cobrar" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                    <Wallet size={14} /> Cobrar
                </button>
                <button onClick={() => setTab("historial")}
                    className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-t-xl transition-all border-b-2 -mb-px ${tab === "historial" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                    <History size={14} /> Historial
                </button>
            </div>

            {tab === "historial" ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="space-y-1.5">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Mes</p>
                            <input type="month" value={mesHistorial} onChange={e => setMesHistorial(e.target.value)}
                                className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        </div>
                        {historial.length > 0 && (
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total cobrado</p>
                                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">${totalHistorial.toLocaleString("es-AR")}</p>
                                </div>
                                <button onClick={() => exportarCobrosExcel(historial, `Cobros_${mesHistorial}.xlsx`)}
                                    className="flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold transition-all">
                                    <Download size={14} /> Exportar Excel
                                </button>
                            </div>
                        )}
                    </div>

                    {loadingHistorial ? (
                        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
                    ) : historial.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-10 text-center">
                            <p className="text-[13px] text-slate-400">No registraste cobros en este mes.</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden">
                            {historial.map((c, i) => (
                                <div key={i} className="flex items-center justify-between gap-3 px-5 py-3.5">
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-bold text-slate-800 dark:text-white truncate">{c.apellido}, {c.nombre}</p>
                                        <p className="text-[11px] text-slate-400">
                                            {LABEL_TIPO_COBRO[c.tipo]} · Exp. {c.expediente} · {c.fecha ? new Date(c.fecha).toLocaleDateString("es-AR") : "—"}
                                            {c.comprobante ? ` · N° ${c.comprobante}` : ""}
                                        </p>
                                    </div>
                                    <p className="text-[14px] font-black text-slate-800 dark:text-white whitespace-nowrap">${c.monto.toLocaleString("es-AR")}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
            <>
            {/* Buscador */}
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setDetalle(null); setSeleccionado(null); }}
                    placeholder="Buscar por nombre o expediente..."
                    className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[14px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                {loadingLista && <Loader2 size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 animate-spin" />}
            </div>

            {!loadingLista && sinZonaConfigurada && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[13px] text-amber-700 dark:text-amber-400">
                        Esta delegación todavía no tiene una subzona asignada — pedile al Colegio que la configure para poder ver matriculados.
                    </p>
                </div>
            )}

            {!seleccionado && !sinZonaConfigurada && (
                <>
                    {/* Filtro por deuda */}
                    <div className="flex gap-1.5">
                        {([
                            { key: "todos", label: `Todos (${usuarios.length})` },
                            { key: "con_deuda", label: `Con deuda (${conDeudaCount})` },
                            { key: "sin_deuda", label: `Sin deuda (${usuarios.length - conDeudaCount})` },
                        ] as { key: FiltroDeuda; label: string }[]).map(f => (
                            <button key={f.key} onClick={() => setFiltroDeuda(f.key)}
                                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border
                                    ${filtroDeuda === f.key
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {resultados.length > 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden">
                            {resultados.map(u => (
                                <button key={u.cod} onClick={() => u.expediente && cargarDetalle(u.expediente)} disabled={!u.expediente}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all disabled:opacity-40">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                                            {u.nombre[0]}{u.apellido[0]}
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-slate-800 dark:text-white">{u.apellido}, {u.nombre}</p>
                                            <p className="text-[11px] text-slate-400">{u.expediente ? `Expediente ${u.expediente}` : "Sin expediente"}</p>
                                        </div>
                                    </div>
                                    {u.deudaTotal > 0 && (
                                        <span className="flex items-center gap-1 text-[12px] font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                                            <Wallet size={11} /> ${u.deudaTotal.toLocaleString("es-AR")}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : !loadingLista && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-10 text-center">
                            <p className="text-[13px] text-slate-400">No hay matriculados que coincidan.</p>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] text-slate-400">
                                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtrados.length)} de {filtrados.length}
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">
                                    ‹
                                </button>
                                <span className="text-[11px] text-slate-500 px-1">{page + 1} / {totalPages}</span>
                                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">
                                    ›
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {loadingDetalle && (
                <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
            )}

            {detalle && (
                <div className="space-y-4">
                    <button type="button" onClick={() => { setSeleccionado(null); setDetalle(null); setDatosAbiertos(false); }}
                        className="flex items-center gap-1.5 text-[12px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <ArrowLeft size={14} /> Volver al listado
                    </button>

                    {/* Datos — acordeón solo lectura, cerrado por defecto */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <button type="button" onClick={() => setDatosAbiertos(v => !v)}
                            className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                    <User size={18} />
                                </div>
                                <div>
                                    <p className="text-[15px] font-bold text-slate-800 dark:text-white">{detalle.dato.apellido}, {detalle.dato.nombre}</p>
                                    <p className="text-[11px] text-slate-400">Expediente {detalle.dato.expediente} · N° {detalle.dato.cod}</p>
                                </div>
                            </div>
                            <ChevronDown size={18} className={`text-slate-400 transition-transform ${datosAbiertos ? "rotate-180" : ""}`} />
                        </button>

                        {datosAbiertos && (
                            <div className="px-5 pb-6 space-y-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                                {/* Datos institucionales */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-[#063f68]/10 dark:bg-blue-400/10 text-[#063f68] dark:text-blue-400 flex items-center justify-center">
                                            <ShieldAlert size={14} />
                                        </div>
                                        <h3 className="text-[13px] font-bold text-black dark:text-white tracking-tight">Datos Institucionales</h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <DisplayField label="Apellido" value={detalle.dato.apellido} />
                                        <DisplayField label="Nombre" value={detalle.dato.nombre} />
                                        <DisplayField label="Documento (DNI)" value={detalle.dato.documento} />
                                        <DisplayField label="Expediente / Matrícula" value={detalle.dato.expediente} />
                                        <DisplayField label="Folio" value={detalle.dato.folio} />
                                        <DisplayField label="Tomo" value={detalle.dato.tomo} />
                                        <DisplayField label="CUIL" value={detalle.dato.cuil} />
                                        <DisplayField label="Fecha Matriculación" value={fmtFechaUTC(detalle.dato.fechaMatriculacion)} />
                                    </div>
                                </div>

                                {/* Domicilio Legal */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-[#063f68]/10 dark:bg-blue-400/10 text-[#063f68] dark:text-blue-400 flex items-center justify-center">
                                            <Home size={14} />
                                        </div>
                                        <h3 className="text-[13px] font-bold text-black dark:text-white tracking-tight">Domicilio Legal</h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <DisplayField label="Dirección" value={detalle.dato.domicilioLegal} />
                                        <DisplayField label="Localidad" value={detalle.dato.localidadLegal} />
                                        <DisplayField label="Cód. Postal" value={detalle.dato.postalLegal} />
                                        <DisplayField label="Teléfonos" value={detalle.dato.telefonosLegal} />
                                        <DisplayField label="Email Institucional" value={detalle.dato.emailLegal} />
                                        <DisplayField label="Cód. Área" value={detalle.dato.codMovilLegal} />
                                        <DisplayField label="Celular Legal" value={detalle.dato.movilLegal} />
                                    </div>
                                </div>

                                {/* Domicilio Real */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-[#063f68]/10 dark:bg-blue-400/10 text-[#063f68] dark:text-blue-400 flex items-center justify-center">
                                            <User size={14} />
                                        </div>
                                        <h3 className="text-[13px] font-bold text-black dark:text-white tracking-tight">Domicilio Real</h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <DisplayField label="Dirección Real" value={detalle.dato.domicilioReal} />
                                        <DisplayField label="Localidad" value={detalle.dato.localidadReal} />
                                        <DisplayField label="Provincia" value={detalle.dato.provinciaReal} />
                                        <DisplayField label="Cód. Postal" value={detalle.dato.postalReal} />
                                        <DisplayField label="Teléfonos" value={detalle.dato.telefonosReal} />
                                        <DisplayField label="Email Personal" value={detalle.dato.emailReal} />
                                        <DisplayField label="Cód. Área" value={detalle.dato.codMovilReal} />
                                        <DisplayField label="Celular Real" value={detalle.dato.movilReal} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Deuda */}
                    {detalle.deuda.total > 0 && (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[13px] font-bold text-red-800 dark:text-red-400 flex items-center gap-1.5"><AlertTriangle size={14} /> Deuda vencida</p>
                                <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">${detalle.deuda.total.toLocaleString("es-AR")}</p>
                                {detalle.deuda.comprobantes.length > 0 && (
                                    <button onClick={() => setDeudaDetalleAbierto(true)} className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-red-600/70 dark:text-red-400/70 hover:underline">
                                        <Eye size={12} /> Ver detalle
                                    </button>
                                )}
                            </div>
                            <button onClick={() => setCobroModal({ tipo: "deuda", monto: detalle.deuda.total, label: "deuda vencida" })}
                                className="h-11 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-[13px] transition-all whitespace-nowrap">
                                Cobrar en efectivo
                            </button>
                        </div>
                    )}

                    {/* Cuota mensual */}
                    {detalle.cuotaActual && detalle.cuotaActual.estado !== "pagado" && (
                        <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[13px] font-bold text-amber-800 dark:text-amber-400">Cuota mensual — {detalle.cuotaActual.periodo}</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">${detalle.cuotaActual.monto.toLocaleString("es-AR")}</p>
                            </div>
                            <button onClick={() => setCobroModal({ tipo: "cuota_mensual", monto: detalle.cuotaActual!.monto, label: `cuota mensual (${detalle.cuotaActual!.periodo})` })}
                                className="h-11 px-5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-[13px] transition-all whitespace-nowrap">
                                Cobrar en efectivo
                            </button>
                        </div>
                    )}

                    {/* Matrícula anual */}
                    {detalle.showPagoAnual && !detalle.hasPagoAnualActivo && (
                        <div className="bg-sky-50 dark:bg-sky-950/10 border border-sky-100 dark:border-sky-900/30 rounded-2xl p-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[13px] font-bold text-sky-800 dark:text-sky-400">Matrícula anual</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">${detalle.montoAnual.toLocaleString("es-AR")}</p>
                            </div>
                            <button onClick={() => setCobroModal({ tipo: "matricula_anual", monto: detalle.montoAnual, label: "matrícula anual" })}
                                className="h-11 px-5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl font-bold text-[13px] transition-all whitespace-nowrap">
                                Cobrar en efectivo
                            </button>
                        </div>
                    )}

                    {detalle.deuda.total === 0 && (!detalle.cuotaActual || detalle.cuotaActual.estado === "pagado") && (!detalle.showPagoAnual || detalle.hasPagoAnualActivo) && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-5 flex items-center gap-3">
                            <CheckCircle2 size={20} className="text-emerald-600" />
                            <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-400">No tiene conceptos pendientes de pago.</p>
                        </div>
                    )}
                </div>
            )}
            </>
            )}

            {/* Modal detalle de deuda */}
            {deudaDetalleAbierto && detalle && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeudaDetalleAbierto(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                            <p className="text-[14px] font-bold text-slate-800 dark:text-white">Detalle de la deuda</p>
                            <button onClick={() => setDeudaDetalleAbierto(false)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                            {detalle.deuda.comprobantes.map((c, i) => (
                                <div key={i} className="flex items-center justify-between px-5 py-3">
                                    <p className="text-[13px] text-slate-600 dark:text-slate-400">
                                        Vencimiento {new Date(c.fechaVencimiento).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })}
                                    </p>
                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white">${c.monto.toLocaleString("es-AR")}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                            <p className="text-[15px] font-black text-red-600 dark:text-red-400">${detalle.deuda.total.toLocaleString("es-AR")}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmar cobro */}
            {cobroModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !cobrando && setCobroModal(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-sm shadow-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Wallet size={18} />
                            </div>
                            <div>
                                <p className="text-[14px] font-bold text-slate-800 dark:text-white">Confirmar cobro en efectivo</p>
                                <p className="text-[12px] text-slate-400">{cobroModal.label}</p>
                            </div>
                        </div>
                        <p className="text-3xl font-black text-slate-800 dark:text-white">${cobroModal.monto.toLocaleString("es-AR")}</p>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">N° de recibo / comprobante (opcional)</label>
                            <input value={comprobante} onChange={e => setComprobante(e.target.value)} placeholder="Ej: 0001-00001234"
                                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setCobroModal(null)} disabled={cobrando}
                                className="flex-1 h-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50">
                                Cancelar
                            </button>
                            <button onClick={confirmarCobro} disabled={cobrando}
                                className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                {cobrando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                {cobrando ? "Registrando..." : "Confirmar cobro"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
