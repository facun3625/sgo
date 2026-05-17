"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, Trash2, FolderOpen } from "lucide-react";

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
    detalle?: {
        sinExpediente: { cod: string; pdf: string }[];
        sinPdf: { cod: string; pdf: string; expediente: string }[];
    };
    _debug?: { uploadDir: string; archivosEnCarpeta: number; primero: string; codsEnExcel: number; expedientesResueltos: number };
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
    const [eliminando, setEliminando] = useState<string | null>(null);
    const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, UploadResult | { error: string }>>({});
    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const descargarDetalle = (tipo: string, result: UploadResult) => {
        const rows: string[] = ["tipo,motivo,cod,expediente,pdf"];
        result.detalle?.sinExpediente.forEach(r =>
            rows.push(`${tipo},Sin expediente en datos,${r.cod},,${r.pdf}`)
        );
        result.detalle?.sinPdf.forEach(r =>
            rows.push(`${tipo},PDF no encontrado en servidor,${r.cod},${r.expediente},${r.pdf}`)
        );
        const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `errores_boletas_${tipo}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    const handleEliminar = async (tipo: string) => {
        setEliminando(tipo);
        setConfirmEliminar(null);
        try {
            await fetch(`/api/admin/boletas?tipo=${tipo}`, { method: "DELETE" });
            await fetchBatches();
            setResults(prev => { const n = { ...prev }; delete n[tipo]; return n; });
        } finally {
            setEliminando(null);
        }
    };

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
            fd.append("excel", file);

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
                    Subí el Excel de índice. Los PDFs deben estar cargados previamente en el servidor por FTP.
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
                                    <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3 space-y-1.5 text-[12px]">
                                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                                            <CheckCircle2 size={14} /> Procesados: {result.procesados.toLocaleString()}
                                        </div>
                                        {result.noEncontrados > 0 && (
                                            <p className="text-amber-600 dark:text-amber-400 font-medium pl-5">
                                                Sin expediente en datos: {result.noEncontrados}
                                            </p>
                                        )}
                                        {result.pdfFaltantes > 0 && (
                                            <p className="text-amber-600 dark:text-amber-400 font-medium pl-5">
                                                PDF no encontrado: {result.pdfFaltantes}
                                            </p>
                                        )}
                                        {result._debug && (
                                            <div className="mt-1 ml-5 text-[10px] font-mono text-slate-400 space-y-0.5">
                                                <p>📁 {result._debug.uploadDir}</p>
                                                <p>🗂 Archivos en carpeta: {result._debug.archivosEnCarpeta} · Primero: {result._debug.primero || "—"}</p>
                                                <p>📊 Cods en Excel: {result._debug.codsEnExcel} · Expedientes resueltos: {result._debug.expedientesResueltos}</p>
                                            </div>
                                        )}
                                        {(result.noEncontrados > 0 || result.pdfFaltantes > 0) && (
                                            <button
                                                onClick={() => descargarDetalle(tipo, result)}
                                                className="ml-5 flex items-center gap-1.5 text-[11px] font-bold text-[#063f68] dark:text-blue-400 hover:underline"
                                            >
                                                <FileSpreadsheet size={12} /> Descargar detalle CSV
                                            </button>
                                        )}
                                    </div>
                                )
                            )}

                            {/* Eliminar PDFs */}
                            {confirmEliminar === tipo ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400">¿Eliminar todos los PDFs y registros?</span>
                                    <button onClick={() => handleEliminar(tipo)} disabled={!!eliminando}
                                        className="flex items-center gap-1.5 px-3 h-7 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 disabled:opacity-50 transition-all">
                                        {eliminando === tipo ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                        {eliminando === tipo ? "Eliminando..." : "Sí, eliminar"}
                                    </button>
                                    <button onClick={() => setConfirmEliminar(null)} className="text-[11px] text-slate-400 hover:text-slate-600">Cancelar</button>
                                </div>
                            ) : (
                                <button onClick={() => setConfirmEliminar(tipo)} disabled={!!uploading || !!eliminando}
                                    className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors">
                                    <Trash2 size={12} /> Vaciar carpeta y registros
                                </button>
                            )}

                            {/* Upload */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Excel de índice (.xlsx / .xls)
                                </label>
                                <input
                                    ref={el => { fileRefs.current[tipo] = el; }}
                                    type="file"
                                    accept=".xlsx,.xls"
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
                                        <><FileSpreadsheet size={14} /> Procesar Excel</>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Format hint */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex gap-3 items-start">
                <FolderOpen size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed space-y-1.5">
                    <p className="font-bold text-slate-600 dark:text-slate-300">Flujo de carga</p>
                    <p><strong>1. FTP:</strong> Subí los PDFs al servidor en la carpeta correspondiente:</p>
                    <div className="font-mono bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 space-y-0.5 text-[10px]">
                        <p>public/uploads/boletas/<strong>mensual</strong>/</p>
                        <p>public/uploads/boletas/<strong>anual</strong>/</p>
                        <p>public/uploads/boletas/<strong>deuda</strong>/</p>
                    </div>
                    <p><strong>2. Excel:</strong> Subí el Excel de índice con las columnas:</p>
                    <p className="pl-2">· <strong>Mensual/Anual:</strong> <code>periodo</code>, <code>id_cliente</code>, <code>pdf</code> (+ <code>factura</code> opcional)</p>
                    <p className="pl-2">· <strong>Deuda:</strong> <code>Periodo</code>, <code>Cod_Cliente</code>, <code>pdf</code></p>
                    <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1"><Trash2 size={10} /> Al procesar un nuevo Excel, los registros anteriores del mismo tipo se reemplazan. Los PDFs en el servidor no se tocan.</p>
                </div>
            </div>
        </div>
    );
}
