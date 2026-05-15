"use client";

import { useState, useEffect, useCallback } from "react";
import { DatabaseZap, Download, Trash2, RotateCcw, Loader2, CheckCircle2, AlertCircle, ShieldAlert, HardDrive } from "lucide-react";

interface Backup {
    filename: string;
    size: number;
    createdAt: string;
}

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function BackupPage() {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(true);
    const [creando, setCreando] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [restaurando, setRestaurando] = useState<string | null>(null);
    const [confirmFile, setConfirmFile] = useState<string | null>(null);
    const [confirmInput, setConfirmInput] = useState("");
    const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

    const cargar = useCallback(async () => {
        try {
            const res = await fetch("/api/superadmin/backup");
            if (res.ok) setBackups((await res.json()).backups ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const mostrarMensaje = (tipo: "success" | "error", texto: string) => {
        setMensaje({ tipo, texto });
        setTimeout(() => setMensaje(null), 5000);
    };

    const handleCrear = async () => {
        setCreando(true);
        try {
            const res = await fetch("/api/superadmin/backup", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                mostrarMensaje("success", `Backup creado: ${data.filename}`);
                await cargar();
            } else {
                mostrarMensaje("error", data.error ?? "Error al crear backup");
            }
        } catch {
            mostrarMensaje("error", "Error de conexión");
        } finally {
            setCreando(false);
        }
    };

    const handleDescargar = (filename: string) => {
        const a = document.createElement("a");
        a.href = `/api/superadmin/backup/${filename}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleEliminar = async (filename: string) => {
        setDeletingId(filename);
        try {
            const res = await fetch(`/api/superadmin/backup/${filename}`, { method: "DELETE" });
            if (res.ok) {
                mostrarMensaje("success", "Backup eliminado");
                setBackups(prev => prev.filter(b => b.filename !== filename));
            } else {
                mostrarMensaje("error", "Error al eliminar");
            }
        } finally {
            setDeletingId(null);
        }
    };

    const handleRestaurar = async () => {
        if (!confirmFile || confirmInput !== "RESTAURAR") return;
        setRestaurando(confirmFile);
        setConfirmFile(null);
        setConfirmInput("");
        try {
            const res = await fetch("/api/superadmin/backup/restaurar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: confirmFile, confirmacion: "RESTAURAR" }),
            });
            const data = await res.json();
            if (res.ok) {
                mostrarMensaje("success", "Base de datos restaurada correctamente. Reiniciá el servidor.");
            } else {
                mostrarMensaje("error", data.error ?? "Error al restaurar");
            }
        } catch {
            mostrarMensaje("error", "Error de conexión");
        } finally {
            setRestaurando(null);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <HardDrive size={20} className="text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Backups de Base de Datos</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Creá, descargá y restaurá copias de seguridad</p>
                    </div>
                </div>
                <button onClick={handleCrear} disabled={creando}
                    className="flex items-center gap-2 px-5 h-10 bg-emerald-500 text-white rounded-xl text-[13px] font-bold hover:bg-emerald-600 disabled:opacity-50 transition-all active:scale-95">
                    {creando ? <Loader2 size={15} className="animate-spin" /> : <DatabaseZap size={15} />}
                    {creando ? "Creando..." : "Crear Backup"}
                </button>
            </div>

            {/* Mensaje */}
            {mensaje && (
                <div className={`flex items-center gap-3 p-4 rounded-xl border text-[13px] font-medium animate-fade-in
                    ${mensaje.tipo === "success"
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400"}`}>
                    {mensaje.tipo === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {mensaje.texto}
                </div>
            )}

            {/* Info */}
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    <strong>Importante:</strong> Los backups se guardan en el servidor. Descargalos periódicamente para tener copias externas.
                    Restaurar reemplaza <strong>toda</strong> la base de datos con la versión guardada.
                </p>
            </div>

            {/* Lista */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Backups disponibles</span>
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">{backups.length}</span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-slate-300" />
                    </div>
                ) : backups.length === 0 ? (
                    <p className="text-center text-[13px] text-slate-400 py-14">No hay backups. Creá el primero.</p>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                        {backups.map(b => (
                            <div key={b.filename} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                    <HardDrive size={16} className="text-emerald-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300 font-mono truncate">{b.filename}</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(b.createdAt)} · {formatSize(b.size)}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => handleDescargar(b.filename)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all">
                                        <Download size={12} /> Descargar
                                    </button>
                                    <button onClick={() => { setConfirmFile(b.filename); setConfirmInput(""); }}
                                        disabled={!!restaurando}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all disabled:opacity-40">
                                        {restaurando === b.filename ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                        Restaurar
                                    </button>
                                    <button onClick={() => handleEliminar(b.filename)}
                                        disabled={deletingId === b.filename}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all disabled:opacity-40">
                                        {deletingId === b.filename ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal confirmación restaurar */}
            {confirmFile && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 w-full max-w-md space-y-4 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <ShieldAlert size={20} className="text-red-500" />
                            </div>
                            <div>
                                <p className="text-[14px] font-black text-slate-900 dark:text-white">Confirmar restauración</p>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400">Esta acción es irreversible</p>
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                            <p className="text-[12px] text-red-700 dark:text-red-400 leading-relaxed">
                                Se va a <strong>borrar toda la base de datos actual</strong> y restaurar el backup:<br />
                                <span className="font-mono text-[11px] mt-1 block">{confirmFile}</span>
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                Escribí <span className="text-red-500">RESTAURAR</span> para confirmar
                            </label>
                            <input
                                type="text"
                                value={confirmInput}
                                onChange={e => setConfirmInput(e.target.value)}
                                placeholder="RESTAURAR"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-red-400"
                            />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button onClick={() => { setConfirmFile(null); setConfirmInput(""); }}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleRestaurar}
                                disabled={confirmInput !== "RESTAURAR"}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-bold hover:bg-red-600 disabled:opacity-40 transition-all active:scale-95">
                                Restaurar ahora
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
