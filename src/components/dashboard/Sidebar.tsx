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
    FolderOpen
} from "lucide-react";

interface SidebarItemProps {
    icon: React.ReactNode;
    label: string;
    href?: string;
    active?: boolean;
    children?: { label: string; href: string }[];
}

const SidebarItem = ({ icon, label, href, active, children }: SidebarItemProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = children && children.length > 0;

    if (hasChildren) {
        return (
            <div className="mb-0.5">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group
            ${isOpen ? "bg-gray-50 text-[#063f68]" : "text-gray-500 hover:bg-gray-50 hover:text-[#063f68]"}`}
                >
                    <div className="flex items-center gap-2.5">
                        <span className={`transition-all duration-200 ${isOpen ? "text-[#063f68] scale-110" : "group-hover:text-[#063f68] group-hover:scale-110"}`}>
                            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 18 }) : icon}
                        </span>
                        <span className="text-[13px] font-semibold tracking-tight">{label}</span>
                    </div>
                    {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400 group-hover:text-[#063f68]" />}
                </button>
                <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden">
                        <div className="ml-5 border-l border-gray-100 pl-4 space-y-0.5">
                            {children.map((child, index) => (
                                <Link
                                    key={index}
                                    href={child.href}
                                    className="block py-1.5 text-[12px] font-medium text-gray-400 hover:text-[#063f68] transition-all duration-200 hover:translate-x-1"
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
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-200 group
        ${active
                    ? "bg-[#063f68] text-white shadow-lg shadow-[#063f68]/20"
                    : "text-gray-500 hover:bg-gray-50 hover:text-[#063f68] hover:shadow-sm"}`}
        >
            <span className={`transition-all duration-200 ${active ? "text-white scale-110" : "group-hover:text-[#063f68] group-hover:scale-110"}`}>
                {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 18 }) : icon}
            </span>
            <span className={`text-[13px] font-semibold tracking-tight ${active ? "text-white" : ""}`}>{label}</span>
        </Link>
    );
};

export default function Sidebar() {
    const pathname = usePathname();

    const menuItems = [
        { icon: <CreditCard size={20} />, label: "Tarjeta de beneficios", href: "/dashboard/beneficios" },
        { icon: <IdCard size={20} />, label: "Credencia digital", href: "/dashboard/credencial" },
        { icon: <User size={20} />, label: "Mis datos", href: "/dashboard/mis-datos" },
        { icon: <Wallet size={20} />, label: "Estado de matricula y Pagos", href: "/dashboard/pagos" },
        {
            icon: <FileText size={20} />,
            label: "Solicitudes",
            children: [
                { label: "Certificado de matriculacion", href: "/dashboard/solicitudes/certificado" },
                { label: "Clave Sistema SISFE", href: "/dashboard/solicitudes/sisfe" },
                { label: "Usuario CATASTRO/SIGIT", href: "/dashboard/solicitudes/catastro" },
                { label: "Jurisprudencia", href: "/dashboard/solicitudes/jurisprudencia" },
            ]
        },
        { icon: <XOctagon size={20} />, label: "Solicitud de suspensión/cancelación", href: "/dashboard/suspension" },
        { icon: <Banknote size={20} />, label: "Adehesion a debito automatico", href: "/dashboard/debito" },
        { icon: <GraduationCap size={20} />, label: "Cursos", href: "/dashboard/cursos" },
        { icon: <Calendar size={20} />, label: "Calendario", href: "/dashboard/calendario" },
        { icon: <HelpCircle size={20} />, label: "Preguntas Frecuentes", href: "/dashboard/faq" },
        { icon: <FolderOpen size={20} />, label: "Repositorio de Archivos", href: "/dashboard/archivos" },
    ];

    return (
        <aside className="w-72 bg-white flex flex-col h-screen sticky top-0 overflow-y-auto">
            <div className="px-6 py-5 bg-[#063f68] flex items-center h-16 shadow-sm">
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
                        />
                    ))}
                </nav>
            </div>

            <div className="mt-auto p-6 border-t border-gray-50">
                <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#063f68]/10 text-[#063f68] flex items-center justify-center font-bold">
                        JU
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-gray-800 truncate">Juan Mario Q.</p>
                        <p className="text-[11px] text-gray-400">Matrícula 564</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
