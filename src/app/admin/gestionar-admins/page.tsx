"use client";
import { useState, useEffect } from "react";
import { UserCog, Plus, Trash2, Check, X, Eye, EyeOff, Loader2, Shield, ShieldCheck, ChevronRight, Key, ChevronDown } from "lucide-react";
import { ADMIN_SECCIONES, SOLICITUDES_SUBTABS } from "@/lib/admin-secciones";
import { useToast } from "@/components/ui/Toast";

interface AdminUser {
    id: number;
    nombre: string;
    apellido: string;
    expediente: string;
    accessLevel: string;
    permisos: string[];
    status: string;
    createdAt: string;
}

export default function GestionarAdminsPage() {
    const { showToast } = useToast();
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"lista" | "nuevo">("lista");
    const [editando, setEditando] = useState<AdminUser | null>(null);

    // Nuevo admin form
    const [nombre, setNombre] = useState("");
    const [apellido, setApellido] = useState("");
    const [expediente, setExpediente] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [permisos, setPermisos] = useState<string[]>([]);
    const [esSuperadmin, setEsSuperadmin] = useState(false);
    const [creando, setCreando] = useState(false);

    // Edit state
    const [editPermisos, setEditPermisos] = useState<string[]>([]);
    const [editPassword, setEditPassword] = useState("");
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [eliminando, setEliminando] = useState<number | null>(null);

    const cargar = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/gestionar-admins");
            if (res.ok) setAdmins(await res.json());
        } finally { setLoading(false); }
    };

    useEffect(() => { cargar(); }, []);

    const togglePermiso = (key: string, arr: string[], set: (v: string[]) => void) => {
        set(arr.includes(key) ? arr.filter(k => k !== key) : [...arr, key]);
    };

    const handleCrear = async () => {
        if (!nombre || !apellido || !expediente || !password) {
            showToast("Completá todos los campos obligatorios", "error"); return;
        }
        setCreando(true);
        try {
            const res = await fetch("/api/admin/gestionar-admins", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, apellido, expediente, password, permisos, esSuperadmin }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Administrador creado", "success");
                setAdmins(prev => [data, ...prev]);
                setNombre(""); setApellido(""); setExpediente(""); setPassword(""); setPermisos([]); setEsSuperadmin(false);
                setTab("lista");
            } else {
                showToast(data.error || "Error al crear", "error");
            }
        } finally { setCreando(false); }
    };

    const handleGuardar = async () => {
        if (!editando) return;
        setGuardando(true);
        try {
            const body: any = { permisos: editPermisos };
            if (editPassword) body.password = editPassword;
            const res = await fetch(`/api/admin/gestionar-admins/${editando.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Cambios guardados", "success");
                setAdmins(prev => prev.map(a => a.id === editando.id ? data : a));
                setEditando(null);
                setEditPassword("");
            } else {
                showToast(data.error || "Error al guardar", "error");
            }
        } finally { setGuardando(false); }
    };

    const handleEliminar = async (id: number) => {
        if (!confirm("¿Eliminar este administrador?")) return;
        setEliminando(id);
        try {
            const res = await fetch(`/api/admin/gestionar-admins/${id}`, { method: "DELETE" });
            if (res.ok) {
                showToast("Administrador eliminado", "success");
                setAdmins(prev => prev.filter(a => a.id !== id));
                if (editando?.id === id) setEditando(null);
            } else {
                const data = await res.json();
                showToast(data.error || "Error al eliminar", "error");
            }
        } finally { setEliminando(null); }
    };

    const currentPermisos = editando ? editPermisos : permisos;
    const setCurrentPermisos = editando ? setEditPermisos : setPermisos;

    const hasSubtabsSolicitudes = currentPermisos.some(p => p.startsWith("solicitudes:"));

    const permisosGrid = (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => {
                        const all = ADMIN_SECCIONES.map(s => s.key as string);
                        setCurrentPermisos(currentPermisos.length === all.length ? [] : all);
                    }}
                    className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline"
                >
                    {currentPermisos.length === ADMIN_SECCIONES.length ? "Deseleccionar todo" : "Seleccionar todo"}
                </button>
            </div>
            <div className="space-y-4">
                {/* Grupo Trámites */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trámites</p>
                        <button
                            type="button"
                            onClick={() => {
                                const tramiteKeys = ADMIN_SECCIONES.filter(s => s.group === "Trámites").map(s => s.key as string);
                                const allChecked = tramiteKeys.every(k => currentPermisos.includes(k));
                                if (allChecked) {
                                    setCurrentPermisos(currentPermisos.filter(k => !tramiteKeys.includes(k)));
                                } else {
                                    const newPermisos = [...currentPermisos];
                                    tramiteKeys.forEach(k => { if (!newPermisos.includes(k)) newPermisos.push(k); });
                                    setCurrentPermisos(newPermisos);
                                }
                            }}
                            className="text-[10px] text-violet-500 hover:underline"
                        >
                            {ADMIN_SECCIONES.filter(s => s.group === "Trámites").every(s => currentPermisos.includes(s.key)) ? "Quitar todos" : "Seleccionar todos"}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {ADMIN_SECCIONES.filter(s => s.group === "Trámites").map(sec => {
                            const checked = currentPermisos.includes(sec.key);
                            return (
                                <label key={sec.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-700/50"}`}>
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${checked ? "bg-amber-500" : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"}`}>
                                        {checked && <Check size={12} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={checked} onChange={() => togglePermiso(sec.key, currentPermisos, setCurrentPermisos)} />
                                    <span className={`text-[12px] font-medium ${checked ? "text-amber-700 dark:text-amber-300" : "text-slate-600 dark:text-slate-400"}`}>{sec.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Secciones generales */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secciones</p>
                        <button type="button" onClick={() => {
                            const keys = ADMIN_SECCIONES.filter(s => s.group === "").map(s => s.key as string);
                            const all = keys.every(k => currentPermisos.includes(k));
                            setCurrentPermisos(all ? currentPermisos.filter(k => !keys.includes(k)) : [...new Set([...currentPermisos, ...keys])]);
                        }} className="text-[10px] text-violet-500 hover:underline">
                            {ADMIN_SECCIONES.filter(s => s.group === "").every(s => currentPermisos.includes(s.key)) ? "Quitar todos" : "Seleccionar todos"}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ADMIN_SECCIONES.filter(s => s.group === "").map(sec => {
                            const checked = currentPermisos.includes(sec.key);
                            return (
                                <label key={sec.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700/50"}`}>
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${checked ? "bg-violet-600 dark:bg-violet-500" : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"}`}>
                                        {checked && <Check size={12} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={checked} onChange={() => togglePermiso(sec.key, currentPermisos, setCurrentPermisos)} />
                                    <span className={`text-[12px] font-medium ${checked ? "text-violet-700 dark:text-violet-300" : "text-slate-600 dark:text-slate-400"}`}>{sec.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Importar — sub-permisos */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Importar datos</p>
                        <button type="button" onClick={() => {
                            const keys = ADMIN_SECCIONES.filter(s => s.group === "Importar").map(s => s.key as string);
                            const all = keys.every(k => currentPermisos.includes(k));
                            setCurrentPermisos(all ? currentPermisos.filter(k => !keys.includes(k)) : [...new Set([...currentPermisos, ...keys])]);
                        }} className="text-[10px] text-cyan-500 hover:underline">
                            {ADMIN_SECCIONES.filter(s => s.group === "Importar").every(s => currentPermisos.includes(s.key)) ? "Quitar todos" : "Seleccionar todos"}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {ADMIN_SECCIONES.filter(s => s.group === "Importar").map(sec => {
                            const checked = currentPermisos.includes(sec.key);
                            return (
                                <label key={sec.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked ? "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-700" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-cyan-200 dark:hover:border-cyan-700/50"}`}>
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${checked ? "bg-cyan-500" : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"}`}>
                                        {checked && <Check size={12} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={checked} onChange={() => togglePermiso(sec.key, currentPermisos, setCurrentPermisos)} />
                                    <span className={`text-[12px] font-medium ${checked ? "text-cyan-700 dark:text-cyan-300" : "text-slate-600 dark:text-slate-400"}`}>{sec.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                        <UserCog size={20} className="text-violet-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Gestionar Administradores</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Creá admins y definí a qué secciones tienen acceso</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-0">
                <button
                    onClick={() => { setTab("lista"); setEditando(null); }}
                    className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-t-xl transition-all border-b-2 -mb-px ${tab === "lista" ? "border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-900/10" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                    <Shield size={14} /> Administradores ({admins.length})
                </button>
                <button
                    onClick={() => { setTab("nuevo"); setEditando(null); }}
                    className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-t-xl transition-all border-b-2 -mb-px ${tab === "nuevo" ? "border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-900/10" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                    <Plus size={14} /> Nuevo Admin
                </button>
            </div>

            {/* LISTA */}
            {tab === "lista" && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-violet-400" /></div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Lista de admins */}
                            <div className="space-y-3">
                                {admins.length === 0 && (
                                    <p className="text-center text-[13px] text-slate-400 py-12">No hay administradores creados</p>
                                )}
                                {admins.map(admin => (
                                    <div
                                        key={admin.id}
                                        onClick={() => { setEditando(admin); setEditPermisos(admin.permisos); setEditPassword(""); }}
                                        className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${editando?.id === admin.id ? "border-violet-300 dark:border-violet-600 bg-violet-50/50 dark:bg-violet-900/10" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-200 dark:hover:border-violet-700/50"}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-[13px]">
                                                    {admin.nombre[0]}{admin.apellido[0]}
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white">{admin.apellido}, {admin.nombre}</p>
                                                    <p className="text-[11px] text-slate-400">@{admin.expediente}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {admin.accessLevel === "superadmin" && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                        <ShieldCheck size={9} /> Super
                                                    </span>
                                                )}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${admin.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"}`}>
                                                    {admin.status === "active" ? "Activo" : "Inactivo"}
                                                </span>
                                                <ChevronRight size={14} className="text-slate-300" />
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {admin.permisos.length === 0 ? (
                                                <span className="text-[10px] text-slate-400 italic">Sin permisos asignados</span>
                                            ) : admin.permisos.length === ADMIN_SECCIONES.length ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full"><ShieldCheck size={9} /> Acceso total</span>
                                            ) : (
                                                admin.permisos.slice(0, 4).map(k => {
                                                    const sec = ADMIN_SECCIONES.find(s => s.key === k);
                                                    return sec ? (
                                                        <span key={k} className="text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{sec.label}</span>
                                                    ) : null;
                                                })
                                            )}
                                            {admin.permisos.length > 4 && admin.permisos.length < ADMIN_SECCIONES.length && (
                                                <span className="text-[10px] text-slate-400">+{admin.permisos.length - 4} más</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Panel de edición */}
                            {editando && (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[14px] font-bold text-slate-800 dark:text-white">{editando.apellido}, {editando.nombre}</p>
                                            <p className="text-[11px] text-slate-400">Editando permisos</p>
                                        </div>
                                        <button onClick={() => { setEditando(null); setEditPassword(""); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                            <X size={15} className="text-slate-400" />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Secciones con acceso</label>
                                        {permisosGrid}
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Key size={11} /> Nueva contraseña (opcional)</label>
                                        <div className="relative">
                                            <input
                                                type={showEditPassword ? "text" : "password"}
                                                placeholder="Dejar vacío para no cambiar"
                                                value={editPassword}
                                                onChange={e => setEditPassword(e.target.value)}
                                                className="w-full h-10 px-3 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                                            />
                                            <button type="button" onClick={() => setShowEditPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={handleGuardar}
                                            disabled={guardando}
                                            className="flex-1 h-10 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[13px] font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            {guardando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                            {guardando ? "Guardando..." : "Guardar cambios"}
                                        </button>
                                        <button
                                            onClick={() => handleEliminar(editando.id)}
                                            disabled={eliminando === editando.id}
                                            className="h-10 px-3 rounded-xl border-2 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50 flex items-center gap-1.5 text-[12px] font-bold"
                                        >
                                            {eliminando === editando.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* NUEVO ADMIN */}
            {tab === "nuevo" && (
                <div className="max-w-2xl space-y-5">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nombre *</label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={e => setNombre(e.target.value)}
                                    placeholder="Juan"
                                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Apellido *</label>
                                <input
                                    type="text"
                                    value={apellido}
                                    onChange={e => setApellido(e.target.value)}
                                    placeholder="García"
                                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Usuario (login) *</label>
                                <input
                                    type="text"
                                    value={expediente}
                                    onChange={e => setExpediente(e.target.value)}
                                    placeholder="mesa_entrada"
                                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                                />
                                <p className="text-[10px] text-slate-400">Se usa para iniciar sesión</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Key size={11} /> Contraseña *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Contraseña segura"
                                        className="w-full h-11 px-4 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    />
                                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${esSuperadmin ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"}`}>
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${esSuperadmin ? "bg-amber-500" : "bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600"}`}>
                                    {esSuperadmin && <Check size={12} className="text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={esSuperadmin} onChange={e => setEsSuperadmin(e.target.checked)} />
                                <div>
                                    <p className={`text-[13px] font-bold ${esSuperadmin ? "text-amber-700 dark:text-amber-300" : "text-slate-700 dark:text-slate-300"}`}>
                                        <ShieldCheck size={13} className="inline mr-1" /> Superadministrador
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Acceso total al sistema, sin restricciones de permisos</p>
                                </div>
                            </label>
                        </div>

                        {!esSuperadmin && (
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Secciones con acceso</label>
                                {permisosGrid}
                            </div>
                        )}

                        <button
                            onClick={handleCrear}
                            disabled={creando}
                            className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[13px] font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {creando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                            {creando ? "Creando..." : "Crear Administrador"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
