"use client";

import { useState, useEffect, useCallback } from "react";
import { Cpu, Loader2, Upload, X, CheckCircle2, ShoppingCart } from "lucide-react";

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
    productoId: number;
    cantidad: number;
    metodoPago: string;
    comprobante: string | null;
    estado: string;
    observacion: string | null;
    createdAt: string;
    producto: { nombre: string };
}

const ESTADO_COLORS: Record<string, string> = {
    pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    aprobado: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    entregado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    cancelado: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

const ESTADO_LABELS: Record<string, string> = {
    pendiente: "Pendiente",
    aprobado: "Aprobado",
    entregado: "Entregado",
    cancelado: "Cancelado",
};

const METODO_LABELS: Record<string, string> = {
    mercadopago: "Mercado Pago",
    transferencia: "Transferencia",
    efectivo: "Efectivo al retirar",
};

export default function VentasPage() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [pedidosMesPorProducto, setPedidosMesPorProducto] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [transferenciaHabilitada, setTransferenciaHabilitada] = useState(false);

    // Formulario de compra
    const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
    const [cantidad, setCantidad] = useState(1);
    const [metodoPago, setMetodoPago] = useState<"mercadopago" | "transferencia" | "efectivo">("mercadopago");
    const [comprobante, setComprobante] = useState<string | null>(null);
    const [comprobanteFileName, setComprobanteFileName] = useState("");
    const [uploadingFile, setUploadingFile] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [cancelingId, setCancelingId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        const [ventasRes, configRes] = await Promise.all([
            fetch("/api/user/ventas"),
            fetch("/api/admin/config/pagos"),
        ]);
        if (ventasRes.ok) {
            const data = await ventasRes.json();
            setProductos(data.productos ?? []);
            setPedidos(data.pedidos ?? []);
            setPedidosMesPorProducto(data.pedidosMesPorProducto ?? {});
        }
        if (configRes.ok) {
            const cfg = await configRes.json();
            setTransferenciaHabilitada(!!cfg.transferencia_ventas);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    function openCompra(p: Producto) {
        setSelectedProducto(p);
        setCantidad(1);
        setMetodoPago(transferenciaHabilitada ? metodoPago : "mercadopago");
        setComprobante(null);
        setComprobanteFileName("");
        setError("");
        setSuccess(false);
    }

    function maxCantidad(p: Producto) {
        const yaComprado = pedidosMesPorProducto[p.id] ?? 0;
        if (p.limiteMensual !== null) {
            return Math.min(p.stock, p.limiteMensual - yaComprado);
        }
        return p.stock;
    }

    function canBuy(p: Producto) {
        return p.habilitado && p.stock > 0 && maxCantidad(p) > 0;
    }

    async function handleUpload(file: File) {
        setUploadingFile(true);
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/user/ventas/upload", { method: "POST", body: form });
        if (res.ok) {
            const data = await res.json();
            setComprobante(data.url);
            setComprobanteFileName(file.name);
        }
        setUploadingFile(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedProducto) return;
        setError("");

        // Mercado Pago: redirigir al checkout
        if (metodoPago === "mercadopago") {
            setSubmitting(true);
            try {
                const res = await fetch("/api/payments/create-preference", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tipo: "producto", ref: String(selectedProducto.id), extra: String(cantidad) }),
                });
                const data = await res.json();
                if (!res.ok) { setError(data.error ?? "Error al iniciar el pago."); setSubmitting(false); return; }
                window.location.href = data.init_point;
            } catch {
                setError("Error de conexión.");
                setSubmitting(false);
            }
            return;
        }

        if (metodoPago === "transferencia" && !comprobante) {
            setError("Debés subir el comprobante de transferencia.");
            return;
        }
        setSubmitting(true);
        const res = await fetch("/api/user/ventas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productoId: selectedProducto.id, cantidad, metodoPago, comprobante }),
        });
        if (res.ok) {
            setSuccess(true);
            setSelectedProducto(null);
            await fetchData();
            setTimeout(() => setSuccess(false), 4000);
        } else {
            const data = await res.json();
            setError(data.error ?? "Error al procesar el pedido.");
        }
        setSubmitting(false);
    }

    async function cancelarPedido(id: number) {
        setCancelingId(id);
        await fetch(`/api/user/ventas/${id}`, { method: "DELETE" });
        await fetchData();
        setCancelingId(null);
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <ShoppingCart size={20} className="text-violet-500" /> Ventas
                </h1>
                <p className="text-slate-700 text-sm mt-0.5">Productos disponibles para comprar</p>
            </div>

            {success && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 text-[14px] text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 size={15} /> Pedido registrado exitosamente.
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 size={28} className="animate-spin text-slate-300" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Productos + Formulario */}
                    <div className="lg:col-span-2 space-y-4">

                        {productos.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                                <ShoppingCart size={36} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-700 font-semibold text-[16px]">Sin productos disponibles</p>
                                <p className="text-slate-700 text-[14px] mt-1">Por el momento no hay productos habilitados. Consultá con la administración.</p>
                            </div>
                        ) : (
                            productos.map((p) => {
                                const yaComprado = pedidosMesPorProducto[p.id] ?? 0;
                                const max = maxCantidad(p);
                                const puedeComprar = canBuy(p);
                                const isSelected = selectedProducto?.id === p.id;

                                return (
                                    <div key={p.id} className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all ${isSelected ? "border-[#063f68] dark:border-blue-500 shadow-md" : "border-slate-100 dark:border-slate-800"}`}>
                                        <div className="p-5 flex gap-4 items-start">
                                            <div className="w-14 h-14 flex-shrink-0 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                                                <Cpu size={28} className="text-violet-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[16px] font-bold text-slate-800 dark:text-white">{p.nombre}</p>
                                                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                                                    ${p.precio.toLocaleString("es-AR")}
                                                </p>
                                                <div className="flex flex-wrap gap-3 mt-2 text-[13px]">
                                                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-400">
                                                        <span className={`w-2 h-2 rounded-full ${p.stock > 0 ? "bg-emerald-400" : "bg-rose-400"}`} />
                                                        {p.stock > 0 ? `${p.stock} en stock` : "Sin stock"}
                                                    </span>
                                                    {p.limiteMensual !== null && (
                                                        <>
                                                            <span className="text-slate-300 dark:text-slate-700">·</span>
                                                            <span className="text-slate-700 dark:text-slate-400">
                                                                Límite: <strong>{p.limiteMensual}</strong>/mes
                                                                {yaComprado > 0 && ` (llevás ${yaComprado})`}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0">
                                                {puedeComprar ? (
                                                    <button
                                                        onClick={() => isSelected ? setSelectedProducto(null) : openCompra(p)}
                                                        className={`px-4 h-9 rounded-xl text-[13px] font-bold transition-all ${isSelected ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400" : "bg-[#063f68] text-white hover:bg-[#0a4d7a]"}`}
                                                    >
                                                        {isSelected ? "Cancelar" : "Comprar"}
                                                    </button>
                                                ) : (
                                                    <span className="text-[13px] text-slate-700 font-semibold">
                                                        {p.stock === 0 ? "Sin stock" : "Límite alcanzado"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Formulario inline */}
                                        {isSelected && (
                                            <div className="border-t border-slate-100 dark:border-slate-800 p-5">
                                                <p className="text-[14px] font-bold text-slate-800 dark:text-white mb-4">Realizar pedido</p>
                                                <form onSubmit={handleSubmit} className="space-y-4">
                                                    {/* Cantidad */}
                                                    {p.limiteMensual !== 1 && (
                                                        <div>
                                                            <label className="text-[12px] text-slate-700 uppercase tracking-wide font-semibold block mb-1.5">Cantidad</label>
                                                            <div className="flex items-center gap-2">
                                                                <button type="button"
                                                                    onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                                                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-lg font-bold">
                                                                    −
                                                                </button>
                                                                <span className="w-10 text-center text-[16px] font-bold text-slate-800 dark:text-white">{cantidad}</span>
                                                                <button type="button"
                                                                    onClick={() => setCantidad((c) => Math.min(max, c + 1))}
                                                                    disabled={cantidad >= max}
                                                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all text-lg font-bold">
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Método */}
                                                    <div>
                                                        <label className="text-[12px] text-slate-700 uppercase tracking-wide font-semibold block mb-1.5">Método de pago</label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {(["mercadopago", ...(transferenciaHabilitada ? (["transferencia"] as const) : []), "efectivo"] as const).map((m) => (
                                                                <button key={m} type="button"
                                                                    onClick={() => { setMetodoPago(m); setComprobante(null); setComprobanteFileName(""); }}
                                                                    className={`px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all border
                                                                        ${metodoPago === m
                                                                            ? "bg-[#063f68] border-[#063f68] text-white"
                                                                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                                                                    {METODO_LABELS[m]}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Comprobante */}
                                                    {metodoPago === "transferencia" && (
                                                        <div>
                                                            <label className="text-[12px] text-slate-700 uppercase tracking-wide font-semibold block mb-1.5">Comprobante</label>
                                                            {comprobante ? (
                                                                <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-700/30 bg-emerald-50 dark:bg-emerald-900/10">
                                                                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                                                                    <span className="text-[13px] text-emerald-700 dark:text-emerald-400 flex-1 truncate">{comprobanteFileName}</span>
                                                                    <button type="button" onClick={() => { setComprobante(null); setComprobanteFileName(""); }}>
                                                                        <X size={14} className="text-slate-700" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                                                    {uploadingFile ? <Loader2 size={15} className="animate-spin text-slate-700" /> : <Upload size={15} className="text-slate-700" />}
                                                                    <span className="text-[13px] text-slate-700">{uploadingFile ? "Subiendo..." : "Subir comprobante (imagen o PDF)"}</span>
                                                                    <input type="file" className="hidden" accept="image/*,.pdf"
                                                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                                                                </label>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Total */}
                                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                                        <span className="text-[13px] text-slate-700">Total</span>
                                                        <span className="text-[18px] font-black text-slate-800 dark:text-white">
                                                            ${(p.precio * cantidad).toLocaleString("es-AR")}
                                                        </span>
                                                    </div>

                                                    {error && (
                                                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/30 text-[13px] text-rose-600 dark:text-rose-400">
                                                            {error}
                                                        </div>
                                                    )}

                                                    <button type="submit" disabled={submitting || uploadingFile}
                                                        className="w-full h-11 rounded-xl bg-[#063f68] text-white text-[14px] font-bold hover:bg-[#0a4d7a] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                                        {submitting ? <Loader2 size={15} className="animate-spin" /> : <ShoppingCart size={15} />}
                                                        {submitting ? "Procesando..." : "Confirmar pedido"}
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Mis pedidos */}
                    <div className="space-y-3">
                        <p className="text-[14px] font-bold text-slate-800 dark:text-white px-1">Mis pedidos</p>
                        {pedidos.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-10 text-center">
                                <ShoppingCart size={24} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                                <p className="text-[13px] text-slate-700">Sin pedidos aún</p>
                            </div>
                        ) : (
                            pedidos.map((p) => (
                                <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-[14px] font-bold text-slate-800 dark:text-white">{p.producto.nombre}</p>
                                            <p className="text-[12px] text-slate-700">
                                                {p.cantidad > 1 ? `${p.cantidad} unidades · ` : ""}{METODO_LABELS[p.metodoPago] ?? p.metodoPago}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0 ${ESTADO_COLORS[p.estado] ?? ""}`}>
                                            {ESTADO_LABELS[p.estado] ?? p.estado}
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-slate-700">
                                        {new Date(p.createdAt).toLocaleDateString("es-AR", {
                                            day: "2-digit", month: "2-digit", year: "numeric",
                                            hour: "2-digit", minute: "2-digit",
                                        })}
                                    </p>
                                    {p.observacion && (
                                        <p className="text-[12px] text-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5">{p.observacion}</p>
                                    )}
                                    {p.estado === "pendiente" && (
                                        <button
                                            onClick={() => cancelarPedido(p.id)}
                                            disabled={cancelingId === p.id}
                                            className="flex items-center gap-1.5 px-3 h-7 rounded-lg border border-rose-200 dark:border-rose-700/30 text-rose-500 text-[12px] font-semibold hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50 transition-all"
                                        >
                                            {cancelingId === p.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
