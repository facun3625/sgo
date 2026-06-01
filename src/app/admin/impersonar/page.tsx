"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Eye, Loader2, User, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

interface Usuario {
    id: number;
    expediente: string;
    nombre: string;
    apellido: string;
    cod: string | null;
    status: string;
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

function BuscadorSeccion({
    tipo,
    titulo,
    descripcion,
    icon: Icon,
    onIngresar,
    impersonando,
}: {
    tipo: "user" | "admin";
    titulo: string;
    descripcion: string;
    icon: React.ElementType;
    onIngresar: (u: Usuario) => void;
    impersonando: string | null;
}) {
    const [query, setQuery] = useState("");
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(false);

    const buscar = useCallback(async (q: string) => {
        if (q.trim().length < 2) { setUsuarios([]); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/impersonar?q=${encodeURIComponent(q)}&tipo=${tipo}`);
            if (res.ok) setUsuarios(await res.json());
        } finally { setLoading(false); }
    }, [tipo]);

    useEffect(() => {
        const t = setTimeout(() => buscar(query), 300);
        return () => clearTimeout(t);
    }, [query, buscar]);

    const color = tipo === "admin" ? "focus:border-violet-400" : "focus:border-amber-400";
    const btnColor = tipo === "admin"
        ? "bg-violet-500 hover:bg-violet-600 text-white"
        : "bg-amber-400 hover:bg-amber-500 text-amber-950";

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Icon size={15} className={tipo === "admin" ? "text-violet-500" : "text-amber-500"} />
                <div>
                    <p className="text-[13px] font-bold text-slate-800 dark:text-white">{titulo}</p>
                    <p className="text-[11px] text-slate-400">{descripcion}</p>
                </div>
            </div>
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
                            className={`w-full pl-9 pr-4 py-2.5 text-[13px] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none ${color} text-slate-700 dark:text-slate-300 placeholder:text-slate-400`}
                        />
                    </div>
                </div>

                {query.trim().length < 2 && (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-300 dark:text-slate-700">
                        <User size={28} />
                        <p className="mt-2 text-[12px]">Escribí al menos 2 caracteres para buscar</p>
                    </div>
                )}

                {query.trim().length >= 2 && !loading && usuarios.length === 0 && (
                    <p className="text-center text-[13px] text-slate-400 py-10">Sin resultados</p>
                )}

                {usuarios.length > 0 && (
                    <ul className="divide-y divide-slate-50 dark:divide-slate-800/60">
                        {usuarios.map(u => (
                            <li key={u.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                        <User size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {u.apellido}, {u.nombre}
                                        </p>
                                        <p className="text-[11px] text-slate-400">{u.expediente || u.cod || "—"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {tipo === "user" && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[u.status] ?? "bg-slate-100 text-slate-500"}`}>
                                            {statusLabel[u.status] ?? u.status}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => onIngresar(u)}
                                        disabled={impersonando !== null}
                                        className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-bold disabled:opacity-50 transition-all active:scale-95 ${btnColor}`}
                                    >
                                        {impersonando === String(u.id)
                                            ? <Loader2 size={13} className="animate-spin" />
                                            : <Eye size={13} />
                                        }
                                        {impersonando === String(u.id) ? "Ingresando..." : "Ingresar"}
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

export default function ImpersonarPage() {
    const [impersonando, setImpersonando] = useState<string | null>(null);
    const router = useRouter();

    async function ingresarComoUsuario(u: Usuario) {
        setImpersonando(String(u.id));
        try {
            const res = await fetch(`/api/admin/impersonar/${u.expediente || u.cod}`, { method: "POST" });
            if (res.ok) { router.push("/dashboard"); }
            else { const d = await res.json(); alert(d.error ?? "Error"); setImpersonando(null); }
        } catch { alert("Error de conexión"); setImpersonando(null); }
    }

    async function ingresarComoAdmin(u: Usuario) {
        setImpersonando(String(u.id));
        try {
            const res = await fetch(`/api/admin/impersonar/admin/${u.id}`, { method: "POST" });
            if (res.ok) { window.location.href = "/admin"; }
            else { const d = await res.json(); alert(d.error ?? "Error"); setImpersonando(null); }
        } catch { alert("Error de conexión"); setImpersonando(null); }
    }

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in max-w-2xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center">
                    <Eye size={20} className="text-amber-500" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Ver como usuario</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ingresá como cualquier matriculado o administrador</p>
                </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <p className="text-[12px] text-amber-800 dark:text-amber-400 leading-relaxed">
                    Verás el sistema exactamente como lo ve el usuario seleccionado. Un banner te recordará que estás en modo de visualización. Hacé click en <strong>"Volver al superadmin"</strong> para restaurar tu sesión.
                </p>
            </div>

            <BuscadorSeccion
                tipo="user"
                titulo="Ver como matriculado"
                descripcion="Accedé al dashboard de cualquier matriculado"
                icon={User}
                onIngresar={ingresarComoUsuario}
                impersonando={impersonando}
            />

            <BuscadorSeccion
                tipo="admin"
                titulo="Ver como administrador"
                descripcion="Accedé al panel admin con los permisos de otro administrador"
                icon={ShieldCheck}
                onIngresar={ingresarComoAdmin}
                impersonando={impersonando}
            />
        </div>
    );
}
