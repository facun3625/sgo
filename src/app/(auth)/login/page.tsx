"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [expediente, setExpediente] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Estado para el popup de blanqueo
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetUserName, setResetUserName] = useState("");
    const [resetDocumento, setResetDocumento] = useState("");
    const [resetFolio, setResetFolio] = useState("");
    const [resetTomo, setResetTomo] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetError, setResetError] = useState("");
    const [resetSuccess, setResetSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expediente, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Si es usuario migrado que necesita blanquear contraseña
                if (data.error === "reset_required") {
                    setResetUserName(data.userName || "");
                    setShowResetModal(true);
                    return;
                }
                setError(data.error);
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

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetError("");

        if (newPassword !== confirmNewPassword) {
            setResetError("Las contraseñas no coinciden");
            return;
        }

        if (newPassword.length < 6) {
            setResetError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setIsResetting(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    expediente,
                    documento: resetDocumento,
                    folio: resetFolio,
                    tomo: resetTomo,
                    newPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setResetError(data.error);
                return;
            }

            setResetSuccess(true);
        } catch {
            setResetError("Error de conexión. Intentá de nuevo.");
        } finally {
            setIsResetting(false);
        }
    };

    const closeResetModal = () => {
        setShowResetModal(false);
        setResetDocumento("");
        setResetFolio("");
        setResetTomo("");
        setNewPassword("");
        setConfirmNewPassword("");
        setResetError("");
        setResetSuccess(false);
    };

    return (
        <>
            <div className="animate-fade-in">
                {/* Logo mobile */}
                <div className="md:hidden flex flex-col items-center mb-10">
                    <Image src="/sgo.png" alt="SGO Logo" width={70} height={70} className="mb-3" priority />
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

                {/* Error */}
                {error && (
                    <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
                        {error}
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
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                className="w-[18px] h-[18px] rounded accent-[#063f68] cursor-pointer"
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

            {/* Modal - Blanqueo de contraseña para usuarios migrados */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={closeResetModal} />

                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-fade-in max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={closeResetModal}
                            className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {resetSuccess ? (
                            /* Éxito */
                            <div className="text-center animate-fade-in">
                                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                                    <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-800 mb-2">¡Contraseña establecida!</h2>
                                <p className="text-gray-400 text-sm mb-6">
                                    Ya podés acceder con tu expediente y tu nueva contraseña.
                                </p>
                                <button
                                    onClick={closeResetModal}
                                    className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px]
                             bg-[#063f68] hover:bg-[#052f50] active:scale-[0.98]
                             transition-all duration-200 shadow-lg shadow-[#063f68]/20"
                                >
                                    Volver a acceder
                                </button>
                            </div>
                        ) : (
                            /* Formulario de blanqueo */
                            <>
                                <div className="flex justify-center mb-5">
                                    <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                                        <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="text-center mb-2">
                                    <h2 className="text-xl font-semibold text-gray-800 mb-1">Establecer contraseña</h2>
                                    <p className="text-gray-400 text-sm">
                                        Es tu primer acceso al nuevo sistema.
                                        <br />Verificá tus datos para crear tu contraseña.
                                    </p>
                                </div>

                                {resetUserName && (
                                    <div className="bg-gray-50 rounded-xl p-3 mb-5 text-center">
                                        <p className="text-sm font-semibold text-gray-800">{resetUserName}</p>
                                        <p className="text-xs text-gray-400">Matrícula: {expediente}</p>
                                    </div>
                                )}

                                {resetError && (
                                    <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
                                        {resetError}
                                    </div>
                                )}

                                <form onSubmit={handleReset} className="space-y-3">
                                    <input
                                        type="text"
                                        value={resetDocumento}
                                        onChange={(e) => setResetDocumento(e.target.value)}
                                        placeholder="Documento (DNI o LE)"
                                        required
                                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                               placeholder:text-gray-400 bg-white
                               focus:outline-none focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/20
                               transition-all duration-200"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            value={resetFolio}
                                            onChange={(e) => setResetFolio(e.target.value)}
                                            placeholder="Folio"
                                            required
                                            className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                                 placeholder:text-gray-400 bg-white
                                 focus:outline-none focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/20
                                 transition-all duration-200"
                                        />
                                        <input
                                            type="text"
                                            value={resetTomo}
                                            onChange={(e) => setResetTomo(e.target.value)}
                                            placeholder="Tomo"
                                            required
                                            className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                                 placeholder:text-gray-400 bg-white
                                 focus:outline-none focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/20
                                 transition-all duration-200"
                                        />
                                    </div>

                                    <div className="pt-2 border-t border-gray-100">
                                        <p className="text-xs text-gray-400 mb-3 mt-2">Tu nueva contraseña</p>
                                    </div>

                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Nueva contraseña"
                                            required
                                            className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                                 placeholder:text-gray-400 bg-white
                                 focus:outline-none focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/20
                                 transition-all duration-200 pr-14"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                                            tabIndex={-1}
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <input
                                        type="password"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        placeholder="Confirmar contraseña"
                                        required
                                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                               placeholder:text-gray-400 bg-white
                               focus:outline-none focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/20
                               transition-all duration-200"
                                    />

                                    <button
                                        type="submit"
                                        disabled={isResetting}
                                        className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px]
                               bg-[#063f68] hover:bg-[#052f50] active:scale-[0.98]
                               focus:outline-none focus:ring-2 focus:ring-[#063f68]/40 focus:ring-offset-2
                               transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                               shadow-lg shadow-[#063f68]/20"
                                    >
                                        {isResetting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Verificando...
                                            </span>
                                        ) : (
                                            "Establecer contraseña"
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
