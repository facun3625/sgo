"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    CreditCard, IdCard, User, Wallet, FileText, ChevronDown, ChevronRight,
    XOctagon, Banknote, GraduationCap, Calendar, HelpCircle, FolderOpen,
    Home, CheckCircle2, Clock, Newspaper, Library, Cpu, Mail, Megaphone,
} from "lucide-react";

interface SidebarProps {
    user: { nombre: string; apellido: string; expediente: string; image: string | null; };
    onClose?: () => void;
}

interface NavItem {
    icon: React.ReactNode;
    label: string;
    href?: string;
    color?: string;
    children?: { label: string; href: string }[];
}

interface NavGroup {
    label?: string;
    items: NavItem[];
}

const SidebarLink = ({ icon, label, href, active, color, onClose, badge }: {
    icon: React.ReactNode; label: string; href: string;
    active: boolean; color?: string; onClose?: () => void; badge?: React.ReactNode;
}) => (
    <Link href={href} onClick={onClose}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 transition-all duration-200 group
            ${active ? "bg-[#063f68] text-white" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-[#063f68] dark:hover:text-blue-400"}`}>
        <span className={`transition-all duration-200 flex-shrink-0 ${active ? "text-white scale-110" : `group-hover:scale-110 ${color || "text-gray-400"}`}`}>
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 17 }) : icon}
        </span>
        <span className={`text-[12.5px] leading-tight ${active ? "font-semibold text-white" : "font-normal"}`}>{label}</span>
        {badge && <span className="ml-auto">{badge}</span>}
    </Link>
);

const SidebarSubmenu = ({ icon, label, color, children, onClose }: {
    icon: React.ReactNode; label: string; color?: string;
    children: { label: string; href: string }[]; onClose?: () => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const anyActive = children.some(c => pathname === c.href);

    return (
        <div className="mb-0.5">
            <button onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group
                    ${isOpen || anyActive ? "bg-gray-50 dark:bg-slate-800/50 text-[#063f68] dark:text-blue-400" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-[#063f68] dark:hover:text-blue-400"}`}>
                <div className="flex items-center gap-2.5">
                    <span className={`flex-shrink-0 transition-all duration-200 ${isOpen || anyActive ? "text-[#063f68]" : `group-hover:scale-110 ${color || "text-gray-400"}`}`}>
                        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 17 }) : icon}
                    </span>
                    <span className="text-[12.5px] font-normal">{label}</span>
                </div>
                {isOpen ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400 group-hover:text-[#063f68]" />}
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100 mt-0.5" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                    <div className="ml-5 border-l border-slate-200 dark:border-slate-800 pl-3.5">
                        {children.map((child, i) => (
                            <Link key={i} href={child.href} onClick={onClose}
                                className={`block py-1.5 text-[12px] font-normal transition-all duration-200 hover:translate-x-1
                                    ${pathname === child.href ? "text-[#063f68] dark:text-blue-400 font-semibold" : "text-gray-400 dark:text-slate-500 hover:text-[#063f68] dark:hover:text-blue-400"}`}>
                                {child.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SectionLabel = ({ label }: { label: string }) => (
    <div className="px-3 pt-4 pb-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">{label}</p>
    </div>
);

export default function Sidebar({ user, onClose }: SidebarProps) {
    const pathname = usePathname();

    const groups: NavGroup[] = [
        {
            items: [
                { icon: <Home />, label: "Inicio", href: "/dashboard", color: "text-slate-400" },
            ],
        },
        {
            label: "MI MATRÍCULA",
            items: [
                { icon: <User />, label: "Mis datos", href: "/dashboard/mis-datos", color: "text-indigo-500" },
                { icon: <IdCard />, label: "Credencial digital", href: "/dashboard/credencial", color: "text-amber-500" },
                { icon: <CreditCard />, label: "Tarjeta de beneficios", href: "/dashboard/beneficios", color: "text-blue-500" },
                { icon: <Wallet />, label: "Estado de matrícula y Pagos", href: "/dashboard/pagos", color: "text-emerald-500" },
            ],
        },
        {
            label: "TRÁMITES",
            items: [
                { icon: <Clock />, label: "Solicitudes enviadas", href: "/dashboard/solicitudes/enviadas", color: "text-orange-500" },
                {
                    icon: <FileText />, label: "Trámites", color: "text-blue-600",
                    children: [
                        { label: "Certificado de matriculación", href: "/dashboard/solicitudes/certificado" },
                        { label: "Clave Sistema SISFE", href: "/dashboard/solicitudes/sisfe" },
                        { label: "Usuario CATASTRO/SIGIT", href: "/dashboard/solicitudes/catastro" },
                        { label: "Jurisprudencia", href: "/dashboard/solicitudes/jurisprudencia" },
                    ],
                },
                { icon: <XOctagon />, label: "Solicitud de suspensión/cancelación", href: "/dashboard/suspension", color: "text-rose-500" },
                { icon: <Banknote />, label: "Adhesión a débito automático", href: "/dashboard/solicitudes/adhesion-debito", color: "text-cyan-500" },
            ],
        },
        {
            label: "INSTITUCIÓN",
            items: [
                { icon: <GraduationCap />, label: "Cursos", href: "/dashboard/cursos", color: "text-pink-500" },
                { icon: <Newspaper />, label: "Actividades Institucionales", href: "/dashboard/noticias", color: "text-amber-500" },
                { icon: <Calendar />, label: "Calendario", href: "/dashboard/calendario", color: "text-orange-500" },
                { icon: <Cpu />, label: "Tokens", href: "/dashboard/tokens", color: "text-violet-500" },
                { icon: <Library />, label: "Biblioteca", href: "/dashboard/biblioteca", color: "text-[#063f68] dark:text-blue-400" },
                { icon: <FolderOpen />, label: "Repositorio de Archivos", href: "/dashboard/archivos", color: "text-indigo-500" },
                { icon: <HelpCircle />, label: "Preguntas Frecuentes", href: "/dashboard/faq", color: "text-slate-400" },
                { icon: <Mail />, label: "Mensajes Privados", href: "/dashboard/mensajes", color: "text-sky-500" },
                { icon: <Megaphone />, label: "Comunicados", href: "/dashboard/comunicados", color: "text-amber-500" },
            ],
        },
    ];

    return (
        <aside className="w-72 bg-white dark:bg-[#02182b] flex flex-col h-screen sticky top-0 overflow-y-auto border-0">
            <div className="px-6 py-5 bg-[#063f68] flex items-center h-16 border-0">
                <div className="flex items-center gap-3">
                    <Image src="/sgo.png" alt="SGO CASF" width={48} height={48} className="object-contain" />
                    <div>
                        <h1 className="text-white font-bold text-[14px] leading-tight tracking-tight uppercase">SGO - CASF</h1>
                        <p className="text-white/50 text-[8px] font-medium tracking-wider uppercase">Sistema de Gestión</p>
                    </div>
                </div>
            </div>

            <div className="px-3 py-3 overflow-y-auto flex-1">
                {groups.map((group, gi) => (
                    <div key={gi}>
                        {group.label && <SectionLabel label={group.label} />}
                        {group.items.map((item, ii) =>
                            item.children ? (
                                <SidebarSubmenu
                                    key={ii}
                                    icon={item.icon}
                                    label={item.label}
                                    color={item.color}
                                    children={item.children}
                                    onClose={onClose}
                                />
                            ) : (
                                <SidebarLink
                                    key={ii}
                                    icon={item.icon}
                                    label={item.label}
                                    href={item.href!}
                                    active={pathname === item.href}
                                    color={item.color}
                                    onClose={onClose}
                                    badge={
                        item.label === "Adhesión a débito automático" ? <AdhesionBadge /> :
                        item.label === "Comunicados" ? <ComunicadosBadge /> :
                        undefined
                    }
                                />
                            )
                        )}
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <Link href="/dashboard/perfil" onClick={onClose}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-300 group">
                    <div className="w-10 h-10 rounded-xl bg-[#063f68]/5 dark:bg-blue-400/10 text-[#063f68] dark:text-blue-400 flex items-center justify-center font-bold text-sm overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                        {user.image ? (
                            <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="opacity-80 font-bold">{user.nombre[0]}{user.apellido[0]}</span>
                        )}
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#02182b]"></div>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-[#063f68] dark:group-hover:text-blue-400 transition-colors">
                            {user.nombre} {user.apellido[0]}.
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Matrícula {user.expediente}</p>
                    </div>
                </Link>
                <a href="https://kubbo.com.ar" target="_blank" rel="noopener noreferrer"
                    className="block mt-3 text-center text-[9px] text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500 transition-colors">
                    Desarrollado por <span style={{ color: "#3EDE7C" }}>kubbo</span>
                </a>
            </div>
        </aside>
    );
}

function ComunicadosBadge() {
    const [count, setCount] = React.useState(0);
    const refresh = React.useCallback(() => {
        fetch("/api/user/comunicados/unread").then(r => r.json()).then(data => setCount(data.count ?? 0)).catch(() => {});
    }, []);
    React.useEffect(() => {
        refresh();
        const t = setInterval(refresh, 30000);

        // Cross-tab: admin envió masivo
        let bc: BroadcastChannel | null = null;
        try {
            bc = new BroadcastChannel("sgo-updates");
            bc.onmessage = (e) => { if (e.data?.type === "new-comunicado") refresh(); };
        } catch {}

        // Mismo tab: usuario leyó un comunicado
        window.addEventListener("comunicado-leido", refresh);

        return () => {
            clearInterval(t);
            bc?.close();
            window.removeEventListener("comunicado-leido", refresh);
        };
    }, [refresh]);
    if (count === 0) return null;
    return (
        <span className="min-w-[18px] h-[18px] px-1 bg-amber-400 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
            {count > 9 ? "9+" : count}
        </span>
    );
}

function AdhesionBadge() {
    const [status, setStatus] = React.useState<{ pending: boolean; approved: boolean }>({ pending: false, approved: false });
    React.useEffect(() => {
        fetch("/api/user/pagos").then(r => r.json()).then(data => {
            setStatus({ pending: data.hasDebitoEnTramite, approved: data.hasDebitoAutomatico });
        }).catch(() => {});
    }, []);
    if (status.pending) return (
        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-tighter rounded-md border border-amber-500/20 animate-pulse">Pendiente</span>
    );
    if (status.approved) return <CheckCircle2 size={12} className="text-emerald-500" />;
    return null;
}
