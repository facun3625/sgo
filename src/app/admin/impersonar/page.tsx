"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Eye, Loader2, User } from "lucide-react";
import { useRouter } from "next/navigation";

interface Usuario {
    expediente: string;
    nombre: string;
    apellido: string;
    cod: string | null;
    status: string;
}

export default function ImpersonarPage() {
    const [query, setQuery] = useState("");
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(false);
    const [impersonando, setImpersonando] = useState<string | null>(null);
    const router = useRouter();

    const buscar = useCallback(async (q: string) => {
        if (q.trim().length < 2) { setUsuarios([]); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/impersonar?q=${encodeURIComponent(q)}`);
            if (res.ok) setUsuarios(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => buscar(query), 300);
        return () => clearTimeout(t);
    }, [query, buscar]);

    async function ingresar(expediente: string) {
        setImpersonando(expediente);
        try {
            const res = await fetch(`/api/admin/impersonar/${expediente}`, { method: "POST" });
            if (res.ok) {
                router.push("/dashboard");
            } else {
                const data = await res.json();
                alert(data.error ?? "Error al impersonar");
                setImpersonando(null);
            }
        } catch {
            alert("Error de conexión");
            setImpersonando(null);
        }
    }

    const statusColor: Record<string, string> = {
        active: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600",
        suspended: "bg-amber-100 dark:bg-amber-900/30 text-amber-600",
        cancelled: "bg-red-100 dark:bg-red-900/30 text-red-600",
    };
    const statusLabel: Record<string, string> = {
        active: "Activo",
        suspended: "Suspendido",
        cancelled: "Cancelado",
    };

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in max-w-2xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center">
                    <Eye size={20} className="text-amber-500" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Ver como usuario</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ingresá al dashboard de cualquier matriculado para ver lo que él ve</p>
                </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <p className="text-[12px] text-amber-800 dark:text-amber-400 leading-relaxed">
                    Al ingresar como usuario verás su dashboard exactamente como lo ve él. Un banner amarillo te recordará que estás en modo de visualización. Hacé click en <strong>"Volver al admin"</strong> para restaurar tu sesión.
                </p>
            </div>

            {/* Buscador */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        {loading
                            ? <Loader2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                            : <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        }
                        <input
                            type="text"
                            placeholder="Buscar por nombre, apellido o expediente..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-400 text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {query.trim().length < 2 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-300 dark:text-slate-700">
                        <User size={32} />
                        <p className="mt-2 text-[13px]">Escribí al menos 2 caracteres para buscar</p>
                    </div>
                )}

                {query.trim().length >= 2 && !loading && usuarios.length === 0 && (
                    <p className="text-center text-[13px] text-slate-400 py-12">Sin resultados</p>
                )}

                {usuarios.length > 0 && (
                    <ul className="divide-y divide-slate-50 dark:divide-slate-800/60">
                        {usuarios.map(u => (
                            <li key={u.expediente} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                        <User size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {u.apellido}, {u.nombre}
                                        </p>
                                        <p className="text-[11px] text-slate-400">Exp. {u.expediente}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[u.status] ?? "bg-slate-100 text-slate-500"}`}>
                                        {statusLabel[u.status] ?? u.status}
                                    </span>
                                    <button
                                        onClick={() => ingresar(u.expediente)}
                                        disabled={impersonando !== null}
                                        className="flex items-center gap-1.5 px-3 h-8 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-lg text-[12px] font-bold disabled:opacity-50 transition-all active:scale-95"
                                    >
                                        {impersonando === u.expediente
                                            ? <Loader2 size={13} className="animate-spin" />
                                            : <Eye size={13} />
                                        }
                                        {impersonando === u.expediente ? "Ingresando..." : "Ingresar"}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
