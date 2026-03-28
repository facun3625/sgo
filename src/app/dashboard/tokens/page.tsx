"use client";

import { useState, useEffect, useCallback } from "react";
import { Cpu, Loader2, Upload, X, CheckCircle2 } from "lucide-react";

interface TokenConfig {
    id: number;
    precio: number;
    stock: number;
    limiteMensual: number;
    activo: boolean;
}

interface Pedido {
    id: number;
    cantidad: number;
    metodoPago: string;
    comprobante: string | null;
    estado: string;
    observacion: string | null;
    createdAt: string;
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

export default function TokensPage() {
    const [config, setConfig] = useState<TokenConfig | null>(null);
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [pedidosMes, setPedidosMes] = useState(0);
    const [loading, setLoading] = useState(true);

    // Form state
    const [cantidad, setCantidad] = useState(1);
    const [metodoPago, setMetodoPago] = useState<"mercadopago" | "transferencia" | "efectivo">("mercadopago");
    const [comprobante, setComprobante] = useState<string | null>(null);
    const [comprobanteFileName, setComprobanteFileName] = useState<string>("");
    const [uploadingFile, setUploadingFile] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [cancelingId, setCancelingId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        const res = await fetch("/api/user/tokens");
        if (res.ok) {
            const data = await res.json();
            setConfig(data.config);
            setPedidos(data.pedidos ?? []);
            setPedidosMes(data.pedidosMes ?? 0);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const maxCantidad = config
        ? Math.min(config.stock, config.limiteMensual - pedidosMes)
        : 0;

    async function handleUpload(file: File) {
        setUploadingFile(true);
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/user/tokens/upload", { method: "POST", body: form });
        if (res.ok) {
            const data = await res.json();
            setComprobante(data.url);
            setComprobanteFileName(file.name);
        }
        setUploadingFile(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (metodoPago === "transferencia" && !comprobante) {
            setError("Debes subir el comprobante de transferencia.");
            return;
        }
        setSubmitting(true);
        const res = await fetch("/api/user/tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cantidad, metodoPago, comprobante }),
        });
        if (res.ok) {
            setSuccess(true);
            setCantidad(1);
            setMetodoPago("mercadopago");
            setComprobante(null);
            setComprobanteFileName("");
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
        const res = await fetch(`/api/user/tokens/${id}`, { method: "DELETE" });
        if (res.ok) {
            await fetchData();
        }
        setCancelingId(null);
    }

    const canBuy = config && config.activo && config.stock > 0 && pedidosMes < config.limiteMensual;

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Cpu size={20} className="text-violet-500" /> Tokens
                </h1>
                <p className="text-slate-400 text-sm mt-0.5">Comprá tu token de acceso</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 size={28} className="animate-spin text-slate-300" />
                </div>
            ) : !config || !config.activo ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                    <Cpu size={36} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 font-semibold text-[15px]">Venta de tokens no disponible</p>
                    <p className="text-slate-400 text-[13px] mt-1">Por el momento la venta de tokens está deshabilitada. Consultá con la administración.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Producto + Formulario */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Producto card */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex gap-5 items-start">
                            <div className="w-20 h-20 flex-shrink-0 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                                <Cpu size={36} className="text-violet-400" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Token CASF</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">
                                        ${config.precio.toLocaleString("es-AR")}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3 text-[12px]">
                                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                        <span className={`w-2 h-2 rounded-full ${config.stock > 0 ? "bg-emerald-400" : "bg-rose-400"}`} />
                                        {config.stock > 0 ? `${config.stock} en stock` : "Sin stock"}
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-700">·</span>
                                    <span className="text-slate-500 dark:text-slate-400">
                                        Podés pedir hasta <strong>{config.limiteMensual}</strong> por mes
                                        {pedidosMes > 0 && `, llevás ${pedidosMes} este mes`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Formulario de compra */}
                        {canBuy ? (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                                <p className="text-[13px] font-bold text-slate-800 dark:text-white mb-4">Realizar pedido</p>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Cantidad */}
                                    <div>
                                        <label className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold block mb-1.5">Cantidad</label>
                                        <div className="flex items-center gap-2">
                                            <button type="button"
                                                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-lg font-bold">
                                                −
                                            </button>
                                            <span className="w-10 text-center text-[15px] font-bold text-slate-800 dark:text-white">{cantidad}</span>
                                            <button type="button"
                                                onClick={() => setCantidad((c) => Math.min(maxCantidad, c + 1))}
                                                disabled={cantidad >= maxCantidad}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all text-lg font-bold">
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Método de pago */}
                                    <div>
                                        <label className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold block mb-1.5">Método de pago</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(["mercadopago", "transferencia", "efectivo"] as const).map((m) => (
                                                <button key={m} type="button"
                                                    onClick={() => { setMetodoPago(m); setComprobante(null); setComprobanteFileName(""); }}
                                                    className={`px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all border
                                                        ${metodoPago === m
                                                            ? "bg-[#063f68] border-[#063f68] text-white"
                                                            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                                                    {METODO_LABELS[m]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Comprobante si transferencia */}
                                    {metodoPago === "transferencia" && (
                                        <div>
                                            <label className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold block mb-1.5">
                                                Comprobante de transferencia
                                            </label>
                                            {comprobante ? (
                                                <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-700/30 bg-emerald-50 dark:bg-emerald-900/10">
                                                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                                                    <span className="text-[12px] text-emerald-700 dark:text-emerald-400 flex-1 truncate">{comprobanteFileName}</span>
                                                    <button type="button" onClick={() => { setComprobante(null); setComprobanteFileName(""); }}
                                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                                    {uploadingFile ? (
                                                        <Loader2 size={15} className="animate-spin text-slate-400" />
                                                    ) : (
                                                        <Upload size={15} className="text-slate-400" />
                                                    )}
                                                    <span className="text-[12px] text-slate-400">
                                                        {uploadingFile ? "Subiendo..." : "Subir comprobante (imagen o PDF)"}
                                                    </span>
                                                    <input type="file" className="hidden" accept="image/*,.pdf"
                                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                                                </label>
                                            )}
                                        </div>
                                    )}

                                    {/* Total */}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <span className="text-[12px] text-slate-500">Total</span>
                                        <span className="text-[17px] font-black text-slate-800 dark:text-white">
                                            ${(config.precio * cantidad).toLocaleString("es-AR")}
                                        </span>
                                    </div>

                                    {error && (
                                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/30 text-[12px] text-rose-600 dark:text-rose-400">
                                            {error}
                                        </div>
                                    )}

                                    {success && (
                                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 text-[12px] text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                            <CheckCircle2 size={14} /> Pedido registrado exitosamente.
                                        </div>
                                    )}

                                    <button type="submit" disabled={submitting || uploadingFile}
                                        className="w-full h-11 rounded-xl bg-[#063f68] text-white text-[13px] font-bold hover:bg-[#0a4d7a] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                        {submitting ? <Loader2 size={15} className="animate-spin" /> : <Cpu size={15} />}
                                        Confirmar pedido
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                                <Cpu size={28} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                                <p className="text-[13px] font-semibold text-slate-500">
                                    {config.stock === 0
                                        ? "Sin stock disponible por el momento."
                                        : `Ya alcanzaste el límite de ${config.limiteMensual} token(s) este mes.`}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Mis pedidos */}
                    <div className="space-y-3">
                        <p className="text-[13px] font-bold text-slate-800 dark:text-white px-1">Mis pedidos</p>
                        {pedidos.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-10 text-center">
                                <Cpu size={24} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                                <p className="text-[12px] text-slate-400">Sin pedidos aún</p>
                            </div>
                        ) : (
                            pedidos.map((p) => (
                                <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[13px] font-bold text-slate-800 dark:text-white">
                                                {p.cantidad} token{p.cantidad > 1 ? "s" : ""}
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                {METODO_LABELS[p.metodoPago] ?? p.metodoPago}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTADO_COLORS[p.estado] ?? ""}`}>
                                            {ESTADO_LABELS[p.estado] ?? p.estado}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                        {new Date(p.createdAt).toLocaleDateString("es-AR", {
                                            day: "2-digit", month: "2-digit", year: "numeric",
                                            hour: "2-digit", minute: "2-digit",
                                        })}
                                    </p>
                                    {p.observacion && (
                                        <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5">{p.observacion}</p>
                                    )}
                                    {p.estado === "pendiente" && (
                                        <button
                                            onClick={() => cancelarPedido(p.id)}
                                            disabled={cancelingId === p.id}
                                            className="flex items-center gap-1.5 px-3 h-7 rounded-lg border border-rose-200 dark:border-rose-700/30 text-rose-500 text-[11px] font-semibold hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50 transition-all"
                                        >
                                            {cancelingId === p.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                                            Cancelar pedido
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
