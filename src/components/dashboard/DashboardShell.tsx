"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import Link from "next/link";
import { X, Newspaper, ArrowRight, Eye, LogOut } from "lucide-react";
import { ToastProvider } from "@/components/ui/Toast";
import ChatBot from "./ChatBot";
import { useRouter } from "next/navigation";
import { htmlPreview } from "@/lib/html";

interface Noticia {
    id: number;
    titulo: string;
    contenido: string;
    imagen: string | null;
}

interface DashboardShellProps {
    user: {
        nombre: string;
        apellido: string;
        expediente: string;
        image: string | null;
        hasDebt: boolean;
        status: string;
        isSuspended: boolean;
        needsCuil?: boolean;
        impersonando?: boolean;
        impersonadoPor?: string;
    };
    children: React.ReactNode;
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [popup, setPopup] = useState<Noticia | null>(null);
    const [saliendo, setSaliendo] = useState(false);
    const router = useRouter();

    async function salirImpersonacion() {
        setSaliendo(true);
        await fetch("/api/admin/impersonar/salir", { method: "POST" });
        router.push("/admin/impersonar");
    }

    useEffect(() => {
        const seen = sessionStorage.getItem("noticia_popup_seen");
        if (seen || user.needsCuil) return;

        fetch("/api/user/noticias")
            .then(r => r.json())
            .then((data: Noticia[] & { destacada?: boolean }[]) => {
                if (!Array.isArray(data)) return;
                const destacada = (data as any[]).find((n: any) => n.destacada);
                if (destacada) setPopup(destacada);
            })
            .catch(() => {});
    }, []);

    function closePopup() {
        sessionStorage.setItem("noticia_popup_seen", "1");
        setPopup(null);
    }

    return (
        <ToastProvider>
        <div className="flex min-h-screen bg-white dark:bg-[#02182b] transition-colors duration-300">
            {/* Overlay mobile */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <div className={`fixed md:sticky top-0 left-0 h-screen z-50 transition-transform duration-300 ease-in-out md:transform-none md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
            </div>

            <div className="flex-1 flex flex-col min-w-0">
                {/* Banner impersonación */}
                {user.impersonando && (
                    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-400 text-amber-950">
                        <div className="flex items-center gap-2 text-[14px] font-bold">
                            <Eye size={16} />
                            Estás viendo como <span className="uppercase">{user.apellido}, {user.nombre}</span>
                            <span className="font-normal opacity-70">(exp. {user.expediente})</span>
                            {user.impersonadoPor && <span className="font-normal opacity-60 hidden sm:inline">— Admin: {user.impersonadoPor}</span>}
                        </div>
                        <button onClick={salirImpersonacion} disabled={saliendo}
                            className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/15 hover:bg-amber-950/25 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap">
                            <LogOut size={13} />
                            {saliendo ? "Saliendo..." : "Volver al superadmin"}
                        </button>
                    </div>
                )}
                <TopNav user={user} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                <main className="p-0 animate-fade-in">
                    {children}
                </main>
            </div>

            <ChatBot />

            {/* Popup noticia destacada */}
            {popup && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closePopup} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                        {/* Imagen */}
                        {popup.imagen ? (
                            <div className="h-48 bg-slate-100 dark:bg-slate-800">
                                <img src={popup.imagen} alt={popup.titulo} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="h-32 bg-[#063f68] flex items-center justify-center">
                                <Newspaper size={40} className="text-white/40" />
                            </div>
                        )}

                        {/* Cerrar */}
                        <button onClick={closePopup}
                            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full transition-all">
                            <X size={15} />
                        </button>

                        {/* Contenido */}
                        <div className="p-6 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[11px] font-bold rounded-full uppercase tracking-wider">
                                    Novedad
                                </span>
                            </div>
                            <h2 className="text-[18px] font-bold text-slate-800 dark:text-white leading-snug">{popup.titulo}</h2>
                            <p className="text-[14px] text-slate-700 dark:text-slate-400 leading-relaxed line-clamp-3"
                                dangerouslySetInnerHTML={{ __html: htmlPreview(popup.contenido) }} />

                            <div className="flex items-center gap-3 pt-2">
                                <button onClick={closePopup}
                                    className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[14px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                    Cerrar
                                </button>
                                <Link href={`/dashboard/noticias/${popup.id}`} onClick={closePopup}
                                    className="flex-1 h-11 rounded-xl bg-[#063f68] text-white text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-[#0a4d7a] transition-all">
                                    Ver noticia <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </ToastProvider>
    );
}
