"use client";

import React, { useState, useRef } from "react";
import { Camera, ShieldCheck, User as UserIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface ProfileFormProps {
    initialUser: {
        nombre: string;
        apellido: string;
        expediente: string;
        image: string | null;
        signature: string | null;
    };
}

export default function ProfileForm({ initialUser }: ProfileFormProps) {
    const [image, setImage] = useState<string | null>(initialUser.image);
    const [signature, setSignature] = useState<string | null>(initialUser.signature);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingSignature, setIsUploadingSignature] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const router = useRouter();
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    // Password state
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/user/upload-photo", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                setImage(data.url);
                setMessage({ type: "success", text: "Foto actualizada correctamente" });
                router.refresh(); // Actualiza TopNav y Sidebar inmediatamente
            } else {
                setMessage({ type: "error", text: data.error || "Error al subir la imagen" });
            }
        } catch (error) {
            setMessage({ type: "error", text: "Error de conexión" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingSignature(true);
        setMessage(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/user/upload-signature", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                setSignature(data.url);
                setMessage({ type: "success", text: "Firma actualizada correctamente" });
                router.refresh();
            } else {
                setMessage({ type: "error", text: data.error || "Error al subir la firma" });
            }
        } catch (error) {
            setMessage({ type: "error", text: "Error de conexión" });
        } finally {
            setIsUploadingSignature(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: "error", text: "Las contraseñas no coinciden" });
            return;
        }

        setIsChangingPassword(true);
        setMessage(null);

        try {
            const res = await fetch("/api/user/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ type: "success", text: "Contraseña cambiada con éxito" });
                setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } else {
                setMessage({ type: "error", text: data.error || "Error al cambiar la contraseña" });
            }
        } catch (error) {
            setMessage({ type: "error", text: "Error de conexión" });
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <div className="space-y-12 animate-fade-in">
            {/* Sección de Foto y Nombre Integrada */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start border-b border-slate-50 pb-12">
                <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-100 border-2 border-slate-100 transition-all duration-300 group-hover:border-[#063f68]/20 flex items-center justify-center">
                        {image ? (
                            <img src={image} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon size={48} className="text-slate-300" />
                        )}
                        {isUploading && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                <Loader2 size={24} className="text-[#063f68] animate-spin" />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-10 h-10 bg-[#063f68] text-white rounded-xl shadow-lg border-4 border-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                        disabled={isUploading}
                    >
                        <Camera size={18} />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        accept="image/*"
                    />
                </div>

                <div className="flex-1 text-center md:text-left pt-2">
                    <h3 className="text-2xl font-bold text-black tracking-tight mb-1">
                        {initialUser.apellido}, {initialUser.nombre}
                    </h3>
                    <p className="text-[14px] text-slate-500 font-medium mb-4">Matrícula {initialUser.expediente}</p>
                    <p className="text-[12px] text-slate-400 max-w-sm leading-relaxed">
                        Actualiza tu foto profesional para que sea visible en tu credencial digital y en la barra de navegación.
                    </p>
                </div>
            </div>
            {/* Sección de Firma del Matriculado */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start border-b border-slate-50 pb-12">
                <div className="relative group">
                    <div className="w-48 h-24 rounded-2xl overflow-hidden bg-slate-50 border-2 border-slate-100 transition-all duration-300 group-hover:border-[#063f68]/20 flex items-center justify-center p-4">
                        {signature ? (
                            <img src={signature} alt="Firma" className="max-w-full max-h-full object-contain" />
                        ) : (
                            <div className="text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sin Firma</p>
                            </div>
                        )}
                        {isUploadingSignature && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                <Loader2 size={24} className="text-[#063f68] animate-spin" />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => signatureInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-10 h-10 bg-[#063f68] text-white rounded-xl shadow-lg border-4 border-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                        disabled={isUploadingSignature}
                    >
                        <Camera size={18} />
                    </button>
                    <input
                        type="file"
                        ref={signatureInputRef}
                        onChange={handleSignatureUpload}
                        className="hidden"
                        accept="image/png"
                    />
                </div>

                <div className="flex-1 text-center md:text-left pt-2">
                    <h3 className="text-lg font-bold text-black tracking-tight mb-1">
                        Tu Firma Digital
                    </h3>
                    <p className="text-[12px] text-slate-500 font-medium mb-4">Sube tu firma en formato PNG</p>
                    <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                        Esta firma aparecerá en tu credencial digital. Se recomienda un archivo PNG con fondo transparente o blanco.
                    </p>
                </div>
            </div>

            {/* Cambio de Contraseña (Subido para optimizar espacio) */}
            <div className="space-y-8">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#063f68]/10 text-[#063f68] flex items-center justify-center">
                        <ShieldCheck size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-black tracking-tight">Cambiar Contraseña</h3>
                </div>

                <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contraseña Actual</label>
                        <input
                            type="password"
                            required
                            value={passwordData.currentPassword}
                            onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/10 transition-all outline-none text-sm text-black"
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                        <input
                            type="password"
                            required
                            value={passwordData.newPassword}
                            onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/10 transition-all outline-none text-sm text-black"
                            placeholder="Mínimo 8 caracteres"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirmar Nueva</label>
                        <input
                            type="password"
                            required
                            value={passwordData.confirmPassword}
                            onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white focus:border-[#063f68] focus:ring-1 focus:ring-[#063f68]/10 transition-all outline-none text-sm text-black"
                            placeholder="Repetir nueva..."
                        />
                    </div>

                    <div className="md:col-span-3 flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
                        <div className="flex-1 w-full">
                            {message && (
                                <div className={`p-3.5 rounded-2xl border flex items-center gap-3 text-sm animate-fade-in ${message.type === "success"
                                    ? "bg-green-50 border-green-100 text-green-700"
                                    : "bg-red-50 border-red-100 text-red-700"
                                    }`}>
                                    {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    {message.text}
                                </div>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={isChangingPassword}
                            className="w-full md:w-auto px-10 h-12 bg-[#063f68] text-white rounded-2xl font-bold text-sm hover:bg-[#0a4d7a] transition-all flex items-center justify-center gap-2"
                        >
                            {isChangingPassword ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Actualizando...
                                </>
                            ) : (
                                "Actualizar Contraseña"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
