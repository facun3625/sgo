"use client";

import { useState, useEffect, useCallback } from "react";
import { Cpu, Download, Check, X, Package, Loader2, Plus, Pencil, Trash2, ShoppingCart } from "lucide-react";

interface Producto {
    id: number;
    nombre: string;
    precio: number;
    stock: number;
    habilitado: boolean;
    limiteMensual: number | null;
}

interface Pedido {
    id: number;
    expediente: string;
    productoId: number;
    cantidad: number;
    metodoPago: string;
    comprobante: string | null;
    estado: string;
    observacion: string | null;
    createdAt: string;
    producto: { nombre: string };
    usuario: { nombre: string; apellido: string } | null;
}

type Tab = "todos" | "pendiente" | "aprobado" | "entregado" | "cancelado";
type MainTab = "productos" | "pedidos";

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

const METODO_LABELS: Record<string, string> = {
    mercadopago: "Mercado Pago",
    transferencia: "Transferencia",
    efectivo: "Efectivo",
};

const emptyForm = { nombre: "", precio: "", stock: "", habilitado: true, limiteMensual: "" };
type FormState = typeof emptyForm;

function ProductoForm({
    form, setForm, saveProducto, savingProducto, onCancel,
}: {
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
    saveProducto: () => void;
    savingProducto: boolean;
    onCancel: () => void;
}) {
    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 bg-slate-50 dark:bg-slate-800/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wide block mb-1">Nombre del producto</label>
                    <input
                        type="text"
                        value={form.nombre}
                        onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                        placeholder="Ej: Token CASF, Carnet, etc."
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                    />
                </div>
                <div>
                    <label className="text-[11px] text-slate-400 uppercase tracking-wide block mb-1">Precio ($)</label>
                    <input
                        type="number"
                        value={form.precio}
                        onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                    />
                </div>
                <div>
                    <label className="text-[11px] text-slate-400 uppercase tracking-wide block mb-1">Stock</label>
                    <input
                        type="number"
                        value={form.stock}
                        onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                    />
                </div>
                <div>
                    <label className="text-[11px] text-slate-400 uppercase tracking-wide block mb-1">Límite mensual por usuario <span className="text-slate-300">(opcional)</span></label>
                    <input
                        type="number"
                        value={form.limiteMensual}
                        onChange={(e) => setForm((f) => ({ ...f, limiteMensual: e.target.value }))}
                        placeholder="Sin límite"
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                    />
                </div>
                <div>
                    <label className="text-[11px] text-slate-400 uppercase tracking-wide block mb-1">Estado</label>
                    <select
                        value={form.habilitado ? "1" : "0"}
                        onChange={(e) => setForm((f) => ({ ...f, habilitado: e.target.value === "1" }))}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                    >
                        <option value="1">Habilitado</option>
                        <option value="0">Deshabilitado</option>
                    </select>
                </div>
            </div>
            <div className="flex gap-2 pt-1">
                <button
                    onClick={saveProducto}
                    disabled={savingProducto || !form.nombre}
                    className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-[#063f68] text-white text-[12px] font-bold hover:bg-[#0a4d7a] disabled:opacity-50 transition-all"
                >
                    {savingProducto ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Guardar
                </button>
                <button
                    onClick={onCancel}
                    className="flex items-center gap-1.5 px-4 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[12px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                    <X size={13} /> Cancelar
                </button>
            </div>
        </div>
    );
}

export default function VentasAdminClient() {
    const [mainTab, setMainTab] = useState<MainTab>("productos");

    // Productos
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loadingProductos, setLoadingProductos] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showNewForm, setShowNewForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [savingProducto, setSavingProducto] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Pedidos
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loadingPedidos, setLoadingPedidos] = useState(true);
    const [tab, setTab] = useState<Tab>("todos");
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const fetchProductos = useCallback(async () => {
        setLoadingProductos(true);
        const res = await fetch("/api/admin/ventas/productos");
        if (res.ok) setProductos(await res.json());
        setLoadingProductos(false);
    }, []);

    const fetchPedidos = useCallback(async () => {
        setLoadingPedidos(true);
        const res = await fetch("/api/admin/ventas/pedidos");
        if (res.ok) setPedidos(await res.json());
        setLoadingPedidos(false);
    }, []);

    useEffect(() => { fetchProductos(); fetchPedidos(); }, [fetchProductos, fetchPedidos]);

    // ---- Productos CRUD ----

    function startEdit(p: Producto) {
        setEditingId(p.id);
        setShowNewForm(false);
        setForm({
            nombre: p.nombre,
            precio: String(p.precio),
            stock: String(p.stock),
            habilitado: p.habilitado,
            limiteMensual: p.limiteMensual != null ? String(p.limiteMensual) : "",
        });
    }

    function startNew() {
        setEditingId(null);
        setShowNewForm(true);
        setForm(emptyForm);
    }

    async function saveProducto() {
        setSavingProducto(true);
        const body = {
            nombre: form.nombre,
            precio: parseFloat(form.precio) || 0,
            stock: parseInt(form.stock) || 0,
            habilitado: form.habilitado,
            limiteMensual: form.limiteMensual ? parseInt(form.limiteMensual) : null,
        };

        if (editingId !== null) {
            const res = await fetch(`/api/admin/ventas/productos/${editingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                const updated = await res.json();
                setProductos((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
                setEditingId(null);
            }
        } else {
            const res = await fetch("/api/admin/ventas/productos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                const created = await res.json();
                setProductos((prev) => [...prev, created]);
                setShowNewForm(false);
            }
        }
        setSavingProducto(false);
    }

    async function deleteProducto(id: number) {
        if (!confirm("¿Eliminar este producto? Se eliminarán también todos sus pedidos.")) return;
        setDeletingId(id);
        await fetch(`/api/admin/ventas/productos/${id}`, { method: "DELETE" });
        setProductos((prev) => prev.filter((p) => p.id !== id));
        setDeletingId(null);
    }

    // ---- Pedidos ----

    async function updateEstado(id: number, estado: string) {
        setUpdatingId(id);
        const res = await fetch(`/api/admin/ventas/pedidos/${id}`, {
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

    const pedidoTabs: { key: Tab; label: string }[] = [
        { key: "todos", label: "Todos" },
        { key: "pendiente", label: "Pendientes" },
        { key: "aprobado", label: "Aprobados" },
        { key: "entregado", label: "Entregados" },
        { key: "cancelado", label: "Cancelados" },
    ];

    const filtered = tab === "todos" ? pedidos : pedidos.filter((p) => p.estado === tab);
    const countFor = (key: string) => key === "todos" ? pedidos.length : pedidos.filter((p) => p.estado === key).length;

    const cancelForm = () => { setEditingId(null); setShowNewForm(false); };

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Cpu size={20} className="text-violet-500" /> Ventas
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">Gestión de productos y pedidos</p>
                </div>
                {mainTab === "pedidos" && (
                    <button
                        onClick={() => window.open("/api/admin/ventas/pedidos/export", "_blank")}
                        className="flex items-center gap-2 px-4 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[12px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                        <Download size={13} /> Exportar CSV
                    </button>
                )}
            </div>

            {/* Main tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 w-fit">
                {([
                    { key: "productos", label: "Productos", icon: Package },
                    { key: "pedidos", label: "Pedidos", icon: ShoppingCart },
                ] as const).map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setMainTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all
                            ${mainTab === key
                                ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                    >
                        <Icon size={14} /> {label}
                    </button>
                ))}
            </div>

            {/* PRODUCTOS */}
            {mainTab === "productos" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-[13px] font-bold text-slate-800 dark:text-white">Productos disponibles</p>
                        {!showNewForm && editingId === null && (
                            <button
                                onClick={startNew}
                                className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-[#063f68] text-white text-[12px] font-bold hover:bg-[#0a4d7a] transition-all"
                            >
                                <Plus size={13} /> Nuevo producto
                            </button>
                        )}
                    </div>

                    <div className="p-5 space-y-4">
                        {showNewForm && <ProductoForm form={form} setForm={setForm} saveProducto={saveProducto} savingProducto={savingProducto} onCancel={cancelForm} />}

                        {loadingProductos ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 size={24} className="animate-spin text-slate-300" />
                            </div>
                        ) : productos.length === 0 && !showNewForm ? (
                            <div className="text-center py-12">
                                <Package size={28} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                                <p className="text-[13px] text-slate-400">Sin productos. Creá el primero.</p>
                            </div>
                        ) : (
                            productos.map((p) => (
                                <div key={p.id} className="space-y-3">
                                    {editingId === p.id ? (
                                        <ProductoForm form={form} setForm={setForm} saveProducto={saveProducto} savingProducto={savingProducto} onCancel={cancelForm} />
                                    ) : (
                                        <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center flex-shrink-0">
                                                <Cpu size={20} className="text-violet-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white">{p.nombre}</p>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.habilitado ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"}`}>
                                                        {p.habilitado ? "Habilitado" : "Deshabilitado"}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-3 mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                                                    <span>${p.precio.toLocaleString("es-AR")}</span>
                                                    <span>·</span>
                                                    <span>{p.stock} en stock</span>
                                                    {p.limiteMensual !== null && (
                                                        <>
                                                            <span>·</span>
                                                            <span>Límite: {p.limiteMensual}/mes</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => startEdit(p)}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-[#063f68] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => deleteProducto(p.id)}
                                                    disabled={deletingId === p.id}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50 transition-all"
                                                >
                                                    {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* PEDIDOS */}
            {mainTab === "pedidos" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    {/* Status tabs */}
                    <div className="flex gap-0 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
                        {pedidoTabs.map((t) => (
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
                                    {countFor(t.key)}
                                </span>
                            </button>
                        ))}
                    </div>

                    {loadingPedidos ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-slate-300" />
                        </div>
                    ) : filtered.length === 0 ? (
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
                                        <th className="text-left px-4 py-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Producto</th>
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
                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-semibold">
                                                {p.producto.nombre}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-semibold">{p.cantidad}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${METODO_COLORS[p.metodoPago] ?? "bg-slate-100 text-slate-500"}`}>
                                                    {METODO_LABELS[p.metodoPago] ?? p.metodoPago}
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
                                                    {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
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
            )}
        </div>
    );
}
