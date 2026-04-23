"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, KeyRound, Eye, EyeOff, CheckCircle2, ChevronLeft, Clock } from "lucide-react";

type Paso = 1 | 2 | 3 | 4;

interface Correo {
    id: string;
    mascara: string;
}

export default function RecuperarContrasenaPage() {
    const [paso, setPaso] = useState<Paso>(1);
    const [expediente, setExpediente] = useState("");
    const [correos, setCorreos] = useState<Correo[]>([]);
    const [correoElegido, setCorreoElegido] = useState("");
    const [token, setToken] = useState("");
    const [nuevaPassword, setNuevaPassword] = useState("");
    const [confirmarPassword, setConfirmarPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleBuscar(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        const res = await fetch("/api/auth/recuperar/buscar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expediente }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { setError(data.error); return; }
        setCorreos(data.correos);
        setCorreoElegido(data.correos[0].id);
        setPaso(2);
    }

    async function handleEnviar() {
        setError("");
        setLoading(true);
        const res = await fetch("/api/auth/recuperar/enviar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expediente, tipo: correoElegido }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { setError(data.error); return; }
        setPaso(3);
    }

    async function handleVerificar(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (nuevaPassword !== confirmarPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }
        setLoading(true);
        const res = await fetch("/api/auth/recuperar/verificar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expediente, token, nuevaPassword }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { setError(data.error); return; }
        setPaso(4);
    }

    return (
        <div className="animate-fade-in">

            {/* Logo mobile */}
            <div className="md:hidden flex flex-col items-center mb-10">
                <img src="/sgo.png" alt="CPASF" className="w-16 h-16 object-contain mb-3" />
                <h2 className="text-[#063f68] text-lg font-bold">CPASF</h2>
            </div>

            {/* Indicador de pasos */}
            {paso < 4 && (
                <div className="flex items-center gap-2 mb-8">
                    {[1, 2, 3].map((p) => (
                        <div key={p} className="flex items-center gap-2 flex-1">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all
                                ${paso === p ? "bg-[#063f68] text-white" : paso > p ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                                {paso > p ? <CheckCircle2 size={13} /> : p}
                            </div>
                            {p < 3 && <div className={`h-px flex-1 transition-all ${paso > p ? "bg-emerald-400" : "bg-gray-200"}`} />}
                        </div>
                    ))}
                </div>
            )}

            {/* PASO 1 — Expediente */}
            {paso === 1 && (
                <>
                    <div className="mb-9">
                        <p className="text-[11px] font-bold text-[#063f68]/60 uppercase tracking-[0.2em] mb-2">Acceso</p>
                        <h1 className="text-[28px] font-medium text-gray-800 leading-tight mb-1">Recuperar contraseña</h1>
                        <p className="text-gray-400 text-[13px]">
                            Ingresá tu número de expediente para continuar.
                        </p>
                    </div>
                    <form onSubmit={handleBuscar} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider block">
                                Nº de Expediente / Matrícula
                            </label>
                            <input
                                type="text"
                                value={expediente}
                                onChange={(e) => setExpediente(e.target.value)}
                                placeholder="Ej: 1234"
                                required
                                className="w-full px-5 py-4 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                                    placeholder:text-gray-300 bg-gray-50/50
                                    focus:outline-none focus:border-[#063f68] focus:ring-2 focus:ring-[#063f68]/10 focus:bg-white
                                    transition-all duration-200"
                            />
                        </div>
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                                {error}
                            </div>
                        )}
                        <button type="submit" disabled={loading}
                            className="w-full py-4 rounded-2xl text-white font-semibold text-[15px]
                                bg-[#063f68] hover:bg-[#052f50] active:scale-[0.98]
                                focus:outline-none focus:ring-2 focus:ring-[#063f68]/40 focus:ring-offset-2
                                transition-all duration-200 disabled:opacity-50
                                shadow-lg shadow-[#063f68]/20 hover:shadow-xl hover:shadow-[#063f68]/30
                                flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                            {loading ? "Buscando..." : "Continuar"}
                        </button>
                        <p className="text-center text-[13px] text-gray-400">
                            ¿Recordaste tu contraseña?{" "}
                            <Link href="/login" className="text-[#063f68] font-semibold hover:underline underline-offset-2">
                                Accedé
                            </Link>
                        </p>
                    </form>
                </>
            )}

            {/* PASO 2 — Elegir correo */}
            {paso === 2 && (
                <>
                    <div className="mb-7">
                        <p className="text-[11px] font-bold text-[#063f68]/60 uppercase tracking-[0.2em] mb-2">Verificación</p>
                        <h1 className="text-[28px] font-medium text-gray-800 leading-tight mb-1">Elegí dónde recibir el código</h1>
                        <p className="text-gray-400 text-[13px]">
                            Seleccioná uno de tus correos registrados. El código expirará en <strong className="text-gray-600">30 minutos</strong>.
                        </p>
                    </div>
                    <div className="space-y-3 mb-5">
                        {correos.map((c) => (
                            <button key={c.id} onClick={() => setCorreoElegido(c.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left
                                    ${correoElegido === c.id
                                        ? "border-[#063f68] bg-[#063f68]/5 ring-2 ring-[#063f68]/10"
                                        : "border-gray-200 bg-gray-50/50 hover:bg-gray-100/50"}`}>
                                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                                    ${correoElegido === c.id ? "border-[#063f68]" : "border-gray-300"}`}>
                                    {correoElegido === c.id && <div className="w-2 h-2 rounded-full bg-[#063f68]" />}
                                </div>
                                <Mail size={15} className="text-gray-400 flex-shrink-0" />
                                <span className="text-gray-700 text-[13px] font-mono">{c.mascara}</span>
                            </button>
                        ))}
                    </div>
                    {error && (
                        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button onClick={() => setPaso(1)}
                            className="flex items-center gap-1.5 px-4 py-4 rounded-2xl border border-gray-200 text-gray-500 font-semibold text-[13px] hover:bg-gray-50 transition-all">
                            <ChevronLeft size={15} /> Volver
                        </button>
                        <button onClick={handleEnviar} disabled={loading}
                            className="flex-1 py-4 rounded-2xl text-white font-semibold text-[15px]
                                bg-[#063f68] hover:bg-[#052f50] active:scale-[0.98]
                                transition-all duration-200 disabled:opacity-50
                                shadow-lg shadow-[#063f68]/20
                                flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                            {loading ? "Enviando..." : "Enviar código"}
                        </button>
                    </div>
                </>
            )}

            {/* PASO 3 — Token + nueva contraseña */}
            {paso === 3 && (
                <>
                    <div className="mb-7">
                        <p className="text-[11px] font-bold text-[#063f68]/60 uppercase tracking-[0.2em] mb-2">Nueva contraseña</p>
                        <h1 className="text-[28px] font-medium text-gray-800 leading-tight mb-1">Ingresá el código</h1>
                        <div className="flex items-center gap-1.5 mt-1 mb-1">
                            <Clock size={13} className="text-amber-500" />
                            <p className="text-amber-600 text-[13px] font-semibold">El código expira en 30 minutos</p>
                        </div>
                        <p className="text-gray-400 text-[13px]">Revisá tu correo y completá el código de 6 dígitos junto a tu nueva contraseña.</p>
                    </div>
                    <form onSubmit={handleVerificar} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider block">Código de 6 dígitos</label>
                            <input
                                type="text"
                                value={token}
                                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="000000"
                                required
                                maxLength={6}
                                className="w-full px-5 py-4 rounded-2xl border border-gray-200 text-gray-800 text-[22px] font-mono text-center tracking-[0.4em]
                                    placeholder:text-gray-300 bg-gray-50/50
                                    focus:outline-none focus:border-[#063f68] focus:ring-2 focus:ring-[#063f68]/10 focus:bg-white
                                    transition-all duration-200"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider block">Nueva contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPass ? "text" : "password"}
                                    value={nuevaPassword}
                                    onChange={(e) => setNuevaPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    className="w-full px-5 py-4 pr-14 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                                        placeholder:text-gray-300 bg-gray-50/50
                                        focus:outline-none focus:border-[#063f68] focus:ring-2 focus:ring-[#063f68]/10 focus:bg-white
                                        transition-all duration-200"
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                                    tabIndex={-1}>
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider block">Confirmar contraseña</label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmarPassword}
                                    onChange={(e) => setConfirmarPassword(e.target.value)}
                                    placeholder="Repetí la contraseña"
                                    required
                                    className="w-full px-5 py-4 pr-14 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                                        placeholder:text-gray-300 bg-gray-50/50
                                        focus:outline-none focus:border-[#063f68] focus:ring-2 focus:ring-[#063f68]/10 focus:bg-white
                                        transition-all duration-200"
                                />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                                    tabIndex={-1}>
                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                                {error}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setPaso(2)}
                                className="flex items-center gap-1.5 px-4 py-4 rounded-2xl border border-gray-200 text-gray-500 font-semibold text-[13px] hover:bg-gray-50 transition-all">
                                <ChevronLeft size={15} /> Volver
                            </button>
                            <button type="submit" disabled={loading || token.length !== 6}
                                className="flex-1 py-4 rounded-2xl text-white font-semibold text-[15px]
                                    bg-[#063f68] hover:bg-[#052f50] active:scale-[0.98]
                                    transition-all duration-200 disabled:opacity-50
                                    shadow-lg shadow-[#063f68]/20
                                    flex items-center justify-center gap-2">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                                {loading ? "Verificando..." : "Cambiar contraseña"}
                            </button>
                        </div>
                        <button type="button" onClick={handleEnviar}
                            className="w-full text-center text-[13px] text-gray-400 hover:text-gray-600 transition-colors">
                            ¿No recibiste el código? <span className="text-[#063f68] font-semibold">Reenviar</span>
                        </button>
                    </form>
                </>
            )}

            {/* PASO 4 — Éxito */}
            {paso === 4 && (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                        <CheckCircle2 size={32} className="text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-[28px] font-medium text-gray-800 leading-tight mb-2">¡Contraseña actualizada!</h1>
                        <p className="text-gray-400 text-[13px]">Ya podés ingresar con tu nueva contraseña.</p>
                    </div>
                    <Link href="/login"
                        className="mt-2 w-full py-4 rounded-2xl text-white font-semibold text-[15px]
                            bg-[#063f68] hover:bg-[#052f50] active:scale-[0.98]
                            transition-all duration-200
                            shadow-lg shadow-[#063f68]/20
                            flex items-center justify-center">
                        Ir al inicio de sesión
                    </Link>
                </div>
            )}
        </div>
    );
}
