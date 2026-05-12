"use client";

import React, { useState, useEffect } from "react";
import {
    CreditCard, ArrowRight, ChevronRight, IdCard, Home, Wallet,
    Clock, FileText, LockKeyhole, Search, Gavel,
    CheckCircle2, Loader2, Newspaper, ChevronLeft,
    Star, CalendarDays, GraduationCap, Zap, BookUser, PlayCircle,
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

interface Curso {
    id: number;
    titulo: string;
    fecha: string;
    fechaFin?: string;
    lugar?: string;
    modalidad: string;
    imagen?: string;
    opciones?: { precio: number }[];
    isEnrolled?: boolean;
}

interface Evento {
    id: number;
    titulo: string;
    fecha: string;
    tipo: string;
    descripcion?: string;
}

export default function DashboardClient({ session }: { session: SessionPayload }) {
    const [loading, setLoading] = useState(true);
    const [noticias, setNoticias] = useState<Noticia[]>([]);
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [data, setData] = useState({
        totalDeuda: 0,
        hasDebitoAutomatico: false,
        hasPagoAnual: false,
        recentSolicitudes: [] as any[],
    });

    useEffect(() => {
        const NC = { cache: "no-store" } as const;
        Promise.all([
            fetch("/api/user/pagos", NC),
            fetch("/api/user/solicitudes", NC),
            fetch("/api/user/cursos", NC),
            fetch("/api/user/eventos", NC),
            fetch("/api/user/noticias", NC),
        ]).then(async ([pagosRes, solRes, cursosRes, eventosRes, noticiasRes]) => {
            const [pagos, solicitudes, cursosData, eventosData, noticiasData] = await Promise.all([
                pagosRes.ok ? pagosRes.json() : { totalDeuda: 0, hasDebitoAutomatico: false, hasPagoAnualActivo: false },
                solRes.ok ? solRes.json() : [],
                cursosRes.ok ? cursosRes.json() : [],
                eventosRes.ok ? eventosRes.json() : [],
                noticiasRes.ok ? noticiasRes.json() : [],
            ]);
            if (Array.isArray(noticiasData)) setNoticias(noticiasData.slice(0, 6));
            if (Array.isArray(cursosData)) setCursos(cursosData.slice(0, 4));
            if (Array.isArray(eventosData)) setEventos(eventosData.slice(0, 3));
            setData({
                totalDeuda: pagos.totalDeuda || 0,
                hasDebitoAutomatico: pagos.hasDebitoAutomatico || false,
                hasPagoAnual: pagos.hasPagoAnualActivo || false,
                recentSolicitudes: Array.isArray(solicitudes) ? solicitudes.slice(0, 5) : [],
            });
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const estadoBadge = (estado: string) => {
        switch (estado.toLowerCase()) {
            case "completada": return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800";
            case "rechazada": return "text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800";
            default: return "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800";
        }
    };

    const modalidadColor = (m: string) => {
        if (m === "Virtual") return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
        if (m === "Híbrida") return "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400";
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400";
    };

    const tipoEventoColor = (t: string) => {
        if (t === "feriado") return "bg-rose-100 dark:bg-rose-900/30 text-rose-600";
        if (t === "social") return "bg-amber-100 dark:bg-amber-900/30 text-amber-600";
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-600";
    };

    const actividadesEmpty = !loading && cursos.length === 0 && eventos.length === 0;

    return (
        <div className="bg-white dark:bg-[#02182b] pb-16 transition-colors duration-300">

            {/* HEADER */}
            <div className="sticky top-16 z-20 bg-white/80 dark:bg-[#02182b]/80 backdrop-blur-md flex items-center justify-between px-6 md:px-10 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <Home size={18} className="text-slate-400" />
                    <h2 className="text-[14px] font-bold text-black dark:text-white tracking-tight">Inicio</h2>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden md:block">
                    Bienvenido, {session.apellido} {session.nombre}
                </p>
            </div>

            <div className="px-4 md:px-8 py-5 space-y-6 animate-fade-in">

                {/* ═══ 1. ACTIVIDADES INSTITUCIONALES ═══ */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Newspaper size={12} /> Actividades Institucionales
                        </h3>
                        <Link href="/dashboard/noticias" className="text-[10px] font-bold text-[#063f68] dark:text-blue-400 hover:underline flex items-center gap-1">
                            Ver todas <ChevronRight size={11} />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="h-24 flex items-center justify-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <Loader2 size={18} className="animate-spin text-slate-300" />
                        </div>
                    ) : actividadesEmpty ? (
                        <div className="h-20 flex items-center justify-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <p className="text-[11px] text-slate-400 font-medium">Sin actividades próximas</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden">
                            <div className="flex gap-3 transition-transform duration-300 ease-in-out" style={{ transform: `translateX(${carouselIndex * -252}px)` }}>
                                {noticias.map(n => (
                                    <Link key={n.id} href={`/dashboard/noticias/${n.id}`}
                                        className="group flex-shrink-0 w-60 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden hover:border-slate-200 dark:hover:border-slate-700 transition-all flex flex-col">
                                        <div className="h-28 bg-slate-100 dark:bg-slate-800 relative">
                                            {n.imagen ? (
                                                <img src={n.imagen} alt={n.titulo} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Newspaper size={22} className="text-slate-300" />
                                                </div>
                                            )}
                                            {n.destacada && (
                                                <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-white text-[9px] font-bold">
                                                    <Star size={8} fill="white" /> Destacada
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 flex flex-col flex-1 gap-1">
                                            <p className="text-[9px] text-slate-400">{new Date(n.createdAt).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })}</p>
                                            <h4 className="font-bold text-slate-800 dark:text-white text-[12px] leading-snug line-clamp-2 group-hover:text-[#063f68] dark:group-hover:text-blue-400 transition-colors">{n.titulo}</h4>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            {noticias.length > 1 && (
                                <div className="flex justify-center gap-1.5 mt-3">
                                    {noticias.map((_, i) => (
                                        <button key={i} onClick={() => setCarouselIndex(i)}
                                            className={`h-1 rounded-full transition-all ${i === carouselIndex ? "w-5 bg-[#063f68] dark:bg-blue-400" : "w-1.5 bg-slate-200 dark:bg-slate-700"}`} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* ═══ 2. ESTADO + TARJETA + CREDENCIAL ═══ */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-3">

                    {/* Estado financiero */}
                    <Link href="/dashboard/pagos"
                        className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 transition-all">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${data.totalDeuda > 0 ? "bg-rose-500 shadow-rose-500/20" : "bg-emerald-500 shadow-emerald-500/20"} text-white`}>
                            <Wallet size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado de pagos</p>
                            <p className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight">
                                {loading ? <Loader2 size={16} className="animate-spin inline" /> : `$ ${data.totalDeuda.toLocaleString("es-AR")}`}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${data.totalDeuda > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                                <p className="text-[10px] font-bold text-slate-400">{data.totalDeuda > 0 ? "Posee deuda" : "Al día"}</p>
                            </div>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>

                    {/* Tarjeta beneficios */}
                    <Link href="/dashboard/beneficios"
                        className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                            <CreditCard size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Club CPASF</p>
                            <p className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight">Tarjeta de beneficios</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Descuentos exclusivos</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>

                    {/* Credencial */}
                    <Link href="/dashboard/credencial"
                        className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-amber-500/30 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
                            <IdCard size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identificación</p>
                            <p className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight">Credencial Digital</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Mat. {session.expediente}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                </section>

                {/* ═══ 3. ACCESOS DIRECTOS A TRÁMITES ═══ */}
                <section>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <Zap size={12} /> Accesos Directos
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                            { href: "/dashboard/solicitudes/certificado", icon: <FileText size={18} />, label: "Certificado de Matriculación", color: "text-blue-600 bg-blue-600/10 group-hover:bg-blue-600 group-hover:text-white" },
                            { href: "/dashboard/solicitudes/sisfe", icon: <LockKeyhole size={18} />, label: "Clave SISFE", color: "text-violet-600 bg-violet-600/10 group-hover:bg-violet-600 group-hover:text-white" },
                            { href: "/dashboard/solicitudes/catastro", icon: <Search size={18} />, label: "Catastro / SIGIT", color: "text-orange-600 bg-orange-600/10 group-hover:bg-orange-600 group-hover:text-white" },
                            { href: "/dashboard/solicitudes/jurisprudencia", icon: <Gavel size={18} />, label: "Jurisprudencia", color: "text-teal-600 bg-teal-600/10 group-hover:bg-teal-600 group-hover:text-white" },
                            { href: "/dashboard/guia", icon: <BookUser size={18} />, label: "Guía de Abogados", color: "text-teal-600 bg-teal-600/10 group-hover:bg-teal-600 group-hover:text-white" },
                            { href: "/dashboard/tutoriales", icon: <PlayCircle size={18} />, label: "Tutoriales", color: "text-pink-500 bg-pink-500/10 group-hover:bg-pink-500 group-hover:text-white" },
                        ].map(item => (
                            <Link key={item.href} href={item.href}
                                className="group flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${item.color}`}>
                                    {item.icon}
                                </div>
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-tight">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* ═══ 4. ÚLTIMOS TRÁMITES ═══ */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Clock size={12} /> Últimos Trámites
                        </h3>
                        <Link href="/dashboard/solicitudes/enviadas" className="text-[10px] font-bold text-[#063f68] dark:text-blue-400 hover:underline flex items-center gap-1">
                            Ver todos <ChevronRight size={11} />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="h-24 flex items-center justify-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <Loader2 size={18} className="animate-spin text-slate-300" />
                        </div>
                    ) : data.recentSolicitudes.length === 0 ? (
                        <div className="h-20 flex items-center justify-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <p className="text-[11px] text-slate-400 font-medium">Sin trámites recientes</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.recentSolicitudes.map((sol: any, idx: number) => (
                                <Link key={sol.id || idx} href="/dashboard/solicitudes/enviadas"
                                    className="group flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                                        <FileText size={14} className="text-slate-400 group-hover:text-[#063f68] dark:group-hover:text-blue-400 transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-bold text-slate-800 dark:text-white leading-tight truncate">{sol.tipo}</p>
                                        <p className="text-[10px] text-slate-400">{new Date(sol.fecha).toLocaleDateString("es-AR")}</p>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${estadoBadge(sol.estado)}`}>
                                        {sol.estado}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>


            </div>
        </div>
    );
}
