"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Landmark, Upload, X, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface Props {
    inscripcionId: number;
    monto: number;
    label?: string;
    className?: string;
    onSuccess?: () => void;
}

export default function GuestTransferenciaPayButton({ inscripcionId, monto, label = "Pagar con transferencia", className, onSuccess }: Props) {
    const [open, setOpen] = useState(false);
    const [cbu, setCbu] = useState<{ cbu: string; alias: string } | null>(null);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [comprobante, setComprobante] = useState<string | null>(null);
    const [fileName, setFileName] = useState("");
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    async function abrir() {
        setOpen(true);
        setError(""); setDone(false); setComprobante(null); setFileName("");
        if (!cbu) {
            setLoadingInfo(true);
            const res = await fetch("/api/cursos/pago/config");
            if (res.ok) {
                const d = await res.json();
                setCbu({ cbu: d.cbu ?? "", alias: d.alias ?? "" });
            }
            setLoadingInfo(false);
        }
    }

    async function handleUpload(file: File) {
        setUploading(true); setError("");
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/cursos/pago/upload", { method: "POST", body: form });
        if (res.ok) {
            const d = await res.json();
            setComprobante(d.url);
            setFileName(file.name);
        } else {
            setError("Error al subir el archivo.");
        }
        setUploading(false);
    }

    async function handleSubmit() {
        if (!comprobante) { setError("Debés adjuntar el comprobante."); return; }
        setSubmitting(true); setError("");
        const res = await fetch("/api/cursos/pago/transferencia", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId, comprobante }),
        });
        if (res.ok) {
            setDone(true);
            onSuccess?.();
        } else {
            const d = await res.json();
            setError(d.error ?? "Error al enviar.");
        }
        setSubmitting(false);
    }

    return (
        <div className="space-y-1.5">
            <button onClick={abrir}
                className={className ?? "flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-[13px] font-bold disabled:opacity-50 transition-all"}>
                <Landmark size={15} />
                {label}
            </button>

            {open && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/50 animate-fade-in">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Landmark size={18} className="text-slate-500" />
                                <h3 className="text-[15px] font-bold text-slate-800">Pagar por transferencia</h3>
                            </div>
                            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-all">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {done ? (
                                <div className="flex flex-col items-center gap-3 py-6 px-5 text-center bg-emerald-50 border border-emerald-200 rounded-2xl">
                                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle2 size={28} className="text-emerald-600" />
                                    </div>
                                    <p className="text-[16px] font-black text-emerald-800">¡Listo, ya sos parte del curso! 🎉</p>
                                    <p className="text-[13px] text-emerald-700">En breve te va a llegar un email confirmando tu inscripción. Si tenés alguna duda mientras tanto, escribinos al Colegio y te ayudamos.</p>
                                    <button onClick={() => setOpen(false)} className="mt-2 px-6 h-10 rounded-xl bg-white text-emerald-700 border border-emerald-300 text-[13px] font-semibold hover:bg-emerald-100 transition-all">
                                        Cerrar
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                                        <span className="text-[12px] text-slate-500">Total a transferir</span>
                                        <span className="text-[20px] font-black text-slate-900">${monto.toLocaleString("es-AR")}</span>
                                    </div>

                                    {loadingInfo ? (
                                        <div className="flex items-center justify-center py-4"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
                                    ) : cbu && (cbu.cbu || cbu.alias) ? (
                                        <div className="space-y-2 p-4 rounded-xl bg-blue-50 border border-blue-100">
                                            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Datos de transferencia</p>
                                            {cbu.cbu && (
                                                <div>
                                                    <p className="text-[10px] text-blue-600/60 uppercase tracking-wide">CBU</p>
                                                    <p className="text-[13px] font-mono font-bold text-blue-800 select-all">{cbu.cbu}</p>
                                                </div>
                                            )}
                                            {cbu.alias && (
                                                <div>
                                                    <p className="text-[10px] text-blue-600/60 uppercase tracking-wide">Alias</p>
                                                    <p className="text-[13px] font-mono font-bold text-blue-800 select-all">{cbu.alias}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : null}

                                    <div>
                                        <label className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold block mb-2">Adjuntar comprobante</label>
                                        {comprobante ? (
                                            <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                                                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                                                <span className="text-[12px] text-emerald-700 flex-1 truncate">{fileName}</span>
                                                <button onClick={() => { setComprobante(null); setFileName(""); }}>
                                                    <X size={14} className="text-slate-400" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 cursor-pointer hover:bg-slate-50 transition-all">
                                                {uploading ? <Loader2 size={15} className="animate-spin text-slate-400" /> : <Upload size={15} className="text-slate-400" />}
                                                <span className="text-[12px] text-slate-400">{uploading ? "Subiendo..." : "Subir comprobante (imagen o PDF)"}</span>
                                                <input type="file" className="hidden" accept="image/*,.pdf"
                                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                                            </label>
                                        )}
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[12px] text-rose-600">
                                            <AlertCircle size={14} className="flex-shrink-0" /> {error}
                                        </div>
                                    )}

                                    <button onClick={handleSubmit} disabled={submitting || uploading || !comprobante}
                                        className="w-full h-11 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-[13px] font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                        {submitting ? <Loader2 size={15} className="animate-spin" /> : <Landmark size={15} />}
                                        {submitting ? "Enviando..." : "Enviar comprobante"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
