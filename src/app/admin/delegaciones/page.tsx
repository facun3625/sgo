"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Plus, Check, X, Eye, EyeOff, Loader2, Shield, ChevronRight, Key, Power, History } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Delegacion {
    id: number;
    nombre: string;
    activo: boolean;
    zona: string | null;
    createdAt: string;
    usuario: { id: number; login: string | null; status: string } | null;
}

export default function DelegacionesPage() {
    const { showToast } = useToast();
    const [delegaciones, setDelegaciones] = useState<Delegacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"lista" | "nueva">("lista");
    const [editando, setEditando] = useState<Delegacion | null>(null);

    // Nueva delegación
    const [nombre, setNombre] = useState("");
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [zona, setZona] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [creando, setCreando] = useState(false);

    // Edición
    const [editNombre, setEditNombre] = useState("");
    const [editPassword, setEditPassword] = useState("");
    const [editZona, setEditZona] = useState("");
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const cargar = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/delegaciones");
            if (res.ok) setDelegaciones(await res.json());
        } finally { setLoading(false); }
    };

    useEffect(() => { cargar(); }, []);

    const handleCrear = async () => {
        if (!nombre.trim() || !login.trim() || !password.trim()) {
            showToast("Completá todos los campos", "error"); return;
        }
        setCreando(true);
        try {
            const res = await fetch("/api/admin/delegaciones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, login, password, zona }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Delegación creada", "success");
                setDelegaciones(prev => [data, ...prev]);
                setNombre(""); setLogin(""); setPassword(""); setZona("");
                setTab("lista");
            } else {
                showToast(data.error || "Error al crear", "error");
            }
        } finally { setCreando(false); }
    };

    const abrirEdicion = (d: Delegacion) => {
        setEditando(d);
        setEditNombre(d.nombre);
        setEditZona(d.zona || "");
        setEditPassword("");
    };

    const handleGuardar = async () => {
        if (!editando) return;
        setGuardando(true);
        try {
            const body: Record<string, unknown> = { nombre: editNombre, zona: editZona };
            if (editPassword) body.password = editPassword;
            const res = await fetch(`/api/admin/delegaciones/${editando.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                showToast("Cambios guardados", "success");
                setDelegaciones(prev => prev.map(d => d.id === editando.id ? { ...d, nombre: editNombre, zona: editZona || null } : d));
                setEditando(null);
                setEditPassword("");
            } else {
                const data = await res.json();
                showToast(data.error || "Error al guardar", "error");
            }
        } finally { setGuardando(false); }
    };

    const toggleActivo = async (d: Delegacion) => {
        const res = await fetch(`/api/admin/delegaciones/${d.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activo: !d.activo }),
        });
        if (res.ok) {
            setDelegaciones(prev => prev.map(x => x.id === d.id ? { ...x, activo: !x.activo } : x));
            showToast(!d.activo ? "Delegación activada" : "Delegación desactivada", "success");
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <Building2 size={20} className="text-emerald-600" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Delegaciones</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Cuentas de cobro en efectivo por oficina regional</p>
                </div>
            </div>

            <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-0">
                <button
                    onClick={() => { setTab("lista"); setEditando(null); }}
                    className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-t-xl transition-all border-b-2 -mb-px ${tab === "lista" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                    <Shield size={14} /> Delegaciones ({delegaciones.length})
                </button>
                <button
                    onClick={() => { setTab("nueva"); setEditando(null); }}
                    className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-t-xl transition-all border-b-2 -mb-px ${tab === "nueva" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                    <Plus size={14} /> Nueva Delegación
                </button>
            </div>

            {tab === "lista" && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                {delegaciones.length === 0 && (
                                    <p className="text-center text-[13px] text-slate-400 py-12">No hay delegaciones creadas</p>
                                )}
                                {delegaciones.map(d => (
                                    <div key={d.id} onClick={() => abrirEdicion(d)}
                                        className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${editando?.id === d.id ? "border-emerald-300 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-200 dark:hover:border-emerald-700/50"}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                    <Building2 size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white">{d.nombre}</p>
                                                    <p className="text-[11px] text-slate-400">@{d.usuario?.login ?? "—"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {d.zona ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                        Zona {d.zona}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                                        Sin zona
                                                    </span>
                                                )}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.activo ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"}`}>
                                                    {d.activo ? "Activa" : "Desactivada"}
                                                </span>
                                                <Link href={`/admin/delegaciones/${d.id}/historial`} onClick={e => e.stopPropagation()}
                                                    title="Ver historial de cobros"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                                                    <History size={14} />
                                                </Link>
                                                <ChevronRight size={14} className="text-slate-300" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {editando && (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-5 h-fit">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[14px] font-bold text-slate-800 dark:text-white">Editar delegación</p>
                                        <button onClick={() => setEditando(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                            <X size={15} className="text-slate-400" />
                                        </button>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nombre</label>
                                        <input type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)}
                                            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                        <p className="text-[10px] text-slate-400">Aparece en los pagos como &quot;Pagó en delegación {editNombre || "..."}&quot;</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Zona</label>
                                        <input type="text" value={editZona} onChange={e => setEditZona(e.target.value)} placeholder="Ej: 50"
                                            className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                        <p className="text-[10px] text-slate-400">Determina qué matriculados ve esta delegación (según la columna Zona del Excel de deudas)</p>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Key size={11} /> Blanquear contraseña</label>
                                        <div className="relative">
                                            <input type={showEditPassword ? "text" : "password"} placeholder="Dejar vacío para no cambiar"
                                                value={editPassword} onChange={e => setEditPassword(e.target.value)}
                                                className="w-full h-10 px-3 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                            <button type="button" onClick={() => setShowEditPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <button onClick={handleGuardar} disabled={guardando}
                                            className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                            {guardando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                            {guardando ? "Guardando..." : "Guardar cambios"}
                                        </button>
                                        <button onClick={() => toggleActivo(editando)}
                                            className={`h-10 px-3 rounded-xl border-2 transition-all flex items-center gap-1.5 text-[12px] font-bold
                                                ${editando.activo ? "border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" : "border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"}`}>
                                            <Power size={13} /> {editando.activo ? "Desactivar" : "Activar"}
                                        </button>
                                    </div>

                                    <Link href={`/admin/delegaciones/${editando.id}/historial`}
                                        className="flex items-center justify-center gap-2 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[13px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                        <History size={14} /> Ver historial de cobros
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {tab === "nueva" && (
                <div className="max-w-xl space-y-5">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nombre de la delegación *</label>
                            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Reconquista"
                                className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                            <p className="text-[10px] text-slate-400">Así va a aparecer en los pagos: &quot;Pagó en delegación {nombre || "..."}&quot;</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Usuario (login) *</label>
                            <input type="text" value={login} onChange={e => setLogin(e.target.value)} placeholder="reconquista"
                                className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                            <p className="text-[10px] text-slate-400">Se usa para iniciar sesión — puede ser distinto del nombre</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Zona</label>
                            <input type="text" value={zona} onChange={e => setZona(e.target.value)} placeholder="Ej: 50"
                                className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                            <p className="text-[10px] text-slate-400">Determina qué matriculados va a ver esta delegación (columna Zona del Excel de deudas). Se puede dejar vacío y completar después.</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Key size={11} /> Contraseña *</label>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="Contraseña segura"
                                    className="w-full h-11 px-4 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-[12px] text-slate-500 dark:text-slate-400">
                            Esta cuenta solo va a poder ver datos y deuda de matriculados (sin editar nada) y registrar cobros en efectivo. No tiene acceso a ninguna otra sección del panel.
                        </div>

                        <button onClick={handleCrear} disabled={creando}
                            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            {creando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                            {creando ? "Creando..." : "Crear Delegación"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
