"use client";

import React, { useState } from "react";
import {
    Bell,
    Mail,
    Sun,
    Moon,
    ChevronDown,
    User, // Keep User as is, or change to UserIcon if intended to be renamed
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
        image: string | null;
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
        <nav className="h-16 bg-[#063f68] text-white px-8 flex items-center justify-end sticky top-0 z-40">
            <div className="flex items-center gap-4">
                {/* Status Badges */}
                <div className="hidden lg:flex items-center gap-3">
                    {/* Registration Status */}
                    <div className="h-8 flex items-center gap-2 px-3 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-extrabold text-white uppercase tracking-widest leading-none">Matrícula Activa</span>
                    </div>

                    {/* Debt Status */}
                    <div className="h-8 flex items-center gap-2 px-3 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                        <span className="text-[10px] font-extrabold text-white uppercase tracking-widest leading-none">No posee deudas</span>
                    </div>
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

                {/* Profile menu */}
                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-white/10 transition-all duration-300 group"
                    >
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-[12px] border border-white/20 relative overflow-hidden shadow-inner">
                            {user.image ? (
                                <img src={user.image} alt="Profile" className="w-full h-full object-cover animate-fade-in" />
                            ) : (
                                <>
                                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#063f68] z-10"></div>
                                    <span className="opacity-90">{user.nombre[0]}{user.apellido[0]}</span>
                                </>
                            )}
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-[13px] font-bold text-white leading-tight tracking-tight group-hover:text-white/90 transition-colors">
                                {user.apellido}, {user.nombre}
                            </p>
                            <p className="text-[10px] text-white/50 font-medium">Mat. {user.expediente}</p>
                        </div>
                        <ChevronDown size={14} className={`text-white/30 transition-transform duration-300 ${isProfileOpen ? "rotate-180" : "group-hover:translate-y-0.5"}`} />
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-gray-100 p-2 animate-fade-in z-50">
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
