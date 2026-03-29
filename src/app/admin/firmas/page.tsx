"use client";

import { useState, useEffect, useRef } from "react";
import { PenLine, Upload, Loader2, Trash2, Plus, Check, IdCard, FileText, X, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Firma {
    id: number;
    cargo: string;
    nombre: string | null;
    firma: string | null;
    enCredencial: boolean;
    enCertificado: boolean;
}

export default function FirmasPage() {
    const { showToast } = useToast();
    const [firmas, setFirmas] = useState<Firma[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<number | null>(null);
    const [saving, setSaving] = useState<number | null>(null);
    const [localPreviews, setLocalPreviews] = useState<Record<number, string>>({});
    const [editValues, setEditValues] = useState<Record<number, { cargo: string; nombre: string }>>({});
    const [newCargo, setNewCargo] = useState("");
    const [addingNew, setAddingNew] = useState(false);
    const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

    useEffect(() => {
        fetch("/api/admin/firmas").then(r => r.json()).then((data: Firma[]) => {
            setFirmas(data);
            const ev: Record<number, { cargo: string; nombre: string }> = {};
            data.forEach(f => { ev[f.id] = { cargo: f.cargo, nombre: f.nombre || "" }; });
            setEditValues(ev);
        }).finally(() => setLoading(false));
    }, []);

    async function addFirma() {
        if (!newCargo.trim()) return;
        setAddingNew(true);
        const res = await fetch("/api/admin/firmas", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cargo: newCargo.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
            setFirmas(prev => [...prev, data]);
            setEditValues(prev => ({ ...prev, [data.id]: { cargo: data.cargo, nombre: "" } }));
            setNewCargo("");
            showToast("Firmante agregado", "success");
        }
        setAddingNew(false);
    }

    async function saveFirma(id: number) {
        setSaving(id);
        try {
            const vals = editValues[id];
            const res = await fetch("/api/admin/firmas", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, cargo: vals.cargo, nombre: vals.nombre || null }),
            });
            if (res.ok) {
                const updated = await res.json();
                setFirmas(prev => prev.map(f => f.id === id ? { ...f, ...updated } : f));
                showToast("Guardado", "success");
            } else {
                showToast("Error al guardar", "error");
            }
        } finally {
            setSaving(null);
        }
    }

    async function toggleFlag(id: number, flag: "enCredencial" | "enCertificado") {
        const firma = firmas.find(f => f.id === id)!;
        const newVal = !firma[flag];
        const res = await fetch("/api/admin/firmas", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, [flag]: newVal }),
        });
        if (res.ok) {
            if (flag === "enCertificado" && newVal) {
                // Desactivar los demás
                setFirmas(prev => prev.map(f => ({ ...f, enCertificado: f.id === id })));
            } else {
                setFirmas(prev => prev.map(f => f.id === id ? { ...f, [flag]: newVal } : f));
            }
        }
    }

    async function uploadFirma(id: number, file: File) {
        const localUrl = URL.createObjectURL(file);
        setLocalPreviews(prev => ({ ...prev, [id]: localUrl }));
        setUploading(id);
        const form = new FormData();
        form.append("file", file);
        form.append("cargo", String(id));
        const res = await fetch("/api/admin/firmas/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) { showToast(data.error || "Error al subir", "error"); setUploading(null); return; }
        const res2 = await fetch("/api/admin/firmas", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, firma: data.url }),
        });
        if (res2.ok) {
            setFirmas(prev => prev.map(f => f.id === id ? { ...f, firma: data.url } : f));
            setLocalPreviews(prev => { const n = { ...prev }; delete n[id]; return n; });
            showToast("Firma subida", "success");
        }
        setUploading(null);
    }

    async function clearFirma(id: number) {
        await fetch("/api/admin/firmas", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, firma: null }),
        });
        setFirmas(prev => prev.map(f => f.id === id ? { ...f, firma: null } : f));
        setLocalPreviews(prev => { const n = { ...prev }; delete n[id]; return n; });
    }

    async function reorder(reordered: Firma[]) {
        setFirmas(reordered);
        try {
            const res = await fetch("/api/admin/firmas/reorder", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: reordered.map(f => f.id) }),
            });
            if (res.ok) {
                showToast("Orden actualizado", "success");
            } else {
                showToast("Error al reordenar", "error");
                setFirmas(firmas); // revert
            }
        } catch {
            showToast("Error al reordenar", "error");
            setFirmas(firmas); // revert
        }
    }

    async function moveUp(id: number) {
        const idx = firmas.findIndex(f => f.id === id);
        if (idx <= 0) return;
        const reordered = [...firmas];
        [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
        await reorder(reordered);
    }

    async function moveDown(id: number) {
        const idx = firmas.findIndex(f => f.id === id);
        if (idx >= firmas.length - 1) return;
        const reordered = [...firmas];
        [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
        await reorder(reordered);
    }

    async function deleteFirma(id: number) {
        await fetch("/api/admin/firmas", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        setFirmas(prev => prev.filter(f => f.id !== id));
        showToast("Eliminado", "success");
    }

    const firmasCredencial = firmas.filter(f => f.enCredencial);
    const firmaCertificado = firmas.find(f => f.enCertificado);

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-slate-300" /></div>;

    return (
        <div className="p-6 md:p-10">
            <div className="mb-7 flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <PenLine size={20} className="text-indigo-500" /> Firmantes y Autoridades
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">Configurá quién firma la credencial y los certificados.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <input value={newCargo} onChange={e => setNewCargo(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addFirma()}
                        placeholder="Nuevo cargo (ej: Protesorero)"
                        className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-300/50 w-52" />
                    <button onClick={addFirma} disabled={addingNew || !newCargo.trim()}
                        className="h-9 px-4 bg-indigo-500 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center gap-1.5">
                        {addingNew ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Agregar
                    </button>
                </div>
            </div>

            {/* Leyenda */}
            <div className="flex gap-4 mb-5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <IdCard size={13} className="text-amber-500" /> En credencial (dorso)
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <FileText size={13} className="text-sky-500" /> Firma certificados (solo uno activo)
                </div>
            </div>

            {firmas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl gap-3">
                    <PenLine size={28} className="text-slate-200 dark:text-slate-700" />
                    <p className="text-[13px] text-slate-400">No hay firmantes configurados</p>
                </div>
            ) : (
                <div className="space-y-3 max-w-3xl">
                    {firmas.map(f => {
                        const previewImg = localPreviews[f.id] || f.firma;
                        const ev = editValues[f.id] || { cargo: f.cargo, nombre: f.nombre || "" };
                        return (
                            <div key={f.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                                <div className="p-4 flex gap-4 items-start">
                                    {/* Firma imagen */}
                                    <div className="flex-shrink-0">
                                        <div className="w-24 h-16 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group cursor-pointer"
                                            onClick={() => fileRefs.current[f.id]?.click()}>
                                            {previewImg ? (
                                                <img src={previewImg} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply dark:mix-blend-normal p-1" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-1 text-slate-300">
                                                    <Upload size={16} />
                                                    <span className="text-[9px]">Firma</span>
                                                </div>
                                            )}
                                            {uploading === f.id && (
                                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <Upload size={14} className="text-slate-600" />
                                            </div>
                                        </div>
                                        {previewImg && (
                                            <button onClick={() => clearFirma(f.id)}
                                                className="mt-1 w-full text-[9px] text-rose-400 hover:text-rose-600 flex items-center justify-center gap-0.5 transition-colors">
                                                <X size={9} /> Quitar
                                            </button>
                                        )}
                                        <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
                                            ref={el => { fileRefs.current[f.id] = el; }}
                                            onChange={e => { const file = e.target.files?.[0]; if (file) uploadFirma(f.id, file); e.target.value = ""; }} />
                                    </div>

                                    {/* Datos */}
                                    <div className="flex-1 space-y-2 min-w-0">
                                        <div className="flex gap-2">
                                            <input value={ev.cargo}
                                                onChange={e => setEditValues(prev => ({ ...prev, [f.id]: { ...ev, cargo: e.target.value } }))}
                                                placeholder="Cargo (ej: Protesorero)"
                                                className="flex-1 h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[12px] font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300/50" />
                                            <input value={ev.nombre}
                                                onChange={e => setEditValues(prev => ({ ...prev, [f.id]: { ...ev, nombre: e.target.value } }))}
                                                placeholder="Nombre completo"
                                                className="flex-1 h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-300/50" />
                                            <button onClick={() => saveFirma(f.id)} disabled={saving === f.id}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-all flex-shrink-0">
                                                {saving === f.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                            </button>
                                        </div>

                                                        {/* Toggles */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-0.5 mr-1">
                                                <button onClick={() => moveUp(f.id)} disabled={firmas.indexOf(f) === 0}
                                                    className="w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors">
                                                    <ChevronUp size={13} />
                                                </button>
                                                <button onClick={() => moveDown(f.id)} disabled={firmas.indexOf(f) === firmas.length - 1}
                                                    className="w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors">
                                                    <ChevronDown size={13} />
                                                </button>
                                            </div>
                                            <button onClick={() => toggleFlag(f.id, "enCredencial")}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all
                                                    ${f.enCredencial
                                                        ? "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
                                                        : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-amber-200 hover:text-amber-500"}`}>
                                                <IdCard size={11} /> En credencial
                                            </button>
                                            <button onClick={() => toggleFlag(f.id, "enCertificado")}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all
                                                    ${f.enCertificado
                                                        ? "bg-sky-50 border-sky-200 text-sky-600 dark:bg-sky-900/20 dark:border-sky-800 dark:text-sky-400"
                                                        : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-sky-200 hover:text-sky-500"}`}>
                                                <FileText size={11} /> Firma certificados
                                            </button>
                                            <button onClick={() => deleteFirma(f.id)}
                                                className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Previews */}
            <div className="mt-8 grid md:grid-cols-2 gap-6 max-w-3xl">
                {/* Credencial */}
                <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                        <IdCard size={12} className="text-amber-500" /> Vista previa credencial (dorso)
                    </p>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        {firmasCredencial.length === 0 ? (
                            <p className="text-[11px] text-slate-300 text-center py-4">Sin firmantes en credencial</p>
                        ) : (
                            <div className="flex justify-around items-end">
                                {firmasCredencial.map(f => {
                                    const img = localPreviews[f.id] || f.firma;
                                    const nombre = editValues[f.id]?.nombre || f.nombre;
                                    return (
                                        <div key={f.id} className="text-center min-w-[90px]">
                                            <div className="h-10 flex items-end justify-center mb-1">
                                                {img ? <img src={img} alt="" className="max-h-full max-w-[80px] object-contain mix-blend-multiply" />
                                                    : <span className="text-[9px] italic text-slate-200">Sin firma</span>}
                                            </div>
                                            <div className="border-t border-slate-100 pt-1">
                                                <p className="text-[8px] font-bold text-slate-800">{editValues[f.id]?.cargo || f.cargo}</p>
                                                {nombre && <p className="text-[7px] text-slate-400 mt-0.5">{nombre}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Certificado */}
                <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                        <FileText size={12} className="text-sky-500" /> Vista previa certificado
                    </p>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        {!firmaCertificado ? (
                            <p className="text-[11px] text-slate-300 text-center py-4">Sin firmante activo para certificados</p>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="h-12 flex items-end justify-center mb-2">
                                    {(localPreviews[firmaCertificado.id] || firmaCertificado.firma)
                                        ? <img src={localPreviews[firmaCertificado.id] || firmaCertificado.firma!} alt="" className="max-h-full max-w-[100px] object-contain mix-blend-multiply" />
                                        : <span className="text-[9px] italic text-slate-200">Sin firma</span>}
                                </div>
                                <div className="border-t border-slate-100 pt-2 text-center">
                                    <p className="text-[9px] font-bold text-slate-800">{editValues[firmaCertificado.id]?.cargo || firmaCertificado.cargo}</p>
                                    {(editValues[firmaCertificado.id]?.nombre || firmaCertificado.nombre) &&
                                        <p className="text-[8px] text-slate-400 mt-0.5">{editValues[firmaCertificado.id]?.nombre || firmaCertificado.nombre}</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
