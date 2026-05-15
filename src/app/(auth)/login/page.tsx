"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [expediente, setExpediente] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [recordarme, setRecordarme] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [wrongPassword, setWrongPassword] = useState(false);

    useEffect(() => {
        const guardado = localStorage.getItem("sgo_expediente");
        if (guardado) { setExpediente(guardado); setRecordarme(true); }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setWrongPassword(false);
        setIsLoading(true);

        try {
            if (recordarme) localStorage.setItem("sgo_expediente", expediente);
            else localStorage.removeItem("sgo_expediente");

            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expediente, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error === "wrong_password") {
                    setWrongPassword(true);
                } else {
                    setError(data.error);
                }
                return;
            }

            if (data.user?.accessLevel === "superadmin" || data.user?.accessLevel === "admin") {
                router.push("/admin");
            } else {
                router.push("/dashboard");
            }
        } catch {
            setError("Error de conexión. Intentá de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Logo mobile */}
            <div className="md:hidden flex flex-col items-center mb-10">
                <Image src="/sgo_nuevo.png" alt="SGO Logo" width={70} height={70} className="mb-3" priority />
                <h2 className="text-[#063f68] text-lg font-bold">SGO - CPASF</h2>
            </div>

            {/* Título */}
            <div className="mb-9">
                <p className="text-[11px] font-bold text-[#063f68]/60 uppercase tracking-[0.2em] mb-2">Bienvenido</p>
                <h1 className="text-[28px] font-medium text-gray-800 leading-tight mb-1">Ingresá a tu cuenta</h1>
                <p className="text-gray-400 text-[13px]">
                    ¿No tenés usuario?{" "}
                    <Link href="/register" className="text-[#063f68] font-semibold hover:underline underline-offset-2">
                        Registrate
                    </Link>
                </p>
            </div>

            {/* Error genérico */}
            {error && (
                <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] animate-fade-in">
                    {error}
                </div>
            )}

            {/* Contraseña incorrecta → recupero por email */}
            {wrongPassword && (
                <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 animate-fade-in space-y-2">
                    <p className="text-[13px] font-semibold text-amber-800">Contraseña incorrecta</p>
                    <p className="text-[12px] text-amber-700">
                        Si no recordás tu contraseña, podés recuperarla por correo electrónico.
                    </p>
                    <Link
                        href="/recuperar-contrasena"
                        className="inline-flex items-center gap-1 text-[13px] font-bold text-[#063f68] hover:underline underline-offset-2"
                    >
                        Recuperar contraseña por email →
                    </Link>
                </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <label htmlFor="expediente" className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                        Nº de Expediente / Matrícula
                    </label>
                    <input
                        id="expediente"
                        type="text"
                        value={expediente}
                        onChange={(e) => setExpediente(e.target.value)}
                        placeholder="Ej: 1234"
                        autoComplete="username"
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                       placeholder:text-gray-300 bg-gray-50/50
                       focus:outline-none focus:border-[#063f68] focus:ring-2 focus:ring-[#063f68]/10 focus:bg-white
                       transition-all duration-200"
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="password" className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                        Contraseña
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                            className="w-full px-5 py-4 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                         placeholder:text-gray-300 bg-gray-50/50
                         focus:outline-none focus:border-[#063f68] focus:ring-2 focus:ring-[#063f68]/10 focus:bg-white
                         transition-all duration-200 pr-14"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between py-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={recordarme}
                            onChange={(e) => setRecordarme(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-[#063f68] accent-[#063f68] cursor-pointer"
                        />
                        <span className="text-[13px] text-gray-500">Recordarme</span>
                    </label>
                    <Link
                        href="/recuperar-contrasena"
                        className="text-[13px] text-[#063f68] font-semibold hover:underline underline-offset-2"
                    >
                        Olvidé mi contraseña
                    </Link>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 rounded-2xl text-white font-semibold text-[15px]
                       bg-[#063f68] hover:bg-[#052f50] active:scale-[0.98]
                       focus:outline-none focus:ring-2 focus:ring-[#063f68]/40 focus:ring-offset-2
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                       shadow-lg shadow-[#063f68]/20 hover:shadow-xl hover:shadow-[#063f68]/30"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Accediendo...
                        </span>
                    ) : (
                        "Acceder"
                    )}
                </button>
            </form>
        </div>
    );
}
