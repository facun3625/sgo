"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    CreditCard,
    IdCard,
    User,
    Wallet,
    FileText,
    ChevronDown,
    ChevronRight,
    XOctagon,
    Banknote,
    GraduationCap,
    Calendar,
    HelpCircle,
    FolderOpen,
    Home,
    CheckCircle2,
    Clock,
    Lock
} from "lucide-react";

interface SidebarProps {
    user: {
        nombre: string;
        apellido: string;
        expediente: string;
        image: string | null;
    };
    onClose?: () => void;
}

interface SidebarItemProps {
    icon: React.ReactNode;
    label: string;
    href?: string;
    active?: boolean;
    children?: { label: string; href: string }[];
    color?: string;
    onClose?: () => void;
}

const SidebarItem = ({ icon, label, href, active, children, color, onClose }: SidebarItemProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = children && children.length > 0;

    if (hasChildren) {
        return (
            <div className="mb-0.5">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group
            ${isOpen ? "bg-gray-50 dark:bg-slate-800/50 text-[#063f68] dark:text-blue-400" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-[#063f68] dark:hover:text-blue-400"}`}
                >
                    <div className="flex items-center gap-2.5">
                        <span className={`transition-all duration-200 ${isOpen ? "text-[#063f68] scale-110" : `group-hover:scale-110 ${color || "text-gray-400"}`}`}>
                            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 18 }) : icon}
                        </span>
                        <span className="text-[13px] font-normal tracking-tight">{label}</span>
                    </div>
                    {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400 group-hover:text-[#063f68]" />}
                </button>
                <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden">
                        <div className="ml-5 border-l border-slate-200 dark:border-slate-800 pl-4 space-y-0.5">
                            {children.map((child, index) => (
                                <Link
                                    key={index}
                                    href={child.href}
                                    onClick={onClose}
                                    className="block py-1.5 text-[12px] font-normal text-gray-400 dark:text-slate-500 hover:text-[#063f68] dark:hover:text-blue-400 transition-all duration-200 hover:translate-x-1"
                                >
                                    {child.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Link
            href={href || "#"}
            onClick={onClose}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-200 group
        ${active
                    ? "bg-[#063f68] text-white"
                    : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-[#063f68] dark:hover:text-blue-400"}`}
        >
            <span className={`transition-all duration-200 ${active ? "text-white scale-110" : `group-hover:scale-110 ${color || "text-gray-400"}`}`}>
                {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 18 }) : icon}
            </span>
            <span className={`text-[13px] ${active ? "font-semibold text-white" : "font-normal"}`}>{label}</span>
            {label === "Adehesion a debito automatico" && <AdhesionBadge />}
        </Link>
    );
};

export default function Sidebar({ user, onClose }: SidebarProps) {
    const pathname = usePathname();

    const menuItems = [
        { icon: <Home size={20} />, label: "Inicio", href: "/dashboard", color: "text-slate-400" },
        { icon: <Clock size={20} />, label: "Solicitudes enviadas", href: "/dashboard/solicitudes/enviadas", color: "text-orange-500" },
        { icon: <CreditCard size={20} />, label: "Tarjeta de beneficios", href: "/dashboard/beneficios", color: "text-blue-500" },
        { icon: <IdCard size={20} />, label: "Credencia digital", href: "/dashboard/credencial", color: "text-amber-500" },
        { icon: <User size={20} />, label: "Mis datos", href: "/dashboard/mis-datos", color: "text-indigo-500" },
        { icon: <Wallet size={20} />, label: "Estado de matricula y Pagos", href: "/dashboard/pagos", color: "text-emerald-500" },
        {
            icon: <FileText size={20} />,
            label: "Trámites",
            color: "text-blue-600",
            children: [
                { label: "Certificado de matriculacion", href: "/dashboard/solicitudes/certificado" },
                { label: "Clave Sistema SISFE", href: "/dashboard/solicitudes/sisfe" },
                { label: "Usuario CATASTRO/SIGIT", href: "/dashboard/solicitudes/catastro" },
                { label: "Jurisprudencia", href: "/dashboard/solicitudes/jurisprudencia" },
            ]
        },
        { icon: <XOctagon size={20} />, label: "Solicitud de suspensión/cancelación", href: "/dashboard/suspension", color: "text-rose-500" },
        { icon: <Banknote size={20} />, label: "Adehesion a debito automatico", href: "/dashboard/solicitudes/adhesion-debito", color: "text-cyan-500" },
        { icon: <GraduationCap size={20} />, label: "Cursos", href: "/dashboard/cursos", color: "text-pink-500" },
        { icon: <Calendar size={20} />, label: "Calendario", href: "/dashboard/calendario", color: "text-orange-500" },
        { icon: <HelpCircle size={20} />, label: "Preguntas Frecuentes", href: "/dashboard/faq", color: "text-slate-400" },
        { icon: <FolderOpen size={20} />, label: "Repositorio de Archivos", href: "/dashboard/archivos", color: "text-[#063f68] dark:text-blue-400" },
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

            <div className="p-4 overflow-y-auto flex-1">
                <nav className="space-y-1">
                    {menuItems.map((item, index) => (
                        <SidebarItem
                            key={index}
                            icon={item.icon}
                            label={item.label}
                            href={item.href}
                            active={pathname === item.href}
                            children={item.children}
                            color={item.color}
                            onClose={onClose}
                        />
                    ))}
                </nav>
            </div>

            <div className="mt-auto p-5 border-t border-slate-100 dark:border-slate-800">
                <Link
                    href="/dashboard/perfil"
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-300 group"
                >
                    <div className="w-10 h-10 rounded-xl bg-[#063f68]/5 dark:bg-blue-400/10 text-[#063f68] dark:text-blue-400 flex items-center justify-center font-bold text-sm overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                        {user.image ? (
                            <img src={user.image} alt="Profile" className="w-full h-full object-cover animate-fade-in" />
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
            </div>
        </aside>
    );
}

function AdhesionBadge() {
    const [status, setStatus] = React.useState<{ pending: boolean; approved: boolean }>({ pending: false, approved: false });

    React.useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch("/api/user/pagos");
                const data = await res.json();
                setStatus({
                    pending: data.hasDebitoEnTramite,
                    approved: data.hasDebitoAutomatico
                });
            } catch (error) {
                console.error("Error fetching adhesion status:", error);
            }
        };
        fetchStatus();
    }, []);

    if (status.pending) {
        return (
            <span className="ml-auto px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-tighter rounded-md border border-amber-500/20 animate-pulse">
                Pendiente
            </span>
        );
    }

    if (status.approved) {
        return (
            <CheckCircle2 size={12} className="ml-auto text-emerald-500" />
        );
    }

    return null;
}
