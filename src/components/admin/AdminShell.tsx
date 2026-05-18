"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Mail,
    GraduationCap,
    Newspaper,
    Library,
    CalendarDays,
    HelpCircle,
    FolderOpen,
    Menu,
    ChevronRight,
    Shield,
    Sun,
    Moon,
    ChevronDown,
    LogOut,
    Cpu,
    Send,
    PenLine,
    Scale,
    ClipboardList,
    Banknote,
    UserCheck,
    DatabaseZap,
    Settings2,
    UserCog,
    KeyRound,
    Landmark,
    ReceiptText,
    ShieldOff,
    BookUser,
    PlayCircle,
    HardDrive,
    ShieldCheck,
    Eye,
} from "lucide-react";
import { useTheme } from "next-themes";
import { SessionPayload } from "@/lib/auth";
import { tieneAccesoImportar } from "@/lib/admin-secciones";
import { PermisosProvider } from "@/lib/permisos-context";
import NotificacionesBell from "@/components/dashboard/NotificacionesBell";
import AdminMensajesIcon from "@/components/admin/AdminMensajesIcon";
import AdminSolicitudesIcon from "@/components/admin/AdminSolicitudesIcon";
import { ToastProvider } from "@/components/ui/Toast";

interface AdminShellProps {
    session: SessionPayload;
    image: string | null;
    permisos: string[] | null; // null = superadmin (all access)
    children: React.ReactNode;
}

const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, color: "text-slate-400" },
    { href: "/admin/solicitudes", label: "Gestión de Trámites", icon: ClipboardList, color: "text-amber-500" },
    { href: "/admin/usuarios", label: "Usuarios", icon: Users, color: "text-indigo-500" },
    { href: "/admin/legajo", label: "Legajo", icon: BookUser, color: "text-teal-500" },
    { href: "/admin/gestionar-admins", label: "Gestionar Admins", icon: UserCog, color: "text-violet-500" },
    { href: "/admin/cuentas", label: "Cuentas Registradas", icon: ShieldCheck, color: "text-violet-400" },
    { href: "/admin/cursos", label: "Cursos", icon: GraduationCap, color: "text-pink-500" },
    { href: "/admin/noticias", label: "Actividades Institucionales", icon: Newspaper, color: "text-amber-500" },
    { href: "/admin/biblioteca", label: "Biblioteca", icon: Library, color: "text-blue-500" },
    { href: "/admin/ventas", label: "Ventas", icon: Cpu, color: "text-violet-500" },
    { href: "/admin/calendario", label: "Calendario", icon: CalendarDays, color: "text-orange-500" },
    { href: "/admin/faq", label: "Preguntas Frecuentes", icon: HelpCircle, color: "text-slate-400" },
    { href: "/admin/mensajes", label: "Mensajes Privados", icon: Mail, color: "text-sky-500" },
    { href: "/admin/envios", label: "Envíos Masivos", icon: Send, color: "text-amber-500" },
    { href: "/admin/firmas", label: "Firmas de Autoridades", icon: PenLine, color: "text-indigo-500" },
    { href: "/admin/adhesiones", label: "Débito Automático", icon: Banknote, color: "text-emerald-500" },
    { href: "/admin/suspensiones", label: "Suspensiones", icon: ShieldOff, color: "text-rose-500" },
    { href: "/admin/cambios-datos", label: "Modificaciones de Datos", icon: UserCheck, color: "text-violet-500" },
    { href: "/admin/pagos", label: "Estado de Pagos", icon: ReceiptText, color: "text-emerald-500" },
    { href: "/admin/transferencias", label: "Transferencias", icon: Landmark, color: "text-slate-400" },
    { href: "/admin/importar", label: "Importar Datos", icon: DatabaseZap, color: "text-cyan-500" },
    { href: "/admin/boletas", label: "Boletas SF Servicios", icon: ReceiptText, color: "text-orange-500" },
    { href: "/admin/tribunal-etica", label: "Tribunal de Ética", icon: Scale, color: "text-rose-500" },
    { href: "/admin/tutoriales", label: "Tutoriales", icon: PlayCircle, color: "text-pink-400" },
    { href: "/admin/repositorio", label: "Repositorio de Archivos", icon: FolderOpen, color: "text-indigo-500" },
];

export default function AdminShell({ session, image, permisos, children }: AdminShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [configOpen, setConfigOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { resolvedTheme, setTheme } = useTheme();
    const profileRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        if (pathname.startsWith("/admin/config")) setConfigOpen(true);
    }, [pathname]);

    useEffect(() => {
        if (configOpen && navRef.current) {
            setTimeout(() => {
                navRef.current?.scrollTo({ top: navRef.current.scrollHeight, behavior: "smooth" });
            }, 50);
        }
    }, [configOpen]);

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

    // Filter navItems based on permisos
    // permisos === null means superadmin → show all
    // permisos = string[] means admin → show only items in permisos (plus dashboard always)
    const visibleNavItems = navItems.filter(item => {
        if (permisos === null) return true; // superadmin sees all
        if (item.href === "/admin") return true;
        const key = item.href.split("/")[2];
        if (!key) return true;
        if (key === "gestionar-admins") return false;
        if (key === "solicitudes") {
            return permisos.includes("solicitudes") || permisos.some(p => p.startsWith("solicitudes:"));
        }
        if (key === "importar") return tieneAccesoImportar(permisos);
        return permisos.includes(key);
    });

    const [rehabPendientes, setRehabPendientes] = useState(0);
    useEffect(() => {
        const load = () =>
            fetch("/api/admin/suspensiones?tipo=rehabilitaciones")
                .then(r => r.json())
                .then(d => setRehabPendientes((d.solicitudes ?? []).filter((s: any) => s.estado === "pendiente").length))
                .catch(() => {});
        load();
        const t = setInterval(load, 60000);
        return () => clearInterval(t);
    }, []);

    const isSuperAdmin = permisos === null;
    const roleLabel = isSuperAdmin ? "Superadmin" : "Admin";
    const roleLabelLong = isSuperAdmin ? "Superadministrador" : "Administrador";

    return (
        <ToastProvider>
        <PermisosProvider permisos={permisos}>
        <div className="flex min-h-screen bg-[#f8fafc] dark:bg-[#02182b] transition-colors duration-300">

            {/* Overlay mobile */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed md:sticky top-0 left-0 h-screen z-50 w-64 bg-white dark:bg-[#02182b] flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>

                {/* Logo */}
                <div className="px-5 h-16 flex items-center gap-3 bg-green-900">
                    <Image src="/sgo_nuevo.png" alt="SGO" width={36} height={36} className="object-contain" />
                    <div>
                        <p className="text-white font-bold text-[13px] leading-tight">Panel Admin</p>
                        <p className="text-white/40 text-[9px] uppercase tracking-widest">SGO · CPASF</p>
                    </div>
                </div>

                <nav ref={navRef} className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {visibleNavItems.map((item) => {
                        const active = isActive(item);
                        const showRehabBadge = item.href === "/admin/suspensiones" && rehabPendientes > 0;
                        return (
                            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium group
                                    ${active
                                        ? "bg-green-900 text-white dark:bg-white/15"
                                        : "text-slate-500 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-white"
                                    }`}>
                                <item.icon size={17} className={active ? "text-white" : `${item.color} group-hover:scale-110 transition-transform`} />
                                {item.label}
                                {showRehabBadge && (
                                    <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-amber-400 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                                        {rehabPendientes > 9 ? "9+" : rehabPendientes}
                                    </span>
                                )}
                                {active && !showRehabBadge && <ChevronRight size={13} className="ml-auto text-white/40" />}
                            </Link>
                        );
                    })}

                    {/* Ver como usuario — solo superadmin */}
                    {isSuperAdmin && (
                        <Link href="/admin/impersonar" onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium group
                                ${pathname.startsWith("/admin/impersonar")
                                    ? "bg-green-900 text-white dark:bg-white/15"
                                    : "text-slate-500 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-white"
                                }`}>
                            <Eye size={17} className={pathname.startsWith("/admin/impersonar") ? "text-white" : "text-amber-500 group-hover:scale-110 transition-transform"} />
                            Ver como usuario
                            {pathname.startsWith("/admin/impersonar") && <ChevronRight size={13} className="ml-auto text-white/40" />}
                        </Link>
                    )}

                    {/* Backup — solo superadmin */}
                    {isSuperAdmin && (
                        <Link href="/admin/backup" onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium group
                                ${pathname.startsWith("/admin/backup")
                                    ? "bg-green-900 text-white dark:bg-white/15"
                                    : "text-slate-500 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-white"
                                }`}>
                            <HardDrive size={17} className={pathname.startsWith("/admin/backup") ? "text-white" : "text-emerald-500 group-hover:scale-110 transition-transform"} />
                            Backups BD
                            {pathname.startsWith("/admin/backup") && <ChevronRight size={13} className="ml-auto text-white/40" />}
                        </Link>
                    )}

                    {/* Configuración — solo superadmin */}
                    {isSuperAdmin && (
                        <div>
                            <button
                                onClick={() => setConfigOpen((v) => !v)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium group
                                    ${pathname.startsWith("/admin/config")
                                        ? "bg-green-900/10 dark:bg-white/5 text-slate-700 dark:text-slate-200"
                                        : "text-slate-500 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-white"
                                    }`}
                            >
                                <Settings2 size={17} className={`text-slate-400 ${!pathname.startsWith("/admin/config") ? "group-hover:scale-110 transition-transform" : ""}`} />
                                Configuración
                                <ChevronDown size={13} className={`ml-auto text-slate-400 transition-transform duration-200 ${configOpen ? "rotate-180" : ""}`} />
                            </button>

                            {configOpen && (
                                <div className="mt-1 ml-4 space-y-0.5 border-l border-slate-100 dark:border-slate-800 pl-3">
                                    {[
                                        { href: "/admin/config/matricula", label: "Matrícula", icon: Settings2, color: "text-slate-400" },
                                        { href: "/admin/config/pagos", label: "Métodos de Pago", icon: KeyRound, color: "text-[#009ee3]" },
                                        { href: "/admin/config/jus", label: "Valor JUS", icon: Landmark, color: "text-amber-500" },
                                        { href: "/admin/config/smtp", label: "Correo SMTP", icon: Mail, color: "text-sky-500" },
                                    ].map((sub) => {
                                        const active = pathname.startsWith(sub.href);
                                        return (
                                            <Link key={sub.href} href={sub.href} onClick={() => setSidebarOpen(false)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-[13.5px] font-medium group
                                                    ${active
                                                        ? "bg-green-900 text-white dark:bg-white/15"
                                                        : "text-slate-500 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-white"
                                                    }`}>
                                                <sub.icon size={15} className={active ? "text-white" : `${sub.color} group-hover:scale-110 transition-transform`} />
                                                {sub.label}
                                                {active && <ChevronRight size={12} className="ml-auto text-white/40" />}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </nav>

                {/* User info bottom */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 rounded-xl bg-green-900/10 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                            {image ? (
                                <img src={image} alt="foto" className="w-full h-full object-cover" />
                            ) : (
                                <Shield size={15} className="text-green-800 dark:text-white/70" />
                            )}
                        </div>
                        <div>
                            <p className="text-slate-700 dark:text-slate-200 text-[12px] font-bold leading-tight">{session.nombre} {session.apellido[0]}.</p>
                            <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-wider">{roleLabel}</p>
                        </div>
                    </div>
                    <a href="https://kubbo.com.ar" target="_blank" rel="noopener noreferrer"
                        className="block mt-3 text-center text-[9px] text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500 transition-colors">
                        Desarrollado por <span style={{ color: "#3EDE7C" }}>kubbo</span>
                    </a>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* TopNav */}
                <nav className="h-16 bg-green-900 text-white px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">

                    {/* Hamburger mobile */}
                    <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-all">
                        <Menu size={22} />
                    </button>

                    {/* Badge admin */}
                    <div className="hidden md:flex items-center gap-2 h-8 px-3 bg-white/10 rounded-lg">
                        <Shield size={12} className="text-amber-400" />
                        <span className="text-[10px] font-extrabold text-white uppercase tracking-widest">{roleLabelLong}</span>
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
                        <NotificacionesBell />

                        {/* Trámites */}
                        <AdminSolicitudesIcon />

                        {/* Mensajes */}
                        <AdminMensajesIcon />

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
                                    <p className="text-[10px] text-white/50">{roleLabel}</p>
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
        </PermisosProvider>
        </ToastProvider>
    );
}
