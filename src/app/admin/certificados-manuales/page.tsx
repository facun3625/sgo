"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { FileWarning, Upload, Loader2, Trash2, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Bloqueado {
    id: number;
    expediente: string;
    nombre: string | null;
    apellido: string | null;
    createdAt: string;
}

function normalizeKey(k: string) {
    return k.toLowerCase().trim().replace(/\s+/g, "");
}

function extraerExpedientes(rows: Record<string, string>[]): string[] {
    return rows
        .map(row => {
            const normalizado = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
            const val = normalizado["expedientes"] ?? normalizado["expediente"] ?? normalizado["exp"] ?? "";
            return String(val).trim();
        })
        .filter(Boolean);
}

export default function CertificadosManualesPage() {
    const { showToast } = useToast();
    const [bloqueados, setBloqueados] = useState<Bloqueado[]>([]);
    const [loading, setLoading] = useState(true);
    const [subiendo, setSubiendo] = useState(false);
    const [eliminandoId, setEliminandoId] = useState<number | null>(null);

    const [mensaje, setMensaje] = useState("");
    const [guardandoMensaje, setGuardandoMensaje] = useState(false);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/certificados-manuales");
            if (res.ok) {
                const data = await res.json();
                setBloqueados(data.bloqueados ?? []);
                setMensaje(data.mensaje ?? "");
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const handleArchivo = async (file: File) => {
        setSubiendo(true);
        try {
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
            const expedientes = extraerExpedientes(rows);

            if (expedientes.length === 0) {
                showToast("No se encontró ninguna columna 'Expedientes' con datos", "error");
                return;
            }

            const res = await fetch("/api/admin/certificados-manuales", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expedientes }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast(`${data.agregados} agregados${data.yaEstaban > 0 ? ` · ${data.yaEstaban} ya estaban` : ""}`, "success");
                cargar();
            } else {
                showToast(data.error || "Error al procesar el archivo", "error");
            }
        } catch {
            showToast("No se pudo leer el archivo — ¿es un Excel válido?", "error");
        } finally {
            setSubiendo(false);
        }
    };

    const eliminar = async (id: number) => {
        setEliminandoId(id);
        try {
            const res = await fetch(`/api/admin/certificados-manuales/${id}`, { method: "DELETE" });
            if (res.ok) {
                setBloqueados(prev => prev.filter(b => b.id !== id));
                showToast("Expediente quitado de la lista", "success");
            }
        } finally { setEliminandoId(null); }
    };

    const guardarMensaje = async () => {
        if (!mensaje.trim()) return;
        setGuardandoMensaje(true);
        try {
            const res = await fetch("/api/admin/certificados-manuales", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mensaje }),
            });
            if (res.ok) showToast("Cartel guardado", "success");
            else showToast("Error al guardar", "error");
        } finally { setGuardandoMensaje(false); }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                    <FileWarning size={20} className="text-rose-600" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Certificados Manuales</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Expedientes a los que se les bloquea el Certificado de Matriculación automático</p>
                </div>
            </div>

            {/* Mensaje / cartel */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Cartel que ve el matriculado bloqueado</label>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">Se muestra en vez del formulario cuando su expediente está en la lista de abajo. Escribí el texto que quieras.</p>
                <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={3}
                    placeholder="Ej: Tu Certificado de Matriculación se genera de forma manual. Debe ser retirado personalmente en la sede del Colegio."
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none" />
                <button onClick={guardarMensaje} disabled={guardandoMensaje || !mensaje.trim()}
                    className="flex items-center gap-2 px-4 h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all">
                    {guardandoMensaje ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {guardandoMensaje ? "Guardando..." : "Guardar cartel"}
                </button>
            </div>

            {/* Subida de Excel */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Cargar expedientes</label>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">Excel con una columna <strong>Expedientes</strong> — se agregan a la lista, no se borran los que ya estaban cargados.</p>
                <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-10 cursor-pointer transition-all ${subiendo ? "opacity-50 pointer-events-none" : "border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700"}`}>
                    {subiendo ? <Loader2 size={22} className="animate-spin text-rose-400" /> : <Upload size={22} className="text-slate-400" />}
                    <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{subiendo ? "Procesando..." : "Hacé clic para elegir el Excel"}</span>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={subiendo}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleArchivo(f); e.target.value = ""; }} />
                </label>
            </div>

            {/* Listado */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Expedientes bloqueados ({bloqueados.length})</label>
                </div>
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-rose-400" /></div>
                ) : bloqueados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <CheckCircle2 size={24} className="text-slate-200 dark:text-slate-700" />
                        <p className="text-[13px] text-slate-400">No hay expedientes bloqueados</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        {bloqueados.map(b => (
                            <div key={b.id} className="flex items-center justify-between px-6 py-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                                        <FileWarning size={14} />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-slate-800 dark:text-white">
                                            {b.nombre || b.apellido ? `${b.apellido ?? ""}, ${b.nombre ?? ""}` : (
                                                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400"><AlertCircle size={12} /> Sin datos cargados</span>
                                            )}
                                        </p>
                                        <p className="text-[11px] text-slate-400">Expediente {b.expediente}</p>
                                    </div>
                                </div>
                                <button onClick={() => eliminar(b.id)} disabled={eliminandoId === b.id}
                                    title="Quitar de la lista (vuelve a generarse automático)"
                                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-40">
                                    {eliminandoId === b.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
