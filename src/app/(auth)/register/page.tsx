"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface DatoEncontrado {
    cod: string;
    apellido: string;
    nombre: string;
    expediente: string;
}

export default function RegisterPage() {
    // Paso 1: Verificación
    const [matricula, setMatricula] = useState("");
    const [documento, setDocumento] = useState("");
    const [folio, setFolio] = useState("");
    const [tomo, setTomo] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState("");

    // Paso 2: Completar registro (modal)
    const [showModal, setShowModal] = useState(false);
    const [datoEncontrado, setDatoEncontrado] = useState<DatoEncontrado | null>(null);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [registerError, setRegisterError] = useState("");

    // Paso 3: Éxito
    const [success, setSuccess] = useState(false);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsVerifying(true);

        try {
            const res = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ matricula, documento, folio, tomo }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.details ? `${data.error}: ${data.details}` : data.error);
                return;
            }

            setDatoEncontrado(data.data);
            setShowModal(true);
        } catch {
            setError("Error de conexión. Intentá de nuevo.");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegisterError("");

        if (password !== confirmPassword) {
            setRegisterError("Las contraseñas no coinciden");
            return;
        }

        if (password.length < 6) {
            setRegisterError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setIsRegistering(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cod: datoEncontrado?.cod,
                    apellido: datoEncontrado?.apellido,
                    nombre: datoEncontrado?.nombre,
                    expediente: datoEncontrado?.expediente,
                    password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setRegisterError(data.error);
                return;
            }

            setShowModal(false);
            setSuccess(true);
        } catch {
            setRegisterError("Error de conexión. Intentá de nuevo.");
        } finally {
            setIsRegistering(false);
        }
    };

    // Pantalla de éxito
    if (success) {
        return (
            <div className="animate-fade-in text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                </div>
                <h1 className="text-2xl font-semibold text-gray-800 mb-2">¡Registro exitoso!</h1>
                <p className="text-gray-400 text-sm mb-8">
                    Tu cuenta fue creada correctamente. Ya podés acceder al sistema.
                </p>
                <Link
                    href="/login"
                    className="inline-block w-full py-4 rounded-2xl text-white font-semibold text-[15px] text-center
                     bg-[#063f68] hover:bg-[#052f50] active:scale-[0.98]
                     transition-all duration-200 shadow-lg shadow-[#063f68]/20"
                >
                    Ir a Acceder
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="animate-fade-in">
                {/* Logo mobile */}
                <div className="md:hidden flex flex-col items-center mb-10">
                    <Image src="/sgo_nuevo.png" alt="SGO Logo" width={70} height={70} className="mb-3" priority />
                    <h2 className="text-[#063f68] text-lg font-bold">SGO - CPASF</h2>
                </div>

                {/* Título */}
                <div className="text-center mb-10">
                    <h1 className="text-[28px] font-medium text-gray-800 mb-2">Registrarse</h1>
                    <p className="text-gray-400 text-[13px]">
                        ¿Ya tenés usuario?{" "}
                        <Link href="/login" className="text-[#063f68] font-semibold hover:underline underline-offset-2">
                            Accedé
                        </Link>
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
                        {error}
                    </div>
                )}

                {/* Formulario de verificación */}
                <form onSubmit={handleVerify} className="space-y-4">
                    <input
                        type="text"
                        value={matricula}
                        onChange={(e) => setMatricula(e.target.value)}
                        placeholder="Matrícula"
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                       placeholder:text-gray-400 bg-white
                       focus:outline-none focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/20
                       transition-all duration-200"
                    />
                    <input
                        type="text"
                        value={documento}
                        onChange={(e) => setDocumento(e.target.value)}
                        placeholder="Documento (DNI o LE)"
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                       placeholder:text-gray-400 bg-white
                       focus:outline-none focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/20
                       transition-all duration-200"
                    />
                    <input
                        type="text"
                        value={folio}
                        onChange={(e) => setFolio(e.target.value)}
                        placeholder="Folio"
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                       placeholder:text-gray-400 bg-white
                       focus:outline-none focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/20
                       transition-all duration-200"
                    />
                    <input
                        type="text"
                        value={tomo}
                        onChange={(e) => setTomo(e.target.value)}
                        placeholder="Tomo"
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                       placeholder:text-gray-400 bg-white
                       focus:outline-none focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/20
                       transition-all duration-200"
                    />

                    <button
                        type="submit"
                        disabled={isVerifying}
                        className="w-full py-4 rounded-2xl text-white font-semibold text-[15px]
                       bg-[#063f68] hover:bg-[#052f50] active:scale-[0.98]
                       focus:outline-none focus:ring-2 focus:ring-[#063f68]/40 focus:ring-offset-2
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                       shadow-lg shadow-[#063f68]/20 hover:shadow-xl hover:shadow-[#063f68]/30"
                    >
                        {isVerifying ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Verificando...
                            </span>
                        ) : (
                            "Enviar"
                        )}
                    </button>
                </form>
            </div>

            {/* Modal - Usuario Encontrado */}
            {showModal && datoEncontrado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                        onClick={() => setShowModal(false)}
                    />

                    {/* Modal */}
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
                        {/* Cerrar */}
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Icono de éxito */}
                        <div className="flex justify-center mb-5">
                            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </div>
                        </div>

                        {/* Info del usuario encontrado */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-1">¡Usuario encontrado!</h2>
                            <p className="text-gray-400 text-sm">Completá los datos para finalizar el registro</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-6">
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold text-gray-800">{datoEncontrado.apellido}, {datoEncontrado.nombre}</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Matrícula: {datoEncontrado.expediente}</p>
                        </div>

                        {/* Error de registro */}
                        {registerError && (
                            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
                                {registerError}
                            </div>
                        )}

                        {/* Form de completar registro */}
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Contraseña"
                                    required
                                    className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                             placeholder:text-gray-400 bg-white
                             focus:outline-none focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/20
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
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirmar contraseña"
                                required
                                className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-gray-800 text-[14px]
                           placeholder:text-gray-400 bg-white
                           focus:outline-none focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/20
                           transition-all duration-200"
                            />

                            <button
                                type="submit"
                                disabled={isRegistering}
                                className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px]
                           bg-[#063f68] hover:bg-[#052f50] active:scale-[0.98]
                           focus:outline-none focus:ring-2 focus:ring-[#063f68]/40 focus:ring-offset-2
                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                           shadow-lg shadow-[#063f68]/20"
                            >
                                {isRegistering ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Registrando...
                                    </span>
                                ) : (
                                    "Registrar"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
