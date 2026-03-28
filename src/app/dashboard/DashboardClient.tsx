"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    CreditCard,
    ArrowRight,
    ChevronRight,
    IdCard,
    Home,
    Wallet,
    Clock,
    User,
    GraduationCap,
    Calendar,
    FileText,
    Lock as LockIcon,
    Search,
    Gavel,
    AlertCircle,
    CheckCircle2,
    Loader2,
    TrendingUp,
    ExternalLink,
    Newspaper,
    ChevronLeft,
    Star
} from "lucide-react";
import Link from "next/link";

interface SessionPayload {
    id: number;
    expediente: string;
    nombre: string;
    apellido: string;
    accessLevel: string;
}

interface Noticia {
    id: number;
    titulo: string;
    contenido: string;
    imagen: string | null;
    destacada: boolean;
    createdAt: string;
}

export default function DashboardClient({ session }: { session: SessionPayload }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [noticias, setNoticias] = useState<Noticia[]>([]);
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [data, setData] = useState<{
        totalDeuda: number;
        solicitudesContador: number;
        cursosDisponibles: number;
        proximoEvento: any | null;
        hasDebitoAutomatico: boolean;
        hasPagoAnual: boolean;
        recentSolicitudes: any[];
    }>({
        totalDeuda: 0,
        solicitudesContador: 0,
        cursosDisponibles: 0,
        proximoEvento: null,
        hasDebitoAutomatico: false,
        hasPagoAnual: false,
        recentSolicitudes: []
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const NC = { cache: "no-store" } as const;
                const [pagosRes, solicitudesRes, cursosRes, eventosRes, noticiasRes] = await Promise.all([
                    fetch("/api/user/pagos", NC),
                    fetch("/api/user/solicitudes", NC),
                    fetch("/api/user/cursos", NC),
                    fetch("/api/user/eventos", NC),
                    fetch("/api/user/noticias", NC),
                ]);

                const [pagos, solicitudes, cursos, eventos, noticiasData] = await Promise.all([
                    pagosRes.ok ? pagosRes.json() : { totalDeuda: 0, hasDebitoAutomatico: false, hasPagoAnualActivo: false },
                    solicitudesRes.ok ? solicitudesRes.json() : [],
                    cursosRes.ok ? cursosRes.json() : [],
                    eventosRes.ok ? eventosRes.json() : [],
                    noticiasRes.ok ? noticiasRes.json() : [],
                ]);

                if (Array.isArray(noticiasData)) setNoticias(noticiasData.slice(0, 6));

                // Solicitudes pendientes o en trámite (filtro rápido)
                const solicitudesPendientes = Array.isArray(solicitudes)
                    ? solicitudes.filter((s: any) => s.estado === "pendiente").length
                    : 0;

                // Cursos que el usuario aún no hizo o están disponibles
                const cursosHabilitados = Array.isArray(cursos)
                    ? cursos.filter((c: any) => !c.isEnrolled && !c.isFull).length
                    : 0;

                // Evento más próximo
                const proximo = Array.isArray(eventos) && eventos.length > 0 ? eventos[0] : null;

                setData({
                    totalDeuda: pagos.totalDeuda || 0,
                    solicitudesContador: solicitudesPendientes,
                    cursosDisponibles: cursosHabilitados,
                    proximoEvento: proximo,
                    hasDebitoAutomatico: pagos.hasDebitoAutomatico,
                    hasPagoAnual: pagos.hasPagoAnualActivo,
                    recentSolicitudes: Array.isArray(solicitudes) ? solicitudes.slice(0, 5) : []
                });
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getStatusColor = (estado: string) => {
        switch (estado.toLowerCase()) {
            case "aprobado": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
            case "rechazado": return "text-rose-500 bg-rose-500/10 border-rose-500/20";
            case "pendiente": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
            default: return "text-slate-500 bg-slate-500/10 border-slate-500/20";
        }
    };

    return (
        <div className="bg-white dark:bg-[#02182b] p-0 pb-12 transition-colors duration-300">
            <div className="w-full pt-0">

                {/* SECCIÓN INICIO */}
                <div className="bg-white dark:bg-[#02182b]">

                    {/* Header Compacto Unificado Sticky */}
                    <div className="sticky top-16 z-20 bg-white/80 dark:bg-[#02182b]/80 backdrop-blur-md flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 flex items-center justify-center">
                                <Home size={20} className="text-slate-400" />
                            </div>
                            <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Inicio</h2>
                        </div>
                    </div>

                    <div className="p-6 md:p-10 animate-fade-in">


                        {/* BENTO GRID DE WIDGETS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                            {/* FILA 1: ESTADO FINANCIERO Y ACCESOS RÁPIDOS */}
                            {/* WIDGET TOTAL DEUDA */}
                            <div className="lg:col-span-2 group p-8 rounded-[36px] bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 dark:hover:border-emerald-500/20 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/5 flex flex-col justify-between h-56 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 group-hover:rotate-12">
                                    <TrendingUp size={120} className="text-emerald-500" />
                                </div>
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                        <Wallet size={28} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total a Pagar</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                            {loading ? <Loader2 size={24} className="animate-spin text-slate-200 ml-auto" /> : `$ ${data.totalDeuda.toLocaleString('es-AR')}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${data.totalDeuda > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`}></div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            {data.totalDeuda > 0 ? "Estado: Posee Deuda" : "Estado: Al Día"}
                                        </p>
                                    </div>
                                    <Link
                                        href="/dashboard/pagos"
                                        className="text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
                                    >
                                        Pagar ahora <ArrowRight size={14} />
                                    </Link>
                                </div>
                            </div>

                            {/* WIDGET BENEFICIOS */}
                            <Link
                                href="/dashboard/beneficios"
                                className="group p-8 rounded-[36px] bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-all duration-500 flex flex-col justify-between h-56 relative overflow-hidden"
                            >
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                        <CreditCard size={28} />
                                    </div>
                                </div>
                                <div className="space-y-1 relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Club CASF</p>
                                    <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Tarjeta de <br /> beneficios</p>
                                </div>
                                <div className="absolute -bottom-6 -right-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity group-hover:scale-110 duration-500">
                                    <CreditCard size={100} className="text-blue-500" />
                                </div>
                            </Link>

                            {/* WIDGET CREDENCIAL */}
                            <Link
                                href="/dashboard/credencial"
                                className="group p-8 rounded-[36px] bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-amber-500/30 transition-all duration-500 flex flex-col justify-between h-56 relative overflow-hidden"
                            >
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                                        <IdCard size={28} />
                                    </div>
                                </div>
                                <div className="space-y-1 relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identificación</p>
                                    <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Credencial <br /> Digital</p>
                                </div>
                                <div className="absolute -bottom-6 -right-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity group-hover:scale-110 duration-500">
                                    <IdCard size={100} className="text-amber-500" />
                                </div>
                            </Link>

                            {/* FILA 2: ACCESOS DIRECTOS A TRÁMITES (Ocupa todo el ancho) */}
                            <Link
                                href="/dashboard/solicitudes/certificado"
                                className="group p-6 rounded-[36px] bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-blue-600/30 transition-all duration-300 flex flex-col items-center text-center gap-3 h-40 justify-center"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                    <FileText size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors max-w-[100px]">Certificado de Matriculación</span>
                            </Link>

                            <Link
                                href="/dashboard/solicitudes/sisfe"
                                className="group p-6 rounded-[36px] bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-blue-600/30 transition-all duration-300 flex flex-col items-center text-center gap-3 h-40 justify-center"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                    <LockIcon size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors max-w-[100px]">Clave <br /> SISFE</span>
                            </Link>

                            <Link
                                href="/dashboard/solicitudes/catastro"
                                className="group p-6 rounded-[36px] bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-blue-600/30 transition-all duration-300 flex flex-col items-center text-center gap-3 h-40 justify-center"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                    <Search size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors max-w-[100px]">Catastro <br /> / SIGIT</span>
                            </Link>

                            <Link
                                href="/dashboard/solicitudes/jurisprudencia"
                                className="group p-6 rounded-[36px] bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-blue-600/30 transition-all duration-300 flex flex-col items-center text-center gap-3 h-40 justify-center"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                    <Gavel size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors max-w-[100px]">Jurisprudencia</span>
                            </Link>

                        </div>

                        {/* 4. RECIENTES (Full Width) */}
                        <div className="mt-10">
                            <div className="flex items-center justify-between mb-6 px-2">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                    <Clock size={24} className="text-orange-500" />
                                    Últimos trámites presentados
                                </h3>
                                <Link
                                    href="/dashboard/solicitudes/enviadas"
                                    className="text-xs font-bold text-slate-400 hover:text-orange-500 transition-colors uppercase tracking-widest flex items-center gap-2"
                                >
                                    Ver historial completo <ChevronRight size={14} />
                                </Link>
                            </div>

                            <div className="space-y-3">
                                {loading ? (
                                    <div className="h-40 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/20 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                                        <Loader2 className="animate-spin text-slate-300" />
                                    </div>
                                ) : data.recentSolicitudes.length > 0 ? (
                                    data.recentSolicitudes.map((sol: any, idx: number) => (
                                        <div
                                            key={sol.id || idx}
                                            className="group p-5 rounded-[24px] bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-900/40 hover:border-slate-200 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-orange-500 shadow-sm transition-colors">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-tight">{sol.tipo}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {new Date(sol.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${getStatusColor(sol.estado)}`}>
                                                    {sol.estado}
                                                </div>
                                                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-all group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-32 flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-slate-900/20 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No hay trámites recientes</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CARRUSEL NOTICIAS */}
                    {noticias.length > 0 && (
                        <div className="px-6 md:px-10 pb-4 mt-2">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Newspaper size={16} className="text-[#063f68] dark:text-blue-400" />
                                    <h3 className="text-[14px] font-bold text-slate-800 dark:text-white">Últimas noticias</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCarouselIndex(i => Math.max(0, i - 1))}
                                        disabled={carouselIndex === 0}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 transition-all">
                                        <ChevronLeft size={15} />
                                    </button>
                                    <button
                                        onClick={() => setCarouselIndex(i => Math.min(noticias.length - 1, i + 1))}
                                        disabled={carouselIndex >= noticias.length - 1}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 transition-all">
                                        <ChevronRight size={15} />
                                    </button>
                                    <Link href="/dashboard/noticias"
                                        className="text-[12px] font-semibold text-[#063f68] dark:text-blue-400 hover:underline underline-offset-2 ml-1">
                                        Ver todas
                                    </Link>
                                </div>
                            </div>

                            <div className="overflow-hidden">
                                <div className="flex gap-4 transition-transform duration-300 ease-in-out"
                                    style={{ transform: `translateX(${carouselIndex * -316}px)` }}>
                                    {noticias.map(n => (
                                        <Link key={n.id} href={`/dashboard/noticias/${n.id}`}
                                            className="group flex-shrink-0 w-72 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-md transition-all flex flex-col">
                                            <div className="h-36 bg-slate-100 dark:bg-slate-800 relative">
                                                {n.imagen ? (
                                                    <img src={n.imagen} alt={n.titulo} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Newspaper size={28} className="text-slate-300" />
                                                    </div>
                                                )}
                                                {n.destacada && (
                                                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-bold">
                                                        <Star size={9} fill="white" /> Destacada
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3.5 flex flex-col flex-1 gap-1.5">
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    {new Date(n.createdAt).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })}
                                                </p>
                                                <h4 className="font-bold text-slate-800 dark:text-white text-[13px] leading-snug line-clamp-2 group-hover:text-[#063f68] dark:group-hover:text-blue-400 transition-colors">
                                                    {n.titulo}
                                                </h4>
                                                <p className="text-[11px] text-slate-400 line-clamp-2 flex-1">{n.contenido}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Dots */}
                            {noticias.length > 1 && (
                                <div className="flex justify-center gap-1.5 mt-4">
                                    {noticias.map((_, i) => (
                                        <button key={i} onClick={() => setCarouselIndex(i)}
                                            className={`h-1.5 rounded-full transition-all ${i === carouselIndex ? "w-5 bg-[#063f68] dark:bg-blue-400" : "w-1.5 bg-slate-200 dark:bg-slate-700"}`} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
