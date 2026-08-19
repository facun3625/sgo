"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Loader2, Search, CreditCard, Landmark, Clock,
    CheckCircle2, AlertTriangle, XCircle, ChevronUp, ChevronDown,
    ExternalLink, TrendingUp, Users, CircleDollarSign, FileX,
    Wifi, Calendar, Download, FileSpreadsheet, Wallet,
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

interface CuotaInfo {
    id: number;
    periodo: string;
    monto: number;
    estado: string;
    fechaPago: string | null;
    metodo: "mercadopago" | "transferencia" | "home_banking" | "banelco" | "efectivo" | "payway" | "transferencia_pendiente" | null;
    delegacionNombre?: string | null;
}

interface UsuarioPago {
    expediente: string;
    nombre: string;
    apellido: string;
    cobertura: "mensual" | "debito" | "anual";
    cuota: CuotaInfo | null;
    deudaTotal: number;
    deudaCount: number;
}

interface Stats {
    totalMatriculados: number;
    conDebito: number;
    conAnual: number;
    cuotaGenerada: number;
    cuotaPagada: number;
    cuotaPendiente: number;
    transferenciasPendientes: number;
    sinCuota: number;
    pagadasPorMP: number;
    pagadasPorTransferencia: number;
    pagadasPorHomeBanking: number;
    pagadasPorBanelco: number;
    pagadasPorEfectivo: number;
    pagadasPorPayway: number;
    totalRecaudado: number;
    totalRecaudadoDeudas: number;
    totalRecaudadoGeneral: number;
    conDeuda: number;
    totalDeudaAcumulada: number;
}

interface FilaContable {
    id: number;
    tipo: "deuda" | "cuota_mp" | "anual";
    metodoPago: string;
    exportado: boolean;
    nroRecibo: string;
    expediente: string;
    cliente: string;
    nombre: string;
    apellido: string;
    fechaCobro: string | null;
    importe: number;
    nroComprobante: string;
    delegacion: string;
}

type Filtro = "todos" | "deuda" | "cuota_pendiente" | "al_dia" | "sin_cuota";
type SortKey = "nombre" | "cuota" | "deuda";
type SortDir = "asc" | "desc";
type TipoContable = "todos" | "deudas" | "cuotas" | "anual";
type MetodoPago = "" | "mercadopago" | "banelco" | "transferencia" | "home_banking" | "efectivo";
type Vista = "matriculados" | "contabilidad";

function mesActual() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatPeriodo(p: string) {
    const [y, m] = p.split("-");
    return new Date(+y, +m - 1, 1)
        .toLocaleDateString("es-AR", { month: "long", year: "numeric" })
        .replace(/^\w/, (c) => c.toUpperCase());
}

function fmtFecha(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-AR");
}

function CuotaBadge({ cuota, cobertura }: { cuota: CuotaInfo | null; cobertura: "mensual" | "debito" | "anual" }) {
    if (cobertura === "debito") return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400">
            <Wifi size={11} /> Débito Activo
        </span>
    );
    if (cobertura === "anual") return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
            <Calendar size={11} /> Pago Anual
        </span>
    );
    if (!cuota) return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400">
            Sin generar
        </span>
    );
    if (cuota.estado === "pagado") {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={11} />
                {cuota.metodo === "transferencia" ? <><Landmark size={11} /> Transferencia</> :
                 cuota.metodo === "home_banking" ? <><Landmark size={11} /> Home Banking</> :
                 cuota.metodo === "banelco" ? <><Landmark size={11} /> Banelco</> :
                 cuota.metodo === "efectivo" ? <><Wallet size={11} /> Efectivo{cuota.delegacionNombre ? ` — ${cuota.delegacionNombre}` : ""}</> :
                 cuota.metodo === "payway" ? <><CreditCard size={11} /> PayWay</> :
                 <><CreditCard size={11} /> Mercado Pago</>}
            </span>
        );
    }
    if (cuota.metodo === "transferencia_pendiente") return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            <Clock size={11} /> Transferencia pendiente
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
            <XCircle size={11} /> Pendiente
        </span>
    );
}

// ── Vista Contabilidad ───────────────────────────────────────────────────────
function ContabilidadView({ stats, pctPagado }: { stats: Stats | null; pctPagado: number }) {
    const [tipo, setTipo] = useState<TipoContable>("todos");
    const [metodoPago, setMetodoPago] = useState<MetodoPago>("");
    const [mes, setMes] = useState(mesActual());
    const [soloNoExportados, setSoloNoExportados] = useState(false);
    const [filas, setFilas] = useState<FilaContable[]>([]);
    const [delegacionFiltro, setDelegacionFiltro] = useState("");
    const [cargando, setCargando] = useState(false);
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
    const [descargando, setDescargando] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        setSeleccionados(new Set());
        setDelegacionFiltro("");
        const params = new URLSearchParams({ tipo, mes, soloNoExportados: String(soloNoExportados) });
        if (metodoPago) params.set("metodoPago", metodoPago);
        const res = await fetch(`/api/admin/pagos/exportar?${params}`);
        const data = await res.json();
        setFilas(data.filas ?? []);
        setCargando(false);
    }, [tipo, metodoPago, mes, soloNoExportados]);

    useEffect(() => { cargar(); }, [cargar]);

    const delegacionesDisponibles = useMemo(
        () => [...new Set(filas.map((f) => f.delegacion).filter(Boolean))].sort(),
        [filas]
    );

    const filasFiltradas = useMemo(
        () => delegacionFiltro ? filas.filter((f) => f.delegacion === delegacionFiltro) : filas,
        [filas, delegacionFiltro]
    );

    function rowKey(f: FilaContable) { return `${f.tipo}:${f.id}`; }

    function toggleFila(f: FilaContable) {
        setSeleccionados((prev) => {
            const next = new Set(prev);
            const k = rowKey(f);
            next.has(k) ? next.delete(k) : next.add(k);
            return next;
        });
    }

    const todosSeleccionados = filasFiltradas.length > 0 && filasFiltradas.every((f) => seleccionados.has(rowKey(f)));
    function toggleTodos() {
        if (todosSeleccionados) setSeleccionados(new Set());
        else setSeleccionados(new Set(filasFiltradas.map(rowKey)));
    }

    async function descargar(filasAExportar: FilaContable[]) {
        if (filasAExportar.length === 0) return;
        setDescargando(true);

        const [y, m] = mes.split("-");
        const ultimoDiaMes = new Date(parseInt(y), parseInt(m), 0);
        const fechaVencimiento = `${String(ultimoDiaMes.getDate()).padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;

        // Deudas Vencidas nunca llevan Número comprobante ni Fecha vencimiento
        // completos (sin importar el método de pago). Cobradas en efectivo
        // (Delegaciones) además van sin Número recibo, sin Tipo Comprobante y
        // sin columna Delegación — plantilla reducida a Cliente/Fecha/Importe.
        const esDeuda = tipo === "deudas";
        const esDeudaEfectivo = esDeuda && metodoPago === "efectivo";
        const filasDatos = esDeudaEfectivo
            ? filasAExportar.map((f) => ({
                "Número recibo": "",
                "Cliente": f.cliente,
                "Fecha cobro": fmtFecha(f.fechaCobro),
                "Importe en $": f.importe,
                "Tipo Comprobante": "",
                "Número comprobante": "",
                "Fecha vencimiento": "",
            }))
            : filasAExportar.map((f) => ({
                "Número recibo": f.nroRecibo,
                "Cliente": f.cliente,
                "Fecha cobro": fmtFecha(f.fechaCobro),
                "Importe en $": f.importe,
                "Tipo Comprobante": "FAC",
                "Número comprobante": esDeuda ? "" : f.nroComprobante,
                "Fecha vencimiento": esDeuda ? "" : fechaVencimiento,
                "Delegación": f.delegacion || "",
            }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(filasDatos);
        ws["!cols"] = esDeudaEfectivo
            ? [{ wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 18 }]
            : [{ wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, ws, "Registros");
        const tipoLabel = tipo === "deudas" ? "Deuda" : tipo === "cuotas" ? "Cuotas" : tipo === "anual" ? "Anual" : "Todos";
        const hoy = new Date();
        const fechaHoy = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, "0")}${String(hoy.getDate()).padStart(2, "0")}`;
        const prefijo = tipo === "deudas" ? "deudasSGO" : tipo === "cuotas" ? "cuotas_SGO" : tipo === "anual" ? "cuota_anual_SGO" : "MPAgoSGO";
        const delegacionSegmento = delegacionFiltro ? `${delegacionFiltro.trim().replace(/\s+/g, "_")}_` : "";
        const tipoSegmento = (tipo === "deudas" || tipo === "cuotas" || tipo === "anual") ? "" : `${tipoLabel}_`;
        XLSX.writeFile(wb, `${prefijo}_${delegacionSegmento}${tipoSegmento}${y}_${m}_${fechaHoy}.xlsx`);

        const items = filasAExportar.map((f) => ({ tipo: f.tipo, id: f.id }));
        await fetch("/api/admin/pagos/exportar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
        });

        const exportadosIds = new Set(filasAExportar.map(rowKey));
        setFilas((prev) => prev.map((f) => exportadosIds.has(rowKey(f)) ? { ...f, exportado: true } : f));
        setSeleccionados(new Set());
        setDescargando(false);
    }

    const filasSeleccionadas = filasFiltradas.filter((f) => seleccionados.has(rowKey(f)));
    const nuevas = filasFiltradas.filter((f) => !f.exportado);

    const TIPOS: { key: TipoContable; label: string }[] = [
        { key: "todos", label: "Todos" },
        { key: "deudas", label: "Deudas Vencidas" },
        { key: "cuotas", label: "Cuotas mensuales" },
        { key: "anual", label: "Matrícula Anual" },
    ];

    const METODOS: { key: MetodoPago; label: string }[] = [
        { key: "", label: "Todos los métodos" },
        { key: "mercadopago", label: "MercadoPago" },
        { key: "banelco", label: "Banelco" },
        { key: "transferencia", label: "Transferencia" },
        { key: "home_banking", label: "Home Banking" },
        { key: "efectivo", label: "Efectivo (Delegaciones)" },
    ];

    return (
        <div className="space-y-5">
            {/* Recaudación del mes */}
            {stats && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-500" />
                            <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Recaudación del mes</h2>
                        </div>
                        <span className="text-[11px] text-slate-400">{pctPagado}% cobrado sobre generadas</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pctPagado}%` }} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div>
                            <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Total recaudado</p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                ${(stats.totalRecaudadoGeneral ?? 0).toLocaleString("es-AR")}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">Cuotas: <span className="font-bold text-emerald-400">${stats.totalRecaudado.toLocaleString("es-AR")}</span></p>
                            <p className="text-[10px] text-slate-400">Deudas: <span className="font-bold text-amber-400">${(stats.totalRecaudadoDeudas ?? 0).toLocaleString("es-AR")}</span></p>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Pagaron</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-white">
                                {stats.cuotaPagada} <span className="text-sm font-medium text-slate-400">/ {stats.cuotaGenerada}</span>
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Tarjeta (MP / PayWay)</p>
                            <div className="flex items-center gap-2">
                                <CreditCard size={14} className="text-[#009ee3]" />
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.pagadasPorMP + (stats.pagadasPorPayway ?? 0)}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Transferencia</p>
                            <div className="flex items-center gap-2">
                                <Landmark size={14} className="text-slate-500" />
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.pagadasPorTransferencia}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Banelco / HB</p>
                            <div className="flex items-center gap-2">
                                <Landmark size={14} className="text-violet-500" />
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{(stats.pagadasPorBanelco ?? 0) + (stats.pagadasPorHomeBanking ?? 0)}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Efectivo (Delegaciones)</p>
                            <div className="flex items-center gap-2">
                                <Wallet size={14} className="text-emerald-500" />
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.pagadasPorEfectivo ?? 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                    {/* Tipo */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tipo</p>
                        <div className="flex gap-1.5">
                            {TIPOS.map((t) => (
                                <button key={t.key} onClick={() => setTipo(t.key)}
                                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border
                                        ${tipo === t.key
                                            ? "bg-[#063f68] text-white border-[#063f68]"
                                            : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mes */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Mes</p>
                        <input
                            type="month"
                            value={mes}
                            onChange={(e) => setMes(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                        />
                    </div>

                    {/* Solo no exportados */}
                    <label className="flex items-center gap-2 cursor-pointer pb-0.5">
                        <input
                            type="checkbox"
                            checked={soloNoExportados}
                            onChange={(e) => setSoloNoExportados(e.target.checked)}
                            className="w-4 h-4 rounded accent-[#063f68]"
                        />
                        <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium">Solo no exportados</span>
                    </label>
                </div>

                {/* Método de pago */}
                <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Método de pago</p>
                    <div className="flex flex-wrap gap-1.5">
                        {METODOS.map((m) => (
                            <button key={m.key} onClick={() => setMetodoPago(m.key)}
                                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border
                                    ${metodoPago === m.key
                                        ? "bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200"
                                        : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Delegación (solo cuando el método filtrado es efectivo) */}
                {metodoPago === "efectivo" && delegacionesDisponibles.length > 0 && (
                    <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Delegación</p>
                        <div className="flex flex-wrap gap-1.5">
                            <button onClick={() => setDelegacionFiltro("")}
                                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border
                                    ${delegacionFiltro === ""
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                                Todas
                            </button>
                            {delegacionesDisponibles.map((d) => (
                                <button key={d} onClick={() => setDelegacionFiltro(d)}
                                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border
                                        ${delegacionFiltro === d
                                            ? "bg-emerald-600 text-white border-emerald-600"
                                            : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Barra de acciones */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    {cargando
                        ? <span className="flex items-center gap-2 text-[12px] text-slate-400"><Loader2 size={13} className="animate-spin" /> Cargando...</span>
                        : <span className="text-[12px] text-slate-500">
                            <span className="font-bold text-slate-700 dark:text-slate-200">{filasFiltradas.length}</span> registros
                            {nuevas.length > 0 && (
                                <span className="ml-2 text-emerald-500 font-semibold">· {nuevas.length} nuevos</span>
                            )}
                        </span>
                    }
                </div>
                <div className="flex gap-2">
                    {filasSeleccionadas.length > 0 && (
                        <button
                            onClick={() => descargar(filasSeleccionadas)}
                            disabled={descargando}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#063f68] hover:bg-[#052f50] text-white text-[12px] font-semibold transition-all disabled:opacity-50"
                        >
                            {descargando ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                            Descargar seleccionados ({filasSeleccionadas.length})
                        </button>
                    )}
                    <button
                        onClick={() => descargar(filasFiltradas)}
                        disabled={descargando || filasFiltradas.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {descargando ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                        Descargar todos
                    </button>
                </div>
            </div>

            {/* Tabla */}
            {!cargando && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    {filasFiltradas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <FileSpreadsheet size={28} className="text-slate-200 dark:text-slate-700" />
                            <p className="text-[13px] text-slate-400">Sin registros para los filtros seleccionados</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-4 py-3 w-10">
                                            <input
                                                type="checkbox"
                                                checked={todosSeleccionados}
                                                onChange={toggleTodos}
                                                className="w-4 h-4 rounded accent-[#063f68]"
                                            />
                                        </th>
                                        {["Nro. Recibo", "Expediente", "Apellido y Nombre", "Cliente", "Tipo", "Delegación", "Fecha cobro", "Importe en $", "Estado"].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {filasFiltradas.map((f) => {
                                        const sel = seleccionados.has(rowKey(f));
                                        return (
                                            <tr
                                                key={rowKey(f)}
                                                onClick={() => toggleFila(f)}
                                                className={`cursor-pointer transition-colors ${sel ? "bg-[#063f68]/5 dark:bg-[#063f68]/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"}`}
                                            >
                                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={sel}
                                                        onChange={() => toggleFila(f)}
                                                        className="w-4 h-4 rounded accent-[#063f68]"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-mono text-[12px] text-slate-500 dark:text-slate-400">
                                                    {f.nroRecibo || "—"}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-[12px] text-slate-500 dark:text-slate-400">
                                                    {f.expediente || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-[13px] text-slate-700 dark:text-slate-300">
                                                    {f.apellido && f.nombre ? `${f.apellido}, ${f.nombre}` : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-[13px] font-bold text-slate-800 dark:text-white">
                                                    {f.cliente}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit
                                                            ${f.tipo === "deuda"
                                                                ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                                                                : f.tipo === "anual"
                                                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                                                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"}`}>
                                                            {f.tipo === "deuda" ? "Deuda" : f.tipo === "anual" ? "Matrícula anual" : "Cuota mensual"}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium pl-0.5">
                                                            {f.metodoPago === "mercadopago" ? "MercadoPago" :
                                                             f.metodoPago === "banelco" ? "Banelco" :
                                                             f.metodoPago === "transferencia" ? "Transferencia" :
                                                             f.metodoPago === "home_banking" ? "Home Banking" :
                                                             f.metodoPago === "efectivo" ? "Efectivo" :
                                                             f.metodoPago || "—"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-[12px] text-slate-500">
                                                    {f.delegacion || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-[12px] text-slate-500">
                                                    {fmtFecha(f.fechaCobro)}
                                                </td>
                                                <td className="px-4 py-3 text-[13px] font-bold text-slate-800 dark:text-white">
                                                    ${f.importe.toLocaleString("es-AR")}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {f.exportado
                                                        ? <span className="text-[11px] font-semibold text-amber-500">Ya exportado</span>
                                                        : <span className="text-[11px] font-semibold text-emerald-500">Nuevo</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="px-5 py-3 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                <p className="text-[11px] text-slate-400">
                                    {seleccionados.size > 0
                                        ? `${seleccionados.size} seleccionados de ${filasFiltradas.length}`
                                        : `${filasFiltradas.length} registros`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function PagosAdminPage() {
    const [usuarios, setUsuarios] = useState<UsuarioPago[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [periodo, setPeriodo] = useState("");
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<Filtro>("todos");
    const [busqueda, setBusqueda] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("nombre");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [vista, setVista] = useState<Vista>("matriculados");
    const [pagina, setPagina] = useState(1);
    const POR_PAGINA = 50;

    useEffect(() => {
        fetch("/api/admin/pagos/resumen")
            .then((r) => r.json())
            .then((d) => {
                setUsuarios(d.usuarios ?? []);
                setStats(d.stats ?? null);
                setPeriodo(d.periodo ?? "");
            })
            .finally(() => setLoading(false));
    }, []);

    const alDiaCount = useMemo(() =>
        usuarios.filter((u) =>
            u.deudaTotal === 0 && (
                u.cuota?.estado === "pagado" ||
                u.cobertura === "debito" ||
                u.cobertura === "anual"
            )
        ).length,
        [usuarios]
    );

    const filtrados = useMemo(() => {
        let list = usuarios;
        if (filtro === "deuda") list = list.filter((u) => u.deudaTotal > 0);
        else if (filtro === "cuota_pendiente") list = list.filter((u) =>
            u.cobertura === "mensual" && (u.cuota?.estado === "pendiente" || u.cuota?.metodo === "transferencia_pendiente")
        );
        else if (filtro === "al_dia") list = list.filter((u) =>
            u.deudaTotal === 0 && (u.cuota?.estado === "pagado" || u.cobertura === "debito" || u.cobertura === "anual")
        );
        else if (filtro === "sin_cuota") list = list.filter((u) => u.cobertura === "mensual" && !u.cuota);

        if (busqueda.trim()) {
            const q = busqueda.toLowerCase();
            list = list.filter((u) =>
                `${u.apellido}, ${u.nombre}`.toLowerCase().includes(q) ||
                `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) ||
                u.apellido.toLowerCase().includes(q) ||
                u.nombre.toLowerCase().includes(q) ||
                u.expediente.toLowerCase().includes(q)
            );
        }

        return [...list].sort((a, b) => {
            let cmp = 0;
            if (sortKey === "nombre") cmp = a.apellido.localeCompare(b.apellido);
            else if (sortKey === "cuota") {
                const ord = (u: UsuarioPago) => {
                    if (u.cuota?.estado === "pagado") return 0;
                    if (u.cuota?.metodo === "transferencia_pendiente") return 1;
                    if (u.cuota) return 2;
                    if (u.cobertura !== "mensual") return 0;
                    return 3;
                };
                cmp = ord(a) - ord(b);
            } else if (sortKey === "deuda") cmp = b.deudaTotal - a.deudaTotal;
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [usuarios, filtro, busqueda, sortKey, sortDir]);

    function toggleSort(key: SortKey) {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
        setPagina(1);
    }

    function SortIcon({ k }: { k: SortKey }) {
        if (sortKey !== k) return <ChevronUp size={12} className="text-slate-300" />;
        return sortDir === "asc" ? <ChevronUp size={12} className="text-[#063f68]" /> : <ChevronDown size={12} className="text-[#063f68]" />;
    }

    const pctPagado = stats && stats.cuotaGenerada > 0
        ? Math.round((stats.cuotaPagada / stats.cuotaGenerada) * 100)
        : 0;

    const TABS: { key: Filtro; label: string; count: number }[] = [
        { key: "todos", label: "Todos", count: usuarios.length },
        { key: "cuota_pendiente", label: "Cuota pendiente", count: stats?.cuotaPendiente ?? 0 },
        { key: "deuda", label: "Con deuda vencida", count: stats?.conDeuda ?? 0 },
        { key: "sin_cuota", label: "Sin cuota", count: stats?.sinCuota ?? 0 },
        { key: "al_dia", label: "Al día", count: alDiaCount },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <CreditCard size={20} className="text-slate-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Estado de Pagos</h1>
                        <p className="text-slate-400 text-sm mt-0.5">
                            {periodo ? formatPeriodo(periodo) : "Cargando..."}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Switcher de vistas */}
                    <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <button
                            onClick={() => setVista("matriculados")}
                            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold transition-colors
                                ${vista === "matriculados" ? "bg-[#063f68] text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                        >
                            <Users size={13} /> Matriculados
                        </button>
                        <button
                            onClick={() => setVista("contabilidad")}
                            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold transition-colors border-l border-slate-200 dark:border-slate-700
                                ${vista === "contabilidad" ? "bg-[#063f68] text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                        >
                            <FileSpreadsheet size={13} /> Contabilidad
                        </button>
                    </div>
                    <Link href="/admin/transferencias"
                        className="flex items-center gap-2 px-4 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[12px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                        <Landmark size={14} /> Transferencias
                        {(stats?.transferenciasPendientes ?? 0) > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                                {stats?.transferenciasPendientes}
                            </span>
                        )}
                    </Link>
                </div>
            </div>

            {/* Vista Contabilidad */}
            {vista === "contabilidad" && <ContabilidadView stats={stats} pctPagado={pctPagado} />}

            {/* Vista Matriculados */}
            {vista === "matriculados" && (
                loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-slate-300" />
                    </div>
                ) : stats && (
                    <>
                        {/* Recaudación del mes */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={16} className="text-emerald-500" />
                                    <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Recaudación del mes</h2>
                                </div>
                                <span className="text-[11px] text-slate-400">{pctPagado}% cobrado sobre generadas</span>
                            </div>

                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${pctPagado}%` }}
                                />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Total recaudado</p>
                                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                        ${(stats.totalRecaudadoGeneral ?? 0).toLocaleString("es-AR")}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1">Cuotas: <span className="font-bold text-emerald-400">${stats.totalRecaudado.toLocaleString("es-AR")}</span></p>
                                    <p className="text-[10px] text-slate-400">Deudas vencidas: <span className="font-bold text-amber-400">${(stats.totalRecaudadoDeudas ?? 0).toLocaleString("es-AR")}</span></p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Pagaron</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">
                                        {stats.cuotaPagada} <span className="text-sm font-medium text-slate-400">/ {stats.cuotaGenerada}</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Tarjeta (MP / PayWay)</p>
                                    <div className="flex items-center gap-2">
                                        <CreditCard size={14} className="text-[#009ee3]" />
                                        <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.pagadasPorMP + (stats.pagadasPorPayway ?? 0)}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Transferencia</p>
                                    <div className="flex items-center gap-2">
                                        <Landmark size={14} className="text-slate-500" />
                                        <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.pagadasPorTransferencia}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Banelco / HB</p>
                                    <div className="flex items-center gap-2">
                                        <Landmark size={14} className="text-violet-500" />
                                        <p className="text-2xl font-black text-slate-800 dark:text-white">{(stats.pagadasPorBanelco ?? 0) + (stats.pagadasPorHomeBanking ?? 0)}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Efectivo (Delegaciones)</p>
                                    <div className="flex items-center gap-2">
                                        <Wallet size={14} className="text-emerald-500" />
                                        <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.pagadasPorEfectivo ?? 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats secundarias */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: "Matriculados", value: stats.totalMatriculados, icon: Users, color: "text-slate-700 dark:text-slate-200", bg: "bg-slate-100 dark:bg-slate-800" },
                                { label: "Cuota pendiente", value: stats.cuotaPendiente, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
                                { label: "Con deuda vencida", value: stats.conDeuda, icon: AlertTriangle, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" },
                                { label: "Deuda vencida acumulada", value: `$${stats.totalDeudaAcumulada.toLocaleString("es-AR")}`, icon: CircleDollarSign, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" },
                            ].map((s) => (
                                <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                                        <s.icon size={16} className={s.color} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">{s.label}</p>
                                        <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Cobertura breakdown */}
                        {(stats.conDebito > 0 || stats.conAnual > 0) && (
                            <div className="flex flex-wrap gap-2">
                                {stats.conDebito > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 text-[11px] font-semibold border border-sky-100 dark:border-sky-900/30">
                                        <Wifi size={11} /> {stats.conDebito} con débito automático
                                    </span>
                                )}
                                {stats.conAnual > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[11px] font-semibold border border-blue-100 dark:border-blue-900/30">
                                        <Calendar size={11} /> {stats.conAnual} con pago anual
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Tabs + Búsqueda */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex gap-0 border-b border-slate-100 dark:border-slate-800 flex-1 overflow-x-auto">
                                {TABS.map((t) => (
                                    <button key={t.key} onClick={() => { setFiltro(t.key); setPagina(1); }}
                                        className={`flex items-center gap-1.5 px-4 py-3 text-[12px] font-semibold transition-all whitespace-nowrap border-b-2
                                            ${filtro === t.key
                                                ? "border-[#063f68] text-[#063f68] dark:border-blue-400 dark:text-blue-400"
                                                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                                        {t.label}
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filtro === t.key ? "bg-[#063f68]/10 text-[#063f68] dark:bg-blue-400/10 dark:text-blue-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                                            {t.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <div className="relative flex-shrink-0">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o expediente..."
                                    value={busqueda}
                                    onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                                    className="pl-9 pr-4 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 w-64"
                                />
                            </div>
                        </div>

                        {/* Tabla matriculados */}
                        {filtrados.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <FileX size={28} className="text-slate-200 dark:text-slate-700" />
                                <p className="text-[13px] text-slate-400">Sin resultados para este filtro</p>
                            </div>
                        ) : (() => {
                            const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
                            const paginaActual = Math.min(pagina, totalPaginas);
                            const paginados = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
                            return (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                                    <th className="px-5 py-3 text-left w-[35%]">
                                                        <button onClick={() => toggleSort("nombre")}
                                                            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wide hover:text-slate-600 transition-colors">
                                                            Matriculado <SortIcon k="nombre" />
                                                        </button>
                                                    </th>
                                                    <th className="px-5 py-3 text-left w-[35%]">
                                                        <button onClick={() => toggleSort("cuota")}
                                                            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wide hover:text-slate-600 transition-colors">
                                                            Cuota mensual <SortIcon k="cuota" />
                                                        </button>
                                                    </th>
                                                    <th className="px-5 py-3 text-left w-[25%]">
                                                        <button onClick={() => toggleSort("deuda")}
                                                            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wide hover:text-slate-600 transition-colors">
                                                            Deuda Vencida <SortIcon k="deuda" />
                                                        </button>
                                                    </th>
                                                    <th className="px-5 py-3 w-[5%]" />
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                {paginados.map((u) => (
                                                    <tr key={u.expediente} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-5 py-3.5">
                                                            <p className="text-[13px] font-bold text-slate-800 dark:text-white">
                                                                {u.apellido}, {u.nombre}
                                                            </p>
                                                            <p className="text-[11px] text-slate-400">{u.expediente}</p>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <CuotaBadge cuota={u.cuota} cobertura={u.cobertura} />
                                                            {u.cuota && u.cobertura === "mensual" && (
                                                                <p className="text-[11px] text-slate-400 mt-1">
                                                                    ${u.cuota.monto.toLocaleString("es-AR")}
                                                                    {u.cuota.estado === "pagado" && u.cuota.fechaPago && (
                                                                        <> · {new Date(u.cuota.fechaPago).toLocaleDateString("es-AR")}</>
                                                                    )}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            {u.deudaTotal > 0 ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                                                                    <AlertTriangle size={11} />
                                                                    ${u.deudaTotal.toLocaleString("es-AR")}
                                                                    <span className="text-rose-400 dark:text-rose-500">({u.deudaCount})</span>
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                                    <CheckCircle2 size={13} /> Sin deuda vencida
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            <Link href={`/admin/usuarios?q=${u.expediente}`}
                                                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-all inline-flex"
                                                                title="Ver usuario">
                                                                <ExternalLink size={14} />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="px-5 py-3 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-4">
                                        <p className="text-[11px] text-slate-400">
                                            Mostrando {(paginaActual - 1) * POR_PAGINA + 1}–{Math.min(paginaActual * POR_PAGINA, filtrados.length)} de {filtrados.length}
                                        </p>
                                        {totalPaginas > 1 && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                                                    disabled={paginaActual === 1}
                                                    className="px-2.5 py-1 rounded-lg text-[12px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                                    ‹
                                                </button>
                                                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                                                    .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 2)
                                                    .reduce<(number | "…")[]>((acc, p, i, arr) => {
                                                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                                                        acc.push(p);
                                                        return acc;
                                                    }, [])
                                                    .map((p, i) => p === "…" ? (
                                                        <span key={`e${i}`} className="px-1.5 text-[12px] text-slate-300">…</span>
                                                    ) : (
                                                        <button key={p} onClick={() => setPagina(p as number)}
                                                            className={`w-7 h-7 rounded-lg text-[12px] font-semibold transition-all
                                                                ${paginaActual === p ? "bg-[#063f68] text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                                                            {p}
                                                        </button>
                                                    ))}
                                                <button
                                                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                                                    disabled={paginaActual === totalPaginas}
                                                    className="px-2.5 py-1 rounded-lg text-[12px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                                    ›
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                )
            )}
        </div>
    );
}
