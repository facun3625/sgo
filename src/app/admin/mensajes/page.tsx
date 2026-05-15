"use client";

import { useState, useEffect, useRef } from "react";
import { Mail, Loader2, Send, Search, MessageCircle, Plus, X, ChevronLeft, Users } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface MensajeChat {
    id: number; de: string; contenido: string; leido: boolean; createdAt: string;
}
interface UsuarioSnippet {
    expediente: string | null; cod: string; nombre: string; apellido: string;
}
interface ConvItem {
    id: number; expediente: string; asunto: string;
    ultimoMensaje: { de: string; contenido: string; createdAt: string } | null;
    unreadAdmin: number; updatedAt: string;
    usuario: UsuarioSnippet | null;
}
interface ConvDetalle {
    id: number; asunto: string; expediente: string; mensajes: MensajeChat[];
}

function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "hace un momento";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export default function AdminMensajesPage() {
    const { showToast } = useToast();
    const [convs, setConvs] = useState<ConvItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<ConvDetalle | null>(null);
    const [loadingConv, setLoadingConv] = useState(false);
    const [reply, setReply] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Modal nueva conversación
    const [showNew, setShowNew] = useState(false);
    const [usuarios, setUsuarios] = useState<UsuarioSnippet[]>([]);
    const [newExp, setNewExp] = useState("");
    const [newExpSearch, setNewExpSearch] = useState("");
    const [newExpSelected, setNewExpSelected] = useState<UsuarioSnippet | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [newAsunto, setNewAsunto] = useState("");
    const [newMsg, setNewMsg] = useState("");
    const [creando, setCreando] = useState(false);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        const res = await fetch("/api/admin/mensajes");
        const data = await res.json();
        if (Array.isArray(data)) setConvs(data);
        setLoading(false);
    }

    async function openConv(id: number) {
        setLoadingConv(true);
        setSelected(null);
        const res = await fetch(`/api/admin/mensajes/${id}`);
        const data = await res.json();
        setSelected(data);
        setConvs(prev => prev.map(c => c.id === id ? { ...c, unreadAdmin: 0 } : c));
        window.dispatchEvent(new CustomEvent("admin-mensajes-leidos"));
        setLoadingConv(false);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 50);
    }

    async function sendReply() {
        if (!selected || !reply.trim()) return;
        setSending(true);
        const res = await fetch(`/api/admin/mensajes/${selected.id}/reply`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contenido: reply.trim() }),
        });
        if (res.ok) {
            const msg = await res.json();
            setSelected(prev => prev ? { ...prev, mensajes: [...prev.mensajes, msg] } : prev);
            setConvs(prev => prev.map(c => c.id === selected.id
                ? { ...c, ultimoMensaje: msg, updatedAt: msg.createdAt } : c));
            setReply("");
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
        setSending(false);
    }

    async function openNew() {
        setShowNew(true);
        if (usuarios.length === 0) {
            const res = await fetch("/api/admin/usuarios");
            const data = await res.json();
            const lista = data.usuarios ?? data;
            if (Array.isArray(lista)) setUsuarios(lista);
        }
    }

    const suggestions = newExpSearch.trim().length >= 1
        ? usuarios.filter(u => {
            const q = newExpSearch.toLowerCase();
            return (u.expediente || "").toLowerCase().includes(q) ||
                u.apellido.toLowerCase().includes(q) ||
                u.nombre.toLowerCase().includes(q);
        }).slice(0, 8)
        : [];

    function selectUsuario(u: UsuarioSnippet) {
        setNewExpSelected(u);
        setNewExp(u.expediente || u.cod);
        setNewExpSearch(`${u.apellido}, ${u.nombre} (${u.expediente || u.cod})`);
        setShowSuggestions(false);
    }

    async function crearConv() {
        if (!newExp || !newAsunto.trim() || !newMsg.trim()) return;
        setCreando(true);
        const res = await fetch("/api/admin/mensajes", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expediente: newExp, asunto: newAsunto.trim(), contenido: newMsg.trim() }),
        });
        if (res.ok) {
            showToast("Conversación iniciada", "success");
            setShowNew(false);
            setNewExp(""); setNewExpSearch(""); setNewExpSelected(null);
            setNewAsunto(""); setNewMsg("");
            load();
        } else showToast("Error al crear", "error");
        setCreando(false);
    }

    const filtered = convs.filter(c => {
        const q = search.toLowerCase();
        if (!q) return true;
        return (
            c.asunto.toLowerCase().includes(q) ||
            (c.usuario?.apellido || "").toLowerCase().includes(q) ||
            (c.usuario?.nombre || "").toLowerCase().includes(q) ||
            c.expediente.toLowerCase().includes(q)
        );
    });

    const totalUnread = convs.reduce((a, c) => a + c.unreadAdmin, 0);

    return (
        <div className="p-6 md:p-10 h-[calc(100vh-64px)] flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Mail size={20} className="text-sky-500" /> Mensajes
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {convs.length} conversaciones{totalUnread > 0 && <span className="ml-2 px-1.5 py-0.5 bg-sky-500 text-white text-[10px] font-bold rounded-full">{totalUnread} sin leer</span>}
                    </p>
                </div>
                <button onClick={openNew}
                    className="flex items-center gap-1.5 px-4 h-9 bg-sky-500 text-white rounded-xl text-[12px] font-bold hover:bg-sky-600 transition-all">
                    <Plus size={14} /> Nueva conversación
                </button>
            </div>

            <div className="flex gap-4 flex-1 min-h-0">
                {/* Lista */}
                <div className={`flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden
                    ${selected ? "hidden md:flex w-80 flex-shrink-0" : "flex flex-1"}`}>
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[12px] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-300/50" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-2">
                                <MessageCircle size={28} className="text-slate-200 dark:text-slate-700" />
                                <p className="text-[12px] text-slate-400">Sin conversaciones</p>
                            </div>
                        ) : filtered.map(c => (
                            <button key={c.id} onClick={() => openConv(c.id)}
                                className={`w-full text-left px-4 py-3.5 border-b border-slate-50 dark:border-slate-800/60 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30
                                    ${selected?.id === c.id ? "bg-sky-50 dark:bg-sky-900/10 border-l-2 border-l-sky-400" : ""}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            {c.unreadAdmin > 0 && <span className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0" />}
                                            <p className={`text-[12px] truncate ${c.unreadAdmin > 0 ? "font-bold text-slate-800 dark:text-white" : "font-medium text-slate-600 dark:text-slate-300"}`}>
                                                {c.asunto}
                                            </p>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-0.5 ml-3.5">
                                            {c.usuario ? `${c.usuario.apellido}, ${c.usuario.nombre}` : c.expediente}
                                        </p>
                                        {c.ultimoMensaje && (
                                            <p className="text-[11px] text-slate-400 truncate mt-0.5 ml-3.5">
                                                {c.ultimoMensaje.de === "admin" ? "Vos: " : "Usuario: "}{c.ultimoMensaje.contenido}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <span className="text-[10px] text-slate-400">{timeAgo(c.updatedAt)}</span>
                                        {c.unreadAdmin > 0 && (
                                            <span className="min-w-[18px] h-[18px] bg-sky-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                                                {c.unreadAdmin}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Hilo */}
                <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden
                    ${!selected && !loadingConv ? "hidden md:flex items-center justify-center" : "flex"}`}>
                    {loadingConv ? (
                        <div className="flex-1 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
                    ) : !selected ? (
                        <div className="flex flex-col items-center justify-center gap-3 text-center px-8">
                            <Mail size={36} className="text-slate-200 dark:text-slate-700" />
                            <p className="text-[13px] text-slate-400">Seleccioná una conversación</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                                <button onClick={() => setSelected(null)} className="md:hidden p-1 text-slate-400 hover:text-slate-600">
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
                                    <Users size={14} className="text-sky-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white truncate">{selected.asunto}</p>
                                    <p className="text-[11px] text-slate-400">
                                        {convs.find(c => c.id === selected.id)?.usuario
                                            ? `${convs.find(c => c.id === selected.id)!.usuario!.apellido}, ${convs.find(c => c.id === selected.id)!.usuario!.nombre}`
                                            : selected.expediente}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                {selected.mensajes.map(msg => {
                                    const isAdmin = msg.de === "admin";
                                    return (
                                        <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isAdmin
                                                ? "bg-green-800 text-white rounded-br-sm"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-sm"}`}>
                                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.contenido}</p>
                                                <p className={`text-[10px] mt-1 ${isAdmin ? "text-white/50" : "text-slate-400"}`}>
                                                    {timeAgo(msg.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>

                            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
                                <div className="flex gap-2 items-end">
                                    <textarea value={reply} onChange={e => setReply(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                                        placeholder="Escribí tu respuesta... (Enter para enviar)"
                                        rows={2}
                                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50 resize-none" />
                                    <button onClick={sendReply} disabled={sending || !reply.trim()}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-40 transition-all flex-shrink-0">
                                        {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal nueva conversación */}
            {showNew && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md shadow-2xl"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                            <p className="text-[14px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Plus size={14} className="text-sky-500" /> Nueva conversación
                            </p>
                            <button onClick={() => setShowNew(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-500">Destinatario *</label>
                                <div className="relative">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        value={newExpSearch}
                                        onChange={e => {
                                            setNewExpSearch(e.target.value);
                                            setNewExpSelected(null);
                                            setNewExp("");
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                        placeholder="Buscar por matrícula, apellido o nombre..."
                                        className="w-full h-10 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50"
                                    />
                                    {newExpSelected && (
                                        <button
                                            type="button"
                                            onClick={() => { setNewExpSelected(null); setNewExpSearch(""); setNewExp(""); }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                                            {suggestions.map(u => (
                                                <button key={u.cod} type="button"
                                                    onMouseDown={() => selectUsuario(u)}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                                                    <div className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-[9px] font-bold text-sky-600">{u.nombre[0]}{u.apellido[0]}</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[12px] font-semibold text-slate-800 dark:text-white truncate">{u.apellido}, {u.nombre}</p>
                                                        {u.expediente && <p className="text-[10px] text-slate-400">Mat. {u.expediente}</p>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {newExpSelected && (
                                    <p className="text-[11px] text-sky-500 font-medium mt-1 ml-1">
                                        ✓ {newExpSelected.apellido}, {newExpSelected.nombre} — Mat. {newExpSelected.expediente || newExpSelected.cod}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-500">Asunto *</label>
                                <input value={newAsunto} onChange={e => setNewAsunto(e.target.value)}
                                    placeholder="Ej: Consulta sobre tu matrícula"
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-500">Mensaje *</label>
                                <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)}
                                    placeholder="Escribí el mensaje..." rows={4}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50 resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 px-5 pb-5">
                            <button onClick={() => setShowNew(false)}
                                className="flex-1 h-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Cancelar
                            </button>
                            <button onClick={crearConv} disabled={creando || !newExp || !newAsunto.trim() || !newMsg.trim()}
                                className="flex-1 flex items-center justify-center gap-2 h-10 bg-sky-500 text-white rounded-xl text-[13px] font-bold hover:bg-sky-600 disabled:opacity-50 transition-all">
                                {creando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
