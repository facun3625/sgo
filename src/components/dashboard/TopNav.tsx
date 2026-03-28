"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Mail,
    Sun,
    Moon,
    ChevronDown,
    User,
    LogOut,
    ArrowRight,
    Menu
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import NotificacionesBell from "@/components/dashboard/NotificacionesBell";
import MensajesIcon from "@/components/dashboard/MensajesIcon";

interface TopNavProps {
    user: {
        nombre: string;
        apellido: string;
        expediente: string;
        image: string | null;
        hasDebt: boolean;
    };
    onMenuClick?: () => void;
}

export default function TopNav({ user, onMenuClick }: TopNavProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme, resolvedTheme } = useTheme();
    const router = useRouter();
    const menuRef = useRef<HTMLDivElement>(null);

    // Evitar errores de hidratación
    useEffect(() => {
        setMounted(true);
    }, []);

    // Cerrar menú al hacer clic fuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }

        if (isProfileOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isProfileOpen]);

    if (!mounted) {
        return (
            <header className="h-16 bg-[#063f68] flex items-center justify-between px-8 sticky top-0 z-50">
                <div className="flex items-center gap-4 text-white/50 animate-pulse text-[12px] font-medium tracking-wide italic">
                    Cargando sistema...
                </div>
            </header>
        );
    }

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    return (
        <nav className="h-16 bg-[#063f68] text-white px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 border-0">
            {/* Hamburger - solo mobile */}
            <button
                onClick={onMenuClick}
                className="md:hidden p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200"
                aria-label="Abrir menú"
            >
                <Menu size={22} />
            </button>

            <div className="flex items-center gap-3 md:gap-4 ml-auto">
                {/* Status Badges */}
                <div className="hidden lg:flex items-center gap-3">
                    {/* Registration Status */}
                    <div className="h-8 flex items-center gap-2 px-3 bg-white/10 rounded-lg backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-extrabold text-white uppercase tracking-widest leading-none">Matrícula Activa</span>
                    </div>

                    {/* Debt Status */}
                    {user.hasDebt ? (
                        <Link
                            href="/dashboard/pagos"
                            className="h-8 flex items-center gap-2 px-3 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm hover:bg-red-500/30 transition-all group animate-pulse"
                        >
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                            <span className="text-[10px] font-extrabold text-white uppercase tracking-widest leading-none">Usted posee deuda</span>
                            <ArrowRight size={12} className="text-white/50 group-hover:text-white transition-colors" />
                        </Link>
                    ) : (
                        <div className="h-8 flex items-center gap-2 px-3 bg-white/10 rounded-lg backdrop-blur-sm">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                            <span className="text-[10px] font-extrabold text-white uppercase tracking-widest leading-none">No posee deudas</span>
                        </div>
                    )}
                </div>

                {/* Dark mode toggle */}
                <button
                    onClick={() => {
                        const newTheme = resolvedTheme === "dark" ? "light" : "dark";
                        console.log("🌓 Cambiando tema de:", resolvedTheme, "a:", newTheme);
                        setTheme(newTheme);
                    }}
                    className="p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200"
                    title="Modo oscuro/dia"
                >
                    {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Notifications */}
                <NotificacionesBell />

                {/* Messages */}
                <MensajesIcon />

                {/* Profile menu */}
                <div className="relative" ref={menuRef}>
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
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-2 shadow-xl animate-fade-in z-50">
                            <Link
                                href="/dashboard/perfil"
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                                onClick={() => setIsProfileOpen(false)}
                            >
                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-slate-400">
                                    <User size={16} />
                                </div>
                                Mi Perfil
                            </Link>
                            <div className="h-px bg-gray-50 dark:bg-slate-800 my-2 mx-1"></div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
                            >
                                <div className="w-8 h-8 rounded-lg bg-red-100/50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
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
