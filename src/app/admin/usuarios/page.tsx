"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
    Users, Search, Loader2,
    Send, X, CheckCircle2, XCircle, Pencil, Trash2, ShieldAlert
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Usuario {
    cod: string;
    expediente: string | null;
    folio: string | null;
    tomo: string | null;
    tipo: string | null;
    nombre: string;
    apellido: string;
    emailLegal: string | null;
    status: string;
    tieneUsuario: boolean;
}

interface DatoCompleto {
    id: number; cod: string; nombre: string; apellido: string;
    expediente: string | null; folio: string | null; tomo: string | null;
    tipo: string | null; documento: string | null;
    domicilioLegal: string | null; postalLegal: string | null; localidadLegal: string | null;
    telefonosLegal: string | null; emailLegal: string | null;
    codMovilLegal: string | null; movilLegal: string | null;
    domicilioReal: string | null; postalReal: string | null; localidadReal: string | null;
    provinciaReal: string | null; telefonosReal: string | null;
    codMovilReal: string | null; movilReal: string | null; emailReal: string | null;
    fechaMatriculacion: string | null;
}

interface MensajeModal { expediente: string; nombre: string; apellido: string; }

const Field = ({ label, value, onChange, type = "text", placeholder = "" }: {
    label: string; value: string; onChange: (v: string) => void;
    type?: string; placeholder?: string;
}) => (
    <div className="space-y-1">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</label>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400" />
    </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/40 pb-1">{title}</p>
        {children}
    </div>
);

export default function UsuariosAdminPage() {
    const { showToast } = useToast();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [search, setSearch] = useState("");
    const [filtroEstado, setFiltroEstado] = useState<"todos" | "active" | "suspended">("todos");
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 100;

    // Modal mensaje
    const [mensajeModal, setMensajeModal] = useState<MensajeModal | null>(null);
    const [msgTitulo, setMsgTitulo] = useState("");
    const [msgMensaje, setMsgMensaje] = useState("");
    const [enviando, setEnviando] = useState(false);
    const tituloRef = useRef<HTMLInputElement>(null);

    // Modal editar datos
    const [editModal, setEditModal] = useState<DatoCompleto | null>(null);
    const [editForm, setEditForm] = useState<DatoCompleto | null>(null);
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);

    useEffect(() => {
        fetch("/api/admin/usuarios")
            .then(r => r.json())
            .then(data => {
                if (data.usuarios) {
                    setUsuarios(data.usuarios);
                    setIsSuperAdmin(data.isSuperAdmin ?? false);
                } else if (Array.isArray(data)) {
                    setUsuarios(data);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    async function handleEliminar() {
        if (!deleteTarget) return;
        const key = deleteTarget.expediente || deleteTarget.cod;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/usuarios/${encodeURIComponent(key)}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            setUsuarios(prev => prev.filter(u => u.cod !== deleteTarget.cod));
            showToast("Usuario eliminado", "success");
            setDeleteTarget(null);
        } catch {
            showToast("Error al eliminar", "error");
        } finally {
            setDeleting(false);
        }
    }

    useEffect(() => { if (mensajeModal) setTimeout(() => tituloRef.current?.focus(), 50); }, [mensajeModal]);

    const filtered = useMemo(() => {
        setPage(0);
        const q = search.toLowerCase().trim();
        return usuarios.filter(u => {
            if (filtroEstado !== "todos" && u.status !== filtroEstado) return false;
            if (!q) return true;
            return (
                u.apellido.toLowerCase().includes(q) ||
                u.nombre.toLowerCase().includes(q) ||
                (u.expediente || "").toLowerCase().includes(q) ||
                (u.folio || "").toLowerCase().includes(q) ||
                (u.tomo || "").toLowerCase().includes(q)
            );
        });
    }, [usuarios, search, filtroEstado]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    async function openEdit(u: Usuario) {
        const key = u.expediente || u.cod;
        setLoadingEdit(true);
        setEditModal(null);
        const res = await fetch(`/api/admin/usuarios/${encodeURIComponent(key)}/datos`);
        const data = await res.json();
        setEditModal(data);
        setEditForm(data);
        setLoadingEdit(false);
    }

    function setF(field: keyof DatoCompleto, value: string) {
        setEditForm(prev => prev ? { ...prev, [field]: value } : prev);
    }

    async function saveEdit() {
        if (!editModal || !editForm) return;
        const key = editModal.expediente || editModal.cod;
        setSavingEdit(true);
        try {
            const res = await fetch(`/api/admin/usuarios/${encodeURIComponent(key)}/datos`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm),
            });
            if (!res.ok) throw new Error();
            const updated = await res.json();
            setUsuarios(prev => prev.map(u =>
                u.cod === editModal.cod
                    ? { ...u, nombre: updated.nombre, apellido: updated.apellido, folio: updated.folio, tomo: updated.tomo, emailLegal: updated.emailLegal }
                    : u
            ));
            showToast("Datos actualizados", "success");
            setEditModal(null);
            setEditForm(null);
        } catch { showToast("Error al guardar", "error"); }
        finally { setSavingEdit(false); }
    }

    async function enviarMensaje() {
        if (!mensajeModal || !msgTitulo.trim() || !msgMensaje.trim()) return;
        setEnviando(true);
        try {
            const res = await fetch("/api/admin/mensajes", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expediente: mensajeModal.expediente, asunto: msgTitulo.trim(), contenido: msgMensaje.trim() }),
            });
            if (!res.ok) throw new Error();
            showToast("Conversación iniciada", "success");
            setMensajeModal(null); setMsgTitulo(""); setMsgMensaje("");
        } catch { showToast("Error al enviar", "error"); }
        finally { setEnviando(false); }
    }

    const activos = usuarios.filter(u => u.status === "active").length;
    const suspendidos = usuarios.filter(u => u.status === "suspended").length;

    return (
        <div className="p-6 md:p-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Users size={20} className="text-indigo-500" /> Usuarios
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[12px] text-slate-400">{usuarios.length} matriculados</span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={11} /> {activos} activos
                        </span>
                        {suspendidos > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                                <XCircle size={11} /> {suspendidos} suspendidos
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por apellido, nombre, expediente, tomo o folio..."
                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400" />
                </div>
                <div className="flex gap-2">
                    {(["todos", "active", "suspended"] as const).map(f => (
                        <button key={f} onClick={() => setFiltroEstado(f)}
                            className={`px-3 h-10 rounded-xl text-[12px] font-semibold border transition-all
                                ${filtroEstado === f
                                    ? f === "suspended" ? "bg-rose-500 border-rose-500 text-white"
                                        : f === "active" ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "bg-indigo-600 border-indigo-600 text-white"
                                    : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                            {f === "todos" ? "Todos" : f === "active" ? "Activos" : "Suspendidos"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabla */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-300" /></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                    <Users size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Sin resultados</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        {/* Thead */}
                        <div className="min-w-[780px] grid grid-cols-[100px_90px_70px_70px_1fr_120px_160px] gap-4 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            {["Expediente", "Nº Cliente", "Tomo", "Folio", "Nombre y Apellido", "Estado", "Acciones"].map(h => (
                                <p key={h} className="text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</p>
                            ))}
                        </div>

                        <div className="min-w-[780px] divide-y divide-slate-50 dark:divide-slate-800/60">
                            {paginated.map(u => {
                                const key = u.expediente || u.cod;
                                const isSuspended = u.status === "suspended";
                                return (
                                    <div key={u.cod}
                                        className={`grid grid-cols-[100px_90px_70px_70px_1fr_120px_160px] gap-4 px-5 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors items-center ${isSuspended ? "opacity-60" : ""}`}>

                                        <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200 font-mono truncate">
                                            {u.expediente || <span className="text-slate-300 dark:text-slate-600 font-sans font-normal">—</span>}
                                        </p>

                                        <p className="text-[12px] font-mono text-slate-500 dark:text-slate-400">{u.cod || "—"}</p>

                                        <p className="text-[12px] text-slate-500 dark:text-slate-400">{u.tomo || "—"}</p>

                                        <p className="text-[12px] text-slate-500 dark:text-slate-400">{u.folio || "—"}</p>

                                        <div className="min-w-0">
                                            <p className="text-[13px] font-semibold text-slate-800 dark:text-white leading-tight truncate">
                                                {u.apellido}, {u.nombre}
                                            </p>
                                            {u.emailLegal && <p className="text-[11px] text-slate-400 truncate">{u.emailLegal}</p>}
                                        </div>

                                        <div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                                                ${isSuspended ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"}`}>
                                                {isSuspended ? <XCircle size={9} /> : <CheckCircle2 size={9} />}
                                                {isSuspended ? "Suspendido" : "Habilitado"}
                                            </span>
                                            {!u.tieneUsuario && <p className="text-[9px] text-slate-300 dark:text-slate-600 mt-0.5">Sin acceso</p>}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => openEdit(u)} title="Modificar datos"
                                                className="flex items-center gap-1 px-2.5 h-8 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                                                <Pencil size={11} /> Datos
                                            </button>

                                            <button onClick={() => setMensajeModal({ expediente: key, nombre: u.nombre, apellido: u.apellido })} title="Enviar mensaje"
                                                className="flex items-center gap-1 px-2.5 h-8 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-600 hover:border-sky-200 transition-all">
                                                <Send size={11} />
                                            </button>

                                            {isSuperAdmin && (
                                                <button onClick={() => setDeleteTarget(u)} title="Eliminar usuario"
                                                    className="flex items-center gap-1 px-2.5 h-8 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200 transition-all">
                                                    <Trash2 size={11} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between gap-4">
                        <p className="text-[11px] text-slate-400">
                            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length} {filtered.length !== usuarios.length ? `(filtrados de ${usuarios.length})` : "usuarios"}
                        </p>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => setPage(0)} disabled={page === 0}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">
                                    «
                                </button>
                                <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">
                                    ‹ Ant.
                                </button>
                                <span className="px-3 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    {page + 1} / {totalPages}
                                </span>
                                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">
                                    Sig. ›
                                </button>
                                <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all">
                                    »
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Editar Datos */}
            {(editModal || loadingEdit) && editForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => { setEditModal(null); setEditForm(null); }}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl shadow-2xl my-8"
                        onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <p className="text-[14px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Pencil size={14} className="text-indigo-500" /> Modificar datos
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {editForm.apellido}, {editForm.nombre}
                                </p>
                            </div>
                            <button onClick={() => { setEditModal(null); setEditForm(null); }}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                <X size={15} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <Section title="Matrícula">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <Field label="Expediente" value={editForm.expediente || ""} onChange={v => setF("expediente", v)} />
                                    <Field label="Tomo" value={editForm.tomo || ""} onChange={v => setF("tomo", v)} />
                                    <Field label="Folio" value={editForm.folio || ""} onChange={v => setF("folio", v)} />
                                    <Field label="Tipo" value={editForm.tipo || ""} onChange={v => setF("tipo", v)} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Documento" value={editForm.documento || ""} onChange={v => setF("documento", v)} />
                                    <Field label="Fecha de matriculación" type="date"
                                        value={editForm.fechaMatriculacion ? editForm.fechaMatriculacion.slice(0, 10) : ""}
                                        onChange={v => setF("fechaMatriculacion", v)} />
                                </div>
                            </Section>

                            <Section title="Identificación">
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Apellido" value={editForm.apellido} onChange={v => setF("apellido", v)} />
                                    <Field label="Nombre" value={editForm.nombre} onChange={v => setF("nombre", v)} />
                                </div>
                            </Section>

                            <Section title="Domicilio Legal">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Field label="Domicilio" value={editForm.domicilioLegal || ""} onChange={v => setF("domicilioLegal", v)} />
                                    <Field label="Localidad" value={editForm.localidadLegal || ""} onChange={v => setF("localidadLegal", v)} />
                                    <Field label="Código postal" value={editForm.postalLegal || ""} onChange={v => setF("postalLegal", v)} />
                                    <Field label="Email" type="email" value={editForm.emailLegal || ""} onChange={v => setF("emailLegal", v)} />
                                    <Field label="Teléfono" value={editForm.telefonosLegal || ""} onChange={v => setF("telefonosLegal", v)} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Field label="Cód. móvil" value={editForm.codMovilLegal || ""} onChange={v => setF("codMovilLegal", v)} />
                                        <Field label="Móvil" value={editForm.movilLegal || ""} onChange={v => setF("movilLegal", v)} />
                                    </div>
                                </div>
                            </Section>

                            <Section title="Domicilio Real">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Field label="Domicilio" value={editForm.domicilioReal || ""} onChange={v => setF("domicilioReal", v)} />
                                    <Field label="Localidad" value={editForm.localidadReal || ""} onChange={v => setF("localidadReal", v)} />
                                    <Field label="Código postal" value={editForm.postalReal || ""} onChange={v => setF("postalReal", v)} />
                                    <Field label="Provincia" value={editForm.provinciaReal || ""} onChange={v => setF("provinciaReal", v)} />
                                    <Field label="Email" type="email" value={editForm.emailReal || ""} onChange={v => setF("emailReal", v)} />
                                    <Field label="Teléfono" value={editForm.telefonosReal || ""} onChange={v => setF("telefonosReal", v)} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Field label="Cód. móvil" value={editForm.codMovilReal || ""} onChange={v => setF("codMovilReal", v)} />
                                        <Field label="Móvil" value={editForm.movilReal || ""} onChange={v => setF("movilReal", v)} />
                                    </div>
                                </div>
                            </Section>
                        </div>

                        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => { setEditModal(null); setEditForm(null); }}
                                className="flex-1 h-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Cancelar
                            </button>
                            <button onClick={saveEdit} disabled={savingEdit}
                                className="flex-1 flex items-center justify-center gap-2 h-10 bg-indigo-600 text-white rounded-xl text-[13px] font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all">
                                {savingEdit ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : "Guardar cambios"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Mensaje */}
            {mensajeModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setMensajeModal(null); setMsgTitulo(""); setMsgMensaje(""); }}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md shadow-2xl"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <p className="text-[14px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Send size={14} className="text-sky-500" /> Enviar mensaje
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Para: <span className="font-semibold text-slate-600 dark:text-slate-300">{mensajeModal.apellido}, {mensajeModal.nombre}</span>
                                </p>
                            </div>
                            <button onClick={() => { setMensajeModal(null); setMsgTitulo(""); setMsgMensaje(""); }}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-500">Asunto *</label>
                                <input ref={tituloRef} value={msgTitulo} onChange={e => setMsgTitulo(e.target.value)}
                                    placeholder="Ej: Información sobre tu matrícula"
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:border-sky-400" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-500">Mensaje *</label>
                                <textarea value={msgMensaje} onChange={e => setMsgMensaje(e.target.value)}
                                    placeholder="Escribí el mensaje..." rows={4}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:border-sky-400 resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 px-5 pb-5">
                            <button onClick={() => { setMensajeModal(null); setMsgTitulo(""); setMsgMensaje(""); }}
                                className="flex-1 h-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Cancelar
                            </button>
                            <button onClick={enviarMensaje} disabled={enviando || !msgTitulo.trim() || !msgMensaje.trim()}
                                className="flex-1 flex items-center justify-center gap-2 h-10 bg-sky-500 text-white rounded-xl text-[13px] font-bold hover:bg-sky-600 disabled:opacity-50 transition-all">
                                {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                {enviando ? "Enviando..." : "Enviar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Eliminar — solo superadmin */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                                <ShieldAlert size={20} className="text-red-500" />
                            </div>
                            <div>
                                <p className="text-[14px] font-black text-slate-900 dark:text-white">Eliminar usuario</p>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400">Esta acción es irreversible</p>
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                            <p className="text-[13px] font-bold text-red-800 dark:text-red-300">{deleteTarget.apellido}, {deleteTarget.nombre}</p>
                            <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">Exp. {deleteTarget.expediente || deleteTarget.cod}</p>
                            <p className="text-[11px] text-red-600/70 dark:text-red-400/70 mt-2 leading-relaxed">
                                Se eliminará el dato, la cuenta de acceso y todos los trámites asociados.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleEliminar} disabled={deleting}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-bold hover:bg-red-600 disabled:opacity-50 transition-all active:scale-95">
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
