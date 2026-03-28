"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    GraduationCap,
    Menu,
    ChevronRight,
    Shield,
    Sun,
    Moon,
    Bell,
    Mail,
    ChevronDown,
    LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { SessionPayload } from "@/lib/auth";

interface AdminShellProps {
    session: SessionPayload;
    image: string | null;
    children: React.ReactNode;
}

const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/admin/cursos", label: "Cursos", icon: GraduationCap },
];

export default function AdminShell({ session, image, children }: AdminShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { resolvedTheme, setTheme } = useTheme();
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false);
            }
        }
        if (profileOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [profileOpen]);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    const isActive = (item: typeof navItems[0]) =>
        item.exact ? pathname === item.href : pathname.startsWith(item.href);

    return (
        <div className="flex min-h-screen bg-[#f8fafc] dark:bg-[#02182b] transition-colors duration-300">

            {/* Overlay mobile */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed md:sticky top-0 left-0 h-screen z-50 w-64 bg-[#063f68] flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>

                <div className="px-5 h-16 flex items-center gap-3 border-b border-white/10">
                    <Image src="/sgo.png" alt="SGO" width={36} height={36} className="object-contain" />
                    <div>
                        <p className="text-white font-bold text-[13px] leading-tight">Panel Admin</p>
                        <p className="text-white/40 text-[9px] uppercase tracking-widest">SGO · CASF</p>
                    </div>
                </div>

                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => {
                        const active = isActive(item);
                        return (
                            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium group ${active ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
                                <item.icon size={17} className={active ? "text-white" : "text-white/50 group-hover:text-white"} />
                                {item.label}
                                {active && <ChevronRight size={13} className="ml-auto text-white/40" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 mb-3 px-1">
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                            {image ? (
                                <img src={image} alt="foto" className="w-full h-full object-cover" />
                            ) : (
                                <Shield size={15} className="text-white/70" />
                            )}
                        </div>
                        <div>
                            <p className="text-white text-[12px] font-bold leading-tight">{session.nombre} {session.apellido[0]}.</p>
                            <p className="text-white/40 text-[9px] uppercase tracking-wider">Superadmin</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* TopNav — igual al del usuario */}
                <nav className="h-16 bg-[#063f68] text-white px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">

                    {/* Hamburger mobile */}
                    <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-all">
                        <Menu size={22} />
                    </button>

                    {/* Badge admin - solo desktop */}
                    <div className="hidden md:flex items-center gap-2 h-8 px-3 bg-white/10 rounded-lg">
                        <Shield size={12} className="text-amber-400" />
                        <span className="text-[10px] font-extrabold text-white uppercase tracking-widest">Superadministrador</span>
                    </div>

                    {/* Acciones derecha */}
                    <div className="flex items-center gap-3 ml-auto">

                        {/* Dark mode */}
                        {mounted && (
                            <button
                                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                                className="p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-all"
                            >
                                {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                        )}

                        {/* Notificaciones */}
                        <button className="p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-all relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#063f68]"></span>
                        </button>

                        {/* Mensajes */}
                        <button className="p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-all relative">
                            <Mail size={20} />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-blue-400 rounded-full border-2 border-[#063f68]"></span>
                        </button>

                        {/* Perfil */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-white/10 transition-all group"
                            >
                                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-[12px] border border-white/20 overflow-hidden">
                                    {image ? (
                                        <img src={image} alt="foto" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{session.nombre[0]}{session.apellido[0]}</span>
                                    )}
                                </div>
                                <div className="text-left hidden sm:block">
                                    <p className="text-[13px] font-bold text-white leading-tight">{session.apellido}, {session.nombre}</p>
                                    <p className="text-[10px] text-white/50">Superadmin</p>
                                </div>
                                <ChevronDown size={14} className={`text-white/30 transition-transform duration-300 ${profileOpen ? "rotate-180" : ""}`} />
                            </button>

                            {profileOpen && (
                                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-2 shadow-xl z-50 animate-fade-in">
                                    <button onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                                        <div className="w-8 h-8 rounded-lg bg-red-100/50 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                                            <LogOut size={15} />
                                        </div>
                                        Cerrar sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </nav>

                <main className="flex-1 p-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
