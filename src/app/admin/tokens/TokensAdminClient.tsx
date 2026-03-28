"use client";

import { useState, useEffect, useCallback } from "react";
import { Cpu, Download, Check, X, Package, Loader2 } from "lucide-react";

interface TokenConfig {
    id: number;
    precio: number;
    stock: number;
    limiteMensual: number;
    activo: boolean;
}

interface Pedido {
    id: number;
    expediente: string;
    cantidad: number;
    metodoPago: string;
    comprobante: string | null;
    estado: string;
    observacion: string | null;
    createdAt: string;
    usuario: { nombre: string; apellido: string } | null;
}

type Tab = "todos" | "pendiente" | "aprobado" | "entregado" | "cancelado";

const ESTADO_LABELS: Record<string, string> = {
    pendiente: "Pendiente",
    aprobado: "Aprobado",
    entregado: "Entregado",
    cancelado: "Cancelado",
};

const ESTADO_COLORS: Record<string, string> = {
    pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700/30",
    aprobado: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700/30",
    entregado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/30",
    cancelado: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-700/30",
};

const METODO_COLORS: Record<string, string> = {
    mercadopago: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    transferencia: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    efectivo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function TokensAdminClient() {
    const [config, setConfig] = useState<TokenConfig | null>(null);
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("todos");
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ precio: 0, stock: 0, limiteMensual: 1, activo: true });
    const [saving, setSaving] = useState(false);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        const [configRes, pedidosRes] = await Promise.all([
            fetch("/api/admin/tokens/config"),
            fetch("/api/admin/tokens/pedidos"),
        ]);
        if (configRes.ok) {
            const c = await configRes.json();
            setConfig(c);
            if (c) setEditForm({ precio: c.precio, stock: c.stock, limiteMensual: c.limiteMensual, activo: c.activo });
        }
        if (pedidosRes.ok) {
            const p = await pedidosRes.json();
            setPedidos(Array.isArray(p) ? p : []);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    async function saveConfig() {
        setSaving(true);
        const res = await fetch("/api/admin/tokens/config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editForm),
        });
        if (res.ok) {
            const c = await res.json();
            setConfig(c);
            setEditMode(false);
        }
        setSaving(false);
    }

    async function updateEstado(id: number, estado: string) {
        setUpdatingId(id);
        const res = await fetch(`/api/admin/tokens/pedidos/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado }),
        });
        if (res.ok) {
            const updated = await res.json();
            setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
        }
        setUpdatingId(null);
    }

    function exportCSV() {
        window.open("/api/admin/tokens/pedidos/export", "_blank");
    }

    const tabs: { key: Tab; label: string }[] = [
        { key: "todos", label: "Todos" },
        { key: "pendiente", label: "Pendientes" },
        { key: "aprobado", label: "Aprobados" },
        { key: "entregado", label: "Entregados" },
        { key: "cancelado", label: "Cancelados" },
    ];

    const filtered = tab === "todos" ? pedidos : pedidos.filter((p) => p.estado === tab);

    const countFor = (estado: string) =>
        estado === "todos" ? pedidos.length : pedidos.filter((p) => p.estado === estado).length;

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Cpu size={20} className="text-violet-500" /> Tokens
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">Gestión de venta y pedidos de tokens</p>
                </div>
                <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-4 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[12px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                    <Download size={13} /> Exportar CSV
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 size={28} className="animate-spin text-slate-300" />
                </div>
            ) : (
                <>
                    {/* Config Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[13px] font-bold text-slate-800 dark:text-white">Configuración</p>
                            {!editMode && (
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="text-[12px] font-semibold text-[#063f68] dark:text-blue-400 hover:underline"
                                >
                                    Editar
                                </button>
                            )}
                        </div>

                        {!editMode ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Precio</p>
                                    <p className="text-[15px] font-bold text-slate-800 dark:text-white">
                                        {config ? `$${config.precio.toLocaleString("es-AR")}` : "—"}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Stock</p>
                                    <p className="text-[15px] font-bold text-slate-800 dark:text-white">
                                        {config ? config.stock : "—"}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Límite mensual</p>
                                    <p className="text-[15px] font-bold text-slate-800 dark:text-white">
                                        {config ? config.limiteMensual : "—"}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Estado</p>
                                    {config ? (
                                        <span className={`text-[12px] font-bold ${config.activo ? "text-emerald-500" : "text-rose-500"}`}>
                                            {config.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    ) : (
                                        <span className="text-[12px] text-slate-400">No configurado</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-[11px] text-slate-400 uppercase tracking-wide block mb-1">Precio ($)</label>
                                        <input
                                            type="number"
                                            value={editForm.precio}
                                            onChange={(e) => setEditForm((f) => ({ ...f, precio: parseFloat(e.target.value) || 0 }))}
                                            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400 uppercase tracking-wide block mb-1">Stock</label>
                                        <input
                                            type="number"
                                            value={editForm.stock}
                                            onChange={(e) => setEditForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                                            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400 uppercase tracking-wide block mb-1">Límite mensual</label>
                                        <input
                                                type="number"
                                            value={editForm.limiteMensual}
                                            onChange={(e) => setEditForm((f) => ({ ...f, limiteMensual: parseInt(e.target.value) || 1 }))}
                                            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400 uppercase tracking-wide block mb-1">Estado</label>
                                        <select
                                            value={editForm.activo ? "1" : "0"}
                                            onChange={(e) => setEditForm((f) => ({ ...f, activo: e.target.value === "1" }))}
                                            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                                        >
                                            <option value="1">Activo</option>
                                            <option value="0">Inactivo</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={saveConfig}
                                        disabled={saving}
                                        className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-[#063f68] text-white text-[12px] font-bold hover:bg-[#0a4d7a] disabled:opacity-50 transition-all"
                                    >
                                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                        Guardar
                                    </button>
                                    <button
                                        onClick={() => setEditMode(false)}
                                        className="flex items-center gap-1.5 px-4 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[12px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                    >
                                        <X size={13} /> Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pedidos */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        {/* Tabs */}
                        <div className="flex gap-0 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
                            {tabs.map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => setTab(t.key)}
                                    className={`flex items-center gap-1.5 px-4 py-3 text-[12px] font-semibold transition-all whitespace-nowrap border-b-2
                                        ${tab === t.key
                                            ? "border-[#063f68] text-[#063f68] dark:border-blue-400 dark:text-blue-400"
                                            : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                                >
                                    {t.label}
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                                        ${tab === t.key ? "bg-[#063f68]/10 text-[#063f68] dark:bg-blue-400/10 dark:text-blue-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                                        {countFor(t.key === "todos" ? "todos" : t.key)}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Table */}
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <Package size={28} className="text-slate-200 dark:text-slate-700" />
                                <p className="text-[13px] text-slate-400">Sin pedidos</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[12px]">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800">
                                            <th className="text-left px-4 py-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wide">#</th>
                                            <th className="text-left px-4 py-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Usuario</th>
                                            <th className="text-left px-4 py-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Cant.</th>
                                            <th className="text-left px-4 py-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Método</th>
                                            <th className="text-left px-4 py-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Estado</th>
                                            <th className="text-left px-4 py-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Fecha</th>
                                            <th className="text-left px-4 py-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((p) => (
                                            <tr key={p.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="px-4 py-3 text-slate-400">#{p.id}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-slate-800 dark:text-white">
                                                        {p.usuario ? `${p.usuario.apellido}, ${p.usuario.nombre}` : p.expediente}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">{p.expediente}</p>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-semibold">{p.cantidad}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${METODO_COLORS[p.metodoPago] ?? "bg-slate-100 text-slate-500"}`}>
                                                        {p.metodoPago === "mercadopago" ? "Mercado Pago" : p.metodoPago === "transferencia" ? "Transferencia" : "Efectivo"}
                                                    </span>
                                                    {p.comprobante && (
                                                        <a href={p.comprobante} target="_blank" rel="noopener noreferrer"
                                                            className="ml-2 text-[10px] text-[#063f68] dark:text-blue-400 hover:underline">
                                                            Comprobante
                                                        </a>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ESTADO_COLORS[p.estado] ?? ""}`}>
                                                        {ESTADO_LABELS[p.estado] ?? p.estado}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                                    {new Date(p.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {updatingId === p.id ? (
                                                        <Loader2 size={14} className="animate-spin text-slate-300" />
                                                    ) : p.estado === "pendiente" ? (
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                onClick={() => updateEstado(p.id, "aprobado")}
                                                                className="px-2.5 py-1 rounded-lg bg-blue-500 text-white text-[10px] font-bold hover:bg-blue-600 transition-all"
                                                            >
                                                                Aprobar
                                                            </button>
                                                            <button
                                                                onClick={() => updateEstado(p.id, "cancelado")}
                                                                className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 transition-all"
                                                            >
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    ) : p.estado === "aprobado" ? (
                                                        <button
                                                            onClick={() => updateEstado(p.id, "entregado")}
                                                            className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-all"
                                                        >
                                                            Marcar entregado
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
