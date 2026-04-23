"use client";

import { useState, useEffect, useRef } from "react";
import { Mail, Loader2, Send, ChevronLeft, MessageCircle } from "lucide-react";

interface MensajeChat {
    id: number;
    de: string;
    contenido: string;
    leido: boolean;
    createdAt: string;
}

interface Conversacion {
    id: number;
    asunto: string;
    ultimoMensaje: { de: string; contenido: string; createdAt: string } | null;
    unread: number;
    updatedAt: string;
}

interface ConversacionDetalle {
    id: number;
    asunto: string;
    mensajes: MensajeChat[];
}

function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "hace un momento";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export default function MensajesPage() {
    const [convs, setConvs] = useState<Conversacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<ConversacionDetalle | null>(null);
    const [loadingConv, setLoadingConv] = useState(false);
    const [reply, setReply] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        fetch("/api/user/mensajes")
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setConvs(data); })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selected?.mensajes]);

    async function openConv(id: number) {
        setLoadingConv(true);
        setSelected(null);
        const res = await fetch(`/api/user/mensajes/${id}`);
        const data = await res.json();
        setSelected(data);
        setConvs(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
        setLoadingConv(false);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 50);
    }

    async function sendReply() {
        if (!selected || !reply.trim()) return;
        setSending(true);
        const res = await fetch(`/api/user/mensajes/${selected.id}/reply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contenido: reply.trim() }),
        });
        if (res.ok) {
            const msg = await res.json();
            setSelected(prev => prev ? { ...prev, mensajes: [...prev.mensajes, msg] } : prev);
            setConvs(prev => prev.map(c => c.id === selected.id
                ? { ...c, ultimoMensaje: msg, updatedAt: msg.createdAt }
                : c
            ));
            setReply("");
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
        setSending(false);
    }

    return (
        <div className="p-4 md:p-8">
            <div className="mb-5">
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Mail size={20} className="text-sky-500" /> Mensajes
                </h1>
                <p className="text-slate-400 text-sm mt-0.5">Comunicaciones con el CPASF</p>
            </div>

            <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">
                {/* Lista de conversaciones */}
                <div className={`flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden
                    ${selected ? "hidden md:flex w-72 flex-shrink-0" : "flex flex-1"}`}>
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Conversaciones</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 size={24} className="animate-spin text-slate-300" />
                            </div>
                        ) : convs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 px-4 text-center">
                                <MessageCircle size={32} className="text-slate-200 dark:text-slate-700" />
                                <p className="text-[13px] text-slate-400">No tenés mensajes aún</p>
                            </div>
                        ) : (
                            convs.map(c => (
                                <button key={c.id} onClick={() => openConv(c.id)}
                                    className={`w-full text-left px-4 py-3.5 border-b border-slate-50 dark:border-slate-800/60 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30
                                        ${selected?.id === c.id ? "bg-sky-50 dark:bg-sky-900/10 border-l-2 border-l-sky-400" : ""}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {c.unread > 0 && (
                                                    <span className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0" />
                                                )}
                                                <p className={`text-[13px] truncate leading-tight ${c.unread > 0 ? "font-bold text-slate-800 dark:text-white" : "font-medium text-slate-600 dark:text-slate-300"}`}>
                                                    {c.asunto}
                                                </p>
                                            </div>
                                            {c.ultimoMensaje && (
                                                <p className="text-[11px] text-slate-400 truncate mt-0.5 ml-4">
                                                    {c.ultimoMensaje.de === "user" ? "Vos: " : "CPASF: "}
                                                    {c.ultimoMensaje.contenido}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">{timeAgo(c.updatedAt)}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Hilo de conversación */}
                <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden
                    ${!selected && !loadingConv ? "hidden md:flex items-center justify-center" : "flex"}`}>
                    {loadingConv ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 size={24} className="animate-spin text-slate-300" />
                        </div>
                    ) : !selected ? (
                        <div className="flex flex-col items-center justify-center gap-3 text-center px-8">
                            <Mail size={36} className="text-slate-200 dark:text-slate-700" />
                            <p className="text-[13px] text-slate-400">Seleccioná una conversación</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                                <button onClick={() => setSelected(null)} className="md:hidden p-1 text-slate-400 hover:text-slate-600 transition-colors">
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
                                    <Mail size={14} className="text-sky-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white truncate">{selected.asunto}</p>
                                    <p className="text-[11px] text-slate-400">CPASF</p>
                                </div>
                            </div>

                            {/* Mensajes */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                {selected.mensajes.map(msg => {
                                    const isUser = msg.de === "user";
                                    return (
                                        <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isUser
                                                ? "bg-[#063f68] text-white rounded-br-sm"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-sm"}`}>
                                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.contenido}</p>
                                                <p className={`text-[10px] mt-1 ${isUser ? "text-white/50" : "text-slate-400"}`}>
                                                    {timeAgo(msg.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>

                            {/* Reply */}
                            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
                                <div className="flex gap-2 items-end">
                                    <textarea
                                        ref={textareaRef}
                                        value={reply}
                                        onChange={e => setReply(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                                        placeholder="Escribí tu respuesta... (Enter para enviar)"
                                        rows={2}
                                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:border-sky-400 resize-none"
                                    />
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
        </div>
    );
}
