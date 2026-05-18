"use client";

import { useState, useEffect } from "react";
import { Mail, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";

type Msg = { tipo: "success" | "error"; texto: string } | null;

export default function ConfigSmtpPage() {
    const [loading, setLoading] = useState(true);
    const [host, setHost] = useState("");
    const [port, setPort] = useState("465");
    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const [from, setFrom] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<Msg>(null);
    const [testing, setTesting] = useState(false);
    const [testEmail, setTestEmail] = useState("");
    const [testMsg, setTestMsg] = useState<Msg>(null);

    useEffect(() => {
        fetch("/api/admin/config/smtp")
            .then(r => r.json())
            .then(d => {
                setHost(d.smtpHost ?? "");
                setPort(d.smtpPort ?? "465");
                setUser(d.smtpUser ?? "");
                setFrom(d.smtpFrom ?? "");
                // pass no se devuelve por seguridad
            })
            .finally(() => setLoading(false));
    }, []);

    const save = async () => {
        setSaving(true); setMsg(null);
        try {
            const entries: [string, string][] = [
                ["smtpHost", host.trim()],
                ["smtpPort", port.trim()],
                ["smtpUser", user.trim()],
                ["smtpFrom", from.trim()],
            ];
            if (pass.trim()) entries.push(["smtpPass", pass.trim()]);

            const results = await Promise.all(
                entries.map(([clave, valor]) =>
                    fetch("/api/admin/config", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ clave, valor }),
                    })
                )
            );
            if (results.every(r => r.ok)) {
                setMsg({ tipo: "success", texto: "Configuración SMTP guardada." });
                setPass("");
            } else {
                setMsg({ tipo: "error", texto: "Error al guardar." });
            }
        } catch {
            setMsg({ tipo: "error", texto: "Error de conexión." });
        } finally {
            setSaving(false);
        }
    };

    const sendTest = async () => {
        if (!testEmail.trim()) return;
        setTesting(true); setTestMsg(null);
        try {
            const res = await fetch("/api/admin/config/smtp/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: testEmail.trim() }),
            });
            const data = await res.json();
            if (res.ok) setTestMsg({ tipo: "success", texto: "Email de prueba enviado. Revisá tu bandeja." });
            else setTestMsg({ tipo: "error", texto: data.error ?? "Error al enviar." });
        } catch {
            setTestMsg({ tipo: "error", texto: "Error de conexión." });
        } finally {
            setTesting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
    );

    return (
        <div className="p-6 md:p-10 max-w-2xl space-y-6">
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Mail size={20} className="text-sky-500" /> Configuración SMTP
                </h1>
                <p className="text-slate-400 text-sm mt-0.5">Servidor de correo para envíos masivos y notificaciones.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                <p className="text-[11px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/40 pb-1">Servidor</p>

                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Host SMTP</label>
                        <input value={host} onChange={e => setHost(e.target.value)}
                            placeholder="mail.tudominio.com"
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-300/50" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Puerto</label>
                        <input value={port} onChange={e => setPort(e.target.value)}
                            placeholder="465"
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-300/50" />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Usuario</label>
                    <input value={user} onChange={e => setUser(e.target.value)}
                        placeholder="usuario@tudominio.com"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-300/50" />
                </div>

                <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        Contraseña {pass === "" && host && <span className="text-slate-300 normal-case font-normal">(dejá vacío para no cambiar)</span>}
                    </label>
                    <div className="relative">
                        <input type={showPass ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)}
                            placeholder="••••••••"
                            className="w-full h-9 px-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-300/50" />
                        <button type="button" onClick={() => setShowPass(p => !p)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Remitente (From)</label>
                    <input value={from} onChange={e => setFrom(e.target.value)}
                        placeholder='"CPASF · SGO" <no-reply@tudominio.com>'
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-300/50" />
                </div>

                {msg && (
                    <div className={`flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg ${msg.tipo === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"}`}>
                        {msg.tipo === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {msg.texto}
                    </div>
                )}

                <button onClick={save} disabled={saving}
                    className="flex items-center gap-2 px-5 h-10 bg-indigo-600 text-white rounded-xl text-[13px] font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                    Guardar configuración
                </button>
            </div>

            {/* Test */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                <p className="text-[11px] font-black uppercase tracking-widest text-sky-500 dark:text-sky-400 border-b border-sky-100 dark:border-sky-900/40 pb-1">Probar conexión</p>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">Enviá un email de prueba para verificar que la configuración es correcta.</p>
                <div className="flex gap-3">
                    <input value={testEmail} onChange={e => setTestEmail(e.target.value)}
                        placeholder="correo@ejemplo.com" type="email"
                        className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300/50" />
                    <button onClick={sendTest} disabled={testing || !testEmail.trim()}
                        className="flex items-center gap-2 px-4 h-9 bg-sky-500 text-white rounded-xl text-[12px] font-bold hover:bg-sky-600 disabled:opacity-50 transition-all">
                        {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        Enviar prueba
                    </button>
                </div>
                {testMsg && (
                    <div className={`flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg ${testMsg.tipo === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"}`}>
                        {testMsg.tipo === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {testMsg.texto}
                    </div>
                )}
            </div>
        </div>
    );
}
