"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User, Minimize2 } from "lucide-react";

interface Message {
    role: "user" | "assistant";
    text: string;
}

export default function ChatBot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open && !minimized) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            inputRef.current?.focus();
        }
    }, [messages, open, minimized]);

    useEffect(() => {
        if (open && messages.length === 0) {
            setMessages([{
                role: "assistant",
                text: "¡Hola! Soy el asistente virtual del Colegio de Profesionales de la Abogacía de Santa Fe. ¿En qué puedo ayudarte hoy?"
            }]);
        }
    }, [open]);

    async function sendMessage() {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", text: userMsg }]);
        setLoading(true);

        try {
            const history = messages.map(m => ({ role: m.role, text: m.text }));
            const res = await fetch("/api/user/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg, history }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, {
                role: "assistant",
                text: data.response || "Lo siento, no pude procesar tu consulta."
            }]);
        } catch {
            setMessages(prev => [...prev, {
                role: "assistant",
                text: "Error de conexión. Por favor intentá nuevamente."
            }]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            {/* Botón flotante */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#063f68] dark:bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-900/30 flex items-center justify-center hover:bg-[#0a4d7a] dark:hover:bg-blue-500 transition-all hover:scale-110 active:scale-95"
                    title="Asistente virtual"
                >
                    <MessageCircle size={24} />
                </button>
            )}

            {/* Ventana de chat */}
            {open && (
                <div className={`fixed bottom-6 right-6 z-50 w-[360px] bg-white dark:bg-[#0d1f2d] rounded-2xl shadow-2xl shadow-black/20 border border-slate-100 dark:border-slate-800 flex flex-col transition-all duration-300 ${minimized ? "h-14" : "h-[520px]"}`}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#063f68] dark:bg-blue-700 rounded-t-2xl shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                                <Bot size={16} className="text-white" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-[13px]">Asistente CPASF</p>
                                <p className="text-white/60 text-[10px]">Respondiendo al instante</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setMinimized(!minimized)}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-all text-white/70 hover:text-white"
                            >
                                <Minimize2 size={14} />
                            </button>
                            <button
                                onClick={() => { setOpen(false); setMinimized(false); }}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-all text-white/70 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {!minimized && (
                        <>
                            {/* Mensajes */}
                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user" ? "bg-[#063f68] dark:bg-blue-600" : "bg-slate-100 dark:bg-slate-800"}`}>
                                            {msg.role === "user"
                                                ? <User size={13} className="text-white" />
                                                : <Bot size={13} className="text-slate-500 dark:text-slate-400" />
                                            }
                                        </div>
                                        <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                                            msg.role === "user"
                                                ? "bg-[#063f68] dark:bg-blue-600 text-white rounded-tr-sm"
                                                : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-sm"
                                        }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex gap-2">
                                        <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                            <Bot size={13} className="text-slate-500" />
                                        </div>
                                        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl rounded-tl-sm">
                                            <Loader2 size={14} className="animate-spin text-slate-400" />
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>

                            {/* Input */}
                            <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                                <div className="flex gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && sendMessage()}
                                        placeholder="Escribí tu consulta..."
                                        disabled={loading}
                                        className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/20 disabled:opacity-50"
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={loading || !input.trim()}
                                        className="w-10 h-10 bg-[#063f68] dark:bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-[#0a4d7a] dark:hover:bg-blue-500 disabled:opacity-40 transition-all"
                                    >
                                        <Send size={15} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
