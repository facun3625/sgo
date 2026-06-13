"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Trash2, Upload, Loader2, Plus, Download } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface TurneroItem {
    id: number;
    titulo: string;
    archivo: string;
    createdAt: string;
}

export default function AdminTurneroFiscalesPage() {
    const { showToast } = useToast();
    const [items, setItems] = useState<TurneroItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [titulo, setTitulo] = useState("");
    const [archivo, setArchivo] = useState<File | null>(null);
    const [subiendo, setSubiendo] = useState(false);
    const [eliminando, setEliminando] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    async function cargar() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/turnero-fiscales");
            if (res.ok) setItems(await res.json());
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { cargar(); }, []);

    async function handleSubir() {
        if (!titulo.trim()) { showToast("Ingresá un título", "error"); return; }
        if (!archivo) { showToast("Seleccioná un PDF", "error"); return; }
        setSubiendo(true);
        try {
            const fd = new FormData();
            fd.append("titulo", titulo.trim());
            fd.append("archivo", archivo);
            const res = await fetch("/api/admin/turnero-fiscales", { method: "POST", body: fd });
            if (res.ok) {
                showToast("Archivo subido correctamente", "success");
                setTitulo("");
                setArchivo(null);
                if (inputRef.current) inputRef.current.value = "";
                cargar();
            } else {
                const d = await res.json();
                showToast(d.error ?? "Error al subir", "error");
            }
        } catch { showToast("Error de conexión", "error"); }
        finally { setSubiendo(false); }
    }

    async function handleEliminar(id: number) {
        setEliminando(id);
        try {
            const res = await fetch("/api/admin/turnero-fiscales", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (res.ok) { showToast("Eliminado", "success"); cargar(); }
            else showToast("Error al eliminar", "error");
        } catch { showToast("Error de conexión", "error"); }
        finally { setEliminando(null); }
    }

    return (
        <div className="p-6 md:p-10 max-w-2xl space-y-8">
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText size={20} className="text-[#063f68]" /> Turnero de Fiscales
                </h1>
                <p className="text-[12px] text-slate-500 mt-1">Cargá los PDFs con la información de turnos de fiscales.</p>
            </div>

            {/* Formulario nuevo */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                    <Plus size={14} className="text-slate-500" />
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">Agregar nuevo</span>
                </div>
                <div className="px-5 py-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Título</label>
                        <input
                            type="text"
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            placeholder="Ej: Turno de Fiscales - Junio 2025"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Archivo PDF</label>
                        <div
                            onClick={() => inputRef.current?.click()}
                            className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl px-5 py-6 flex flex-col items-center gap-2 cursor-pointer hover:border-[#063f68]/40 transition-all">
                            <Upload size={20} className="text-slate-400" />
                            {archivo
                                ? <p className="text-[13px] font-semibold text-[#063f68]">{archivo.name}</p>
                                : <p className="text-[13px] text-slate-500">Hacé clic para seleccionar un PDF</p>}
                            <input
                                ref={inputRef}
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={e => setArchivo(e.target.files?.[0] ?? null)}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleSubir}
                        disabled={subiendo}
                        className="flex items-center gap-2 px-5 h-10 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#052d4a] disabled:opacity-50 transition-all">
                        {subiendo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {subiendo ? "Subiendo..." : "Subir archivo"}
                    </button>
                </div>
            </div>

            {/* Lista */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                    <FileText size={14} className="text-slate-500" />
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">Archivos cargados</span>
                    <span className="ml-auto text-[11px] text-slate-400">{items.length} {items.length === 1 ? "archivo" : "archivos"}</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 size={18} className="animate-spin text-slate-300" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                            <FileText size={28} className="text-slate-200 dark:text-slate-700" />
                            <p className="text-[13px] text-slate-400">No hay archivos cargados todavía</p>
                        </div>
                    ) : items.map(item => (
                        <div key={item.id} className="flex items-center gap-3 px-5 py-4">
                            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                                <FileText size={14} className="text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-semibold text-slate-800 dark:text-white truncate">{item.titulo}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{new Date(item.createdAt).toLocaleDateString("es-AR")}</p>
                            </div>
                            <a href={item.archivo} target="_blank" rel="noopener noreferrer"
                                className="p-2 rounded-lg text-slate-400 hover:text-[#063f68] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                <Download size={15} />
                            </a>
                            <button
                                onClick={() => handleEliminar(item.id)}
                                disabled={eliminando === item.id}
                                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-40">
                                {eliminando === item.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
