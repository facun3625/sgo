"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { KeyRound, Search, Loader2, ChevronLeft, ChevronRight, X, Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck, MapPin, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface CuentaUser {
    id: number;
    expediente: string | null;
    nombre: string;
    apellido: string;
    email: string | null;
    status: string;
    createdAt: string;
    catastroActivo: boolean;
}

export default function CuentasPage() {
    const { showToast } = useToast();
    const [users, setUsers] = useState<CuentaUser[]>([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [loading, setLoading] = useState(true);

    const [modal, setModal] = useState<CuentaUser | null>(null);
    const [pass, setPass] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const [confirmDelete, setConfirmDelete] = useState<CuentaUser | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedQ(search); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/cuentas?q=${encodeURIComponent(debouncedQ)}&page=${page}`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
                setTotal(data.total);
                setPages(data.pages);
            }
        } finally {
            setLoading(false);
        }
    }, [debouncedQ, page]);

    useEffect(() => { cargar(); }, [cargar]);

    useEffect(() => {
        if (modal) setTimeout(() => inputRef.current?.focus(), 50);
    }, [modal]);

    async function handleEliminar() {
        if (!confirmDelete) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/cuentas/${confirmDelete.id}`, { method: "DELETE" });
            const data = await res.json();
            if (res.ok) {
                showToast("Cuenta eliminada", "success");
                setConfirmDelete(null);
                cargar();
            } else {
                showToast(data.error ?? "Error al eliminar", "error");
            }
        } finally {
            setDeleting(false);
        }
    }

    async function handleGuardar() {
        if (!modal || !pass.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/cuentas/${modal.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: pass }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Contraseña actualizada", "success");
                setModal(null);
                setPass("");
            } else {
                showToast(data.error ?? "Error al guardar", "error");
            }
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                    <ShieldCheck size={20} className="text-violet-500" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Cuentas Registradas</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Usuarios que completaron el registro en el sistema</p>
                </div>
            </div>

            {/* Buscador */}
            <div className="relative max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, apellido o expediente..."
                    className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-300/50 focus:border-violet-400"
                />
            </div>

            {/* Tabla */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Usuarios</span>
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">{total}</span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-slate-300" />
                    </div>
                ) : users.length === 0 ? (
                    <p className="text-center text-[13px] text-slate-400 py-14">Sin resultados</p>
                ) : (
                    <>
                        {/* Header cols */}
                        <div className="min-w-[700px] grid grid-cols-[90px_1fr_160px_100px_110px_120px] gap-4 px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            {["Expediente", "Nombre", "Email", "CATASTRO", "Estado", "Acciones"].map(h => (
                                <p key={h} className="text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</p>
                            ))}
                        </div>

                        <div className="min-w-[700px] divide-y divide-slate-50 dark:divide-slate-800/60">
                            {users.map(u => (
                                <div key={u.id} className="grid grid-cols-[90px_1fr_160px_100px_110px_120px] gap-4 px-5 py-3.5 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <p className="text-[12px] font-bold font-mono text-slate-700 dark:text-slate-300 truncate">
                                        {u.expediente || "—"}
                                    </p>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold text-slate-800 dark:text-white truncate">{u.apellido}, {u.nombre}</p>
                                        <p className="text-[10px] text-slate-400">
                                            Registrado {new Date(u.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                        </p>
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate">{u.email || "—"}</p>
                                    <div>
                                        {u.catastroActivo ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                                                <MapPin size={9} /> Activo
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-slate-300 dark:text-slate-600">—</span>
                                        )}
                                    </div>
                                    <div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                                            ${u.status === "active"
                                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"}`}>
                                            {u.status === "active" ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                                            {u.status === "active" ? "Activo" : "Suspendido"}
                                        </span>
                                    </div>
                                    <div>
                                        <button onClick={() => { setModal(u); setPass(""); setShowPass(false); }}
                                            className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 hover:border-violet-200 transition-all">
                                            <KeyRound size={11} /> Acciones
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Paginación */}
                {pages > 1 && (
                    <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <p className="text-[11px] text-slate-400">Página {page} de {pages}</p>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="flex items-center gap-1 px-3 h-8 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                <ChevronLeft size={13} /> Anterior
                            </button>
                            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                                className="flex items-center gap-1 px-3 h-8 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Siguiente <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal cambiar contraseña */}
            {modal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-sm shadow-2xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[14px] font-black text-slate-900 dark:text-white">Cambiar contraseña</p>
                                <p className="text-[12px] text-slate-400 mt-0.5">{modal.apellido}, {modal.nombre} · Exp. {modal.expediente}</p>
                            </div>
                            <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                <X size={15} />
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nueva contraseña</label>
                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    type={showPass ? "text" : "password"}
                                    value={pass}
                                    onChange={e => setPass(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleGuardar()}
                                    placeholder="Ingresá la nueva contraseña"
                                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-300/30"
                                />
                                <button type="button" onClick={() => setShowPass(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button onClick={() => setModal(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleGuardar} disabled={saving || pass.length < 4}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 text-white text-[13px] font-bold hover:bg-violet-700 disabled:opacity-40 transition-all active:scale-95">
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                                {saving ? "Guardando..." : "Guardar"}
                            </button>
                        </div>

                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => { setConfirmDelete(modal); setModal(null); }}
                                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                                <Trash2 size={13} /> Eliminar cuenta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmar eliminación */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-sm shadow-2xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[14px] font-black text-slate-900 dark:text-white">Eliminar cuenta</p>
                                <p className="text-[12px] text-slate-400 mt-0.5">{confirmDelete.apellido}, {confirmDelete.nombre} · Exp. {confirmDelete.expediente || "—"}</p>
                            </div>
                            <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                <X size={15} />
                            </button>
                        </div>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Se eliminará solo el acceso al sistema. Los datos del matriculado se conservan.
                        </p>
                        <div className="flex gap-2 pt-1">
                            <button onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleEliminar} disabled={deleting}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 text-white text-[13px] font-bold hover:bg-rose-700 disabled:opacity-40 transition-all">
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                {deleting ? "Eliminando..." : "Eliminar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
