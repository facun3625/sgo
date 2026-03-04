"use client";

import React, { useState } from "react";
import {
    Bell,
    Mail,
    Sun,
    Moon,
    ChevronDown,
    User,
    LogOut,
    Settings
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TopNavProps {
    user: {
        nombre: string;
        apellido: string;
        expediente: string;
    };
}

export default function TopNav({ user }: TopNavProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    return (
        <nav className="h-16 bg-[#063f68] text-white px-8 flex items-center justify-end sticky top-0 z-40 shadow-md">
            <div className="flex items-center gap-4">
                {/* Status Badge */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/20">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Matrícula Activa</span>
                </div>

                {/* Dark mode toggle */}
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200"
                    title="Modo oscuro/dia"
                >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Notifications */}
                <button className="p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200 relative">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#063f68]"></span>
                </button>

                {/* Messages */}
                <button className="p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200 relative">
                    <Mail size={20} />
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-blue-400 rounded-full border-2 border-[#063f68]"></span>
                </button>

                <div className="w-px h-6 bg-white/10 mx-2"></div>

                {/* Profile menu */}
                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 p-1 rounded-xl hover:bg-white/10 transition-all duration-200"
                    >
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold text-sm border border-white/20">
                            {user.nombre[0]}{user.apellido[0]}
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-xs font-semibold text-white leading-tight">
                                {user.apellido}, {user.nombre}
                            </p>
                            <p className="text-[10px] text-white/60">Mat. {user.expediente}</p>
                        </div>
                        <ChevronDown size={14} className={`text-white/40 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 animate-fade-in z-50">
                            <Link
                                href="/dashboard/perfil"
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-200"
                                onClick={() => setIsProfileOpen(false)}
                            >
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                    <User size={16} />
                                </div>
                                Mi Perfil
                            </Link>
                            <Link
                                href="/dashboard/configuracion"
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-200"
                                onClick={() => setIsProfileOpen(false)}
                            >
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                    <Settings size={16} />
                                </div>
                                Configuración
                            </Link>
                            <div className="h-px bg-gray-50 my-2 mx-1"></div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                            >
                                <div className="w-8 h-8 rounded-lg bg-red-100/50 flex items-center justify-center text-red-600">
                                    <LogOut size={16} />
                                </div>
                                Cerrar sesión
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
