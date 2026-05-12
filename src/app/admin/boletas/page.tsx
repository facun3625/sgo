"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2, FileArchive, Trash2 } from "lucide-react";

interface Batch {
    tipo: "mensual" | "anual" | "deuda";
    periodo: string | null;
    total: number;
    uploadedAt: string | null;
}

interface UploadResult {
    procesados: number;
    noEncontrados: number;
    pdfFaltantes: number;
    periodo: string;
}

const TIPO_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
    mensual: { label: "Cuota Mensual", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-100 dark:border-emerald-900/40" },
    anual: { label: "Matrícula Anual", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-100 dark:border-blue-900/40" },
    deuda: { label: "Deudas", color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-100 dark:border-rose-900/40" },
};

export default function BoletasAdminPage() {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, UploadResult | { error: string }>>({});
    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const fetchBatches = async () => {
        const res = await fetch("/api/admin/boletas");
        if (res.ok) setBatches(await res.json());
        setLoading(false);
    };

    useEffect(() => { fetchBatches(); }, []);

    const handleUpload = async (tipo: string) => {
        const fileInput = fileRefs.current[tipo];
        const file = fileInput?.files?.[0];
        if (!file) return;

        setUploading(tipo);
        setResults(prev => { const n = { ...prev }; delete n[tipo]; return n; });

        try {
            const fd = new FormData();
            fd.append("tipo", tipo);
            fd.append("zip", file);

            const res = await fetch("/api/admin/boletas/upload", { method: "POST", body: fd });
            const data = await res.json();

            if (!res.ok) {
                setResults(prev => ({ ...prev, [tipo]: { error: data.error || "Error al procesar" } }));
            } else {
                setResults(prev => ({ ...prev, [tipo]: data }));
                await fetchBatches();
            }
        } catch {
            setResults(prev => ({ ...prev, [tipo]: { error: "Error de conexión" } }));
        } finally {
            setUploading(null);
            if (fileInput) fileInput.value = "";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={28} className="animate-spin text-[#063f68]" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-black text-black dark:text-white tracking-tight">Boletas Santa Fe Servicios</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Subí un ZIP con el Excel y los PDFs. El lote anterior del mismo tipo se elimina automáticamente.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {(["mensual", "anual", "deuda"] as const).map((tipo) => {
                    const batch = batches.find(b => b.tipo === tipo);
                    const meta = TIPO_LABELS[tipo];
                    const isUploading = uploading === tipo;
                    const result = results[tipo];

                    return (
                        <div key={tipo} className={`rounded-2xl border p-6 space-y-5 ${meta.bg} ${meta.border}`}>
                            <div className="flex items-center justify-between">
                                <h2 className={`font-bold text-lg ${meta.color}`}>{meta.label}</h2>
                                {batch?.total ? (
                                    <span className="text-[11px] font-bold text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700">
                                        {batch.total.toLocaleString()} clientes
                                    </span>
                                ) : null}
                            </div>

                            {/* Current batch info */}
                            {batch?.periodo ? (
                                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 space-y-1 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lote actual</p>
                                    <p className="font-bold text-black dark:text-white text-sm">{batch.periodo}</p>
                                    {batch.uploadedAt && (
                                        <p className="text-[11px] text-slate-400">
                                            Subido el {new Date(batch.uploadedAt).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[12px] text-slate-400 font-medium">Sin lote cargado</p>
                                </div>
                            )}

                            {/* Result */}
                            {result && (
                                "error" in result ? (
                                    <div className="flex items-center gap-2 text-rose-600 text-[12px] font-bold bg-rose-50 dark:bg-rose-950/20 rounded-xl p-3">
                                        <AlertCircle size={14} /> {result.error}
                                    </div>
                                ) : (
                                    <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3 space-y-1 text-[12px]">
                                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                                            <CheckCircle2 size={14} /> Procesados: {result.procesados.toLocaleString()}
                                        </div>
                                        {result.noEncontrados > 0 && (
                                            <p className="text-amber-600 dark:text-amber-400 font-medium pl-5">
                                                Sin expediente: {result.noEncontrados}
                                            </p>
                                        )}
                                        {result.pdfFaltantes > 0 && (
                                            <p className="text-amber-600 dark:text-amber-400 font-medium pl-5">
                                                PDF no encontrado: {result.pdfFaltantes}
                                            </p>
                                        )}
                                    </div>
                                )
                            )}

                            {/* Upload */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Nuevo lote (ZIP)
                                </label>
                                <input
                                    ref={el => { fileRefs.current[tipo] = el; }}
                                    type="file"
                                    accept=".zip"
                                    disabled={isUploading}
                                    className="w-full text-[12px] text-slate-600 dark:text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-white dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300 file:cursor-pointer hover:file:bg-slate-50 dark:hover:file:bg-slate-700 transition-all"
                                />
                                <button
                                    onClick={() => handleUpload(tipo)}
                                    disabled={isUploading || !!uploading}
                                    className="w-full h-10 flex items-center justify-center gap-2 bg-[#063f68] hover:bg-[#0a4d7a] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-[12px] transition-all"
                                >
                                    {isUploading ? (
                                        <><Loader2 size={14} className="animate-spin" /> Procesando...</>
                                    ) : (
                                        <><Upload size={14} /> Subir y procesar</>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Format hint */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex gap-3 items-start">
                <FileArchive size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed space-y-1">
                    <p className="font-bold text-slate-600 dark:text-slate-300">Formato del ZIP</p>
                    <p><strong>Mensual/Anual:</strong> Excel con columnas <code>periodo</code>, <code>id_cliente</code>, <code>pdf</code> (+ <code>factura</code> opcional). PDFs nombrados como indica la columna <code>pdf</code>.</p>
                    <p><strong>Deuda:</strong> Excel con columnas <code>Periodo</code>, <code>Cod_Cliente</code>, <code>pdf</code>. PDFs nombrados como indica la columna <code>pdf</code>.</p>
                    <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1"><Trash2 size={10} /> Al procesar un nuevo lote, el anterior se elimina automáticamente.</p>
                </div>
            </div>
        </div>
    );
}
