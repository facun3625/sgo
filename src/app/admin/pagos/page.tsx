"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Loader2, Search, CreditCard, Landmark, Clock,
    CheckCircle2, AlertTriangle, XCircle, ChevronUp, ChevronDown, ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface CuotaInfo {
    id: number;
    periodo: string;
    monto: number;
    estado: string;
    fechaPago: string | null;
    metodo: "mercadopago" | "transferencia" | "transferencia_pendiente" | null;
}

interface UsuarioPago {
    expediente: string;
    nombre: string;
    apellido: string;
    cuota: CuotaInfo | null;
    deudaTotal: number;
    deudaCount: number;
}

type Filtro = "todos" | "deuda" | "cuota_pendiente" | "al_dia";
type SortKey = "nombre" | "cuota" | "deuda";
type SortDir = "asc" | "desc";

function formatPeriodo(p: string) {
    const [y, m] = p.split("-");
    return new Date(+y, +m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
        .replace(/^\w/, (c) => c.toUpperCase());
}

function CuotaBadge({ cuota }: { cuota: CuotaInfo | null }) {
    if (!cuota) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400">
                Sin generar
            </span>
        );
    }
    if (cuota.estado === "pagado") {
        const label = cuota.metodo === "transferencia" ? "Transferencia" : "Mercado Pago";
        const icon = cuota.metodo === "transferencia"
            ? <Landmark size={11} />
            : <CreditCard size={11} />;
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={11} /> Pagado · {icon} {label}
            </span>
        );
    }
    if (cuota.metodo === "transferencia_pendiente") {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                <Clock size={11} /> Transferencia pendiente
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
            <XCircle size={11} /> Pendiente
        </span>
    );
}

function DeudaBadge({ total, count }: { total: number; count: number }) {
    if (total === 0) {
        return (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={13} /> Sin deuda
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
            <AlertTriangle size={11} /> ${total.toLocaleString("es-AR")}
            <span className="text-rose-400">({count} concepto{count > 1 ? "s" : ""})</span>
        </span>
    );
}

export default function PagosAdminPage() {
    const [usuarios, setUsuarios] = useState<UsuarioPago[]>([]);
    const [periodo, setPeriodo] = useState("");
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<Filtro>("todos");
    const [busqueda, setBusqueda] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("nombre");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    useEffect(() => {
        fetch("/api/admin/pagos/resumen")
            .then((r) => r.json())
            .then((d) => { setUsuarios(d.usuarios ?? []); setPeriodo(d.periodo ?? ""); })
            .finally(() => setLoading(false));
    }, []);

    const stats = useMemo(() => ({
        total: usuarios.length,
        conDeuda: usuarios.filter((u) => u.deudaTotal > 0).length,
        cuotaPendiente: usuarios.filter((u) => u.cuota?.estado === "pendiente").length,
        transferenciaPendiente: usuarios.filter((u) => u.cuota?.metodo === "transferencia_pendiente").length,
        alDia: usuarios.filter((u) => u.deudaTotal === 0 && u.cuota?.estado === "pagado").length,
    }), [usuarios]);

    const filtrados = useMemo(() => {
        let list = usuarios;

        if (filtro === "deuda") list = list.filter((u) => u.deudaTotal > 0);
        else if (filtro === "cuota_pendiente") list = list.filter((u) => u.cuota?.estado === "pendiente" || u.cuota?.metodo === "transferencia_pendiente");
        else if (filtro === "al_dia") list = list.filter((u) => u.deudaTotal === 0 && u.cuota?.estado === "pagado");

        if (busqueda.trim()) {
            const q = busqueda.toLowerCase();
            list = list.filter(
                (u) =>
                    u.apellido.toLowerCase().includes(q) ||
                    u.nombre.toLowerCase().includes(q) ||
                    u.expediente.toLowerCase().includes(q)
            );
        }

        return [...list].sort((a, b) => {
            let cmp = 0;
            if (sortKey === "nombre") cmp = a.apellido.localeCompare(b.apellido);
            else if (sortKey === "cuota") {
                const ord = (u: UsuarioPago) =>
                    u.cuota?.estado === "pagado" ? 0 : u.cuota?.metodo === "transferencia_pendiente" ? 1 : u.cuota ? 2 : 3;
                cmp = ord(a) - ord(b);
            } else if (sortKey === "deuda") cmp = b.deudaTotal - a.deudaTotal;
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [usuarios, filtro, busqueda, sortKey, sortDir]);

    function toggleSort(key: SortKey) {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
    }

    function SortIcon({ k }: { k: SortKey }) {
        if (sortKey !== k) return <ChevronUp size={12} className="text-slate-300" />;
        return sortDir === "asc" ? <ChevronUp size={12} className="text-[#063f68]" /> : <ChevronDown size={12} className="text-[#063f68]" />;
    }

    const TABS: { key: Filtro; label: string; count: number; color: string }[] = [
        { key: "todos", label: "Todos", count: stats.total, color: "text-slate-600" },
        { key: "deuda", label: "Con deuda", count: stats.conDeuda, color: "text-rose-600" },
        { key: "cuota_pendiente", label: "Cuota pendiente", count: stats.cuotaPendiente, color: "text-amber-600" },
        { key: "al_dia", label: "Al día", count: stats.alDia, color: "text-emerald-600" },
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
                            {periodo ? `Período ${formatPeriodo(periodo)}` : "Cargando..."}
                            {" · "}Excluye débito automático y pago anual
                        </p>
                    </div>
                </div>
                <Link href="/admin/transferencias"
                    className="flex items-center gap-2 px-4 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[12px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                    <Landmark size={14} /> Ver transferencias
                    {stats.transferenciaPendiente > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                            {stats.transferenciaPendiente}
                        </span>
                    )}
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total usuarios", value: stats.total, color: "text-slate-700 dark:text-slate-200" },
                    { label: "Con deuda", value: stats.conDeuda, color: "text-rose-600 dark:text-rose-400" },
                    { label: "Cuota pendiente", value: stats.cuotaPendiente, color: "text-amber-600 dark:text-amber-400" },
                    { label: "Al día", value: stats.alDia, color: "text-emerald-600 dark:text-emerald-400" },
                ].map((s) => (
                    <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-1">{s.label}</p>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs + Búsqueda */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex gap-0 border-b border-slate-100 dark:border-slate-800 flex-1 overflow-x-auto">
                    {TABS.map((t) => (
                        <button key={t.key} onClick={() => setFiltro(t.key)}
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
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="pl-9 pr-4 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 w-64"
                    />
                </div>
            </div>

            {/* Tabla */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-slate-300" />
                </div>
            ) : filtrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <CreditCard size={28} className="text-slate-200 dark:text-slate-700" />
                    <p className="text-[13px] text-slate-400">Sin resultados para este filtro</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-5 py-3 text-left w-[35%]">
                                        <button onClick={() => toggleSort("nombre")}
                                            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wide hover:text-slate-600 transition-colors">
                                            Usuario <SortIcon k="nombre" />
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
                                            Deuda <SortIcon k="deuda" />
                                        </button>
                                    </th>
                                    <th className="px-5 py-3 w-[5%]" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {filtrados.map((u) => (
                                    <tr key={u.expediente} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="text-[13px] font-bold text-slate-800 dark:text-white">
                                                {u.apellido}, {u.nombre}
                                            </p>
                                            <p className="text-[11px] text-slate-400">{u.expediente}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <CuotaBadge cuota={u.cuota} />
                                            {u.cuota && (
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                    ${u.cuota.monto.toLocaleString("es-AR")}
                                                    {u.cuota.estado === "pagado" && u.cuota.fechaPago && (
                                                        <> · {new Date(u.cuota.fechaPago).toLocaleDateString("es-AR")}</>
                                                    )}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <DeudaBadge total={u.deudaTotal} count={u.deudaCount} />
                                        </td>
                                        <td className="px-5 py-4 text-right">
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

                    <div className="px-5 py-3 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <p className="text-[11px] text-slate-400">
                            Mostrando {filtrados.length} de {usuarios.length} usuarios
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
