"use client";

import React, { useState, useEffect } from "react";
import {
    ChevronLeft,
    Calendar as CalendarIcon,
    Info,
    Loader2,
    ArrowRight,
    X,
    CalendarDays,
    Clock,
    BookOpen,
    Users,
    MapPin
} from "lucide-react";
import Link from "next/link";

interface Evento {
    id: string | number;
    cursoId?: number;
    titulo: string;
    descripcion: string | null;
    fecha: string;
    tipo: "institucional" | "social" | "feriado" | "curso";
    isCurso?: boolean;
}

export default function CalendarioPage() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);

    const fetchEventos = async () => {
        try {
            const res = await fetch("/api/user/eventos", { cache: "no-store" });
            const data = await res.json();
            if (Array.isArray(data)) {
                // Ordenar por fecha ascendente
                const sorted = data.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                setEventos(sorted);
            }
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEventos();
    }, []);

    const formatDate = (dateStr: string) => {
        const part = dateStr.split("T")[0]; // "2026-03-31"
        const [y, m, d] = part.split("-").map(Number);
        // Usar mediodía UTC para que getDate/toLocaleDateString no desfase por timezone
        const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        const day = d;
        const month = date.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' }).replace('.', '');
        const weekday = date.toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'UTC' });
        return { day, month, weekday };
    };

    const getTipoStyles = (tipo: string) => {
        switch (tipo) {
            case 'feriado':
                return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
            case 'social':
                return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
            case 'curso':
                return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
            default:
                return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
        }
    };

    return (
        <div className="bg-white dark:bg-[#02182b] pb-20 transition-colors duration-300">
            {/* Header Sticky */}
            <div className="sticky top-16 z-20 bg-white/80 dark:bg-[#02182b]/80 backdrop-blur-md flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                    >
                        <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <CalendarDays size={18} className="text-[#063f68] dark:text-blue-400" />
                        <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Agenda Institucional</h2>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total:</span>
                    <span className="text-[10px] font-black text-[#063f68] dark:text-blue-400">{eventos.length} Eventos</span>
                </div>
            </div>

            {/* Event Details Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-[#02182b] w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up">
                        <div className="relative h-32 bg-gradient-to-br from-[#063f68] to-[#084a7a] p-8 uppercase tracking-widest text-white/90">
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all ml-auto"
                            >
                                <X size={20} />
                            </button>
                            <div className="inline-flex px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-[9px] font-black uppercase tracking-widest text-white/90 mb-3">
                                {selectedEvent.tipo}
                            </div>
                            <h3 className="text-xl font-bold text-white tracking-tight truncate pr-10">{selectedEvent.titulo}</h3>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-[#063f68] dark:text-blue-400">
                                        <CalendarIcon size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                            {(() => {
                                                const part = selectedEvent.fecha.split("T")[0];
                                                const [y, m, d] = part.split("-").map(Number);
                                                return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
                                                    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
                                            })()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-[#063f68] dark:text-blue-400 shrink-0">
                                        <Info size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</span>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {selectedEvent.descripcion || "Sin descripción disponible."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {selectedEvent.isCurso ? (
                                <Link
                                    href={selectedEvent.cursoId ? `/dashboard/cursos?id=${selectedEvent.cursoId}` : "/dashboard/cursos"}
                                    className="w-full h-14 bg-[#063f68] hover:bg-[#0a4d7a] text-white rounded-[22px] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/10"
                                >
                                    Ver Curso completo
                                    <ArrowRight size={18} />
                                </Link>
                            ) : (
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="w-full h-14 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white rounded-[22px] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all border border-slate-100 dark:border-slate-800"
                                >
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 md:p-10 animate-fade-in">
                <div className="mb-12">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2 uppercase">Agenda</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Próximos eventos, cursos y feriados institucionales.</p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 size={32} className="animate-spin text-[#063f68] dark:text-blue-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando agenda...</span>
                    </div>
                ) : eventos.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[40px] p-20 text-center">
                        <CalendarIcon size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-6" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No hay eventos programados</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Volvé pronto para conocer las novedades del colegio.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {eventos.map((ev, idx) => {
                            const { day, month, weekday } = formatDate(ev.fecha);
                            return (
                                <div
                                    key={ev.id}
                                    onClick={() => setSelectedEvent(ev)}
                                    className="group relative flex items-center gap-6 p-6 md:p-8 bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-[32px] hover:border-[#063f68] dark:hover:border-blue-500/50 hover:shadow-2xl hover:shadow-[#063f68]/5 transition-all cursor-pointer animate-slide-up"
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    {/* Date Badge */}
                                    <div className="flex flex-col items-center justify-center min-w-[70px] h-[70px] rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group-hover:bg-[#063f68] group-hover:border-[#063f68] transition-all">
                                        <span className="text-xl font-black text-slate-900 dark:text-white group-hover:text-white transition-colors leading-none">{String(day).padStart(2, '0')}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white/70 transition-colors mt-1">{month}</span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${getTipoStyles(ev.tipo)}`}>
                                                {ev.tipo}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                {weekday}
                                            </span>
                                        </div>
                                        <h3 className="text-[15px] md:text-[17px] font-bold text-slate-900 dark:text-white leading-tight group-hover:text-[#063f68] dark:group-hover:text-blue-400 transition-colors">
                                            {ev.titulo}
                                        </h3>
                                        {ev.descripcion && (
                                            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
                                                {ev.descripcion}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action Icon */}
                                    <div className="hidden md:flex opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all p-3 rounded-full bg-slate-50 dark:bg-slate-800 text-[#063f68] dark:text-blue-400 shrink-0">
                                        <ArrowRight size={20} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.6s ease-out forwards;
                }
                .animate-slide-up {
                    animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}
