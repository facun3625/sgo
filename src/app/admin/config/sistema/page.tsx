"use client";

import { useState } from "react";
import { Trash2, Loader2, ShieldAlert } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function ConfigSistemaPage() {
    const { showToast } = useToast();
    const [confirmDatos, setConfirmDatos] = useState(false);
    const [borrandoDatos, setBorrandoDatos] = useState(false);

    async function handleVaciarDatos() {
        setBorrandoDatos(true);
        try {
            const res = await fetch("/api/admin/importar/matriculados", { method: "DELETE" });
            const data = await res.json();
            if (res.ok) {
                showToast(`Se eliminaron ${data.eliminados} registros de la tabla Datos.`, "success");
                setConfirmDatos(false);
            } else {
                showToast(data.error ?? "Error al eliminar", "error");
            }
        } catch { showToast("Error de conexión", "error"); }
        finally { setBorrandoDatos(false); }
    }

    return (
        <div className="p-6 md:p-10 max-w-2xl space-y-6">
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <ShieldAlert size={20} className="text-red-500" /> Sistema — Zona peligrosa
                </h1>
                <p className="text-[12px] text-slate-400 mt-1">Acciones irreversibles sobre la base de datos. Solo visible para superadministradores.</p>
            </div>

            <div className="border border-red-200 dark:border-red-900/40 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-red-50 dark:bg-red-900/10 flex items-center gap-2 border-b border-red-100 dark:border-red-900/30">
                    <Trash2 size={14} className="text-red-500" />
                    <span className="text-[12px] font-bold text-red-700 dark:text-red-400">Vaciar tabla Datos (matriculados)</span>
                </div>
                <div className="px-5 py-5 space-y-4">
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Elimina <strong className="text-slate-700 dark:text-slate-200">todos</strong> los registros de la tabla <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">datos</code> (matriculados). Esta acción <strong className="text-red-600">no se puede deshacer</strong>.
                    </p>
                    {!confirmDatos ? (
                        <button onClick={() => setConfirmDatos(true)}
                            className="flex items-center gap-2 px-4 h-9 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-[12px] font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all">
                            <Trash2 size={13} /> Vaciar tabla Datos
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[12px] font-bold text-red-600 dark:text-red-400">¿Confirmar? Esta acción no se puede deshacer.</span>
                            <button onClick={handleVaciarDatos} disabled={borrandoDatos}
                                className="flex items-center gap-1.5 px-4 h-9 bg-red-600 text-white rounded-xl text-[12px] font-bold hover:bg-red-700 disabled:opacity-50 transition-all">
                                {borrandoDatos ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                {borrandoDatos ? "Eliminando..." : "Sí, eliminar todo"}
                            </button>
                            <button onClick={() => setConfirmDatos(false)} className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors">
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
