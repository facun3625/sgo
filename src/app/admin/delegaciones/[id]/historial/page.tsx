"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, History, Loader2, X, Download } from "lucide-react";
import { exportarCobrosExcel } from "@/lib/exportCobrosExcel";

interface CobroFila {
    tipo: "cuota_mensual" | "matricula_anual" | "deuda";
    expediente: string;
    nombre: string;
    apellido: string;
    monto: number;
    fecha: string | null;
    comprobante: string | null;
}

const LABEL_TIPO_COBRO: Record<CobroFila["tipo"], string> = {
    cuota_mensual: "Cuota mensual",
    matricula_anual: "Matrícula anual",
    deuda: "Deuda vencida",
};

function mesActual() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function HistorialDelegacionPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [nombre, setNombre] = useState("");
    const [mesFiltro, setMesFiltro] = useState(mesActual());
    const [cobros, setCobros] = useState<CobroFila[]>([]);
    const [totalCobrado, setTotalCobrado] = useState(0);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const cargar = useCallback(async (mes: string) => {
        setLoading(true);
        try {
            const params = mes ? `?mes=${mes}` : "";
            const res = await fetch(`/api/admin/delegaciones/${id}${params}`);
            if (!res.ok) { setNotFound(true); return; }
            const data = await res.json();
            setNombre(data.delegacion.nombre);
            setCobros(data.cobros ?? []);
            setTotalCobrado(data.totalCobrado ?? 0);
        } finally { setLoading(false); }
    }, [id]);

    useEffect(() => { cargar(mesFiltro); }, [cargar, mesFiltro]);

    if (notFound) {
        return (
            <div className="p-6 md:p-8">
                <p className="text-[14px] text-slate-400">Delegación no encontrada.</p>
                <button onClick={() => router.push("/admin/delegaciones")} className="mt-3 text-[13px] font-semibold text-emerald-600 hover:underline">
                    ← Volver a Delegaciones
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            <button onClick={() => router.push("/admin/delegaciones")}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all">
                <ArrowLeft size={15} /> Delegaciones
            </button>

            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <Building2 size={20} className="text-emerald-600" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                        {loading && !nombre ? "Cargando..." : `Historial — ${nombre}`}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Todos los cobros en efectivo registrados por esta delegación</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <History size={16} className="text-emerald-600" />
                        <p className="text-[14px] font-bold text-slate-800 dark:text-white">
                            {cobros.length} cobro{cobros.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <div className="flex items-end gap-4">
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mes</p>
                            <div className="flex items-center gap-2">
                                <input type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}
                                    className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                {mesFiltro && (
                                    <button onClick={() => setMesFiltro("")}
                                        className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[12px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 whitespace-nowrap">
                                        <X size={12} /> Todos los meses
                                    </button>
                                )}
                            </div>
                        </div>
                        {cobros.length > 0 && (
                            <div className="pl-4 border-l border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total</p>
                                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">${totalCobrado.toLocaleString("es-AR")}</p>
                                </div>
                                <button onClick={() => exportarCobrosExcel(cobros, `Cobros_${nombre || "delegacion"}_${mesFiltro || "todos"}.xlsx`)}
                                    className="flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold transition-all whitespace-nowrap">
                                    <Download size={14} /> Exportar Excel
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
                ) : cobros.length === 0 ? (
                    <p className="text-[13px] text-slate-400 py-12 text-center">
                        {mesFiltro ? "Sin cobros registrados en ese mes." : "Esta delegación todavía no registró cobros."}
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    {["Matriculado", "Expediente", "Tipo", "Fecha", "N° Comprobante", "Monto"].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {cobros.map((c, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 text-[13px] text-slate-700 dark:text-slate-300 whitespace-nowrap">{c.apellido}, {c.nombre}</td>
                                        <td className="px-4 py-3 font-mono text-[12px] text-slate-500 dark:text-slate-400">{c.expediente}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold
                                                ${c.tipo === "deuda" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                                                : c.tipo === "matricula_anual" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"}`}>
                                                {LABEL_TIPO_COBRO[c.tipo]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[12px] text-slate-500 whitespace-nowrap">{c.fecha ? new Date(c.fecha).toLocaleDateString("es-AR") : "—"}</td>
                                        <td className="px-4 py-3 font-mono text-[12px] text-slate-500 dark:text-slate-400">{c.comprobante || "—"}</td>
                                        <td className="px-4 py-3 text-[13px] font-bold text-slate-800 dark:text-white whitespace-nowrap">${c.monto.toLocaleString("es-AR")}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
